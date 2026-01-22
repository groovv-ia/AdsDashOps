import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

/**
 * Edge Function: analyze-creative-claude
 *
 * Analisa criativos de anúncios usando Claude 3.5 Sonnet
 *
 * Funcionalidades:
 * - Análise visual completa de imagens
 * - Análise de vídeos (via thumbnails e metadados)
 * - Análise de copy/texto
 * - Pontuação AIDA (Attention, Interest, Desire, Action)
 * - Recomendações de melhoria
 * - Armazenamento de resultados
 */

// Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Interface para requisição
interface AnalyzeCreativeRequest {
  creativeId: string;
  forceReanalysis?: boolean;
}

// Interface para resposta
interface AnalyzeCreativeResponse {
  success: boolean;
  analysis?: Record<string, unknown>;
  cached?: boolean;
  error?: string;
}

/**
 * Converte URL de imagem para base64
 */
async function imageUrlToBase64(imageUrl: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  return {
    base64,
    mediaType: contentType,
  };
}

/**
 * Cria prompt especializado para análise de criativo
 */
function createAnalysisPrompt(creative: Record<string, unknown>): string {
  const creativeType = creative.creative_type as string;
  const title = creative.title as string | null;
  const body = creative.body as string | null;
  const description = creative.description as string | null;
  const cta = creative.call_to_action as string | null;

  let prompt = `Você é um especialista em análise de criativos de anúncios digitais para Meta Ads (Facebook/Instagram).

Analise este criativo de ${creativeType === 'video' ? 'vídeo' : 'imagem'} e forneça uma análise COMPLETA e DETALHADA em formato JSON.

`;

  // Adiciona informações de copy se disponíveis
  if (title || body || description || cta) {
    prompt += `TEXTOS DO ANÚNCIO:\n`;
    if (title) prompt += `Título: "${title}"\n`;
    if (body) prompt += `Corpo: "${body}"\n`;
    if (description) prompt += `Descrição: "${description}"\n`;
    if (cta) prompt += `Call-to-Action: "${cta}"\n`;
    prompt += `\n`;
  }

  if (creativeType === 'video') {
    prompt += `Este é um anúncio em VÍDEO. Analise o thumbnail/frame fornecido considerando que faz parte de um vídeo dinâmico.\n\n`;
  }

  prompt += `Forneça sua análise em formato JSON com a seguinte estrutura EXATA:

{
  "overall_score": <número de 0-100>,
  "confidence_score": <número de 0-100, sua confiança na análise>,

  "visual_analysis": {
    "composition_score": <0-100>,
    "detected_objects": ["lista de objetos/pessoas/elementos identificados"],
    "color_palette": ["#hexcode1", "#hexcode2", "#hexcode3"],
    "color_usage": "descrição do uso de cores",
    "text_visibility": "avaliação da legibilidade de textos na imagem",
    "visual_hierarchy": "análise da hierarquia visual",
    "contrast_level": "alto/médio/baixo",
    "composition_type": "tipo de composição"
  },

  "copy_analysis": {
    "headline_effectiveness": "análise do título",
    "body_clarity": "claridade do corpo do texto",
    "message_strength": "força da mensagem",
    "value_proposition": "proposição de valor identificada",
    "tone_of_voice": "tom de voz do anúncio"
  },

  "psychological_analysis": {
    "primary_emotion": "emoção principal evocada",
    "emotional_triggers": ["gatilho1", "gatilho2"],
    "persuasion_techniques": ["técnica1", "técnica2"],
    "target_audience_fit": "adequação ao público-alvo",
    "cognitive_load": "baixa/média/alta",
    "trust_signals": ["sinal1", "sinal2"]
  },

  "first_impression": {
    "attention_score": <0-100>,
    "scrollstopper_potential": "alto/médio/baixo",
    "three_second_message": "mensagem captada em 3 segundos",
    "visual_clarity": "claridade visual",
    "focal_point": "ponto focal principal"
  },

  "placement_suitability": {
    "feed_suitability": "alta/média/baixa com justificativa",
    "stories_suitability": "alta/média/baixa com justificativa",
    "reels_suitability": "alta/média/baixa com justificativa",
    "mobile_friendliness": "excelente/boa/regular/ruim",
    "desktop_friendliness": "excelente/boa/regular/ruim"
  },

  "aida_analysis": {
    "attention": {
      "score": <0-100>,
      "analysis": "análise detalhada"
    },
    "interest": {
      "score": <0-100>,
      "analysis": "análise detalhada"
    },
    "desire": {
      "score": <0-100>,
      "analysis": "análise detalhada"
    },
    "action": {
      "score": <0-100>,
      "analysis": "análise detalhada"
    }
  },

  "strengths": [
    {
      "title": "Ponto forte 1",
      "description": "descrição detalhada"
    },
    {
      "title": "Ponto forte 2",
      "description": "descrição detalhada"
    }
  ],

  "weaknesses": [
    {
      "title": "Ponto fraco 1",
      "description": "descrição detalhada"
    },
    {
      "title": "Ponto fraco 2",
      "description": "descrição detalhada"
    }
  ],

  "recommendations": [
    {
      "priority": "high/medium/low",
      "category": "visual/copy/cta/targeting",
      "title": "Recomendação 1",
      "description": "descrição detalhada da recomendação",
      "expected_impact": "impacto esperado"
    }
  ]
}

IMPORTANTE:
- Seja específico e detalhado em cada análise
- Baseie suas pontuações em critérios objetivos de marketing digital
- As recomendações devem ser acionáveis e específicas
- Considere as melhores práticas de Meta Ads
- Retorne APENAS o JSON, sem texto adicional antes ou depois`;

  return prompt;
}

Deno.serve(async (req: Request) => {
  // Responde requisições OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

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

    // Valida autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse do corpo da requisição
    const body: AnalyzeCreativeRequest = await req.json();
    const { creativeId, forceReanalysis = false } = body;

    // Validação de parâmetros
    if (!creativeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameter: creativeId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Inicializa clientes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;

    if (!claudeApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Claude API key not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Autentica usuário
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o criativo
    const { data: creative, error: creativeError } = await supabaseAdmin
      .from('meta_ad_creatives')
      .select('*')
      .eq('id', creativeId)
      .maybeSingle();

    if (creativeError || !creative) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Creative not found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verifica se já existe análise (a menos que force_reanalysis seja true)
    if (!forceReanalysis) {
      const { data: existingAnalysis } = await supabaseAdmin
        .from('claude_creative_analyses')
        .select('*')
        .eq('creative_id', creativeId)
        .maybeSingle();

      if (existingAnalysis) {
        return new Response(
          JSON.stringify({
            success: true,
            analysis: existingAnalysis,
            cached: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Determina URL da imagem para análise
    const imageUrl = creative.cached_image_url ||
                     creative.cached_thumbnail_url ||
                     creative.image_url_hd ||
                     creative.image_url ||
                     creative.thumbnail_url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No image available for analysis',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Analyzing creative ${creativeId} with image: ${imageUrl}`);

    // Converte imagem para base64
    const { base64, mediaType } = await imageUrlToBase64(imageUrl);

    // Cria prompt de análise
    const analysisPrompt = createAnalysisPrompt(creative);

    // Inicializa cliente Claude
    const anthropic = new Anthropic({
      apiKey: claudeApiKey,
    });

    console.log('Sending request to Claude API...');

    // Faz requisição para Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: analysisPrompt,
            },
          ],
        },
      ],
    });

    const processingTime = Date.now() - startTime;

    // Extrai resposta
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON da resposta
    let analysisData: Record<string, unknown>;
    try {
      // Remove markdown code blocks se presentes
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      console.error('Response text:', responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse AI response',
          details: responseText.substring(0, 500),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calcula custo estimado
    // Claude 3.5 Sonnet: $3 por 1M input tokens, $15 per 1M output tokens
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const estimatedCost = (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15);

    // Salva análise no banco
    const analysisRecord = {
      workspace_id: creative.workspace_id,
      creative_id: creativeId,
      ad_id: creative.ad_id,
      analysis_type: creative.creative_type,
      model_used: 'claude-3-5-sonnet-20241022',
      overall_score: analysisData.overall_score || null,
      visual_analysis: analysisData.visual_analysis || {},
      copy_analysis: analysisData.copy_analysis || {},
      psychological_analysis: analysisData.psychological_analysis || {},
      first_impression: analysisData.first_impression || {},
      placement_suitability: analysisData.placement_suitability || {},
      aida_analysis: analysisData.aida_analysis || {},
      recommendations: analysisData.recommendations || [],
      strengths: analysisData.strengths || [],
      weaknesses: analysisData.weaknesses || [],
      video_frames_analyzed: [],
      confidence_score: analysisData.confidence_score || null,
      processing_time_ms: processingTime,
      tokens_used: inputTokens + outputTokens,
      estimated_cost: estimatedCost,
      raw_response: { message, parsed: analysisData },
      error_message: null,
      analyzed_at: new Date().toISOString(),
    };

    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('claude_creative_analyses')
      .upsert(analysisRecord, {
        onConflict: 'workspace_id,creative_id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
      // Retorna análise mesmo se falhou ao salvar
      return new Response(
        JSON.stringify({
          success: true,
          analysis: analysisRecord,
          cached: false,
          saveError: saveError.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Analysis completed in ${processingTime}ms. Tokens used: ${inputTokens + outputTokens}. Cost: $${estimatedCost.toFixed(4)}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-creative-claude function:', error);

    const errorResponse: AnalyzeCreativeResponse = {
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
