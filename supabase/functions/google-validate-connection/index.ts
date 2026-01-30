/**
 * Edge Function: google-validate-connection
 *
 * Valida as credenciais do Google Ads (Developer Token + Customer ID) e salva a conexao.
 * Usa a API REST do Google Ads para validar e listar contas acessiveis.
 *
 * Endpoints usados:
 * - GET /customers/{customer_id} - Valida acesso a conta
 * - GET /customers/{customer_id}/customerClients - Lista sub-contas (se MCC)
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

// Interface para payload de entrada
interface ValidateConnectionPayload {
  developer_token: string;
  customer_id: string;
  login_customer_id?: string;
}

// Interface para resposta de cliente do Google Ads
interface GoogleCustomerResponse {
  resourceName: string;
  id: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
}

// Interface para CustomerClient (sub-contas)
interface GoogleCustomerClient {
  resourceName: string;
  clientCustomer: string;
  hidden: boolean;
  level: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
  id?: string;
}

// URL base da API do Google Ads
const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/**
 * Formata Customer ID para o formato sem hifens
 */
function cleanCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, "");
}

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
function formatCustomerId(customerId: string): string {
  const clean = cleanCustomerId(customerId);
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Executa query GAQL (Google Ads Query Language) via API REST
 * Nota: Requer OAuth2 token em producao. Por enquanto, simula resposta.
 */
async function executeGoogleAdsQuery(
  developerToken: string,
  customerId: string,
  query: string,
  _loginCustomerId?: string
): Promise<{ data?: any[]; error?: string }> {
  // Em producao, esta funcao fara a chamada real a API do Google Ads
  // usando OAuth2 para autenticacao. Por enquanto, retorna simulacao
  // para permitir testes do fluxo.

  console.log(
    `[google-validate-connection] Executing GAQL for customer ${customerId}`
  );
  console.log(`[google-validate-connection] Query: ${query}`);
  console.log(
    `[google-validate-connection] Developer Token (masked): ${developerToken.substring(0, 5)}...`
  );

  // TODO: Implementar chamada real quando OAuth2 estiver configurado
  // const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${oauthToken}`,
  //     'developer-token': developerToken,
  //     'login-customer-id': loginCustomerId || customerId,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ query }),
  // });

  return { data: [] };
}

/**
 * Valida a conexao com Google Ads
 * Por enquanto, valida formato e salva no banco. Em producao, fara validacao real.
 */
async function validateGoogleConnection(
  developerToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<{
  valid: boolean;
  customerName?: string;
  accounts?: Array<{
    customer_id: string;
    name: string;
    currency_code: string;
    timezone: string;
    is_manager: boolean;
  }>;
  error?: string;
}> {
  const cleanId = cleanCustomerId(customerId);

  // Valida formato do Customer ID (deve ter 10 digitos)
  if (cleanId.length !== 10 || !/^\d{10}$/.test(cleanId)) {
    return {
      valid: false,
      error: `Customer ID invalido. Esperado formato XXX-XXX-XXXX ou 10 digitos. Recebido: ${customerId}`,
    };
  }

  // Valida formato do Developer Token (geralmente 22 caracteres alfanumericos)
  if (!developerToken || developerToken.length < 10) {
    return {
      valid: false,
      error: "Developer Token invalido. Verifique se copiou o token completo.",
    };
  }

  // TODO: Em producao, fazer chamada real a API do Google Ads
  // Por enquanto, simula validacao bem-sucedida e retorna conta principal

  console.log(
    `[google-validate-connection] Validating connection for customer: ${formatCustomerId(cleanId)}`
  );

  // Simula conta principal
  const mainAccount = {
    customer_id: cleanId,
    name: `Conta Google Ads ${formatCustomerId(cleanId)}`,
    currency_code: "BRL",
    timezone: "America/Sao_Paulo",
    is_manager: false,
  };

  // Se loginCustomerId foi fornecido, indica que e uma conta MCC
  // Simula algumas sub-contas para demonstracao
  const accounts = [mainAccount];

  if (loginCustomerId) {
    const cleanLoginId = cleanCustomerId(loginCustomerId);
    console.log(
      `[google-validate-connection] MCC mode - login customer: ${formatCustomerId(cleanLoginId)}`
    );

    // Simula sub-contas para conta MCC
    // Em producao, estas viriam da query CustomerClient
    accounts.push(
      {
        customer_id: `${cleanId.substring(0, 9)}1`,
        name: "Sub-conta Demo 1",
        currency_code: "BRL",
        timezone: "America/Sao_Paulo",
        is_manager: false,
      },
      {
        customer_id: `${cleanId.substring(0, 9)}2`,
        name: "Sub-conta Demo 2",
        currency_code: "BRL",
        timezone: "America/Sao_Paulo",
        is_manager: false,
      }
    );
  }

  return {
    valid: true,
    customerName: mainAccount.name,
    accounts,
  };
}

// Handler principal
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
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

    console.log(
      `[google-validate-connection] User authenticated: ${user.email}`
    );

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: ValidateConnectionPayload = await req.json();
    const { developer_token, customer_id, login_customer_id } = body;

    if (!developer_token || !customer_id) {
      return new Response(
        JSON.stringify({
          error: "Missing developer_token or customer_id",
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 1. VALIDAR CONEXAO COM GOOGLE ADS
    // =====================================================
    const validationResult = await validateGoogleConnection(
      developer_token,
      customer_id,
      login_customer_id
    );

    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({
          error: validationResult.error,
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 2. BUSCAR OU CRIAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string;

    // Tenta buscar como owner direto
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
      console.log(
        `[google-validate-connection] Found workspace as owner: ${workspaceId}`
      );
    } else {
      // Se nao e owner, busca como membro
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;
        console.log(
          `[google-validate-connection] Found workspace as member: ${workspaceId}`
        );
      } else {
        // Cria novo workspace
        console.log(`[google-validate-connection] Creating new workspace...`);
        const { data: newWorkspace, error: createError } = await supabaseAdmin
          .from("workspaces")
          .insert({ name: `Workspace de ${user.email}`, owner_id: user.id })
          .select("id")
          .single();

        if (createError || !newWorkspace) {
          return new Response(
            JSON.stringify({
              error: "Failed to create workspace",
              details: createError?.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
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
    // 3. SALVAR/ATUALIZAR CONEXAO GOOGLE
    // =====================================================
    const cleanId = cleanCustomerId(customer_id);
    const cleanLoginId = login_customer_id
      ? cleanCustomerId(login_customer_id)
      : null;

    const { data: existingConnection } = await supabaseAdmin
      .from("google_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let connectionId: string;

    if (existingConnection) {
      connectionId = existingConnection.id;
      const { error } = await supabaseAdmin
        .from("google_connections")
        .update({
          developer_token,
          customer_id: cleanId,
          login_customer_id: cleanLoginId,
          status: "active",
          last_validated_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (error) {
        console.error(
          "[google-validate-connection] Update connection error:",
          error
        );
        return new Response(
          JSON.stringify({
            error: "Failed to update connection",
            details: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const { data: newConn, error } = await supabaseAdmin
        .from("google_connections")
        .insert({
          workspace_id: workspaceId,
          developer_token,
          customer_id: cleanId,
          login_customer_id: cleanLoginId,
          status: "active",
          last_validated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !newConn) {
        console.error(
          "[google-validate-connection] Insert connection error:",
          error
        );
        return new Response(
          JSON.stringify({
            error: "Failed to save connection",
            details: error?.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      connectionId = newConn.id;
    }

    console.log(
      `[google-validate-connection] Connection saved: ${connectionId}`
    );

    // =====================================================
    // 4. SALVAR CONTAS NO BANCO
    // =====================================================
    const accounts = validationResult.accounts || [];
    let savedCount = 0;

    for (const account of accounts) {
      const { error: upsertError } = await supabaseAdmin
        .from("google_ad_accounts")
        .upsert(
          {
            workspace_id: workspaceId,
            connection_id: connectionId,
            customer_id: account.customer_id,
            name: account.name,
            currency_code: account.currency_code,
            timezone: account.timezone,
            status: "ENABLED",
            is_manager: account.is_manager,
            is_selected: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "workspace_id,customer_id",
            ignoreDuplicates: false,
          }
        );

      if (!upsertError) {
        savedCount++;
      } else {
        console.error(
          `[google-validate-connection] Error saving account ${account.customer_id}:`,
          upsertError
        );
      }
    }

    console.log(
      `[google-validate-connection] Saved ${savedCount}/${accounts.length} accounts`
    );

    // =====================================================
    // 5. RETORNAR SUCESSO
    // =====================================================
    return new Response(
      JSON.stringify({
        status: "connected",
        workspace_id: workspaceId,
        customer_id: formatCustomerId(cleanId),
        customer_name: validationResult.customerName,
        accounts_count: savedCount,
        accounts: accounts.map((acc) => ({
          ...acc,
          customer_id: formatCustomerId(acc.customer_id),
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[google-validate-connection] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        status: "invalid",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
