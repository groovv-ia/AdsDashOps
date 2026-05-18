/**
 * Edge Function: meta-analyze-ad-ai
 *
 * Analisa um anuncio usando GPT-4 Vision para fornecer insights sobre
 * o criativo visual e a copy/texto do anuncio.
 *
 * Melhorias:
 * - Corrigido bug onde alcance era exibido igual a impressoes
 * - ROAS omitido quando nao configurado na campanha
 * - Leads e conversas de mensagens incluidos quando disponiveis
 * - Correlacao de performance ajustada ao objetivo real da campanha
 *
 * POST /functions/v1/meta-analyze-ad-ai
 * Body: {
 *   ad_id: string,
 *   meta_ad_account_id: string,
 *   image_url: string,
 *   copy_data: { title?: string, body?: string, description?: string, cta?: string },
 *   performance_context?: PerformanceContext
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PerformanceContext {
  total_impressions: number;
  total_reach?: number;
  total_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  total_spend: number;
  conversions?: number;
  conversion_rate?: number;
  roas?: number;
  total_purchase_value?: number;
  total_leads?: number;
  avg_cost_per_lead?: number;
  total_messaging_conversations?: number;
  avg_cost_per_messaging_conversation?: number;
  campaign_objective?: string;
}

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
  performance_context?: PerformanceContext;
}

interface VisualElements {
  detected_objects: string[];
  color_palette: string[];
  typography_analysis: string;
  composition_type: string;
  visual_hierarchy: string;
  contrast_level: string;
}

interface PsychologicalAnalysis {
  primary_emotion: string;
  emotional_triggers: string[];
  persuasion_techniques: string[];
  target_audience_fit: string;
  cognitive_load: string;
  trust_signals: string[];
}

interface FirstImpressionAnalysis {
  attention_score: number;
  scrollstopper_potential: string;
  three_second_message: string;
  visual_clarity: string;
  focal_point: string;
}

interface PlacementAnalysis {
  feed_suitability: string;
  stories_suitability: string;
  reels_suitability: string;
  mobile_friendliness: string;
  desktop_friendliness: string;
}

interface VisualAnalysis {
  composition_score: number;
  color_usage: string;
  text_visibility: string;
  brand_consistency: string;
  attention_grabbing: string;
  key_strengths: string[];
  improvement_areas: string[];
  visual_elements: VisualElements;
  psychological_analysis: PsychologicalAnalysis;
  first_impression: FirstImpressionAnalysis;
  placement_analysis: PlacementAnalysis;
  design_trends: string;
  modernization_suggestions: string[];
}

interface MessageAnalysis {
  value_proposition_clarity: string;
  message_match_visual: string;
  tone_of_voice: string;
  readability_score: number;
  word_count: number;
  power_words_used: string[];
}

interface CopyAnalysis {
  clarity_score: number;
  persuasion_level: string;
  urgency_present: boolean;
  cta_effectiveness: string;
  emotional_appeal: string;
  key_strengths: string[];
  improvement_areas: string[];
  message_analysis: MessageAnalysis;
  headline_effectiveness: string;
  body_copy_effectiveness: string;
  cta_placement_analysis: string;
  benefits_vs_features: string;
}

interface ABTestSuggestion {
  test_type: string;
  hypothesis: string;
  variant_description: string;
  what_to_change: string;
  expected_outcome: string;
  metrics_to_track: string[];
  priority: "high" | "medium" | "low";
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: "visual" | "copy" | "cta" | "targeting" | "general";
  title: string;
  description: string;
  expected_impact: string;
  implementation_difficulty: "easy" | "medium" | "hard";
  estimated_impact_percentage: string;
  ab_test_suggestion?: ABTestSuggestion;
}

interface PerformanceCorrelation {
  performance_summary: string;
  visual_performance_link: string;
  copy_performance_link: string;
  underperforming_areas: string[];
  high_performing_elements: string[];
  optimization_priority: string;
}

interface AIAnalysisResponse {
  creative_score: number;
  copy_score: number;
  overall_score: number;
  visual_analysis: VisualAnalysis;
  copy_analysis: CopyAnalysis;
  recommendations: Recommendation[];
  performance_correlation?: PerformanceCorrelation;
  ab_test_suggestions: ABTestSuggestion[];
  competitive_analysis: string;
  audience_insights: string;
  strategic_recommendations: string;
}

const SYSTEM_PROMPT = `Você é um especialista sênior em marketing digital, análise de criativos publicitários e psicologia do consumidor, com mais de 15 anos de experiência em otimização de campanhas Meta Ads (Facebook/Instagram).

Sua especialidade inclui:
- Análise detalhada de elementos visuais e design (cores, composição, hierarquia visual, tipografia)
- Psicologia da persuasão e gatilhos emocionais em publicidade
- Copywriting e análise de mensagens publicitárias
- Correlação entre elementos criativos e performance de campanhas
- Identificação de oportunidades de otimização baseadas em dados
- Design de testes A/B para maximizar resultados

IMPORTANTE: Cada anúncio é único. Sua análise deve ser específica e detalhada para ESTE anúncio em particular, mencionando elementos visuais específicos, cores exatas, textos presentes.

REGRA CRÍTICA: Quando dados de performance estiverem disponíveis, avalie o anúncio pelo objetivo real da campanha. Se não houver dados de ROAS/receita, NÃO mencione ROAS nem retorno financeiro — avalie pelo objetivo disponível (leads, mensagens, cliques ou conversões).

NUNCA forneça análises genéricas. Sempre mencione especificidades visuais e textuais observadas.

Sempre responda em português brasileiro com linguagem profissional mas acessível.
Retorne APENAS um JSON válido no formato especificado, sem texto adicional ou markdown.`;

function detectPerformanceContext(ctx: PerformanceContext): {
  hasRoas: boolean;
  hasLeads: boolean;
  hasMessaging: boolean;
  hasConversions: boolean;
  primaryMetric: string;
} {
  const hasRoas = typeof ctx.roas === "number" && ctx.roas > 0;
  const hasLeads = typeof ctx.total_leads === "number" && ctx.total_leads > 0;
  const hasMessaging =
    typeof ctx.total_messaging_conversations === "number" &&
    ctx.total_messaging_conversations > 0;
  const hasConversions =
    typeof ctx.conversions === "number" && ctx.conversions > 0;

  let primaryMetric = "CTR e CPC";
  if (hasRoas) primaryMetric = "ROAS e conversões";
  else if (hasLeads && hasMessaging) primaryMetric = "leads e conversas geradas";
  else if (hasLeads) primaryMetric = "leads gerados e custo por lead";
  else if (hasMessaging) primaryMetric = "conversas iniciadas e custo por conversa";
  else if (hasConversions) primaryMetric = "conversões e custo por conversão";

  return { hasRoas, hasLeads, hasMessaging, hasConversions, primaryMetric };
}

function buildPerformanceSection(ctx: PerformanceContext): string {
  const pctx = detectPerformanceContext(ctx);

  const reachLine =
    ctx.total_reach != null && ctx.total_reach > 0
      ? `\n👁️ Alcance único: ${ctx.total_reach.toLocaleString("pt-BR")}`
      : "";

  const baseSection = `📈 Impressões: ${ctx.total_impressions.toLocaleString("pt-BR")}${reachLine}
🖱️ Cliques: ${ctx.total_clicks.toLocaleString("pt-BR")}
📊 CTR: ${ctx.ctr.toFixed(2)}%
💰 CPC: R$ ${ctx.cpc.toFixed(2)}
💵 CPM: R$ ${ctx.cpm.toFixed(2)}
💸 Investimento: R$ ${ctx.total_spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
${ctx.campaign_objective ? `🎯 Objetivo: ${ctx.campaign_objective}` : ""}`;

  let resultsSection = "";

  if (pctx.hasRoas && ctx.roas != null) {
    resultsSection = `\n🎯 Conversões: ${ctx.conversions ?? 0}
📈 Taxa de Conversão: ${(ctx.conversion_rate ?? 0).toFixed(2)}%
💰 Receita: R$ ${(ctx.total_purchase_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
🔄 ROAS: ${ctx.roas.toFixed(2)}x`;
  } else if (pctx.hasLeads && pctx.hasMessaging) {
    resultsSection = `\n🎯 Leads: ${ctx.total_leads?.toLocaleString("pt-BR")} | CPL: R$ ${ctx.avg_cost_per_lead?.toFixed(2)}
💬 Conversas: ${ctx.total_messaging_conversations?.toLocaleString("pt-BR")} | Custo/conversa: R$ ${ctx.avg_cost_per_messaging_conversation?.toFixed(2)}`;
  } else if (pctx.hasLeads) {
    resultsSection = `\n🎯 Leads: ${ctx.total_leads?.toLocaleString("pt-BR")} | CPL: R$ ${ctx.avg_cost_per_lead?.toFixed(2)}`;
  } else if (pctx.hasMessaging) {
    resultsSection = `\n💬 Conversas iniciadas: ${ctx.total_messaging_conversations?.toLocaleString("pt-BR")} | Custo/conversa: R$ ${ctx.avg_cost_per_messaging_conversation?.toFixed(2)}`;
  } else if (pctx.hasConversions) {
    resultsSection = `\n🎯 Conversões: ${ctx.conversions} | Taxa: ${(ctx.conversion_rate ?? 0).toFixed(2)}%`;
  }

  const noRoasWarning = !pctx.hasRoas
    ? "\n⚠️ Esta campanha NÃO tem ROAS configurado. NÃO mencione ROAS na análise de correlação."
    : "";

  return `\n\n═══════════════════════════════════════\n📊 DADOS DE PERFORMANCE ATUAL\n═══════════════════════════════════════
${baseSection}${resultsSection}${noRoasWarning}

⚠️ CORRELAÇÃO OBRIGATÓRIA:
1. CTR de ${ctx.ctr.toFixed(2)}%: quais elementos visuais/textuais explicam?
2. CPC de R$ ${ctx.cpc.toFixed(2)}: o que isso sugere sobre competitividade?
3. Objetivo principal (${pctx.primaryMetric}): como o criativo suporta este objetivo?
4. Quais elementos específicos mudar para melhorar ${pctx.primaryMetric}?`;
}

function buildAnalysisPrompt(
  copyData: RequestPayload["copy_data"],
  performanceContext?: PerformanceContext
): string {
  const copyInfo: string[] = [];
  if (copyData.title) copyInfo.push(`📌 Título/Headline: "${copyData.title}"`);
  if (copyData.body) copyInfo.push(`📝 Corpo: "${copyData.body}"`);
  if (copyData.description) copyInfo.push(`💬 Descrição: "${copyData.description}"`);
  if (copyData.cta) copyInfo.push(`🎯 CTA: "${copyData.cta}"`);

  const copySection =
    copyInfo.length > 0
      ? `\n\n═══════════════════════════════════════\n📱 TEXTOS DO ANÚNCIO\n═══════════════════════════════════════\n${copyInfo.join("\n")}`
      : "\n\nNenhum texto disponível para análise.";

  const performanceSection = performanceContext
    ? buildPerformanceSection(performanceContext)
    : "";

  const hasPerf = !!performanceContext;
  const perfCtx = performanceContext ? detectPerformanceContext(performanceContext) : null;

  const noRoasNote = hasPerf && !perfCtx?.hasRoas
    ? "\n- NÃO mencione ROAS na análise de correlação de performance."
    : "";

  return `═══════════════════════════════════════════════════════════════
🎨 ANÁLISE PROFUNDA DE ANÚNCIO META ADS
═══════════════════════════════════════════════════════════════

Analise este anúncio de forma DETALHADA e ESPECÍFICA.
${copySection}${performanceSection}

═══════════════════════════════════════════════════════════════
🔍 INSTRUÇÕES DE ANÁLISE
═══════════════════════════════════════════════════════════════

1️⃣ ANÁLISE VISUAL PROFUNDA:
   - Todos os elementos visuais específicos, cores EXATAS, texto visível na imagem
   - Composição, tipografia, contraste, hierarquia visual e fluxo do olhar

2️⃣ ANÁLISE PSICOLÓGICA:
   - Emoção primária, gatilhos, carga cognitiva, sinais de confiança, público-alvo

3️⃣ PRIMEIRO IMPACTO (3 segundos):
   - Potencial de parar o scroll, mensagem captada, ponto focal

4️⃣ ANÁLISE DE COPY:
   - Proposta de valor, coerência visual-textual, tom de voz, power words, CTA

5️⃣ PLACEMENT:
   - Feed, Stories, Reels, mobile, desktop

6️⃣ CORRELAÇÃO COM PERFORMANCE ${hasPerf ? "(OBRIGATÓRIO)" : "(hipotética)"}:
   ${hasPerf ? `- Explique por que CTR=${performanceContext!.ctr.toFixed(2)}%, CPC=R$${performanceContext!.cpc.toFixed(2)}
   - Quais elementos do criativo apoiam ${perfCtx?.primaryMetric}?
   - Recomendações específicas para melhorar ${perfCtx?.primaryMetric}` : "- Análise hipotética baseada no criativo"}${noRoasNote}

7️⃣ TENDÊNCIAS E MODERNIDADE

8️⃣ RECOMENDAÇÕES (5-8 ações específicas e práticas)

9️⃣ TESTES A/B (3-5 testes com hipóteses)

Retorne JSON:
{
  "creative_score": <0-100>,
  "copy_score": <0-100>,
  "overall_score": <0-100>,
  "visual_analysis": {
    "composition_score": <0-100>,
    "color_usage": "<cores específicas>",
    "text_visibility": "<legibilidade>",
    "brand_consistency": "<consistência>",
    "attention_grabbing": "<capacidade de atenção>",
    "key_strengths": ["<ponto 1>"],
    "improvement_areas": ["<área 1>"],
    "visual_elements": {
      "detected_objects": ["<objeto 1>"],
      "color_palette": ["<cor 1>"],
      "typography_analysis": "<análise>",
      "composition_type": "<tipo>",
      "visual_hierarchy": "<hierarquia>",
      "contrast_level": "<alto|médio|baixo>"
    },
    "psychological_analysis": {
      "primary_emotion": "<emoção>",
      "emotional_triggers": ["<gatilho 1>"],
      "persuasion_techniques": ["<técnica 1>"],
      "target_audience_fit": "<público>",
      "cognitive_load": "<baixa|média|alta>",
      "trust_signals": ["<sinal 1>"]
    },
    "first_impression": {
      "attention_score": <0-100>,
      "scrollstopper_potential": "<alto|médio|baixo>",
      "three_second_message": "<mensagem>",
      "visual_clarity": "<claridade>",
      "focal_point": "<ponto focal>"
    },
    "placement_analysis": {
      "feed_suitability": "<feed>",
      "stories_suitability": "<stories>",
      "reels_suitability": "<reels>",
      "mobile_friendliness": "<mobile>",
      "desktop_friendliness": "<desktop>"
    },
    "design_trends": "<tendências>",
    "modernization_suggestions": ["<sugestão 1>"]
  },
  "copy_analysis": {
    "clarity_score": <0-100>,
    "persuasion_level": "<baixo|médio|alto>",
    "urgency_present": <true|false>,
    "cta_effectiveness": "<avaliação>",
    "emotional_appeal": "<apelo>",
    "key_strengths": ["<ponto 1>"],
    "improvement_areas": ["<área 1>"],
    "message_analysis": {
      "value_proposition_clarity": "<clareza>",
      "message_match_visual": "<coerência>",
      "tone_of_voice": "<tom>",
      "readability_score": <0-100>,
      "word_count": <número>,
      "power_words_used": ["<palavra 1>"]
    },
    "headline_effectiveness": "<headline>",
    "body_copy_effectiveness": "<body>",
    "cta_placement_analysis": "<CTA>",
    "benefits_vs_features": "<benefícios vs características>"
  },
  "recommendations": [
    {
      "priority": "<high|medium|low>",
      "category": "<visual|copy|cta|targeting|general>",
      "title": "<título>",
      "description": "<descrição detalhada>",
      "expected_impact": "<impacto>",
      "implementation_difficulty": "<easy|medium|hard>",
      "estimated_impact_percentage": "<ex: +15% CTR>",
      "ab_test_suggestion": {
        "test_type": "<tipo>",
        "hypothesis": "<hipótese>",
        "variant_description": "<variante>",
        "what_to_change": "<mudança>",
        "expected_outcome": "<resultado>",
        "metrics_to_track": ["<métrica>"],
        "priority": "<high|medium|low>"
      }
    }
  ],
  ${hasPerf ? `"performance_correlation": {
    "performance_summary": "<resumo com números reais>",
    "visual_performance_link": "<elementos visuais vs métricas>",
    "copy_performance_link": "<copy vs métricas>",
    "underperforming_areas": ["<área 1>"],
    "high_performing_elements": ["<elemento 1>"],
    "optimization_priority": "<prioridade>"
  },` : ""}
  "ab_test_suggestions": [
    {
      "test_type": "<tipo>",
      "hypothesis": "<hipótese>",
      "variant_description": "<variante>",
      "what_to_change": "<mudança>",
      "expected_outcome": "<resultado>",
      "metrics_to_track": ["<métrica>"],
      "priority": "<high|medium|low>"
    }
  ],
  "competitive_analysis": "<comparação com mercado>",
  "audience_insights": "<insights de público>",
  "strategic_recommendations": "<recomendações estratégicas>"
}`;
}

async function downloadImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  console.log("Downloading image:", imageUrl);

  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  let mimeType = "image/jpeg";
  if (contentType.includes("png")) mimeType = "image/png";
  else if (contentType.includes("gif")) mimeType = "image/gif";
  else if (contentType.includes("webp")) mimeType = "image/webp";

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);

  console.log(`Image: ${uint8Array.length} bytes, type: ${mimeType}`);
  return { base64, mimeType };
}

async function analyzeWithGPT4Vision(
  imageBase64: string,
  imageMimeType: string,
  copyData: RequestPayload["copy_data"],
  performanceContext: PerformanceContext | undefined,
  openaiApiKey: string
): Promise<{ analysis: AIAnalysisResponse; tokensUsed: number }> {
  const userPrompt = buildAnalysisPrompt(copyData, performanceContext);
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.4,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) throw new Error("No response content from OpenAI");

  const cleanContent = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const analysis: AIAnalysisResponse = JSON.parse(cleanContent);
    return { analysis, tokensUsed };
  } catch (_e) {
    console.error("Failed to parse OpenAI response:", cleanContent);
    throw new Error("Failed to parse AI analysis response");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RequestPayload = await req.json();
    const { ad_id, meta_ad_account_id, image_url, copy_data, performance_context } = payload;

    if (!ad_id || !meta_ad_account_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ad_id, meta_ad_account_id, image_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: workspacesList } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    const workspace = workspacesList?.[0] || null;
    if (!workspace) {
      return new Response(JSON.stringify({ error: "No workspace found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Downloading image...");
    const { base64: imageBase64, mimeType: imageMimeType } =
      await downloadImageAsBase64(image_url);

    if (performance_context) {
      const pctx = detectPerformanceContext(performance_context);
      console.log("Performance primary metric:", pctx.primaryMetric);
    }

    console.log("Running GPT-4 Vision analysis...");
    const { analysis, tokensUsed } = await analyzeWithGPT4Vision(
      imageBase64,
      imageMimeType,
      copy_data || {},
      performance_context,
      openaiApiKey
    );
    console.log("Analysis complete");

    const analysisRecord = {
      workspace_id: workspace.id,
      ad_id,
      meta_ad_account_id,
      creative_score: analysis.creative_score,
      copy_score: analysis.copy_score,
      overall_score: analysis.overall_score,
      visual_analysis: analysis.visual_analysis,
      copy_analysis: analysis.copy_analysis,
      recommendations: analysis.recommendations,
      image_url,
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };

    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("meta_ad_ai_analyses")
      .insert(analysisRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          analysis: { ...analysis, analyzed_at: analysisRecord.analyzed_at },
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ analysis: savedAnalysis, tokens_used: tokensUsed, saved: true }),
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
