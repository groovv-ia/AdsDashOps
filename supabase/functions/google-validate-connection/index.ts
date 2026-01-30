/**
 * Edge Function: google-validate-connection
 *
 * Valida as credenciais do Google Ads e salva a conexao.
 * Usa a API REST do Google Ads para validar acesso e listar contas.
 *
 * Fluxo:
 * 1. Recebe OAuth credentials + Developer Token + Customer ID do frontend
 * 2. Valida acesso a conta usando API real
 * 3. Se MCC, lista todas as sub-contas acessiveis
 * 4. Armazena credenciais sensiveis no Vault (oauth_client_secret, developer_token, refresh_token)
 * 5. Salva conexao e contas no banco de dados
 *
 * IMPORTANTE: Todas as credenciais OAuth sao fornecidas pelo usuario no formulario.
 * Nao usamos variaveis de ambiente para credenciais - cada conexao tem suas proprias.
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

// Interface para payload de entrada (atualizada com credenciais OAuth completas)
interface ValidateConnectionPayload {
  // Credenciais OAuth do Google Cloud Console (obrigatorias)
  oauth_client_id: string;
  oauth_client_secret: string;
  // Tokens OAuth (obrigatorios - usuario obtem manualmente via OAuth Playground)
  refresh_token: string;
  // Credenciais Google Ads API (obrigatorias)
  developer_token: string;
  customer_id: string;
  // Opcional: Login Customer ID para MCC
  login_customer_id?: string;
  // Opcional: Access token (se fornecido, tenta usar; senao, gera via refresh)
  access_token?: string;
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

    // Cliente admin para bypass de RLS e acesso ao Vault
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: ValidateConnectionPayload = await req.json();
    const {
      oauth_client_id,
      oauth_client_secret,
      refresh_token,
      developer_token,
      customer_id,
      login_customer_id,
      access_token,
      token_expires_at,
      oauth_email,
    } = body;

    // =====================================================
    // VALIDACAO: Campos obrigatorios
    // =====================================================
    if (!oauth_client_id?.trim()) {
      return new Response(
        JSON.stringify({
          error: "OAuth Client ID e obrigatorio. Obtenha no Google Cloud Console.",
          status: "invalid",
          field: "oauth_client_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!oauth_client_secret?.trim()) {
      return new Response(
        JSON.stringify({
          error: "OAuth Client Secret e obrigatorio. Obtenha no Google Cloud Console.",
          status: "invalid",
          field: "oauth_client_secret",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!refresh_token?.trim()) {
      return new Response(
        JSON.stringify({
          error: "Refresh Token e obrigatorio. Obtenha via OAuth Playground ou script.",
          status: "invalid",
          field: "refresh_token",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!developer_token?.trim()) {
      return new Response(
        JSON.stringify({
          error: "Developer Token e obrigatorio. Obtenha no Google Ads API Center.",
          status: "invalid",
          field: "developer_token",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!customer_id?.trim()) {
      return new Response(
        JSON.stringify({
          error: "Customer ID e obrigatorio.",
          status: "invalid",
          field: "customer_id",
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
          field: "customer_id",
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
          field: "developer_token",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 1. OBTER/RENOVAR ACCESS TOKEN
    // =====================================================
    let currentAccessToken = access_token || "";
    let currentExpiresAt = token_expires_at ? new Date(token_expires_at) : null;

    // Se nao temos access_token ou ele expirou, renovamos usando refresh_token
    if (!currentAccessToken || isTokenExpired(currentExpiresAt)) {
      console.log("[google-validate-connection] Obtaining new access token...");

      const refreshResult = await refreshGoogleAccessToken(
        refresh_token,
        oauth_client_id,
        oauth_client_secret
      );

      if (refreshResult) {
        currentAccessToken = refreshResult.accessToken;
        currentExpiresAt = refreshResult.expiresAt;
        console.log("[google-validate-connection] Access token obtained successfully");
      } else {
        return new Response(
          JSON.stringify({
            error: "Falha ao obter access token. Verifique as credenciais OAuth (Client ID, Client Secret e Refresh Token).",
            status: "invalid",
            hint: "Certifique-se de que o Refresh Token foi gerado com o mesmo Client ID/Secret.",
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

    // Dados basicos da conexao (sem credenciais sensiveis)
    const connectionData = {
      customer_id: cleanId,
      login_customer_id: cleanLoginId,
      access_token: currentAccessToken,
      token_expires_at: currentExpiresAt?.toISOString() || null,
      oauth_email: oauth_email || null,
      oauth_client_id: oauth_client_id, // Nao e secret, pode ficar na tabela
      status: "active",
      last_validated_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
      // Campos antigos mantidos para compatibilidade temporaria
      developer_token: developer_token,
      refresh_token: refresh_token,
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
    // 6. ARMAZENAR CREDENCIAIS SENSIVEIS NO VAULT
    // =====================================================
    console.log("[google-validate-connection] Storing secrets in Vault...");

    try {
      // Armazena oauth_client_secret no Vault
      const { data: clientSecretResult } = await supabaseAdmin.rpc(
        "store_google_connection_secret",
        {
          p_connection_id: connectionId,
          p_secret_type: "oauth_client_secret",
          p_secret_value: oauth_client_secret,
        }
      );

      // Armazena developer_token no Vault
      const { data: devTokenResult } = await supabaseAdmin.rpc(
        "store_google_connection_secret",
        {
          p_connection_id: connectionId,
          p_secret_type: "developer_token",
          p_secret_value: developer_token,
        }
      );

      // Armazena refresh_token no Vault
      const { data: refreshTokenResult } = await supabaseAdmin.rpc(
        "store_google_connection_secret",
        {
          p_connection_id: connectionId,
          p_secret_type: "refresh_token",
          p_secret_value: refresh_token,
        }
      );

      // Atualiza conexao com os IDs dos secrets no Vault
      await supabaseAdmin
        .from("google_connections")
        .update({
          oauth_client_secret_id: clientSecretResult,
          developer_token_id: devTokenResult,
          refresh_token_id: refreshTokenResult,
        })
        .eq("id", connectionId);

      console.log("[google-validate-connection] Secrets stored in Vault successfully");
    } catch (vaultError) {
      // Se falhar o Vault, ainda funciona com campos antigos
      console.error("[google-validate-connection] Vault storage error (non-fatal):", vaultError);
    }

    // =====================================================
    // 7. SALVAR CONTAS NO BANCO
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
    // 8. RETORNAR SUCESSO
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
