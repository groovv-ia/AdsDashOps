/**
 * Edge Function: meta-validate-connection
 *
 * Valida um token de System User do Meta e salva a conexão no banco.
 *
 * CORREÇÃO PRINCIPAL: Usa endpoints /{bm_id}/owned_ad_accounts e
 * /{bm_id}/client_ad_accounts ao invés de me/adaccounts, para retornar
 * SOMENTE as contas de anúncio do Business Manager específico.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidateConnectionPayload {
  business_manager_id: string;
  system_user_token: string;
}

interface MetaMeResponse {
  id: string;
  name?: string;
  error?: { message: string; code: number };
}

interface MetaPermissionsResponse {
  data: Array<{ permission: string; status: string }>;
  error?: { message: string; code: number };
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: { cursors: { after: string }; next: string };
  error?: { message: string; code: number };
}

// Mapeia status numérico do Meta para texto
function mapAccountStatus(status: number): string {
  const statusMap: Record<number, string> = {
    1: "ACTIVE",
    2: "DISABLED",
    3: "UNSETTLED",
    7: "PENDING_RISK_REVIEW",
    8: "PENDING_SETTLEMENT",
    9: "IN_GRACE_PERIOD",
    100: "PENDING_CLOSURE",
    101: "CLOSED",
    201: "ANY_ACTIVE",
    202: "ANY_CLOSED",
  };
  return statusMap[status] || "UNKNOWN";
}

/**
 * Busca ad accounts paginadas de um endpoint específico da Meta API.
 * Usado para buscar owned_ad_accounts e client_ad_accounts separadamente.
 */
async function fetchPaginatedAdAccounts(
  baseUrl: string,
  token: string,
  label: string
): Promise<{ accounts: MetaAdAccount[]; error?: string }> {
  const accounts: MetaAdAccount[] = [];
  let nextUrl: string | null =
    `${baseUrl}?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${token}`;
  let pageCount = 0;
  const maxPages = 50;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`[meta-validate-connection] ${label} - page ${pageCount}...`);

    const response = await fetch(nextUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      console.error(`[meta-validate-connection] ${label} error:`, data.error);
      // Retorna o que já foi coletado sem interromper (endpoint pode não existir para alguns BMs)
      return { accounts };
    }

    if (data.data && data.data.length > 0) {
      accounts.push(...data.data);
      console.log(`[meta-validate-connection] ${label} page ${pageCount}: ${data.data.length} (total: ${accounts.length})`);
    }

    nextUrl = data.paging?.next || null;
  }

  return { accounts };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuário autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-validate-connection] User authenticated: ${user.id}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: ValidateConnectionPayload = await req.json();
    const { business_manager_id, system_user_token } = body;

    if (!business_manager_id || !system_user_token) {
      return new Response(
        JSON.stringify({ error: "Missing business_manager_id or system_user_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // 1. VALIDAR TOKEN COM META API
    // =====================================================
    const meResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${system_user_token}`
    );
    const meData: MetaMeResponse = await meResponse.json();

    if (meData.error) {
      return new Response(
        JSON.stringify({ error: "Invalid Meta token", details: meData.error.message, status: "invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // 2. VERIFICAR PERMISSÕES DO TOKEN
    // =====================================================
    const permissionsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/permissions?access_token=${system_user_token}`
    );
    const permissionsData: MetaPermissionsResponse = await permissionsResponse.json();

    const grantedScopes: string[] = [];
    if (permissionsData.data) {
      for (const perm of permissionsData.data) {
        if (perm.status === "granted") {
          grantedScopes.push(perm.permission);
        }
      }
    }

    const requiredScopes = ["ads_read", "business_management"];
    const missingScopes = requiredScopes.filter((s) => !grantedScopes.includes(s));

    if (missingScopes.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required permissions",
          missing_scopes: missingScopes,
          granted_scopes: grantedScopes,
          status: "invalid",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // 3. BUSCAR AD ACCOUNTS DO BUSINESS MANAGER ESPECÍFICO
    //    Usa owned_ad_accounts + client_ad_accounts ao invés de me/adaccounts
    //    para retornar SOMENTE contas deste BM
    // =====================================================
    const bmBaseUrl = `https://graph.facebook.com/v21.0/${business_manager_id}`;

    // Busca contas próprias do BM (owned)
    const { accounts: ownedAccounts } = await fetchPaginatedAdAccounts(
      `${bmBaseUrl}/owned_ad_accounts`,
      system_user_token,
      "owned_ad_accounts"
    );

    // Busca contas de clientes gerenciados pelo BM (client)
    const { accounts: clientAccounts } = await fetchPaginatedAdAccounts(
      `${bmBaseUrl}/client_ad_accounts`,
      system_user_token,
      "client_ad_accounts"
    );

    // Combina e remove duplicatas pelo ID da conta
    const accountMap = new Map<string, MetaAdAccount>();
    for (const acc of [...ownedAccounts, ...clientAccounts]) {
      if (!accountMap.has(acc.id)) {
        accountMap.set(acc.id, acc);
      }
    }
    const allAdAccounts = Array.from(accountMap.values());

    console.log(`[meta-validate-connection] BM ${business_manager_id}: ${ownedAccounts.length} owned + ${clientAccounts.length} client = ${allAdAccounts.length} unique accounts`);

    // =====================================================
    // 4. BUSCAR OU CRIAR WORKSPACE DO USUÁRIO
    //    Usa .order().limit(1) para evitar erro quando usuário tem múltiplos workspaces
    // =====================================================
    let workspaceId: string;

    // Tenta buscar como owner direto (pega o mais antigo se houver múltiplos)
    const { data: ownedWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      workspaceId = ownedWorkspaces[0].id;
      console.log(`[meta-validate-connection] Found workspace as owner: ${workspaceId}`);
    } else {
      // Se não é owner, busca como membro (pega o mais antigo)
      const { data: memberRecords } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
        console.log(`[meta-validate-connection] Found workspace as member: ${workspaceId}`);
      } else {
        // Cria novo workspace
        console.log(`[meta-validate-connection] Creating new workspace...`);
        const { data: newWorkspace, error: createError } = await supabaseAdmin
          .from("workspaces")
          .insert({ name: `Workspace de ${user.email}`, owner_id: user.id })
          .select("id")
          .single();

        if (createError || !newWorkspace) {
          return new Response(
            JSON.stringify({ error: "Failed to create workspace", details: createError?.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        workspaceId = newWorkspace.id;

        // Adiciona o owner como membro
        await supabaseAdmin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
        });
      }
    }

    // =====================================================
    // 5. CRIPTOGRAFAR O TOKEN (SE POSSÍVEL)
    // =====================================================
    let encryptedToken = system_user_token;
    try {
      const { data: encryptedData, error: encryptError } = await supabaseAdmin
        .rpc("encrypt_token", { p_token: system_user_token });
      if (!encryptError && encryptedData) {
        encryptedToken = encryptedData;
      }
    } catch (e) {
      console.log("[meta-validate-connection] Encryption not available, storing raw token");
    }

    // =====================================================
    // 6. SALVAR/ATUALIZAR CONEXÃO META
    // =====================================================
    const { data: existingConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const connectionName = meData.name || `Meta Connection - ${business_manager_id}`;
    let connectionId: string;

    // Calcula data de expiracao do token: 60 dias a partir de agora (Long-Lived Token)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    if (existingConnection) {
      connectionId = existingConnection.id;
      const { error } = await supabaseAdmin
        .from("meta_connections")
        .update({
          business_manager_id,
          access_token_encrypted: encryptedToken,
          granted_scopes: grantedScopes,
          status: "connected",
          name: connectionName,
          token_expires_at: tokenExpiresAt,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (error) {
        console.error("[meta-validate-connection] Update connection error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update connection", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { data: newConn, error } = await supabaseAdmin
        .from("meta_connections")
        .insert({
          workspace_id: workspaceId,
          business_manager_id,
          access_token_encrypted: encryptedToken,
          granted_scopes: grantedScopes,
          status: "connected",
          name: connectionName,
          is_default: true,
          token_expires_at: tokenExpiresAt,
          last_validated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !newConn) {
        console.error("[meta-validate-connection] Insert connection error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to save connection", details: error?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      connectionId = newConn.id;
    }

    console.log(`[meta-validate-connection] Connection saved: ${connectionId}`);

    // =====================================================
    // 7. LIMPAR CONTAS ANTIGAS QUE NÃO PERTENCEM MAIS AO BM
    //    Remove contas do workspace que não estão na lista retornada
    // =====================================================
    if (allAdAccounts.length > 0) {
      const validAccountIds = allAdAccounts.map((acc) => acc.id);
      const { error: deleteError, count: deletedCount } = await supabaseAdmin
        .from("meta_ad_accounts")
        .delete({ count: "exact" })
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);

      if (deleteError) {
        console.error("[meta-validate-connection] Error cleaning old accounts:", deleteError);
      } else if (deletedCount && deletedCount > 0) {
        console.log(`[meta-validate-connection] Cleaned ${deletedCount} old ad accounts from workspace`);
      }
    }

    // =====================================================
    // 8. SALVAR AD ACCOUNTS NO BANCO
    // =====================================================
    if (allAdAccounts.length > 0) {
      const adAccountsToUpsert = allAdAccounts.map((acc) => ({
        workspace_id: workspaceId,
        meta_ad_account_id: acc.id,
        name: acc.name,
        currency: acc.currency || "USD",
        timezone_name: acc.timezone_name || "UTC",
        account_status: mapAccountStatus(acc.account_status),
        primary_connection_id: connectionId,
        updated_at: new Date().toISOString(),
      }));

      // Divide em batches de 100 para evitar timeout
      const batchSize = 100;
      let savedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < adAccountsToUpsert.length; i += batchSize) {
        const batch = adAccountsToUpsert.slice(i, i + batchSize);

        const { error: upsertError } = await supabaseAdmin
          .from("meta_ad_accounts")
          .upsert(batch, {
            onConflict: "workspace_id,meta_ad_account_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`[meta-validate-connection] Upsert error batch ${Math.floor(i / batchSize) + 1}:`, upsertError);
          errorCount += batch.length;
        } else {
          savedCount += batch.length;
          console.log(`[meta-validate-connection] Batch ${Math.floor(i / batchSize) + 1} saved: ${batch.length} accounts`);
        }
      }

      console.log(`[meta-validate-connection] TOTAL SAVED: ${savedCount} accounts, ERRORS: ${errorCount}`);

      // Criar/atualizar sync_state para cada conta
      let syncStateCount = 0;
      for (const acc of allAdAccounts) {
        const { error: syncStateError } = await supabaseAdmin
          .from("meta_sync_state")
          .upsert(
            {
              workspace_id: workspaceId,
              meta_ad_account_id: acc.id,
              sync_enabled: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,meta_ad_account_id" }
          );

        if (!syncStateError) syncStateCount++;
      }
      console.log(`[meta-validate-connection] Sync state created for ${syncStateCount} accounts`);
    }

    // =====================================================
    // 9. RETORNAR SUCESSO
    // =====================================================
    return new Response(
      JSON.stringify({
        status: "connected",
        workspace_id: workspaceId,
        business_manager_id,
        adaccounts_count: allAdAccounts.length,
        owned_accounts: ownedAccounts.length,
        client_accounts: clientAccounts.length,
        scopes: grantedScopes,
        meta_user_id: meData.id,
        meta_user_name: meData.name,
        saved_to_db: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[meta-validate-connection] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
