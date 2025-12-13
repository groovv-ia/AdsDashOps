/**
 * Edge Function: meta-analyze-ad-ai
 * 
 * Analisa um anúncio usando GPT-4 Vision para fornecer insights sobre
 * o criativo visual e a copy/texto do anúncio.
 * 
 * POST /functions/v1/meta-analyze-ad-ai
 * Body: { 
 *   ad_id: string, 
 *   meta_ad_account_id: string,
 *   image_url: string,
 *   copy_data: { title?: string, body?: string, description?: string, cta?: string }
 * }
 * 
 * Retorna: { analysis: AdAIAnalysis }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para o payload da requisição
interface RequestPayload {
  ad_id: string;
  meta_ad_account_id: string;
  image_url: string;
  copy_data: {
    title?: string;
    body?: string;
    description?: string;
    cta?: string;
  };
}

// Interface para análise visual
interface VisualAnalysis {
  composition_score: number;
  color_usage: string;
  text_visibility: string;
  brand_consistency: string;
  attention_grabbing: string;
  key_strengths: string[];
  improvement_areas: string[];
}

// Interface para análise de copy
interface CopyAnalysis {
  clarity_score: number;
  persuasion_level: string;
  urgency_present: boolean;
  cta_effectiveness: string;
  emotional_appeal: string;
  key_strengths: string[];
  improvement_areas: string[];
}

// Interface para recomendações
interface Recommendation {
  priority: "high" | "medium" | "low";
  category: "visual" | "copy" | "cta" | "targeting" | "general";
  title: string;
  description: string;
  expected_impact: string;
}

// Interface para resposta da análise completa
interface AIAnalysisResponse {
  creative_score: number;
  copy_score: number;
  overall_score: number;
  visual_analysis: VisualAnalysis;
  copy_analysis: CopyAnalysis;
  recommendations: Recommendation[];
}

// Prompt do sistema para análise de anúncios
const SYSTEM_PROMPT = `Você é um especialista em marketing digital e análise de anúncios publicitários.
Sua tarefa é analisar anúncios do Meta Ads (Facebook/Instagram) e fornecer insights acionáveis.

Analise tanto o aspecto visual (imagem/vídeo) quanto a copy (textos) do anúncio.
Seja objetivo, prático e foreca recomendações que podem ser implementadas.

Sempre responda em português brasileiro.

Retorne APENAS um JSON válido no formato especificado, sem texto adicional.`;

// Função para construir o prompt de análise
function buildAnalysisPrompt(copyData: RequestPayload["copy_data"]): string {
  const copyInfo = [];
  if (copyData.title) copyInfo.push(`Título: "${copyData.title}"`);
  if (copyData.body) copyInfo.push(`Corpo do anúncio: "${copyData.body}"`);
  if (copyData.description) copyInfo.push(`Descrição: "${copyData.description}"`);
  if (copyData.cta) copyInfo.push(`Call-to-Action: "${copyData.cta}"`);
  
  const copySection = copyInfo.length > 0 
    ? `\n\nTextos do anúncio:\n${copyInfo.join("\n")}`
    : "\n\nNenhum texto disponível para análise.";

  return `Analise este anúncio do Meta Ads e forneça uma avaliação completa.
${copySection}

Retorne um JSON com esta estrutura EXATA:
{
  "creative_score": <número de 0 a 100>,
  "copy_score": <número de 0 a 100>,
  "overall_score": <número de 0 a 100 - média ponderada>,
  "visual_analysis": {
    "composition_score": <número de 0 a 100>,
    "color_usage": "<descrição breve do uso de cores>",
    "text_visibility": "<avaliação da legibilidade de textos na imagem>",
    "brand_consistency": "<avaliação da consistência visual>",
    "attention_grabbing": "<capacidade de capturar atenção>",
    "key_strengths": ["<ponto forte 1>", "<ponto forte 2>"],
    "improvement_areas": ["<área de melhoria 1>", "<área de melhoria 2>"]
  },
  "copy_analysis": {
    "clarity_score": <número de 0 a 100>,
    "persuasion_level": "<baixo|médio|alto>",
    "urgency_present": <true|false>,
    "cta_effectiveness": "<avaliação do call-to-action>",
    "emotional_appeal": "<tipo de apelo emocional usado>",
    "key_strengths": ["<ponto forte 1>", "<ponto forte 2>"],
    "improvement_areas": ["<área de melhoria 1>", "<área de melhoria 2>"]
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "visual",
      "title": "<título da recomendação>",
      "description": "<descrição detalhada>",
      "expected_impact": "<impacto esperado>"
    }
  ]
}

Forma de 3 a 6 recomendações priorizadas por impacto potencial.
Categories possíveis: visual, copy, cta, targeting, general.
Prioridades: high, medium, low.`;
}

// Função para chamar a API do OpenAI com GPT-4 Vision
async function analyzeWithGPT4Vision(
  imageUrl: string,
  copyData: RequestPayload["copy_data"],
  openaiApiKey: string
): Promise<{ analysis: AIAnalysisResponse; tokensUsed: number }> {
  const userPrompt = buildAnalysisPrompt(copyData);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  // Parse do JSON da resposta
  // Remove possíveis backticks de code block
  const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  try {
    const analysis: AIAnalysisResponse = JSON.parse(cleanContent);
    return { analysis, tokensUsed };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", cleanContent);
    throw new Error("Failed to parse AI analysis response");
  }
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
    const { ad_id, meta_ad_account_id, image_url, copy_data } = payload;

    // Valida campos obrigatórios
    if (!ad_id || !meta_ad_account_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ad_id, meta_ad_account_id, image_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica chave da API OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Executa análise com GPT-4 Vision
    const { analysis, tokensUsed } = await analyzeWithGPT4Vision(
      image_url,
      copy_data || {},
      openaiApiKey
    );

    // Prepara registro para salvar no banco
    const analysisRecord = {
      workspace_id: workspace.id,
      ad_id: ad_id,
      meta_ad_account_id: meta_ad_account_id,
      creative_score: analysis.creative_score,
      copy_score: analysis.copy_score,
      overall_score: analysis.overall_score,
      visual_analysis: analysis.visual_analysis,
      copy_analysis: analysis.copy_analysis,
      recommendations: analysis.recommendations,
      image_url: image_url,
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };

    // Salva análise no banco (insere nova a cada análise para manter histórico)
    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("meta_ad_ai_analyses")
      .insert(analysisRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // Retorna análise mesmo se o save falhar
      return new Response(
        JSON.stringify({ 
          analysis: { ...analysis, analyzed_at: analysisRecord.analyzed_at },
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        analysis: savedAnalysis,
        tokens_used: tokensUsed,
        saved: true 
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
