/**
 * Edge Function: meta-analyze-metrics-ai
 *
 * Analisa metricas de campanhas/anuncios usando IA (GPT-4o) para
 * gerar insights acionaveis sobre performance, tendencias e otimizacao.
 *
 * Melhorias:
 * - ROAS e ignorado quando nao configurado (campanha sem evento de compra)
 * - Leads e conversas de mensagens incluidos quando disponiveis
 * - Analise ajustada ao objetivo real da campanha
 * - Instrucoes explicitas para nao penalizar campanhas sem evento de compra
 *
 * POST /functions/v1/meta-analyze-metrics-ai
 * Body: {
 *   entity_id: string,
 *   entity_name: string,
 *   entity_level: 'ad' | 'adset' | 'campaign' | 'account',
 *   meta_ad_account_id: string,
 *   metrics_data: MetricsInputData
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MetricsInputData {
  entity_id: string;
  entity_name: string;
  entity_level: string;
  start_date: string;
  end_date: string;
  days_count: number;
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_spend: number;
  total_conversions: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_frequency: number;
  avg_conversion_rate: number;
  avg_cost_per_conversion: number;
  // Campos condicionais — presentes apenas quando configurados na campanha
  roas?: number;
  total_purchase_value?: number;
  total_leads?: number;
  avg_cost_per_lead?: number;
  total_messaging_conversations?: number;
  avg_cost_per_messaging_conversation?: number;
  daily_metrics?: DailyMetricPoint[];
  previous_period?: PreviousPeriodComparison;
  benchmarks?: MetricsBenchmarks;
  campaign_objective?: string;
}

interface DailyMetricPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions?: number;
}

interface PreviousPeriodComparison {
  impressions_change_percent: number;
  clicks_change_percent: number;
  spend_change_percent: number;
  ctr_change_percent: number;
  cpc_change_percent: number;
  conversions_change_percent: number;
}

interface MetricsBenchmarks {
  context_name: string;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_conversion_rate: number;
}

interface RequestPayload {
  entity_id: string;
  entity_name: string;
  entity_level: string;
  meta_ad_account_id: string;
  metrics_data: MetricsInputData;
}

/**
 * Detecta quais metricas de resultado estao disponiveis e determina o contexto de avaliacao.
 */
function detectCampaignContext(data: MetricsInputData): {
  hasRoas: boolean;
  hasLeads: boolean;
  hasMessaging: boolean;
  hasConversions: boolean;
  contextDescription: string;
} {
  const hasRoas = typeof data.roas === "number" && data.roas > 0;
  const hasLeads = typeof data.total_leads === "number" && data.total_leads > 0;
  const hasMessaging =
    typeof data.total_messaging_conversations === "number" &&
    data.total_messaging_conversations > 0;
  const hasConversions =
    data.total_conversions > 0 || data.avg_conversion_rate > 0;

  let contextDescription = "";
  if (data.campaign_objective) {
    contextDescription = `Objetivo da campanha: ${data.campaign_objective}. `;
  }

  if (hasRoas) {
    contextDescription += "Esta campanha tem evento de compra configurado e gera dados de receita/ROAS.";
  } else if (hasLeads && hasMessaging) {
    contextDescription +=
      "Esta campanha gera leads E conversas de mensagens. Avalie pelos resultados combinados.";
  } else if (hasLeads) {
    contextDescription +=
      "Esta campanha tem objetivo de geracao de leads. Avalie principalmente pelo custo por lead e volume de leads.";
  } else if (hasMessaging) {
    contextDescription +=
      "Esta campanha tem objetivo de mensagens (Messenger/WhatsApp/Instagram Direct). Avalie pelo custo por conversa iniciada.";
  } else if (hasConversions) {
    contextDescription +=
      "Esta campanha registra conversoes (sem valor monetario configurado). Avalie pelo custo por conversao e taxa de conversao.";
  } else {
    contextDescription +=
      "Esta campanha nao possui evento de conversao configurado. Avalie exclusivamente por metricas de alcance, engajamento (CTR, CPM, frequencia) e eficiencia de custo por clique.";
  }

  return { hasRoas, hasLeads, hasMessaging, hasConversions, contextDescription };
}

const SYSTEM_PROMPT = `Você é um analista sênior de marketing digital especializado em publicidade Meta Ads (Facebook/Instagram), com mais de 15 anos de experiência em otimização de campanhas e análise de dados.

Sua especialidade inclui:
- Análise profunda de métricas de performance (CTR, CPC, CPM, Conversões, Leads, Mensagens)
- Interpretação de campanhas com diferentes objetivos: vendas, leads, mensagens, alcance, tráfego
- Identificação de tendências e padrões em dados históricos
- Detecção de anomalias e problemas de performance
- Recomendações estratégicas baseadas nos objetivos reais da campanha
- Benchmarking e análise comparativa
- Previsão de resultados e otimização de orçamento

REGRAS CRÍTICAS:
1. NUNCA mencione ROAS, receita ou retorno sobre investimento financeiro se esses dados não estiverem presentes nos dados fornecidos. A ausência de ROAS NÃO é um problema — significa apenas que a campanha não tem evento de compra configurado, o que é completamente normal para campanhas de leads, mensagens ou tráfego.
2. SEMPRE avalie a campanha pelos objetivos e métricas disponíveis. Uma campanha de leads deve ser julgada pelo custo por lead, não por ROAS.
3. NUNCA sugira "configurar ROAS" como recomendação se não houver indício de que esse é o objetivo da campanha.
4. Seja PRECISO com números e percentuais — mencione os valores reais dos dados fornecidos.
5. Forneça insights ACIONÁVEIS e PRÁTICOS para o objetivo real da campanha.
6. Priorize recomendações por IMPACTO POTENCIAL dentro do contexto disponível.
7. O conversion_score deve refletir a performance de conversão disponível: use leads, mensagens ou conversões genéricas — nunca penalize pela ausência de ROAS.

Sempre responda em português brasileiro com linguagem profissional mas acessível.
Retorne APENAS um JSON válido no formato especificado, sem texto adicional ou markdown.`;

/**
 * Monta o prompt de analise com base apenas nas metricas disponíveis.
 * Omite completamente secoes de ROAS/receita quando nao configuradas.
 */
function buildAnalysisPrompt(data: MetricsInputData): string {
  const ctx = detectCampaignContext(data);

  const entityLabel =
    data.entity_level === "ad"
      ? "anúncio"
      : data.entity_level === "adset"
      ? "conjunto de anúncios"
      : data.entity_level === "campaign"
      ? "campanha"
      : "conta";

  const metricsSection = `
=== MÉTRICAS DO PERÍODO (${data.start_date} até ${data.end_date} — ${data.days_count} dias) ===

📊 VOLUME E ALCANCE:
- Impressões: ${data.total_impressions.toLocaleString("pt-BR")}
- Alcance único: ${data.total_reach.toLocaleString("pt-BR")}
- Frequência média: ${data.avg_frequency.toFixed(2)}

🖱️ ENGAJAMENTO:
- Cliques: ${data.total_clicks.toLocaleString("pt-BR")}
- CTR (Taxa de Cliques): ${data.avg_ctr.toFixed(2)}%

💰 CUSTOS:
- Investimento total: R$ ${data.total_spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- CPC (Custo por Clique): R$ ${data.avg_cpc.toFixed(2)}
- CPM (Custo por Mil Impressões): R$ ${data.avg_cpm.toFixed(2)}`;

  // Secao de resultados — exibe apenas o que existe
  let resultsSection = "";

  if (ctx.hasRoas && data.roas != null) {
    resultsSection = `

🎯 RESULTADOS DE CONVERSÃO (COMPRAS):
- Conversões (compras): ${data.total_conversions.toLocaleString("pt-BR")}
- Taxa de Conversão: ${data.avg_conversion_rate.toFixed(2)}%
- Custo por Conversão: R$ ${data.avg_cost_per_conversion.toFixed(2)}
- Receita total gerada: R$ ${(data.total_purchase_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- ROAS: ${data.roas.toFixed(2)}x`;
  } else if (ctx.hasLeads && ctx.hasMessaging) {
    resultsSection = `

🎯 RESULTADOS DE LEADS:
- Total de leads: ${data.total_leads?.toLocaleString("pt-BR")}
- Custo por Lead (CPL): R$ ${data.avg_cost_per_lead?.toFixed(2)}

💬 RESULTADOS DE MENSAGENS:
- Conversas iniciadas: ${data.total_messaging_conversations?.toLocaleString("pt-BR")}
- Custo por Conversa: R$ ${data.avg_cost_per_messaging_conversation?.toFixed(2)}`;
  } else if (ctx.hasLeads) {
    resultsSection = `

🎯 RESULTADOS DE LEADS:
- Total de leads gerados: ${data.total_leads?.toLocaleString("pt-BR")}
- Custo por Lead (CPL): R$ ${data.avg_cost_per_lead?.toFixed(2)}`;
  } else if (ctx.hasMessaging) {
    resultsSection = `

💬 RESULTADOS DE MENSAGENS:
- Conversas iniciadas: ${data.total_messaging_conversations?.toLocaleString("pt-BR")}
- Custo por Conversa iniciada: R$ ${data.avg_cost_per_messaging_conversation?.toFixed(2)}`;
  } else if (ctx.hasConversions) {
    resultsSection = `

🎯 CONVERSÕES:
- Total de conversões: ${data.total_conversions.toLocaleString("pt-BR")}
- Taxa de Conversão: ${data.avg_conversion_rate.toFixed(2)}%
- Custo por Conversão: R$ ${data.avg_cost_per_conversion.toFixed(2)}`;
  }

  let previousPeriodSection = "";
  if (data.previous_period) {
    const pp = data.previous_period;
    const fmt = (v: number) => (v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`);
    previousPeriodSection = `

📈 COMPARATIVO COM PERÍODO ANTERIOR:
- Impressões: ${fmt(pp.impressions_change_percent)}
- Cliques: ${fmt(pp.clicks_change_percent)}
- CTR: ${fmt(pp.ctr_change_percent)}
- CPC: ${fmt(pp.cpc_change_percent)}
- Investimento: ${fmt(pp.spend_change_percent)}
${ctx.hasRoas || ctx.hasConversions ? `- Conversões: ${fmt(pp.conversions_change_percent)}` : ""}`;
  }

  let benchmarkSection = "";
  if (data.benchmarks) {
    const b = data.benchmarks;
    benchmarkSection = `

📊 BENCHMARKS (${b.context_name}):
- CTR médio: ${b.avg_ctr.toFixed(2)}%
- CPC médio: R$ ${b.avg_cpc.toFixed(2)}
- CPM médio: R$ ${b.avg_cpm.toFixed(2)}`;
  }

  let trendSection = "";
  if (data.daily_metrics && data.daily_metrics.length > 0) {
    const first3 = data.daily_metrics.slice(0, 3);
    const last3 = data.daily_metrics.slice(-3);
    trendSection = `

📅 TENDÊNCIA DIÁRIA (amostra):
Primeiros dias: ${first3.map((d) => `${d.date}: CTR ${d.ctr.toFixed(2)}%, CPC R$${d.cpc.toFixed(2)}`).join(" | ")}
Últimos dias: ${last3.map((d) => `${d.date}: CTR ${d.ctr.toFixed(2)}%, CPC R$${d.cpc.toFixed(2)}`).join(" | ")}`;
  }

  const conversionScoreInstruction = ctx.hasRoas
    ? "conversion_score: Performance de conversões e ROAS (0=péssimo, 100=excelente)"
    : ctx.hasLeads
    ? "conversion_score: Performance de geração de leads — volume e custo por lead (0=péssimo, 100=excelente). IGNORE ROAS pois não está configurado."
    : ctx.hasMessaging
    ? "conversion_score: Performance de mensagens — volume e custo por conversa (0=péssimo, 100=excelente). IGNORE ROAS pois não está configurado."
    : ctx.hasConversions
    ? "conversion_score: Performance de conversões genéricas — volume e custo por conversão (0=péssimo, 100=excelente). IGNORE ROAS."
    : "conversion_score: Avalie com base em CTR e engajamento, pois não há evento de conversão configurado. NÃO penalize por ausência de ROAS ou conversões.";

  const criticalAlerts = [
    !ctx.hasRoas
      ? "- Esta campanha NÃO tem ROAS configurado. NÃO mencione ROAS, receita nem retorno financeiro em nenhuma parte da análise, diagnóstico, insights ou recomendações."
      : "",
    ctx.hasLeads
      ? "- Avalie o sucesso principalmente pelo CPL (custo por lead) e volume de leads."
      : "",
    ctx.hasMessaging
      ? "- Avalie o sucesso principalmente pelo custo por conversa iniciada e volume de conversas."
      : "",
    !ctx.hasRoas && !ctx.hasLeads && !ctx.hasMessaging && !ctx.hasConversions
      ? "- Esta campanha não tem evento de conversão. Foque em métricas de eficiência (CTR, CPM, CPC) e alcance."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Analise as métricas de performance deste ${entityLabel}: "${data.entity_name}"

CONTEXTO DA CAMPANHA: ${ctx.contextDescription}
${metricsSection}${resultsSection}${previousPeriodSection}${benchmarkSection}${trendSection}

=== INSTRUÇÕES DE ANÁLISE ===

Com base nos dados acima, forneça uma análise DETALHADA e ESPECÍFICA incluindo:

1. SCORES DE PERFORMANCE (0-100):
   - overall_score: Avaliação geral considerando todos os fatores disponíveis
   - efficiency_score: Eficiência de CTR e engajamento vs benchmarks
   - cost_score: Otimização de custos (CPC, CPM)
   - reach_score: Alcance e frequência
   - ${conversionScoreInstruction}
   - trend_score: Tendência de evolução

2. RESUMO EXECUTIVO: Síntese em 2-3 frases focada nos objetivos reais da campanha

3. DIAGNÓSTICO: Análise detalhada dos pontos fortes e fracos

4. TENDÊNCIAS: Identificar padrões de melhora/piora nas métricas disponíveis

5. ANOMALIAS: Detectar valores fora do padrão

6. COMPARAÇÃO COM BENCHMARKS: Como está em relação às médias (quando disponíveis)

7. INSIGHTS: 3-5 insights acionáveis priorizados por impacto

8. RECOMENDAÇÕES: 3-5 ações práticas para otimização dentro do objetivo da campanha

ATENÇÃO CRÍTICA:
${criticalAlerts}

Retorne um JSON com esta estrutura:
{
  "performance_scores": {
    "overall_score": <0-100>,
    "efficiency_score": <0-100>,
    "cost_score": <0-100>,
    "reach_score": <0-100>,
    "conversion_score": <0-100>,
    "trend_score": <0-100>
  },
  "executive_summary": "<resumo executivo em 2-3 frases>",
  "overall_diagnosis": "<diagnóstico detalhado da performance>",
  "trends": [
    {
      "metric": "<nome da métrica>",
      "direction": "<improving|declining|stable|volatile>",
      "change_percent": <número>,
      "period_description": "<descrição do período>",
      "interpretation": "<interpretação da tendência>",
      "action_suggested": "<ação sugerida>"
    }
  ],
  "anomalies": [
    {
      "metric": "<métrica afetada>",
      "anomaly_type": "<spike|drop|pattern_break>",
      "severity": "<critical|high|medium|low>",
      "date_detected": "<data ou período>",
      "description": "<descrição da anomalia>",
      "possible_causes": ["<causa 1>", "<causa 2>"],
      "recommended_actions": ["<ação 1>", "<ação 2>"]
    }
  ],
  "benchmark_comparisons": [
    {
      "metric": "<nome da métrica>",
      "current_value": <valor atual>,
      "benchmark_value": <valor benchmark>,
      "difference_percent": <diferença %>,
      "status": "<excellent|good|average|below_average|poor>",
      "interpretation": "<interpretação>"
    }
  ],
  "insights": [
    {
      "id": "<id único>",
      "type": "<performance|trend|anomaly|optimization|alert|benchmark>",
      "title": "<título do insight>",
      "description": "<descrição detalhada>",
      "impact": "<critical|high|medium|low>",
      "confidence": <0-100>,
      "metric_affected": "<métrica principal>",
      "current_value": "<valor atual formatado>",
      "expected_value": "<valor esperado/ideal>",
      "recommendation": "<recomendação específica>",
      "potential_improvement": "<melhoria potencial estimada>"
    }
  ],
  "recommendations": [
    {
      "priority": "<critical|high|medium|low>",
      "category": "<budget|targeting|bidding|schedule|creative|general>",
      "title": "<título da recomendação>",
      "description": "<descrição detalhada>",
      "expected_impact": "<impacto esperado>",
      "implementation_steps": ["<passo 1>", "<passo 2>"],
      "metrics_to_monitor": ["<métrica 1>", "<métrica 2>"],
      "estimated_improvement": "<melhoria estimada>"
    }
  ],
  "short_term_forecast": "<previsão para os próximos 7-14 dias>",
  "priority_areas": ["<área 1>", "<área 2>", "<área 3>"]
}`;
}

async function analyzeWithGPT4(
  metricsData: MetricsInputData,
  openaiApiKey: string
): Promise<{ analysis: any; tokensUsed: number }> {
  const userPrompt = buildAnalysisPrompt(metricsData);

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
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || response.statusText;
    console.error("OpenAI API error:", errorMessage, "Status:", response.status);

    if (response.status === 429) {
      throw new Error(
        "Limite de requisições da IA atingido. Aguarde alguns minutos e tente novamente."
      );
    } else if (response.status === 401) {
      throw new Error("Erro de autenticação com serviço de IA. Contate o suporte.");
    } else if (response.status >= 500) {
      throw new Error(
        "Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos."
      );
    }
    throw new Error(`Erro ao processar análise: ${errorMessage}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  const cleanContent = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const analysis = JSON.parse(cleanContent);
    return { analysis, tokensUsed };
  } catch (_parseError) {
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
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: RequestPayload = await req.json();
    const { entity_id, entity_name, entity_level, meta_ad_account_id, metrics_data } =
      payload;

    if (!entity_id || !entity_name || !entity_level || !metrics_data) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: entity_id, entity_name, entity_level, metrics_data",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!metrics_data.total_impressions || metrics_data.total_impressions === 0) {
      return new Response(
        JSON.stringify({
          error: "Dados insuficientes para análise",
          details: "O anúncio precisa ter pelo menos algumas impressões para ser analisado.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!metrics_data.start_date || !metrics_data.end_date) {
      return new Response(
        JSON.stringify({
          error: "Período de análise inválido",
          details: "As datas de início e fim do período são obrigatórias.",
        }),
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

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          details:
            "Você precisa criar ou participar de um workspace para usar esta funcionalidade.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx = detectCampaignContext(metrics_data);
    console.log("Starting metrics analysis — context:", ctx.contextDescription);

    const { analysis, tokensUsed } = await analyzeWithGPT4(metrics_data, openaiApiKey);
    console.log("Metrics analysis completed successfully");

    const analysisRecord = {
      workspace_id: workspaceId,
      entity_id,
      entity_name,
      entity_level,
      analysis_period: {
        start_date: metrics_data.start_date,
        end_date: metrics_data.end_date,
      },
      performance_scores: analysis.performance_scores || {},
      executive_summary: analysis.executive_summary || "",
      overall_diagnosis: analysis.overall_diagnosis || "",
      trends: analysis.trends || [],
      anomalies: analysis.anomalies || [],
      benchmark_comparisons: analysis.benchmark_comparisons || [],
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      short_term_forecast: analysis.short_term_forecast || null,
      priority_areas: analysis.priority_areas || [],
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };

    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("meta_metrics_ai_analyses")
      .insert(analysisRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          analysis: { ...analysisRecord, id: "temp-" + Date.now() },
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
