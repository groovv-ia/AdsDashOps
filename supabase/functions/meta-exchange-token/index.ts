/**
 * Edge Function: meta-exchange-token
 *
 * Troca o codigo de autorizacao OAuth do Meta/Facebook por um Long-Lived Token de 60 dias.
 * Mantém o App Secret no servidor, nunca expondo ao browser.
 *
 * Fluxo:
 * 1. Frontend envia o authorization code recebido do Meta
 * 2. Esta funcao troca o code por um token de curta duracao (short-lived)
 * 3. Em seguida, troca o short-lived token por um Long-Lived Token de 60 dias
 * 4. Retorna o Long-Lived Token com a data exata de expiracao ao frontend
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExchangeTokenRequest {
  code: string;
  redirect_uri: string;
}

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

interface MetaLongLivedTokenResponse {
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

/**
 * Troca um short-lived token por um Long-Lived Token do Meta (valido por 60 dias)
 * Requer app_id e app_secret para realizar a troca server-side
 */
async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url.toString());
  const data: MetaLongLivedTokenResponse = await response.json();

  if (data.error) {
    throw new Error(
      `Erro ao obter Long-Lived Token: ${data.error.message} (code: ${data.error.code})`,
    );
  }

  if (!data.access_token) {
    throw new Error("Long-Lived Token nao recebido do Meta");
  }

  // Calcula a data de expiracao: expires_in em segundos (geralmente 5183944 = ~60 dias)
  // Se a API nao retornar expires_in, usa 60 dias como padrao seguro
  const expiresInSeconds = data.expires_in || 5183944;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  console.log(
    `[meta-exchange-token] Long-Lived Token obtido. Expira em: ${expiresAt} (${Math.floor(expiresInSeconds / 86400)} dias)`,
  );

  return { accessToken: data.access_token, expiresAt };
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

    console.log("[meta-exchange-token] Trocando authorization code por short-lived token...");

    // Passo 1: Troca o authorization code pelo short-lived token
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

    if (tokenData.error) {
      console.error("[meta-exchange-token] Erro ao obter short-lived token:", tokenData.error.message);

      let errorMessage = tokenData.error.message;
      if (tokenData.error.code === 100) {
        errorMessage = "Parametros invalidos. Verifique as configuracoes do App no Facebook.";
      } else if (tokenData.error.message?.includes("redirect_uri")) {
        errorMessage = "URL de redirecionamento invalida. Configure no Facebook: Settings > Basic > Add Platform > Website.";
      } else if (tokenData.error.message?.includes("code")) {
        errorMessage = "Codigo de autorizacao invalido ou expirado. Tente conectar novamente.";
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
      return new Response(
        JSON.stringify({ error: "Token de acesso nao recebido. Resposta inesperada do servidor." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[meta-exchange-token] Short-lived token obtido. Trocando por Long-Lived Token...");

    // Passo 2: Troca o short-lived token pelo Long-Lived Token de 60 dias
    try {
      const { accessToken: longLivedToken, expiresAt } = await exchangeForLongLivedToken(
        tokenData.access_token,
        appId,
        appSecret,
      );

      console.log("[meta-exchange-token] Long-Lived Token obtido com sucesso");

      return new Response(
        JSON.stringify({
          access_token: longLivedToken,
          token_type: "bearer",
          expires_at: expiresAt,
          is_long_lived: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (longLivedError) {
      // Se falhar ao obter Long-Lived Token, retorna o short-lived como fallback
      // com aviso para o frontend lidar adequadamente
      console.warn(
        "[meta-exchange-token] Falha ao obter Long-Lived Token, retornando short-lived como fallback:",
        longLivedError,
      );

      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 3600) * 1000,
      ).toISOString();

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || "bearer",
          expires_at: expiresAt,
          is_long_lived: false,
          long_lived_error: longLivedError instanceof Error ? longLivedError.message : "Unknown",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
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
