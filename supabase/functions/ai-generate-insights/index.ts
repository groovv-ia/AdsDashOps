import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Configuracoes por tipo de acao (modelo, temperatura, max_tokens)
const ACTION_CONFIG: Record<
  string,
  { temperature: number; max_tokens: number; systemPrompt: string }
> = {
  analyzeCampaignPerformance: {
    temperature: 0.3,
    max_tokens: 2000,
    systemPrompt: `Você é um especialista em marketing digital e análise de dados de publicidade.
Analise os dados de performance de campanhas e forneça insights acionáveis,
recomendações estratégicas e identificação de oportunidades de otimização.
Responda sempre em português brasileiro e seja específico com números e métricas.`,
  },
  generateOptimizationRecommendations: {
    temperature: 0.4,
    max_tokens: 1500,
    systemPrompt: `Você é um consultor especialista em otimização de campanhas de publicidade digital.
Analise o portfólio de campanhas e identifique oportunidades de otimização,
redistribuição de orçamento e melhorias estratégicas.
Foque em recomendações práticas e acionáveis.`,
  },
  detectAnomalies: {
    temperature: 0.2,
    max_tokens: 1000,
    systemPrompt: `Você é um analista de dados especializado em detecção de anomalias em campanhas publicitárias.
Identifique padrões incomuns, quedas ou picos de performance que requerem atenção.
Seja específico sobre as métricas afetadas e possíveis causas.`,
  },
  generateMarketInsights: {
    temperature: 0.5,
    max_tokens: 1200,
    systemPrompt: `Você é um estrategista de marketing digital com expertise em análise de tendências de mercado.
Analise os dados de performance e identifique tendências, padrões sazonais e oportunidades de mercado.
Forneça insights estratégicos para tomada de decisão.`,
  },
};

// Extrai JSON de blocos markdown (o LLM pode envolver a resposta em code fences)
function extractJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

// Parseia a resposta de analise de campanha
function parseAnalysisResponse(
  campaign: any,
  metrics: any[],
  aiResponse: string
) {
  try {
    const cleanJson = extractJsonFromMarkdown(aiResponse);
    const parsed = JSON.parse(cleanJson);

    const avgCTR =
      metrics.reduce((sum: number, m: any) => sum + (m.ctr || 0), 0) /
      (metrics.length || 1);
    const avgROAS =
      metrics.reduce((sum: number, m: any) => sum + (m.roas || 0), 0) /
      (metrics.length || 1);
    const avgCPC =
      metrics.reduce((sum: number, m: any) => sum + (m.cpc || 0), 0) /
      (metrics.length || 1);

    return {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      platform: campaign.platform,
      overall_score: parsed.overall_score || 0,
      performance_trend: parsed.performance_trend || "stable",
      summary: parsed.summary || "Análise não disponível",
      insights:
        parsed.insights?.map((insight: any, index: number) => ({
          id: `insight-${campaign.id}-${index}`,
          type: insight.type || "performance",
          title: insight.title || "Insight",
          description: insight.description || "",
          impact: insight.impact || "medium",
          confidence: insight.confidence || 70,
          actionable: true,
          recommendations: insight.recommendations || [],
          metrics_analyzed: ["ctr", "cpc", "roas", "conversions"],
          created_at: new Date().toISOString(),
        })) || [],
      key_metrics: [
        {
          metric: "CTR",
          value: avgCTR,
          benchmark: 2.0,
          status:
            avgCTR >= 2.0 ? "above" : avgCTR >= 1.5 ? "on_target" : "below",
        },
        {
          metric: "ROAS",
          value: avgROAS,
          benchmark: 4.0,
          status:
            avgROAS >= 4.0
              ? "above"
              : avgROAS >= 3.0
                ? "on_target"
                : "below",
        },
        {
          metric: "CPC",
          value: avgCPC,
          benchmark: 1.5,
          status:
            avgCPC <= 1.5 ? "above" : avgCPC <= 2.0 ? "on_target" : "below",
        },
      ],
    };
  } catch {
    // Fallback se o parse falhar
    return {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      platform: campaign.platform,
      overall_score: 75,
      performance_trend: "stable",
      summary:
        "Análise básica da campanha. A IA não conseguiu estruturar a resposta completa.",
      insights: [
        {
          id: `fallback-${campaign.id}`,
          type: "performance",
          title: "Análise Básica",
          description:
            "Não foi possível gerar insights detalhados neste momento.",
          impact: "medium",
          confidence: 50,
          actionable: false,
          recommendations: ["Tente novamente em alguns instantes"],
          metrics_analyzed: ["basic"],
          created_at: new Date().toISOString(),
        },
      ],
      key_metrics: [],
    };
  }
}

// Parseia resposta de array de insights (otimizacao, anomalias, mercado)
function parseInsightsArray(
  aiResponse: string,
  type: string,
  metricsAnalyzed: string[]
) {
  try {
    const cleanJson = extractJsonFromMarkdown(aiResponse);
    const parsed = JSON.parse(cleanJson);
    const dataArray = Array.isArray(parsed) ? parsed : [parsed];

    return dataArray.map((insight: any, index: number) => ({
      id: `${type}-${index}`,
      type: type === "anomaly" ? "alert" : type === "market" ? "trend" : type,
      title: insight.title || "Insight",
      description: insight.description || "",
      impact: insight.impact || "medium",
      confidence: insight.confidence || 70,
      actionable: true,
      recommendations: insight.recommendations || [],
      metrics_analyzed: metricsAnalyzed,
      created_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verifica autenticacao do usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse do body
    const { action, payload } = await req.json();

    if (!action || !ACTION_CONFIG[action]) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtem a chave da OpenAI do ambiente
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const config = ACTION_CONFIG[action];

    // Chama a OpenAI com o prompt adequado
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: payload.prompt },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parseia a resposta de acordo com a acao
    let result;
    switch (action) {
      case "analyzeCampaignPerformance":
        result = parseAnalysisResponse(
          payload.campaign,
          payload.metrics,
          aiResponse
        );
        break;
      case "generateOptimizationRecommendations":
        result = parseInsightsArray(aiResponse, "optimization", [
          "performance",
          "budget",
          "targeting",
        ]);
        break;
      case "detectAnomalies":
        result = parseInsightsArray(aiResponse, "anomaly", [
          "trends",
          "patterns",
        ]);
        break;
      case "generateMarketInsights":
        result = parseInsightsArray(aiResponse, "market", [
          "market_trends",
          "seasonality",
        ]);
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-generate-insights error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
