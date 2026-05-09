import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Edge function para renovar o access_token do Google Ads OAuth.
 *
 * Fluxo:
 * 1. Recebe connection_id no body
 * 2. Busca refresh_token e token_expires_at da tabela google_connections
 * 3. Se o token ainda e valido, retorna o access_token existente
 * 4. Se expirado, chama https://oauth2.googleapis.com/token para renovar
 * 5. Atualiza access_token e token_expires_at no banco
 * 6. Retorna o novo access_token
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verifica autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client para operacoes de escrita
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { connection_id } = await req.json();
    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: "connection_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca a conexao
    const { data: connection, error: connError } = await supabaseAdmin
      .from("google_connections")
      .select("id, workspace_id, access_token, refresh_token, token_expires_at")
      .eq("id", connection_id)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica se o token ainda e valido (com margem de 5 minutos)
    const expiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : 0;
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (connection.access_token && expiresAt > now + FIVE_MINUTES) {
      // Token ainda valido
      return new Response(
        JSON.stringify({
          access_token: connection.access_token,
          expires_at: connection.token_expires_at,
          refreshed: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token expirado - precisa renovar
    if (!connection.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh_token available. User must re-authenticate." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chama Google OAuth para renovar o token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Google token refresh failed:", errorBody);

      // Se o refresh token foi revogado, marca a conexao como expirada
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabaseAdmin
          .from("google_connections")
          .update({
            status: "expired",
            error_message: "Token de acesso revogado. Reconecte sua conta Google.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection_id);
      }

      return new Response(
        JSON.stringify({ error: "Failed to refresh token. Please re-authenticate." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Atualiza a conexao com o novo token
    const { error: updateError } = await supabaseAdmin
      .from("google_connections")
      .update({
        access_token: newAccessToken,
        token_expires_at: newExpiresAt,
        status: "active",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection_id);

    if (updateError) {
      console.error("Failed to update connection:", updateError);
    }

    return new Response(
      JSON.stringify({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
        refreshed: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("google-refresh-access-token error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
