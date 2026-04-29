/**
 * Edge Function: social-list-pages
 *
 * Lista as Pages do Facebook e contas do Instagram Business vinculadas
 * ao token Meta já armazenado no workspace do usuário.
 *
 * Fluxo:
 * 1. Recupera o token criptografado da tabela meta_connections para o workspace
 * 2. Descriptografa via RPC decrypt_token
 * 3. Busca Pages do Facebook via GET /v21.0/me/accounts
 * 4. Para cada Page, busca o instagram_business_account vinculado
 * 5. Retorna lista unificada com dados de Facebook e Instagram
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    name?: string;
    username?: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: { cursors: { after: string }; next?: string };
  error?: { message: string; code: number; type?: string };
}

Deno.serve(async (req: Request) => {
  // Responde preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Extrai o JWT do usuário autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria cliente Supabase com o token do usuário para verificar autenticação
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verifica autenticação do usuário
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lê workspace_id do body ou query param
    let workspaceId: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      workspaceId = body.workspace_id || null;
    } catch {
      // sem body
    }

    if (!workspaceId) {
      const url = new URL(req.url);
      workspaceId = url.searchParams.get("workspace_id");
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspace_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca a conexão Meta ativa do workspace
    const { data: metaConnection, error: connError } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();

    if (connError || !metaConnection) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma conexão Meta ativa encontrada para este workspace. Configure a conexão Meta primeiro.",
          pages: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa o token via RPC.
    // IMPORTANTE: tokens salvos por versoes antigas do meta-validate-connection podem estar
    // em texto puro (fallback silencioso quando encrypt_token falhou). Nesse caso,
    // decrypt_token retorna NULL pois o valor nao e base64 valido. Usamos o valor
    // bruto como fallback, o que e seguro pois o banco ja tem RLS ativo.
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = (decryptedToken as string | null) || metaConnection.access_token_encrypted;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Token Meta nao encontrado para este workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca Pages do Facebook via Graph API v21.0
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,name,username,profile_picture_url,followers_count}&limit=50&access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData: FacebookPagesResponse = await pagesRes.json();

    if (pagesData.error) {
      console.error("[social-list-pages] Graph API error:", pagesData.error);
      return new Response(
        JSON.stringify({
          error: `Erro da API do Facebook: ${pagesData.error.message}`,
          pages: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Monta resultado unificado com Facebook Pages e Instagram Accounts
    const pages = (pagesData.data || []).map((page) => ({
      facebook: {
        page_id: page.id,
        page_name: page.name,
        page_category: page.category || "",
        access_token: page.access_token,
      },
      instagram: page.instagram_business_account
        ? {
            instagram_account_id: page.instagram_business_account.id,
            instagram_username: page.instagram_business_account.username || "",
            instagram_name: page.instagram_business_account.name || "",
            profile_picture_url: page.instagram_business_account.profile_picture_url || "",
            followers_count: page.instagram_business_account.followers_count || 0,
          }
        : null,
    }));

    return new Response(
      JSON.stringify({ pages, total: pages.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-list-pages] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
