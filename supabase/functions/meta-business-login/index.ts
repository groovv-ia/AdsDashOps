/**
 * Edge Function: meta-business-login
 *
 * Processa o retorno do Facebook Login for Business (FLFB).
 *
 * Fluxo:
 * 1. Recebe o authorization `code` retornado pelo FB SDK
 * 2. Troca o code pelo BISUAT (Business Integration System User Access Token) via Graph API
 * 3. Valida o token e busca informacoes do System User
 * 4. Busca o Business Portfolio (client_business_id) associado ao System User
 * 5. Busca todas as ad accounts do portfolio (owned + client)
 * 6. Salva/atualiza conexao e contas no banco com connection_method='flfb'
 *
 * O BISUAT e permanente -- nao expira por tempo, apenas se revogado manualmente.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// =====================================================
// Tipos
// =====================================================

interface RequestPayload {
  code: string;
  redirect_uri?: string;
}

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string; code: number; type: string };
}

interface MetaMeResponse {
  id: string;
  name?: string;
  // Para System Users: client_business_id e o BM associado
  client_business_id?: string;
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
  paging?: { cursors: { after: string }; next?: string };
  error?: { message: string; code: number };
}

// =====================================================
// Helpers
// =====================================================

/** Mapeia status numerico do Meta para texto legivel */
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
  };
  return statusMap[status] || "UNKNOWN";
}

/**
 * Busca todas as ad accounts de um endpoint paginado da Meta Graph API.
 * Usado para buscar owned_ad_accounts e client_ad_accounts de um Business Manager.
 */
async function fetchPaginatedAdAccounts(
  baseUrl: string,
  token: string,
  label: string
): Promise<MetaAdAccount[]> {
  const accounts: MetaAdAccount[] = [];
  let nextUrl: string | null =
    `${baseUrl}?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${token}`;
  let pageCount = 0;
  const maxPages = 50;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`[meta-business-login] ${label} - pagina ${pageCount}...`);

    const response = await fetch(nextUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      console.warn(`[meta-business-login] ${label} erro:`, data.error.message);
      // Nao interrompe -- o endpoint pode nao existir para alguns tipos de BM
      break;
    }

    if (data.data?.length > 0) {
      accounts.push(...data.data);
    }

    nextUrl = data.paging?.next || null;
  }

  console.log(`[meta-business-login] ${label}: ${accounts.length} contas encontradas`);
  return accounts;
}

// =====================================================
// Handler principal
// =====================================================

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

    // -------------------------------------------------------
    // 1. Verificar autenticacao do usuario Supabase
    // -------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica o usuario autenticado usando o token JWT do frontend
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-business-login] Usuario autenticado: ${user.id}`);

    // Cliente admin para operacoes que precisam contornar RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // -------------------------------------------------------
    // 2. Ler payload da requisicao
    // -------------------------------------------------------
    const body: RequestPayload = await req.json();
    const { code } = body;

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Campo 'code' e obrigatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaAppId = Deno.env.get("META_APP_ID") || Deno.env.get("VITE_META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");

    if (!metaAppId || !metaAppSecret) {
      console.error("[meta-business-login] META_APP_ID ou META_APP_SECRET nao configurados");
      return new Response(
        JSON.stringify({ error: "Configuracao do servidor incompleta: META_APP_ID ou META_APP_SECRET ausentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------
    // 3. Trocar o authorization code pelo BISUAT
    //    O redirect_uri deve ser vazio para FLFB (popup mode)
    // -------------------------------------------------------
    console.log("[meta-business-login] Trocando authorization code pelo BISUAT...");

    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("code", code);
    // FLFB via popup nao usa redirect_uri -- deve ser omitido ou string vazia
    // Se o frontend enviou um redirect_uri, inclui
    if (body.redirect_uri) {
      tokenUrl.searchParams.set("redirect_uri", body.redirect_uri);
    }

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData: MetaTokenResponse = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("[meta-business-login] Erro ao trocar code por token:", tokenData.error);
      return new Response(
        JSON.stringify({
          error: "Falha ao obter token de acesso",
          details: tokenData.error?.message || "Resposta invalida da Meta API",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bisuat = tokenData.access_token;
    console.log("[meta-business-login] BISUAT obtido com sucesso");

    // -------------------------------------------------------
    // 4. Validar o BISUAT e obter dados do System User
    //    O campo client_business_id e o ID do Business Portfolio
    // -------------------------------------------------------
    const meResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,client_business_id&access_token=${bisuat}`
    );
    const meData: MetaMeResponse = await meResponse.json();

    if (meData.error) {
      console.error("[meta-business-login] Token invalido:", meData.error);
      return new Response(
        JSON.stringify({
          error: "Token invalido ou sem permissao",
          details: meData.error.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-business-login] System User: ${meData.id} (${meData.name})`);
    console.log(`[meta-business-login] Business Portfolio ID: ${meData.client_business_id || "nao disponivel"}`);

    // O business_manager_id pode vir do client_business_id ou precisar ser descoberto
    const businessManagerId = meData.client_business_id || meData.id;

    // -------------------------------------------------------
    // 5. Buscar ad accounts do Business Portfolio
    // -------------------------------------------------------
    const bmBaseUrl = `https://graph.facebook.com/v21.0/${businessManagerId}`;

    const [ownedAccounts, clientAccounts] = await Promise.all([
      fetchPaginatedAdAccounts(`${bmBaseUrl}/owned_ad_accounts`, bisuat, "owned_ad_accounts"),
      fetchPaginatedAdAccounts(`${bmBaseUrl}/client_ad_accounts`, bisuat, "client_ad_accounts"),
    ]);

    // Remove duplicatas pelo ID da conta
    const accountMap = new Map<string, MetaAdAccount>();
    for (const acc of [...ownedAccounts, ...clientAccounts]) {
      if (!accountMap.has(acc.id)) {
        accountMap.set(acc.id, acc);
      }
    }
    const allAdAccounts = Array.from(accountMap.values());

    console.log(
      `[meta-business-login] Total: ${ownedAccounts.length} owned + ${clientAccounts.length} client = ${allAdAccounts.length} contas unicas`
    );

    // -------------------------------------------------------
    // 6. Buscar ou criar workspace do usuario
    // -------------------------------------------------------
    let workspaceId: string;

    const { data: ownedWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      workspaceId = ownedWorkspaces[0].id;
      console.log(`[meta-business-login] Workspace encontrado (owner): ${workspaceId}`);
    } else {
      const { data: memberRecords } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
        console.log(`[meta-business-login] Workspace encontrado (membro): ${workspaceId}`);
      } else {
        // Cria novo workspace automaticamente
        const { data: newWorkspace, error: createError } = await supabaseAdmin
          .from("workspaces")
          .insert({ name: `Workspace de ${user.email}`, owner_id: user.id })
          .select("id")
          .single();

        if (createError || !newWorkspace) {
          return new Response(
            JSON.stringify({ error: "Falha ao criar workspace", details: createError?.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        workspaceId = newWorkspace.id;

        await supabaseAdmin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
        });

        console.log(`[meta-business-login] Novo workspace criado: ${workspaceId}`);
      }
    }

    // -------------------------------------------------------
    // 7. Criptografar o token (se disponivel)
    // -------------------------------------------------------
    let encryptedToken = bisuat;
    try {
      const { data: encryptedData, error: encryptError } = await supabaseAdmin
        .rpc("encrypt_token", { p_token: bisuat });
      if (!encryptError && encryptedData) {
        encryptedToken = encryptedData;
        console.log("[meta-business-login] Token criptografado com sucesso");
      }
    } catch {
      console.log("[meta-business-login] Criptografia nao disponivel, armazenando token raw");
    }

    // -------------------------------------------------------
    // 8. Salvar ou atualizar conexao Meta no banco
    //    BISUAT e permanente -- expiracoa definida em 10 anos
    // -------------------------------------------------------
    const tokenExpiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const connectionName = meData.name || `Meta FLFB - ${businessManagerId}`;

    const { data: existingConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let connectionId: string;

    if (existingConnection) {
      connectionId = existingConnection.id;

      const { error: updateError } = await supabaseAdmin
        .from("meta_connections")
        .update({
          business_manager_id: businessManagerId,
          access_token_encrypted: encryptedToken,
          granted_scopes: ["ads_read", "business_management"],
          status: "connected",
          connection_method: "flfb",
          name: connectionName,
          token_expires_at: tokenExpiresAt,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[meta-business-login] Erro ao atualizar conexao:", updateError);
        return new Response(
          JSON.stringify({ error: "Falha ao atualizar conexao", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[meta-business-login] Conexao atualizada: ${connectionId}`);
    } else {
      const { data: newConn, error: insertError } = await supabaseAdmin
        .from("meta_connections")
        .insert({
          workspace_id: workspaceId,
          business_manager_id: businessManagerId,
          access_token_encrypted: encryptedToken,
          granted_scopes: ["ads_read", "business_management"],
          status: "connected",
          connection_method: "flfb",
          name: connectionName,
          is_default: true,
          token_expires_at: tokenExpiresAt,
          last_validated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !newConn) {
        console.error("[meta-business-login] Erro ao inserir conexao:", insertError);
        return new Response(
          JSON.stringify({ error: "Falha ao salvar conexao", details: insertError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      connectionId = newConn.id;
      console.log(`[meta-business-login] Nova conexao criada: ${connectionId}`);
    }

    // -------------------------------------------------------
    // 9. Remover contas antigas que nao pertencem mais ao BM
    // -------------------------------------------------------
    if (allAdAccounts.length > 0) {
      const validAccountIds = allAdAccounts.map((acc) => acc.id);
      await supabaseAdmin
        .from("meta_ad_accounts")
        .delete()
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);
    }

    // -------------------------------------------------------
    // 10. Salvar ad accounts no banco via upsert em batches
    // -------------------------------------------------------
    let savedCount = 0;

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

      const batchSize = 100;
      for (let i = 0; i < adAccountsToUpsert.length; i += batchSize) {
        const batch = adAccountsToUpsert.slice(i, i + batchSize);
        const { error: upsertError } = await supabaseAdmin
          .from("meta_ad_accounts")
          .upsert(batch, { onConflict: "workspace_id,meta_ad_account_id", ignoreDuplicates: false });

        if (upsertError) {
          console.error(`[meta-business-login] Erro no upsert batch ${Math.floor(i / batchSize) + 1}:`, upsertError);
        } else {
          savedCount += batch.length;
        }
      }

      console.log(`[meta-business-login] ${savedCount} contas salvas no banco`);

      // Criar/atualizar sync_state para cada conta
      for (const acc of allAdAccounts) {
        await supabaseAdmin
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
      }
    }

    // -------------------------------------------------------
    // 11. Retornar sucesso
    // -------------------------------------------------------
    return new Response(
      JSON.stringify({
        status: "connected",
        connection_method: "flfb",
        workspace_id: workspaceId,
        business_manager_id: businessManagerId,
        system_user_id: meData.id,
        system_user_name: meData.name,
        adaccounts_count: allAdAccounts.length,
        owned_accounts: ownedAccounts.length,
        client_accounts: clientAccounts.length,
        saved_to_db: savedCount > 0 || allAdAccounts.length === 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[meta-business-login] Erro inesperado:", err);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
