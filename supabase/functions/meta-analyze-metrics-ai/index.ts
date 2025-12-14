/**
 * Edge Function: meta-analyze-metrics-ai
 *
 * Analisa metricas de campanhas/anuncios usando IA (GPT-4) para
 * gerar insights acionaveis sobre performance, tendencias e otimizacao.
 *
 * POST /functions/v1/meta-analyze-metrics-ai
 * Body: {
 *   entity_id: string,
 *   entity_name: string,
 *   entity_level: 'ad' | 'adset' | 'campaign' | 'account',
 *   meta_ad_account_id: string,
 *   metrics_data: MetricsInputData
 * }
 *
 * Retorna: { analysis: MetricsAIAnalysis, tokens_used: number, saved: boolean }
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
  roas?: number;
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

const SYSTEM_PROMPT = `Voce e um analista senior de marketing digital especializado em publicidade Meta Ads (Facebook/Instagram), com mais de 15 anos de experiencia em otimizacao de campanhas e analise de dados.

Sua especialidade inclui:
- Analise profunda de metricas de performance (CTR, CPC, CPM, ROAS, Conversoes)
- Identificacao de tendencias e padroes em dados historicos
- Deteccao de anomalias e problemas de performance
- Recomendacoes estrategicas baseadas em dados
- Benchmarking e analise comparativa
- Previsao de resultados e otimizacao de orcamento

IMPORTANTE:
- Analise os dados ESPECIFICOS fornecidos, nao faca suposicoes genericas
- Seja PRECISO com numeros e percentuais
- Forneca insights ACIONAVEIS e PRATICOS
- Priorize recomendacoes por IMPACTO POTENCIAL
- Considere o contexto do periodo analisado
- Compare com benchmarks quando disponiveis

Sempre responda em portugues brasileiro com linguagem profissional mas acessivel.

Retorne APENAS um JSON valido no formato especificado, sem texto adicional ou markdown.`;

function buildAnalysisPrompt(data: MetricsInputData): string {
  const metricsSection = `
=== METRICAS DO PERIODO (${data.start_date} ate ${data.end_date} - ${data.days_count} dias) ===

📊 VOLUME E ALCANCE:
- Impressoes: ${data.total_impressions.toLocaleString('pt-BR')}
- Alcance: ${data.total_reach.toLocaleString('pt-BR')}
- Frequencia Media: ${data.avg_frequency.toFixed(2)}

🖱️ ENGAJAMENTO:
- Cliques: ${data.total_clicks.toLocaleString('pt-BR')}
- CTR (Taxa de Cliques): ${data.avg_ctr.toFixed(2)}%

💰 CUSTOS:
- Investimento Total: R$ ${data.total_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- CPC (Custo por Clique): R$ ${data.avg_cpc.toFixed(2)}
- CPM (Custo por Mil): R$ ${data.avg_cpm.toFixed(2)}

🎯 CONVERSOES:
- Conversoes: ${data.total_conversions}
- Taxa de Conversao: ${data.avg_conversion_rate.toFixed(2)}%
- Custo por Conversao: R$ ${data.avg_cost_per_conversion.toFixed(2)}
${data.roas ? `- ROAS: ${data.roas.toFixed(2)}` : ''}`;

  let previousPeriodSection = '';
  if (data.previous_period) {
    const pp = data.previous_period;
    const formatChange = (v: number) => v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
    previousPeriodSection = `

📈 COMPARATIVO COM PERIODO ANTERIOR:
- Impressoes: ${formatChange(pp.impressions_change_percent)}
- Cliques: ${formatChange(pp.clicks_change_percent)}
- CTR: ${formatChange(pp.ctr_change_percent)}
- CPC: ${formatChange(pp.cpc_change_percent)}
- Investimento: ${formatChange(pp.spend_change_percent)}
- Conversoes: ${formatChange(pp.conversions_change_percent)}`;
  }

  let benchmarkSection = '';
  if (data.benchmarks) {
    const b = data.benchmarks;
    benchmarkSection = `

📊 BENCHMARKS (${b.context_name}):
- CTR Medio: ${b.avg_ctr.toFixed(2)}%
- CPC Medio: R$ ${b.avg_cpc.toFixed(2)}
- CPM Medio: R$ ${b.avg_cpm.toFixed(2)}`;
  }

  let trendSection = '';
  if (data.daily_metrics && data.daily_metrics.length > 0) {
    const first3 = data.daily_metrics.slice(0, 3);
    const last3 = data.daily_metrics.slice(-3);
    trendSection = `

📅 TENDENCIA DIARIA (amostra):
Primeiros dias: ${first3.map(d => `${d.date}: CTR ${d.ctr.toFixed(2)}%, CPC R$${d.cpc.toFixed(2)}`).join(' | ')}
Ultimos dias: ${last3.map(d => `${d.date}: CTR ${d.ctr.toFixed(2)}%, CPC R$${d.cpc.toFixed(2)}`).join(' | ')}`;
  }

  return `Analise as metricas de performance deste ${data.entity_level === 'ad' ? 'anuncio' : data.entity_level === 'adset' ? 'conjunto de anuncios' : 'campanha'}: "${data.entity_name}"
${metricsSection}${previousPeriodSection}${benchmarkSection}${trendSection}

=== INSTRUCOES DE ANALISE ===

Com base nos dados acima, forneca uma analise DETALHADA e ESPECIFICA incluindo:

1. SCORES DE PERFORMANCE (0-100):
   - overall_score: Avaliacao geral considerando todos os fatores
   - efficiency_score: Eficiencia de CTR e engajamento
   - cost_score: Otimizacao de custos (CPC, CPM)
   - reach_score: Alcance e frequencia
   - conversion_score: Performance de conversoes
   - trend_score: Tendencia de evolucao

2. RESUMO EXECUTIVO: Sintese em 2-3 frases do status geral

3. DIAGNOSTICO: Analise detalhada dos pontos fortes e fracos

4. TENDENCIAS: Identificar padroes de melhora/piora nas metricas

5. ANOMALIAS: Detectar valores fora do padrao que requerem atencao

6. COMPARACAO COM BENCHMARKS: Como esta em relacao as medias

7. INSIGHTS: 3-5 insights acionaveis priorizados por impacto

8. RECOMENDACOES: 3-5 acoes praticas para otimizacao

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
  "overall_diagnosis": "<diagnostico detalhado da performance>",
  "trends": [
    {
      "metric": "<nome da metrica>",
      "direction": "<improving|declining|stable|volatile>",
      "change_percent": <numero>,
      "period_description": "<descricao do periodo>",
      "interpretation": "<interpretacao da tendencia>",
      "action_suggested": "<acao sugerida>"
    }
  ],
  "anomalies": [
    {
      "metric": "<metrica afetada>",
      "anomaly_type": "<spike|drop|pattern_break>",
      "severity": "<critical|high|medium|low>",
      "date_detected": "<data ou periodo>",
      "description": "<descricao da anomalia>",
      "possible_causes": ["<causa 1>", "<causa 2>"],
      "recommended_actions": ["<acao 1>", "<acao 2>"]
    }
  ],
  "benchmark_comparisons": [
    {
      "metric": "<nome da metrica>",
      "current_value": <valor atual>,
      "benchmark_value": <valor benchmark>,
      "difference_percent": <diferenca %>,
      "status": "<excellent|good|average|below_average|poor>",
      "interpretation": "<interpretacao>"
    }
  ],
  "insights": [
    {
      "id": "<id unico>",
      "type": "<performance|trend|anomaly|optimization|alert|benchmark>",
      "title": "<titulo do insight>",
      "description": "<descricao detalhada>",
      "impact": "<critical|high|medium|low>",
      "confidence": <0-100>,
      "metric_affected": "<metrica principal>",
      "current_value": "<valor atual formatado>",
      "expected_value": "<valor esperado/ideal>",
      "recommendation": "<recomendacao especifica>",
      "potential_improvement": "<melhoria potencial estimada>"
    }
  ],
  "recommendations": [
    {
      "priority": "<critical|high|medium|low>",
      "category": "<budget|targeting|bidding|schedule|creative|general>",
      "title": "<titulo da recomendacao>",
      "description": "<descricao detalhada>",
      "expected_impact": "<impacto esperado>",
      "implementation_steps": ["<passo 1>", "<passo 2>"],
      "metrics_to_monitor": ["<metrica 1>", "<metrica 2>"],
      "estimated_improvement": "<melhoria estimada ex: +15% CTR>"
    }
  ],
  "short_term_forecast": "<previsao para os proximos 7-14 dias>",
  "priority_areas": ["<area 1>", "<area 2>", "<area 3>"]
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
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || response.statusText;
    console.error("OpenAI API error:", errorMessage, "Status:", response.status);

    if (response.status === 429) {
      throw new Error("Limite de requisicoes da IA atingido. Aguarde alguns minutos e tente novamente.");
    } else if (response.status === 401) {
      throw new Error("Erro de autenticacao com servico de IA. Contate o suporte.");
    } else if (response.status >= 500) {
      throw new Error("Servico de IA temporariamente indisponivel. Tente novamente em alguns minutos.");
    }
    throw new Error(`Erro ao processar analise: ${errorMessage}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const analysis = JSON.parse(cleanContent);
    return { analysis, tokensUsed };
  } catch (parseError) {
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
    const { entity_id, entity_name, entity_level, meta_ad_account_id, metrics_data } = payload;

    if (!entity_id || !entity_name || !entity_level || !metrics_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entity_id, entity_name, entity_level, metrics_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!metrics_data.total_impressions || metrics_data.total_impressions === 0) {
      return new Response(
        JSON.stringify({
          error: "Dados insuficientes para analise",
          details: "O anuncio precisa ter pelo menos algumas impressoes para ser analisado."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!metrics_data.start_date || !metrics_data.end_date) {
      return new Response(
        JSON.stringify({
          error: "Periodo de analise invalido",
          details: "As datas de inicio e fim do periodo sao obrigatorias."
        }),
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

    const workspace = { id: workspaceId };

    console.log("Starting metrics analysis with GPT-4...");
    const { analysis, tokensUsed } = await analyzeWithGPT4(metrics_data, openaiApiKey);
    console.log("Metrics analysis completed successfully");

    const analysisRecord = {
      workspace_id: workspace.id,
      entity_id: entity_id,
      entity_name: entity_name,
      entity_level: entity_level,
      analysis_period: {
        start_date: metrics_data.start_date,
        end_date: metrics_data.end_date,
      },
      performance_scores: analysis.performance_scores || {},
      executive_summary: analysis.executive_summary || '',
      overall_diagnosis: analysis.overall_diagnosis || '',
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
          analysis: { ...analysisRecord, id: 'temp-' + Date.now() },
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        analysis: savedAnalysis,
        tokens_used: tokensUsed,
        saved: true,
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
