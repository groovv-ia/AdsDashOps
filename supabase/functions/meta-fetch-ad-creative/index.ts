/**
 * Edge Function: meta-fetch-ad-creative
 *
 * Busca os dados do criativo de um anuncio do Meta Ads API e salva no cache.
 * Otimizado para buscar thumbnails em HD e garantir 100% de sincronizacao.
 *
 * POST /functions/v1/meta-fetch-ad-creative
 * Body: { ad_id: string, meta_ad_account_id: string, force_refresh?: boolean }
 *
 * Retorna: { creative: MetaAdCreative }
 *
 * Melhorias:
 * - Busca thumbnails em HD priorizando maior resolucao
 * - Detecta qualidade da imagem (hd/sd/low)
 * - Extrai dimensoes das imagens
 * - Sistema de retry com tracking de tentativas
 * - Validacao de completude dos dados
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  ad_id: string;
  meta_ad_account_id: string;
  force_refresh?: boolean;
}

interface MetaErrorResponse {
  error?: {
    message: string;
    code: number;
    type?: string;
  };
}

interface MetaCreativeData {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
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
    };
    video_data?: {
      message?: string;
      title?: string;
      link_description?: string;
      video_id?: string;
      image_url?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
    };
  };
  effective_object_story_id?: string;
}

interface MetaAdResponse {
  id: string;
  name?: string;
  status?: string;
  creative?: MetaCreativeData;
  preview_shareable_link?: string;
  error?: MetaErrorResponse["error"];
}

interface MetaVideoThumbnailResponse {
  thumbnails?: {
    data: Array<{
      uri: string;
      width: number;
      height: number;
    }>;
  };
  picture?: string;
  source?: string; // URL direta do vídeo (reproduzível)
  format?: Array<{
    embed_html?: string;
    filter?: string;
    height?: number;
    width?: number;
    picture?: string;
  }>;
  length?: number; // Duração em segundos
  error?: MetaErrorResponse["error"];
}

// Interface para resultado de imagem com qualidade
interface ImageResult {
  url: string | null;
  url_hd: string | null;
  width: number | null;
  height: number | null;
  quality: 'hd' | 'sd' | 'low' | 'unknown';
}

// Interface para resultado de vídeo com metadados completos
interface VideoResult {
  videoSourceUrl: string | null; // URL direta do vídeo (campo "source")
  videoDuration: number | null; // Duração em segundos
  videoFormat: string | null; // Formato do vídeo (mp4, webm, etc.)
  thumbnail: ImageResult; // Thumbnail do vídeo
}

/**
 * Determina qualidade da imagem baseado nas dimensões
 */
function determineImageQuality(width: number | null, height: number | null): 'hd' | 'sd' | 'low' | 'unknown' {
  if (!width || !height) return 'unknown';

  // HD: >= 1280x720 ou >= 720x1280 (landscape ou portrait)
  if ((width >= 1280 && height >= 720) || (width >= 720 && height >= 1280)) {
    return 'hd';
  }

  // SD: >= 640x480 ou >= 480x640
  if ((width >= 640 && height >= 480) || (width >= 480 && height >= 640)) {
    return 'sd';
  }

  // Low: qualquer coisa menor
  if (width > 0 && height > 0) {
    return 'low';
  }

  return 'unknown';
}

/**
 * Busca dados completos do vídeo incluindo source URL e metadados
 */
async function fetchVideoDataComplete(
  videoId: string,
  accessToken: string
): Promise<VideoResult> {
  try {
    // Busca thumbnails, picture, source, length e format do video
    const videoUrl = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture,source,length,format&access_token=${accessToken}`;
    const videoResponse = await fetch(videoUrl);
    const videoData: MetaVideoThumbnailResponse = await videoResponse.json();

    if (videoData.error) {
      console.error(`Video data error for ${videoId}:`, videoData.error);
      return {
        videoSourceUrl: null,
        videoDuration: null,
        videoFormat: null,
        thumbnail: { url: null, url_hd: null, width: null, height: null, quality: 'unknown' }
      };
    }

    // Extrai URL direta do vídeo (campo "source")
    const videoSourceUrl = videoData.source || null;

    // Extrai duração em segundos
    const videoDuration = videoData.length || null;

    // Tenta determinar formato do vídeo
    let videoFormat: string | null = null;
    if (videoSourceUrl) {
      // Extrai extensão da URL
      const urlLower = videoSourceUrl.toLowerCase();
      if (urlLower.includes('.mp4')) videoFormat = 'mp4';
      else if (urlLower.includes('.webm')) videoFormat = 'webm';
      else if (urlLower.includes('.mov')) videoFormat = 'mov';
      else videoFormat = 'mp4'; // Default
    }

    let bestThumbnail: { uri: string; width: number; height: number } | null = null;
    let hdThumbnail: { uri: string; width: number; height: number } | null = null;

    // Processa thumbnails se existirem
    if (videoData.thumbnails?.data && videoData.thumbnails.data.length > 0) {
      // Ordena por tamanho (maior primeiro)
      const sorted = videoData.thumbnails.data.sort((a, b) => (b.width * b.height) - (a.width * a.height));

      bestThumbnail = sorted[0];

      // Busca thumbnail HD (>= 1280x720)
      hdThumbnail = sorted.find(t => t.width >= 1280 && t.height >= 720) || null;
    }

    // Monta resultado do thumbnail
    let thumbnailResult: ImageResult;

    // Se temos thumbnail HD, usa ele como principal
    if (hdThumbnail) {
      const quality = determineImageQuality(hdThumbnail.width, hdThumbnail.height);
      thumbnailResult = {
        url: hdThumbnail.uri,
        url_hd: hdThumbnail.uri,
        width: hdThumbnail.width,
        height: hdThumbnail.height,
        quality,
      };
    }
    // Se temos thumbnail normal, usa como fallback
    else if (bestThumbnail) {
      const quality = determineImageQuality(bestThumbnail.width, bestThumbnail.height);
      thumbnailResult = {
        url: bestThumbnail.uri,
        url_hd: null,
        width: bestThumbnail.width,
        height: bestThumbnail.height,
        quality,
      };
    }
    // Fallback para picture do video
    else if (videoData.picture) {
      thumbnailResult = {
        url: videoData.picture,
        url_hd: null,
        width: null,
        height: null,
        quality: 'unknown',
      };
    }
    // Sem thumbnail disponível
    else {
      thumbnailResult = { url: null, url_hd: null, width: null, height: null, quality: 'unknown' };
    }

    return {
      videoSourceUrl,
      videoDuration,
      videoFormat,
      thumbnail: thumbnailResult,
    };
  } catch (err) {
    console.error(`Error fetching video data for ${videoId}:`, err);
    return {
      videoSourceUrl: null,
      videoDuration: null,
      videoFormat: null,
      thumbnail: { url: null, url_hd: null, width: null, height: null, quality: 'unknown' }
    };
  }
}

/**
 * Processa URL de imagem e tenta determinar dimensões e qualidade
 */
function processImageUrl(imageUrl: string | null): ImageResult {
  if (!imageUrl) {
    return { url: null, url_hd: null, width: null, height: null, quality: 'unknown' };
  }

  // Tenta extrair dimensões da URL (alguns endpoints incluem dimensões)
  // Exemplo: .../image.jpg?width=1200&height=630
  let width: number | null = null;
  let height: number | null = null;

  try {
    const url = new URL(imageUrl);
    const widthParam = url.searchParams.get('width') || url.searchParams.get('w');
    const heightParam = url.searchParams.get('height') || url.searchParams.get('h');

    if (widthParam) width = parseInt(widthParam, 10);
    if (heightParam) height = parseInt(heightParam, 10);
  } catch (e) {
    // URL inválida ou sem parâmetros, continua sem dimensões
  }

  const quality = determineImageQuality(width, height);

  return {
    url: imageUrl,
    url_hd: imageUrl,
    width,
    height,
    quality,
  };
}

function determineCreativeType(creative: MetaCreativeData): string {
  if (creative.video_id || creative.object_story_spec?.video_data?.video_id) {
    return 'video';
  }
  if (creative.image_url || creative.object_story_spec?.link_data?.picture) {
    return 'image';
  }
  return 'unknown';
}

function extractCreativeData(creative: MetaCreativeData, previewUrl?: string) {
  const linkData = creative.object_story_spec?.link_data;
  const videoData = creative.object_story_spec?.video_data;
  
  return {
    meta_creative_id: creative.id || null,
    creative_type: determineCreativeType(creative),
    image_url: creative.image_url || linkData?.picture || videoData?.image_url || null,
    video_id: creative.video_id || videoData?.video_id || null,
    title: creative.title || linkData?.name || videoData?.title || null,
    body: creative.body || linkData?.message || videoData?.message || null,
    description: linkData?.description || videoData?.link_description || null,
    call_to_action: creative.call_to_action_type || 
                    linkData?.call_to_action?.type || 
                    videoData?.call_to_action?.type || null,
    link_url: linkData?.link || videoData?.call_to_action?.value?.link || null,
    preview_url: previewUrl || null,
  };
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
    const { ad_id, meta_ad_account_id, force_refresh = false } = payload;

    if (!ad_id || !meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ad_id, meta_ad_account_id" }),
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
        JSON.stringify({
          error: "Nenhum workspace encontrado",
          details: "Voce precisa criar ou participar de um workspace para usar esta funcionalidade."
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspace = { id: workspaceId };

    if (!force_refresh) {
      const { data: cachedCreative } = await supabaseAdmin
        .from("meta_ad_creatives")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("ad_id", ad_id)
        .maybeSingle();

      if (cachedCreative) {
        return new Response(
          JSON.stringify({ 
            creative: cachedCreative, 
            cached: true 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspace.id)
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

    const adFields = "id,name,status,creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,object_story_spec,effective_object_story_id},preview_shareable_link";
    const adUrl = `https://graph.facebook.com/v21.0/${ad_id}?fields=${adFields}&access_token=${accessToken}`;
    
    const adResponse = await fetch(adUrl);
    const adData: MetaAdResponse = await adResponse.json();

    if (adData.error) {
      console.error("Meta API error:", adData.error);
      const errorCode = adData.error.code;
      const errorMessage = adData.error.message;

      let userMessage = "Erro ao buscar dados do anuncio na Meta";
      if (errorCode === 100 || errorCode === 190) {
        userMessage = "Token de acesso expirado ou invalido. Reconecte sua conta Meta.";
      } else if (errorCode === 803 || errorCode === 17) {
        userMessage = "Anuncio nao encontrado ou voce nao tem permissao para acessa-lo.";
      } else if (errorCode === 4 || errorCode === 32) {
        userMessage = "Limite de requisicoes da Meta atingido. Aguarde e tente novamente.";
      } else if (errorMessage) {
        userMessage = errorMessage;
      }

      return new Response(
        JSON.stringify({
          error: userMessage,
          details: errorMessage,
          code: errorCode
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creativeData = adData.creative
      ? extractCreativeData(adData.creative, adData.preview_shareable_link)
      : {
          meta_creative_id: null,
          creative_type: 'unknown',
          image_url: null,
          video_id: null,
          title: null,
          body: null,
          description: null,
          call_to_action: null,
          link_url: null,
          preview_url: adData.preview_shareable_link || null,
        };

    // Busca imagem/thumbnail em HD e dados de vídeo se aplicável
    let imageResult: ImageResult;
    let videoResult: VideoResult | null = null;

    if (creativeData.creative_type === 'video' && creativeData.video_id) {
      // Para videos, busca dados completos (thumbnail, source URL, duração, formato)
      videoResult = await fetchVideoDataComplete(creativeData.video_id, accessToken);
      imageResult = videoResult.thumbnail;
    } else if (creativeData.image_url) {
      // Para imagens, processa a URL existente
      imageResult = processImageUrl(creativeData.image_url);
    } else {
      // Sem imagem disponível
      imageResult = { url: null, url_hd: null, width: null, height: null, quality: 'unknown' };
    }

    // Incrementa contador de tentativas de fetch do cache se existir
    const { data: existingCreative } = await supabaseAdmin
      .from("meta_ad_creatives")
      .select("fetch_attempts")
      .eq("workspace_id", workspace.id)
      .eq("ad_id", ad_id)
      .maybeSingle();

    const fetchAttempts = (existingCreative?.fetch_attempts || 0) + 1;

    // Determina se o criativo está completo (tem imagem OU textos)
    const hasImage = !!(imageResult.url || creativeData.image_url);
    const hasTexts = !!(creativeData.title || creativeData.body || creativeData.description);
    const isComplete = hasImage || hasTexts;

    // Determina status do fetch
    let fetchStatus: 'success' | 'partial' | 'failed' | 'pending';
    if (hasImage && hasTexts) {
      fetchStatus = 'success';
    } else if (hasImage || hasTexts) {
      fetchStatus = 'partial';
    } else if (fetchAttempts >= 3) {
      fetchStatus = 'failed';
    } else {
      fetchStatus = 'pending';
    }

    const creativeRecord = {
      workspace_id: workspace.id,
      ad_id: ad_id,
      meta_ad_account_id: meta_ad_account_id,
      meta_creative_id: creativeData.meta_creative_id,
      creative_type: creativeData.creative_type,
      image_url: imageResult.url || creativeData.image_url,
      image_url_hd: imageResult.url_hd,
      thumbnail_url: imageResult.url || creativeData.image_url,
      thumbnail_quality: imageResult.quality,
      image_width: imageResult.width,
      image_height: imageResult.height,
      video_url: creativeData.video_id ? `https://www.facebook.com/ads/videos/${creativeData.video_id}` : null,
      video_id: creativeData.video_id,
      video_source_url: videoResult?.videoSourceUrl || null, // URL direta do vídeo (campo "source")
      video_duration: videoResult?.videoDuration || null, // Duração em segundos
      video_format: videoResult?.videoFormat || null, // Formato do vídeo (mp4, webm, etc.)
      preview_url: creativeData.preview_url,
      title: creativeData.title,
      body: creativeData.body,
      description: creativeData.description,
      call_to_action: creativeData.call_to_action,
      link_url: creativeData.link_url,
      is_complete: isComplete,
      fetch_status: fetchStatus,
      fetch_attempts: fetchAttempts,
      last_validated_at: new Date().toISOString(),
      error_message: null,
      extra_data: {
        ad_name: adData.name,
        ad_status: adData.status,
        raw_creative: adData.creative,
      },
      fetched_at: new Date().toISOString(),
    };

    const { data: savedCreative, error: upsertError } = await supabaseAdmin
      .from("meta_ad_creatives")
      .upsert(creativeRecord, {
        onConflict: "workspace_id,ad_id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ 
          creative: creativeRecord, 
          cached: false,
          save_error: upsertError.message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        creative: savedCreative, 
        cached: false 
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
