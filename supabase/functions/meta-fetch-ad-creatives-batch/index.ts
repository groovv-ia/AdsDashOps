/**
 * Edge Function: meta-fetch-ad-creatives-batch
 *
 * Busca criativos de multiplos anuncios do Meta Ads API em lote.
 * Otimizado para buscar ate 50 ads por requisicao usando batch requests.
 *
 * POST /functions/v1/meta-fetch-ad-creatives-batch
 * Body: { ad_ids: string[], meta_ad_account_id: string }
 *
 * Retorna: {
 *   creatives: Record<string, MetaAdCreative>,
 *   errors: Record<string, string>,
 *   cached_count: number,
 *   fetched_count: number
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS para permitir chamadas do frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Limite de ads por batch (Meta permite ate 50)
const BATCH_SIZE = 50;

// Interface do payload da requisicao
interface RequestPayload {
  ad_ids: string[];
  meta_ad_account_id: string;
}

// Interface de erro da Meta API
interface MetaErrorResponse {
  error?: {
    message: string;
    code: number;
    type?: string;
  };
}

// Interface de dados do criativo retornado pela Meta
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

// Interface de resposta do anuncio da Meta
interface MetaAdResponse {
  id: string;
  name?: string;
  status?: string;
  creative?: MetaCreativeData;
  preview_shareable_link?: string;
  error?: MetaErrorResponse["error"];
}

// Interface de resposta de thumbnails de video
interface MetaVideoThumbnailResponse {
  thumbnails?: {
    data: Array<{
      uri: string;
      width: number;
      height: number;
    }>;
  };
  error?: MetaErrorResponse["error"];
}

// Interface de resposta de batch da Meta
interface MetaBatchResponse {
  code: number;
  body: string;
}

/**
 * Determina o tipo do criativo baseado nos dados
 */
function determineCreativeType(creative: MetaCreativeData): string {
  if (creative.video_id || creative.object_story_spec?.video_data?.video_id) {
    return 'video';
  }
  if (creative.image_url || creative.object_story_spec?.link_data?.picture) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Extrai dados do criativo para formato padronizado
 */
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

/**
 * Busca thumbnail de video da Meta API
 */
async function fetchVideoThumbnail(videoId: string, accessToken: string): Promise<string | null> {
  try {
    const videoUrl = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails&access_token=${accessToken}`;
    const response = await fetch(videoUrl);
    const data: MetaVideoThumbnailResponse = await response.json();

    if (data.thumbnails?.data && data.thumbnails.data.length > 0) {
      const sortedThumbnails = data.thumbnails.data.sort((a, b) => b.width - a.width);
      return sortedThumbnails[0].uri;
    }
  } catch (err) {
    console.error(`Error fetching video thumbnail for ${videoId}:`, err);
  }
  return null;
}

/**
 * Processa resposta de um ad individual
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

  // Busca thumbnail do video se necessario
  let thumbnailUrl = creativeData.image_url;
  if (creativeData.creative_type === 'video' && creativeData.video_id) {
    const videoThumbnail = await fetchVideoThumbnail(creativeData.video_id, accessToken);
    if (videoThumbnail) {
      thumbnailUrl = videoThumbnail;
    }
  }

  const creativeRecord = {
    workspace_id: workspaceId,
    ad_id: adData.id,
    meta_ad_account_id: metaAdAccountId,
    meta_creative_id: creativeData.meta_creative_id,
    creative_type: creativeData.creative_type,
    image_url: creativeData.image_url,
    thumbnail_url: thumbnailUrl,
    video_url: creativeData.video_id ? `https://www.facebook.com/ads/videos/${creativeData.video_id}` : null,
    video_id: creativeData.video_id,
    preview_url: creativeData.preview_url,
    title: creativeData.title,
    body: creativeData.body,
    description: creativeData.description,
    call_to_action: creativeData.call_to_action,
    link_url: creativeData.link_url,
    extra_data: {
      ad_name: adData.name,
      ad_status: adData.status,
      raw_creative: adData.creative,
    },
    fetched_at: new Date().toISOString(),
  };

  return { record: creativeRecord, error: null };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Valida metodo
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valida autorizacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse do payload
    const payload: RequestPayload = await req.json();
    const { ad_ids, meta_ad_account_id } = payload;

    // Valida campos obrigatorios
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

    // Inicializa clientes Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Valida usuario
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        JSON.stringify({
          error: "Nenhum workspace encontrado",
          details: "Voce precisa criar ou participar de um workspace para usar esta funcionalidade."
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica quais criativos ja estao em cache
    const { data: cachedCreatives } = await supabaseAdmin
      .from("meta_ad_creatives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("ad_id", ad_ids);

    // Mapeia criativos em cache por ad_id
    const cachedMap: Record<string, Record<string, unknown>> = {};
    const cachedAdIds = new Set<string>();

    if (cachedCreatives && cachedCreatives.length > 0) {
      for (const creative of cachedCreatives) {
        cachedMap[creative.ad_id] = creative;
        cachedAdIds.add(creative.ad_id);
      }
    }

    // Filtra ads que precisam ser buscados
    const adsToFetch = ad_ids.filter(id => !cachedAdIds.has(id));

    console.log(`Batch creative fetch: ${ad_ids.length} requested, ${cachedAdIds.size} cached, ${adsToFetch.length} to fetch`);

    // Se todos estao em cache, retorna imediatamente
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

    // Descriptografa token
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // Resultado final
    const creatives: Record<string, Record<string, unknown>> = { ...cachedMap };
    const errors: Record<string, string> = {};
    const recordsToUpsert: Record<string, unknown>[] = [];

    // Campos a buscar para cada ad
    const adFields = "id,name,status,creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,object_story_spec,effective_object_story_id},preview_shareable_link";

    // Processa em lotes de BATCH_SIZE
    for (let i = 0; i < adsToFetch.length; i += BATCH_SIZE) {
      const batch = adsToFetch.slice(i, i + BATCH_SIZE);

      // Usa batch request da Meta Graph API
      const batchRequests = batch.map(adId => ({
        method: "GET",
        relative_url: `${adId}?fields=${encodeURIComponent(adFields)}`,
      }));

      const batchUrl = `https://graph.facebook.com/v21.0/`;
      const batchBody = new URLSearchParams({
        access_token: accessToken,
        batch: JSON.stringify(batchRequests),
      });

      try {
        const batchResponse = await fetch(batchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: batchBody,
        });

        const batchResults: MetaBatchResponse[] = await batchResponse.json();

        // Processa cada resultado do batch
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
        // Marca todos os ads deste batch como erro
        for (const adId of batch) {
          if (!creatives[adId]) {
            errors[adId] = "Batch request failed";
          }
        }
      }
    }

    // Salva todos os novos criativos em lote
    if (recordsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("meta_ad_creatives")
        .upsert(recordsToUpsert, {
          onConflict: "workspace_id,ad_id",
        });

      if (upsertError) {
        console.error("Batch upsert error:", upsertError);
      } else {
        console.log(`Successfully saved ${recordsToUpsert.length} creatives`);
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