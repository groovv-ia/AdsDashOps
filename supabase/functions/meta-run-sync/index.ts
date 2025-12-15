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
      console.log(`\n========== INICIANDO BUSCA DE CRIATIVOS ==========`);
      console.log(`Total de ads para buscar criativos: ${allAdIds.length}`);

      // Contadores para metricas detalhadas
      const creativeStats = {
        total: allAdIds.length,
        processed: 0,
        withImage: 0,
        withoutImage: 0,
        withError: 0,
        cached: 0,
        byType: {} as Record<string, number>,
        bySource: {} as Record<string, number>,
        failedAdIds: [] as string[],
      };

      // Cache local para conversao de image_hash (evita requisicoes duplicadas)
      const imageHashCache = new Map<string, string>();

      // Funcao para converter image_hash em URL com retry e campos expandidos
      async function convertImageHashToUrl(imageHash: string, adAccountId: string, retries: number = 2): Promise<string | null> {
        // Verifica cache primeiro
        if (imageHashCache.has(imageHash)) {
          return imageHashCache.get(imageHash) || null;
        }

        let lastError: Error | null = null;

        // Tenta converter com retry automatico
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
            // Solicita multiplos campos de URL para aumentar chances de sucesso
            const url = `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=${imageHash}&fields=url,url_128,permalink_url&access_token=${accessToken}`;
            const resp = await fetch(url);
            const data = await resp.json();

            if (data.data && data.data.length > 0) {
              const imageData = data.data[0];
              // Prioriza URL maior (melhor qualidade)
              const imgUrl = imageData.url || imageData.url_128 || imageData.permalink_url;
              if (imgUrl) {
                imageHashCache.set(imageHash, imgUrl);
                console.log(`✓ Image hash ${imageHash} convertido com sucesso (tentativa ${attempt + 1})`);
                return imgUrl;
              }
            }

            // Se chegou aqui sem retornar, nao tem URL disponivel
            return null;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error("Unknown error");
            console.error(`Erro ao converter image_hash ${imageHash} (tentativa ${attempt + 1}/${retries + 1}):`, err);

            // Espera antes de tentar novamente
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            }
          }
        }

        console.error(`✗ Falha ao converter image_hash ${imageHash} apos ${retries + 1} tentativas`);
        return null;
      }

      // Funcao para buscar thumbnail de video com multiplos campos
      async function fetchVideoThumbnail(videoId: string): Promise<string | null> {
        try {
          // Solicita multiplos campos para aumentar chances de obter thumbnail
          const resp = await fetch(`https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture,source&access_token=${accessToken}`);
          const data = await resp.json();

          // Tenta thumbnails primeiro (melhor qualidade)
          if (data.thumbnails?.data && data.thumbnails.data.length > 0) {
            const sorted = data.thumbnails.data.sort((a: { width: number }, b: { width: number }) => b.width - a.width);
            return sorted[0].uri;
          }

          // Fallback para picture
          if (data.picture) {
            return data.picture;
          }
        } catch (err) {
          console.error(`Erro ao buscar thumbnail do video ${videoId}:`, err);
        }
        return null;
      }

      // Funcao para extrair URL de imagem de TODAS as fontes possiveis (alinhada com batch)
      async function extractImageUrl(creative: Record<string, unknown>, adAccountId: string): Promise<{ url: string | null; source: string }> {
        // 1. URL direta do criativo
        if (creative.image_url) {
          return { url: creative.image_url as string, source: 'creative.image_url' };
        }

        if (creative.thumbnail_url) {
          return { url: creative.thumbnail_url as string, source: 'creative.thumbnail_url' };
        }

        const objStorySpec = creative.object_story_spec as Record<string, unknown> | undefined;
        const linkData = objStorySpec?.link_data as Record<string, unknown> | undefined;
        const videoData = objStorySpec?.video_data as Record<string, unknown> | undefined;
        const photoData = objStorySpec?.photo_data as Record<string, unknown> | undefined;
        const templateData = objStorySpec?.template_data as Record<string, unknown> | undefined;
        const assetFeed = creative.asset_feed_spec as Record<string, unknown> | undefined;

        // 2. Picture de link_data
        if (linkData?.picture) {
          return { url: linkData.picture as string, source: 'link_data.picture' };
        }

        // 3. Image URL de video_data
        if (videoData?.image_url) {
          return { url: videoData.image_url as string, source: 'video_data.image_url' };
        }

        // 4. URL de photo_data
        if (photoData?.url) {
          return { url: photoData.url as string, source: 'photo_data.url' };
        }

        // 5. Primeiro item de carrossel (child_attachments de link_data)
        const childAttachments = linkData?.child_attachments as Array<Record<string, unknown>> | undefined;
        if (childAttachments && childAttachments.length > 0) {
          const first = childAttachments[0];
          if (first.picture) {
            return { url: first.picture as string, source: 'link_data.child_attachments[0].picture' };
          }
          if (first.image_hash) {
            const url = await convertImageHashToUrl(first.image_hash as string, adAccountId);
            if (url) return { url, source: 'link_data.child_attachments[0].image_hash' };
          }
        }

        // 6. Template data child attachments (NOVO! - faltava na versao anterior)
        const templateChildAttachments = templateData?.child_attachments as Array<Record<string, unknown>> | undefined;
        if (templateChildAttachments && templateChildAttachments.length > 0) {
          const first = templateChildAttachments[0];
          if (first.picture) {
            return { url: first.picture as string, source: 'template_data.child_attachments[0].picture' };
          }
          if (first.image_hash) {
            const url = await convertImageHashToUrl(first.image_hash as string, adAccountId);
            if (url) return { url, source: 'template_data.child_attachments[0].image_hash' };
          }
        }

        // 7. Asset feed spec images (criativos dinamicos)
        const assetImages = assetFeed?.images as Array<Record<string, unknown>> | undefined;
        if (assetImages && assetImages.length > 0) {
          const first = assetImages[0];
          if (first.url) {
            return { url: first.url as string, source: 'asset_feed_spec.images[0].url' };
          }
          if (first.hash) {
            const url = await convertImageHashToUrl(first.hash as string, adAccountId);
            if (url) return { url, source: 'asset_feed_spec.images[0].hash' };
          }
        }

        // 8. Asset feed spec videos thumbnail
        const assetVideos = assetFeed?.videos as Array<Record<string, unknown>> | undefined;
        if (assetVideos && assetVideos.length > 0) {
          const firstVideo = assetVideos[0];
          if (firstVideo.thumbnail_url) {
            return { url: firstVideo.thumbnail_url as string, source: 'asset_feed_spec.videos[0].thumbnail_url' };
          }
          if (firstVideo.video_id) {
            const thumb = await fetchVideoThumbnail(firstVideo.video_id as string);
            if (thumb) return { url: thumb, source: 'asset_feed_spec.videos[0].video_id thumbnail' };
          }
        }

        // 9. Converte image_hash de varias fontes
        const hashesToTry: Array<{ hash: string; source: string }> = [];

        if (creative.image_hash) hashesToTry.push({ hash: creative.image_hash as string, source: 'creative.image_hash' });
        if (linkData?.image_hash) hashesToTry.push({ hash: linkData.image_hash as string, source: 'link_data.image_hash' });
        if (videoData?.image_hash) hashesToTry.push({ hash: videoData.image_hash as string, source: 'video_data.image_hash' });
        if (photoData?.image_hash) hashesToTry.push({ hash: photoData.image_hash as string, source: 'photo_data.image_hash' });

        for (const { hash, source } of hashesToTry) {
          const url = await convertImageHashToUrl(hash, adAccountId);
          if (url) return { url, source };
        }

        // 10. Busca thumbnail de video se houver video_id
        const videoId = (creative.video_id || videoData?.video_id) as string | undefined;
        if (videoId) {
          const thumb = await fetchVideoThumbnail(videoId);
          if (thumb) return { url: thumb, source: 'video_id thumbnail' };
        }

        return { url: null, source: 'nenhuma fonte encontrou imagem' };
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

      // Campos expandidos para cobrir TODOS os tipos de criativos e referencias indiretas
      const adFields = [
        "id", "name", "status", "preview_shareable_link",
        "creative{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,call_to_action_type,",
        "object_story_spec,effective_object_story_id,effective_instagram_media_id,",
        "source_instagram_media_id,object_id,asset_feed_spec}",
        "adcreatives{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,",
        "object_story_spec,effective_object_story_id,effective_instagram_media_id,",
        "source_instagram_media_id,object_id,asset_feed_spec}"
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

              console.log(`\n--- Processando Ad ${adId} ---`);
              creativeStats.processed++;

              if (result.code !== 200) {
                const errorMsg = `HTTP ${result.code}`;
                console.error(`✗ Erro ao buscar criativo: ${errorMsg}`);
                creativeStats.withError++;
                creativeStats.failedAdIds.push(adId);
                continue;
              }

              try {
                const adData = JSON.parse(result.body);
                if (adData.error) {
                  console.error(`✗ Erro da Meta:`, adData.error);
                  creativeStats.withError++;
                  creativeStats.failedAdIds.push(adId);
                  continue;
                }

                // Captura status do ad (ACTIVE, PAUSED, etc.)
                const adStatus = adData.status || "UNKNOWN";
                console.log(`Status do ad: ${adStatus}`);

                // Tenta pegar criativo de varias fontes
                let creative = adData.creative || {};
                if (!creative.id && adData.adcreatives?.data?.[0]) {
                  creative = adData.adcreatives.data[0];
                  console.log(`Criativo encontrado via adcreatives fallback`);
                }

                if (!creative.id) {
                  console.log(`⚠ Ad sem criativo detectado - salvando com preview_url apenas`);
                }

                const linkData = creative.object_story_spec?.link_data || {};
                const videoData = creative.object_story_spec?.video_data || {};
                const assetFeed = creative.asset_feed_spec || {};

                // Determina tipo do criativo
                const creativeType = determineCreativeType(creative);
                console.log(`Tipo detectado: ${creativeType}`);
                creativeStats.byType[creativeType] = (creativeStats.byType[creativeType] || 0) + 1;

                // Extrai URL da imagem (agora retorna objeto com url e source)
                const imageResult = await extractImageUrl(creative, accountMetaId);
                const imageUrl = imageResult.url;
                const imageSource = imageResult.source;

                if (imageUrl) {
                  console.log(`✓ Imagem encontrada! Fonte: ${imageSource}`);
                  creativeStats.withImage++;
                  creativeStats.bySource[imageSource] = (creativeStats.bySource[imageSource] || 0) + 1;
                } else {
                  console.log(`✗ Nenhuma imagem encontrada. Motivo: ${imageSource}`);
                  creativeStats.withoutImage++;
                  creativeStats.failedAdIds.push(adId);
                }

                // Video ID e URL
                const videoId = creative.video_id || videoData.video_id || assetFeed.videos?.[0]?.video_id || null;
                const videoUrl = videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null;

                if (videoId) {
                  console.log(`Video ID detectado: ${videoId}`);
                }

                // Para videos, busca thumbnail se nao tiver imagem
                let thumbnailUrl = imageUrl;
                if (creativeType === "video" && videoId && !thumbnailUrl) {
                  console.log(`Buscando thumbnail do video...`);
                  thumbnailUrl = await fetchVideoThumbnail(videoId);
                  if (thumbnailUrl) {
                    console.log(`✓ Thumbnail de video encontrado`);
                    creativeStats.withImage++;
                  } else {
                    console.log(`✗ Falha ao buscar thumbnail do video`);
                  }
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
                    ad_status: adStatus,
                    image_source: imageSource,
                    raw_creative: creative,
                    has_carousel: (linkData.child_attachments?.length || 0) > 1,
                    carousel_count: linkData.child_attachments?.length || 0,
                  },
                  fetched_at: new Date().toISOString(),
                };

                // Upsert no banco (salva mesmo se nao tiver imagem)
                const { error: upsertError } = await supabaseAdmin
                  .from("meta_ad_creatives")
                  .upsert(creativeRecord, {
                    onConflict: "workspace_id,ad_id",
                  });

                if (upsertError) {
                  console.error(`✗ ERRO ao salvar:`, {
                    message: upsertError.message,
                    code: upsertError.code,
                    details: upsertError.details,
                    hint: upsertError.hint,
                  });
                  creativeStats.withError++;
                } else {
                  console.log(`✓ Criativo salvo com sucesso no banco`);
                  syncResult.creatives_synced++;
                }
              } catch (parseErr) {
                console.error(`✗ Erro ao processar criativo:`, parseErr);
                creativeStats.withError++;
                creativeStats.failedAdIds.push(adId);
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

      // Imprime resumo final das estatisticas
      console.log(`\n========== RESUMO DA BUSCA DE CRIATIVOS ==========`);
      console.log(`Total de ads processados: ${creativeStats.processed}/${creativeStats.total}`);
      console.log(`Com imagem: ${creativeStats.withImage} (${Math.round(creativeStats.withImage / creativeStats.processed * 100)}%)`);
      console.log(`Sem imagem: ${creativeStats.withoutImage} (${Math.round(creativeStats.withoutImage / creativeStats.processed * 100)}%)`);
      console.log(`Com erro: ${creativeStats.withError}`);
      console.log(`Salvos no banco: ${syncResult.creatives_synced}`);

      console.log(`\n--- Distribuicao por tipo ---`);
      for (const [type, count] of Object.entries(creativeStats.byType)) {
        console.log(`  ${type}: ${count}`);
      }

      console.log(`\n--- Distribuicao por fonte de imagem ---`);
      for (const [source, count] of Object.entries(creativeStats.bySource)) {
        console.log(`  ${source}: ${count}`);
      }

      if (creativeStats.failedAdIds.length > 0) {
        console.log(`\n--- Ads que falharam (${creativeStats.failedAdIds.length}) ---`);
        console.log(creativeStats.failedAdIds.slice(0, 10).join(', '));
        if (creativeStats.failedAdIds.length > 10) {
          console.log(`... e mais ${creativeStats.failedAdIds.length - 10} ads`);
        }
      }

      console.log(`\n==================================================`);
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