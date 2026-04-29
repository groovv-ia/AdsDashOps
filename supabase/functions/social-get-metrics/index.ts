/**
 * Edge Function: social-get-metrics
 *
 * Retorna série temporal de métricas de crescimento social para uma conta,
 * incluindo variação percentual vs período anterior e totais agregados.
 *
 * Parâmetros (query string ou body JSON):
 *   workspace_id: string  (obrigatório)
 *   account_id: string    (obrigatório)
 *   platform: string      (obrigatório - 'facebook' | 'instagram')
 *   days: number          (padrão: 30)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Calcula variação percentual entre dois valores
function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

// Agrega métricas de um array de registros
function aggregateMetrics(rows: Record<string, unknown>[]) {
  return rows.reduce(
    (acc, row) => ({
      followers_count: Math.max(acc.followers_count, Number(row.followers_count) || 0),
      reach: acc.reach + (Number(row.reach) || 0),
      impressions: acc.impressions + (Number(row.impressions) || 0),
      profile_views: acc.profile_views + (Number(row.profile_views) || 0),
      website_clicks: acc.website_clicks + (Number(row.website_clicks) || 0),
      likes: acc.likes + (Number(row.likes) || 0),
      comments: acc.comments + (Number(row.comments) || 0),
      shares: acc.shares + (Number(row.shares) || 0),
      saves: acc.saves + (Number(row.saves) || 0),
      avg_engagement_rate:
        acc.avg_engagement_rate + (Number(row.engagement_rate) || 0),
    }),
    {
      followers_count: 0,
      reach: 0,
      impressions: 0,
      profile_views: 0,
      website_clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      avg_engagement_rate: 0,
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lê parâmetros do body ou query string
    let workspaceId = "", accountId = "", platform = "", days = 30;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      workspaceId = body.workspace_id || "";
      accountId = body.account_id || "";
      platform = body.platform || "";
      days = body.days || 30;
    } else {
      const url = new URL(req.url);
      workspaceId = url.searchParams.get("workspace_id") || "";
      accountId = url.searchParams.get("account_id") || "";
      platform = url.searchParams.get("platform") || "";
      days = parseInt(url.searchParams.get("days") || "30", 10);
    }

    if (!workspaceId || !accountId || !platform) {
      return new Response(
        JSON.stringify({ error: "workspace_id, account_id e platform são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Busca métricas do período atual
    const { data: currentRows, error: currentError } = await supabaseAdmin
      .from("social_growth_metrics")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId)
      .eq("platform", platform)
      .gte("date", formatDate(currentStart))
      .lte("date", formatDate(now))
      .order("date", { ascending: true });

    // Busca métricas do período anterior (para comparação)
    const { data: previousRows } = await supabaseAdmin
      .from("social_growth_metrics")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId)
      .eq("platform", platform)
      .gte("date", formatDate(previousStart))
      .lt("date", formatDate(currentStart))
      .order("date", { ascending: true });

    if (currentError) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar métricas", details: currentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = currentRows || [];
    const prevRows = previousRows || [];

    // Agrega totais dos dois períodos para calcular variações
    const current = aggregateMetrics(rows as Record<string, unknown>[]);
    const previous = aggregateMetrics(prevRows as Record<string, unknown>[]);

    const rowCount = rows.length || 1;
    current.avg_engagement_rate = parseFloat((current.avg_engagement_rate / rowCount).toFixed(4));
    const prevRowCount = prevRows.length || 1;
    const prevAvgEngagement = parseFloat((previous.avg_engagement_rate / prevRowCount).toFixed(4));

    // Calcula variações percentuais
    const changes = {
      followers_count: calcChange(current.followers_count, previous.followers_count),
      reach: calcChange(current.reach, previous.reach),
      impressions: calcChange(current.impressions, previous.impressions),
      profile_views: calcChange(current.profile_views, previous.profile_views),
      website_clicks: calcChange(current.website_clicks, previous.website_clicks),
      likes: calcChange(current.likes, previous.likes),
      comments: calcChange(current.comments, previous.comments),
      engagement_rate: calcChange(current.avg_engagement_rate, prevAvgEngagement),
    };

    // Calcula score de presença digital (0-100)
    // Ponderado: seguidores 30%, engajamento 30%, alcance 20%, perfil/site 20%
    const followersScore = Math.min(100, Math.max(0, 50 + changes.followers_count * 0.5));
    const engagementScore = Math.min(100, current.avg_engagement_rate * 10);
    const reachScore = Math.min(100, Math.max(0, 50 + changes.reach * 0.5));
    const profileScore = Math.min(100, Math.max(0, (current.profile_views > 0 ? 60 : 20) + changes.profile_views * 0.3));

    const digitalPresenceScore = Math.round(
      followersScore * 0.3 + engagementScore * 0.3 + reachScore * 0.2 + profileScore * 0.2
    );

    // Histórico de score por dia (simplificado)
    const scoreHistory = rows.map((row: Record<string, unknown>) => {
      const engRate = Number(row.engagement_rate) || 0;
      const dayScore = Math.min(100, Math.round(50 + engRate * 5));
      return { date: row.date, score: dayScore };
    });

    return new Response(
      JSON.stringify({
        period: { days, start: formatDate(currentStart), end: formatDate(now) },
        totals: { ...current, avg_engagement_rate: current.avg_engagement_rate },
        changes,
        digital_presence_score: digitalPresenceScore,
        score_history: scoreHistory,
        time_series: rows,
        has_data: rows.length > 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-get-metrics] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
