/**
 * Edge Function: meta-exchange-token
 *
 * Troca o codigo de autorizacao OAuth do Meta/Facebook por tokens de acesso.
 * Mantém o App Secret no servidor, nunca expondo ao browser.
 *
 * Fluxo:
 * 1. Frontend envia o authorization code recebido do Meta
 * 2. Esta funcao usa o App Secret (server-side) para trocar por token
 * 3. Retorna access_token ao frontend
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para o payload da requisicao
interface ExchangeTokenRequest {
  code: string;
  redirect_uri: string;
}

// Interface para resposta do Meta OAuth token endpoint
interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Apenas POST permitido
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parseia o body da requisicao
    const body: ExchangeTokenRequest = await req.json();

    if (!body.code) {
      return new Response(
        JSON.stringify({ error: "Authorization code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Redirect URI is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Le secrets do ambiente do servidor (nunca expostos ao browser)
    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");

    if (!appId || !appSecret) {
      console.error(
        "[meta-exchange-token] META_APP_ID ou META_APP_SECRET nao configurados",
      );
      return new Response(
        JSON.stringify({
          error:
            "Meta OAuth nao configurado no servidor. Configure META_APP_ID e META_APP_SECRET nos secrets do Supabase.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[meta-exchange-token] Trocando codigo por token...");

    // Troca o codigo de autorizacao por access token
    const tokenUrl = "https://graph.facebook.com/v19.0/oauth/access_token";
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: body.redirect_uri,
      code: body.code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const tokenData: MetaTokenResponse = await tokenResponse.json();

    // Verifica se houve erro na troca
    if (tokenData.error) {
      console.error(
        "[meta-exchange-token] Erro do Meta:",
        tokenData.error.message,
      );

      // Mapeia erros comuns para mensagens amigaveis
      let errorMessage = tokenData.error.message;
      if (tokenData.error.code === 100) {
        errorMessage =
          "Parametros invalidos. Verifique as configuracoes do App no Facebook.";
      } else if (tokenData.error.message?.includes("redirect_uri")) {
        errorMessage =
          "URL de redirecionamento invalida. Configure no Facebook: Settings > Basic > Add Platform > Website.";
      } else if (tokenData.error.message?.includes("code")) {
        errorMessage =
          "Codigo de autorizacao invalido ou expirado. Tente conectar novamente.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          error_code: tokenData.error.code,
          error_type: tokenData.error.type,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!tokenData.access_token) {
      console.error(
        "[meta-exchange-token] Token de acesso nao recebido",
      );
      return new Response(
        JSON.stringify({
          error: "Token de acesso nao recebido. Resposta inesperada do servidor.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[meta-exchange-token] Token obtido com sucesso");

    // Retorna token (sem expor o app_secret)
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || "bearer",
        expires_in: tokenData.expires_in,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[meta-exchange-token] Erro inesperado:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
