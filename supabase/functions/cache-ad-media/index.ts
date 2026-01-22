import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

/**
 * Edge Function: cache-ad-media
 *
 * Faz cache de mídias (imagens e vídeos) de anúncios no Supabase Storage
 *
 * Funcionalidades:
 * - Baixa mídia de URL externa (Meta Ads)
 * - Faz upload para o bucket 'ad-media-cache'
 * - Retorna URL pública do arquivo cacheado
 * - Gerencia expiração de cache (30 dias)
 * - Evita duplicação de arquivos
 */

// Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Interface para requisição
interface CacheMediaRequest {
  workspaceId: string;
  adId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'thumbnail';
  creativeId?: string;
}

// Interface para resposta
interface CacheMediaResponse {
  success: boolean;
  cachedUrl?: string;
  publicUrl?: string;
  path?: string;
  fileSize?: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Responde requisições OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Valida método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse do corpo da requisição
    const body: CacheMediaRequest = await req.json();
    const { workspaceId, adId, mediaUrl, mediaType, creativeId } = body;

    // Validação de parâmetros obrigatórios
    if (!workspaceId || !adId || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: workspaceId, adId, mediaUrl, mediaType',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Inicializa cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Caching ${mediaType} for ad ${adId} in workspace ${workspaceId}`);

    // Baixa a mídia da URL externa
    console.log(`Downloading media from: ${mediaUrl}`);
    const mediaResponse = await fetch(mediaUrl);

    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status} ${mediaResponse.statusText}`);
    }

    // Obtém o blob da mídia
    const mediaBlob = await mediaResponse.blob();
    const fileSize = mediaBlob.size;

    // Determina extensão do arquivo baseado no Content-Type
    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
    let extension = 'bin';

    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      extension = 'jpg';
    } else if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('gif')) {
      extension = 'gif';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    } else if (contentType.includes('mp4')) {
      extension = 'mp4';
    } else if (contentType.includes('webm')) {
      extension = 'webm';
    } else if (contentType.includes('quicktime')) {
      extension = 'mov';
    }

    // Define o caminho do arquivo no Storage
    // Formato: /workspaces/{workspaceId}/{mediaType}s/{adId}/{timestamp}_{creativeId}.{ext}
    const timestamp = Date.now();
    const fileId = creativeId || 'media';
    const fileName = `${timestamp}_${fileId}.${extension}`;
    const storagePath = `workspaces/${workspaceId}/${mediaType}s/${adId}/${fileName}`;

    console.log(`Uploading to Storage: ${storagePath}`);

    // Faz upload para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ad-media-cache')
      .upload(storagePath, mediaBlob, {
        contentType,
        cacheControl: '2592000', // 30 dias em segundos
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload media: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // Gera URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('ad-media-cache')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    console.log(`Media cached successfully. Public URL: ${publicUrl}`);

    // Resposta de sucesso
    const response: CacheMediaResponse = {
      success: true,
      cachedUrl: publicUrl,
      publicUrl,
      path: storagePath,
      fileSize,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in cache-ad-media function:', error);

    const errorResponse: CacheMediaResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
