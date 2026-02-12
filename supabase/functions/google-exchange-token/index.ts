/**
 * Edge Function: google-exchange-token
 *
 * Troca o codigo de autorizacao OAuth do Google por tokens de acesso.
 * Mantém o Client Secret no servidor, nunca expondo ao browser.
 *
 * Fluxo:
 * 1. Frontend envia o authorization code recebido do Google
 * 2. Esta funcao usa o Client Secret (server-side) para trocar por tokens
 * 3. Opcionalmente busca informacoes do usuario (email)
 * 4. Retorna access_token, refresh_token e user info ao frontend
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
  include_user_info?: boolean;
}

// Interface para resposta do Google OAuth token endpoint
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

// Interface para informacoes do usuario Google
interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
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
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error(
        "[google-exchange-token] GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET nao configurados",
      );
      return new Response(
        JSON.stringify({
          error:
            "Google OAuth nao configurado no servidor. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do Supabase.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[google-exchange-token] Trocando codigo por token...");

    // Troca o codigo de autorizacao por tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: body.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: body.redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Verifica se houve erro na troca
    if (tokenData.error) {
      console.error(
        "[google-exchange-token] Erro do Google:",
        tokenData.error,
        tokenData.error_description,
      );
      return new Response(
        JSON.stringify({
          error: tokenData.error_description || tokenData.error,
          error_code: tokenData.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!tokenData.access_token) {
      console.error(
        "[google-exchange-token] Token de acesso nao recebido",
      );
      return new Response(
        JSON.stringify({ error: "Token de acesso nao recebido do Google" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[google-exchange-token] Token obtido com sucesso");

    // Busca informacoes do usuario se solicitado
    let userInfo: GoogleUserInfo | null = null;
    if (body.include_user_info !== false) {
      try {
        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          },
        );

        if (userResponse.ok) {
          userInfo = await userResponse.json();
          console.log(
            "[google-exchange-token] Email do usuario:",
            userInfo?.email,
          );
        }
      } catch (userError) {
        console.warn(
          "[google-exchange-token] Erro ao buscar info do usuario:",
          userError,
        );
      }
    }

    // Retorna tokens e info do usuario (sem expor o client_secret)
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        user_email: userInfo?.email || null,
        user_name: userInfo?.name || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[google-exchange-token] Erro inesperado:", error);
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
