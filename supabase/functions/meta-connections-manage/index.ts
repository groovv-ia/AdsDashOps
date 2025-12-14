/**
 * Edge Function: meta-connections-manage
 *
 * Gerencia conexoes Meta (System User tokens) do workspace.
 *
 * Endpoints:
 * - POST /validate-and-save: Valida token e salva nova conexao
 * - GET /list: Lista conexoes do workspace
 * - POST /set-default: Define conexao como padrao
 * - DELETE /remove: Remove conexao
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidateAndSavePayload {
  name: string;
  business_manager_id: string;
  system_user_token: string;
  set_as_default?: boolean;
}

interface MetaMeResponse {
  id?: string;
  name?: string;
  error?: { message: string; code: number };
}

interface MetaAdAccountsResponse {
  data?: Array<{
    id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name?: string;
  }>;
  error?: { message: string; code: number };
}

async function encryptToken(supabaseAdmin: any, token: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('encrypt_token', { p_token: token });
  if (error) {
    console.error('Erro ao criptografar token:', error);
    return token;
  }
  return data || token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    switch (action) {
      case "validate-and-save":
        return await handleValidateAndSave(req, supabaseAdmin, workspace.id);
      case "list":
        return await handleList(supabaseAdmin, workspace.id);
      case "set-default":
        return await handleSetDefault(req, supabaseAdmin, workspace.id);
      case "remove":
        return await handleRemove(req, supabaseAdmin, workspace.id);
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

async function handleValidateAndSave(
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

  const payload: ValidateAndSavePayload = await req.json();
  const { name, business_manager_id, system_user_token, set_as_default = false } = payload;

  if (!name || !business_manager_id || !system_user_token) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: name, business_manager_id, system_user_token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const meUrl = `https://graph.facebook.com/v21.0/me?access_token=${system_user_token}`;
  const meResponse = await fetch(meUrl);
  const meData: MetaMeResponse = await meResponse.json();

  if (meData.error) {
    return new Response(
      JSON.stringify({ error: "Invalid Meta token", details: meData.error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${system_user_token}`;
  const adAccountsResponse = await fetch(adAccountsUrl);
  const adAccountsData: MetaAdAccountsResponse = await adAccountsResponse.json();

  if (adAccountsData.error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch ad accounts", details: adAccountsData.error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const adAccountsCount = adAccountsData.data?.length || 0;

  const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${system_user_token}&access_token=${system_user_token}`;
  const debugResponse = await fetch(debugTokenUrl);
  const debugData = await debugResponse.json();
  const grantedScopes = debugData.data?.scopes || [];

  const encryptedToken = await encryptToken(supabaseAdmin, system_user_token);

  if (set_as_default) {
    await supabaseAdmin
      .from("meta_connections")
      .update({ is_default: false })
      .eq("workspace_id", workspaceId);
  }

  const { data: connection, error: insertError } = await supabaseAdmin
    .from("meta_connections")
    .insert({
      workspace_id: workspaceId,
      name,
      business_manager_id,
      access_token_encrypted: encryptedToken,
      granted_scopes: grantedScopes,
      status: "connected",
      is_default: set_as_default,
      last_validated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return new Response(
      JSON.stringify({ error: "Failed to save connection", details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (adAccountsData.data && adAccountsData.data.length > 0) {
    for (const account of adAccountsData.data) {
      await supabaseAdmin
        .from("meta_ad_accounts")
        .upsert({
          workspace_id: workspaceId,
          meta_ad_account_id: account.id,
          name: account.name,
          currency: account.currency,
          timezone_name: account.timezone_name,
          account_status: String(account.account_status),
          primary_connection_id: connection.id,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,meta_ad_account_id" });

      await supabaseAdmin
        .from("meta_ad_account_access")
        .upsert({
          workspace_id: workspaceId,
          meta_ad_account_id: account.id,
          connection_id: connection.id,
          can_read: true,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,meta_ad_account_id,connection_id" });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      connection_id: connection.id,
      status: "connected",
      adaccounts_count: adAccountsCount,
      granted_scopes: grantedScopes,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleList(supabaseAdmin: any, workspaceId: string): Promise<Response> {
  const { data: connections, error } = await supabaseAdmin
    .from("meta_connections")
    .select(`id,name,business_manager_id,granted_scopes,status,is_default,last_validated_at,created_at,updated_at`)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch connections", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  for (const conn of connections || []) {
    const { count } = await supabaseAdmin
      .from("meta_ad_account_access")
      .select("id", { count: "exact", head: true })
      .eq("connection_id", conn.id)
      .eq("can_read", true);
    conn.adaccounts_count = count || 0;
  }

  return new Response(
    JSON.stringify({ connections }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSetDefault(
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

  const { data: conn } = await supabaseAdmin
    .from("meta_connections")
    .select("id")
    .eq("id", connection_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!conn) {
    return new Response(
      JSON.stringify({ error: "Connection not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabaseAdmin
    .from("meta_connections")
    .update({ is_default: false })
    .eq("workspace_id", workspaceId);

  await supabaseAdmin
    .from("meta_connections")
    .update({ is_default: true })
    .eq("id", connection_id);

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRemove(
  req: Request,
  supabaseAdmin: any,
  workspaceId: string
): Promise<Response> {
  if (req.method !== "DELETE" && req.method !== "POST") {
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

  const { data: conn } = await supabaseAdmin
    .from("meta_connections")
    .select("id, is_default")
    .eq("id", connection_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!conn) {
    return new Response(
      JSON.stringify({ error: "Connection not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { count: bindingsCount } = await supabaseAdmin
    .from("client_meta_ad_accounts")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connection_id)
    .eq("status", "active");

  if (bindingsCount && bindingsCount > 0) {
    return new Response(
      JSON.stringify({
        error: "Cannot delete connection with active bindings",
        details: `Esta conexao esta sendo usada por ${bindingsCount} vinculo(s) ativo(s). Remova os vinculos primeiro.`
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("meta_connections")
    .delete()
    .eq("id", connection_id);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: "Failed to delete connection", details: deleteError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (conn.is_default) {
    const { data: otherConn } = await supabaseAdmin
      .from("meta_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (otherConn) {
      await supabaseAdmin
        .from("meta_connections")
        .update({ is_default: true })
        .eq("id", otherConn.id);
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}