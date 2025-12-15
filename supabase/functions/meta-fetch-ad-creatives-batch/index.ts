/**
 * Edge Function: meta-fetch-ad-creatives-batch
 *
 * Busca criativos de multiplos anuncios do Meta Ads API em lote.
 * Suporta todos os tipos de criativos: imagem, video, carrossel, dinamico.
 * Inclui busca de textos de posts via effective_object_story_id.
 *
 * POST /functions/v1/meta-fetch-ad-creatives-batch
 * Body: { ad_ids: string[], meta_ad_account_id: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Limite de ads por batch
const BATCH_SIZE = 50;

// Interface do payload
interface RequestPayload {
  ad_ids: string[];
  meta_ad_account_id: string;
}

// Interface de batch response da Meta
interface MetaBatchResponse {
  code: number;
  body: string;
}

// Interface expandida para criativo da Meta
interface MetaCreativeData {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  image_hash?: string;
  call_to_action_type?: string;
  object_story_spec?: {
    link_data?: {
      message?: string;
      name?: string;
      description?: string;
      link?: string;
      image_hash?: string;
      picture?: string;
      call_to_action?: { type?: string };
      child_attachments?: Array<{
        link?: string;
        picture?: string;
        image_hash?: string;
        name?: string;
        description?: string;
      }>;
    };
    video_data?: {
      message?: string;
      title?: string;
      link_description?: string;
      video_id?: string;
      image_url?: string;
      image_hash?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
    };
    photo_data?: {
      image_hash?: string;
      url?: string;
      caption?: string;
    };
    template_data?: {
      multi_share_optimized?: boolean;
      child_attachments?: Array<{
        link?: string;
        picture?: string;
        image_hash?: string;
      }>;
    };
  };
  asset_feed_spec?: {
    images?: Array<{ hash?: string; url?: string }>;
    videos?: Array<{ video_id?: string; thumbnail_hash?: string; thumbnail_url?: string }>;
    bodies?: Array<{ text?: string }>;
    titles?: Array<{ text?: string }>;
    descriptions?: Array<{ text?: string }>;
    call_to_action_types?: string[];
    link_urls?: Array<{ website_url?: string }>;
  };
  effective_object_story_id?: string;
  effective_instagram_media_id?: string;
  object_id?: string;
  source_instagram_media_id?: string;
}

// Interface de resposta do anuncio
interface MetaAdResponse {
  id: string;
  name?: string;
  status?: string;
  creative?: MetaCreativeData;
  preview_shareable_link?: string;
  adcreatives?: {
    data?: MetaCreativeData[];
  };
  error?: { message: string; code: number };
}

// Interface para dados de post do Facebook
interface PostData {
  message?: string;
  story?: string;
  description?: string;
  name?: string;
  caption?: string;
  full_picture?: string;
  picture?: string;
  call_to_action?: { type?: string; value?: { link?: string } };
  attachments?: {
    data?: Array<{
      title?: string;
      description?: string;
      url?: string;
      media?: { image?: { src?: string } };
    }>;
  };
}

// Cache para image_hash -> URL (evita requisicoes duplicadas)
const imageHashCache = new Map<string, string>();

// Cache para post data (evita requisicoes duplicadas)
const postDataCache = new Map<string, PostData>();

/**
 * Busca dados do post do Facebook pelo effective_object_story_id
 */
async function fetchPostData(
  postId: string,
  accessToken: string
): Promise<PostData | null> {
  // Verifica cache
  if (postDataCache.has(postId)) {
    return postDataCache.get(postId) || null;
  }

  try {
    const fields = "message,story,description,name,caption,full_picture,picture,call_to_action,attachments{title,description,url,media}";
    const url = `https://graph.facebook.com/v21.0/${postId}?fields=${fields}&access_token=${accessToken}`;
    
    console.log(`Fetching post data for: ${postId}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching post ${postId}: HTTP ${response.status}`);
      return null;
    }

    const data: PostData = await response.json();
    postDataCache.set(postId, data);
    return data;
  } catch (err) {
    console.error(`Error fetching post ${postId}:`, err);
    return null;
  }
}

/**
 * Converte image_hash para URL usando API de ad images
 */
async function convertImageHashToUrl(
  imageHash: string,
  adAccountId: string,
  accessToken: string
): Promise<string | null> {
  // Verifica cache
  if (imageHashCache.has(imageHash)) {
    return imageHashCache.get(imageHash) || null;
  }

  try {
    // Formata o ad account ID corretamente
    const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const url = `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=${imageHash}&fields=url,url_128,permalink_url&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const imageData = data.data[0];
      // Prioriza URL maior
      const imageUrl = imageData.url || imageData.url_128 || imageData.permalink_url;
      if (imageUrl) {
        imageHashCache.set(imageHash, imageUrl);
        return imageUrl;
      }
    }
  } catch (err) {
    console.error(`Erro ao converter image_hash ${imageHash}:`, err);
  }
  return null;
}

/**
 * Busca thumbnail de video
 */
async function fetchVideoThumbnail(videoId: string, accessToken: string): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture,source&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

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

/**
 * Extrai URL de imagem de todas as fontes possiveis
 */
async function extractImageUrl(
  creative: MetaCreativeData,
  adAccountId: string,
  accessToken: string,
  postData?: PostData | null
): Promise<string | null> {
  // 1. URL direta do criativo
  if (creative.image_url) {
    return creative.image_url;
  }

  if (creative.thumbnail_url) {
    return creative.thumbnail_url;
  }

  // 2. De post data
  if (postData?.full_picture) {
    return postData.full_picture;
  }
  if (postData?.picture) {
    return postData.picture;
  }

  const linkData = creative.object_story_spec?.link_data;
  const videoData = creative.object_story_spec?.video_data;
  const photoData = creative.object_story_spec?.photo_data;
  const templateData = creative.object_story_spec?.template_data;
  const assetFeed = creative.asset_feed_spec;

  // 3. Picture de link_data
  if (linkData?.picture) {
    return linkData.picture;
  }

  // 4. Image URL de video_data
  if (videoData?.image_url) {
    return videoData.image_url;
  }

  // 5. URL de photo_data
  if (photoData?.url) {
    return photoData.url;
  }

  // 6. Primeiro item de carrossel (child_attachments)
  if (linkData?.child_attachments && linkData.child_attachments.length > 0) {
    const firstChild = linkData.child_attachments[0];
    if (firstChild.picture) {
      return firstChild.picture;
    }
    if (firstChild.image_hash) {
      const url = await convertImageHashToUrl(firstChild.image_hash, adAccountId, accessToken);
      if (url) return url;
    }
  }

  // 7. Template data child attachments
  if (templateData?.child_attachments && templateData.child_attachments.length > 0) {
    const firstChild = templateData.child_attachments[0];
    if (firstChild.picture) {
      return firstChild.picture;
    }
    if (firstChild.image_hash) {
      const url = await convertImageHashToUrl(firstChild.image_hash, adAccountId, accessToken);
      if (url) return url;
    }
  }

  // 8. Asset feed spec images (criativos dinamicos)
  if (assetFeed?.images && assetFeed.images.length > 0) {
    const firstImage = assetFeed.images[0];
    if (firstImage.url) {
      return firstImage.url;
    }
    if (firstImage.hash) {
      const url = await convertImageHashToUrl(firstImage.hash, adAccountId, accessToken);
      if (url) return url;
    }
  }

  // 9. Asset feed spec videos thumbnail
  if (assetFeed?.videos && assetFeed.videos.length > 0) {
    const firstVideo = assetFeed.videos[0];
    if (firstVideo.thumbnail_url) {
      return firstVideo.thumbnail_url;
    }
    if (firstVideo.video_id) {
      const thumb = await fetchVideoThumbnail(firstVideo.video_id, accessToken);
      if (thumb) return thumb;
    }
  }

  // 10. Attachments do post
  if (postData?.attachments?.data && postData.attachments.data.length > 0) {
    const firstAttachment = postData.attachments.data[0];
    if (firstAttachment.media?.image?.src) {
      return firstAttachment.media.image.src;
    }
  }

  // 11. Converte image_hash de varias fontes
  const hashesToTry = [
    creative.image_hash,
    linkData?.image_hash,
    videoData?.image_hash,
    photoData?.image_hash,
  ].filter(Boolean) as string[];

  for (const hash of hashesToTry) {
    const url = await convertImageHashToUrl(hash, adAccountId, accessToken);
    if (url) return url;
  }

  // 12. Busca thumbnail de video se houver video_id
  const videoId = creative.video_id || videoData?.video_id;
  if (videoId) {
    const thumb = await fetchVideoThumbnail(videoId, accessToken);
    if (thumb) return thumb;
  }

  return null;
}

/**
 * Determina tipo do criativo
 */
function determineCreativeType(creative: MetaCreativeData): string {
  const videoData = creative.object_story_spec?.video_data;
  const linkData = creative.object_story_spec?.link_data;
  const assetFeed = creative.asset_feed_spec;

  // Video
  if (creative.video_id || videoData?.video_id) {
    return "video";
  }

  // Carrossel
  if (linkData?.child_attachments && linkData.child_attachments.length > 1) {
    return "carousel";
  }

  // Criativo dinamico
  if (assetFeed && (assetFeed.images?.length || assetFeed.videos?.length || assetFeed.bodies?.length)) {
    if (assetFeed.videos && assetFeed.videos.length > 0) {
      return "video";
    }
    return "dynamic";
  }

  // Imagem
  if (creative.image_url || creative.image_hash || linkData?.picture || linkData?.image_hash) {
    return "image";
  }

  // Se tem effective_object_story_id mas nao outros dados, provavelmente e dinamico
  if (creative.effective_object_story_id) {
    return "dynamic";
  }

  return "unknown";
}

/**
 * Extrai textos do criativo e do post
 */
function extractTexts(
  creative: MetaCreativeData,
  postData?: PostData | null
): { title: string | null; body: string | null; description: string | null; callToAction: string | null; linkUrl: string | null } {
  const linkData = creative.object_story_spec?.link_data;
  const videoData = creative.object_story_spec?.video_data;
  const photoData = creative.object_story_spec?.photo_data;
  const assetFeed = creative.asset_feed_spec;

  // Title - tenta varias fontes
  let title = creative.title ||
    linkData?.name ||
    videoData?.title ||
    assetFeed?.titles?.[0]?.text ||
    null;

  // Se nao achou, tenta do post
  if (!title && postData) {
    title = postData.name || postData.attachments?.data?.[0]?.title || null;
  }

  // Body - tenta varias fontes
  let body = creative.body ||
    linkData?.message ||
    videoData?.message ||
    photoData?.caption ||
    assetFeed?.bodies?.[0]?.text ||
    null;

  // Se nao achou, tenta do post
  if (!body && postData) {
    body = postData.message || postData.story || null;
  }

  // Description - tenta varias fontes
  let description = linkData?.description ||
    videoData?.link_description ||
    assetFeed?.descriptions?.[0]?.text ||
    null;

  // Se nao achou, tenta do post
  if (!description && postData) {
    description = postData.description ||
      postData.caption ||
      postData.attachments?.data?.[0]?.description ||
      null;
  }

  // Call to action
  let callToAction = creative.call_to_action_type ||
    linkData?.call_to_action?.type ||
    videoData?.call_to_action?.type ||
    assetFeed?.call_to_action_types?.[0] ||
    null;

  // Se nao achou, tenta do post
  if (!callToAction && postData?.call_to_action?.type) {
    callToAction = postData.call_to_action.type;
  }

  // Link URL
  let linkUrl = linkData?.link ||
    videoData?.call_to_action?.value?.link ||
    assetFeed?.link_urls?.[0]?.website_url ||
    null;

  // Se nao achou, tenta do post
  if (!linkUrl && postData) {
    linkUrl = postData.call_to_action?.value?.link ||
      postData.attachments?.data?.[0]?.url ||
      null;
  }

  return { title, body, description, callToAction, linkUrl };
}

/**
 * Processa resposta de um ad
 */
async function processAdResponse(
  adData: MetaAdResponse,
  metaAdAccountId: string,
  workspaceId: string,
  accessToken: string
): Promise<{ record: Record<string, unknown> | null; error: string | null }> {
  if (adData.error) {
    return { record: null, error: adData.error.message };
  }

  // Tenta pegar criativo de varias fontes
  let creative = adData.creative;
  if (!creative && adData.adcreatives?.data && adData.adcreatives.data.length > 0) {
    creative = adData.adcreatives.data[0];
  }

  if (!creative) {
    // Retorna registro mesmo sem criativo, com preview_url
    return {
      record: {
        workspace_id: workspaceId,
        ad_id: adData.id,
        meta_ad_account_id: metaAdAccountId,
        meta_creative_id: null,
        creative_type: "unknown",
        image_url: null,
        thumbnail_url: null,
        video_url: null,
        video_id: null,
        preview_url: adData.preview_shareable_link || null,
        title: null,
        body: null,
        description: null,
        call_to_action: null,
        link_url: null,
        extra_data: { ad_name: adData.name, ad_status: adData.status },
        fetched_at: new Date().toISOString(),
      },
      error: null,
    };
  }

  // Busca dados do post se tiver effective_object_story_id
  let postData: PostData | null = null;
  if (creative.effective_object_story_id) {
    postData = await fetchPostData(creative.effective_object_story_id, accessToken);
  }

  const assetFeed = creative.asset_feed_spec;
  const videoData = creative.object_story_spec?.video_data;

  // Extrai tipo
  const creativeType = determineCreativeType(creative);

  // Extrai URL da imagem (passa postData para fallback)
  const imageUrl = await extractImageUrl(creative, metaAdAccountId, accessToken, postData);

  // Video ID e URL
  const videoId = creative.video_id || videoData?.video_id || assetFeed?.videos?.[0]?.video_id || null;
  const videoUrl = videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null;

  // Para videos, busca thumbnail se nao tiver imagem
  let thumbnailUrl = imageUrl;
  if (creativeType === "video" && videoId && !thumbnailUrl) {
    thumbnailUrl = await fetchVideoThumbnail(videoId, accessToken);
  }

  // Extrai textos (inclui dados do post)
  const { title, body, description, callToAction, linkUrl } = extractTexts(creative, postData);

  const record = {
    workspace_id: workspaceId,
    ad_id: adData.id,
    meta_ad_account_id: metaAdAccountId,
    meta_creative_id: creative.id || null,
    creative_type: creativeType,
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
    video_id: videoId,
    preview_url: adData.preview_shareable_link || null,
    title,
    body,
    description,
    call_to_action: callToAction,
    link_url: linkUrl,
    extra_data: {
      ad_name: adData.name,
      ad_status: adData.status,
      raw_creative: creative,
      post_data: postData || null,
      has_carousel: (creative.object_story_spec?.link_data?.child_attachments?.length || 0) > 1,
      carousel_count: creative.object_story_spec?.link_data?.child_attachments?.length || 0,
    },
    fetched_at: new Date().toISOString(),
  };

  return { record, error: null };
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

    const payload: RequestPayload = await req.json();
    const { ad_ids, meta_ad_account_id } = payload;

    if (!ad_ids || !Array.isArray(ad_ids) || ad_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty ad_ids array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: meta_ad_account_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Busca workspace
    let workspaceId: string | null = null;
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: memberWorkspace } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (memberWorkspace) {
        workspaceId = memberWorkspace.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Nenhum workspace encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica cache - ignora criativos sem textos para rebuscar
    const { data: cachedCreatives } = await supabaseAdmin
      .from("meta_ad_creatives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("ad_id", ad_ids);

    const cachedMap: Record<string, Record<string, unknown>> = {};
    const cachedAdIds = new Set<string>();

    if (cachedCreatives) {
      for (const creative of cachedCreatives) {
        // Verifica se criativo em cache tem imagem E textos - se nao tiver, rebusca
        const hasImage = creative.thumbnail_url || creative.image_url;
        const hasTexts = creative.title || creative.body || creative.description;
        
        // So considera valido se tiver imagem ou textos
        if (hasImage || hasTexts) {
          cachedMap[creative.ad_id] = creative;
          cachedAdIds.add(creative.ad_id);
        }
      }
    }

    const adsToFetch = ad_ids.filter(id => !cachedAdIds.has(id));
    console.log(`Batch creative fetch: ${ad_ids.length} requested, ${cachedAdIds.size} cached with data, ${adsToFetch.length} to fetch`);

    if (adsToFetch.length === 0) {
      return new Response(
        JSON.stringify({
          creatives: cachedMap,
          errors: {},
          cached_count: cachedAdIds.size,
          fetched_count: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca conexao Meta
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    const creatives: Record<string, Record<string, unknown>> = { ...cachedMap };
    const errors: Record<string, string> = {};
    const recordsToUpsert: Record<string, unknown>[] = [];

    // Campos expandidos para cobrir todos os tipos de criativos
    const adFields = [
      "id", "name", "status", "preview_shareable_link",
      "creative{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,call_to_action_type,",
      "object_story_spec,effective_object_story_id,effective_instagram_media_id,object_id,asset_feed_spec}",
      "adcreatives{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,object_story_spec,asset_feed_spec,effective_object_story_id}"
    ].join("");

    // Processa em lotes
    for (let i = 0; i < adsToFetch.length; i += BATCH_SIZE) {
      const batch = adsToFetch.slice(i, i + BATCH_SIZE);

      const batchRequests = batch.map(adId => ({
        method: "GET",
        relative_url: `${adId}?fields=${encodeURIComponent(adFields)}`,
      }));

      const batchBody = new URLSearchParams({
        access_token: accessToken,
        batch: JSON.stringify(batchRequests),
      });

      try {
        const batchResponse = await fetch("https://graph.facebook.com/v21.0/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: batchBody,
        });

        const batchResults: MetaBatchResponse[] = await batchResponse.json();

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const adId = batch[j];

          if (result.code !== 200) {
            console.error(`Error fetching ad ${adId}: HTTP ${result.code}`);
            errors[adId] = `HTTP ${result.code}`;
            continue;
          }

          try {
            const adData: MetaAdResponse = JSON.parse(result.body);

            if (adData.error) {
              console.error(`Meta error for ad ${adId}:`, adData.error);
              errors[adId] = adData.error.message;
              continue;
            }

            const { record, error } = await processAdResponse(
              adData,
              meta_ad_account_id,
              workspaceId,
              accessToken
            );

            if (error) {
              errors[adId] = error;
            } else if (record) {
              creatives[adId] = record;
              recordsToUpsert.push(record);
            }
          } catch (parseError) {
            console.error(`Parse error for ad ${adId}:`, parseError);
            errors[adId] = "Failed to parse response";
          }
        }
      } catch (batchError) {
        console.error(`Batch request error:`, batchError);
        for (const adId of batch) {
          if (!creatives[adId]) {
            errors[adId] = "Batch request failed";
          }
        }
      }

      // Pausa entre lotes para evitar rate limit
      if (i + BATCH_SIZE < adsToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Salva no banco
    if (recordsToUpsert.length > 0) {
      console.log(`Salvando ${recordsToUpsert.length} criativos no banco...`);

      // Log dos tipos de criativos e textos encontrados
      const summary = recordsToUpsert.reduce((acc: { types: Record<string, number>; withTexts: number }, record) => {
        const type = (record.creative_type as string) || 'unknown';
        acc.types[type] = (acc.types[type] || 0) + 1;
        if (record.title || record.body || record.description) {
          acc.withTexts++;
        }
        return acc;
      }, { types: {}, withTexts: 0 });
      console.log('Resumo:', { types: summary.types, com_textos: summary.withTexts, total: recordsToUpsert.length });

      const { error: upsertError } = await supabaseAdmin
        .from("meta_ad_creatives")
        .upsert(recordsToUpsert, {
          onConflict: "workspace_id,ad_id",
        });

      if (upsertError) {
        console.error("ERRO no batch upsert:", {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });
      } else {
        console.log(`${recordsToUpsert.length} criativos salvos com sucesso`);
      }
    }

    return new Response(
      JSON.stringify({
        creatives,
        errors,
        cached_count: cachedAdIds.size,
        fetched_count: recordsToUpsert.length,
      }),
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
