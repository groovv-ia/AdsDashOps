/**
 * Edge Function: meta-disconnect
 *
 * Remove completamente a conexao Meta Ads de um workspace:
 * - Deleta meta_sync_state (primeiro, por FK)
 * - Deleta meta_ad_accounts
 * - Deleta meta_connections
 *
 * Usa service role key para garantir que RLS nao bloqueie as delecoes.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Verifica autenticacao do usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente autenticado como usuario -- apenas para verificar identidade
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente admin para operacoes de delete sem restricao de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Descobre o workspace do usuario (owner primeiro, membro como fallback)
    const { data: ownedWs } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let workspaceId: string | null = ownedWs?.id || null;

    if (!workspaceId) {
      const { data: memberWs } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      workspaceId = memberWs?.workspace_id || null;
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Workspace nao encontrado para este usuario" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-disconnect] Desconectando workspace: ${workspaceId} (user: ${user.id})`);

    // Remove na ordem correta para evitar violacoes de FK
    const { error: syncErr } = await supabaseAdmin
      .from("meta_sync_state")
      .delete()
      .eq("workspace_id", workspaceId);

    if (syncErr) {
      console.warn("[meta-disconnect] Erro ao deletar meta_sync_state:", syncErr.message);
    }

    const { error: accErr } = await supabaseAdmin
      .from("meta_ad_accounts")
      .delete()
      .eq("workspace_id", workspaceId);

    if (accErr) {
      console.warn("[meta-disconnect] Erro ao deletar meta_ad_accounts:", accErr.message);
    }

    const { error: connErr } = await supabaseAdmin
      .from("meta_connections")
      .delete()
      .eq("workspace_id", workspaceId);

    if (connErr) {
      console.error("[meta-disconnect] Erro ao deletar meta_connections:", connErr.message);
      return new Response(
        JSON.stringify({ error: "Falha ao remover conexao", details: connErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-disconnect] Workspace ${workspaceId} desconectado com sucesso`);

    return new Response(
      JSON.stringify({ success: true, workspace_id: workspaceId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[meta-disconnect] Erro inesperado:", err);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
