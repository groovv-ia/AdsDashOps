/**
 * Edge Function: meta-insights-fetch
 *
 * Busca insights em tempo real da Meta Ads API para um ad_account_id e periodo.
 * Usa use_account_attribution_setting=true e action_attribution_windows para
 * garantir que os valores retornados sejam identicos ao Gerenciador de Anuncios.
 *
 * Payload esperado:
 * {
 *   meta_ad_account_id: string,  // formato "act_XXXXX"
 *   level: "campaign" | "adset" | "ad",
 *   date_from: string,           // YYYY-MM-DD
 *   date_to: string,             // YYYY-MM-DD
 *   time_increment?: "1" | "all_days"  // "1" para diario, omite para totais
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FetchPayload {
  meta_ad_account_id: string;
  level: "campaign" | "adset" | "ad";
  date_from: string;
  date_to: string;
  time_increment?: "1" | "all_days";
}

interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  frequency?: string;
  unique_clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

// Busca com retry e backoff exponencial
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<{ data: MetaInsightRow[]; paging?: { next: string } }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const json = await response.json();

      if (json.error) {
        if (json.error.code === 190) {
          throw new Error(
            `Token expirado: ${json.error.message}`
          );
        }
        if (json.error.code === 200) {
          throw new Error(
            `Sem permissao: ${json.error.message}`
          );
        }
        // Rate limiting — retry com backoff
        if (json.error.code === 17 || json.error.code === 4) {
          await new Promise((r) =>
            setTimeout(r, Math.pow(2, attempt) * 1000)
          );
          continue;
        }
        throw new Error(
          `Meta API error (#${json.error.code}): ${json.error.message}`
        );
      }

      return json;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown error");
      if (
        lastError.message.includes("Token expirado") ||
        lastError.message.includes("Sem permissao")
      ) {
        throw lastError;
      }
      await new Promise((r) =>
        setTimeout(r, Math.pow(2, attempt) * 1000)
      );
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Valida usuario
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: FetchPayload = await req.json();
    const { meta_ad_account_id, level, date_from, date_to, time_increment } =
      body;

    if (!meta_ad_account_id || !level || !date_from || !date_to) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: meta_ad_account_id, level, date_from, date_to",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Busca workspace do usuario
    const { data: workspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const workspace = workspaces?.[0];
    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Busca conexao Meta e token
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!metaConnection || metaConnection.status === "token_expired") {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Descriptografa token
    const { data: decryptedToken } = await supabaseAdmin.rpc(
      "decrypt_token",
      { p_encrypted_token: metaConnection.access_token_encrypted }
    );
    const accessToken =
      decryptedToken || metaConnection.access_token_encrypted;

    // Monta a chamada a Meta Insights API
    const insightFields =
      "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name," +
      "date_start,date_stop,spend,impressions,reach,clicks,ctr,cpc,cpm," +
      "frequency,unique_clicks,actions,action_values";

    const params = new URLSearchParams({
      level,
      fields: insightFields,
      time_range: JSON.stringify({ since: date_from, until: date_to }),
      use_account_attribution_setting: "true",
      action_attribution_windows: '["7d_click","1d_view"]',
      limit: "500",
      access_token: accessToken,
    });

    // time_increment: "1" para diario, sem parametro para totais do periodo
    if (time_increment === "1") {
      params.set("time_increment", "1");
    }

    const baseUrl = `https://graph.facebook.com/v21.0/${meta_ad_account_id}/insights`;
    let url: string | null = `${baseUrl}?${params.toString()}`;
    const allInsights: MetaInsightRow[] = [];

    // Paginacao
    while (url) {
      const result = await fetchWithRetry(url);
      if (result.data && result.data.length > 0) {
        allInsights.push(...result.data);
      }
      url = result.paging?.next || null;
    }

    // Atualiza last_synced_at na conta
    await supabaseAdmin
      .from("meta_ad_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .eq("meta_ad_account_id", meta_ad_account_id);

    return new Response(
      JSON.stringify({
        data: allInsights,
        meta: {
          account_id: meta_ad_account_id,
          level,
          date_from,
          date_to,
          total_rows: allInsights.length,
          fetched_at: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[meta-insights-fetch] Error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
