/**
 * Edge Function: meta-analyze-copy-aida
 * 
 * Analisa copy de anúncios usando framework AIDA (Attention, Interest, Desire, Action)
 * com GPT-4 para fornecer insights profundos sobre eficácia da mensagem.
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
  copy_data: {
    headline?: string;
    body?: string;
    description?: string;
    cta?: string;
  };
  image_url?: string;
  performance_context?: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    conversions: number;
    conversion_rate: number;
  };
}

const SYSTEM_PROMPT = `Você é um especialista em copywriting e marketing digital, especializado no framework AIDA.

AIDA significa:
- Attention (Atenção): Captura a atenção do público
- Interest (Interesse): Mantém o interesse com informação relevante
- Desire (Desejo): Cria desejo pelo produto/serviço
- Action (Ação): Leva à ação através de CTA claro

Analise cada etapa AIDA de forma detalhada, identificando power words, gatilhos emocionais, e áreas de melhoria.

Sempre responda em português brasileiro.
Retorne APENAS um JSON válido no formato especificado.`;

function buildAIDAPrompt(payload: RequestPayload): string {
  const { headline, body, description, cta } = payload.copy_data;
  
  return `Analise esta copy publicitária usando o framework AIDA de forma DETALHADA e ESPECÍFICA.

${headline ? `HEADLINE: "${headline}"` : ''}
${body ? `\nBODY: "${body}"` : ''}
${description ? `\nDESCRIPTION: "${description}"` : ''}
${cta ? `\nCTA: "${cta}"` : ''}

${payload.performance_context ? `\nMétricas: CTR ${(payload.performance_context.ctr * 100).toFixed(2)}%, Taxa de Conversão ${(payload.performance_context.conversion_rate * 100).toFixed(2)}%` : ''}

Análise AIDA solicitada:

1. ATTENTION (Atenção): Como a copy captura atenção?
2. INTEREST (Interesse): Como mantém o interesse?
3. DESIRE (Desejo): Como cria desejo?
4. ACTION (Ação): Quão efetivo é o CTA?
5. POWER WORDS: Identifique palavras de impacto

Retorne JSON:
{
  "overall_score": <0-100>,
  "attention_score": <0-100>,
  "interest_score": <0-100>,
  "desire_score": <0-100>,
  "action_score": <0-100>,
  "attention_analysis": {
    "headline_effectiveness": "<análise detalhada>",
    "opening_hook": "<análise>",
    "visual_text_synergy": "<análise>",
    "pattern_interrupt": "<análise>",
    "curiosity_trigger": "<análise>",
    "first_impression": "<análise>",
    "improvements": ["sugestão1", "sugestão2"]
  },
  "interest_analysis": {
    "relevance_to_audience": "<análise>",
    "information_quality": "<análise>",
    "storytelling_elements": "<análise>",
    "engagement_factors": ["fator1", "fator2"],
    "credibility_signals": ["sinal1", "sinal2"],
    "flow_quality": "<análise>",
    "improvements": ["sugestão1", "sugestão2"]
  },
  "desire_analysis": {
    "benefit_focus": "<análise>",
    "emotional_triggers": ["gatilho1", "gatilho2"],
    "value_proposition_clarity": "<análise>",
    "urgency_elements": ["elemento1", "elemento2"],
    "scarcity_elements": ["elemento1", "elemento2"],
    "social_proof": "<análise>",
    "pain_point_addressing": "<análise>",
    "improvements": ["sugestão1", "sugestão2"]
  },
  "action_analysis": {
    "cta_clarity": "<análise>",
    "cta_strength": "<análise>",
    "cta_placement": "<análise>",
    "cta_urgency": "<análise>",
    "friction_points": ["ponto1", "ponto2"],
    "action_simplicity": "<análise>",
    "next_steps_clarity": "<análise>",
    "improvements": ["sugestão1", "sugestão2"]
  },
  "power_words_analysis": {
    "power_words_found": ["palavra1", "palavra2"],
    "emotional_words": ["palavra1", "palavra2"],
    "action_words": ["palavra1", "palavra2"],
    "sensory_words": ["palavra1", "palavra2"],
    "power_words_score": <0-100>,
    "suggestions": ["sugestão1", "sugestão2"]
  },
  "overall_strengths": ["ponto1", "ponto2", "ponto3"],
  "overall_improvements": ["melhoria1", "melhoria2", "melhoria3"],
  "aida_flow_quality": "<análise do fluxo geral>",
  "target_audience_alignment": "<análise>",
  "tone_consistency": "<análise>",
  "readability_score": <0-100>,
  "word_count": <number>
}`;
}

async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  
  return { base64, mimeType: contentType.includes("png") ? "image/png" : "image/jpeg" };
}

async function analyzeAIDAWithGPT4(
  payload: RequestPayload,
  openaiApiKey: string
): Promise<{ analysis: any; tokensUsed: number }> {
  const userPrompt = buildAIDAPrompt(payload);
  
  const messageContent: any[] = [{ type: "text", text: userPrompt }];
  
  // Se houver imagem, adiciona para análise de sinergia visual-textual
  if (payload.image_url) {
    try {
      const { base64, mimeType } = await downloadImageAsBase64(payload.image_url);
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: "low" // Low detail é suficiente para análise de sinergia
        }
      });
    } catch (error) {
      console.warn("Could not load image for analysis:", error);
    }
  }
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: payload.image_url ? "gpt-4o" : "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: messageContent }
      ],
      max_tokens: 3000,
      temperature: 0.5,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;
  
  const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const analysis = JSON.parse(cleanContent);
  
  return { analysis, tokensUsed };
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
    const { ad_id, meta_ad_account_id, copy_data } = payload;
    
    if (!ad_id || !meta_ad_account_id || !copy_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verifica se há pelo menos algum conteúdo para analisar
    if (!copy_data.headline && !copy_data.body && !copy_data.description) {
      return new Response(
        JSON.stringify({ error: "No copy content to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    console.log("Starting AIDA copy analysis...");
    const { analysis, tokensUsed } = await analyzeAIDAWithGPT4(payload, openaiApiKey);
    console.log("Analysis completed");
    
    const aidaRecord = {
      workspace_id: workspace.id,
      ad_id,
      meta_ad_account_id,
      overall_score: analysis.overall_score,
      attention_score: analysis.attention_score,
      interest_score: analysis.interest_score,
      desire_score: analysis.desire_score,
      action_score: analysis.action_score,
      analysis_data: {
        attention_analysis: analysis.attention_analysis,
        interest_analysis: analysis.interest_analysis,
        desire_analysis: analysis.desire_analysis,
        action_analysis: analysis.action_analysis,
        power_words_analysis: analysis.power_words_analysis,
        overall_strengths: analysis.overall_strengths,
        overall_improvements: analysis.overall_improvements,
        aida_flow_quality: analysis.aida_flow_quality,
        target_audience_alignment: analysis.target_audience_alignment,
        tone_consistency: analysis.tone_consistency,
        readability_score: analysis.readability_score,
        word_count: analysis.word_count,
      },
      model_used: payload.image_url ? "gpt-4o" : "gpt-4o-mini",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };
    
    const { data: savedAIDA, error: insertError } = await supabaseAdmin
      .from("aida_copy_analyses")
      .insert(aidaRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          aida_analysis: { ...aidaRecord, analyzed_at: aidaRecord.analyzed_at },
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        aida_analysis: savedAIDA,
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