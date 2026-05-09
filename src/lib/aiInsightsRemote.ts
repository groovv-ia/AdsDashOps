import { supabase } from './supabase';
import { AdMetrics, Campaign } from '../types/advertising';
import type { AIInsight, CampaignAnalysis } from './aiInsights';

/**
 * AIInsightsRemoteService
 *
 * Servico que delega chamadas de IA para a edge function ai-generate-insights,
 * mantendo a mesma interface publica do AIInsightsService original.
 * A chave OpenAI fica apenas no servidor (edge function secret).
 */
export class AIInsightsRemoteService {
  private static instance: AIInsightsRemoteService;

  static getInstance(): AIInsightsRemoteService {
    if (!AIInsightsRemoteService.instance) {
      AIInsightsRemoteService.instance = new AIInsightsRemoteService();
    }
    return AIInsightsRemoteService.instance;
  }

  // Chamada generica para a edge function
  private async callEdgeFunction(action: string, payload: any): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai-generate-insights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, payload }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro na análise de IA (${response.status})`);
    }

    return response.json();
  }

  // Prepara dados de metricas para enviar ao servidor
  private prepareMetricsPrompt(campaign: Campaign, metrics: AdMetrics[], benchmarks?: any): string {
    const summary = metrics.reduce((acc, metric) => ({
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      spend: acc.spend + metric.spend,
      conversions: acc.conversions + metric.conversions,
      reach: acc.reach + metric.reach
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0 });

    const avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / (metrics.length || 1);
    const avgCPC = metrics.reduce((sum, m) => sum + m.cpc, 0) / (metrics.length || 1);
    const avgROAS = metrics.reduce((sum, m) => sum + m.roas, 0) / (metrics.length || 1);

    return `
Analise a performance da seguinte campanha de publicidade:

DADOS DA CAMPANHA:
- Nome: ${campaign.name}
- Plataforma: ${campaign.platform}
- Objetivo: ${campaign.objective}
- Status: ${campaign.status}
- Período: ${metrics[metrics.length - 1]?.date} até ${metrics[0]?.date}

MÉTRICAS DE PERFORMANCE:
- Impressões: ${summary.impressions.toLocaleString()}
- Cliques: ${summary.clicks.toLocaleString()}
- Gasto: R$ ${summary.spend.toLocaleString()}
- Conversões: ${summary.conversions}
- Alcance: ${summary.reach.toLocaleString()}
- CTR Médio: ${avgCTR.toFixed(2)}%
- CPC Médio: R$ ${avgCPC.toFixed(2)}
- ROAS Médio: ${avgROAS.toFixed(2)}

${benchmarks ? `BENCHMARKS DO SETOR:\n${JSON.stringify(benchmarks, null, 2)}` : ''}

Por favor, forneça:
1. Análise geral da performance (score de 0-100)
2. Principais pontos fortes e fracos
3. 3-5 recomendações específicas de otimização
4. Identificação de tendências (melhorando/piorando/estável)
5. Métricas que precisam de atenção imediata

Formato da resposta em JSON:
{
  "overall_score": number,
  "performance_trend": "improving|declining|stable",
  "summary": "string",
  "insights": [
    {
      "type": "performance|optimization|recommendation",
      "title": "string",
      "description": "string",
      "impact": "high|medium|low",
      "confidence": number,
      "recommendations": ["string"]
    }
  ]
}
`;
  }

  // Analisa performance de uma campanha
  async analyzeCampaignPerformance(
    campaign: Campaign,
    metrics: AdMetrics[],
    industryBenchmarks?: any
  ): Promise<CampaignAnalysis> {
    const prompt = this.prepareMetricsPrompt(campaign, metrics, industryBenchmarks);
    return this.callEdgeFunction('analyzeCampaignPerformance', {
      prompt,
      campaign,
      metrics
    });
  }

  // Gera recomendacoes de otimizacao
  async generateOptimizationRecommendations(
    campaigns: Campaign[],
    allMetrics: AdMetrics[]
  ): Promise<AIInsight[]> {
    const campaignData = campaigns.map(campaign => {
      const campaignMetrics = allMetrics.filter(m => m.campaign_id === campaign.id);
      const ctr = campaignMetrics.reduce((sum, m) => sum + m.ctr, 0) / (campaignMetrics.length || 1);
      const roas = campaignMetrics.reduce((sum, m) => sum + m.roas, 0) / (campaignMetrics.length || 1);
      const spend = campaignMetrics.reduce((sum, m) => sum + m.spend, 0);
      return `${campaign.name} (${campaign.platform}): CTR ${ctr.toFixed(2)}%, ROAS ${roas.toFixed(2)}, Gasto R$ ${spend.toFixed(2)}`;
    }).join('\n');

    const prompt = `
Analise o portfólio de campanhas e identifique oportunidades de otimização:

CAMPANHAS ATIVAS:
${campaignData}

Identifique:
1. Campanhas com melhor performance para aumentar orçamento
2. Campanhas com baixa performance que precisam de otimização ou pausa
3. Oportunidades de redistribuição de orçamento
4. Recomendações de segmentação e targeting
5. Sugestões de novos testes e experimentos

Responda em formato JSON com array de insights.
`;

    return this.callEdgeFunction('generateOptimizationRecommendations', { prompt });
  }

  // Detecta anomalias nas metricas
  async detectAnomalies(metrics: AdMetrics[]): Promise<AIInsight[]> {
    const anomalyData = metrics.slice(-30).map(m => ({
      date: m.date,
      ctr: m.ctr,
      cpc: m.cpc,
      roas: m.roas,
      spend: m.spend,
      conversions: m.conversions
    }));

    const prompt = `
Analise os dados de performance em busca de anomalias:

${JSON.stringify(anomalyData, null, 2)}

Identifique:
1. Quedas ou picos incomuns em métricas
2. Padrões anômalos que requerem investigação
3. Possíveis causas das anomalias
4. Ações recomendadas para cada anomalia

Responda em formato JSON com array de insights sobre anomalias detectadas.
`;

    return this.callEdgeFunction('detectAnomalies', { prompt });
  }

  // Gera insights de mercado
  async generateMarketInsights(
    campaigns: Campaign[],
    metrics: AdMetrics[],
    timeframe: 'week' | 'month' | 'quarter'
  ): Promise<AIInsight[]> {
    const platformData = campaigns.reduce((acc, campaign) => {
      const campaignMetrics = metrics.filter(m => m.campaign_id === campaign.id);
      if (!acc[campaign.platform]) {
        acc[campaign.platform] = [];
      }
      acc[campaign.platform].push(...campaignMetrics);
      return acc;
    }, {} as Record<string, AdMetrics[]>);

    const trendData = {
      timeframe,
      platforms: Object.keys(platformData),
      data: platformData
    };

    const prompt = `
Analise as tendências de mercado baseado nos dados de ${timeframe}:

${JSON.stringify(trendData, null, 2)}

Forneça insights sobre:
1. Tendências de performance por plataforma
2. Padrões sazonais identificados
3. Oportunidades de mercado emergentes
4. Recomendações estratégicas para o próximo período
5. Previsões de performance

Responda em formato JSON com array de insights de mercado.
`;

    return this.callEdgeFunction('generateMarketInsights', { prompt });
  }
}
