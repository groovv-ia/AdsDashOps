/**
 * Edge Function: meta-analyze-ad-ai
 * 
 * Analisa um anúncio usando GPT-4 Vision para fornecer insights sobre
 * o criativo visual e a copy/texto do anúncio.
 * 
 * IMPORTANTE: Baixa a imagem e converte para base64 antes de enviar para OpenAI
 * pois URLs do Facebook requerem autenticação e não podem ser acessadas diretamente.
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

// Interface para contexto de performance
interface PerformanceContext {
  total_impressions: number;
  total_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  total_spend: number;
  conversions: number;
  conversion_rate: number;
  campaign_objective?: string;
}

// Interface para o payload expandido da requisição
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
  // Novo: contexto de performance para análise correlacionada
  performance_context?: PerformanceContext;
}

// Interface para elementos visuais detalhados
interface VisualElements {
  detected_objects: string[];
  color_palette: string[];
  typography_analysis: string;
  composition_type: string;
  visual_hierarchy: string;
  contrast_level: string;
}

// Interface para análise psicológica
interface PsychologicalAnalysis {
  primary_emotion: string;
  emotional_triggers: string[];
  persuasion_techniques: string[];
  target_audience_fit: string;
  cognitive_load: string;
  trust_signals: string[];
}

// Interface para primeiro impacto
interface FirstImpressionAnalysis {
  attention_score: number;
  scrollstopper_potential: string;
  three_second_message: string;
  visual_clarity: string;
  focal_point: string;
}

// Interface para análise de placement
interface PlacementAnalysis {
  feed_suitability: string;
  stories_suitability: string;
  reels_suitability: string;
  mobile_friendliness: string;
  desktop_friendliness: string;
}

// Interface para análise visual expandida
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

// Interface para análise de mensagem
interface MessageAnalysis {
  value_proposition_clarity: string;
  message_match_visual: string;
  tone_of_voice: string;
  readability_score: number;
  word_count: number;
  power_words_used: string[];
}

// Interface para análise de copy expandida
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

// Interface para sugestões de teste A/B
interface ABTestSuggestion {
  test_type: string;
  hypothesis: string;
  variant_description: string;
  what_to_change: string;
  expected_outcome: string;
  metrics_to_track: string[];
  priority: "high" | "medium" | "low";
}

// Interface para recomendações expandidas
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

// Interface para correlação com performance
interface PerformanceCorrelation {
  performance_summary: string;
  visual_performance_link: string;
  copy_performance_link: string;
  underperforming_areas: string[];
  high_performing_elements: string[];
  optimization_priority: string;
}

// Interface para resposta completa e expandida da análise
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

// Prompt expandido e detalhado do sistema para análise profunda de anúncios
const SYSTEM_PROMPT = `Você é um especialista sênior em marketing digital, análise de criativos publicitários e psicologia do consumidor, com mais de 15 anos de experiência em otimização de campanhas Meta Ads (Facebook/Instagram).

Sua especialidade inclui:
- Análise detalhada de elementos visuais e design (cores, composição, hierarquia visual, tipografia)
- Psicologia da persuasão e gatilhos emocionais em publicidade
- Copywriting e análise de mensagens publicitárias
- Correlação entre elementos criativos e performance de campanhas
- Identificação de oportunidades de otimização baseadas em dados
- Design de testes A/B para maximizar resultados

IMPORTANTE: Cada anúncio é único. Sua análise deve ser específica e detalhada para ESTE anúncio em particular, mencionando elementos visuais específicos, cores exatas, textos presentes, e fazendo conexões diretas com a performance quando disponível.

NUNCA forneça análises genéricas ou que poderiam se aplicar a qualquer anúncio. Sempre mencione especificidades visuais e textuais observadas na imagem.

Quando dados de performance estiverem disponíveis, correlacione elementos específicos do criativo com os resultados obtidos, explicando POR QUE determinados elementos podem estar gerando os resultados observados.

Sempre responda em português brasileiro com linguagem profissional mas acessível.

Retorne APENAS um JSON válido no formato especificado, sem texto adicional ou markdown.`;

// Função para construir o prompt expandido e detalhado de análise
function buildAnalysisPrompt(
  copyData: RequestPayload["copy_data"],
  performanceContext?: PerformanceContext
): string {
  // Seção de textos do anúncio
  const copyInfo = [];
  if (copyData.title) copyInfo.push(`📌 Título/Headline: "${copyData.title}"`);
  if (copyData.body) copyInfo.push(`📝 Corpo do anúncio: "${copyData.body}"`);
  if (copyData.description) copyInfo.push(`💬 Descrição: "${copyData.description}"`);
  if (copyData.cta) copyInfo.push(`🎯 Call-to-Action: "${copyData.cta}"`);

  const copySection = copyInfo.length > 0
    ? `\n\n═══════════════════════════════════════\n📱 TEXTOS DO ANÚNCIO\n═══════════════════════════════════════\n${copyInfo.join("\n")}`
    : "\n\nNenhum texto disponível para análise.";

  // Seção de dados de performance (se disponível)
  let performanceSection = "";
  if (performanceContext) {
    performanceSection = `\n\n═══════════════════════════════════════\n📊 DADOS DE PERFORMANCE ATUAL\n═══════════════════════════════════════
📈 Impressões: ${performanceContext.total_impressions.toLocaleString('pt-BR')}
👁️ Alcance: ${performanceContext.total_impressions.toLocaleString('pt-BR')}
🖱️ Cliques: ${performanceContext.total_clicks.toLocaleString('pt-BR')}
📊 CTR (Taxa de Cliques): ${performanceContext.ctr.toFixed(2)}%
💰 CPC (Custo por Clique): R$ ${performanceContext.cpc.toFixed(2)}
💵 CPM (Custo por Mil Impressões): R$ ${performanceContext.cpm.toFixed(2)}
💸 Investimento Total: R$ ${performanceContext.total_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🎯 Conversões: ${performanceContext.conversions}
📈 Taxa de Conversão: ${performanceContext.conversion_rate.toFixed(2)}%
${performanceContext.campaign_objective ? `🎯 Objetivo da Campanha: ${performanceContext.campaign_objective}` : ''}

⚠️ IMPORTANTE: Use estes dados de performance para:
1. Identificar quais elementos visuais/textuais podem estar contribuindo para o CTR atual
2. Explicar por que a taxa de conversão está neste nível
3. Sugerir otimizações específicas baseadas nos resultados observados
4. Correlacionar cores, mensagem e design com as métricas`;
  }

  return `═══════════════════════════════════════════════════════════════
🎨 ANÁLISE PROFUNDA DE ANÚNCIO META ADS
═══════════════════════════════════════════════════════════════

Analise este anúncio do Meta Ads de forma DETALHADA e ESPECÍFICA. Esta análise será usada para otimização real de campanhas publicitárias.
${copySection}${performanceSection}

═══════════════════════════════════════════════════════════════
🔍 INSTRUÇÕES DE ANÁLISE DETALHADA
═══════════════════════════════════════════════════════════════

1️⃣ ANÁLISE VISUAL PROFUNDA:
   - Identifique TODOS os elementos visuais específicos (pessoas, produtos, objetos, ambientes)
   - Extraia e mencione as cores EXATAS usadas (use nomes descritivos de cores ou hex se possível)
   - Analise a composição visual (regra dos terços, simetria, ponto focal, etc)
   - Identifique qualquer texto visível NA IMAGEM (não apenas no copy)
   - Avalie tipografia, fontes e legibilidade
   - Analise contraste, hierarquia visual e fluxo do olhar

2️⃣ ANÁLISE PSICOLÓGICA E EMOCIONAL:
   - Qual emoção primária este anúncio evoca? Seja específico
   - Quais gatilhos emocionais estão presentes? (escassez, urgência, prova social, autoridade, etc)
   - Qual é a carga cognitiva? (fácil de processar ou exige esforço mental?)
   - Quais sinais de confiança estão presentes ou faltando?
   - Para qual público-alvo este criativo é mais adequado? Seja específico (idade, interesses, comportamentos)

3️⃣ ANÁLISE DE PRIMEIRO IMPACTO (primeiros 3 segundos):
   - O que o usuário capta imediatamente ao ver o anúncio?
   - Qual o potencial de "parar o scroll"? Por quê?
   - Onde o olho é naturalmente atraído primeiro?
   - A mensagem principal é clara em 3 segundos?

4️⃣ ANÁLISE DE COPY E MENSAGEM:
   - A proposta de valor é clara? Como ela está comunicada?
   - Há coerência entre mensagem visual e textual?
   - O tom de voz é adequado? Qual é ele?
   - O CTA é efetivo? Por quê sim ou não?
   - Existem palavras poderosas (power words)? Quais?
   - O texto vende benefícios ou apenas características?

5️⃣ ANÁLISE DE PLACEMENT E CONTEXTO:
   - Este anúncio funciona bem no feed do Facebook/Instagram? Por quê?
   - E nos stories? E em reels?
   - É mobile-friendly? E em desktop?
   - Há elementos que podem não aparecer bem em diferentes tamanhos?

6️⃣ CORRELAÇÃO COM PERFORMANCE ${performanceContext ? '(OBRIGATÓRIO - DADOS DISPONÍVEIS)' : '(quando disponível)'}:
   ${performanceContext ? `
   - Por que o CTR está em ${performanceContext.ctr.toFixed(2)}%? Quais elementos visuais/textuais explicam isso?
   - A taxa de conversão de ${performanceContext.conversion_rate.toFixed(2)}% indica o quê sobre clareza da oferta?
   - O CPC de R$ ${performanceContext.cpc.toFixed(2)} sugere o quê sobre a competitividade do criativo?
   - Quais elementos específicos você mudaria para melhorar estas métricas?` :
   'Se dados estiverem disponíveis, correlacione elementos específicos com resultados'}

7️⃣ TENDÊNCIAS E MODERNIDADE:
   - Este criativo segue tendências atuais de design?
   - Há elementos que parecem datados?
   - Como ele se compara com anúncios de sucesso atuais?

8️⃣ RECOMENDAÇÕES ACIONÁVEIS:
   - Forneça 5-8 recomendações ESPECÍFICAS e PRÁTICAS
   - Para cada recomendação, explique o impacto esperado e dificuldade de implementação
   - Priorize por impacto potencial (high/medium/low)

9️⃣ SUGESTÕES DE TESTES A/B:
   - Sugira 3-5 testes A/B específicos com hipóteses claras
   - Para cada teste, explique o que mudar, por que, e que métrica deve melhorar

═══════════════════════════════════════════════════════════════

Retorne um JSON com esta estrutura COMPLETA E DETALHADA:
{
  "creative_score": <número de 0 a 100 - baseado em visual e design>,
  "copy_score": <número de 0 a 100 - baseado em mensagem e copy>,
  "overall_score": <número de 0 a 100 - média ponderada considerando contexto>,

  "visual_analysis": {
    "composition_score": <número de 0 a 100>,
    "color_usage": "<descrição ESPECÍFICA das cores usadas, mencione cores exatas>",
    "text_visibility": "<avaliação detalhada de legibilidade com exemplos específicos>",
    "brand_consistency": "<avaliação da consistência visual com detalhes>",
    "attention_grabbing": "<análise detalhada da capacidade de capturar atenção>",
    "key_strengths": ["<ponto forte específico 1>", "<ponto forte específico 2>", "..."],
    "improvement_areas": ["<área específica de melhoria 1>", "<área específica 2>", "..."],

    "visual_elements": {
      "detected_objects": ["<objeto/pessoa/produto 1>", "<objeto 2>", "..."],
      "color_palette": ["<cor 1 ex: azul royal #0047AB>", "<cor 2>", "..."],
      "typography_analysis": "<análise detalhada de fontes e textos visíveis>",
      "composition_type": "<tipo de composição: regra dos terços, centralizado, assimétrico, etc>",
      "visual_hierarchy": "<análise da hierarquia visual e fluxo do olhar>",
      "contrast_level": "<alto|médio|baixo - com justificativa>"
    },

    "psychological_analysis": {
      "primary_emotion": "<emoção primária evocada - seja específico>",
      "emotional_triggers": ["<gatilho 1: ex: escassez>", "<gatilho 2>", "..."],
      "persuasion_techniques": ["<técnica 1>", "<técnica 2>", "..."],
      "target_audience_fit": "<descrição detalhada do público-alvo ideal>",
      "cognitive_load": "<baixa|média|alta - com explicação>",
      "trust_signals": ["<sinal de confiança 1>", "<sinal 2>", "..."]
    },

    "first_impression": {
      "attention_score": <número de 0 a 100>,
      "scrollstopper_potential": "<alto|médio|baixo - com justificativa detalhada>",
      "three_second_message": "<o que se capta em 3 segundos>",
      "visual_clarity": "<análise da claridade visual imediata>",
      "focal_point": "<onde o olho é atraído primeiro - seja específico>"
    },

    "placement_analysis": {
      "feed_suitability": "<análise detalhada para feed>",
      "stories_suitability": "<análise para stories>",
      "reels_suitability": "<análise para reels>",
      "mobile_friendliness": "<análise de mobile com detalhes>",
      "desktop_friendliness": "<análise de desktop com detalhes>"
    },

    "design_trends": "<análise de aderência a tendências atuais>",
    "modernization_suggestions": ["<sugestão 1>", "<sugestão 2>", "..."]
  },

  "copy_analysis": {
    "clarity_score": <número de 0 a 100>,
    "persuasion_level": "<baixo|médio|alto>",
    "urgency_present": <true|false>,
    "cta_effectiveness": "<avaliação detalhada do CTA>",
    "emotional_appeal": "<análise do apelo emocional com exemplos>",
    "key_strengths": ["<ponto forte específico>", "..."],
    "improvement_areas": ["<área de melhoria específica>", "..."],

    "message_analysis": {
      "value_proposition_clarity": "<análise da clareza da proposta>",
      "message_match_visual": "<análise de coerência visual-textual>",
      "tone_of_voice": "<identificação do tom - ex: casual, profissional, urgente>",
      "readability_score": <número de 0 a 100>,
      "word_count": <número de palavras>,
      "power_words_used": ["<palavra poderosa 1>", "<palavra 2>", "..."]
    },

    "headline_effectiveness": "<análise específica do headline>",
    "body_copy_effectiveness": "<análise do corpo do texto>",
    "cta_placement_analysis": "<análise do posicionamento do CTA>",
    "benefits_vs_features": "<análise se foca em benefícios ou características>"
  },

  "recommendations": [
    {
      "priority": "<high|medium|low>",
      "category": "<visual|copy|cta|targeting|general>",
      "title": "<título específico da recomendação>",
      "description": "<descrição DETALHADA e ESPECÍFICA do que fazer>",
      "expected_impact": "<impacto esperado com justificativa>",
      "implementation_difficulty": "<easy|medium|hard>",
      "estimated_impact_percentage": "<ex: +15-25% no CTR>",
      "ab_test_suggestion": {
        "test_type": "<visual|copy|cta|layout|color>",
        "hypothesis": "<hipótese clara do teste>",
        "variant_description": "<descrição da variante>",
        "what_to_change": "<o que mudar especificamente>",
        "expected_outcome": "<resultado esperado>",
        "metrics_to_track": ["<métrica 1>", "<métrica 2>", "..."],
        "priority": "<high|medium|low>"
      }
    }
  ],

  ${performanceContext ? `"performance_correlation": {
    "performance_summary": "<resumo da performance atual com números>",
    "visual_performance_link": "<como elementos visuais ESPECÍFICOS impactam as métricas>",
    "copy_performance_link": "<como a copy ESPECÍFICA impacta as métricas>",
    "underperforming_areas": ["<área 1>", "<área 2>", "..."],
    "high_performing_elements": ["<elemento 1>", "<elemento 2>", "..."],
    "optimization_priority": "<qual otimização priorizar baseado em dados>"
  },` : ''}

  "ab_test_suggestions": [
    {
      "test_type": "<visual|copy|cta|layout|color>",
      "hypothesis": "<hipótese do teste>",
      "variant_description": "<descrição da variante>",
      "what_to_change": "<mudança específica>",
      "expected_outcome": "<resultado esperado>",
      "metrics_to_track": ["<métrica 1>", "..."],
      "priority": "<high|medium|low>"
    }
  ],

  "competitive_analysis": "<análise comparativa com padrões do mercado>",
  "audience_insights": "<insights sobre público-alvo ideal baseado no criativo>",
  "strategic_recommendations": "<recomendações estratégicas de alto nível>"
}

⚠️ IMPORTANTE:
- Forneça 5-8 recomendações detalhadas priorizadas
- Inclua 3-5 sugestões de testes A/B práticos
- Seja ESPECÍFICO em cada campo - mencione cores, objetos, textos exatos
- Correlacione com performance quando dados disponíveis
- NUNCA use análises genéricas que servem para qualquer anúncio`;
}

/**
 * Baixa uma imagem de uma URL e converte para base64
 * Necessário porque URLs do Facebook requerem autenticação
 * e não podem ser acessadas diretamente pelo OpenAI
 */
async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  console.log("Downloading image from:", imageUrl);
  
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  // Detecta o tipo MIME da imagem
  const contentType = response.headers.get("content-type") || "image/jpeg";
  let mimeType = "image/jpeg";
  
  if (contentType.includes("png")) {
    mimeType = "image/png";
  } else if (contentType.includes("gif")) {
    mimeType = "image/gif";
  } else if (contentType.includes("webp")) {
    mimeType = "image/webp";
  }

  // Converte a imagem para ArrayBuffer e depois para base64
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Converte para base64 usando método compatível com Deno
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);

  console.log(`Image downloaded: ${uint8Array.length} bytes, type: ${mimeType}`);
  
  return { base64, mimeType };
}

// Função expandida para chamar a API do OpenAI com GPT-4 Vision usando base64 e contexto de performance
async function analyzeWithGPT4Vision(
  imageBase64: string,
  imageMimeType: string,
  copyData: RequestPayload["copy_data"],
  performanceContext: PerformanceContext | undefined,
  openaiApiKey: string
): Promise<{ analysis: AIAnalysisResponse; tokensUsed: number }> {
  const userPrompt = buildAnalysisPrompt(copyData, performanceContext);

  // Monta a URL de dados base64 para a imagem
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

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
                url: imageDataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4000, // Aumentado para permitir análises mais profundas e detalhadas
      temperature: 0.5, // Ajustado para respostas mais criativas e específicas
      top_p: 0.9, // Controle de diversidade de respostas
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

    // Parse do body da requisição expandido com contexto de performance
    const payload: RequestPayload = await req.json();
    const { ad_id, meta_ad_account_id, image_url, copy_data, performance_context } = payload;

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

    // Busca workspace do usuario (pega o mais antigo se houver multiplos)
    const { data: workspacesList } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    const workspace = workspacesList?.[0] || null;
    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Baixa a imagem e converte para base64
    console.log("Starting image download...");
    const { base64: imageBase64, mimeType: imageMimeType } = await downloadImageAsBase64(image_url);
    console.log("Image downloaded successfully");

    // Executa análise expandida com GPT-4 Vision usando imagem em base64 e contexto de performance
    console.log("Starting AI analysis with GPT-4 Vision...");
    if (performance_context) {
      console.log("Performance context provided:", performance_context);
    }
    const { analysis, tokensUsed } = await analyzeWithGPT4Vision(
      imageBase64,
      imageMimeType,
      copy_data || {},
      performance_context,
      openaiApiKey
    );
    console.log("AI analysis completed successfully");

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
