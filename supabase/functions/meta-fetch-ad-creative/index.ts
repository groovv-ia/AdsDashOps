/**
 * Edge Function: meta-fetch-ad-creative
 * 
 * Busca os dados do criativo de um anúncio do Meta Ads API e salva no cache.
 * 
 * POST /functions/v1/meta-fetch-ad-creative
 * Body: { ad_id: string, meta_ad_account_id: string, force_refresh?: boolean }
 * 
 * Retorna: { creative: MetaAdCreative }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrão para todas as respostas
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para o payload da requisição
interface RequestPayload {
  ad_id: string;
  meta_ad_account_id: string;
  force_refresh?: boolean;
}

// Interface para resposta de erro do Meta API
interface MetaErrorResponse {
  error?: {
    message: string;
    code: number;
    type?: string;
  };
}

// Interface para dados do criativo retornado pelo Meta
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

// Interface para resposta do Ad com criativo
interface MetaAdResponse {
  id: string;
  name?: string;
  status?: string;
  creative?: MetaCreativeData;
  preview_shareable_link?: string;
  error?: MetaErrorResponse["error"];
}

// Interface para resposta de thumbnails de vídeo
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

// Função para determinar o tipo de criativo
function determineCreativeType(creative: MetaCreativeData): string {
  if (creative.video_id || creative.object_story_spec?.video_data?.video_id) {
    return 'video';
  }
  if (creative.image_url || creative.object_story_spec?.link_data?.picture) {
    return 'image';
  }
  return 'unknown';
}

// Função para extrair dados do criativo de forma normalizada
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
  // Trata requisições OPTIONS para CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Valida método HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valida header de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse do body da requisição
    const payload: RequestPayload = await req.json();
    const { ad_id, meta_ad_account_id, force_refresh = false } = payload;

    // Valida campos obrigatórios
    if (!ad_id || !meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ad_id, meta_ad_account_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializa clientes Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuário autenticado
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

    // Busca o workspace do usuário
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

    // Verifica se já existe cache e não é refresh forçado
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

    // Busca a conexão Meta do workspace
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

    // Descriptografa o token de acesso
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // Busca dados do anúncio e criativo do Meta API
    const adFields = "id,name,status,creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,object_story_spec,effective_object_story_id},preview_shareable_link";
    const adUrl = `https://graph.facebook.com/v21.0/${ad_id}?fields=${adFields}&access_token=${accessToken}`;
    
    const adResponse = await fetch(adUrl);
    const adData: MetaAdResponse = await adResponse.json();

    if (adData.error) {
      return new Response(
        JSON.stringify({ 
          error: "Meta API error", 
          details: adData.error.message 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrai dados do criativo
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

    // Se for vídeo, busca thumbnail
    let thumbnailUrl = creativeData.image_url;
    if (creativeData.creative_type === 'video' && creativeData.video_id) {
      const videoUrl = `https://graph.facebook.com/v21.0/${creativeData.video_id}?fields=thumbnails&access_token=${accessToken}`;
      const videoResponse = await fetch(videoUrl);
      const videoData: MetaVideoThumbnailResponse = await videoResponse.json();
      
      if (videoData.thumbnails?.data && videoData.thumbnails.data.length > 0) {
        // Pega o thumbnail de maior resolução
        const sortedThumbnails = videoData.thumbnails.data.sort((a, b) => b.width - a.width);
        thumbnailUrl = sortedThumbnails[0].uri;
      }
    }

    // Prepara dados para salvar no banco
    const creativeRecord = {
      workspace_id: workspace.id,
      ad_id: ad_id,
      meta_ad_account_id: meta_ad_account_id,
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

    // Upsert no banco de dados (atualiza se já existir)
    const { data: savedCreative, error: upsertError } = await supabaseAdmin
      .from("meta_ad_creatives")
      .upsert(creativeRecord, {
        onConflict: "workspace_id,ad_id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      // Retorna os dados mesmo se o save falhar
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
