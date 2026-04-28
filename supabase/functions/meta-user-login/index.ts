/**
 * Edge Function: meta-user-login
 *
 * Processa o retorno do fluxo OAuth padrao do Facebook (User Access Token).
 *
 * Fluxo:
 * 1. Recebe o authorization code retornado pelo redirect OAuth
 * 2. Troca o code por um short-lived User Access Token
 * 3. Troca o short-lived por um long-lived token (60 dias)
 * 4. Chama /me para validar e obter info do usuario
 * 5. Chama /me/adaccounts para listar todas as contas acessiveis
 * 6. Busca Business Manager via /me/businesses
 * 7. Salva conexao e contas no banco com connection_method='user_token'
 *
 * O User Access Token long-lived dura 60 dias e pode ser renovado
 * antes de expirar via fb_exchange_token.
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
 * Retorna array vazio quando o endpoint retorna erro.
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
    console.log(`[meta-user-login] ${label} - pagina ${pageCount}...`);

    const response = await fetch(nextUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      console.warn(`[meta-user-login] ${label} erro:`, data.error.message);
      break;
    }

    if (data.data?.length > 0) {
      accounts.push(...data.data);
    }

    nextUrl = data.paging?.next || null;
  }

  console.log(`[meta-user-login] ${label}: ${accounts.length} contas encontradas`);
  return accounts;
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

    console.log(`[meta-user-login] Usuario autenticado: ${user.id}`);

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
      console.error("[meta-user-login] META_APP_ID ou META_APP_SECRET nao configurados");
      return new Response(
        JSON.stringify({ error: "Configuracao do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------
    // 3. Trocar o authorization code pelo short-lived User Access Token
    // -------------------------------------------------------
    console.log("[meta-user-login] Trocando code por short-lived token...");

    const redirectUri = body.redirect_uri || "";
    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("code", code);
    if (redirectUri) {
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
    }

    const shortLivedResponse = await fetch(tokenUrl.toString());
    const shortLivedData: MetaTokenResponse = await shortLivedResponse.json();

    if (shortLivedData.error || !shortLivedData.access_token) {
      console.error("[meta-user-login] Erro ao trocar code:", shortLivedData.error);
      return new Response(
        JSON.stringify({
          error: "Falha ao obter token de acesso",
          details: shortLivedData.error?.message || "Resposta invalida da Meta API",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shortLivedToken = shortLivedData.access_token;
    console.log("[meta-user-login] Short-lived token obtido com sucesso");

    // -------------------------------------------------------
    // 4. Trocar short-lived por long-lived token (60 dias)
    // -------------------------------------------------------
    console.log("[meta-user-login] Trocando por long-lived token (60 dias)...");

    let accessToken = shortLivedToken;
    let tokenExpiresIn = shortLivedData.expires_in || 3600;
    let isLongLived = false;

    try {
      const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
      longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
      longLivedUrl.searchParams.set("client_id", metaAppId);
      longLivedUrl.searchParams.set("client_secret", metaAppSecret);
      longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

      const longLivedResponse = await fetch(longLivedUrl.toString());
      const longLivedData: MetaTokenResponse = await longLivedResponse.json();

      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        tokenExpiresIn = longLivedData.expires_in || 5184000;
        isLongLived = true;
        console.log(`[meta-user-login] Long-lived token obtido (expira em ${tokenExpiresIn}s)`);
      } else {
        console.warn("[meta-user-login] Nao conseguiu long-lived token, usando short-lived");
      }
    } catch (err) {
      console.warn("[meta-user-login] Erro ao obter long-lived token:", err);
    }

    // -------------------------------------------------------
    // 5. Validar token e obter informacoes do usuario
    // -------------------------------------------------------
    console.log("[meta-user-login] Validando token via /me...");

    const meResponse = await fetch(
      `${GRAPH_API_BASE}/me?fields=id,name,email&access_token=${accessToken}`
    );
    const meData: { id?: string; name?: string; email?: string; error?: { message: string; code: number } } =
      await meResponse.json();

    if (meData.error || !meData.id) {
      console.error("[meta-user-login] Token invalido:", meData.error);
      return new Response(
        JSON.stringify({
          error: "Token invalido apos troca",
          details: meData.error?.message || "Nao foi possivel validar o token",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-user-login] Usuario Meta: ${meData.id} (${meData.name})`);

    // -------------------------------------------------------
    // 6. Buscar ad accounts via /me/adaccounts (metodo principal)
    //    Com User Access Token, este endpoint retorna todas as contas
    //    que o usuario tem acesso, independente do Business Manager
    // -------------------------------------------------------
    console.log("[meta-user-login] Buscando ad accounts via /me/adaccounts...");

    const adAccounts = await fetchPaginatedAdAccounts(
      `${GRAPH_API_BASE}/me/adaccounts`,
      accessToken,
      "me_adaccounts"
    );

    console.log(`[meta-user-login] ${adAccounts.length} contas encontradas via /me/adaccounts`);

    // -------------------------------------------------------
    // 7. Buscar Business Manager ID do usuario (best-effort)
    // -------------------------------------------------------
    let businessManagerId = meData.id;

    try {
      const bizResponse = await fetch(
        `${GRAPH_API_BASE}/me/businesses?fields=id,name&limit=1&access_token=${accessToken}`
      );
      const bizData: { data?: Array<{ id: string; name: string }>; error?: { message: string } } =
        await bizResponse.json();

      if (bizData.data && bizData.data.length > 0) {
        businessManagerId = bizData.data[0].id;
        console.log(`[meta-user-login] Business Manager encontrado: ${businessManagerId} (${bizData.data[0].name})`);
      } else {
        console.log("[meta-user-login] Nenhum Business Manager encontrado, usando user ID");
      }
    } catch (err) {
      console.warn("[meta-user-login] Erro ao buscar BM:", err);
    }

    // -------------------------------------------------------
    // 8. Verificar permissoes concedidas
    // -------------------------------------------------------
    const grantedScopes: string[] = [];
    try {
      const permResponse = await fetch(
        `${GRAPH_API_BASE}/me/permissions?access_token=${accessToken}`
      );
      const permData: { data?: Array<{ permission: string; status: string }> } =
        await permResponse.json();

      if (permData.data) {
        for (const perm of permData.data) {
          if (perm.status === "granted") {
            grantedScopes.push(perm.permission);
          }
        }
      }
      console.log(`[meta-user-login] Permissoes concedidas: ${grantedScopes.join(", ")}`);
    } catch (err) {
      console.warn("[meta-user-login] Erro ao buscar permissoes:", err);
    }

    // -------------------------------------------------------
    // 9. Buscar ou criar workspace do usuario
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
      console.log(`[meta-user-login] Workspace (owner): ${workspaceId}`);
    } else {
      const { data: memberRecords } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberRecords && memberRecords.length > 0) {
        workspaceId = memberRecords[0].workspace_id;
        console.log(`[meta-user-login] Workspace (membro): ${workspaceId}`);
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

        console.log(`[meta-user-login] Novo workspace criado: ${workspaceId}`);
      }
    }

    // -------------------------------------------------------
    // 10. Criptografar o token
    // -------------------------------------------------------
    let encryptedToken = accessToken;
    try {
      const { data: encryptedData, error: encryptError } = await supabaseAdmin
        .rpc("encrypt_token", { p_token: accessToken });
      if (!encryptError && encryptedData) {
        encryptedToken = encryptedData;
        console.log("[meta-user-login] Token criptografado");
      }
    } catch {
      console.log("[meta-user-login] Criptografia nao disponivel, armazenando raw");
    }

    // -------------------------------------------------------
    // 11. Salvar ou atualizar conexao Meta
    //     connection_method='user_token' diferencia do 'manual' e 'flfb'
    //     token_expires_at = agora + expires_in segundos (60 dias para long-lived)
    // -------------------------------------------------------
    const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000).toISOString();
    const connectionName = meData.name || `Meta OAuth - ${meData.id}`;

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
          granted_scopes: grantedScopes,
          status: "connected",
          connection_method: "user_token",
          name: connectionName,
          token_expires_at: tokenExpiresAt,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[meta-user-login] Erro ao atualizar conexao:", updateError);
        return new Response(
          JSON.stringify({ error: "Falha ao atualizar conexao", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[meta-user-login] Conexao atualizada: ${connectionId}`);
    } else {
      const { data: newConn, error: insertError } = await supabaseAdmin
        .from("meta_connections")
        .insert({
          workspace_id: workspaceId,
          business_manager_id: businessManagerId,
          access_token_encrypted: encryptedToken,
          granted_scopes: grantedScopes,
          status: "connected",
          connection_method: "user_token",
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
        console.error("[meta-user-login] Erro ao inserir conexao:", insertError);
        return new Response(
          JSON.stringify({ error: "Falha ao salvar conexao", details: insertError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      connectionId = newConn.id;
      console.log(`[meta-user-login] Nova conexao criada: ${connectionId}`);
    }

    // -------------------------------------------------------
    // 12. Remover contas antigas que nao pertencem mais
    // -------------------------------------------------------
    if (adAccounts.length > 0) {
      const validAccountIds = adAccounts.map((acc) => acc.id);
      await supabaseAdmin
        .from("meta_ad_accounts")
        .delete()
        .eq("workspace_id", workspaceId)
        .not("meta_ad_account_id", "in", `(${validAccountIds.join(",")})`);
    }

    // -------------------------------------------------------
    // 13. Salvar ad accounts via upsert em batches
    // -------------------------------------------------------
    let savedCount = 0;

    if (adAccounts.length > 0) {
      const adAccountsToUpsert = adAccounts.map((acc) => ({
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
          console.error(`[meta-user-login] Upsert batch erro:`, upsertError);
        } else {
          savedCount += batch.length;
        }
      }

      console.log(`[meta-user-login] ${savedCount} contas salvas no banco`);

      // Criar/atualizar sync_state
      for (const acc of adAccounts) {
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
    // 14. Retornar sucesso
    // -------------------------------------------------------
    return new Response(
      JSON.stringify({
        status: "connected",
        connection_method: "user_token",
        workspace_id: workspaceId,
        business_manager_id: businessManagerId,
        meta_user_id: meData.id,
        meta_user_name: meData.name,
        meta_user_email: meData.email,
        adaccounts_count: adAccounts.length,
        saved_to_db: savedCount > 0 || adAccounts.length === 0,
        token_expires_at: tokenExpiresAt,
        is_long_lived: isLongLived,
        granted_scopes: grantedScopes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[meta-user-login] Erro inesperado:", err);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
