/**
 * Edge Function: meta-run-sync
 * 
 * Executa sincronizacao de dados do Meta Ads.
 * Busca insights de campaigns, adsets e ads e salva no Supabase.
 * 
 * POST /functions/v1/meta-run-sync
 * Body: { 
 *   mode: 'daily' | 'intraday' | 'backfill',
 *   client_id?: string,
 *   meta_ad_account_id?: string,
 *   days_back?: number,
 *   levels?: string[] (default: ['campaign', 'adset', 'ad'])
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncPayload {
  mode: "daily" | "intraday" | "backfill";
  client_id?: string;
  meta_ad_account_id?: string;
  days_back?: number;
  levels?: string[];
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

interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: { next: string };
  error?: { message: string; code: number };
}

// Funcao para formatar data no padrao YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Funcao para calcular datas baseado no modo
function getDateRange(mode: string, daysBack: number = 7): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = formatDate(now);
  
  if (mode === "daily") {
    // Ontem
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { dateFrom: formatDate(yesterday), dateTo: formatDate(yesterday) };
  } else if (mode === "intraday") {
    // Hoje
    return { dateFrom: today, dateTo: today };
  } else {
    // Backfill: ultimos N dias
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - daysBack);
    return { dateFrom: formatDate(fromDate), dateTo: today };
  }
}

// Funcao para extrair leads do array de actions
function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const leadTypes = ['lead', 'onsite_conversion.lead_grouped'];
  return actions
    .filter((a) => leadTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);
}

// Funcao para extrair conversoes do array de actions
function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const conversionTypes = [
    'lead',
    'purchase',
    'complete_registration',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
    'offsite_conversion.fb_pixel_lead',
  ];
  return actions
    .filter((a) => conversionTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

// Funcao para extrair valores de conversao do array de action_values
function extractConversionValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  
  const valueTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
  ];
  return actionValues
    .filter((a) => valueTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

// Funcao para extrair valores de compra do array de action_values
function extractPurchaseValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  
  const purchaseTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ];
  return actionValues
    .filter((a) => purchaseTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

// Funcao para buscar insights com retry e backoff
async function fetchInsightsWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<MetaInsightsResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        // Se for rate limit, espera e tenta novamente
        if (data.error.code === 17 || data.error.code === 4) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(data.error.message);
      }
      
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
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

    // Parse do body
    const body: SyncPayload = await req.json();
    const { 
      mode = "intraday", 
      client_id, 
      meta_ad_account_id,
      days_back = 7,
      levels = ["campaign", "adset", "ad"]
    } = body;

    // Busca o workspace do usuario
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca a conexao Meta
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token_encrypted, status")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa o token
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // Busca as ad accounts a sincronizar
    let adAccountsQuery = supabaseAdmin
      .from("meta_ad_accounts")
      .select("id, meta_ad_account_id, name, currency, timezone_name")
      .eq("workspace_id", workspace.id);

    if (meta_ad_account_id) {
      adAccountsQuery = adAccountsQuery.eq("meta_ad_account_id", meta_ad_account_id);
    }

    const { data: adAccounts } = await adAccountsQuery;

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No ad accounts to sync" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcula periodo
    const { dateFrom, dateTo } = getDateRange(mode, days_back);

    // Resultado do sync
    const syncResult = {
      mode,
      date_from: dateFrom,
      date_to: dateTo,
      accounts_synced: 0,
      insights_synced: 0,
      errors: [] as string[],
    };

    // Campos a buscar da API Meta
    const insightFields = [
      "campaign_id", "campaign_name",
      "adset_id", "adset_name",
      "ad_id", "ad_name",
      "date_start", "date_stop",
      "spend", "impressions", "reach", "clicks",
      "ctr", "cpc", "cpm", "frequency", "unique_clicks",
      "actions", "action_values"
    ].join(",");

    // Processa cada ad account
    for (const adAccount of adAccounts) {
      try {
        // Captura timestamp de inicio para calcular duracao
        const syncStartTime = new Date();

        // Cria job de sync
        const { data: syncJob } = await supabaseAdmin
          .from("meta_sync_jobs")
          .insert({
            workspace_id: workspace.id,
            client_id: client_id || null,
            meta_ad_account_id: adAccount.meta_ad_account_id,
            job_type: mode === "backfill" ? "backfill" : mode === "daily" ? "daily" : "fast",
            date_from: dateFrom,
            date_to: dateTo,
            status: "running",
            started_at: syncStartTime.toISOString(),
          })
          .select("id")
          .single();

        let totalRows = 0;

        // Busca insights para cada nivel
        for (const level of levels) {
          try {
            const levelParam = level === "adset" ? "adset" : level;
            const baseUrl = `https://graph.facebook.com/v21.0/${adAccount.meta_ad_account_id}/insights`;
            const params = new URLSearchParams({
              level: levelParam,
              fields: insightFields,
              time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
              time_increment: "1",
              limit: "500",
              access_token: accessToken,
            });

            let url: string | null = `${baseUrl}?${params.toString()}`;
            const allInsights: MetaInsightRow[] = [];

            // Paginacao
            while (url) {
              const data = await fetchInsightsWithRetry(url);
              
              if (data.data && data.data.length > 0) {
                allInsights.push(...data.data);
              }

              url = data.paging?.next || null;
            }

            // Processa e salva insights
            for (const insight of allInsights) {
              // Determina entity_id e entity_name baseado no nivel
              let entityId: string;
              let entityName: string | null;

              if (level === "ad") {
                entityId = insight.ad_id || "";
                entityName = insight.ad_name || null;
              } else if (level === "adset") {
                entityId = insight.adset_id || "";
                entityName = insight.adset_name || null;
              } else {
                entityId = insight.campaign_id || "";
                entityName = insight.campaign_name || null;
              }

              if (!entityId) continue;

              // Extrai metricas de conversao
              const leads = extractLeads(insight.actions);
              const conversions = extractConversions(insight.actions);
              const conversionValue = extractConversionValue(insight.action_values);
              const purchaseValue = extractPurchaseValue(insight.action_values);

              // Salva na camada RAW
              await supabaseAdmin.from("meta_insights_raw").insert({
                workspace_id: workspace.id,
                client_id: client_id || null,
                meta_ad_account_id: adAccount.meta_ad_account_id,
                level: level,
                entity_id: entityId,
                date_start: insight.date_start,
                date_stop: insight.date_stop,
                payload: insight,
              });

              // Normaliza e salva na camada DAILY (upsert)
              const dailyInsight = {
                workspace_id: workspace.id,
                client_id: client_id || null,
                meta_ad_account_id: adAccount.id,
                level: level,
                entity_id: entityId,
                entity_name: entityName,
                date: insight.date_start,
                spend: parseFloat(insight.spend || "0"),
                impressions: parseInt(insight.impressions || "0", 10),
                reach: parseInt(insight.reach || "0", 10),
                clicks: parseInt(insight.clicks || "0", 10),
                ctr: parseFloat(insight.ctr || "0"),
                cpc: parseFloat(insight.cpc || "0"),
                cpm: parseFloat(insight.cpm || "0"),
                frequency: parseFloat(insight.frequency || "0"),
                unique_clicks: parseInt(insight.unique_clicks || "0", 10),
                actions_json: insight.actions || {},
                action_values_json: insight.action_values || {},
                leads: leads,
                conversions: conversions,
                conversion_value: conversionValue,
                purchase_value: purchaseValue,
              };

              await supabaseAdmin
                .from("meta_insights_daily")
                .upsert(dailyInsight, {
                  onConflict: "workspace_id,meta_ad_account_id,level,entity_id,date",
                });

              totalRows++;
            }
          } catch (levelError) {
            const errorMsg = `Level ${level} error: ${levelError instanceof Error ? levelError.message : "Unknown"}`;
            syncResult.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

        // Atualiza job como sucesso
        if (syncJob) {
          // Calcula duracao da sincronizacao em segundos
          const syncEndTime = new Date();
          const durationSeconds = Math.floor((syncEndTime.getTime() - syncStartTime.getTime()) / 1000);

          await supabaseAdmin
            .from("meta_sync_jobs")
            .update({
              status: syncResult.errors.length > 0 ? "failed" : "completed",
              fetched_rows: totalRows,
              total_records_synced: totalRows,
              duration_seconds: durationSeconds,
              error_message: syncResult.errors.join("; ") || null,
              ended_at: syncEndTime.toISOString(),
            })
            .eq("id", syncJob.id);
        }

        // Atualiza sync state
        await supabaseAdmin
          .from("meta_sync_state")
          .upsert(
            {
              workspace_id: workspace.id,
              client_id: client_id || null,
              meta_ad_account_id: adAccount.meta_ad_account_id,
              last_daily_date_synced: mode === "daily" ? dateTo : undefined,
              last_intraday_synced_at: mode === "intraday" ? new Date().toISOString() : undefined,
              last_success_at: new Date().toISOString(),
              last_error: syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,meta_ad_account_id" }
          );

        syncResult.accounts_synced++;
        syncResult.insights_synced += totalRows;
      } catch (accountError) {
        const errorMsg = `Account ${adAccount.meta_ad_account_id} error: ${accountError instanceof Error ? accountError.message : "Unknown"}`;
        syncResult.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return new Response(
      JSON.stringify(syncResult),
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
