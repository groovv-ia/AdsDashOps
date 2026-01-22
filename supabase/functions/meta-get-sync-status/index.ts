/**
 * Edge Function: meta-get-sync-status
 *
 * Retorna o status de sincronizacao do Meta Ads.
 *
 * CORRECAO: Usa UUIDs (acc.id) ao inves de strings (acc.meta_ad_account_id)
 * para consultar meta_insights_daily, pois a tabela armazena UUIDs como FK.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Parse query params
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");

    // Busca workspace do usuario (primeiro como owner, depois como membro)
    console.log(`[meta-get-sync-status] Buscando workspace para user_id: ${user.id}`);

    let workspace = null;

    // Tenta buscar como owner direto
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspace = ownedWorkspace;
    } else {
      // Se nao e owner, busca como membro
      const { data: memberWorkspace } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, workspaces!inner(id, name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberWorkspace && memberWorkspace.workspaces) {
        workspace = memberWorkspace.workspaces;
      }
    }

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Status da conexao Meta
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, status, granted_scopes, last_validated_at, business_manager_id")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    // 2. Busca ad accounts
    const { data: adAccounts, error: adAccountsError } = await supabaseAdmin
      .from("meta_ad_accounts")
      .select("id, meta_ad_account_id, name, currency, timezone_name, account_status")
      .eq("workspace_id", workspace.id);

    if (adAccountsError) {
      console.error("Erro ao buscar ad accounts:", adAccountsError);
    }

    console.log(`[meta-get-sync-status] Found ${adAccounts?.length || 0} ad accounts`);

    // CORRECAO: Usa UUIDs (acc.id) para consultas em meta_insights_daily
    // porque a FK meta_ad_account_id referencia meta_ad_accounts.id
    const accountUuids = adAccounts?.map((a) => a.id) || [];
    // Strings meta_id (act_xxx) para consultas em meta_sync_state e meta_sync_jobs
    const accountMetaIds = adAccounts?.map((a) => a.meta_ad_account_id) || [];

    // 3. Busca sync states (usa meta_ad_account_id strings)
    // CORRECAO: Filtra por workspace_id E ordena por updated_at DESC
    // Isso garante que retorne apenas registros do workspace correto do usuario
    let syncStatesQuery = supabaseAdmin
      .from("meta_sync_state")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false });
    if (accountMetaIds.length > 0) {
      syncStatesQuery = syncStatesQuery.in("meta_ad_account_id", accountMetaIds);
    }
    const { data: syncStates } = await syncStatesQuery;

    // 4. Busca jobs recentes (usa meta_ad_account_id strings)
    const { data: recentJobs } = await supabaseAdmin
      .from("meta_sync_jobs")
      .select("*")
      .in("meta_ad_account_id", accountMetaIds.length > 0 ? accountMetaIds : [""])
      .order("created_at", { ascending: false })
      .limit(20);

    // 5. Busca ultimo job completado de cada conta (usa meta_ad_account_id strings)
    const lastCompletedJobsByAccount: Record<string, {
      duration_seconds: number | null;
      total_records_synced: number | null;
      ended_at: string | null;
    }> = {};

    if (adAccounts) {
      for (const account of adAccounts) {
        const { data: lastJob } = await supabaseAdmin
          .from("meta_sync_jobs")
          .select("duration_seconds, total_records_synced, ended_at")
          .eq("meta_ad_account_id", account.meta_ad_account_id)
          .eq("status", "completed")
          .order("ended_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastJob) {
          lastCompletedJobsByAccount[account.meta_ad_account_id] = {
            duration_seconds: lastJob.duration_seconds,
            total_records_synced: lastJob.total_records_synced,
            ended_at: lastJob.ended_at,
          };
        }
      }
    }

    // 6. Busca totais de insights - CORRECAO: usa UUIDs!
    const { data: insightsTotals } = await supabaseAdmin
      .from("meta_insights_daily")
      .select("meta_ad_account_id, level, date")
      .in("meta_ad_account_id", accountUuids.length > 0 ? accountUuids : [""]);

    console.log(`[meta-get-sync-status] Found ${insightsTotals?.length || 0} insight rows`);

    // 6.5. Agrega metricas reais por conta (spend, impressions, clicks, conversoes)
    // Usa SQL para extrair leads e messaging_conversations do campo actions_json
    const { data: aggregatedMetrics } = await supabaseAdmin
      .rpc('get_aggregated_metrics_by_account', {
        account_uuids: accountUuids.length > 0 ? accountUuids : null
      })
      .then((result) => result)
      .catch(() => ({ data: null }));

    // Fallback: se a function nao existir, faz agregacao manual
    let metricsAggregationByAccount: Record<string, {
      spend: number;
      impressions: number;
      clicks: number;
      reach: number;
      ctr: number;
      cpc: number;
      cpm: number;
      leads: number;
      messaging_conversations_started: number;
      conversions: number;
    }> = {};

    if (aggregatedMetrics) {
      // Se a RPC function existe, usa os dados retornados
      for (const metric of aggregatedMetrics) {
        metricsAggregationByAccount[metric.account_id] = metric;
      }
    } else {
      // Fallback: busca dados brutos e agrega no codigo
      const { data: rawInsights } = await supabaseAdmin
        .from("meta_insights_daily")
        .select("meta_ad_account_id, spend, impressions, clicks, reach, actions_json")
        .in("meta_ad_account_id", accountUuids.length > 0 ? accountUuids : [""]);

      if (rawInsights) {
        for (const insight of rawInsights) {
          const accountId = insight.meta_ad_account_id;
          if (!metricsAggregationByAccount[accountId]) {
            metricsAggregationByAccount[accountId] = {
              spend: 0,
              impressions: 0,
              clicks: 0,
              reach: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              leads: 0,
              messaging_conversations_started: 0,
              conversions: 0,
            };
          }

          // Soma metricas basicas
          metricsAggregationByAccount[accountId].spend += insight.spend || 0;
          metricsAggregationByAccount[accountId].impressions += insight.impressions || 0;
          metricsAggregationByAccount[accountId].clicks += insight.clicks || 0;
          metricsAggregationByAccount[accountId].reach += insight.reach || 0;

          // Extrai conversoes do actions_json
          if (insight.actions_json && Array.isArray(insight.actions_json)) {
            for (const action of insight.actions_json) {
              if (action.action_type === 'lead') {
                metricsAggregationByAccount[accountId].leads += parseFloat(action.value) || 0;
              } else if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                metricsAggregationByAccount[accountId].messaging_conversations_started += parseFloat(action.value) || 0;
              }
            }
          }
        }

        // Calcula metricas derivadas
        for (const accountId in metricsAggregationByAccount) {
          const metrics = metricsAggregationByAccount[accountId];
          metrics.conversions = metrics.leads + metrics.messaging_conversations_started;
          metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
          metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
        }
      }
    }

    console.log(`[meta-get-sync-status] Aggregated metrics for ${Object.keys(metricsAggregationByAccount).length} accounts`);

    // 7. Busca contagem de entidades por conta (campanhas, adsets, ads)
    // Agrupa por meta_ad_account_id e entity_type, contando total e ativos
    const { data: entityCounts } = await supabaseAdmin
      .from("meta_entities_cache")
      .select("meta_ad_account_id, entity_type, effective_status")
      .eq("workspace_id", workspace.id)
      .in("meta_ad_account_id", accountMetaIds.length > 0 ? accountMetaIds : [""]);

    console.log(`[meta-get-sync-status] Found ${entityCounts?.length || 0} entity cache rows`);

    // Processa contagem de entidades por conta
    // Estrutura: { [meta_ad_account_id]: { campaign: { total, active }, adset: {...}, ad: {...} } }
    const entityCountsByAccount: Record<string, {
      campaign: { total: number; active: number };
      adset: { total: number; active: number };
      ad: { total: number; active: number };
    }> = {};

    if (entityCounts) {
      for (const entity of entityCounts) {
        const accountId = entity.meta_ad_account_id;
        if (!entityCountsByAccount[accountId]) {
          entityCountsByAccount[accountId] = {
            campaign: { total: 0, active: 0 },
            adset: { total: 0, active: 0 },
            ad: { total: 0, active: 0 },
          };
        }

        const entityType = entity.entity_type as 'campaign' | 'adset' | 'ad';
        if (entityCountsByAccount[accountId][entityType]) {
          entityCountsByAccount[accountId][entityType].total++;
          // Status ACTIVE indica entidade ativa
          if (entity.effective_status === 'ACTIVE') {
            entityCountsByAccount[accountId][entityType].active++;
          }
        }
      }
    }

    // Processa data freshness por conta - indexado por UUID
    const accountFreshness: Record<string, {
      total_rows: number;
      latest_date: string | null;
      levels: Record<string, number>;
    }> = {};

    if (insightsTotals) {
      for (const insight of insightsTotals) {
        const accountUuid = insight.meta_ad_account_id;
        if (!accountFreshness[accountUuid]) {
          accountFreshness[accountUuid] = {
            total_rows: 0,
            latest_date: null,
            levels: { campaign: 0, adset: 0, ad: 0 },
          };
        }
        accountFreshness[accountUuid].total_rows++;
        accountFreshness[accountUuid].levels[insight.level] =
          (accountFreshness[accountUuid].levels[insight.level] || 0) + 1;

        if (!accountFreshness[accountUuid].latest_date ||
            insight.date > accountFreshness[accountUuid].latest_date) {
          accountFreshness[accountUuid].latest_date = insight.date;
        }
      }
    }

    // Calcula health status geral
    let healthStatus = "healthy";
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    if (!metaConnection || metaConnection.status !== "connected") {
      healthStatus = "disconnected";
    } else if (adAccounts && adAccounts.length > 0) {
      const hasAnySyncState = syncStates && syncStates.length > 0;

      if (!hasAnySyncState) {
        healthStatus = "pending_first_sync";
      } else {
        const hasRecentError = syncStates.some((s) => {
          if (!s.last_error) return false;
          if (!s.last_success_at) return true;
          const lastSuccess = new Date(s.last_success_at);
          return lastSuccess < twoDaysAgo;
        });

        const hasNeverSynced = syncStates.some((s) => !s.last_success_at);

        const hasStaleData = syncStates.some((s) => {
          if (!s.last_success_at) return false;
          return new Date(s.last_success_at) < twoDaysAgo;
        });

        if (hasRecentError) {
          healthStatus = "error";
        } else if (hasNeverSynced) {
          healthStatus = "pending_first_sync";
        } else if (hasStaleData) {
          healthStatus = "stale";
        }
      }
    } else {
      healthStatus = "pending_first_sync";
    }

    const response = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      connection: metaConnection ? {
        status: metaConnection.status,
        business_manager_id: metaConnection.business_manager_id,
        granted_scopes: metaConnection.granted_scopes,
        last_validated_at: metaConnection.last_validated_at,
      } : null,
      health_status: healthStatus,
      ad_accounts: adAccounts?.map((acc) => {
        const syncState = syncStates?.find((s) => s.meta_ad_account_id === acc.meta_ad_account_id);
        const lastJobMetrics = lastCompletedJobsByAccount[acc.meta_ad_account_id];
        // CORRECAO: Usa acc.id (UUID) para buscar freshness
        const freshness = accountFreshness[acc.id] || null;
        // Busca contagem de entidades usando meta_ad_account_id (formato act_XXX)
        const entityCountsForAccount = entityCountsByAccount[acc.meta_ad_account_id] || null;

        // Busca metricas agregadas usando acc.id (UUID)
        const accountMetrics = metricsAggregationByAccount[acc.id] || null;

        return {
          id: acc.id,
          meta_id: acc.meta_ad_account_id,
          name: acc.name,
          currency: acc.currency,
          timezone: acc.timezone_name,
          status: acc.account_status,
          freshness: freshness,
          last_sync_at: syncState?.last_success_at || lastJobMetrics?.ended_at || null,
          last_sync_duration: lastJobMetrics?.duration_seconds || null,
          last_sync_records_count: lastJobMetrics?.total_records_synced || null,
          // Contagem de entidades (campanhas, adsets, ads) com total e ativos
          entity_counts: entityCountsForAccount,
          // Data mais recente dos dados sincronizados
          latest_data_date: freshness?.latest_date || null,
          // Metricas agregadas reais incluindo conversoes
          metrics: accountMetrics ? {
            spend: accountMetrics.spend,
            impressions: accountMetrics.impressions,
            clicks: accountMetrics.clicks,
            reach: accountMetrics.reach,
            ctr: accountMetrics.ctr,
            cpc: accountMetrics.cpc,
            cpm: accountMetrics.cpm,
            leads: accountMetrics.leads,
            messaging_conversations_started: accountMetrics.messaging_conversations_started,
            conversions: accountMetrics.conversions,
          } : null,
        };
      }) || [],
      sync_states: syncStates?.map((state) => ({
        meta_ad_account_id: state.meta_ad_account_id,
        client_id: state.client_id,
        last_daily_date_synced: state.last_daily_date_synced,
        last_intraday_synced_at: state.last_intraday_synced_at,
        last_success_at: state.last_success_at,
        last_error: state.last_error,
        sync_enabled: state.sync_enabled,
      })) || [],
      recent_jobs: recentJobs?.map((job) => ({
        id: job.id,
        job_type: job.job_type,
        level: job.level,
        status: job.status,
        fetched_rows: job.fetched_rows,
        error_message: job.error_message,
        date_from: job.date_from,
        date_to: job.date_to,
        started_at: job.started_at,
        ended_at: job.ended_at,
      })) || [],
      totals: {
        ad_accounts: adAccounts?.length || 0,
        total_insights_rows: Object.values(accountFreshness).reduce((sum, a) => sum + a.total_rows, 0),
        jobs_with_errors: recentJobs?.filter((j) => j.status === "failed").length || 0,
      },
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});