/**
 * Edge Function: google-run-sync
 *
 * Executa sincronizacao de dados do Google Ads.
 * Busca campanhas, ad groups, anuncios, keywords e metricas diarias.
 *
 * Fases da sincronizacao:
 * 1. Criar job de sincronizacao
 * 2. Buscar campanhas
 * 3. Buscar ad groups
 * 4. Buscar anuncios
 * 5. Buscar keywords
 * 6. Buscar metricas diarias
 * 7. Salvar tudo no banco
 * 8. Atualizar job como concluido
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Delay entre operacoes para evitar rate limiting
const OPERATION_DELAY_MS = 100;

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, "");
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gera dados simulados de campanhas
 * TODO: Substituir por chamada real a API do Google Ads
 */
function generateCampaigns(
  customerId: string,
  count: number = 3
): Array<{
  campaign_id: string;
  name: string;
  status: string;
  advertising_channel_type: string;
  bidding_strategy_type: string;
  budget_amount_micros: number;
}> {
  const channelTypes = ["SEARCH", "DISPLAY", "VIDEO", "SHOPPING"];
  const biddingStrategies = [
    "MAXIMIZE_CONVERSIONS",
    "TARGET_CPA",
    "TARGET_ROAS",
    "MANUAL_CPC",
  ];

  const campaigns = [];
  for (let i = 1; i <= count; i++) {
    campaigns.push({
      campaign_id: `${customerId}_camp_${i}`,
      name: `Campanha ${i} - ${channelTypes[i % channelTypes.length]}`,
      status: i === 1 ? "ENABLED" : Math.random() > 0.3 ? "ENABLED" : "PAUSED",
      advertising_channel_type: channelTypes[i % channelTypes.length],
      bidding_strategy_type: biddingStrategies[i % biddingStrategies.length],
      budget_amount_micros: Math.floor(Math.random() * 100000000) + 10000000,
    });
  }
  return campaigns;
}

/**
 * Gera dados simulados de ad groups
 */
function generateAdGroups(
  customerId: string,
  campaignId: string,
  count: number = 2
): Array<{
  ad_group_id: string;
  campaign_id: string;
  name: string;
  status: string;
  type: string;
  cpc_bid_micros: number;
}> {
  const adGroups = [];
  for (let i = 1; i <= count; i++) {
    adGroups.push({
      ad_group_id: `${campaignId}_adg_${i}`,
      campaign_id: campaignId,
      name: `Grupo de Anuncios ${i}`,
      status: Math.random() > 0.2 ? "ENABLED" : "PAUSED",
      type: "SEARCH_STANDARD",
      cpc_bid_micros: Math.floor(Math.random() * 5000000) + 500000,
    });
  }
  return adGroups;
}

/**
 * Gera dados simulados de anuncios
 */
function generateAds(
  customerId: string,
  campaignId: string,
  adGroupId: string,
  count: number = 2
): Array<{
  ad_id: string;
  campaign_id: string;
  ad_group_id: string;
  name: string;
  status: string;
  type: string;
  final_urls: string[];
  headlines: string[];
  descriptions: string[];
}> {
  const ads = [];
  for (let i = 1; i <= count; i++) {
    ads.push({
      ad_id: `${adGroupId}_ad_${i}`,
      campaign_id: campaignId,
      ad_group_id: adGroupId,
      name: `Anuncio RSA ${i}`,
      status: Math.random() > 0.2 ? "ENABLED" : "PAUSED",
      type: "RESPONSIVE_SEARCH_AD",
      final_urls: [`https://example.com/landing-${i}`],
      headlines: [
        `Titulo Principal ${i}`,
        `Ofertas Especiais`,
        `Compre Agora`,
      ],
      descriptions: [
        `Descricao do anuncio ${i} com detalhes do produto.`,
        `Aproveite nossas ofertas exclusivas. Frete gratis!`,
      ],
    });
  }
  return ads;
}

/**
 * Gera dados simulados de keywords
 */
function generateKeywords(
  customerId: string,
  campaignId: string,
  adGroupId: string,
  count: number = 5
): Array<{
  keyword_id: string;
  campaign_id: string;
  ad_group_id: string;
  text: string;
  match_type: string;
  status: string;
  quality_score: number;
  cpc_bid_micros: number;
}> {
  const keywordTexts = [
    "comprar produto online",
    "melhor preco",
    "oferta especial",
    "frete gratis",
    "desconto exclusivo",
    "loja online",
    "entrega rapida",
  ];
  const matchTypes = ["EXACT", "PHRASE", "BROAD"];

  const keywords = [];
  for (let i = 1; i <= count; i++) {
    keywords.push({
      keyword_id: `${adGroupId}_kw_${i}`,
      campaign_id: campaignId,
      ad_group_id: adGroupId,
      text: keywordTexts[i % keywordTexts.length],
      match_type: matchTypes[i % matchTypes.length],
      status: Math.random() > 0.1 ? "ENABLED" : "PAUSED",
      quality_score: Math.floor(Math.random() * 5) + 5,
      cpc_bid_micros: Math.floor(Math.random() * 3000000) + 500000,
    });
  }
  return keywords;
}

/**
 * Gera dados simulados de metricas diarias
 */
function generateDailyMetrics(
  customerId: string,
  campaignId: string,
  campaignName: string,
  adGroupId: string | null,
  adGroupName: string | null,
  adId: string | null,
  adName: string | null,
  keywordId: string | null,
  keywordText: string | null,
  dateFrom: string,
  dateTo: string
): Array<{
  date: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string | null;
  ad_group_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  keyword_id: string | null;
  keyword_text: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
}> {
  const metrics = [];
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    // Gera metricas aleatorias mas realistas
    const baseImpressions = Math.floor(Math.random() * 5000) + 500;
    const ctr = Math.random() * 0.08 + 0.02;
    const clicks = Math.floor(baseImpressions * ctr);
    const cpc = Math.random() * 2 + 0.5;
    const cost = clicks * cpc;
    const conversionRate = Math.random() * 0.1 + 0.02;
    const conversions = Math.floor(clicks * conversionRate);
    const avgOrderValue = Math.random() * 150 + 50;
    const conversionValue = conversions * avgOrderValue;

    metrics.push({
      date: dateStr,
      campaign_id: campaignId,
      campaign_name: campaignName,
      ad_group_id: adGroupId,
      ad_group_name: adGroupName,
      ad_id: adId,
      ad_name: adName,
      keyword_id: keywordId,
      keyword_text: keywordText,
      impressions: baseImpressions,
      clicks,
      cost,
      conversions,
      conversion_value: conversionValue,
    });
  }

  return metrics;
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
    // 2. VERIFICAR CONEXAO GOOGLE
    // =====================================================
    const { data: connection } = await supabaseAdmin
      .from("google_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!connection || connection.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Google Ads not connected or inactive" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 3. BUSCAR CONTAS PARA SINCRONIZAR
    // =====================================================
    // Se account_ids foram passados, usa eles diretamente (selecao da UI)
    // Caso contrario, busca contas marcadas como is_selected no banco
    let accountsQuery = supabaseAdmin
      .from("google_ad_accounts")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (account_ids && account_ids.length > 0) {
      // Usa os IDs passados pelo frontend (selecao do usuario na UI)
      accountsQuery = accountsQuery.in("id", account_ids);
    } else {
      // Fallback: busca contas marcadas como is_selected no banco
      accountsQuery = accountsQuery.eq("is_selected", true);
    }

    const { data: accounts } = await accountsQuery;

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
        // =====================================================
        // 5.1. BUSCAR E SALVAR CAMPANHAS
        // =====================================================
        const campaigns = generateCampaigns(account.customer_id, 3);

        for (const campaign of campaigns) {
          await supabaseAdmin.from("google_campaigns").upsert(
            {
              workspace_id: workspaceId,
              account_id: account.id,
              customer_id: account.customer_id,
              campaign_id: campaign.campaign_id,
              name: campaign.name,
              status: campaign.status,
              advertising_channel_type: campaign.advertising_channel_type,
              bidding_strategy_type: campaign.bidding_strategy_type,
              budget_amount_micros: campaign.budget_amount_micros,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,customer_id,campaign_id" }
          );
          totalCampaigns++;
        }

        await delay(OPERATION_DELAY_MS);

        // =====================================================
        // 5.2. BUSCAR E SALVAR AD GROUPS
        // =====================================================
        for (const campaign of campaigns) {
          const adGroups = generateAdGroups(
            account.customer_id,
            campaign.campaign_id,
            2
          );

          for (const adGroup of adGroups) {
            await supabaseAdmin.from("google_ad_groups").upsert(
              {
                workspace_id: workspaceId,
                account_id: account.id,
                customer_id: account.customer_id,
                campaign_id: adGroup.campaign_id,
                ad_group_id: adGroup.ad_group_id,
                name: adGroup.name,
                status: adGroup.status,
                type: adGroup.type,
                cpc_bid_micros: adGroup.cpc_bid_micros,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id,customer_id,ad_group_id" }
            );
            totalAdGroups++;

            // =====================================================
            // 5.3. BUSCAR E SALVAR ADS
            // =====================================================
            const ads = generateAds(
              account.customer_id,
              campaign.campaign_id,
              adGroup.ad_group_id,
              2
            );

            for (const ad of ads) {
              await supabaseAdmin.from("google_ads").upsert(
                {
                  workspace_id: workspaceId,
                  account_id: account.id,
                  customer_id: account.customer_id,
                  campaign_id: ad.campaign_id,
                  ad_group_id: ad.ad_group_id,
                  ad_id: ad.ad_id,
                  name: ad.name,
                  status: ad.status,
                  type: ad.type,
                  final_urls: ad.final_urls,
                  headlines: ad.headlines,
                  descriptions: ad.descriptions,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,customer_id,ad_id" }
              );
              totalAds++;
            }

            // =====================================================
            // 5.4. BUSCAR E SALVAR KEYWORDS
            // =====================================================
            const keywords = generateKeywords(
              account.customer_id,
              campaign.campaign_id,
              adGroup.ad_group_id,
              5
            );

            for (const keyword of keywords) {
              await supabaseAdmin.from("google_keywords").upsert(
                {
                  workspace_id: workspaceId,
                  account_id: account.id,
                  customer_id: account.customer_id,
                  campaign_id: keyword.campaign_id,
                  ad_group_id: keyword.ad_group_id,
                  keyword_id: keyword.keyword_id,
                  text: keyword.text,
                  match_type: keyword.match_type,
                  status: keyword.status,
                  quality_score: keyword.quality_score,
                  cpc_bid_micros: keyword.cpc_bid_micros,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,customer_id,keyword_id" }
              );
              totalKeywords++;
            }

            await delay(OPERATION_DELAY_MS);

            await delay(OPERATION_DELAY_MS);
          }
        }

        // =====================================================
        // 5.5. GERAR E SALVAR METRICAS DIARIAS (por campanha)
        // =====================================================
        // Primeiro, deleta metricas existentes do periodo para esta conta
        await supabaseAdmin
          .from("google_insights_daily")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("customer_id", account.customer_id)
          .gte("date", date_from)
          .lte("date", date_to);

        // Gera e insere metricas para cada campanha
        for (const campaign of campaigns) {
          const campaignMetrics = generateDailyMetrics(
            account.customer_id,
            campaign.campaign_id,
            campaign.name,
            null,
            null,
            null,
            null,
            null,
            null,
            date_from,
            date_to
          );

          // Prepara batch de metricas para insert
          const metricsToInsert = campaignMetrics.map((metric) => {
            const ctr =
              metric.impressions > 0
                ? (metric.clicks / metric.impressions) * 100
                : 0;
            const cpc = metric.clicks > 0 ? metric.cost / metric.clicks : 0;
            const cpm =
              metric.impressions > 0
                ? (metric.cost / metric.impressions) * 1000
                : 0;
            const roas =
              metric.cost > 0 ? metric.conversion_value / metric.cost : 0;

            return {
              workspace_id: workspaceId,
              account_id: account.id,
              customer_id: account.customer_id,
              campaign_id: metric.campaign_id,
              campaign_name: metric.campaign_name,
              ad_group_id: metric.ad_group_id,
              ad_group_name: metric.ad_group_name,
              ad_id: metric.ad_id,
              ad_name: metric.ad_name,
              keyword_id: metric.keyword_id,
              keyword_text: metric.keyword_text,
              date: metric.date,
              impressions: metric.impressions,
              clicks: metric.clicks,
              cost: metric.cost,
              conversions: metric.conversions,
              conversion_value: metric.conversion_value,
              ctr,
              cpc,
              cpm,
              roas,
            };
          });

          // Insert em batch para melhor performance
          const { error: insertError } = await supabaseAdmin
            .from("google_insights_daily")
            .insert(metricsToInsert);

          if (insertError) {
            console.error(
              `[google-run-sync] Error inserting metrics for campaign ${campaign.name}:`,
              insertError
            );
          } else {
            totalMetrics += metricsToInsert.length;
          }
        }

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
