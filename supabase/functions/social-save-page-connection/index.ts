/**
 * Edge Function: social-save-page-connection
 *
 * Salva uma Page do Facebook e/ou conta Instagram no banco de dados,
 * criptografando o token de acesso da Page antes de persistir.
 *
 * Recebe: workspace_id, client_id?, platform, page_id, page_name,
 *         page_access_token, instagram_account_id?, instagram_username?
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaveConnectionPayload {
  workspace_id: string;
  client_id?: string;
  platform: "facebook" | "instagram";
  page_id: string;
  page_name: string;
  page_access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verifica autenticação do usuário
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SaveConnectionPayload = await req.json();
    const {
      workspace_id,
      client_id,
      platform,
      page_id,
      page_name,
      page_access_token,
      instagram_account_id,
      instagram_username,
    } = payload;

    // Validações básicas
    if (!workspace_id || !platform || !page_id || !page_name || !page_access_token) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: workspace_id, platform, page_id, page_name, page_access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criptografa o token da Page usando a RPC existente do projeto
    const { data: encryptedToken, error: encryptError } = await supabaseAdmin
      .rpc("encrypt_token", { p_token: page_access_token });

    if (encryptError || !encryptedToken) {
      console.error("[social-save-page-connection] Erro ao criptografar token:", encryptError);
      return new Response(
        JSON.stringify({ error: "Falha ao criptografar token de acesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert na tabela social_page_connections
    const { data: connection, error: upsertError } = await supabaseAdmin
      .from("social_page_connections")
      .upsert(
        {
          workspace_id,
          client_id: client_id || null,
          platform,
          page_id,
          page_name,
          instagram_account_id: instagram_account_id || null,
          instagram_username: instagram_username || null,
          access_token_encrypted: encryptedToken,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,platform,page_id" }
      )
      .select("id, platform, page_id, page_name, instagram_username, is_active")
      .single();

    if (upsertError) {
      console.error("[social-save-page-connection] Erro ao salvar conexão:", upsertError);
      return new Response(
        JSON.stringify({ error: "Falha ao salvar conexão", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, connection }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-save-page-connection] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
