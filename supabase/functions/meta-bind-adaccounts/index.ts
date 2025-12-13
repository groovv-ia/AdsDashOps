/**
 * Edge Function: meta-bind-adaccounts
 * 
 * Vincula Ad Accounts do Meta a um cliente específico.
 * 
 * POST /functions/v1/meta-bind-adaccounts
 * Body: { client_id: string, ad_account_ids: string[] }
 * 
 * Retorna: { success: boolean, bound_accounts: number }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BindPayload {
  client_id: string;
  ad_account_ids: string[];
}

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

    // Verifica usuário autenticado
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

    // Parse do body
    const body: BindPayload = await req.json();
    const { client_id, ad_account_ids } = body;

    if (!client_id || !ad_account_ids || !Array.isArray(ad_account_ids)) {
      return new Response(
        JSON.stringify({ error: "Missing client_id or ad_account_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca o workspace do usuário
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

    // Verifica se o cliente pertence ao workspace
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, workspace_id")
      .eq("id", client_id)
      .maybeSingle();

    if (!client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualiza o workspace_id do cliente se necessário
    if (!client.workspace_id) {
      await supabaseAdmin
        .from("clients")
        .update({ workspace_id: workspace.id })
        .eq("id", client_id);
    }

    // Busca os IDs internos das ad accounts
    const { data: adAccounts } = await supabaseAdmin
      .from("meta_ad_accounts")
      .select("id, meta_ad_account_id")
      .eq("workspace_id", workspace.id)
      .in("meta_ad_account_id", ad_account_ids);

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid ad accounts found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove vínculos antigos do cliente
    await supabaseAdmin
      .from("client_meta_ad_accounts")
      .delete()
      .eq("client_id", client_id);

    // Cria novos vínculos
    const bindings = adAccounts.map((acc) => ({
      client_id: client_id,
      meta_ad_account_id: acc.id,
      status: "active",
    }));

    const { error: insertError } = await supabaseAdmin
      .from("client_meta_ad_accounts")
      .insert(bindings);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to bind accounts", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria/atualiza meta_sync_state para cada conta vinculada
    for (const acc of adAccounts) {
      await supabaseAdmin
        .from("meta_sync_state")
        .upsert(
          {
            workspace_id: workspace.id,
            client_id: client_id,
            meta_ad_account_id: acc.meta_ad_account_id,
            sync_enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,meta_ad_account_id" }
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bound_accounts: adAccounts.length,
        client_id: client_id,
        ad_account_ids: adAccounts.map((a) => a.meta_ad_account_id),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
