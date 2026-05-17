/**
 * Edge Function: meta-insights-fetch
 *
 * Busca insights em tempo real da Meta Ads API para um ad_account_id e periodo.
 * Faz DUAS chamadas paralelas:
 *   1) SEM time_increment — retorna totais consolidados do periodo (reach exato, etc.)
 *   2) COM time_increment=1 — retorna breakdown diario para graficos
 *
 * Usa use_account_attribution_setting=true para garantir que os valores
 * retornados sejam identicos ao Gerenciador de Anuncios.
 *
 * Implementa cache de 5 minutos para evitar chamadas excessivas a API.
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
  // Modos: "dual" (totais + diario), "totals" (so totais), "daily" (so diario)
  mode?: "dual" | "totals" | "daily";
  // Se true, ignora cache e busca direto da API
  force_refresh?: boolean;
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

// Tempo de cache em minutos
const CACHE_TTL_MINUTES = 5;

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
          throw new Error(`Token expirado: ${json.error.message}`);
        }
        if (json.error.code === 200) {
          throw new Error(`Sem permissao: ${json.error.message}`);
        }
        // Rate limiting — retry com backoff
        if (json.error.code === 17 || json.error.code === 4) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 2000));
          continue;
        }
        throw new Error(`Meta API error (#${json.error.code}): ${json.error.message}`);
      }

      return json;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (
        lastError.message.includes("Token expirado") ||
        lastError.message.includes("Sem permissao")
      ) {
        throw lastError;
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

// Busca todos os insights paginados
async function fetchAllInsights(baseUrl: string, params: URLSearchParams): Promise<MetaInsightRow[]> {
  let url: string | null = `${baseUrl}?${params.toString()}`;
  const allInsights: MetaInsightRow[] = [];

  while (url) {
    const result = await fetchWithRetry(url);
    if (result.data && result.data.length > 0) {
      allInsights.push(...result.data);
    }
    url = result.paging?.next || null;
  }

  return allInsights;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Valida usuario
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: FetchPayload = await req.json();
    const {
      meta_ad_account_id,
      level,
      date_from,
      date_to,
      mode = "dual",
      force_refresh = false,
    } = body;

    if (!meta_ad_account_id || !level || !date_from || !date_to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: meta_ad_account_id, level, date_from, date_to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica cache (se nao for force_refresh)
    if (!force_refresh) {
      const cacheKey = `${workspace.id}:${meta_ad_account_id}:${level}:${date_from}:${date_to}:${mode}`;
      const cacheExpiry = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString();

      const { data: cached } = await supabaseAdmin
        .from("meta_insights_cache")
        .select("response_json, fetched_at")
        .eq("cache_key", cacheKey)
        .gt("fetched_at", cacheExpiry)
        .maybeSingle();

      if (cached) {
        // Retorna dados do cache
        return new Response(
          JSON.stringify({ ...cached.response_json, from_cache: true, cached_at: cached.fetched_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa token
    const { data: decryptedToken } = await supabaseAdmin.rpc(
      "decrypt_token",
      { p_encrypted_token: metaConnection.access_token_encrypted }
    );
    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // Campos solicitados a Meta API
    const insightFields =
      "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name," +
      "date_start,date_stop,spend,impressions,reach,clicks,ctr,cpc,cpm," +
      "frequency,unique_clicks,actions,action_values";

    const baseUrl = `https://graph.facebook.com/v21.0/${meta_ad_account_id}/insights`;
    const timeRange = JSON.stringify({ since: date_from, until: date_to });

    // Prepara as chamadas paralelas conforme o modo
    const fetchTotals = mode === "dual" || mode === "totals";
    const fetchDaily = mode === "dual" || mode === "daily";

    const promises: Promise<MetaInsightRow[]>[] = [];

    // Chamada 1: Totais do periodo (SEM time_increment)
    // Retorna exatamente os mesmos numeros do Gerenciador de Anuncios
    if (fetchTotals) {
      const totalsParams = new URLSearchParams({
        level,
        fields: insightFields,
        time_range: timeRange,
        use_account_attribution_setting: "true",
        limit: "500",
        access_token: accessToken,
      });
      promises.push(fetchAllInsights(baseUrl, totalsParams));
    }

    // Chamada 2: Breakdown diario (COM time_increment=1)
    // Para graficos de tendencia e tabelas por dia
    if (fetchDaily) {
      const dailyParams = new URLSearchParams({
        level,
        fields: insightFields,
        time_range: timeRange,
        time_increment: "1",
        use_account_attribution_setting: "true",
        limit: "500",
        access_token: accessToken,
      });
      promises.push(fetchAllInsights(baseUrl, dailyParams));
    }

    // Executa chamadas em paralelo
    const results = await Promise.all(promises);

    let totalsData: MetaInsightRow[] = [];
    let dailyData: MetaInsightRow[] = [];

    if (fetchTotals && fetchDaily) {
      totalsData = results[0];
      dailyData = results[1];
    } else if (fetchTotals) {
      totalsData = results[0];
    } else {
      dailyData = results[0];
    }

    const now = new Date().toISOString();

    const responsePayload = {
      totals: totalsData,
      daily: dailyData,
      meta: {
        account_id: meta_ad_account_id,
        level,
        date_from,
        date_to,
        mode,
        totals_count: totalsData.length,
        daily_count: dailyData.length,
        fetched_at: now,
      },
    };

    // Salva no cache
    const cacheKey = `${workspace.id}:${meta_ad_account_id}:${level}:${date_from}:${date_to}:${mode}`;
    await supabaseAdmin.from("meta_insights_cache").upsert(
      {
        cache_key: cacheKey,
        workspace_id: workspace.id,
        meta_ad_account_id,
        level,
        date_from,
        date_to,
        mode,
        response_json: responsePayload,
        fetched_at: now,
      },
      { onConflict: "cache_key" }
    );

    return new Response(
      JSON.stringify({ ...responsePayload, from_cache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[meta-insights-fetch] Error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
