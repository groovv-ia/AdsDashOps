/**
 * Edge Function: configure-auth-urls
 *
 * Diagnostica e configura o site_url e redirect_urls do Supabase.
 * Gera um link de confirmacao de teste para verificar qual URL e usada.
 * Executada via POST para aplicar configuracoes, GET para diagnostico.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://adsops.bolt.host";
const REDIRECT_URLS = [
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Gera link de confirmacao de teste para inspecionar qual URL o Supabase usa
    const generateLinkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: "magiclink",
        email: "diagnostic-test@example.com",
        redirect_to: `${SITE_URL}/auth/callback`,
      }),
    });

    const linkData = await generateLinkRes.json();

    // Tenta atualizar configuracoes via endpoint interno do GoTrue
    // Este endpoint usa o service role e e acessivel apenas internamente
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/config`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        URI_ALLOW_LIST: REDIRECT_URLS.join(","),
        SITE_URL: SITE_URL,
      }),
    });

    const updateText = await updateRes.text();
    let updateData: unknown;
    try { updateData = JSON.parse(updateText); } catch { updateData = updateText; }

    return new Response(
      JSON.stringify({
        diagnostic: {
          generate_link_status: generateLinkRes.status,
          action_link: (linkData as any)?.action_link ?? "not_available",
          link_data_keys: Object.keys(linkData as object ?? {}),
        },
        config_update: {
          status: updateRes.status,
          response: updateData,
        },
        site_url: SITE_URL,
        redirect_urls: REDIRECT_URLS,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
