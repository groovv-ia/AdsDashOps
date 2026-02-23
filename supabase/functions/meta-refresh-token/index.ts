/**
 * Edge Function: meta-refresh-token
 *
 * Renova automaticamente o token de acesso do Meta Ads antes que expire.
 * Tokens do Meta podem ser renovados enquanto ainda sao validos.
 *
 * Fluxo:
 * 1. Autentica o usuario via JWT
 * 2. Busca o token atual da conexao Meta no banco
 * 3. Descriptografa e envia ao endpoint do Meta para renovacao
 * 4. Salva o novo token criptografado e atualiza token_expires_at
 * 5. Retorna status de sucesso com nova data de expiracao
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

interface MetaRefreshResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Verifica se o erro do Meta indica que o token nao pode mais ser renovado
 * (exige reconexao manual pelo usuario)
 */
function isTokenPermanentlyInvalid(errorCode: number, errorSubcode?: number): boolean {
  // Codigo 190: Token invalido ou expirado ha muito tempo
  // Subcode 460: Senha alterada
  // Subcode 463: Token expirado ha mais de 90 dias
  // Subcode 467: Token invalido
  const permanentCodes = [190];
  const permanentSubcodes = [460, 463, 467];

  if (permanentCodes.includes(errorCode)) {
    if (errorSubcode && permanentSubcodes.includes(errorSubcode)) {
      return true;
    }
    // Codigo 190 sem subcode tambem pode ser permanente
    return true;
  }
  return false;
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
    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "META_APP_ID ou META_APP_SECRET nao configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // Busca o workspace do usuario
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace nao encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca a conexao Meta (filtra por connection_id se fornecido)
    let connectionQuery = supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, token_expires_at")
      .eq("workspace_id", workspace.id);

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

    console.log(`[meta-refresh-token] Renovando token para workspace ${workspace.id}...`);

    // Chama o endpoint do Meta para renovar o token (troca por novo Long-Lived Token)
    const refreshUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    refreshUrl.searchParams.set("grant_type", "fb_exchange_token");
    refreshUrl.searchParams.set("client_id", appId);
    refreshUrl.searchParams.set("client_secret", appSecret);
    refreshUrl.searchParams.set("fb_exchange_token", currentToken);

    const refreshResponse = await fetch(refreshUrl.toString());
    const refreshData: MetaRefreshResponse = await refreshResponse.json();

    // Verifica se houve erro na renovacao
    if (refreshData.error) {
      const isPermanent = isTokenPermanentlyInvalid(
        refreshData.error.code,
        refreshData.error.error_subcode,
      );

      console.error(
        `[meta-refresh-token] Erro ao renovar token (code: ${refreshData.error.code}, permanent: ${isPermanent}):`,
        refreshData.error.message,
      );

      // Marca a conexao como necessitando de reconexao manual se o token for permanentemente invalido
      if (isPermanent) {
        await supabaseAdmin
          .from("meta_connections")
          .update({ status: "token_expired" })
          .eq("id", connection.id);
      }

      return new Response(
        JSON.stringify({
          error: refreshData.error.message,
          error_code: refreshData.error.code,
          requires_reconnect: isPermanent,
        }),
        {
          status: isPermanent ? 401 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!refreshData.access_token) {
      return new Response(
        JSON.stringify({ error: "Novo token nao recebido do Meta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Calcula a nova data de expiracao
    const expiresInSeconds = refreshData.expires_in || 5183944;
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    console.log(
      `[meta-refresh-token] Token renovado com sucesso. Nova expiracao: ${newExpiresAt}`,
    );

    // Criptografa o novo token usando a funcao RPC do banco
    const { data: encryptedNewToken } = await supabaseAdmin.rpc("encrypt_token", {
      p_token: refreshData.access_token,
    });

    const tokenToSave = encryptedNewToken || refreshData.access_token;

    // Salva o novo token e atualiza a data de expiracao
    const { error: updateError } = await supabaseAdmin
      .from("meta_connections")
      .update({
        access_token_encrypted: tokenToSave,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("id", connection.id);

    if (updateError) {
      console.error("[meta-refresh-token] Erro ao salvar novo token:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar novo token no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: newExpiresAt,
        message: "Token renovado com sucesso",
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
