/**
 * Edge Function: meta-refresh-token
 *
 * Valida se o token de System User do Meta ainda esta ativo.
 * System User tokens sao permanentes e NAO suportam o endpoint OAuth fb_exchange_token.
 * Em vez de trocar o token, esta funcao verifica sua validade via /me endpoint.
 *
 * Fluxo:
 * 1. Autentica o usuario via JWT
 * 2. Busca o token atual da conexao Meta no banco
 * 3. Descriptografa e valida chamando /me na Graph API
 * 4. Se valido: atualiza token_expires_at e status para 'connected'
 * 5. Se invalido/revogado: marca status como 'token_expired'
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RefreshTokenRequest {
  connection_id?: string;
}

// Resposta do endpoint /me da Meta Graph API
interface MetaMeResponse {
  id: string;
  name?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

Deno.serve(async (req: Request) => {
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

    // Autentica o usuario via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Valida o usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: RefreshTokenRequest = await req.json().catch(() => ({}));

    // Busca o workspace do usuario (como owner ou membro)
    let workspaceId: string | null = null;

    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      workspaceId = memberRecord?.workspace_id || null;
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Workspace nao encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca a conexao Meta (filtra por connection_id se fornecido)
    let connectionQuery = supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, token_expires_at")
      .eq("workspace_id", workspaceId);

    if (body.connection_id) {
      connectionQuery = connectionQuery.eq("id", body.connection_id);
    }

    const { data: connection, error: connError } = await connectionQuery.maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexao Meta nao encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Descriptografa o token atual usando a funcao RPC do banco
    const { data: decryptedToken } = await supabaseAdmin.rpc("decrypt_token", {
      p_encrypted_token: connection.access_token_encrypted,
    });

    const currentToken = decryptedToken || connection.access_token_encrypted;

    if (!currentToken) {
      return new Response(JSON.stringify({ error: "Token atual nao encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[meta-refresh-token] Validando token de System User para workspace ${workspaceId}...`);

    // Valida o token chamando /me na Graph API (System User tokens nao suportam fb_exchange_token)
    const meResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${currentToken}`
    );
    const meData: MetaMeResponse = await meResponse.json();

    // Se o token e invalido/revogado, marca como expirado
    if (meData.error) {
      console.error(
        `[meta-refresh-token] Token invalido (code: ${meData.error.code}):`,
        meData.error.message,
      );

      // Marca a conexao como necessitando reconexao manual
      await supabaseAdmin
        .from("meta_connections")
        .update({
          status: "token_expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({
          error: "Token do Meta foi revogado ou esta invalido. Reconecte na pagina Meta Admin.",
          error_code: meData.error.code,
          requires_reconnect: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Token valido! Atualiza token_expires_at para 10 anos (System User tokens sao permanentes)
    const newExpiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

    console.log(
      `[meta-refresh-token] Token de System User validado com sucesso (user: ${meData.name || meData.id})`,
    );

    // Atualiza status e data de expiracao no banco
    const { error: updateError } = await supabaseAdmin
      .from("meta_connections")
      .update({
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
        status: "connected",
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    if (updateError) {
      console.error("[meta-refresh-token] Erro ao atualizar conexao:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar status no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: newExpiresAt,
        message: "Token de System User validado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[meta-refresh-token] Erro inesperado:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
