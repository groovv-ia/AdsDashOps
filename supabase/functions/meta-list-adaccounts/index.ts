/**
 * Edge Function: meta-list-adaccounts
 *
 * Lista as Ad Accounts do Business Manager específico e salva no banco.
 *
 * CORREÇÃO PRINCIPAL: Usa endpoints /{bm_id}/owned_ad_accounts e
 * /{bm_id}/client_ad_accounts ao invés de me/adaccounts, para retornar
 * SOMENTE as contas de anúncio do Business Manager configurado na conexão.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  amount_spent: string;
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: {
    cursors: { after: string };
    next: string;
  };
  error?: {
    message: string;
    code: number;
  };
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
    `${baseUrl}?fields=id,name,account_status,currency,timezone_name,amount_spent&limit=100&access_token=${token}`;
  let pageCount = 0;
  const maxPages = 50;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`[meta-list-adaccounts] ${label} - page ${pageCount}...`);

    const response = await fetch(nextUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      console.error(`[meta-list-adaccounts] ${label} error:`, data.error);
      // Retorna o que já foi coletado sem interromper
      return { accounts };
    }

    if (data.data && data.data.length > 0) {
      accounts.push(...data.data);
      console.log(`[meta-list-adaccounts] ${label} page ${pageCount}: ${data.data.length} (total: ${accounts.length})`);
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
    if (req.method !== "GET") {
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
      console.error("[meta-list-adaccounts] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-list-adaccounts] User authenticated: ${user.id}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // BUSCA O WORKSPACE DO USUÁRIO (OWNER OU MEMBRO)
    // Usa .order().limit(1) para evitar erro com múltiplos workspaces
    // =====================================================
    let workspaceId: string | null = null;

    // 1. Tenta buscar como owner direto (pega o mais antigo se houver múltiplos)
    const { data: ownedWorkspaces, error: ownerError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownerError) {
      console.error("[meta-list-adaccounts] Error finding owned workspace:", ownerError);
    }

    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      workspaceId = ownedWorkspaces[0].id;
      console.log(`[meta-list-adaccounts] Found workspace as owner: ${workspaceId}`);
    } else {
      // 2. Se não é owner, busca como membro (pega o mais antigo)
      console.log("[meta-list-adaccounts] User is not owner, checking membership...");

      const { data: memberRecords, error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberError) {
        console.error("[meta-list-adaccounts] Error finding member workspace:", memberError);
      }

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
        console.log(`[meta-list-adaccounts] Found workspace as member: ${workspaceId}`);
      }
    }

    if (!workspaceId) {
      console.error("[meta-list-adaccounts] No workspace found for user");
      return new Response(
        JSON.stringify({ error: "No workspace found. Please connect Meta first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // BUSCA A CONEXÃO META DO WORKSPACE
    // =====================================================
    const { data: metaConnection, error: connError } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, business_manager_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();

    if (connError) {
      console.error("[meta-list-adaccounts] Error finding connection:", connError);
    }

    if (!metaConnection) {
      console.log("[meta-list-adaccounts] No valid Meta connection found");
      return new Response(
        JSON.stringify({ error: "No valid Meta connection found", adaccounts: [], total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bmId = metaConnection.business_manager_id;
    console.log(`[meta-list-adaccounts] Found connection: ${metaConnection.id}, BM: ${bmId}`);

    // =====================================================
    // DESCRIPTOGRAFA O TOKEN
    // =====================================================
    let accessToken = metaConnection.access_token_encrypted;

    // Tenta descriptografar (pode não estar criptografado)
    const { data: decryptedToken, error: decryptError } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    if (!decryptError && decryptedToken) {
      accessToken = decryptedToken;
      console.log("[meta-list-adaccounts] Token decrypted successfully");
    } else {
      console.warn("[meta-list-adaccounts] Using raw token (not encrypted or decrypt failed)");
    }

    // =====================================================
    // BUSCA AD ACCOUNTS DO BUSINESS MANAGER ESPECÍFICO
    // Usa owned_ad_accounts + client_ad_accounts ao invés de me/adaccounts
    // para retornar SOMENTE contas deste BM
    // =====================================================
    const bmBaseUrl = `https://graph.facebook.com/v21.0/${bmId}`;

    // Busca contas próprias do BM (owned)
    const { accounts: ownedAccounts } = await fetchPaginatedAdAccounts(
      `${bmBaseUrl}/owned_ad_accounts`,
      accessToken,
      "owned_ad_accounts"
    );

    // Busca contas de clientes gerenciados pelo BM (client)
    const { accounts: clientAccounts } = await fetchPaginatedAdAccounts(
      `${bmBaseUrl}/client_ad_accounts`,
      accessToken,
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

    console.log(`[meta-list-adaccounts] BM ${bmId}: ${ownedAccounts.length} owned + ${clientAccounts.length} client = ${allAdAccounts.length} unique accounts`);

    // =====================================================
    // SALVA AS CONTAS NO BANCO DE DADOS
    // =====================================================
    if (allAdAccounts.length > 0) {
      // Limpa contas antigas que não pertencem mais ao BM
      const validAccountIds = allAdAccounts.map((acc) => acc.id);
      const { error: deleteError, count: deletedCount } = await supabaseAdmin
        .from("meta_ad_accounts")
        .delete({ count: "exact" })
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);

      if (deleteError) {
        console.error("[meta-list-adaccounts] Error cleaning old accounts:", deleteError);
      } else if (deletedCount && deletedCount > 0) {
        console.log(`[meta-list-adaccounts] Cleaned ${deletedCount} old ad accounts from workspace`);
      }

      // Prepara os dados para upsert
      const adAccountsToUpsert = allAdAccounts.map((acc) => ({
        workspace_id: workspaceId,
        meta_ad_account_id: acc.id,
        name: acc.name,
        currency: acc.currency || "USD",
        timezone_name: acc.timezone_name || "UTC",
        account_status: mapAccountStatus(acc.account_status),
        primary_connection_id: metaConnection.id,
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
          console.error(`[meta-list-adaccounts] Upsert error batch ${Math.floor(i / batchSize) + 1}:`, upsertError);
          errorCount += batch.length;
        } else {
          savedCount += batch.length;
          console.log(`[meta-list-adaccounts] Batch ${Math.floor(i / batchSize) + 1} saved: ${batch.length} accounts`);
        }
      }

      console.log(`[meta-list-adaccounts] TOTAL SAVED: ${savedCount} accounts, ERRORS: ${errorCount}`);
    }

    // =====================================================
    // RETORNA AS CONTAS PARA O FRONTEND
    // =====================================================
    const formattedAccounts = allAdAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      timezone: acc.timezone_name,
      status: mapAccountStatus(acc.account_status),
      amount_spent: acc.amount_spent,
    }));

    return new Response(
      JSON.stringify({
        adaccounts: formattedAccounts,
        total: formattedAccounts.length,
        workspace_id: workspaceId,
        business_manager_id: bmId,
        owned_accounts: ownedAccounts.length,
        client_accounts: clientAccounts.length,
        saved_to_db: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[meta-list-adaccounts] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
