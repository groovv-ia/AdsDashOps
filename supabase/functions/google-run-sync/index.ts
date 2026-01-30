/**
 * Edge Function: google-run-sync
 *
 * Executa sincronizacao de dados do Google Ads usando a API real.
 * Busca campanhas, ad groups, anuncios, keywords e metricas diarias.
 *
 * Fases da sincronizacao:
 * 1. Criar job de sincronizacao
 * 2. Buscar campanhas da API
 * 3. Buscar ad groups da API
 * 4. Buscar anuncios da API
 * 5. Buscar keywords da API
 * 6. Buscar metricas diarias da API
 * 7. Salvar tudo no banco
 * 8. Atualizar job como concluido
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fetchCampaigns,
  fetchAdGroups,
  fetchAds,
  fetchKeywords,
  fetchCampaignMetrics,
  fetchAdGroupMetrics,
  fetchAdMetrics,
  fetchKeywordMetrics,
  isTokenExpired,
  refreshGoogleAccessToken,
  formatCustomerId,
  microsToDecimal,
} from "../_shared/google-ads-api.ts";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para payload de entrada
interface SyncPayload {
  account_ids?: string[];
  date_from: string;
  date_to: string;
  sync_type?: "full" | "incremental";
}

// Interface para conexao Google
interface GoogleConnection {
  id: string;
  workspace_id: string;
  developer_token: string;
  customer_id: string;
  login_customer_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
}

// Interface para conta Google
interface GoogleAdAccount {
  id: string;
  workspace_id: string;
  customer_id: string;
  name: string;
  is_manager: boolean;
}

// Delay entre operacoes para evitar rate limiting
const OPERATION_DELAY_MS = 100;

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handler principal
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica autenticacao
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

    // Credenciais OAuth do Google
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    // Verifica usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-run-sync] User authenticated: ${user.email}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: SyncPayload = await req.json();
    const {
      account_ids,
      date_from,
      date_to,
      sync_type = "full",
    } = body;

    if (!date_from || !date_to) {
      return new Response(
        JSON.stringify({ error: "Missing date_from or date_to" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 1. BUSCAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string | null = null;

    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Workspace not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 2. VERIFICAR CONEXAO GOOGLE E TOKENS
    // =====================================================
    const { data: connection } = await supabaseAdmin
      .from("google_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle() as { data: GoogleConnection | null };

    if (!connection || connection.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Google Ads not connected or inactive" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se tem tokens OAuth
    if (!connection.access_token || !connection.refresh_token) {
      return new Response(
        JSON.stringify({
          error: "OAuth tokens not configured. Please reconnect Google Ads.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica e renova token se necessario
    let accessToken = connection.access_token;
    const tokenExpiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;

    if (isTokenExpired(tokenExpiresAt) && googleClientId && googleClientSecret) {
      console.log("[google-run-sync] Token expired, refreshing...");

      const refreshResult = await refreshGoogleAccessToken(
        connection.refresh_token,
        googleClientId,
        googleClientSecret
      );

      if (refreshResult) {
        accessToken = refreshResult.accessToken;

        // Atualiza token no banco
        await supabaseAdmin
          .from("google_connections")
          .update({
            access_token: refreshResult.accessToken,
            token_expires_at: refreshResult.expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        console.log("[google-run-sync] Token refreshed successfully");
      } else {
        return new Response(
          JSON.stringify({
            error: "Failed to refresh OAuth token. Please reconnect.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const developerToken = connection.developer_token;
    const loginCustomerId = connection.login_customer_id || connection.customer_id;

    // =====================================================
    // 3. BUSCAR CONTAS PARA SINCRONIZAR
    // =====================================================
    let accountsQuery = supabaseAdmin
      .from("google_ad_accounts")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (account_ids && account_ids.length > 0) {
      accountsQuery = accountsQuery.in("id", account_ids);
    } else {
      accountsQuery = accountsQuery.eq("is_selected", true);
    }

    const { data: accounts } = await accountsQuery as {
      data: GoogleAdAccount[] | null;
    };

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No accounts selected for sync" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[google-run-sync] Syncing ${accounts.length} accounts from ${date_from} to ${date_to}`
    );

    // =====================================================
    // 4. CRIAR JOB DE SINCRONIZACAO
    // =====================================================
    const { data: job, error: jobError } = await supabaseAdmin
      .from("google_sync_jobs")
      .insert({
        workspace_id: workspaceId,
        status: "running",
        started_at: new Date().toISOString(),
        progress: 0,
        current_phase: "Iniciando sincronizacao",
        items_processed: 0,
        items_total: accounts.length,
        sync_type,
        date_range_start: date_from,
        date_range_end: date_to,
        campaigns_synced: 0,
        ad_groups_synced: 0,
        ads_synced: 0,
        metrics_synced: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("[google-run-sync] Error creating job:", jobError);
      return new Response(
        JSON.stringify({
          error: "Failed to create sync job",
          details: jobError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const jobId = job.id;
    console.log(`[google-run-sync] Created job: ${jobId}`);

    // =====================================================
    // 5. PROCESSAR CADA CONTA
    // =====================================================
    let totalCampaigns = 0;
    let totalAdGroups = 0;
    let totalAds = 0;
    let totalKeywords = 0;
    let totalMetrics = 0;
    const errors: string[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const progress = Math.round(((i + 1) / accounts.length) * 100);

      console.log(
        `[google-run-sync] Processing account ${i + 1}/${accounts.length}: ${account.name}`
      );

      // Atualiza progresso
      await supabaseAdmin
        .from("google_sync_jobs")
        .update({
          progress,
          current_phase: `Sincronizando: ${account.name}`,
          items_processed: i,
        })
        .eq("id", jobId);

      try {
        // Pula contas MCC (elas nao tem dados diretos)
        if (account.is_manager) {
          console.log(`[google-run-sync] Skipping MCC account: ${account.name}`);
          continue;
        }

        const customerId = account.customer_id;

        // =====================================================
        // 5.1. BUSCAR CAMPANHAS DA API
        // =====================================================
        console.log(`[google-run-sync] Fetching campaigns for ${formatCustomerId(customerId)}...`);

        const campaignsResult = await fetchCampaigns(
          accessToken,
          developerToken,
          customerId,
          loginCustomerId
        );

        if (campaignsResult.error) {
          console.error(
            `[google-run-sync] Error fetching campaigns: ${campaignsResult.error}`
          );
          errors.push(`${account.name}: ${campaignsResult.error}`);
          continue;
        }

        const campaigns = campaignsResult.data || [];
        console.log(`[google-run-sync] Found ${campaigns.length} campaigns`);

        // Salvar campanhas
        for (const campaign of campaigns) {
          await supabaseAdmin.from("google_campaigns").upsert(
            {
              workspace_id: workspaceId,
              account_id: account.id,
              customer_id: customerId,
              campaign_id: campaign.campaignId,
              name: campaign.name,
              status: campaign.status,
              advertising_channel_type: campaign.advertisingChannelType,
              bidding_strategy_type: campaign.biddingStrategyType,
              budget_amount_micros: campaign.budgetAmountMicros,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,customer_id,campaign_id" }
          );
          totalCampaigns++;
        }

        await delay(OPERATION_DELAY_MS);

        // =====================================================
        // 5.2. BUSCAR AD GROUPS, ADS E KEYWORDS POR CAMPANHA
        // =====================================================
        for (const campaign of campaigns) {
          // Buscar Ad Groups
          const adGroupsResult = await fetchAdGroups(
            accessToken,
            developerToken,
            customerId,
            campaign.campaignId,
            loginCustomerId
          );

          const adGroups = adGroupsResult.data || [];

          for (const adGroup of adGroups) {
            await supabaseAdmin.from("google_ad_groups").upsert(
              {
                workspace_id: workspaceId,
                account_id: account.id,
                customer_id: customerId,
                campaign_id: campaign.campaignId,
                ad_group_id: adGroup.adGroupId,
                name: adGroup.name,
                status: adGroup.status,
                type: adGroup.type,
                cpc_bid_micros: adGroup.cpcBidMicros,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id,customer_id,ad_group_id" }
            );
            totalAdGroups++;

            // Buscar Ads do Ad Group
            const adsResult = await fetchAds(
              accessToken,
              developerToken,
              customerId,
              adGroup.adGroupId,
              loginCustomerId
            );

            for (const ad of adsResult.data || []) {
              await supabaseAdmin.from("google_ads").upsert(
                {
                  workspace_id: workspaceId,
                  account_id: account.id,
                  customer_id: customerId,
                  campaign_id: campaign.campaignId,
                  ad_group_id: adGroup.adGroupId,
                  ad_id: ad.adId,
                  name: ad.name,
                  status: ad.status,
                  type: ad.type,
                  final_urls: ad.finalUrls,
                  headlines: ad.headlines,
                  descriptions: ad.descriptions,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,customer_id,ad_id" }
              );
              totalAds++;
            }

            // Buscar Keywords do Ad Group
            const keywordsResult = await fetchKeywords(
              accessToken,
              developerToken,
              customerId,
              adGroup.adGroupId,
              loginCustomerId
            );

            for (const keyword of keywordsResult.data || []) {
              await supabaseAdmin.from("google_keywords").upsert(
                {
                  workspace_id: workspaceId,
                  account_id: account.id,
                  customer_id: customerId,
                  campaign_id: campaign.campaignId,
                  ad_group_id: adGroup.adGroupId,
                  keyword_id: keyword.keywordId,
                  text: keyword.text,
                  match_type: keyword.matchType,
                  status: keyword.status,
                  quality_score: keyword.qualityScore,
                  cpc_bid_micros: keyword.cpcBidMicros,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,customer_id,keyword_id" }
              );
              totalKeywords++;
            }

            await delay(OPERATION_DELAY_MS);
          }
        }

        // =====================================================
        // 5.3. BUSCAR E SALVAR METRICAS DIARIAS
        // =====================================================
        console.log(`[google-run-sync] Fetching metrics for ${formatCustomerId(customerId)}...`);

        // Deleta metricas existentes do periodo
        await supabaseAdmin
          .from("google_insights_daily")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("customer_id", customerId)
          .gte("date", date_from)
          .lte("date", date_to);

        // Funcao para criar registro de metrica
        const createMetricRecord = (metric: {
          date: string;
          campaignId: string;
          campaignName: string;
          adGroupId?: string | null;
          adGroupName?: string | null;
          adId?: string | null;
          adName?: string | null;
          keywordId?: string | null;
          keywordText?: string | null;
          impressions: number;
          clicks: number;
          costMicros: number;
          conversions: number;
          conversionsValue: number;
        }) => {
          const cost = microsToDecimal(metric.costMicros);
          const ctr = metric.impressions > 0
            ? (metric.clicks / metric.impressions) * 100
            : 0;
          const cpc = metric.clicks > 0 ? cost / metric.clicks : 0;
          const cpm = metric.impressions > 0 ? (cost / metric.impressions) * 1000 : 0;
          const roas = cost > 0 ? metric.conversionsValue / cost : 0;

          return {
            workspace_id: workspaceId,
            account_id: account.id,
            customer_id: customerId,
            campaign_id: metric.campaignId,
            campaign_name: metric.campaignName,
            ad_group_id: metric.adGroupId || null,
            ad_group_name: metric.adGroupName || null,
            ad_id: metric.adId || null,
            ad_name: metric.adName || null,
            keyword_id: metric.keywordId || null,
            keyword_text: metric.keywordText || null,
            date: metric.date,
            impressions: metric.impressions,
            clicks: metric.clicks,
            cost,
            conversions: metric.conversions,
            conversion_value: metric.conversionsValue,
            ctr,
            cpc,
            cpm,
            roas,
          };
        };

        // Buscar metricas no nivel de campanha
        const campaignMetricsResult = await fetchCampaignMetrics(
          accessToken,
          developerToken,
          customerId,
          date_from,
          date_to,
          loginCustomerId
        );

        const allMetrics: ReturnType<typeof createMetricRecord>[] = [];

        if (campaignMetricsResult.data) {
          for (const m of campaignMetricsResult.data) {
            allMetrics.push(createMetricRecord(m));
          }
        }

        // Buscar metricas no nivel de ad group
        const adGroupMetricsResult = await fetchAdGroupMetrics(
          accessToken,
          developerToken,
          customerId,
          date_from,
          date_to,
          loginCustomerId
        );

        if (adGroupMetricsResult.data) {
          for (const m of adGroupMetricsResult.data) {
            allMetrics.push(createMetricRecord({
              ...m,
              adId: null,
              adName: null,
              keywordId: null,
              keywordText: null,
            }));
          }
        }

        // Buscar metricas no nivel de anuncio
        const adMetricsResult = await fetchAdMetrics(
          accessToken,
          developerToken,
          customerId,
          date_from,
          date_to,
          loginCustomerId
        );

        if (adMetricsResult.data) {
          for (const m of adMetricsResult.data) {
            allMetrics.push(createMetricRecord({
              ...m,
              keywordId: null,
              keywordText: null,
            }));
          }
        }

        // Buscar metricas no nivel de keyword
        const keywordMetricsResult = await fetchKeywordMetrics(
          accessToken,
          developerToken,
          customerId,
          date_from,
          date_to,
          loginCustomerId
        );

        if (keywordMetricsResult.data) {
          for (const m of keywordMetricsResult.data) {
            allMetrics.push(createMetricRecord({
              ...m,
              adId: null,
              adName: null,
            }));
          }
        }

        // Insert em batch
        const BATCH_SIZE = 100;
        for (let b = 0; b < allMetrics.length; b += BATCH_SIZE) {
          const batch = allMetrics.slice(b, b + BATCH_SIZE);
          const { error: insertError } = await supabaseAdmin
            .from("google_insights_daily")
            .insert(batch);

          if (insertError) {
            console.error(
              `[google-run-sync] Error inserting metrics batch: ${insertError.message}`
            );
          } else {
            totalMetrics += batch.length;
          }
        }

        console.log(
          `[google-run-sync] Inserted ${allMetrics.length} metrics for ${account.name}`
        );

        // Atualiza last_sync_at da conta
        await supabaseAdmin
          .from("google_ad_accounts")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", account.id);

      } catch (accountError) {
        const errorMsg =
          accountError instanceof Error
            ? accountError.message
            : "Unknown error";
        errors.push(`${account.name}: ${errorMsg}`);
        console.error(
          `[google-run-sync] Error processing account ${account.name}:`,
          accountError
        );
      }
    }

    // =====================================================
    // 6. FINALIZAR JOB
    // =====================================================
    const finalStatus = errors.length > 0 ? "completed" : "completed";
    await supabaseAdmin
      .from("google_sync_jobs")
      .update({
        status: finalStatus,
        progress: 100,
        current_phase: "Sincronizacao concluida",
        completed_at: new Date().toISOString(),
        items_processed: accounts.length,
        campaigns_synced: totalCampaigns,
        ad_groups_synced: totalAdGroups,
        ads_synced: totalAds,
        metrics_synced: totalMetrics,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", jobId);

    console.log(
      `[google-run-sync] Sync completed: ${totalCampaigns} campaigns, ${totalAdGroups} ad groups, ${totalAds} ads, ${totalKeywords} keywords, ${totalMetrics} metrics`
    );

    // =====================================================
    // 7. RETORNAR RESULTADO
    // =====================================================
    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        job_id: jobId,
        accounts_synced: accounts.length,
        campaigns_synced: totalCampaigns,
        ad_groups_synced: totalAdGroups,
        ads_synced: totalAds,
        keywords_synced: totalKeywords,
        metrics_synced: totalMetrics,
        date_range_start: date_from,
        date_range_end: date_to,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[google-run-sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
