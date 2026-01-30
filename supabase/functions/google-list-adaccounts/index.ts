/**
 * Edge Function: google-list-adaccounts
 *
 * Lista contas de anuncio do Google Ads.
 *
 * Modos de operacao:
 * 1. OAuth Mode: Se access_token e developer_token forem fornecidos,
 *    busca contas diretamente da Google Ads API
 * 2. Database Mode: Caso contrario, retorna contas do banco de dados
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Interface para conta retornada pela API do Google
interface GoogleApiAccount {
  customer_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
  is_manager?: boolean;
}

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, "");
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Busca contas acessiveis via Google Ads API usando OAuth token
 */
async function fetchAccountsFromGoogleApi(
  accessToken: string,
  developerToken: string
): Promise<GoogleApiAccount[]> {
  console.log("[google-list-adaccounts] Fetching accounts from Google Ads API");

  // URL da Google Ads API para listar clientes acessiveis
  const apiUrl =
    "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers";

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[google-list-adaccounts] API Error:", errorText);
    throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const resourceNames: string[] = data.resourceNames || [];

  console.log(
    `[google-list-adaccounts] Found ${resourceNames.length} accessible customers`
  );

  // Para cada cliente acessivel, busca detalhes
  const accounts: GoogleApiAccount[] = [];

  for (const resourceName of resourceNames) {
    // Extrai customer ID do resourceName (format: customers/1234567890)
    const customerId = resourceName.replace("customers/", "");

    try {
      // Busca detalhes da conta
      const detailsUrl = `https://googleads.googleapis.com/v17/${resourceName}`;
      const detailsResponse = await fetch(detailsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerId,
        },
      });

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        accounts.push({
          customer_id: customerId,
          name: details.descriptiveName || `Account ${formatCustomerId(customerId)}`,
          currency_code: details.currencyCode || "BRL",
          timezone: details.timeZone || "America/Sao_Paulo",
          status: details.status || "ENABLED",
          is_manager: details.manager || false,
        });
      } else {
        // Se nao conseguir detalhes, adiciona com info basica
        accounts.push({
          customer_id: customerId,
          name: `Account ${formatCustomerId(customerId)}`,
          currency_code: "BRL",
          timezone: "America/Sao_Paulo",
          status: "ENABLED",
        });
      }
    } catch (detailError) {
      console.warn(
        `[google-list-adaccounts] Could not fetch details for ${customerId}:`,
        detailError
      );
      // Adiciona com info basica
      accounts.push({
        customer_id: customerId,
        name: `Account ${formatCustomerId(customerId)}`,
        currency_code: "BRL",
        timezone: "America/Sao_Paulo",
        status: "ENABLED",
      });
    }
  }

  return accounts;
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

    // Parseia body se for POST
    let body: {
      access_token?: string;
      developer_token?: string;
    } = {};

    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // =====================================================
    // MODO OAUTH: Busca contas direto da API do Google
    // =====================================================
    if (body.access_token && body.developer_token) {
      console.log("[google-list-adaccounts] OAuth mode - fetching from Google API");

      try {
        const accounts = await fetchAccountsFromGoogleApi(
          body.access_token,
          body.developer_token
        );

        return new Response(
          JSON.stringify({
            accounts,
            total: accounts.length,
            mode: "oauth",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (apiError) {
        console.error("[google-list-adaccounts] OAuth mode error:", apiError);
        return new Response(
          JSON.stringify({
            accounts: [],
            total: 0,
            error: apiError instanceof Error ? apiError.message : "API error",
            mode: "oauth",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // =====================================================
    // MODO DATABASE: Busca contas do banco de dados
    // =====================================================
    console.log("[google-list-adaccounts] Database mode - fetching from Supabase");

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

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // 1. BUSCAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string | null = null;

    // Tenta buscar como owner
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      // Busca como membro
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
      .select("id, customer_id, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

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
    // 3. BUSCAR CONTAS DO BANCO
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
    // 4. FORMATAR E RETORNAR RESPOSTA
    // =====================================================
    const formattedAccounts = (accounts || []).map((acc: GoogleAdAccount) => ({
      ...acc,
      customer_id_formatted: formatCustomerId(acc.customer_id),
    }));

    const selectedCount = formattedAccounts.filter(
      (acc: any) => acc.is_selected
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
