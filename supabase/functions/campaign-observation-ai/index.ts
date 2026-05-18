/**
 * Edge Function: campaign-observation-ai
 *
 * Gera analise qualitativa de uma campanha combinando:
 * - As anotacoes livres escritas pelo gestor
 * - As metricas reais da campanha no periodo selecionado
 *
 * POST /functions/v1/campaign-observation-ai
 * Body: {
 *   campaign_id: string,
 *   campaign_name: string,
 *   campaign_objective?: string,
 *   manager_notes: string,
 *   metrics: CampaignMetricsInput,
 *   period: { start: string, end: string }
 * }
 *
 * Response: {
 *   executive_summary: string,
 *   highlights: HighlightItem[],
 *   suggestions: SuggestionItem[],
 *   manager_notes_feedback: string,
 *   generated_at: string
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Metricas da campanha passadas pelo frontend
interface CampaignMetricsInput {
  impressions:    number;
  clicks:         number;
  spend:          number;
  conversions:    number;
  reach:          number;
  ctr:            number;
  cpc:            number;
  cpm:            number;
  roas?:          number;
  leads?:         number;
  cost_per_lead?: number;
  messaging_conversations?: number;
  cost_per_messaging_conversation?: number;
  frequency?:     number;
}

// Payload recebido da chamada
interface RequestPayload {
  campaign_id:           string;
  campaign_name:         string;
  campaign_objective?:   string;
  manager_notes:         string;
  metrics:               CampaignMetricsInput;
  period:                { start: string; end: string };
}

// Formato de retorno estruturado
interface AIObservationResult {
  executive_summary:         string;
  highlights:                { type: "positive" | "attention" | "critical"; text: string }[];
  suggestions:               { priority: "high" | "medium" | "low"; text: string }[];
  manager_notes_feedback:    string;
  generated_at:              string;
}

// Prompt de sistema: consultor senior de Meta Ads
const SYSTEM_PROMPT = `Você é um consultor sênior de marketing digital especializado em Meta Ads (Facebook/Instagram), com mais de 15 anos de experiência em análise de campanhas e suporte estratégico a gestores de tráfego.

Sua tarefa é analisar uma campanha combinando:
1. Os dados quantitativos de performance do período
2. As anotações qualitativas escritas pelo gestor responsável

REGRAS CRÍTICAS:
- NUNCA mencione ROAS, receita ou retorno financeiro se esses dados não estiverem presentes nas métricas fornecidas.
- Avalie a campanha pelo objetivo real: leads → custo por lead; mensagens → custo por conversa; tráfego → CTR e CPC.
- Leve em consideração o texto do gestor como contexto estratégico — ele pode indicar contexto externo (sazonalidade, promoção, público novo) que os números não capturam.
- Se o gestor escrever observações superficiais, complemente com sua leitura técnica dos dados.
- Se o gestor escrever observações estratégicas profundas, valide e aprofunde.
- manager_notes_feedback deve reagir especificamente ao que o gestor escreveu — confirme acertos, corrija equívocos, adicione profundidade.
- Seja PRECISO: cite os valores reais dos dados nas análises.
- Linguagem: profissional, consultiva, acessível. Português brasileiro.
- Retorne APENAS JSON válido no formato especificado, sem markdown ou texto adicional.`;

/**
 * Monta o prompt de usuario com metricas e anotacoes do gestor.
 */
function buildPrompt(payload: RequestPayload): string {
  const { campaign_name, campaign_objective, manager_notes, metrics, period } = payload;
  const m = metrics;

  // Detecta qual metrica de resultado esta disponivel
  const hasRoas    = typeof m.roas === "number" && m.roas > 0;
  const hasLeads   = typeof m.leads === "number" && m.leads > 0;
  const hasMsg     = typeof m.messaging_conversations === "number" && m.messaging_conversations > 0;

  let resultSection = "";
  if (hasRoas) {
    resultSection = `\n💹 RECEITA E RETORNO:\n- ROAS: ${m.roas!.toFixed(2)}\n`;
  } else if (hasLeads) {
    resultSection = `\n🎯 LEADS:\n- Total de leads: ${m.leads!.toLocaleString("pt-BR")}\n- Custo por lead: R$ ${(m.cost_per_lead ?? 0).toFixed(2)}\n`;
  } else if (hasMsg) {
    resultSection = `\n💬 MENSAGENS:\n- Conversas iniciadas: ${m.messaging_conversations!.toLocaleString("pt-BR")}\n- Custo por conversa: R$ ${(m.cost_per_messaging_conversation ?? 0).toFixed(2)}\n`;
  }

  return `
Analise a seguinte campanha e as anotações do gestor:

=== CAMPANHA ===
Nome: ${campaign_name}
Objetivo: ${campaign_objective ?? "Não informado"}
Período: ${period.start} até ${period.end}

=== MÉTRICAS DO PERÍODO ===

📊 ALCANCE:
- Impressões: ${m.impressions.toLocaleString("pt-BR")}
- Alcance único: ${m.reach.toLocaleString("pt-BR")}
- Frequência média: ${(m.frequency ?? 0).toFixed(2)}

🖱️ ENGAJAMENTO:
- Cliques: ${m.clicks.toLocaleString("pt-BR")}
- CTR: ${m.ctr.toFixed(2)}%

💰 CUSTOS:
- Investimento total: R$ ${m.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- CPC: R$ ${m.cpc.toFixed(2)}
- CPM: R$ ${m.cpm.toFixed(2)}
${resultSection}

=== ANOTAÇÕES DO GESTOR ===
${manager_notes.trim() || "(O gestor não escreveu anotações — analise apenas pelos dados quantitativos)"}

=== INSTRUÇÃO ===
Retorne um JSON com EXATAMENTE esta estrutura:
{
  "executive_summary": "Resumo executivo da campanha em 2-3 frases — qualidade geral, contexto do objetivo e leitura combinada dos dados + anotações do gestor.",
  "highlights": [
    { "type": "positive" | "attention" | "critical", "text": "Ponto específico com valor real dos dados. Máximo 3-5 highlights." }
  ],
  "suggestions": [
    { "priority": "high" | "medium" | "low", "text": "Ação concreta e específica para otimização. Máximo 3-4 sugestões." }
  ],
  "manager_notes_feedback": "Resposta direta ao que o gestor escreveu: valide acertos, corrija equívocos, adicione camadas de análise técnica. Se não houver anotações, oriente o gestor sobre o que registrar para esta campanha."
}
`;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verifica metodo
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse do payload
    const payload: RequestPayload = await req.json();

    if (!payload.campaign_id || !payload.campaign_name || !payload.metrics) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios ausentes: campaign_id, campaign_name, metrics" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chave da OpenAI via env
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Monta o prompt
    const userPrompt = buildPrompt(payload);

    // Chama GPT-4o
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: "Falha na chamada ao OpenAI", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content ?? "{}";

    // Parse do JSON retornado pela IA
    let analysisResult: Partial<AIObservationResult>;
    try {
      analysisResult = JSON.parse(rawContent);
    } catch {
      console.error("Falha ao fazer parse do JSON da IA:", rawContent);
      return new Response(
        JSON.stringify({ error: "Resposta da IA nao e um JSON valido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adiciona timestamp
    const result: AIObservationResult = {
      executive_summary:      analysisResult.executive_summary      ?? "",
      highlights:             analysisResult.highlights             ?? [],
      suggestions:            analysisResult.suggestions            ?? [],
      manager_notes_feedback: analysisResult.manager_notes_feedback ?? "",
      generated_at:           new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
