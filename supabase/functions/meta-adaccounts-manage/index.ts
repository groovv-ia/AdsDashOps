/**
 * Edge Function: meta-adaccounts-manage
 *
 * Gerencia catalogo de Ad Accounts e vinculos com clientes.
 *
 * Endpoints:
 * - POST /sync: Sincroniza ad accounts de uma conexao
 * - GET /list: Lista catalogo de ad accounts do workspace
 * - POST /bind-to-client: Vincula ad account a um cliente
 * - POST /unbind: Remove vinculo de ad account
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para resposta de adaccounts do Meta
interface MetaAdAccountsResponse {
  data?: Array<{
    id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name?: string;
  }>;
  paging?: { next?: string };
  error?: { message: string; code: number };
}

Deno.serve(async (req: Request) => {
  // Trata requisicoes OPTIONS para CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Valida header de autorizacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializa clientes Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o workspace do usuario
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Roteamento por acao
    switch (action) {
      case "sync":
        return await handleSync(req, supabaseAdmin, workspace.id);

      case "list":
        return await handleList(supabaseAdmin, workspace.id);

      case "bind-to-client":
        return await handleBindToClient(req, supabaseAdmin, workspace.id);

      case "unbind":
        return await handleUnbind(req, supabaseAdmin, workspace.id);

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Sincroniza ad accounts de uma conexao especifica
 */
async function handleSync(
  req: Request,
  supabaseAdmin: any,
  workspaceId: string
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { connection_id } = await req.json();

  if (!connection_id) {
    return new Response(
      JSON.stringify({ error: "Missing connection_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Buscar conexao
  const { data: connection } = await supabaseAdmin
    .from("meta_connections")
    .select("id, access_token_encrypted, status, is_default")
    .eq("id", connection_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!connection) {
    return new Response(
      JSON.stringify({ error: "Connection not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (connection.status !== "connected") {
    return new Response(
      JSON.stringify({ error: "Connection is not active" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Descriptografar token
  const { data: decryptedToken } = await supabaseAdmin
    .rpc("decrypt_token", { p_encrypted_token: connection.access_token_encrypted });

  const accessToken = decryptedToken || connection.access_token_encrypted;

  // Buscar ad accounts do Meta (com paginacao)
  let allAccounts: Array<{ id: string; name: string; account_status: number; currency: string; timezone_name?: string }> = [];
  let nextUrl: string | null = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${accessToken}`;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data: MetaAdAccountsResponse = await response.json();

    if (data.error) {
      return new Response(
        JSON.stringify({ error: "Meta API error", details: data.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data.data) {
      allAccounts = allAccounts.concat(data.data);
    }

    nextUrl = data.paging?.next || null;
  }

  // Processar cada ad account
  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const account of allAccounts) {
    // Verificar se ja tem vinculo com cliente (para preservar connection_id)
    const { data: existingBinding } = await supabaseAdmin
      .from("client_meta_ad_accounts")
      .select("connection_id")
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", account.id)
      .maybeSingle();

    // Determinar primary_connection_id
    let primaryConnectionId = connection.id;
    if (existingBinding?.connection_id) {
      // Se ja tem vinculo, manter a conexao do vinculo
      primaryConnectionId = existingBinding.connection_id;
    } else if (!connection.is_default) {
      // Se nao tem vinculo e conexao atual nao e default, verificar se ja existe registro
      const { data: existingAccount } = await supabaseAdmin
        .from("meta_ad_accounts")
        .select("primary_connection_id")
        .eq("workspace_id", workspaceId)
        .eq("meta_ad_account_id", account.id)
        .maybeSingle();

      if (existingAccount?.primary_connection_id) {
        primaryConnectionId = existingAccount.primary_connection_id;
      }
    }

    // Upsert na tabela meta_ad_accounts
    const { error: upsertError } = await supabaseAdmin
      .from("meta_ad_accounts")
      .upsert({
        workspace_id: workspaceId,
        meta_ad_account_id: account.id,
        name: account.name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        account_status: String(account.account_status),
        primary_connection_id: primaryConnectionId,
        last_synced_at: now,
      }, { onConflict: "workspace_id,meta_ad_account_id" });

    if (!upsertError) {
      updatedCount++;
    }

    // Registrar acesso desta conexao
    await supabaseAdmin
      .from("meta_ad_account_access")
      .upsert({
        workspace_id: workspaceId,
        meta_ad_account_id: account.id,
        connection_id: connection.id,
        can_read: true,
        last_seen_at: now,
      }, { onConflict: "workspace_id,meta_ad_account_id,connection_id" });
  }

  // Atualizar last_validated_at da conexao
  await supabaseAdmin
    .from("meta_connections")
    .update({ last_validated_at: now })
    .eq("id", connection_id);

  return new Response(
    JSON.stringify({
      success: true,
      total_accounts: allAccounts.length,
      updated_accounts: updatedCount,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Lista catalogo de ad accounts do workspace
 */
async function handleList(supabaseAdmin: any, workspaceId: string): Promise<Response> {
  // Buscar ad accounts com dados de vinculo
  const { data: accounts, error } = await supabaseAdmin
    .from("meta_ad_accounts")
    .select(`
      id,
      workspace_id,
      meta_ad_account_id,
      name,
      currency,
      timezone_name,
      account_status,
      primary_connection_id,
      last_synced_at
    `)
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch accounts", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Enriquecer com dados de conexao e vinculo
  const enrichedAccounts = [];
  for (const account of accounts || []) {
    // Buscar nome da conexao primaria
    let primaryConnectionName = null;
    if (account.primary_connection_id) {
      const { data: conn } = await supabaseAdmin
        .from("meta_connections")
        .select("name")
        .eq("id", account.primary_connection_id)
        .maybeSingle();
      primaryConnectionName = conn?.name;
    }

    // Buscar vinculo com cliente
    const { data: binding } = await supabaseAdmin
      .from("client_meta_ad_accounts")
      .select(`
        client_id,
        connection_id,
        status,
        clients(name)
      `)
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", account.meta_ad_account_id)
      .maybeSingle();

    // Buscar conexoes com acesso
    const { data: accesses } = await supabaseAdmin
      .from("meta_ad_account_access")
      .select("connection_id, meta_connections(id, name)")
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", account.meta_ad_account_id)
      .eq("can_read", true);

    enrichedAccounts.push({
      ...account,
      primary_connection_name: primaryConnectionName,
      client_bound: !!binding,
      bound_client_id: binding?.client_id || null,
      bound_client_name: binding?.clients?.name || null,
      binding_status: binding?.status || null,
      binding_connection_id: binding?.connection_id || null,
      available_connections: accesses?.map(a => ({
        id: a.connection_id,
        name: a.meta_connections?.name
      })) || [],
    });
  }

  return new Response(
    JSON.stringify({ accounts: enrichedAccounts }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Vincula ad account a um cliente
 */
async function handleBindToClient(
  req: Request,
  supabaseAdmin: any,
  workspaceId: string
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { client_id, meta_ad_account_id, connection_id } = await req.json();

  if (!client_id || !meta_ad_account_id) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: client_id, meta_ad_account_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar se ad account existe no workspace
  const { data: account } = await supabaseAdmin
    .from("meta_ad_accounts")
    .select("id, primary_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("meta_ad_account_id", meta_ad_account_id)
    .maybeSingle();

  if (!account) {
    return new Response(
      JSON.stringify({ error: "Ad account not found in this workspace" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar se cliente pertence ao workspace
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, name")
    .eq("id", client_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!client) {
    return new Response(
      JSON.stringify({ error: "Client not found in this workspace" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar se ja existe vinculo para esta conta no workspace
  const { data: existingBinding } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .select("id, client_id, clients(name)")
    .eq("workspace_id", workspaceId)
    .eq("meta_ad_account_id", meta_ad_account_id)
    .maybeSingle();

  if (existingBinding) {
    return new Response(
      JSON.stringify({
        error: "Ad account already bound",
        details: `Esta conta ja esta vinculada ao cliente "${existingBinding.clients?.name}".`
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Determinar connection_id a usar
  let finalConnectionId = connection_id;

  if (finalConnectionId) {
    // Verificar se conexao tem acesso a esta conta
    const { data: access } = await supabaseAdmin
      .from("meta_ad_account_access")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", meta_ad_account_id)
      .eq("connection_id", finalConnectionId)
      .eq("can_read", true)
      .maybeSingle();

    if (!access) {
      return new Response(
        JSON.stringify({ error: "Selected connection does not have access to this ad account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } else {
    // Escolher automaticamente: preferir conexao default com acesso
    const { data: defaultAccess } = await supabaseAdmin
      .from("meta_ad_account_access")
      .select("connection_id, meta_connections!inner(is_default)")
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", meta_ad_account_id)
      .eq("can_read", true)
      .eq("meta_connections.is_default", true)
      .maybeSingle();

    if (defaultAccess) {
      finalConnectionId = defaultAccess.connection_id;
    } else {
      // Pegar qualquer conexao com acesso
      const { data: anyAccess } = await supabaseAdmin
        .from("meta_ad_account_access")
        .select("connection_id")
        .eq("workspace_id", workspaceId)
        .eq("meta_ad_account_id", meta_ad_account_id)
        .eq("can_read", true)
        .limit(1)
        .maybeSingle();

      if (anyAccess) {
        finalConnectionId = anyAccess.connection_id;
      } else {
        return new Response(
          JSON.stringify({ error: "No connection has access to this ad account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // Criar vinculo
  const { error: insertError } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .insert({
      workspace_id: workspaceId,
      client_id,
      meta_ad_account_id,
      connection_id: finalConnectionId,
      status: "active",
    });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: "Failed to create binding", details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Atualizar primary_connection_id na conta
  await supabaseAdmin
    .from("meta_ad_accounts")
    .update({ primary_connection_id: finalConnectionId })
    .eq("workspace_id", workspaceId)
    .eq("meta_ad_account_id", meta_ad_account_id);

  return new Response(
    JSON.stringify({
      success: true,
      client_name: client.name,
      connection_id: finalConnectionId,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Remove vinculo de ad account
 */
async function handleUnbind(
  req: Request,
  supabaseAdmin: any,
  workspaceId: string
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { meta_ad_account_id } = await req.json();

  if (!meta_ad_account_id) {
    return new Response(
      JSON.stringify({ error: "Missing meta_ad_account_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar se vinculo existe
  const { data: binding } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("meta_ad_account_id", meta_ad_account_id)
    .maybeSingle();

  if (!binding) {
    return new Response(
      JSON.stringify({ error: "Binding not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Remover vinculo
  const { error: deleteError } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .delete()
    .eq("id", binding.id);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: "Failed to remove binding", details: deleteError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
