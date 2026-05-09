/**
 * Edge Function: configure-auth-urls
 *
 * SEGURANCA: Exige autenticacao de usuario autenticado.
 * Retorna as URLs configuradas para o projeto (somente leitura).
 * Operacoes administrativas de configuracao foram removidas desta funcao publica
 * e devem ser feitas diretamente pelo dashboard do Supabase.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://adsops.bolt.host";
const ALLOWED_REDIRECT_URLS = [
  "https://adsops.bolt.host",
  "https://adsops.bolt.host/auth/callback",
  "https://adsops.bolt.host/reset-password",
  "https://adsops.bolt.host/oauth-callback",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verifica autenticacao: exige header Authorization com JWT valido
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Valida que o token pertence a um usuario real
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retorna apenas as URLs permitidas para uso pelo frontend (somente leitura)
    return new Response(
      JSON.stringify({
        site_url: SITE_URL,
        redirect_urls: ALLOWED_REDIRECT_URLS,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Nunca expoe detalhes internos do erro
    console.error("[configure-auth-urls] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
