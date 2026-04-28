/**
 * Edge Function: meta-list-adaccounts
 *
 * Lista as Ad Accounts acessiveis pela conexao Meta e salva no banco.
 *
 * Usa estrategia de busca em cascata para cobrir todos os cenarios:
 * 1. /{bm_id}/owned_ad_accounts + /{bm_id}/client_ad_accounts
 * 2. /{system_user_id}/assigned_ad_accounts (para tokens FLFB)
 * 3. /me/adaccounts (contas delegadas no fluxo de autorizacao)
 * 4. /me/businesses -> tenta owned/client em cada BM alternativo
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
  amount_spent: string;
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
      console.log(`[meta-list-adaccounts] ${label} page ${pageCount}: ${data.data.length} (total: ${accounts.length})`);
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
 * Busca em cascata: tenta multiplos endpoints ate encontrar contas.
 * Usa o token da conexao (obtido via FLFB ou manual) para buscar
 * as contas que foram delegadas durante a autorizacao.
 */
async function findAdAccountsCascade(
  token: string,
  bmId: string
): Promise<{ accounts: MetaAdAccount[]; source: string }> {
  const accountMap = new Map<string, MetaAdAccount>();

  // --- Tentativa 1: endpoints do Business Manager (owned + client) ---
  console.log(`[meta-list-adaccounts] [Cascata 1/4] BM ${bmId} owned/client_ad_accounts...`);
  const [ownedAccounts, clientAccounts] = await Promise.all([
    fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/owned_ad_accounts`, token, "bm_owned"),
    fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/client_ad_accounts`, token, "bm_client"),
  ]);
  mergeAccountsIntoMap(accountMap, ownedAccounts);
  mergeAccountsIntoMap(accountMap, clientAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-list-adaccounts] [Cascata 1/4] Sucesso: ${accountMap.size} contas via BM owned/client`);
    return { accounts: Array.from(accountMap.values()), source: "bm_owned_client" };
  }

  // --- Tentativa 2: descobrir System User ID via /me e buscar assigned_ad_accounts ---
  console.log(`[meta-list-adaccounts] [Cascata 2/4] Buscando /me para System User ID...`);
  try {
    const meResponse = await fetch(`${GRAPH_API_BASE}/me?fields=id&access_token=${token}`);
    const meData = await meResponse.json();

    if (meData.id && !meData.error) {
      const systemUserId = meData.id;
      console.log(`[meta-list-adaccounts] [Cascata 2/4] System User: ${systemUserId}, buscando assigned_ad_accounts...`);

      const assignedAccounts = await fetchPaginatedAdAccounts(
        `${GRAPH_API_BASE}/${systemUserId}/assigned_ad_accounts`,
        token,
        "assigned_ad_accounts"
      );
      mergeAccountsIntoMap(accountMap, assignedAccounts);

      if (accountMap.size > 0) {
        console.log(`[meta-list-adaccounts] [Cascata 2/4] Sucesso: ${accountMap.size} contas via assigned_ad_accounts`);
        return { accounts: Array.from(accountMap.values()), source: "assigned_ad_accounts" };
      }
    }
  } catch (err) {
    console.warn(`[meta-list-adaccounts] [Cascata 2/4] Erro ao buscar /me:`, err);
  }

  // --- Tentativa 3: /me/adaccounts (contas delegadas no fluxo FLFB) ---
  console.log(`[meta-list-adaccounts] [Cascata 3/4] Buscando /me/adaccounts...`);
  const meAccounts = await fetchPaginatedAdAccounts(
    `${GRAPH_API_BASE}/me/adaccounts`,
    token,
    "me_adaccounts"
  );
  mergeAccountsIntoMap(accountMap, meAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-list-adaccounts] [Cascata 3/4] Sucesso: ${accountMap.size} contas via /me/adaccounts`);
    return { accounts: Array.from(accountMap.values()), source: "me_adaccounts" };
  }

  // --- Tentativa 4: /me/businesses -> tenta owned/client em BMs alternativos ---
  console.log(`[meta-list-adaccounts] [Cascata 4/4] Buscando BMs alternativos via /me/businesses...`);
  try {
    const bizResponse = await fetch(
      `${GRAPH_API_BASE}/me/businesses?fields=id,name&limit=50&access_token=${token}`
    );
    const bizData: MetaBusinessesResponse = await bizResponse.json();

    if (bizData.data && bizData.data.length > 0) {
      console.log(`[meta-list-adaccounts] [Cascata 4/4] ${bizData.data.length} BMs encontrados`);

      for (const biz of bizData.data) {
        if (biz.id === bmId) continue;

        console.log(`[meta-list-adaccounts] [Cascata 4/4] Tentando BM alternativo: ${biz.id} (${biz.name})`);
        const [altOwned, altClient] = await Promise.all([
          fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/owned_ad_accounts`, token, `alt_${biz.id}_owned`),
          fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/client_ad_accounts`, token, `alt_${biz.id}_client`),
        ]);
        mergeAccountsIntoMap(accountMap, altOwned);
        mergeAccountsIntoMap(accountMap, altClient);

        if (accountMap.size > 0) {
          console.log(`[meta-list-adaccounts] [Cascata 4/4] Sucesso: ${accountMap.size} contas via BM alternativo ${biz.id}`);
          return { accounts: Array.from(accountMap.values()), source: `alt_bm_${biz.id}` };
        }
      }
    }
  } catch (err) {
    console.warn(`[meta-list-adaccounts] [Cascata 4/4] Erro ao buscar /me/businesses:`, err);
  }

  console.warn(`[meta-list-adaccounts] Nenhuma conta encontrada em nenhum dos 4 metodos`);
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

    console.log(`[meta-list-adaccounts] User authenticated: ${user.id}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // Busca workspace do usuario (owner ou membro)
    // =====================================================
    let workspaceId: string | null = null;

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
    // Busca conexao Meta do workspace
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
    // Descriptografa o token
    // =====================================================
    let accessToken = metaConnection.access_token_encrypted;

    const { data: decryptedToken, error: decryptError } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    if (!decryptError && decryptedToken) {
      accessToken = decryptedToken;
      console.log("[meta-list-adaccounts] Token decrypted successfully");
    } else {
      console.warn("[meta-list-adaccounts] Using raw token (not encrypted or decrypt failed)");
    }

    // =====================================================
    // Busca ad accounts via estrategia em cascata
    // =====================================================
    const { accounts: allAdAccounts, source: accountSource } =
      await findAdAccountsCascade(accessToken, bmId);

    console.log(`[meta-list-adaccounts] Resultado: ${allAdAccounts.length} contas via "${accountSource}"`);

    // =====================================================
    // Salva contas no banco de dados
    // =====================================================
    let savedCount = 0;
    let errorCount = 0;

    if (allAdAccounts.length > 0) {
      // Remove contas antigas que nao aparecem mais
      const validAccountIds = allAdAccounts.map((acc) => acc.id);
      const { error: deleteError, count: deletedCount } = await supabaseAdmin
        .from("meta_ad_accounts")
        .delete({ count: "exact" })
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);

      if (deleteError) {
        console.error("[meta-list-adaccounts] Error cleaning old accounts:", deleteError);
      } else if (deletedCount && deletedCount > 0) {
        console.log(`[meta-list-adaccounts] Cleaned ${deletedCount} old ad accounts`);
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
          console.error(`[meta-list-adaccounts] Upsert error batch ${Math.floor(i / batchSize) + 1}:`, upsertError);
          errorCount += batch.length;
        } else {
          savedCount += batch.length;
          console.log(`[meta-list-adaccounts] Batch ${Math.floor(i / batchSize) + 1} saved: ${batch.length} accounts`);
        }
      }

      console.log(`[meta-list-adaccounts] TOTAL SAVED: ${savedCount}, ERRORS: ${errorCount}`);
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
