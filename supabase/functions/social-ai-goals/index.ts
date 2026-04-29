/**
 * Edge Function: social-ai-goals
 *
 * Analisa o histórico de crescimento de uma conta social e sugere
 * metas realistas usando GPT-4O, seguindo o padrão dos demais
 * prompts de IA do projeto (meta-analyze-metrics-ai, meta-analyze-ad-ai).
 *
 * Parâmetros (body JSON):
 *   workspace_id: string  (obrigatório)
 *   account_id: string    (obrigatório)
 *   platform: string      (obrigatório)
 *   account_name: string  (opcional - para contexto da IA)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Extrai JSON de resposta com possível bloco markdown
function extractJsonFromMarkdown(text: string): string {
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { workspace_id, account_id, platform, account_name } = body;

    if (!workspace_id || !account_id || !platform) {
      return new Response(
        JSON.stringify({ error: "workspace_id, account_id e platform são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica cache de análise recente (últimas 24h) para evitar chamadas desnecessárias
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedInsight } = await supabaseAdmin
      .from("social_ai_insights")
      .select("analysis_json, created_at")
      .eq("workspace_id", workspace_id)
      .eq("account_id", account_id)
      .eq("platform", platform)
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (cachedInsight) {
      return new Response(
        JSON.stringify({ goals: cachedInsight.analysis_json, cached: true, cached_at: cachedInsight.created_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca histórico dos últimos 90 dias
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from("social_growth_metrics")
      .select("date, followers_count, reach, impressions, profile_views, website_clicks, likes, comments, engagement_rate")
      .eq("workspace_id", workspace_id)
      .eq("account_id", account_id)
      .eq("platform", platform)
      .gte("date", ninetyDaysAgo)
      .order("date", { ascending: true });

    if (metricsError || !metrics || metrics.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Histórico insuficiente para gerar metas. Sincronize os dados primeiro (mínimo 3 dias de histórico).",
          goals: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcula estatísticas para o prompt
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    const followersGrowth = Number(last.followers_count) - Number(first.followers_count);
    const daysSpan = metrics.length;
    const dailyGrowthRate = daysSpan > 0 ? followersGrowth / daysSpan : 0;
    const avgEngagement = metrics.reduce((s, r) => s + Number(r.engagement_rate), 0) / daysSpan;
    const avgReach = metrics.reduce((s, r) => s + Number(r.reach), 0) / daysSpan;

    // Últimas e primeiras semanas para detectar tendência recente
    const recentWeek = metrics.slice(-7);
    const firstWeek = metrics.slice(0, 7);
    const recentAvgEngagement = recentWeek.reduce((s, r) => s + Number(r.engagement_rate), 0) / recentWeek.length;
    const firstAvgEngagement = firstWeek.reduce((s, r) => s + Number(r.engagement_rate), 0) / firstWeek.length;
    const engagementTrend = recentAvgEngagement > firstAvgEngagement ? "crescente" : "decrescente";

    // Monta o prompt no padrão do projeto (especialista em marketing, JSON estruturado)
    const systemPrompt = `Você é um especialista sênior em marketing digital e crescimento de redes sociais com mais de 15 anos de experiência.
Sua especialidade é análise de dados de ${platform === "instagram" ? "Instagram" : "Facebook"} e definição de metas SMART (Específicas, Mensuráveis, Alcançáveis, Relevantes, com Prazo definido).
Você analisa históricos de crescimento e sugere metas realistas baseadas em dados, considerando sazonalidade, velocidade de crescimento e benchmarks do setor.
SEMPRE responda APENAS com JSON válido, sem texto adicional.`;

    const userPrompt = `Analise o histórico de crescimento desta conta de ${platform === "instagram" ? "Instagram" : "Facebook"} e sugira metas SMART.

## Dados da Conta
- Nome: ${account_name || "Conta " + platform}
- Plataforma: ${platform === "instagram" ? "Instagram" : "Facebook"}
- Período analisado: ${first.date} até ${last.date} (${daysSpan} dias)

## Métricas Atuais
- Seguidores atuais: ${Number(last.followers_count).toLocaleString("pt-BR")}
- Crescimento no período: +${followersGrowth.toLocaleString("pt-BR")} seguidores
- Taxa de crescimento diária: ${dailyGrowthRate.toFixed(1)} seguidores/dia
- Taxa de engajamento média: ${avgEngagement.toFixed(2)}%
- Tendência de engajamento: ${engagementTrend}
- Alcance médio diário: ${Math.round(avgReach).toLocaleString("pt-BR")}

## Evolução Recente (últimos 7 dias vs primeiros 7 dias)
- Engajamento recente: ${recentAvgEngagement.toFixed(2)}% vs inicial ${firstAvgEngagement.toFixed(2)}%

## Série Histórica (amostra dos últimos 10 registros)
${metrics.slice(-10).map(r => `${r.date}: ${Number(r.followers_count).toLocaleString("pt-BR")} seguidores, engajamento ${Number(r.engagement_rate).toFixed(2)}%`).join("\n")}

## Instrução
Sugira entre 3 e 5 metas SMART para os próximos 30, 60 ou 90 dias.
Considere:
1. A velocidade de crescimento atual como baseline
2. Metas ambiciosas mas alcançáveis (não impossíveis)
3. Variedade de métricas (seguidores, engajamento, alcance, interações)
4. Explique brevemente o raciocínio de cada meta

## Formato de Resposta (JSON)
{
  "goals": [
    {
      "metric_name": "followers_count",
      "metric_label": "Seguidores",
      "current_value": 5000,
      "target_value": 6200,
      "target_days": 30,
      "difficulty": "moderada",
      "reasoning": "Com crescimento diário atual de X, atingir Y é factível mantendo consistência de conteúdo.",
      "tips": ["Dica 1 para alcançar a meta", "Dica 2"]
    }
  ],
  "overall_assessment": "Avaliação geral do momento atual da conta",
  "growth_potential": "alto|médio|baixo",
  "main_opportunity": "Principal oportunidade identificada nos dados"
}

Métricas possíveis: followers_count, engagement_rate, reach, profile_views, website_clicks, impressions`;

    // Chama GPT-4O (mesmo modelo do meta-analyze-metrics-ai)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[social-ai-goals] OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: "Falha ao chamar API de IA", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || "{}";
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    let parsedAnalysis: Record<string, unknown> = {};
    try {
      parsedAnalysis = JSON.parse(extractJsonFromMarkdown(rawContent));
    } catch (e) {
      console.error("[social-ai-goals] Falha ao parsear JSON da IA:", e, rawContent);
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida", raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salva no cache de insights de IA
    const today = new Date().toISOString().split("T")[0];
    await supabaseAdmin.from("social_ai_insights").insert({
      workspace_id,
      account_id,
      platform,
      period_start: ninetyDaysAgo,
      period_end: today,
      analysis_json: parsedAnalysis,
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
    });

    // Salva as metas sugeridas na tabela social_growth_goals
    const goals = (parsedAnalysis.goals as Array<Record<string, unknown>>) || [];
    const today_date = new Date();
    for (const goal of goals) {
      const targetDays = Number(goal.target_days) || 30;
      const targetDate = new Date(today_date.getTime() + targetDays * 24 * 60 * 60 * 1000);

      await supabaseAdmin.from("social_growth_goals").insert({
        workspace_id,
        platform,
        account_id,
        metric_name: goal.metric_name || "followers_count",
        current_value: Number(goal.current_value) || 0,
        target_value: Number(goal.target_value) || 0,
        target_date: targetDate.toISOString().split("T")[0],
        ai_suggested: true,
        ai_reasoning: goal.reasoning || "",
        status: "active",
      });
    }

    return new Response(
      JSON.stringify({ goals: parsedAnalysis, tokens_used: tokensUsed, cached: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-ai-goals] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
