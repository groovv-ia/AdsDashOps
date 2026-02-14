/**
 * Edge Function: meta-fetch-ad-creatives-batch
 *
 * Busca criativos de multiplos anuncios do Meta Ads API em lote.
 * Suporta todos os tipos: imagem, video, carrossel, dinamico.
 * Inclui busca de textos de posts via effective_object_story_id.
 * Faz download das imagens e armazena no Supabase Storage para persistencia.
 *
 * POST /functions/v1/meta-fetch-ad-creatives-batch
 * Body: { ad_ids: string[], meta_ad_account_id: string }
 *
 * Estrategia de imagens em 3 camadas:
 * - thumbnail_url: p64x64 original do Meta para carregamento rapido
 * - image_url / image_url_hd: URL em alta resolucao (adimages API, full_picture)
 * - cached_image_url / cached_thumbnail_url: permanente no Supabase Storage
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS obrigatorios
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Limite de ads por batch na Graph API
const BATCH_SIZE = 50;

// Limite maximo de tamanho de imagem para cache no Storage (10MB)
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Tempo de expiracao do cache em dias
const CACHE_EXPIRY_DAYS = 30;

// ============================================
// Interfaces
// ============================================

interface RequestPayload {
  ad_ids: string[];
  meta_ad_account_id: string;
}

interface MetaBatchResponse {
  code: number;
  body: string;
}

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

// Resultado completo com 3 camadas de URL
interface ImageResult {
  url: string | null;           // Melhor URL disponivel (alta res)
  url_hd: string | null;        // URL em alta definicao
  thumbnail_original: string | null; // URL p64x64 original para carregamento rapido
  width: number | null;
  height: number | null;
  quality: 'hd' | 'sd' | 'low' | 'unknown';
  source: string;               // Origem da imagem para debug
}

// ============================================
// Caches em memoria (dentro da mesma invocacao)
// ============================================

const imageHashCache = new Map<string, string>();
const postDataCache = new Map<string, PostData>();

// ============================================
// Funcoes auxiliares
// ============================================

/**
 * Verifica se uma URL eh um thumbnail minusculo do Meta CDN (p64x64)
 * Verifica apenas no path da URL, ignorando query params (stp=...p64x64...)
 * pois o parametro stp indica transformacao do CDN, nao a resolucao real da imagem armazenada
 */
function isLowQualityUrl(url: string): boolean {
  try {
    const urlPath = url.split('?')[0];
    return urlPath.includes('/p64x64/') || urlPath.includes('/p128x128/')
      || urlPath.includes('/p64x64') || urlPath.includes('/p128x128');
  } catch {
    return url.includes('/p64x64/') || url.includes('/p128x128/');
  }
}

/**
 * Tenta melhorar resolucao de URLs do Meta CDN
 * Substitui p64x64 por p720x720 para obter resolucao maior
 */
function upgradeUrlResolution(url: string): string {
  try {
    if (url.includes('p64x64') || url.includes('p128x128')) {
      return url
        .replace(/p64x64/g, 'p720x720')
        .replace(/p128x128/g, 'p720x720');
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Determina qualidade baseado nas dimensoes
 */
function determineImageQuality(width: number | null, height: number | null): 'hd' | 'sd' | 'low' | 'unknown' {
  if (!width || !height) return 'unknown';
  if ((width >= 1280 && height >= 720) || (width >= 720 && height >= 1280)) return 'hd';
  if ((width >= 640 && height >= 480) || (width >= 480 && height >= 640)) return 'sd';
  if (width > 0 && height > 0) return 'low';
  return 'unknown';
}

/**
 * Busca dados do post do Facebook pelo effective_object_story_id
 */
async function fetchPostData(
  postId: string,
  accessToken: string
): Promise<PostData | null> {
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
 * Converte image_hash para URL de alta resolucao usando API de adimages
 * Retorna a URL original (nao-CDN) que nao expira
 */
async function convertImageHashToUrl(
  imageHash: string,
  adAccountId: string,
  accessToken: string
): Promise<string | null> {
  if (imageHashCache.has(imageHash)) {
    return imageHashCache.get(imageHash) || null;
  }

  try {
    const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    // Solicita url (maior), url_128, permalink_url para ter opcoes de resolucao
    const url = `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=${imageHash}&fields=url,url_128,url_256,permalink_url,width,height&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const imageData = data.data[0];
      // Prioriza URL de maior resolucao
      const imageUrl = imageData.url || imageData.permalink_url || imageData.url_256 || imageData.url_128;
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
 * Busca thumbnail de video em HD com informacoes completas
 */
async function fetchVideoThumbnailHD(videoId: string, accessToken: string): Promise<ImageResult> {
  try {
    const url = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture,source&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`Video thumbnail error for ${videoId}:`, data.error);
      return { url: null, url_hd: null, thumbnail_original: null, width: null, height: null, quality: 'unknown', source: 'none' };
    }

    let bestThumbnail: { uri: string; width: number; height: number } | null = null;
    let hdThumbnail: { uri: string; width: number; height: number } | null = null;

    if (data.thumbnails?.data && data.thumbnails.data.length > 0) {
      const sorted = data.thumbnails.data.sort(
        (a: { width: number; height: number }, b: { width: number; height: number }) =>
          (b.width * b.height) - (a.width * a.height)
      );
      bestThumbnail = sorted[0];
      hdThumbnail = sorted.find((t: { width: number; height: number }) =>
        t.width >= 1280 && t.height >= 720
      ) || null;
    }

    if (hdThumbnail) {
      return {
        url: hdThumbnail.uri,
        url_hd: hdThumbnail.uri,
        thumbnail_original: data.picture || null,
        width: hdThumbnail.width,
        height: hdThumbnail.height,
        quality: determineImageQuality(hdThumbnail.width, hdThumbnail.height),
        source: 'video_thumbnail_hd',
      };
    }

    if (bestThumbnail) {
      return {
        url: bestThumbnail.uri,
        url_hd: null,
        thumbnail_original: data.picture || null,
        width: bestThumbnail.width,
        height: bestThumbnail.height,
        quality: determineImageQuality(bestThumbnail.width, bestThumbnail.height),
        source: 'video_thumbnail_best',
      };
    }

    if (data.picture) {
      return {
        url: data.picture,
        url_hd: null,
        thumbnail_original: data.picture,
        width: null,
        height: null,
        quality: 'unknown',
        source: 'video_picture',
      };
    }

    return { url: null, url_hd: null, thumbnail_original: null, width: null, height: null, quality: 'unknown', source: 'none' };
  } catch (err) {
    console.error(`Error fetching video thumbnail for ${videoId}:`, err);
    return { url: null, url_hd: null, thumbnail_original: null, width: null, height: null, quality: 'unknown', source: 'none' };
  }
}

// ============================================
// Funcao principal de extracao de imagem
// PRIORIDADE REESTRUTURADA: fontes de alta resolucao primeiro
// ============================================

/**
 * Extrai URL de imagem priorizando fontes de alta qualidade.
 * Mantem a URL p64x64 original como thumbnail para carregamento rapido.
 *
 * Ordem de prioridade:
 * 1. postData.full_picture (melhor qualidade do post)
 * 2. postData.attachments media (imagem do anexo)
 * 3. asset_feed_spec.images[].hash -> convertImageHashToUrl (full-res via adimages API)
 * 4. image_hash direto -> convertImageHashToUrl
 * 5. link_data.picture / video_data.image_url / photo_data.url
 * 6. child_attachments (carrossel/template)
 * 7. creative.image_url (se NAO for p64x64)
 * 8. creative.thumbnail_url com upgrade (p64x64 -> p720x720, ultimo recurso)
 */
async function extractImageUrl(
  creative: MetaCreativeData,
  adAccountId: string,
  accessToken: string,
  postData?: PostData | null
): Promise<ImageResult> {
  // Captura o thumbnail original p64x64 para uso como fast-load
  const originalThumbnail = creative.thumbnail_url || null;

  // Helper para criar resultado de alta qualidade preservando o thumbnail original
  const makeResult = (url: string, source: string, isHd = false): ImageResult => ({
    url,
    url_hd: isHd ? url : null,
    thumbnail_original: originalThumbnail,
    width: null,
    height: null,
    quality: isHd ? 'hd' : (isLowQualityUrl(url) ? 'low' : 'unknown'),
    source,
  });

  const linkData = creative.object_story_spec?.link_data;
  const videoData = creative.object_story_spec?.video_data;
  const photoData = creative.object_story_spec?.photo_data;
  const templateData = creative.object_story_spec?.template_data;
  const assetFeed = creative.asset_feed_spec;

  // --- FONTES DE ALTA QUALIDADE (prioridade maxima) ---

  // 1. full_picture do post (sempre alta qualidade)
  if (postData?.full_picture) {
    console.log('Image source: postData.full_picture');
    return makeResult(postData.full_picture, 'post_full_picture', true);
  }

  // 2. Attachments do post (imagem de midia)
  if (postData?.attachments?.data && postData.attachments.data.length > 0) {
    const firstAttachment = postData.attachments.data[0];
    if (firstAttachment.media?.image?.src) {
      console.log('Image source: postData.attachments.media.image.src');
      return makeResult(firstAttachment.media.image.src, 'post_attachment_media', true);
    }
  }

  // 3. postData.picture (menor que full_picture mas ainda boa)
  if (postData?.picture && !isLowQualityUrl(postData.picture)) {
    console.log('Image source: postData.picture');
    return makeResult(postData.picture, 'post_picture');
  }

  // 4. Asset feed spec images via hash -> adimages API (full-res, crucial para dinamicos)
  if (assetFeed?.images && assetFeed.images.length > 0) {
    for (const img of assetFeed.images) {
      if (img.hash) {
        const hdUrl = await convertImageHashToUrl(img.hash, adAccountId, accessToken);
        if (hdUrl) {
          console.log(`Image source: asset_feed_spec.images hash ${img.hash}`);
          return makeResult(hdUrl, 'asset_feed_image_hash', true);
        }
      }
      if (img.url && !isLowQualityUrl(img.url)) {
        console.log('Image source: asset_feed_spec.images url');
        return makeResult(img.url, 'asset_feed_image_url');
      }
    }
  }

  // 5. image_hash direto do criativo -> adimages API
  if (creative.image_hash) {
    const hdUrl = await convertImageHashToUrl(creative.image_hash, adAccountId, accessToken);
    if (hdUrl) {
      console.log(`Image source: creative.image_hash ${creative.image_hash}`);
      return makeResult(hdUrl, 'creative_image_hash', true);
    }
  }

  // 6. link_data.image_hash -> adimages API
  if (linkData?.image_hash) {
    const hdUrl = await convertImageHashToUrl(linkData.image_hash, adAccountId, accessToken);
    if (hdUrl) {
      console.log(`Image source: link_data.image_hash ${linkData.image_hash}`);
      return makeResult(hdUrl, 'link_data_image_hash', true);
    }
  }

  // 7. link_data.picture (geralmente boa qualidade)
  if (linkData?.picture && !isLowQualityUrl(linkData.picture)) {
    console.log('Image source: link_data.picture');
    return makeResult(linkData.picture, 'link_data_picture');
  }

  // 8. video_data.image_url
  if (videoData?.image_url && !isLowQualityUrl(videoData.image_url)) {
    console.log('Image source: video_data.image_url');
    return makeResult(videoData.image_url, 'video_data_image_url');
  }

  // 9. video_data.image_hash -> adimages API
  if (videoData?.image_hash) {
    const hdUrl = await convertImageHashToUrl(videoData.image_hash, adAccountId, accessToken);
    if (hdUrl) {
      console.log(`Image source: video_data.image_hash ${videoData.image_hash}`);
      return makeResult(hdUrl, 'video_data_image_hash', true);
    }
  }

  // 10. photo_data.url
  if (photoData?.url && !isLowQualityUrl(photoData.url)) {
    console.log('Image source: photo_data.url');
    return makeResult(photoData.url, 'photo_data_url');
  }

  // 11. photo_data.image_hash -> adimages API
  if (photoData?.image_hash) {
    const hdUrl = await convertImageHashToUrl(photoData.image_hash, adAccountId, accessToken);
    if (hdUrl) {
      console.log(`Image source: photo_data.image_hash ${photoData.image_hash}`);
      return makeResult(hdUrl, 'photo_data_image_hash', true);
    }
  }

  // 12. Primeiro item de carrossel
  if (linkData?.child_attachments && linkData.child_attachments.length > 0) {
    const firstChild = linkData.child_attachments[0];
    if (firstChild.image_hash) {
      const hdUrl = await convertImageHashToUrl(firstChild.image_hash, adAccountId, accessToken);
      if (hdUrl) {
        console.log('Image source: child_attachment.image_hash');
        return makeResult(hdUrl, 'carousel_child_hash', true);
      }
    }
    if (firstChild.picture && !isLowQualityUrl(firstChild.picture)) {
      console.log('Image source: child_attachment.picture');
      return makeResult(firstChild.picture, 'carousel_child_picture');
    }
  }

  // 13. Template data child attachments
  if (templateData?.child_attachments && templateData.child_attachments.length > 0) {
    const firstChild = templateData.child_attachments[0];
    if (firstChild.image_hash) {
      const hdUrl = await convertImageHashToUrl(firstChild.image_hash, adAccountId, accessToken);
      if (hdUrl) {
        console.log('Image source: template_child.image_hash');
        return makeResult(hdUrl, 'template_child_hash', true);
      }
    }
    if (firstChild.picture && !isLowQualityUrl(firstChild.picture)) {
      console.log('Image source: template_child.picture');
      return makeResult(firstChild.picture, 'template_child_picture');
    }
  }

  // 14. Asset feed spec videos thumbnail
  if (assetFeed?.videos && assetFeed.videos.length > 0) {
    const firstVideo = assetFeed.videos[0];
    if (firstVideo.thumbnail_url && !isLowQualityUrl(firstVideo.thumbnail_url)) {
      console.log('Image source: asset_feed_video.thumbnail_url');
      return makeResult(firstVideo.thumbnail_url, 'asset_feed_video_thumb');
    }
    if (firstVideo.video_id) {
      const thumbResult = await fetchVideoThumbnailHD(firstVideo.video_id, accessToken);
      if (thumbResult.url) return { ...thumbResult, thumbnail_original: originalThumbnail };
    }
  }

  // 15. Busca thumbnail de video se houver video_id
  const videoId = creative.video_id || videoData?.video_id;
  if (videoId) {
    const thumbResult = await fetchVideoThumbnailHD(videoId, accessToken);
    if (thumbResult.url) return { ...thumbResult, thumbnail_original: originalThumbnail };
  }

  // --- FONTES DE BAIXA QUALIDADE (fallback) ---

  // 16. creative.image_url (pode ser de boa ou ma qualidade)
  if (creative.image_url) {
    if (!isLowQualityUrl(creative.image_url)) {
      console.log('Image source: creative.image_url (good quality)');
      return makeResult(creative.image_url, 'creative_image_url');
    }
    // Se e p64x64, faz upgrade para p720x720
    const upgraded = upgradeUrlResolution(creative.image_url);
    console.log('Image source: creative.image_url (upgraded from p64x64)');
    return {
      url: upgraded,
      url_hd: null,
      thumbnail_original: creative.image_url,
      width: null,
      height: null,
      quality: 'low',
      source: 'creative_image_url_upgraded',
    };
  }

  // 17. creative.thumbnail_url (ULTIMO recurso - sempre p64x64)
  if (creative.thumbnail_url) {
    const upgraded = upgradeUrlResolution(creative.thumbnail_url);
    console.log('Image source: creative.thumbnail_url (upgraded from p64x64)');
    return {
      url: upgraded,
      url_hd: null,
      thumbnail_original: creative.thumbnail_url,
      width: null,
      height: null,
      quality: 'low',
      source: 'creative_thumbnail_upgraded',
    };
  }

  return {
    url: null,
    url_hd: null,
    thumbnail_original: null,
    width: null,
    height: null,
    quality: 'unknown',
    source: 'none',
  };
}

// ============================================
// Upload de imagens para Supabase Storage
// ============================================

/**
 * Faz download de uma imagem e upload para o Supabase Storage
 * Retorna a URL publica/signed do arquivo no Storage
 */
async function cacheImageToStorage(
  imageUrl: string,
  storagePath: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Faz download da imagem
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Download failed for ${storagePath}: HTTP ${response.status}`);
      return null;
    }

    // Verifica tamanho
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE_BYTES) {
      console.log(`Image too large for cache (${contentLength} bytes): ${storagePath}`);
      return null;
    }

    // Le o conteudo como ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      console.log(`Image too large for cache (${arrayBuffer.byteLength} bytes): ${storagePath}`);
      return null;
    }

    // Determina content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Upload para o Storage usando service role (bypassa RLS)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('ad-media-cache')
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed for ${storagePath}:`, uploadError.message);
      return null;
    }

    // Gera URL signed com validade de 30 dias
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('ad-media-cache')
      .createSignedUrl(storagePath, CACHE_EXPIRY_DAYS * 24 * 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      console.error(`Signed URL generation failed for ${storagePath}:`, signedError?.message);
      return null;
    }

    return signedData.signedUrl;
  } catch (err) {
    console.error(`Cache image error for ${storagePath}:`, err);
    return null;
  }
}

/**
 * Faz cache de imagem HD e thumbnail no Storage
 * Retorna URLs do Storage para ambas
 */
async function cacheCreativeImages(
  imageResult: ImageResult,
  workspaceId: string,
  adId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ cachedImageUrl: string | null; cachedThumbnailUrl: string | null; fileSize: number | null }> {
  let cachedImageUrl: string | null = null;
  let cachedThumbnailUrl: string | null = null;
  let fileSize: number | null = null;

  const basePath = `workspaces/${workspaceId}/creatives/${adId}`;

  // Cache da imagem principal (alta resolucao)
  const mainUrl = imageResult.url_hd || imageResult.url;
  if (mainUrl && !isLowQualityUrl(mainUrl)) {
    try {
      // Determina extensao a partir da URL
      const ext = mainUrl.includes('.png') ? 'png' : 'jpg';
      const imagePath = `${basePath}/image.${ext}`;

      cachedImageUrl = await cacheImageToStorage(mainUrl, imagePath, supabaseAdmin);

      if (cachedImageUrl) {
        // Estima tamanho do arquivo (ja verificado no download)
        console.log(`Cached HD image for ad ${adId}`);
      }
    } catch (err) {
      console.error(`Error caching HD image for ad ${adId}:`, err);
    }
  }

  // Cache do thumbnail original (p64x64 para carregamento rapido)
  if (imageResult.thumbnail_original) {
    try {
      const thumbExt = imageResult.thumbnail_original.includes('.png') ? 'png' : 'jpg';
      const thumbPath = `${basePath}/thumb.${thumbExt}`;

      cachedThumbnailUrl = await cacheImageToStorage(imageResult.thumbnail_original, thumbPath, supabaseAdmin);

      if (cachedThumbnailUrl) {
        console.log(`Cached thumbnail for ad ${adId}`);
      }
    } catch (err) {
      console.error(`Error caching thumbnail for ad ${adId}:`, err);
    }
  }

  return { cachedImageUrl, cachedThumbnailUrl, fileSize };
}

// ============================================
// Tipo de criativo e textos
// ============================================

/**
 * Determina tipo do criativo baseado nos dados disponiveis
 */
function determineCreativeType(creative: MetaCreativeData): string {
  const videoData = creative.object_story_spec?.video_data;
  const linkData = creative.object_story_spec?.link_data;
  const assetFeed = creative.asset_feed_spec;

  if (creative.video_id || videoData?.video_id) return "video";
  if (linkData?.child_attachments && linkData.child_attachments.length > 1) return "carousel";
  if (assetFeed && (assetFeed.images?.length || assetFeed.videos?.length || assetFeed.bodies?.length)) {
    if (assetFeed.videos && assetFeed.videos.length > 0) return "video";
    return "dynamic";
  }
  if (creative.image_url || creative.image_hash || linkData?.picture || linkData?.image_hash) return "image";
  if (creative.effective_object_story_id) return "dynamic";
  if (creative.name && creative.name.includes('{{product.')) return "dynamic";
  if (creative.effective_instagram_media_id) return "dynamic";
  if (creative.thumbnail_url) return "image";
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

  let title = creative.title || linkData?.name || videoData?.title || assetFeed?.titles?.[0]?.text || null;
  if (!title && postData) {
    title = postData.name || postData.attachments?.data?.[0]?.title || null;
  }

  let body = creative.body || linkData?.message || videoData?.message || photoData?.caption || assetFeed?.bodies?.[0]?.text || null;
  if (!body && postData) {
    body = postData.message || postData.story || null;
  }

  let description = linkData?.description || videoData?.link_description || assetFeed?.descriptions?.[0]?.text || null;
  if (!description && postData) {
    description = postData.description || postData.caption || postData.attachments?.data?.[0]?.description || null;
  }

  let callToAction = creative.call_to_action_type || linkData?.call_to_action?.type || videoData?.call_to_action?.type || assetFeed?.call_to_action_types?.[0] || null;
  if (!callToAction && postData?.call_to_action?.type) {
    callToAction = postData.call_to_action.type;
  }

  let linkUrl = linkData?.link || videoData?.call_to_action?.value?.link || assetFeed?.link_urls?.[0]?.website_url || null;
  if (!linkUrl && postData) {
    linkUrl = postData.call_to_action?.value?.link || postData.attachments?.data?.[0]?.url || null;
  }

  return { title, body, description, callToAction, linkUrl };
}

// ============================================
// Processamento principal de cada anuncio
// ============================================

/**
 * Processa resposta de um ad, extrai criativo e faz cache no Storage
 */
async function processAdResponse(
  adData: MetaAdResponse,
  metaAdAccountId: string,
  workspaceId: string,
  accessToken: string,
  supabaseAdmin: ReturnType<typeof createClient>
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
    return {
      record: {
        workspace_id: workspaceId,
        ad_id: adData.id,
        meta_ad_account_id: metaAdAccountId,
        meta_creative_id: null,
        creative_type: "unknown",
        image_url: null,
        image_url_hd: null,
        thumbnail_url: null,
        thumbnail_quality: 'unknown',
        image_width: null,
        image_height: null,
        video_url: null,
        video_id: null,
        preview_url: adData.preview_shareable_link || null,
        title: null,
        body: null,
        description: null,
        call_to_action: null,
        link_url: null,
        is_complete: false,
        fetch_status: 'pending',
        fetch_attempts: 1,
        last_validated_at: new Date().toISOString(),
        error_message: null,
        extra_data: { ad_name: adData.name, ad_status: adData.status },
        fetched_at: new Date().toISOString(),
        cached_image_url: null,
        cached_thumbnail_url: null,
        cache_expires_at: null,
        file_size: null,
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
  const creativeType = determineCreativeType(creative);

  // Extrai URL da imagem com nova prioridade (alta qualidade primeiro)
  let imageResult = await extractImageUrl(creative, metaAdAccountId, accessToken, postData);

  // Video ID e URL
  const videoId = creative.video_id || videoData?.video_id || assetFeed?.videos?.[0]?.video_id || null;
  const videoUrl = videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null;

  // Para videos, busca thumbnail em HD se nao tiver imagem boa
  if (creativeType === "video" && videoId && (!imageResult.url || isLowQualityUrl(imageResult.url))) {
    const videoThumb = await fetchVideoThumbnailHD(videoId, accessToken);
    if (videoThumb.url && (!imageResult.url || !isLowQualityUrl(videoThumb.url))) {
      imageResult = { ...videoThumb, thumbnail_original: imageResult.thumbnail_original || videoThumb.thumbnail_original };
    }
  }

  // Fallback final: se ainda nao tem imagem, usa thumbnail_url do raw creative
  if (!imageResult.url && creative.thumbnail_url) {
    console.log(`Fallback final: usando thumbnail_url do creative raw para ad ${adData.id}`);
    const upgraded = upgradeUrlResolution(creative.thumbnail_url);
    imageResult = {
      url: upgraded,
      url_hd: null,
      thumbnail_original: creative.thumbnail_url,
      width: null,
      height: null,
      quality: 'low',
      source: 'final_fallback_thumbnail',
    };
  }

  // Extrai textos
  const { title, body, description, callToAction, linkUrl } = extractTexts(creative, postData);

  // Faz cache das imagens no Supabase Storage (em background, nao bloqueia)
  let cachedImageUrl: string | null = null;
  let cachedThumbnailUrl: string | null = null;
  let fileSize: number | null = null;

  if (imageResult.url) {
    try {
      const cacheResult = await cacheCreativeImages(imageResult, workspaceId, adData.id, supabaseAdmin);
      cachedImageUrl = cacheResult.cachedImageUrl;
      cachedThumbnailUrl = cacheResult.cachedThumbnailUrl;
      fileSize = cacheResult.fileSize;
    } catch (err) {
      console.error(`Storage cache error for ad ${adData.id}:`, err);
      // Continua sem cache - nao bloqueia o resultado
    }
  }

  // Calcula data de expiracao do cache
  const cacheExpiresAt = (cachedImageUrl || cachedThumbnailUrl)
    ? new Date(Date.now() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Determina completude e status
  const hasImage = !!imageResult.url;
  const hasTexts = !!(title || body || description);
  const isComplete = hasImage || hasTexts;

  let fetchStatus: 'success' | 'partial' | 'failed' | 'pending';
  if (hasImage && hasTexts) {
    fetchStatus = 'success';
  } else if (hasImage || hasTexts) {
    fetchStatus = 'partial';
  } else {
    fetchStatus = 'failed';
  }

  // Monta registro com 3 camadas de URL
  const record = {
    workspace_id: workspaceId,
    ad_id: adData.id,
    meta_ad_account_id: metaAdAccountId,
    meta_creative_id: creative.id || null,
    creative_type: creativeType,
    // Camada 2: alta resolucao do Meta CDN
    image_url: imageResult.url,
    image_url_hd: imageResult.url_hd || imageResult.url,
    // Camada 1: thumbnail rapido (p64x64 original OU pequeno para fast-load)
    thumbnail_url: imageResult.thumbnail_original || imageResult.url,
    thumbnail_quality: imageResult.quality,
    image_width: imageResult.width,
    image_height: imageResult.height,
    video_url: videoUrl,
    video_id: videoId,
    preview_url: adData.preview_shareable_link || null,
    title,
    body,
    description,
    call_to_action: callToAction,
    link_url: linkUrl,
    is_complete: isComplete,
    fetch_status: fetchStatus,
    fetch_attempts: 1,
    last_validated_at: new Date().toISOString(),
    error_message: null,
    // Camada 3: permanente no Supabase Storage
    cached_image_url: cachedImageUrl,
    cached_thumbnail_url: cachedThumbnailUrl,
    cache_expires_at: cacheExpiresAt,
    file_size: fileSize,
    extra_data: {
      ad_name: adData.name,
      ad_status: adData.status,
      raw_creative: creative,
      post_data: postData || null,
      has_carousel: (creative.object_story_spec?.link_data?.child_attachments?.length || 0) > 1,
      carousel_count: creative.object_story_spec?.link_data?.child_attachments?.length || 0,
      image_source: imageResult.source,
    },
    fetched_at: new Date().toISOString(),
  };

  return { record, error: null };
}

// ============================================
// Handler principal
// ============================================

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

    // Cliente autenticado para verificar usuario
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

    // Cliente admin para operacoes de banco e storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Busca workspace do usuario
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

    // ============================================
    // Verifica cache - com logica resiliente
    // Separa em: cache definitivo (boa qualidade) e cache provisorio (upgrade desejavel)
    // Ads com cache provisorio sao incluidos na resposta MAS tambem entram no adsToFetch
    // para tentativa de upgrade. Se o upgrade falhar, o cache provisorio garante exibicao.
    // ============================================
    const { data: cachedCreatives } = await supabaseAdmin
      .from("meta_ad_creatives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("ad_id", ad_ids);

    // cachedMap: todos os criativos com dados uteis (incluindo baixa qualidade)
    const cachedMap: Record<string, Record<string, unknown>> = {};
    // cachedAdIds: apenas os IDs que NAO precisam de re-fetch
    const cachedAdIds = new Set<string>();

    if (cachedCreatives) {
      for (const creative of cachedCreatives) {
        const hasImage = creative.thumbnail_url || creative.image_url;
        const hasTexts = creative.title || creative.body || creative.description;
        const hasUsefulData = hasImage || hasTexts;
        const maxAttemptsReached = (creative.fetch_attempts || 0) >= 3;
        const isFailed = creative.fetch_status === 'failed';

        const imageIsLowQuality = creative.image_url && isLowQualityUrl(creative.image_url);
        const hasCachedStorage = !!creative.cached_image_url;
        const needsUpgrade = imageIsLowQuality && !hasCachedStorage;

        if (hasUsefulData) {
          // Inclui no cachedMap para garantir que o frontend receba dados
          cachedMap[creative.ad_id] = creative;

          // Marca como "cache definitivo" (nao precisa re-fetch) somente se:
          // - Nao precisa de upgrade de qualidade
          // - OU ja falhou apos muitas tentativas
          if (!needsUpgrade || (maxAttemptsReached && isFailed)) {
            cachedAdIds.add(creative.ad_id);
          } else {
            console.log(`Ad ${creative.ad_id}: incluido no cache provisorio, tentara upgrade`);
          }
        } else if (maxAttemptsReached && isFailed) {
          cachedMap[creative.ad_id] = creative;
          cachedAdIds.add(creative.ad_id);
        }
      }
    }

    const adsToFetch = ad_ids.filter(id => !cachedAdIds.has(id));
    console.log(`Batch creative fetch: ${ad_ids.length} requested, ${cachedAdIds.size} cached OK, ${Object.keys(cachedMap).length - cachedAdIds.size} cached provisorio, ${adsToFetch.length} to fetch/upgrade`);

    // Se todos estao em cache definitivo, retorna
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

    // Se nao tem conexao Meta, retorna os dados em cache disponiveis em vez de erro
    if (!metaConnection || metaConnection.status !== "connected") {
      console.log("No valid Meta connection - returning cached data as fallback");
      return new Response(
        JSON.stringify({
          creatives: cachedMap,
          errors: {},
          cached_count: Object.keys(cachedMap).length,
          fetched_count: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

            // Passa supabaseAdmin para permitir upload ao Storage
            const { record, error } = await processAdResponse(
              adData,
              meta_ad_account_id,
              workspaceId,
              accessToken,
              supabaseAdmin
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

      const summary = recordsToUpsert.reduce((acc: { types: Record<string, number>; withCache: number }, record) => {
        const type = (record.creative_type as string) || 'unknown';
        acc.types[type] = (acc.types[type] || 0) + 1;
        if (record.cached_image_url) acc.withCache++;
        return acc;
      }, { types: {}, withCache: 0 });
      console.log('Resumo:', { types: summary.types, com_cache_storage: summary.withCache, total: recordsToUpsert.length });

      for (const record of recordsToUpsert) {
        // Tenta usar RPC com incremento de fetch_attempts
        const { error: upsertError } = await supabaseAdmin.rpc('upsert_ad_creative_with_increment', {
          p_workspace_id: record.workspace_id,
          p_ad_id: record.ad_id,
          p_meta_ad_account_id: record.meta_ad_account_id,
          p_meta_creative_id: record.meta_creative_id || null,
          p_creative_type: record.creative_type,
          p_image_url: record.image_url || null,
          p_image_url_hd: record.image_url_hd || null,
          p_thumbnail_url: record.thumbnail_url || null,
          p_thumbnail_quality: record.thumbnail_quality || 'unknown',
          p_image_width: record.image_width || null,
          p_image_height: record.image_height || null,
          p_video_url: record.video_url || null,
          p_video_id: record.video_id || null,
          p_preview_url: record.preview_url || null,
          p_title: record.title || null,
          p_body: record.body || null,
          p_description: record.description || null,
          p_call_to_action: record.call_to_action || null,
          p_link_url: record.link_url || null,
          p_is_complete: record.is_complete,
          p_fetch_status: record.fetch_status,
          p_error_message: record.error_message || null,
          p_extra_data: record.extra_data || {},
          p_cached_image_url: record.cached_image_url || null,
          p_cached_thumbnail_url: record.cached_thumbnail_url || null,
          p_cache_expires_at: record.cache_expires_at || null,
          p_file_size: record.file_size || null,
        });

        if (upsertError) {
          // Fallback: usa upsert direto se RPC nao existir
          if (upsertError.message?.includes('function') || upsertError.code === '42883') {
            const { error: fallbackError } = await supabaseAdmin
              .from("meta_ad_creatives")
              .upsert([record], { onConflict: "workspace_id,ad_id" });
            if (fallbackError) {
              console.error(`Erro no upsert fallback para ad ${record.ad_id}:`, fallbackError.message);
            }
          } else {
            console.error(`Erro no upsert para ad ${record.ad_id}:`, upsertError.message);
          }
        }
      }
      console.log(`${recordsToUpsert.length} criativos processados com sucesso`);
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
