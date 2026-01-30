/**
 * Edge Function: google-validate-connection
 *
 * Valida as credenciais do Google Ads e salva a conexao.
 * Usa a API REST do Google Ads para validar acesso e listar contas.
 *
 * Fluxo:
 * 1. Recebe OAuth tokens + Developer Token + Customer ID
 * 2. Valida acesso a conta usando API real
 * 3. Se MCC, lista todas as sub-contas acessiveis
 * 4. Salva conexao e contas no banco de dados
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fetchCustomerInfo,
  listAccessibleAccounts,
  isTokenExpired,
  refreshGoogleAccessToken,
  formatCustomerId,
  cleanCustomerId,
} from "../_shared/google-ads-api.ts";

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
  access_token: string;
  refresh_token: string;
  token_expires_at?: string;
  oauth_email?: string;
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

    // Credenciais OAuth do Google (configuradas como secrets)
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

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
    const {
      developer_token,
      customer_id,
      login_customer_id,
      access_token,
      refresh_token,
      token_expires_at,
      oauth_email,
    } = body;

    // Validacao de campos obrigatorios
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

    if (!access_token || !refresh_token) {
      return new Response(
        JSON.stringify({
          error: "Missing OAuth tokens (access_token and refresh_token required)",
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanId = cleanCustomerId(customer_id);
    const cleanLoginId = login_customer_id
      ? cleanCustomerId(login_customer_id)
      : null;

    // Valida formato do Customer ID (deve ter 10 digitos)
    if (cleanId.length !== 10 || !/^\d{10}$/.test(cleanId)) {
      return new Response(
        JSON.stringify({
          error: `Customer ID invalido. Esperado formato XXX-XXX-XXXX ou 10 digitos. Recebido: ${customer_id}`,
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Valida formato do Developer Token
    if (developer_token.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Developer Token invalido. Verifique se copiou o token completo.",
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 1. VERIFICAR E RENOVAR TOKEN SE NECESSARIO
    // =====================================================
    let currentAccessToken = access_token;
    let currentExpiresAt = token_expires_at ? new Date(token_expires_at) : null;

    if (
      isTokenExpired(currentExpiresAt) &&
      googleClientId &&
      googleClientSecret
    ) {
      console.log("[google-validate-connection] Token expired, refreshing...");

      const refreshResult = await refreshGoogleAccessToken(
        refresh_token,
        googleClientId,
        googleClientSecret
      );

      if (refreshResult) {
        currentAccessToken = refreshResult.accessToken;
        currentExpiresAt = refreshResult.expiresAt;
        console.log("[google-validate-connection] Token refreshed successfully");
      } else {
        return new Response(
          JSON.stringify({
            error: "Failed to refresh OAuth token. Please reconnect.",
            status: "invalid",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // =====================================================
    // 2. VALIDAR CONEXAO COM GOOGLE ADS API
    // =====================================================
    console.log(
      `[google-validate-connection] Validating connection for customer: ${formatCustomerId(cleanId)}`
    );

    // Busca informacoes da conta principal
    const customerResult = await fetchCustomerInfo(
      currentAccessToken,
      developer_token,
      cleanId,
      cleanLoginId || undefined
    );

    if (customerResult.error) {
      console.error(
        "[google-validate-connection] API validation failed:",
        customerResult.error
      );
      return new Response(
        JSON.stringify({
          error: `Falha na validacao: ${customerResult.error}`,
          status: "invalid",
          details: customerResult.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const customerInfo = customerResult.data!;
    console.log(
      `[google-validate-connection] Customer validated: ${customerInfo.descriptiveName} (Manager: ${customerInfo.manager})`
    );

    // =====================================================
    // 3. SE FOR MCC, LISTAR SUB-CONTAS
    // =====================================================
    interface AccountInfo {
      customer_id: string;
      name: string;
      currency_code: string;
      timezone: string;
      is_manager: boolean;
    }

    const accounts: AccountInfo[] = [];

    // Adiciona a conta principal
    accounts.push({
      customer_id: cleanId,
      name: customerInfo.descriptiveName,
      currency_code: customerInfo.currencyCode,
      timezone: customerInfo.timeZone,
      is_manager: customerInfo.manager,
    });

    // Se for conta MCC, busca sub-contas
    if (customerInfo.manager) {
      console.log("[google-validate-connection] MCC detected, fetching client accounts...");

      const clientsResult = await listAccessibleAccounts(
        currentAccessToken,
        developer_token,
        cleanLoginId || cleanId
      );

      if (clientsResult.data && clientsResult.data.length > 0) {
        for (const client of clientsResult.data) {
          // Extrai customer ID do resourceName (formato: customers/XXXXXXXXXX)
          const clientId = client.id || client.clientCustomer.split("/").pop() || "";

          // Nao adiciona a conta MCC novamente
          if (clientId !== cleanId && clientId !== cleanLoginId) {
            accounts.push({
              customer_id: clientId,
              name: client.descriptiveName || `Account ${formatCustomerId(clientId)}`,
              currency_code: client.currencyCode || "BRL",
              timezone: client.timeZone || "America/Sao_Paulo",
              is_manager: client.manager || false,
            });
          }
        }

        console.log(
          `[google-validate-connection] Found ${accounts.length - 1} client accounts`
        );
      }
    }

    // =====================================================
    // 4. BUSCAR OU CRIAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string;

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

        await supabaseAdmin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
        });
      }
    }

    // =====================================================
    // 5. SALVAR/ATUALIZAR CONEXAO GOOGLE
    // =====================================================
    const { data: existingConnection } = await supabaseAdmin
      .from("google_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let connectionId: string;

    const connectionData = {
      developer_token,
      customer_id: cleanId,
      login_customer_id: cleanLoginId,
      access_token: currentAccessToken,
      refresh_token,
      token_expires_at: currentExpiresAt?.toISOString() || null,
      oauth_email: oauth_email || null,
      oauth_client_id: googleClientId || null,
      status: "active",
      last_validated_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    if (existingConnection) {
      connectionId = existingConnection.id;
      const { error } = await supabaseAdmin
        .from("google_connections")
        .update(connectionData)
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
          ...connectionData,
          created_at: new Date().toISOString(),
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
    // 6. SALVAR CONTAS NO BANCO
    // =====================================================
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
    // 7. RETORNAR SUCESSO
    // =====================================================
    return new Response(
      JSON.stringify({
        status: "connected",
        workspace_id: workspaceId,
        customer_id: formatCustomerId(cleanId),
        customer_name: customerInfo.descriptiveName,
        is_manager: customerInfo.manager,
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
