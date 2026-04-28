/**
 * Edge Function: meta-list-adaccounts
 *
 * Lista as Ad Accounts acessiveis pela conexao Meta e salva no banco.
 *
 * Usa estrategia de busca em cascata com 5 tentativas:
 * 1. /{bm_id}/owned_ad_accounts + client_ad_accounts
 * 2. /me?fields=adaccounts{...} -- field expansion (BISUAT FLFB)
 * 3. /{system_user_id}/assigned_ad_accounts
 * 4. /me/adaccounts (endpoint separado)
 * 5. /me/businesses -> tenta owned/client em BMs alternativos
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// =====================================================
// Tipos
// =====================================================

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  amount_spent?: string;
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: { cursors: { after: string }; next: string };
  error?: { message: string; code: number };
}

interface MetaBusinessesResponse {
  data: Array<{ id: string; name: string }>;
  error?: { message: string; code: number };
}

// =====================================================
// Helpers
// =====================================================

/** Mapeia status numerico do Meta para texto */
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
 * Busca ad accounts paginadas de um endpoint da Meta Graph API.
 * Retorna array vazio (sem throw) quando o endpoint retorna erro.
 */
async function fetchPaginatedAdAccounts(
  baseUrl: string,
  token: string,
  label: string
): Promise<MetaAdAccount[]> {
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
      console.warn(`[meta-list-adaccounts] ${label} error:`, data.error.message);
      break;
    }

    if (data.data && data.data.length > 0) {
      accounts.push(...data.data);
    }

    nextUrl = data.paging?.next || null;
  }

  return accounts;
}

/** Adiciona contas a um Map, evitando duplicatas pelo ID */
function mergeAccountsIntoMap(
  accountMap: Map<string, MetaAdAccount>,
  accounts: MetaAdAccount[]
): void {
  for (const acc of accounts) {
    if (!accountMap.has(acc.id)) {
      accountMap.set(acc.id, acc);
    }
  }
}

/**
 * Busca ad accounts via /me com field expansion.
 * Esta e a forma correta de obter contas delegadas com tokens BISUAT (FLFB).
 * Ref: https://stackoverflow.com/questions/77471638
 */
async function fetchAdAccountsViaFieldExpansion(
  token: string
): Promise<MetaAdAccount[]> {
  const accounts: MetaAdAccount[] = [];

  console.log(`[meta-list-adaccounts] Buscando via /me field expansion...`);

  // Primeira pagina via /me com field expansion
  const meResponse = await fetch(
    `${GRAPH_API_BASE}/me?fields=adaccounts{id,name,account_status,currency,timezone_name,amount_spent}&access_token=${token}`
  );
  const meData = await meResponse.json();

  if (meData.error) {
    console.warn(`[meta-list-adaccounts] /me field expansion erro:`, meData.error.message);
    return accounts;
  }

  if (meData.adaccounts?.data && meData.adaccounts.data.length > 0) {
    accounts.push(...meData.adaccounts.data);
    console.log(`[meta-list-adaccounts] /me field expansion primeira pagina: ${meData.adaccounts.data.length} contas`);

    // Segue paginacao se houver mais paginas
    let nextUrl = meData.adaccounts.paging?.next || null;
    let pageCount = 0;
    const maxPages = 50;

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`[meta-list-adaccounts] /me field expansion paginacao extra - page ${pageCount}...`);

      const pageResponse = await fetch(nextUrl);
      const pageData: MetaAdAccountsResponse = await pageResponse.json();

      if (pageData.error) {
        console.warn(`[meta-list-adaccounts] /me field expansion paginacao erro:`, pageData.error.message);
        break;
      }

      if (pageData.data?.length > 0) {
        accounts.push(...pageData.data);
      }

      nextUrl = pageData.paging?.next || null;
    }
  }

  console.log(`[meta-list-adaccounts] /me field expansion total: ${accounts.length} contas`);
  return accounts;
}

/** Gera App Access Token no formato {APP_ID}|{APP_SECRET} */
function buildAppToken(appId: string, appSecret: string): string {
  return `${appId}|${appSecret}`;
}

/**
 * Busca em cascata com 7 tentativas ate encontrar contas.
 *
 * Ordem de prioridade:
 * 1. App Token + /{bm_id}/owned + client (melhor para BISUAT quando app instalado no BM)
 * 2. BISUAT + /{bm_id}/owned + client
 * 3. /me field expansion (contas selecionadas no consent FLFB)
 * 4. /{system_user_id}/adaccounts (endpoint direto por ID numerico)
 * 5. /{system_user_id}/assigned_ad_accounts
 * 6. /me/adaccounts
 * 7. /me/businesses -> App Token em BMs alternativos
 */
async function findAdAccountsCascade(
  token: string,
  bmId: string,
  appId?: string,
  appSecret?: string
): Promise<{ accounts: MetaAdAccount[]; source: string }> {
  const accountMap = new Map<string, MetaAdAccount>();
  const appToken = (appId && appSecret) ? buildAppToken(appId, appSecret) : null;

  // --- Tentativa 1: App Token + endpoints do BM ---
  if (appToken) {
    console.log(`[meta-list-adaccounts] [Cascata 1/7] App Token + BM ${bmId} owned/client_ad_accounts...`);
    const [ownedAccounts, clientAccounts] = await Promise.all([
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/owned_ad_accounts`, appToken, "app_bm_owned"),
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/client_ad_accounts`, appToken, "app_bm_client"),
    ]);
    mergeAccountsIntoMap(accountMap, ownedAccounts);
    mergeAccountsIntoMap(accountMap, clientAccounts);

    if (accountMap.size > 0) {
      console.log(`[meta-list-adaccounts] [Cascata 1/7] Sucesso: ${accountMap.size} contas via App Token + BM`);
      return { accounts: Array.from(accountMap.values()), source: "app_token_bm" };
    }
  } else {
    console.log(`[meta-list-adaccounts] [Cascata 1/7] Pulando -- APP_ID/APP_SECRET nao configurados`);
  }

  // --- Tentativa 2: BISUAT + endpoints do BM ---
  console.log(`[meta-list-adaccounts] [Cascata 2/7] BISUAT + BM ${bmId} owned/client_ad_accounts...`);
  const [ownedAccounts, clientAccounts] = await Promise.all([
    fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/owned_ad_accounts`, token, "bm_owned"),
    fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/client_ad_accounts`, token, "bm_client"),
  ]);
  mergeAccountsIntoMap(accountMap, ownedAccounts);
  mergeAccountsIntoMap(accountMap, clientAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-list-adaccounts] [Cascata 2/7] Sucesso: ${accountMap.size} contas`);
    return { accounts: Array.from(accountMap.values()), source: "bm_owned_client" };
  }

  // --- Tentativa 3: /me com field expansion (funciona para BISUAT FLFB) ---
  console.log(`[meta-list-adaccounts] [Cascata 3/7] /me field expansion...`);
  const fieldExpansionAccounts = await fetchAdAccountsViaFieldExpansion(token);
  mergeAccountsIntoMap(accountMap, fieldExpansionAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-list-adaccounts] [Cascata 3/7] Sucesso: ${accountMap.size} contas`);
    return { accounts: Array.from(accountMap.values()), source: "me_field_expansion" };
  }

  // --- Tentativas 4 e 5: busca system user ID via /me e tenta dois endpoints ---
  console.log(`[meta-list-adaccounts] [Cascata 4-5/7] Buscando System User ID via /me...`);
  try {
    const meResponse = await fetch(`${GRAPH_API_BASE}/me?fields=id&access_token=${token}`);
    const meData = await meResponse.json();

    if (meData.id && !meData.error) {
      console.log(`[meta-list-adaccounts] [Cascata 4/7] System User: ${meData.id}, buscando /{id}/adaccounts...`);

      // Tentativa 4: endpoint direto por ID numerico (funciona com BISUAT)
      const directAccounts = await fetchPaginatedAdAccounts(
        `${GRAPH_API_BASE}/${meData.id}/adaccounts`,
        token,
        "system_user_direct_adaccounts"
      );
      mergeAccountsIntoMap(accountMap, directAccounts);

      if (accountMap.size > 0) {
        console.log(`[meta-list-adaccounts] [Cascata 4/7] Sucesso: ${accountMap.size} contas`);
        return { accounts: Array.from(accountMap.values()), source: "system_user_direct" };
      }

      // Tentativa 5: assigned_ad_accounts
      console.log(`[meta-list-adaccounts] [Cascata 5/7] /${meData.id}/assigned_ad_accounts...`);
      const assignedAccounts = await fetchPaginatedAdAccounts(
        `${GRAPH_API_BASE}/${meData.id}/assigned_ad_accounts`,
        token,
        "assigned_ad_accounts"
      );
      mergeAccountsIntoMap(accountMap, assignedAccounts);

      if (accountMap.size > 0) {
        console.log(`[meta-list-adaccounts] [Cascata 5/7] Sucesso: ${accountMap.size} contas`);
        return { accounts: Array.from(accountMap.values()), source: "assigned_ad_accounts" };
      }
    }
  } catch (err) {
    console.warn(`[meta-list-adaccounts] [Cascata 4-5/7] Erro:`, err);
  }

  // --- Tentativa 6: /me/adaccounts (endpoint separado) ---
  console.log(`[meta-list-adaccounts] [Cascata 6/7] /me/adaccounts...`);
  const meAccounts = await fetchPaginatedAdAccounts(
    `${GRAPH_API_BASE}/me/adaccounts`,
    token,
    "me_adaccounts"
  );
  mergeAccountsIntoMap(accountMap, meAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-list-adaccounts] [Cascata 6/7] Sucesso: ${accountMap.size} contas`);
    return { accounts: Array.from(accountMap.values()), source: "me_adaccounts" };
  }

  // --- Tentativa 7: /me/businesses -> App Token em BMs alternativos ---
  console.log(`[meta-list-adaccounts] [Cascata 7/7] /me/businesses...`);
  try {
    const tokenForBiz = appToken || token;
    const bizResponse = await fetch(
      `${GRAPH_API_BASE}/me/businesses?fields=id,name&limit=50&access_token=${tokenForBiz}`
    );
    const bizData: MetaBusinessesResponse = await bizResponse.json();

    if (bizData.data && bizData.data.length > 0) {
      console.log(`[meta-list-adaccounts] [Cascata 7/7] ${bizData.data.length} BMs encontrados`);

      for (const biz of bizData.data) {
        if (biz.id === bmId) continue;

        console.log(`[meta-list-adaccounts] [Cascata 7/7] Tentando BM: ${biz.id} (${biz.name})`);
        const tokensToTry = appToken ? [appToken, token] : [token];
        for (const t of tokensToTry) {
          const [altOwned, altClient] = await Promise.all([
            fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/owned_ad_accounts`, t, `alt_${biz.id}_owned`),
            fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/client_ad_accounts`, t, `alt_${biz.id}_client`),
          ]);
          mergeAccountsIntoMap(accountMap, altOwned);
          mergeAccountsIntoMap(accountMap, altClient);

          if (accountMap.size > 0) {
            console.log(`[meta-list-adaccounts] [Cascata 7/7] Sucesso: ${accountMap.size} contas via BM ${biz.id}`);
            return { accounts: Array.from(accountMap.values()), source: `alt_bm_${biz.id}` };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[meta-list-adaccounts] [Cascata 7/7] Erro:`, err);
  }

  console.warn(`[meta-list-adaccounts] Nenhuma conta encontrada em nenhum dos 7 metodos`);
  return { accounts: [], source: "none" };
}

// =====================================================
// Handler principal
// =====================================================

Deno.serve(async (req: Request) => {
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

    // Verifica autenticacao
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

    console.log(`[meta-list-adaccounts] User: ${user.id}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // Busca workspace do usuario
    // =====================================================
    let workspaceId: string | null = null;

    const { data: ownedWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      workspaceId = ownedWorkspaces[0].id;
    } else {
      const { data: memberRecords } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "No workspace found. Please connect Meta first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-list-adaccounts] Workspace: ${workspaceId}`);

    // =====================================================
    // Busca conexao Meta do workspace
    // =====================================================
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, business_manager_id, connection_method")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();

    if (!metaConnection) {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection found", adaccounts: [], total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bmId = metaConnection.business_manager_id;
    console.log(`[meta-list-adaccounts] Connection: ${metaConnection.id}, BM: ${bmId}`);

    // =====================================================
    // Descriptografa o token
    // =====================================================
    let accessToken = metaConnection.access_token_encrypted;

    const { data: decryptedToken, error: decryptError } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    if (!decryptError && decryptedToken) {
      accessToken = decryptedToken;
      console.log("[meta-list-adaccounts] Token decrypted");
    } else {
      console.warn("[meta-list-adaccounts] Using raw token");
    }

    // =====================================================
    // Busca ad accounts: rota depende do connection_method
    // - user_token: prioriza /me/adaccounts (User Access Token ve contas do usuario)
    // - manual/flfb: usa cascata completa com endpoints de BM
    // =====================================================
    const metaAppId = Deno.env.get("META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");
    const connectionMethod = (metaConnection as { connection_method?: string }).connection_method;

    let allAdAccounts: MetaAdAccount[];
    let accountSource: string;

    if (connectionMethod === "user_token") {
      // Para User Access Token, /me/adaccounts retorna diretamente as contas do usuario
      console.log(`[meta-list-adaccounts] connection_method=user_token, usando /me/adaccounts como primario`);
      allAdAccounts = await fetchPaginatedAdAccounts(
        `${GRAPH_API_BASE}/me/adaccounts`,
        accessToken,
        "me_adaccounts_user_token"
      );
      accountSource = "me_adaccounts";

      // Fallback: se /me/adaccounts nao retornou nada, tenta cascata completa
      if (allAdAccounts.length === 0) {
        console.log(`[meta-list-adaccounts] /me/adaccounts retornou 0, tentando cascata completa...`);
        const cascadeResult = await findAdAccountsCascade(accessToken, bmId, metaAppId, metaAppSecret);
        allAdAccounts = cascadeResult.accounts;
        accountSource = cascadeResult.source;
      }
    } else {
      // Para manual/flfb, usa cascata completa com endpoints de BM
      const cascadeResult = await findAdAccountsCascade(accessToken, bmId, metaAppId, metaAppSecret);
      allAdAccounts = cascadeResult.accounts;
      accountSource = cascadeResult.source;
    }

    console.log(`[meta-list-adaccounts] Resultado: ${allAdAccounts.length} contas via "${accountSource}"`);

    // =====================================================
    // Salva contas no banco
    // =====================================================
    let savedCount = 0;

    if (allAdAccounts.length > 0) {
      // Remove contas antigas
      const validAccountIds = allAdAccounts.map((acc) => acc.id);
      const { count: deletedCount } = await supabaseAdmin
        .from("meta_ad_accounts")
        .delete({ count: "exact" })
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);

      if (deletedCount && deletedCount > 0) {
        console.log(`[meta-list-adaccounts] Cleaned ${deletedCount} old accounts`);
      }

      // Upsert em batches
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

      const batchSize = 100;
      for (let i = 0; i < adAccountsToUpsert.length; i += batchSize) {
        const batch = adAccountsToUpsert.slice(i, i + batchSize);

        const { error: upsertError } = await supabaseAdmin
          .from("meta_ad_accounts")
          .upsert(batch, {
            onConflict: "workspace_id,meta_ad_account_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`[meta-list-adaccounts] Upsert error:`, upsertError);
        } else {
          savedCount += batch.length;
        }
      }

      console.log(`[meta-list-adaccounts] SAVED: ${savedCount}`);
    }

    // =====================================================
    // Retorna contas para o frontend
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
        adaccounts_source: accountSource,
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
