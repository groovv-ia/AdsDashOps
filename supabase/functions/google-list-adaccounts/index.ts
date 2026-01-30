/**
 * Edge Function: google-list-adaccounts
 *
 * Lista todas as contas de anuncio do Google Ads vinculadas ao workspace.
 * Pode opcionalmente atualizar a lista buscando da API do Google Ads.
 *
 * Parametros:
 * - refresh: boolean - Se true, busca contas atualizadas da API
 *
 * IMPORTANTE: Credenciais OAuth sao lidas do Vault por conexao.
 * Nao usamos variaveis de ambiente para credenciais.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  listAccessibleAccounts,
  isTokenExpired,
  refreshGoogleAccessToken,
  formatCustomerId,
} from "../_shared/google-ads-api.ts";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para conta de anuncio
interface GoogleAdAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  customer_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
  is_manager: boolean;
  is_selected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para conexao Google
interface GoogleConnection {
  id: string;
  workspace_id: string;
  developer_token: string;
  customer_id: string;
  login_customer_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  oauth_client_id: string | null;
  oauth_client_secret_id: string | null;
  developer_token_id: string | null;
  refresh_token_id: string | null;
  status: string;
}

// Interface para credenciais do Vault
interface VaultCredentials {
  oauth_client_secret: string;
  developer_token: string;
  refresh_token: string;
}

/**
 * Busca credenciais do Vault para uma conexao
 */
async function getVaultCredentials(
  supabaseAdmin: ReturnType<typeof createClient>,
  connectionId: string
): Promise<VaultCredentials | null> {
  try {
    // Busca oauth_client_secret do Vault
    const { data: clientSecret } = await supabaseAdmin.rpc(
      "get_google_connection_secret",
      {
        p_connection_id: connectionId,
        p_secret_type: "oauth_client_secret",
      }
    );

    // Busca developer_token do Vault
    const { data: devToken } = await supabaseAdmin.rpc(
      "get_google_connection_secret",
      {
        p_connection_id: connectionId,
        p_secret_type: "developer_token",
      }
    );

    // Busca refresh_token do Vault
    const { data: refreshToken } = await supabaseAdmin.rpc(
      "get_google_connection_secret",
      {
        p_connection_id: connectionId,
        p_secret_type: "refresh_token",
      }
    );

    // Verifica se todos os secrets foram encontrados
    if (!clientSecret || !devToken || !refreshToken) {
      console.log("[google-list-adaccounts] Vault credentials incomplete, will try fallback");
      return null;
    }

    return {
      oauth_client_secret: clientSecret,
      developer_token: devToken,
      refresh_token: refreshToken,
    };
  } catch (error) {
    console.error("[google-list-adaccounts] Error fetching Vault credentials:", error);
    return null;
  }
}

// Handler principal
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Aceita GET e POST
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-list-adaccounts] User authenticated: ${user.email}`);

    // Cliente admin para bypass de RLS e acesso ao Vault
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica se deve atualizar da API
    let refresh = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        refresh = body.refresh === true;
      } catch {
        // Ignora erro de parse, usa refresh = false
      }
    }

    // =====================================================
    // 1. BUSCAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string | null = null;

    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          error: "Workspace not found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-list-adaccounts] Workspace: ${workspaceId}`);

    // =====================================================
    // 2. VERIFICAR CONEXAO GOOGLE
    // =====================================================
    const { data: connection } = await supabaseAdmin
      .from("google_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle() as { data: GoogleConnection | null };

    if (!connection) {
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          connected: false,
          message: "Google Ads not connected",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 3. SE REFRESH, BUSCAR CONTAS DA API
    // =====================================================
    if (refresh) {
      console.log("[google-list-adaccounts] Refreshing accounts from API...");

      // Busca credenciais do Vault
      const vaultCredentials = await getVaultCredentials(supabaseAdmin, connection.id);

      // Determina as credenciais a usar
      const oauthClientId = connection.oauth_client_id;
      let oauthClientSecret: string | null = null;
      let developerToken: string | null = null;
      let refreshToken: string | null = null;

      if (vaultCredentials) {
        oauthClientSecret = vaultCredentials.oauth_client_secret;
        developerToken = vaultCredentials.developer_token;
        refreshToken = vaultCredentials.refresh_token;
        console.log("[google-list-adaccounts] Using credentials from Vault");
      } else {
        // Fallback para campos antigos
        developerToken = connection.developer_token;
        refreshToken = connection.refresh_token;
        console.log("[google-list-adaccounts] Using fallback credentials from connection table");
      }

      // Verifica se temos as credenciais necessarias
      if (!developerToken || !refreshToken) {
        console.error("[google-list-adaccounts] Missing credentials for refresh");
        return new Response(
          JSON.stringify({
            accounts: [],
            total: 0,
            error: "Missing credentials. Please reconnect Google Ads.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let accessToken = connection.access_token || "";
      const tokenExpiresAt = connection.token_expires_at
        ? new Date(connection.token_expires_at)
        : null;

      // Verifica se precisa renovar token
      if (isTokenExpired(tokenExpiresAt)) {
        if (!oauthClientId || !oauthClientSecret) {
          console.error("[google-list-adaccounts] Cannot refresh token - missing OAuth credentials");
          return new Response(
            JSON.stringify({
              accounts: [],
              total: 0,
              error: "OAuth credentials incomplete. Please reconnect Google Ads with full credentials.",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log("[google-list-adaccounts] Token expired, refreshing...");

        const refreshResult = await refreshGoogleAccessToken(
          refreshToken,
          oauthClientId,
          oauthClientSecret
        );

        if (refreshResult) {
          accessToken = refreshResult.accessToken;

          // Atualiza token no banco
          await supabaseAdmin
            .from("google_connections")
            .update({
              access_token: refreshResult.accessToken,
              token_expires_at: refreshResult.expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          console.log("[google-list-adaccounts] Token refreshed successfully");
        } else {
          console.error("[google-list-adaccounts] Failed to refresh token");
          return new Response(
            JSON.stringify({
              accounts: [],
              total: 0,
              error: "Failed to refresh OAuth token. Please reconnect.",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Busca contas da API
      const loginCustomerId =
        connection.login_customer_id || connection.customer_id;

      const accountsResult = await listAccessibleAccounts(
        accessToken,
        developerToken,
        loginCustomerId
      );

      if (accountsResult.data && accountsResult.data.length > 0) {
        console.log(
          `[google-list-adaccounts] Found ${accountsResult.data.length} accounts from API`
        );

        // Atualiza contas no banco
        for (const apiAccount of accountsResult.data) {
          const clientId =
            apiAccount.id ||
            apiAccount.clientCustomer.split("/").pop() ||
            "";

          await supabaseAdmin.from("google_ad_accounts").upsert(
            {
              workspace_id: workspaceId,
              connection_id: connection.id,
              customer_id: clientId,
              name:
                apiAccount.descriptiveName ||
                `Account ${formatCustomerId(clientId)}`,
              currency_code: apiAccount.currencyCode || "BRL",
              timezone: apiAccount.timeZone || "America/Sao_Paulo",
              status: "ENABLED",
              is_manager: apiAccount.manager || false,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "workspace_id,customer_id",
              ignoreDuplicates: false,
            }
          );
        }
      } else if (accountsResult.error) {
        console.error(
          "[google-list-adaccounts] API error:",
          accountsResult.error
        );
      }
    }

    // =====================================================
    // 4. BUSCAR CONTAS DO BANCO
    // =====================================================
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("google_ad_accounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (accountsError) {
      console.error(
        "[google-list-adaccounts] Error fetching accounts:",
        accountsError
      );
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          error: accountsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 5. FORMATAR E RETORNAR RESPOSTA
    // =====================================================
    const formattedAccounts = (accounts || []).map((acc: GoogleAdAccount) => ({
      ...acc,
      customer_id_formatted: formatCustomerId(acc.customer_id),
    }));

    const selectedCount = formattedAccounts.filter(
      (acc: GoogleAdAccount & { customer_id_formatted: string }) =>
        acc.is_selected
    ).length;

    console.log(
      `[google-list-adaccounts] Found ${formattedAccounts.length} accounts, ${selectedCount} selected`
    );

    return new Response(
      JSON.stringify({
        accounts: formattedAccounts,
        total: formattedAccounts.length,
        selected_count: selectedCount,
        connected: connection.status === "active",
        connection_customer_id: formatCustomerId(connection.customer_id),
        has_oauth: Boolean(connection.access_token),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[google-list-adaccounts] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        accounts: [],
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
