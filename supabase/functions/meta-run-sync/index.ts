/**
 * Edge Function: meta-run-sync
 * 
 * Executa sincronizacao de dados do Meta Ads.
 * Busca insights de campaigns, adsets e ads e salva no Supabase.
 * Opcionalmente busca criativos (imagens/videos) dos anuncios.
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

/**
 * Formata uma data como YYYY-MM-DD (UTC)
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Retorna a data atual no timezone da conta de anuncios.
 * Isso evita que sincronizacoes entre 00:00-02:59 UTC referenciem o dia errado
 * para contas em America/Sao_Paulo (UTC-3).
 */
function getTodayInTimezone(timezone?: string): string {
  const now = new Date();
  if (!timezone) return formatDate(now);

  try {
    // Usa Intl.DateTimeFormat para obter a data local no timezone da conta
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Se o timezone for invalido, usa UTC como fallback
  }

  return formatDate(now);
}

/**
 * Calcula o intervalo de datas para sincronizacao, usando o timezone da conta.
 * - daily: apenas o dia anterior (no timezone da conta)
 * - intraday: apenas o dia atual (no timezone da conta)
 * - backfill: de N dias atras ate hoje (no timezone da conta)
 */
function getDateRange(mode: string, daysBack: number = 7, timezone?: string): { dateFrom: string; dateTo: string } {
  const today = getTodayInTimezone(timezone);
  // Cria um objeto Date a partir da string YYYY-MM-DD para fazer aritmetica de dias
  const todayDate = new Date(today + "T12:00:00Z");

  if (mode === "daily") {
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return { dateFrom: formatDate(yesterday), dateTo: formatDate(yesterday) };
  } else if (mode === "intraday") {
    return { dateFrom: today, dateTo: today };
  } else {
    const fromDate = new Date(todayDate);
    fromDate.setDate(fromDate.getDate() - daysBack);
    return { dateFrom: formatDate(fromDate), dateTo: today };
  }
}

function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const leadTypes = ['lead', 'onsite_conversion.lead_grouped'];
  return actions.filter((a) => leadTypes.includes(a.action_type)).reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);
}

function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const conversionTypes = ['lead', 'purchase', 'complete_registration', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase', 'offsite_conversion.fb_pixel_lead'];
  return actions.filter((a) => conversionTypes.includes(a.action_type)).reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

function extractConversionValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  const valueTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase'];
  return actionValues.filter((a) => valueTypes.includes(a.action_type)).reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

function extractPurchaseValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase'];
  return actionValues.filter((a) => purchaseTypes.includes(a.action_type)).reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

async function fetchInsightsWithRetry(url: string, maxRetries: number = 3): Promise<MetaInsightsResponse> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        if (data.error.code === 17 || data.error.code === 4) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(data.error.message);
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
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
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: SyncPayload = await req.json();
    const { mode = "intraday", client_id, meta_ad_account_id, days_back = 7, levels = ["campaign", "adset", "ad"], sync_creatives = false } = body;

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("id").eq("owner_id", user.id).maybeSingle();
    if (!workspace) {
      return new Response(JSON.stringify({ error: "No workspace found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: metaConnection } = await supabaseAdmin.from("meta_connections").select("access_token_encrypted, status").eq("workspace_id", workspace.id).maybeSingle();
    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(JSON.stringify({ error: "No valid Meta connection" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: decryptedToken } = await supabaseAdmin.rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });
    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    let adAccountsQuery = supabaseAdmin.from("meta_ad_accounts").select("id, meta_ad_account_id, name, currency, timezone_name").eq("workspace_id", workspace.id);
    if (meta_ad_account_id) adAccountsQuery = adAccountsQuery.eq("meta_ad_account_id", meta_ad_account_id);
    const { data: adAccounts } = await adAccountsQuery;

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "No ad accounts to sync" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calcula date range inicial (sera recalculado por conta com timezone correto)
    const initialDateRange = getDateRange(mode, days_back);
    const syncResult = { mode, date_from: initialDateRange.dateFrom, date_to: initialDateRange.dateTo, accounts_synced: 0, insights_synced: 0, creatives_synced: 0, errors: [] as string[] };
    const allAdIds: { adId: string; metaAdAccountId: string }[] = [];
    const insightFields = "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,date_stop,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,unique_clicks,actions,action_values";

    for (const adAccount of adAccounts) {
      try {
        // Calcula intervalo de datas usando o timezone da conta para evitar erros de dia
        const { dateFrom, dateTo } = getDateRange(mode, days_back, adAccount.timezone_name);
        const syncStartTime = new Date();
        const { data: syncJob } = await supabaseAdmin.from("meta_sync_jobs").insert({ workspace_id: workspace.id, client_id: client_id || null, meta_ad_account_id: adAccount.meta_ad_account_id, job_type: mode === "backfill" ? "backfill" : mode === "daily" ? "daily" : "fast", date_from: dateFrom, date_to: dateTo, status: "running", started_at: syncStartTime.toISOString() }).select("id").single();
        let totalRows = 0;

        for (const level of levels) {
          try {
            const baseUrl = `https://graph.facebook.com/v21.0/${adAccount.meta_ad_account_id}/insights`;
            const params = new URLSearchParams({ level: level === "adset" ? "adset" : level, fields: insightFields, time_range: JSON.stringify({ since: dateFrom, until: dateTo }), time_increment: "1", limit: "500", access_token: accessToken });
            let url: string | null = `${baseUrl}?${params.toString()}`;
            const allInsights: MetaInsightRow[] = [];

            while (url) {
              const data = await fetchInsightsWithRetry(url);
              if (data.data && data.data.length > 0) allInsights.push(...data.data);
              url = data.paging?.next || null;
            }

            for (const insight of allInsights) {
              let entityId: string, entityName: string | null;
              if (level === "ad") {
                entityId = insight.ad_id || "";
                entityName = insight.ad_name || null;
                if (entityId && sync_creatives && !allAdIds.some(a => a.adId === entityId)) {
                  allAdIds.push({ adId: entityId, metaAdAccountId: adAccount.meta_ad_account_id });
                }
              } else if (level === "adset") {
                entityId = insight.adset_id || "";
                entityName = insight.adset_name || null;
              } else {
                entityId = insight.campaign_id || "";
                entityName = insight.campaign_name || null;
              }
              if (!entityId) continue;

              await supabaseAdmin.from("meta_insights_raw").insert({ workspace_id: workspace.id, client_id: client_id || null, meta_ad_account_id: adAccount.meta_ad_account_id, level, entity_id: entityId, date_start: insight.date_start, date_stop: insight.date_stop, payload: insight });

              await supabaseAdmin.from("meta_insights_daily").upsert({
                workspace_id: workspace.id, client_id: client_id || null, meta_ad_account_id: adAccount.id, level, entity_id: entityId, entity_name: entityName, date: insight.date_start,
                spend: parseFloat(insight.spend || "0"), impressions: parseInt(insight.impressions || "0", 10), reach: parseInt(insight.reach || "0", 10), clicks: parseInt(insight.clicks || "0", 10),
                ctr: parseFloat(insight.ctr || "0"), cpc: parseFloat(insight.cpc || "0"), cpm: parseFloat(insight.cpm || "0"), frequency: parseFloat(insight.frequency || "0"), unique_clicks: parseInt(insight.unique_clicks || "0", 10),
                actions_json: insight.actions || {}, action_values_json: insight.action_values || {}, leads: extractLeads(insight.actions), conversions: extractConversions(insight.actions),
                conversion_value: extractConversionValue(insight.action_values), purchase_value: extractPurchaseValue(insight.action_values)
              }, { onConflict: "workspace_id,meta_ad_account_id,level,entity_id,date" });
              totalRows++;
            }
          } catch (levelError) {
            syncResult.errors.push(`Level ${level} error: ${levelError instanceof Error ? levelError.message : "Unknown"}`);
          }
        }

        if (syncJob) {
          const durationSeconds = Math.floor((new Date().getTime() - syncStartTime.getTime()) / 1000);
          await supabaseAdmin.from("meta_sync_jobs").update({ status: syncResult.errors.length > 0 ? "failed" : "completed", fetched_rows: totalRows, total_records_synced: totalRows, duration_seconds: durationSeconds, error_message: syncResult.errors.join("; ") || null, ended_at: new Date().toISOString() }).eq("id", syncJob.id);
        }

        await supabaseAdmin.from("meta_sync_state").upsert({ workspace_id: workspace.id, client_id: client_id || null, meta_ad_account_id: adAccount.meta_ad_account_id, last_daily_date_synced: mode === "daily" ? dateTo : undefined, last_intraday_synced_at: mode === "intraday" ? new Date().toISOString() : undefined, last_success_at: new Date().toISOString(), last_error: syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null, updated_at: new Date().toISOString() }, { onConflict: "workspace_id,meta_ad_account_id" });
        syncResult.accounts_synced++;
        syncResult.insights_synced += totalRows;
      } catch (accountError) {
        syncResult.errors.push(`Account ${adAccount.meta_ad_account_id} error: ${accountError instanceof Error ? accountError.message : "Unknown"}`);
      }
    }

    if (sync_creatives && allAdIds.length > 0) {
      console.log(`Buscando criativos para ${allAdIds.length} ads`);
      const imageHashCache = new Map<string, string>();

      async function convertImageHashToUrl(imageHash: string, adAccountId: string): Promise<string | null> {
        if (imageHashCache.has(imageHash)) return imageHashCache.get(imageHash) || null;
        try {
          const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
          const resp = await fetch(`https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=${imageHash}&fields=url,url_128,permalink_url&access_token=${accessToken}`);
          const data = await resp.json();
          if (data.data?.[0]) {
            const imgUrl = data.data[0].url || data.data[0].url_128 || data.data[0].permalink_url;
            if (imgUrl) { imageHashCache.set(imageHash, imgUrl); return imgUrl; }
          }
        } catch (err) { console.error(`Erro image_hash ${imageHash}:`, err); }
        return null;
      }

      async function fetchVideoThumbnail(videoId: string): Promise<string | null> {
        try {
          const resp = await fetch(`https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture&access_token=${accessToken}`);
          const data = await resp.json();
          if (data.thumbnails?.data?.length > 0) return data.thumbnails.data.sort((a: {width:number}, b: {width:number}) => b.width - a.width)[0].uri;
          return data.picture || null;
        } catch (err) { console.error(`Erro video thumbnail ${videoId}:`, err); return null; }
      }

      function isValidUrl(url: unknown): url is string { return typeof url === 'string' && url.length > 0 && url.startsWith('http'); }

      async function extractImageUrl(creative: Record<string, unknown>, adAccountId: string): Promise<{ url: string | null; source: string }> {
        if (isValidUrl(creative.image_url)) return { url: creative.image_url, source: 'creative.image_url' };
        if (isValidUrl(creative.thumbnail_url)) return { url: creative.thumbnail_url, source: 'creative.thumbnail_url' };
        const objStorySpec = creative.object_story_spec as Record<string, unknown> | undefined;
        const linkData = objStorySpec?.link_data as Record<string, unknown> | undefined;
        const videoData = objStorySpec?.video_data as Record<string, unknown> | undefined;
        const photoData = objStorySpec?.photo_data as Record<string, unknown> | undefined;
        const templateData = objStorySpec?.template_data as Record<string, unknown> | undefined;
        const assetFeed = creative.asset_feed_spec as Record<string, unknown> | undefined;
        if (isValidUrl(linkData?.picture)) return { url: linkData.picture as string, source: 'link_data.picture' };
        if (isValidUrl(videoData?.image_url)) return { url: videoData.image_url as string, source: 'video_data.image_url' };
        if (isValidUrl(photoData?.url)) return { url: photoData.url as string, source: 'photo_data.url' };
        const childAttachments = linkData?.child_attachments as Array<Record<string, unknown>> | undefined;
        if (childAttachments?.[0]) {
          if (isValidUrl(childAttachments[0].picture)) return { url: childAttachments[0].picture as string, source: 'child_attachments.picture' };
          if (childAttachments[0].image_hash) { const u = await convertImageHashToUrl(childAttachments[0].image_hash as string, adAccountId); if (u) return { url: u, source: 'child_attachments.image_hash' }; }
        }
        const templateChildAttachments = templateData?.child_attachments as Array<Record<string, unknown>> | undefined;
        if (templateChildAttachments?.[0]) {
          if (isValidUrl(templateChildAttachments[0].picture)) return { url: templateChildAttachments[0].picture as string, source: 'template_data.picture' };
          if (templateChildAttachments[0].image_hash) { const u = await convertImageHashToUrl(templateChildAttachments[0].image_hash as string, adAccountId); if (u) return { url: u, source: 'template_data.image_hash' }; }
        }
        const assetImages = assetFeed?.images as Array<Record<string, unknown>> | undefined;
        if (assetImages?.[0]) {
          if (isValidUrl(assetImages[0].url)) return { url: assetImages[0].url as string, source: 'asset_feed.images.url' };
          if (assetImages[0].hash) { const u = await convertImageHashToUrl(assetImages[0].hash as string, adAccountId); if (u) return { url: u, source: 'asset_feed.images.hash' }; }
        }
        const assetVideos = assetFeed?.videos as Array<Record<string, unknown>> | undefined;
        if (assetVideos?.[0]) {
          if (isValidUrl(assetVideos[0].thumbnail_url)) return { url: assetVideos[0].thumbnail_url as string, source: 'asset_feed.videos.thumb' };
          if (assetVideos[0].video_id) { const t = await fetchVideoThumbnail(assetVideos[0].video_id as string); if (t) return { url: t, source: 'asset_feed.videos.video_id' }; }
        }
        const hashesToTry = [creative.image_hash, linkData?.image_hash, videoData?.image_hash, photoData?.image_hash].filter(Boolean) as string[];
        for (const hash of hashesToTry) { const u = await convertImageHashToUrl(hash, adAccountId); if (u) return { url: u, source: 'image_hash' }; }
        const videoId = (creative.video_id || videoData?.video_id) as string | undefined;
        if (videoId) { const t = await fetchVideoThumbnail(videoId); if (t) return { url: t, source: 'video_thumbnail' }; }
        return { url: null, source: 'none' };
      }

      function determineCreativeType(creative: Record<string, unknown>): string {
        const objStorySpec = creative.object_story_spec as Record<string, unknown> | undefined;
        const videoData = objStorySpec?.video_data as Record<string, unknown> | undefined;
        const linkData = objStorySpec?.link_data as Record<string, unknown> | undefined;
        const assetFeed = creative.asset_feed_spec as Record<string, unknown> | undefined;
        const creativeName = creative.name as string | undefined;
        const isCatalogCreative = creativeName?.includes('{{product.') || creative.effective_object_story_id !== undefined;
        if (creative.video_id || videoData?.video_id) return "video";
        const childAttachments = linkData?.child_attachments as Array<unknown> | undefined;
        if (childAttachments && childAttachments.length > 1) return "carousel";
        const assetImages = assetFeed?.images as Array<unknown> | undefined;
        const assetVideos = assetFeed?.videos as Array<unknown> | undefined;
        if (assetFeed && (assetImages?.length || assetVideos?.length)) { if (assetVideos?.length) return "video"; return "dynamic"; }
        if (isCatalogCreative) return "dynamic";
        if (creative.image_url || creative.image_hash || linkData?.picture || linkData?.image_hash || creative.thumbnail_url) return "image";
        return "unknown";
      }

      const adFields = "id,name,status,preview_shareable_link,creative{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,call_to_action_type,object_story_spec,effective_object_story_id,asset_feed_spec},adcreatives{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,object_story_spec,effective_object_story_id,asset_feed_spec}";
      const adsByAccount = new Map<string, string[]>();
      for (const { adId, metaAdAccountId } of allAdIds) {
        const list = adsByAccount.get(metaAdAccountId) || [];
        list.push(adId);
        adsByAccount.set(metaAdAccountId, list);
      }

      for (const [accountMetaId, adIds] of adsByAccount) {
        try {
          for (let i = 0; i < adIds.length; i += 50) {
            const batch = adIds.slice(i, i + 50);
            const batchRequests = batch.map(adId => ({ method: "GET", relative_url: `${adId}?fields=${encodeURIComponent(adFields)}` }));
            const batchResponse = await fetch("https://graph.facebook.com/v21.0/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ access_token: accessToken, batch: JSON.stringify(batchRequests) }) });
            const batchResults = await batchResponse.json();

            for (let j = 0; j < batchResults.length; j++) {
              const result = batchResults[j];
              const adId = batch[j];
              if (result.code !== 200) continue;
              try {
                const adData = JSON.parse(result.body);
                if (adData.error) continue;
                let creative = adData.creative || {};
                if (!creative.id && adData.adcreatives?.data?.[0]) creative = adData.adcreatives.data[0];
                const linkData = creative.object_story_spec?.link_data || {};
                const videoData = creative.object_story_spec?.video_data || {};
                const assetFeed = creative.asset_feed_spec || {};
                const creativeType = determineCreativeType(creative);
                const imageResult = await extractImageUrl(creative, accountMetaId);
                let imageUrl = imageResult.url;
                let thumbnailUrl = imageUrl;
                const videoId = creative.video_id || videoData.video_id || assetFeed.videos?.[0]?.video_id || null;
                if (creativeType === "video" && videoId && !thumbnailUrl) thumbnailUrl = await fetchVideoThumbnail(videoId);
                if (!thumbnailUrl && isValidUrl(creative.thumbnail_url)) thumbnailUrl = creative.thumbnail_url as string;
                if (!imageUrl && thumbnailUrl) imageUrl = thumbnailUrl;

                await supabaseAdmin.from("meta_ad_creatives").upsert({
                  workspace_id: workspace.id, ad_id: adId, meta_ad_account_id: accountMetaId, meta_creative_id: creative.id || null, creative_type: creativeType,
                  image_url: imageUrl, thumbnail_url: thumbnailUrl, video_url: videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null, video_id: videoId,
                  preview_url: adData.preview_shareable_link || null, title: creative.title || linkData.name || videoData.title || assetFeed.titles?.[0]?.text || null,
                  body: creative.body || linkData.message || videoData.message || assetFeed.bodies?.[0]?.text || null, description: linkData.description || videoData.link_description || null,
                  call_to_action: creative.call_to_action_type || linkData.call_to_action?.type || videoData.call_to_action?.type || null, link_url: linkData.link || videoData.call_to_action?.value?.link || null,
                  extra_data: { ad_name: adData.name, ad_status: adData.status || "UNKNOWN", image_source: imageResult.source, raw_creative: creative, has_carousel: (linkData.child_attachments?.length || 0) > 1, carousel_count: linkData.child_attachments?.length || 0 },
                  fetched_at: new Date().toISOString()
                }, { onConflict: "workspace_id,ad_id" });
                syncResult.creatives_synced++;
              } catch (parseErr) { console.error(`Erro criativo ${adId}:`, parseErr); }
            }
            if (i + 50 < adIds.length) await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (accountErr) { syncResult.errors.push(`Creatives error: ${accountErr instanceof Error ? accountErr.message : "Unknown"}`); }
      }
    }

    return new Response(JSON.stringify(syncResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});