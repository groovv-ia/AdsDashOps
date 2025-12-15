/**
 * Edge Function: meta-get-sync-status
 * 
 * Retorna o status de sincronizacao do Meta Ads.
 * 
 * GET /functions/v1/meta-get-sync-status?client_id=...
 * 
 * Retorna:
 * - Status da conexao
 * - Ultima execucao daily/intraday
 * - Jobs recentes com erro
 * - Data freshness por conta
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

    // Busca workspace do usuario
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

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

    // 2. Busca ad accounts - corrigido: usa timezone_name ao inves de timezone
    const { data: adAccounts, error: adAccountsError } = await supabaseAdmin
      .from("meta_ad_accounts")
      .select("id, meta_ad_account_id, name, currency, timezone_name, account_status")
      .eq("workspace_id", workspace.id);

    if (adAccountsError) {
      console.error("Erro ao buscar ad accounts:", adAccountsError);
    }

    // 3. Busca sync states
    let syncStatesQuery = supabaseAdmin
      .from("meta_sync_state")
      .select("*");

    // Filtra por workspace apenas se a tabela tiver essa coluna
    // Como a tabela pode nao ter workspace_id, vamos filtrar pelas contas do workspace
    const accountIds = adAccounts?.map((a) => a.meta_ad_account_id) || [];
    
    if (accountIds.length > 0) {
      syncStatesQuery = syncStatesQuery.in("meta_ad_account_id", accountIds);
    }

    if (clientId) {
      syncStatesQuery = syncStatesQuery.eq("client_id", clientId);
    }

    const { data: syncStates } = await syncStatesQuery;

    // 4. Busca jobs recentes (com erro ou em execucao)
    const { data: recentJobs } = await supabaseAdmin
      .from("meta_sync_jobs")
      .select("*")
      .in("meta_ad_account_id", accountIds.length > 0 ? accountIds : [''])
      .order("created_at", { ascending: false })
      .limit(20);

    // 5. Busca ultimo job completado de cada conta para obter metricas de sincronizacao
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

    // 6. Busca totais de insights
    const { data: insightsTotals } = await supabaseAdmin
      .from("meta_insights_daily")
      .select("meta_ad_account_id, level, date")
      .in("meta_ad_account_id", accountIds.length > 0 ? accountIds : ['']);

    // Processa data freshness por conta
    const accountFreshness: Record<string, {
      total_rows: number;
      latest_date: string | null;
      levels: Record<string, number>;
    }> = {};

    if (insightsTotals) {
      for (const insight of insightsTotals) {
        const accountId = insight.meta_ad_account_id;
        if (!accountFreshness[accountId]) {
          accountFreshness[accountId] = {
            total_rows: 0,
            latest_date: null,
            levels: { campaign: 0, adset: 0, ad: 0 },
          };
        }
        accountFreshness[accountId].total_rows++;
        accountFreshness[accountId].levels[insight.level] = 
          (accountFreshness[accountId].levels[insight.level] || 0) + 1;
        
        if (!accountFreshness[accountId].latest_date || 
            insight.date > accountFreshness[accountId].latest_date) {
          accountFreshness[accountId].latest_date = insight.date;
        }
      }
    }

    // Calcula health status geral
    // Considera dados "frescos" se sincronizados nas ultimas 48h
    // Isso evita marcar como "desatualizado" logo apos uma sincronizacao bem-sucedida
    let healthStatus = "healthy";
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    if (!metaConnection || metaConnection.status !== "connected") {
      healthStatus = "disconnected";
    } else if (syncStates && syncStates.length > 0) {
      // Verifica se ha erros RECENTES (ultimas 48h)
      const hasRecentError = syncStates.some((s) => {
        if (!s.last_error) return false;
        // Se nao tiver last_success_at, considera o erro como recente
        if (!s.last_success_at) return true;
        // Se o ultimo sucesso foi antes do erro (ou seja, erro ainda nao foi resolvido)
        // Mas so considera "error" se o sucesso foi ha menos de 48h
        const lastSuccess = new Date(s.last_success_at);
        return lastSuccess < twoDaysAgo;
      });

      // Verifica se dados estao desatualizados (mais de 48h sem sincronizacao bem-sucedida)
      const hasStaleData = syncStates.some((s) => {
        if (!s.last_success_at) return true;
        return new Date(s.last_success_at) < twoDaysAgo;
      });

      if (hasRecentError) {
        healthStatus = "error";
      } else if (hasStaleData) {
        healthStatus = "stale";
      }
    }

    // Monta resposta
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
        // Busca o sync state correspondente para obter last_success_at
        const syncState = syncStates?.find((s) => s.meta_ad_account_id === acc.meta_ad_account_id);
        // Busca metricas do ultimo job completado
        const lastJobMetrics = lastCompletedJobsByAccount[acc.meta_ad_account_id];

        return {
          id: acc.id,
          meta_id: acc.meta_ad_account_id,
          name: acc.name,
          currency: acc.currency,
          timezone: acc.timezone_name, // Mapeado corretamente
          status: acc.account_status,
          freshness: accountFreshness[acc.meta_ad_account_id] || null,
          // Informacoes detalhadas de ultima sincronizacao
          last_sync_at: syncState?.last_success_at || lastJobMetrics?.ended_at || null,
          last_sync_duration: lastJobMetrics?.duration_seconds || null,
          last_sync_records_count: lastJobMetrics?.total_records_synced || null,
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