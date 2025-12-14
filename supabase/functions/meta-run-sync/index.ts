/**
 * Edge Function: meta-run-sync
 * 
 * Executa sincronizacao de dados do Meta Ads.
 * Busca insights de campaigns, adsets e ads e salva no Supabase.
 * Opcionalmente busca criativos (imagens/videos) dos anuncios.
 * 
 * POST /functions/v1/meta-run-sync
 * Body: { 
 *   mode: 'daily' | 'intraday' | 'backfill',
 *   client_id?: string,
 *   meta_ad_account_id?: string,
 *   days_back?: number,
 *   levels?: string[] (default: ['campaign', 'adset', 'ad']),
 *   sync_creatives?: boolean (default: false)
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
  sync_creatives?: boolean;
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
      levels = ["campaign", "adset", "ad"],
      sync_creatives = false
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
      creatives_synced: 0,
      errors: [] as string[],
    };

    // Coleta IDs de ads para buscar criativos depois
    const allAdIds: { adId: string; metaAdAccountId: string }[] = [];

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
                // Coleta ad_id para buscar criativos depois
                if (entityId && sync_creatives) {
                  const alreadyCollected = allAdIds.some(a => a.adId === entityId);
                  if (!alreadyCollected) {
                    allAdIds.push({ adId: entityId, metaAdAccountId: adAccount.meta_ad_account_id });
                  }
                }
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

    // Fase 2: Busca criativos se solicitado
    if (sync_creatives && allAdIds.length > 0) {
      console.log(`Iniciando busca de criativos para ${allAdIds.length} ads...`);

      // Cache local para conversao de image_hash
      const imageHashCache = new Map<string, string>();

      // Funcao para converter image_hash em URL
      async function convertImageHashToUrl(imageHash: string, adAccountId: string): Promise<string | null> {
        if (imageHashCache.has(imageHash)) {
          return imageHashCache.get(imageHash) || null;
        }
        try {
          const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
          const url = `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=${imageHash}&fields=url,url_128&access_token=${accessToken}`;
          const resp = await fetch(url);
          const data = await resp.json();
          if (data.data?.[0]) {
            const imgUrl = data.data[0].url || data.data[0].url_128;
            if (imgUrl) {
              imageHashCache.set(imageHash, imgUrl);
              return imgUrl;
            }
          }
        } catch (err) {
          console.error(`Erro ao converter image_hash ${imageHash}:`, err);
        }
        return null;
      }

      // Funcao para buscar thumbnail de video
      async function fetchVideoThumbnail(videoId: string): Promise<string | null> {
        try {
          const resp = await fetch(`https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture&access_token=${accessToken}`);
          const data = await resp.json();
          if (data.thumbnails?.data?.length > 0) {
            const sorted = data.thumbnails.data.sort((a: { width: number }, b: { width: number }) => b.width - a.width);
            return sorted[0].uri;
          }
          if (data.picture) return data.picture;
        } catch (err) {
          console.error(`Erro ao buscar thumbnail do video ${videoId}:`, err);
        }
        return null;
      }

      // Funcao para extrair URL de imagem de todas as fontes
      async function extractImageUrl(creative: Record<string, unknown>, adAccountId: string): Promise<string | null> {
        // URLs diretas
        if (creative.image_url) return creative.image_url as string;
        if (creative.thumbnail_url) return creative.thumbnail_url as string;

        const objStorySpec = creative.object_story_spec as Record<string, unknown> | undefined;
        const linkData = objStorySpec?.link_data as Record<string, unknown> | undefined;
        const videoData = objStorySpec?.video_data as Record<string, unknown> | undefined;
        const photoData = objStorySpec?.photo_data as Record<string, unknown> | undefined;
        const assetFeed = creative.asset_feed_spec as Record<string, unknown> | undefined;

        if (linkData?.picture) return linkData.picture as string;
        if (videoData?.image_url) return videoData.image_url as string;
        if (photoData?.url) return photoData.url as string;

        // Child attachments (carrossel)
        const childAttachments = linkData?.child_attachments as Array<Record<string, unknown>> | undefined;
        if (childAttachments?.length) {
          const first = childAttachments[0];
          if (first.picture) return first.picture as string;
          if (first.image_hash) {
            const url = await convertImageHashToUrl(first.image_hash as string, adAccountId);
            if (url) return url;
          }
        }

        // Asset feed spec (dinamico)
        const assetImages = assetFeed?.images as Array<Record<string, unknown>> | undefined;
        if (assetImages?.length) {
          const first = assetImages[0];
          if (first.url) return first.url as string;
          if (first.hash) {
            const url = await convertImageHashToUrl(first.hash as string, adAccountId);
            if (url) return url;
          }
        }

        // Converte image_hash de varias fontes
        const hashesToTry = [
          creative.image_hash,
          linkData?.image_hash,
          videoData?.image_hash,
          photoData?.image_hash,
        ].filter(Boolean) as string[];

        for (const hash of hashesToTry) {
          const url = await convertImageHashToUrl(hash, adAccountId);
          if (url) return url;
        }

        // Busca thumbnail de video
        const videoId = (creative.video_id || videoData?.video_id) as string | undefined;
        if (videoId) {
          const thumb = await fetchVideoThumbnail(videoId);
          if (thumb) return thumb;
        }

        return null;
      }

      // Funcao para determinar tipo do criativo
      function determineCreativeType(creative: Record<string, unknown>): string {
        const objStorySpec = creative.object_story_spec as Record<string, unknown> | undefined;
        const videoData = objStorySpec?.video_data as Record<string, unknown> | undefined;
        const linkData = objStorySpec?.link_data as Record<string, unknown> | undefined;
        const assetFeed = creative.asset_feed_spec as Record<string, unknown> | undefined;

        if (creative.video_id || videoData?.video_id) return "video";
        const childAttachments = linkData?.child_attachments as Array<unknown> | undefined;
        if (childAttachments && childAttachments.length > 1) return "carousel";
        const assetImages = assetFeed?.images as Array<unknown> | undefined;
        const assetVideos = assetFeed?.videos as Array<unknown> | undefined;
        if (assetFeed && (assetImages?.length || assetVideos?.length)) {
          if (assetVideos?.length) return "video";
          return "dynamic";
        }
        if (creative.image_url || creative.image_hash || linkData?.picture || linkData?.image_hash) return "image";
        return "unknown";
      }

      // Campos expandidos para cobrir todos os tipos de criativos
      const adFields = [
        "id", "name", "status", "preview_shareable_link",
        "creative{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,call_to_action_type,",
        "object_story_spec,effective_object_story_id,effective_instagram_media_id,asset_feed_spec}",
        "adcreatives{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,object_story_spec,asset_feed_spec}"
      ].join("");

      // Agrupa ads por ad account para processar em lotes
      const adsByAccount = new Map<string, string[]>();
      for (const { adId, metaAdAccountId } of allAdIds) {
        const list = adsByAccount.get(metaAdAccountId) || [];
        list.push(adId);
        adsByAccount.set(metaAdAccountId, list);
      }

      // Processa cada ad account
      for (const [accountMetaId, adIds] of adsByAccount) {
        try {
          // Processa em lotes de 50 (limite do batch da Meta)
          for (let i = 0; i < adIds.length; i += 50) {
            const batch = adIds.slice(i, i + 50);

            // Cria batch requests
            const batchRequests = batch.map(adId => ({
              method: "GET",
              relative_url: `${adId}?fields=${encodeURIComponent(adFields)}`,
            }));

            const batchBody = new URLSearchParams({
              access_token: accessToken,
              batch: JSON.stringify(batchRequests),
            });

            const batchResponse = await fetch("https://graph.facebook.com/v21.0/", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: batchBody,
            });

            const batchResults = await batchResponse.json();

            // Processa cada resultado do batch
            for (let j = 0; j < batchResults.length; j++) {
              const result = batchResults[j];
              const adId = batch[j];

              if (result.code !== 200) {
                console.error(`Erro ao buscar criativo do ad ${adId}: HTTP ${result.code}`);
                continue;
              }

              try {
                const adData = JSON.parse(result.body);
                if (adData.error) {
                  console.error(`Erro da Meta para ad ${adId}:`, adData.error);
                  continue;
                }

                // Tenta pegar criativo de varias fontes
                let creative = adData.creative || {};
                if (!creative.id && adData.adcreatives?.data?.[0]) {
                  creative = adData.adcreatives.data[0];
                }

                const linkData = creative.object_story_spec?.link_data || {};
                const videoData = creative.object_story_spec?.video_data || {};
                const assetFeed = creative.asset_feed_spec || {};

                // Determina tipo do criativo
                const creativeType = determineCreativeType(creative);
                console.log(`[Ad ${adId}] Tipo do criativo determinado: ${creativeType}`);

                // Extrai URL da imagem
                const imageUrl = await extractImageUrl(creative, accountMetaId);
                console.log(`[Ad ${adId}] Image URL extraida: ${imageUrl ? 'Sim' : 'Nao'}`);

                // Video ID e URL
                const videoId = creative.video_id || videoData.video_id || assetFeed.videos?.[0]?.video_id || null;
                const videoUrl = videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null;

                // Para videos, busca thumbnail se nao tiver imagem
                let thumbnailUrl = imageUrl;
                if (creativeType === "video" && videoId && !thumbnailUrl) {
                  thumbnailUrl = await fetchVideoThumbnail(videoId);
                  console.log(`[Ad ${adId}] Thumbnail de video buscado: ${thumbnailUrl ? 'Sim' : 'Nao'}`);
                }

                // Monta registro do criativo
                const creativeRecord = {
                  workspace_id: workspace.id,
                  ad_id: adId,
                  meta_ad_account_id: accountMetaId,
                  meta_creative_id: creative.id || null,
                  creative_type: creativeType,
                  image_url: imageUrl,
                  thumbnail_url: thumbnailUrl,
                  video_url: videoUrl,
                  video_id: videoId,
                  preview_url: adData.preview_shareable_link || null,
                  title: creative.title || linkData.name || videoData.title || assetFeed.titles?.[0]?.text || null,
                  body: creative.body || linkData.message || videoData.message || assetFeed.bodies?.[0]?.text || null,
                  description: linkData.description || videoData.link_description || null,
                  call_to_action: creative.call_to_action_type || linkData.call_to_action?.type || videoData.call_to_action?.type || null,
                  link_url: linkData.link || videoData.call_to_action?.value?.link || null,
                  extra_data: {
                    ad_name: adData.name,
                    ad_status: adData.status,
                    raw_creative: creative,
                    has_carousel: (linkData.child_attachments?.length || 0) > 1,
                    carousel_count: linkData.child_attachments?.length || 0,
                  },
                  fetched_at: new Date().toISOString(),
                };

                // Upsert no banco
                const { error: upsertError } = await supabaseAdmin
                  .from("meta_ad_creatives")
                  .upsert(creativeRecord, {
                    onConflict: "workspace_id,ad_id",
                  });

                if (upsertError) {
                  console.error(`[Ad ${adId}] ERRO ao salvar criativo:`, {
                    message: upsertError.message,
                    code: upsertError.code,
                    details: upsertError.details,
                    hint: upsertError.hint,
                    creative_type: creativeType,
                  });
                } else {
                  console.log(`[Ad ${adId}] Criativo salvo com sucesso (tipo: ${creativeType})`);

                  syncResult.creatives_synced++;
                }
              } catch (parseErr) {
                console.error(`Erro ao processar criativo do ad ${adId}:`, parseErr);
              }
            }

            // Pequena pausa entre lotes para evitar rate limit
            if (i + 50 < adIds.length) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (accountErr) {
          console.error(`Erro ao processar criativos da conta ${accountMetaId}:`, accountErr);
          syncResult.errors.push(`Creatives error for ${accountMetaId}: ${accountErr instanceof Error ? accountErr.message : "Unknown"}`);
        }
      }

      console.log(`Criativos sincronizados: ${syncResult.creatives_synced}`);
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