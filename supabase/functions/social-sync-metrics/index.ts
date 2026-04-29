/**
 * Edge Function: social-sync-metrics
 *
 * Busca métricas de crescimento do Facebook Page Insights e Instagram Insights
 * via Graph API e salva na tabela social_growth_metrics.
 *
 * Fluxo:
 * 1. Carrega conexões ativas do workspace (social_page_connections)
 * 2. Para cada conexão, descriptografa token e busca dados do período
 * 3. Faz upsert em social_growth_metrics
 * 4. Registra job em social_sync_jobs
 *
 * Parâmetros aceitos (body JSON):
 *   workspace_id: string (obrigatório)
 *   account_id?: string  (opcional, sincroniza só esta conta)
 *   days_back?: number   (padrão: 30)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Busca métricas de uma Facebook Page via Page Insights API
async function fetchFacebookPageMetrics(
  pageId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, Record<string, number>>> {
  const metrics = [
    "page_fans",              // seguidores totais
    "page_fan_adds_by_paid_non_paid_unique", // novos seguidores
    "page_impressions",
    "page_reach",
    "page_engaged_users",
    "page_views_total",
    "page_post_engagements",
  ];

  const url = `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metrics.join(",")}&period=day&since=${dateFrom}&until=${dateTo}&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("[social-sync-metrics] Facebook Insights error:", data.error);
    return {};
  }

  // Indexa por data -> metrica -> valor
  const byDate: Record<string, Record<string, number>> = {};
  for (const metric of (data.data || [])) {
    for (const entry of (metric.values || [])) {
      const date = entry.end_time?.split("T")[0] || "";
      if (!date) continue;
      if (!byDate[date]) byDate[date] = {};
      byDate[date][metric.name] = typeof entry.value === "number" ? entry.value : 0;
    }
  }
  return byDate;
}

// Busca métricas de uma conta Instagram Business via Graph API
async function fetchInstagramMetrics(
  igAccountId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  dailyMetrics: Record<string, Record<string, number>>;
  followerCount: number;
  mediaEngagement: { likes: number; comments: number; saves: number; shares: number };
}> {
  // Métricas de conta (diárias)
  const igMetrics = ["reach", "impressions", "profile_views", "website_clicks", "follower_count"];
  const url = `https://graph.facebook.com/v21.0/${igAccountId}/insights?metric=${igMetrics.join(",")}&period=day&since=${dateFrom}&until=${dateTo}&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  const dailyMetrics: Record<string, Record<string, number>> = {};
  if (!data.error) {
    for (const metric of (data.data || [])) {
      for (const entry of (metric.values || [])) {
        const date = entry.end_time?.split("T")[0] || "";
        if (!date) continue;
        if (!dailyMetrics[date]) dailyMetrics[date] = {};
        dailyMetrics[date][metric.name] = typeof entry.value === "number" ? entry.value : 0;
      }
    }
  }

  // Busca total de seguidores atual
  const profileUrl = `https://graph.facebook.com/v21.0/${igAccountId}?fields=followers_count,media_count,follows_count&access_token=${accessToken}`;
  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json();
  const followerCount = profileData.followers_count || 0;

  // Busca engajamento dos últimos posts para calcular taxa
  const mediaUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=like_count,comments_count,timestamp&limit=50&access_token=${accessToken}`;
  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json();

  let totalLikes = 0, totalComments = 0;
  const mediaCount = (mediaData.data || []).length;
  for (const post of (mediaData.data || [])) {
    totalLikes += post.like_count || 0;
    totalComments += post.comments_count || 0;
  }

  return {
    dailyMetrics,
    followerCount,
    mediaEngagement: {
      likes: mediaCount > 0 ? Math.round(totalLikes / mediaCount) : 0,
      comments: mediaCount > 0 ? Math.round(totalComments / mediaCount) : 0,
      saves: 0,
      shares: 0,
    },
  };
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

    const body = await req.json().catch(() => ({}));
    const workspaceId: string = body.workspace_id;
    const filterAccountId: string | undefined = body.account_id;
    const daysBack: number = body.days_back || 30;

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspace_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Carrega conexões ativas do workspace
    let connectionsQuery = supabaseAdmin
      .from("social_page_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (filterAccountId) {
      connectionsQuery = connectionsQuery.eq("page_id", filterAccountId);
    }

    const { data: connections, error: connError } = await connectionsQuery;
    if (connError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma conta social ativa para sincronizar", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const dateFrom = formatDate(new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000));
    const dateTo = formatDate(now);

    let totalSynced = 0;
    const results: Array<{ account_id: string; platform: string; records: number; error?: string }> = [];

    for (const conn of connections) {
      // Registra início do job
      const { data: job } = await supabaseAdmin
        .from("social_sync_jobs")
        .insert({
          workspace_id: workspaceId,
          account_id: conn.page_id,
          platform: conn.platform,
          status: "running",
        })
        .select("id")
        .single();

      try {
        // Descriptografa token
        const { data: decryptedToken, error: decryptError } = await supabaseAdmin
          .rpc("decrypt_token", { p_encrypted_token: conn.access_token_encrypted });

        if (decryptError || !decryptedToken) {
          throw new Error("Falha ao descriptografar token");
        }

        const token = decryptedToken as string;
        const metricsRows: Array<Record<string, unknown>> = [];

        if (conn.platform === "facebook") {
          const byDate = await fetchFacebookPageMetrics(conn.page_id, token, dateFrom, dateTo);

          for (const [date, vals] of Object.entries(byDate)) {
            const fans = vals["page_fans"] || 0;
            const engagedUsers = vals["page_engaged_users"] || 0;
            const reach = vals["page_reach"] || 0;
            const engagementRate = reach > 0 ? (engagedUsers / reach) * 100 : 0;

            metricsRows.push({
              workspace_id: workspaceId,
              client_id: conn.client_id || null,
              platform: "facebook",
              account_id: conn.page_id,
              date,
              followers_count: fans,
              reach: vals["page_reach"] || 0,
              impressions: vals["page_impressions"] || 0,
              profile_views: vals["page_views_total"] || 0,
              likes: vals["page_post_engagements"] || 0,
              engagement_rate: parseFloat(engagementRate.toFixed(6)),
              raw_json: vals,
            });
          }
        } else if (conn.platform === "instagram" && conn.instagram_account_id) {
          const { dailyMetrics, followerCount, mediaEngagement } =
            await fetchInstagramMetrics(conn.instagram_account_id, token, dateFrom, dateTo);

          for (const [date, vals] of Object.entries(dailyMetrics)) {
            const reach = vals["reach"] || 0;
            const likes = mediaEngagement.likes;
            const comments = mediaEngagement.comments;
            const engagementRate = followerCount > 0
              ? ((likes + comments) / followerCount) * 100
              : 0;

            metricsRows.push({
              workspace_id: workspaceId,
              client_id: conn.client_id || null,
              platform: "instagram",
              account_id: conn.instagram_account_id,
              date,
              followers_count: vals["follower_count"] || followerCount,
              reach,
              impressions: vals["impressions"] || 0,
              profile_views: vals["profile_views"] || 0,
              website_clicks: vals["website_clicks"] || 0,
              likes,
              comments,
              engagement_rate: parseFloat(engagementRate.toFixed(6)),
              raw_json: vals,
            });
          }
        }

        // Upsert em lotes de 100
        let rowsSaved = 0;
        for (let i = 0; i < metricsRows.length; i += 100) {
          const batch = metricsRows.slice(i, i + 100);
          const { error: upsertError } = await supabaseAdmin
            .from("social_growth_metrics")
            .upsert(batch, { onConflict: "workspace_id,platform,account_id,date" });

          if (!upsertError) rowsSaved += batch.length;
        }

        // Atualiza last_synced_at na conexão
        await supabaseAdmin
          .from("social_page_connections")
          .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", conn.id);

        // Encerra job com sucesso
        if (job) {
          await supabaseAdmin
            .from("social_sync_jobs")
            .update({ status: "success", ended_at: new Date().toISOString(), records_synced: rowsSaved })
            .eq("id", job.id);
        }

        totalSynced += rowsSaved;
        results.push({ account_id: conn.page_id, platform: conn.platform, records: rowsSaved });
      } catch (err) {
        const errMsg = String(err);
        console.error(`[social-sync-metrics] Erro em ${conn.page_id}:`, errMsg);

        if (job) {
          await supabaseAdmin
            .from("social_sync_jobs")
            .update({ status: "error", ended_at: new Date().toISOString(), error_message: errMsg })
            .eq("id", job.id);
        }

        results.push({ account_id: conn.page_id, platform: conn.platform, records: 0, error: errMsg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_synced: totalSynced, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-sync-metrics] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
