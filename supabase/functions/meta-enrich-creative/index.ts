/**
 * Edge Function: meta-enrich-creative
 *
 * Enriquece um criativo de anuncio buscando diretamente na API do Meta,
 * sem consultar o cache local. Busca imagens em alta resolucao, extrai
 * todos os dados do criativo (textos, links, dimensoes) e salva no banco.
 *
 * Diferenca do meta-fetch-ad-creative:
 * - SEMPRE vai direto na API do Meta (ignora cache completamente)
 * - Busca o criativo pelo ID do post original (effective_object_story_id)
 *   para obter a midia em resolucao maxima
 * - Marca o criativo como enriquecido (needs_enrichment=false, enriched_at=now)
 * - Ideal para chamadas manuais de "atualizar criativo"
 *
 * POST /functions/v1/meta-enrich-creative
 * Body: { ad_id: string, meta_ad_account_id: string }
 *
 * Retorna: { creative: MetaAdCreative, enriched: true }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Interfaces ────────────────────────────────────────────────────────────────

interface RequestPayload {
  ad_id: string;
  meta_ad_account_id: string;
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
  effective_object_story_id?: string;
  asset_feed_spec?: {
    images?: Array<{ hash: string; url?: string }>;
    videos?: Array<{ video_id: string }>;
    bodies?: Array<{ text: string }>;
    titles?: Array<{ text: string }>;
    link_urls?: Array<{ website_url: string }>;
    call_to_action_types?: string[];
  };
  object_story_spec?: {
    link_data?: {
      message?: string;
      name?: string;
      description?: string;
      link?: string;
      image_hash?: string;
      picture?: string;
      child_attachments?: Array<{
        name?: string;
        description?: string;
        link?: string;
        picture?: string;
        image_hash?: string;
        call_to_action?: { type?: string };
      }>;
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
}

interface MetaAdResponse {
  id: string;
  name?: string;
  status?: string;
  creative?: MetaCreativeData;
  preview_shareable_link?: string;
  error?: { message: string; code: number; type?: string };
}

interface MetaVideoThumbnailResponse {
  thumbnails?: {
    data: Array<{ uri: string; width: number; height: number }>;
  };
  picture?: string;
  error?: { message: string; code: number };
}

interface MetaPostMediaResponse {
  full_picture?: string;
  picture?: string;
  attachments?: {
    data: Array<{
      media?: { image?: { src: string; width: number; height: number } };
      subattachments?: {
        data: Array<{
          media?: { image?: { src: string; width: number; height: number } };
        }>;
      };
    }>;
  };
  error?: { message: string; code: number };
}

interface MetaAdImageResponse {
  data?: Array<{ hash: string; url: string; url_128: string; width: number; height: number }>;
  error?: { message: string; code: number };
}

interface ImageResult {
  url: string | null;
  url_hd: string | null;
  width: number | null;
  height: number | null;
  quality: "hd" | "sd" | "low" | "unknown";
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Determina qualidade da imagem com base nas dimensoes
 */
function determineImageQuality(
  width: number | null,
  height: number | null
): "hd" | "sd" | "low" | "unknown" {
  if (!width || !height) return "unknown";
  if ((width >= 1280 && height >= 720) || (width >= 720 && height >= 1280)) return "hd";
  if ((width >= 640 && height >= 480) || (width >= 480 && height >= 640)) return "sd";
  if (width > 0 && height > 0) return "low";
  return "unknown";
}

/**
 * Extrai dimensoes de uma URL de imagem Meta (parametros ?width= e ?height=)
 */
function extractDimensionsFromUrl(
  imageUrl: string
): { width: number | null; height: number | null } {
  try {
    const url = new URL(imageUrl);
    const w = url.searchParams.get("width") || url.searchParams.get("w");
    const h = url.searchParams.get("height") || url.searchParams.get("h");
    return {
      width: w ? parseInt(w, 10) : null,
      height: h ? parseInt(h, 10) : null,
    };
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Busca thumbnail de video em HD — ordena por resolucao e pega o maior
 */
async function fetchVideoThumbnailHD(
  videoId: string,
  accessToken: string
): Promise<ImageResult> {
  try {
    const url = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture,source&access_token=${accessToken}`;
    const res = await fetch(url);
    const data: MetaVideoThumbnailResponse = await res.json();

    if (data.error) {
      console.error(`[enrich] Video thumbnail error for ${videoId}:`, data.error);
      return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
    }

    if (data.thumbnails?.data && data.thumbnails.data.length > 0) {
      const sorted = [...data.thumbnails.data].sort(
        (a, b) => b.width * b.height - a.width * a.height
      );
      const best = sorted[0];
      const hd = sorted.find((t) => t.width >= 1280 && t.height >= 720) || best;
      const quality = determineImageQuality(hd.width, hd.height);
      return {
        url: best.uri,
        url_hd: hd.uri,
        width: hd.width,
        height: hd.height,
        quality,
      };
    }

    if (data.picture) {
      return { url: data.picture, url_hd: null, width: null, height: null, quality: "unknown" };
    }

    return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
  } catch (err) {
    console.error(`[enrich] Error fetching video thumbnail for ${videoId}:`, err);
    return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
  }
}

/**
 * Busca a imagem em alta resolucao a partir do post original (effective_object_story_id)
 * Usa o endpoint /post/attachments para obter full_picture
 */
async function fetchImageFromPost(
  postId: string,
  accessToken: string
): Promise<ImageResult> {
  try {
    const url = `https://graph.facebook.com/v21.0/${postId}?fields=full_picture,picture,attachments{media,subattachments{media}}&access_token=${accessToken}`;
    const res = await fetch(url);
    const data: MetaPostMediaResponse = await res.json();

    if (data.error) {
      console.warn(`[enrich] Post media error for ${postId}:`, data.error);
      return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
    }

    // full_picture e a imagem em maior resolucao disponivel via post
    if (data.full_picture) {
      const { width, height } = extractDimensionsFromUrl(data.full_picture);
      const quality = determineImageQuality(width, height);
      return { url: data.full_picture, url_hd: data.full_picture, width, height, quality };
    }

    // Tenta attachments como fallback
    const attachment = data.attachments?.data?.[0];
    const img = attachment?.media?.image;
    if (img?.src) {
      const quality = determineImageQuality(img.width || null, img.height || null);
      return { url: img.src, url_hd: img.src, width: img.width || null, height: img.height || null, quality };
    }

    if (data.picture) {
      return { url: data.picture, url_hd: null, width: null, height: null, quality: "unknown" };
    }

    return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
  } catch (err) {
    console.warn(`[enrich] Could not fetch from post ${postId}:`, err);
    return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
  }
}

/**
 * Busca imagens via adimages API usando o hash da imagem
 * Retorna a URL de maior resolucao disponivel
 */
async function fetchImageByHash(
  adAccountId: string,
  imageHash: string,
  accessToken: string
): Promise<ImageResult> {
  try {
    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/adimages?hashes[]=${imageHash}&fields=hash,url,url_128,width,height&access_token=${accessToken}`;
    const res = await fetch(url);
    const data: MetaAdImageResponse = await res.json();

    if (data.error || !data.data || data.data.length === 0) {
      return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
    }

    const img = data.data[0];
    const quality = determineImageQuality(img.width || null, img.height || null);
    return {
      url: img.url || null,
      url_hd: img.url || null,
      width: img.width || null,
      height: img.height || null,
      quality,
    };
  } catch (err) {
    console.warn(`[enrich] Error fetching image by hash ${imageHash}:`, err);
    return { url: null, url_hd: null, width: null, height: null, quality: "unknown" };
  }
}

/**
 * Determina o tipo de criativo com base nos dados da API
 */
function determineCreativeType(creative: MetaCreativeData): string {
  if (creative.video_id || creative.object_story_spec?.video_data?.video_id) return "video";
  const linkData = creative.object_story_spec?.link_data;
  if (linkData?.child_attachments && linkData.child_attachments.length > 1) return "carousel";
  if (creative.asset_feed_spec) return "dynamic";
  if (creative.image_url || linkData?.picture) return "image";
  return "unknown";
}

// ── Handler principal ─────────────────────────────────────────────────────────

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
    const { ad_id, meta_ad_account_id } = payload;

    if (!ad_id || !meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ad_id, meta_ad_account_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria clientes Supabase — um autenticado com o token do usuario, outro com service role
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

    // Resolve workspace do usuario
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

      if (memberWorkspace) workspaceId = memberWorkspace.workspace_id;
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Nenhum workspace encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca conexao Meta do workspace
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Nenhuma conexao Meta valida encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa token
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // ── 1. Busca dados completos do anuncio + criativo na API do Meta ──────────
    // Inclui effective_object_story_id e asset_feed_spec para acesso a midia HD
    const adFields = "id,name,status,creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,object_story_spec,effective_object_story_id,asset_feed_spec},preview_shareable_link";

    const adUrl = `https://graph.facebook.com/v21.0/${ad_id}?fields=${adFields}&access_token=${accessToken}`;
    const adResponse = await fetch(adUrl);
    const adData: MetaAdResponse = await adResponse.json();

    if (adData.error) {
      console.error("[enrich] Meta API error:", adData.error);
      const code = adData.error.code;
      let msg = adData.error.message || "Erro ao buscar anuncio na Meta";
      if (code === 100 || code === 190) msg = "Token de acesso expirado. Reconecte sua conta Meta.";
      else if (code === 803 || code === 17) msg = "Anuncio nao encontrado ou sem permissao.";
      else if (code === 4 || code === 32) msg = "Limite de requisicoes atingido. Aguarde e tente novamente.";

      return new Response(
        JSON.stringify({ error: msg, code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const c = adData.creative;
    const linkData = c?.object_story_spec?.link_data;
    const videoData = c?.object_story_spec?.video_data;

    // Identifica tipo de criativo
    const creativeType = c ? determineCreativeType(c) : "unknown";
    const videoId = c?.video_id || videoData?.video_id || null;
    const effectivePostId = c?.effective_object_story_id || null;

    // Coleta image hashes disponiveis para tentar buscar em HD
    const imageHashes: string[] = [];
    if (linkData?.image_hash) imageHashes.push(linkData.image_hash);
    if (c?.asset_feed_spec?.images) {
      c.asset_feed_spec.images.forEach((img) => {
        if (img.hash && !imageHashes.includes(img.hash)) imageHashes.push(img.hash);
      });
    }
    // Hashes de slides de carrossel
    if (linkData?.child_attachments) {
      linkData.child_attachments.forEach((slide) => {
        if (slide.image_hash && !imageHashes.includes(slide.image_hash)) {
          imageHashes.push(slide.image_hash);
        }
      });
    }

    // ── 2. Busca imagem em maxima resolucao disponivel ────────────────────────
    let imageResult: ImageResult = { url: null, url_hd: null, width: null, height: null, quality: "unknown" };

    if (creativeType === "video" && videoId) {
      // Para videos: busca thumbnail em HD
      console.log("[enrich] Fetching HD video thumbnail for", videoId);
      imageResult = await fetchVideoThumbnailHD(videoId, accessToken);
    } else if (effectivePostId) {
      // Prioritario: busca pelo post original (full_picture = maior resolucao)
      console.log("[enrich] Fetching from effective post:", effectivePostId);
      imageResult = await fetchImageFromPost(effectivePostId, accessToken);
    }

    // Fallback: tenta via hash da imagem na adimages API
    if (!imageResult.url && imageHashes.length > 0) {
      console.log("[enrich] Fetching by image hash:", imageHashes[0]);
      const cleanAccountId = meta_ad_account_id.replace(/^act_/, "");
      imageResult = await fetchImageByHash(cleanAccountId, imageHashes[0], accessToken);
    }

    // Fallback: usa imagens da API direto (pode ter menor resolucao)
    if (!imageResult.url) {
      const fallbackUrl = c?.image_url || linkData?.picture || videoData?.image_url || null;
      if (fallbackUrl) {
        const { width, height } = extractDimensionsFromUrl(fallbackUrl);
        imageResult = { url: fallbackUrl, url_hd: fallbackUrl, width, height, quality: determineImageQuality(width, height) };
      }
    }

    // ── 3. Extrai textos do criativo ──────────────────────────────────────────
    const title = c?.title || linkData?.name || videoData?.title
      || c?.asset_feed_spec?.titles?.[0]?.text || null;

    const body = c?.body || linkData?.message || videoData?.message
      || c?.asset_feed_spec?.bodies?.[0]?.text || null;

    const description = linkData?.description || videoData?.link_description || null;

    const callToAction = c?.call_to_action_type
      || linkData?.call_to_action?.type
      || videoData?.call_to_action?.type
      || c?.asset_feed_spec?.call_to_action_types?.[0]
      || null;

    const linkUrl = linkData?.link
      || videoData?.call_to_action?.value?.link
      || c?.asset_feed_spec?.link_urls?.[0]?.website_url
      || null;

    // ── 4. Determina completude e status ──────────────────────────────────────
    const hasImage = !!(imageResult.url);
    const hasTexts = !!(title || body || description);
    const isComplete = hasImage || hasTexts;

    let fetchStatus: "success" | "partial" | "failed";
    if (hasImage && hasTexts) fetchStatus = "success";
    else if (hasImage || hasTexts) fetchStatus = "partial";
    else fetchStatus = "failed";

    const now = new Date().toISOString();

    // ── 5. Monta registro para upsert ─────────────────────────────────────────
    const creativeRecord = {
      workspace_id: workspaceId,
      ad_id,
      meta_ad_account_id,
      meta_creative_id: c?.id || null,
      creative_type: creativeType,
      image_url: imageResult.url || c?.image_url || linkData?.picture || null,
      image_url_hd: imageResult.url_hd,
      thumbnail_url: imageResult.url || c?.thumbnail_url || null,
      thumbnail_quality: imageResult.quality,
      image_width: imageResult.width,
      image_height: imageResult.height,
      video_url: videoId ? `https://www.facebook.com/ads/videos/${videoId}` : null,
      video_id: videoId,
      preview_url: adData.preview_shareable_link || null,
      title,
      body,
      description,
      call_to_action: callToAction,
      link_url: linkUrl,
      is_complete: isComplete,
      fetch_status: fetchStatus,
      last_validated_at: now,
      error_message: null,
      // Campos de enriquecimento
      needs_enrichment: false,
      enriched_at: now,
      fetched_at: now,
      extra_data: {
        ad_name: adData.name,
        ad_status: adData.status,
        raw_creative: adData.creative,
        enriched_via: "meta-enrich-creative",
      },
    };

    const { data: savedCreative, error: upsertError } = await supabaseAdmin
      .from("meta_ad_creatives")
      .upsert(creativeRecord, { onConflict: "workspace_id,ad_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("[enrich] Upsert error:", upsertError);
      // Retorna os dados mesmo sem salvar
      return new Response(
        JSON.stringify({ creative: creativeRecord, enriched: true, save_error: upsertError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[enrich] Creative enriched successfully:", {
      ad_id,
      type: creativeType,
      quality: imageResult.quality,
      fetch_status: fetchStatus,
    });

    return new Response(
      JSON.stringify({ creative: savedCreative, enriched: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[enrich] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
