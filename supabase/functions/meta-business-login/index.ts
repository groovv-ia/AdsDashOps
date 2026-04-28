/**
 * Edge Function: meta-business-login
 *
 * Processa o retorno do Facebook Login for Business (FLFB).
 *
 * Fluxo:
 * 1. Recebe o authorization code retornado pelo fluxo FLFB (redirect)
 * 2. Troca o code pelo BISUAT (Business Integration System User Access Token)
 * 3. Chama /me com field expansion para obter System User + ad accounts delegadas
 * 4. Se /me nao retornou contas, tenta cascata de endpoints alternativos
 * 5. Salva conexao e contas no banco com connection_method='flfb'
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

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

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

// Resposta do /me com field expansion incluindo adaccounts
interface MetaMeExpandedResponse {
  id: string;
  name?: string;
  client_business_id?: string;
  adaccounts?: {
    data: MetaAdAccount[];
    paging?: { cursors: { after: string }; next?: string };
  };
  error?: { message: string; code: number };
}

interface MetaBusinessesResponse {
  data: Array<{ id: string; name: string }>;
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
 * Busca ad accounts paginadas dentro de um campo adaccounts retornado
 * por field expansion no /me. Segue paginacao se houver mais paginas.
 */
async function fetchRemainingFieldExpansionPages(
  nextUrl: string | undefined,
  token: string
): Promise<MetaAdAccount[]> {
  if (!nextUrl) return [];

  const accounts: MetaAdAccount[] = [];
  let currentUrl: string | null = nextUrl;
  let pageCount = 0;
  const maxPages = 50;

  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`[meta-business-login] me_field_expansion paginacao extra - pagina ${pageCount}...`);

    const response = await fetch(currentUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      console.warn(`[meta-business-login] me_field_expansion paginacao erro:`, data.error.message);
      break;
    }

    if (data.data?.length > 0) {
      accounts.push(...data.data);
    }

    currentUrl = data.paging?.next || null;
  }

  return accounts;
}

/**
 * Gera um App Access Token no formato {APP_ID}|{APP_SECRET}.
 * Este token e usado para chamar endpoints de BM que exigem permissao de app,
 * como /{bm_id}/owned_ad_accounts e /{bm_id}/client_ad_accounts.
 */
function buildAppToken(appId: string, appSecret: string): string {
  return `${appId}|${appSecret}`;
}

/**
 * Busca em cascata usando multiplos endpoints ate encontrar contas.
 *
 * Ordem de prioridade:
 * 1. App Token + /{bm_id}/owned_ad_accounts + client_ad_accounts (metodo mais confiavel para BISUAT)
 * 2. BISUAT + /{bm_id}/owned_ad_accounts + client_ad_accounts (fallback com token do usuario)
 * 3. /me?fields=adaccounts{...} -- field expansion (contas selecionadas no consent FLFB)
 * 4. /{system_user_id}/adaccounts -- endpoint direto pelo ID do system user
 * 5. /{system_user_id}/assigned_ad_accounts
 * 6. /me/adaccounts (fallback para tokens de usuario)
 * 7. /me/businesses -> App Token em cada BM alternativo
 */
async function findAdAccountsCascade(
  token: string,
  systemUserId: string,
  clientBusinessId: string | undefined,
  meAdAccounts: MetaAdAccount[],
  appId?: string,
  appSecret?: string
): Promise<{ accounts: MetaAdAccount[]; source: string; businessManagerId: string }> {
  const accountMap = new Map<string, MetaAdAccount>();
  const bmId = clientBusinessId || systemUserId;
  const appToken = (appId && appSecret) ? buildAppToken(appId, appSecret) : null;

  // --- Tentativa 1: App Token + endpoints do BM ---
  // O App Token tem acesso a owned/client quando o app esta instalado no BM
  if (clientBusinessId && appToken) {
    console.log(`[meta-business-login] [Cascata 1/7] App Token + BM ${bmId} owned/client_ad_accounts...`);
    const [ownedAccounts, clientAccounts] = await Promise.all([
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/owned_ad_accounts`, appToken, "app_bm_owned"),
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/client_ad_accounts`, appToken, "app_bm_client"),
    ]);
    mergeAccountsIntoMap(accountMap, ownedAccounts);
    mergeAccountsIntoMap(accountMap, clientAccounts);

    if (accountMap.size > 0) {
      console.log(`[meta-business-login] [Cascata 1/7] Sucesso: ${accountMap.size} contas via App Token + BM`);
      return { accounts: Array.from(accountMap.values()), source: "app_token_bm", businessManagerId: bmId };
    }
  } else {
    console.log(`[meta-business-login] [Cascata 1/7] Pulando -- sem client_business_id ou app token`);
  }

  // --- Tentativa 2: BISUAT + endpoints do BM ---
  if (clientBusinessId) {
    console.log(`[meta-business-login] [Cascata 2/7] BISUAT + BM ${bmId} owned/client_ad_accounts...`);
    const [ownedAccounts, clientAccounts] = await Promise.all([
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/owned_ad_accounts`, token, "bm_owned"),
      fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${bmId}/client_ad_accounts`, token, "bm_client"),
    ]);
    mergeAccountsIntoMap(accountMap, ownedAccounts);
    mergeAccountsIntoMap(accountMap, clientAccounts);

    if (accountMap.size > 0) {
      console.log(`[meta-business-login] [Cascata 2/7] Sucesso: ${accountMap.size} contas via BM owned/client`);
      return { accounts: Array.from(accountMap.values()), source: "bm_owned_client", businessManagerId: bmId };
    }
  } else {
    console.log(`[meta-business-login] [Cascata 2/7] Pulando -- client_business_id nao disponivel`);
  }

  // --- Tentativa 3: contas ja obtidas via field expansion no /me ---
  // Estas sao as contas que o usuario selecionou durante o fluxo FLFB
  if (meAdAccounts.length > 0) {
    mergeAccountsIntoMap(accountMap, meAdAccounts);
    console.log(`[meta-business-login] [Cascata 3/7] Sucesso: ${accountMap.size} contas via /me field expansion`);
    return { accounts: Array.from(accountMap.values()), source: "me_field_expansion", businessManagerId: bmId };
  }
  console.log(`[meta-business-login] [Cascata 3/7] /me field expansion retornou 0 contas`);

  // --- Tentativa 4: /{system_user_id}/adaccounts -- endpoint direto pelo ID numerico ---
  // Diferente de /me/adaccounts, usa o ID numerico e funciona com BISUAT
  console.log(`[meta-business-login] [Cascata 4/7] /${systemUserId}/adaccounts...`);
  const directUserAccounts = await fetchPaginatedAdAccounts(
    `${GRAPH_API_BASE}/${systemUserId}/adaccounts`,
    token,
    "system_user_direct_adaccounts"
  );
  mergeAccountsIntoMap(accountMap, directUserAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-business-login] [Cascata 4/7] Sucesso: ${accountMap.size} contas via /${systemUserId}/adaccounts`);
    return { accounts: Array.from(accountMap.values()), source: "system_user_direct", businessManagerId: bmId };
  }

  // --- Tentativa 5: assigned_ad_accounts do System User ---
  console.log(`[meta-business-login] [Cascata 5/7] /${systemUserId}/assigned_ad_accounts...`);
  const assignedAccounts = await fetchPaginatedAdAccounts(
    `${GRAPH_API_BASE}/${systemUserId}/assigned_ad_accounts`,
    token,
    "assigned_ad_accounts"
  );
  mergeAccountsIntoMap(accountMap, assignedAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-business-login] [Cascata 5/7] Sucesso: ${accountMap.size} contas via assigned_ad_accounts`);
    return { accounts: Array.from(accountMap.values()), source: "assigned_ad_accounts", businessManagerId: bmId };
  }

  // --- Tentativa 6: /me/adaccounts (endpoint separado, funciona para user tokens) ---
  console.log(`[meta-business-login] [Cascata 6/7] /me/adaccounts...`);
  const meEndpointAccounts = await fetchPaginatedAdAccounts(
    `${GRAPH_API_BASE}/me/adaccounts`,
    token,
    "me_adaccounts"
  );
  mergeAccountsIntoMap(accountMap, meEndpointAccounts);

  if (accountMap.size > 0) {
    console.log(`[meta-business-login] [Cascata 6/7] Sucesso: ${accountMap.size} contas via /me/adaccounts`);
    return { accounts: Array.from(accountMap.values()), source: "me_adaccounts", businessManagerId: bmId };
  }

  // --- Tentativa 7: descobre BMs via /me/businesses e tenta com App Token ---
  console.log(`[meta-business-login] [Cascata 7/7] /me/businesses...`);
  try {
    // Tenta com App Token primeiro, depois BISUAT
    const tokenForBiz = appToken || token;
    const bizResponse = await fetch(
      `${GRAPH_API_BASE}/me/businesses?fields=id,name&limit=50&access_token=${tokenForBiz}`
    );
    const bizData: MetaBusinessesResponse = await bizResponse.json();

    if (bizData.data && bizData.data.length > 0) {
      console.log(`[meta-business-login] [Cascata 7/7] ${bizData.data.length} BMs encontrados`);

      for (const biz of bizData.data) {
        if (biz.id === bmId) continue;

        console.log(`[meta-business-login] [Cascata 7/7] Tentando BM: ${biz.id} (${biz.name})`);

        // Tenta com App Token e BISUAT em paralelo para cada BM alternativo
        const tokensToTry = appToken ? [appToken, token] : [token];
        for (const t of tokensToTry) {
          const [altOwned, altClient] = await Promise.all([
            fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/owned_ad_accounts`, t, `alt_${biz.id}_owned`),
            fetchPaginatedAdAccounts(`${GRAPH_API_BASE}/${biz.id}/client_ad_accounts`, t, `alt_${biz.id}_client`),
          ]);
          mergeAccountsIntoMap(accountMap, altOwned);
          mergeAccountsIntoMap(accountMap, altClient);

          if (accountMap.size > 0) {
            console.log(`[meta-business-login] [Cascata 7/7] Sucesso: ${accountMap.size} contas via BM ${biz.id}`);
            return { accounts: Array.from(accountMap.values()), source: `alt_bm_${biz.id}`, businessManagerId: biz.id };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[meta-business-login] [Cascata 7/7] Erro:`, err);
  }

  console.warn(`[meta-business-login] Nenhuma conta encontrada em nenhum dos 7 metodos`);
  return { accounts: [], source: "none", businessManagerId: bmId };
}

// =====================================================
// Handler principal
// =====================================================

Deno.serve(async (req: Request) => {
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

    const metaAppId = Deno.env.get("META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");

    if (!metaAppId || !metaAppSecret) {
      console.error("[meta-business-login] META_APP_ID ou META_APP_SECRET nao configurados");
      return new Response(
        JSON.stringify({ error: "Configuracao do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------
    // 3. Trocar o authorization code pelo BISUAT
    // -------------------------------------------------------
    console.log("[meta-business-login] Trocando authorization code pelo BISUAT...");

    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("code", code);
    if (body.redirect_uri) {
      tokenUrl.searchParams.set("redirect_uri", body.redirect_uri);
    }

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData: MetaTokenResponse = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("[meta-business-login] Erro ao trocar code:", tokenData.error);
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
    // 4. Validar BISUAT em ETAPAS TOLERANTES
    //
    // A) Etapa A (OBRIGATORIA): /me?fields=id,name -- valida o token.
    //    Se falhar, abortamos com erro descritivo (codigo + mensagem do Meta).
    // B) Etapa B (OPCIONAL): /me?fields=client_business_id -- pode falhar
    //    se o token nao for de System User; seguimos sem ele.
    // C) Etapa C (OPCIONAL): /me?fields=adaccounts{...} -- field expansion
    //    pode falhar se ainda nao houve propagacao de permissoes; a cascata
    //    posterior tenta os outros 4 metodos para encontrar contas.
    // -------------------------------------------------------

    // --- Etapa A: validacao basica do token (obrigatoria) ---
    console.log("[meta-business-login] [Etapa A] Validando token via /me?fields=id,name...");
    const meBasicResponse = await fetch(
      `${GRAPH_API_BASE}/me?fields=id,name&access_token=${bisuat}`
    );
    const meBasicData: { id?: string; name?: string; error?: { message: string; code: number; type?: string; error_subcode?: number } } =
      await meBasicResponse.json();

    if (meBasicData.error || !meBasicData.id) {
      console.error("[meta-business-login] [Etapa A] Token invalido:", meBasicData.error);
      // Mascara o token nos logs (primeiros 6 + ultimos 4 chars)
      const masked = bisuat.length > 12
        ? `${bisuat.slice(0, 6)}...${bisuat.slice(-4)}`
        : "***";
      console.error(`[meta-business-login] [Etapa A] Token mascarado: ${masked}`);

      const code = meBasicData.error?.code;
      let userMessage = meBasicData.error?.message || "Resposta invalida da Meta API";
      if (code === 190) {
        userMessage = "Sua autorizacao Meta foi revogada ou expirou. Clique em Reconectar.";
      } else if (code === 200) {
        userMessage = "Faltam permissoes ads_read ou business_management. Refaca o consent garantindo todas as permissoes.";
      }

      return new Response(
        JSON.stringify({
          error: "Token invalido ou sem permissao",
          details: userMessage,
          meta_error_code: code,
          meta_error_subcode: meBasicData.error?.error_subcode,
          meta_error_type: meBasicData.error?.type,
          meta_error_message: meBasicData.error?.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemUserId = meBasicData.id;
    const systemUserName = meBasicData.name;
    console.log(`[meta-business-login] [Etapa A] OK: System User ${systemUserId} (${systemUserName})`);

    // --- Etapa B: client_business_id (opcional, best-effort) ---
    let clientBusinessId: string | undefined;
    try {
      const meBmResponse = await fetch(
        `${GRAPH_API_BASE}/me?fields=client_business_id&access_token=${bisuat}`
      );
      const meBmData: { client_business_id?: string; error?: { message: string; code: number } } =
        await meBmResponse.json();
      if (meBmData.error) {
        console.warn(`[meta-business-login] [Etapa B] client_business_id indisponivel:`, meBmData.error.message);
      } else {
        clientBusinessId = meBmData.client_business_id;
        console.log(`[meta-business-login] [Etapa B] client_business_id: ${clientBusinessId || "nao disponivel"}`);
      }
    } catch (err) {
      console.warn(`[meta-business-login] [Etapa B] Erro ao buscar client_business_id:`, err);
    }

    // --- Etapa C: field expansion para adaccounts (opcional, best-effort) ---
    let meAdAccounts: MetaAdAccount[] = [];
    try {
      const meAdsResponse = await fetch(
        `${GRAPH_API_BASE}/me?fields=adaccounts{id,name,account_status,currency,timezone_name}&access_token=${bisuat}`
      );
      const meAdsData: MetaMeExpandedResponse = await meAdsResponse.json();

      if (meAdsData.error) {
        console.warn(`[meta-business-login] [Etapa C] field expansion erro:`, meAdsData.error.message);
      } else if (meAdsData.adaccounts?.data && meAdsData.adaccounts.data.length > 0) {
        meAdAccounts = [...meAdsData.adaccounts.data];
        console.log(`[meta-business-login] [Etapa C] /me field expansion: ${meAdAccounts.length} contas (1a pagina)`);

        const nextPage = meAdsData.adaccounts.paging?.next;
        if (nextPage) {
          const extraAccounts = await fetchRemainingFieldExpansionPages(nextPage, bisuat);
          meAdAccounts.push(...extraAccounts);
          console.log(`[meta-business-login] [Etapa C] total com paginacao: ${meAdAccounts.length} contas`);
        }
      } else {
        console.log(`[meta-business-login] [Etapa C] field expansion: 0 contas retornadas`);
      }
    } catch (err) {
      console.warn(`[meta-business-login] [Etapa C] Erro ao buscar adaccounts via /me:`, err);
    }

    // Variavel meData reduzida para uso posterior (apenas o que precisamos)
    const meData = { id: systemUserId, name: systemUserName, client_business_id: clientBusinessId };

    // -------------------------------------------------------
    // 5. Buscar ad accounts via cascata (usa meAdAccounts como prioridade)
    // Passa appId e appSecret para tentar App Token nos endpoints de BM
    // -------------------------------------------------------
    const { accounts: allAdAccounts, source: accountSource, businessManagerId } =
      await findAdAccountsCascade(bisuat, systemUserId, meData.client_business_id, meAdAccounts, metaAppId, metaAppSecret);

    console.log(
      `[meta-business-login] Resultado: ${allAdAccounts.length} contas via "${accountSource}", BM: ${businessManagerId}`
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
      console.log(`[meta-business-login] Workspace (owner): ${workspaceId}`);
    } else {
      const { data: memberRecords } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
        console.log(`[meta-business-login] Workspace (membro): ${workspaceId}`);
      } else {
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
    // 7. Criptografar o token
    // -------------------------------------------------------
    let encryptedToken = bisuat;
    try {
      const { data: encryptedData, error: encryptError } = await supabaseAdmin
        .rpc("encrypt_token", { p_token: bisuat });
      if (!encryptError && encryptedData) {
        encryptedToken = encryptedData;
        console.log("[meta-business-login] Token criptografado");
      }
    } catch {
      console.log("[meta-business-login] Criptografia nao disponivel, armazenando raw");
    }

    // -------------------------------------------------------
    // 8. Salvar ou atualizar conexao Meta
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
    // 9. Remover contas antigas que nao pertencem mais
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
    // 10. Salvar ad accounts via upsert em batches
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
          console.error(`[meta-business-login] Upsert batch erro:`, upsertError);
        } else {
          savedCount += batch.length;
        }
      }

      console.log(`[meta-business-login] ${savedCount} contas salvas no banco`);

      // Criar/atualizar sync_state
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
        system_user_id: systemUserId,
        system_user_name: meData.name,
        adaccounts_count: allAdAccounts.length,
        adaccounts_source: accountSource,
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
