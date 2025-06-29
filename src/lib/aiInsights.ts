import OpenAI from 'openai';
import { AdMetrics, Campaign } from '../types/advertising';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be done server-side
});

export interface AIInsight {
  id: string;
  type: 'performance' | 'optimization' | 'trend' | 'recommendation' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  actionable: boolean;
  recommendations: string[];
  metrics_analyzed: string[];
  created_at: string;
}

export interface CampaignAnalysis {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  overall_score: number; // 0-100
  performance_trend: 'improving' | 'declining' | 'stable';
  insights: AIInsight[];
  summary: string;
  key_metrics: {
    metric: string;
    value: number;
    benchmark: number;
    status: 'above' | 'below' | 'on_target';
  }[];
}

export class AIInsightsService {
  private static instance: AIInsightsService;

  static getInstance(): AIInsightsService {
    if (!AIInsightsService.instance) {
      AIInsightsService.instance = new AIInsightsService();
    }
    return AIInsightsService.instance;
  }

  // Helper function to extract JSON from markdown code blocks
  private extractJsonFromMarkdown(text: string): string {
    // Remove markdown code block markers
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // If no code block found, return the original text (might already be clean JSON)
    return text.trim();
  }

  // Analyze campaign performance using AI
  async analyzeCampaignPerformance(
    campaign: Campaign,
    metrics: AdMetrics[],
    industryBenchmarks?: any
  ): Promise<CampaignAnalysis> {
    try {
      const metricsData = this.prepareMetricsData(metrics);
      const prompt = this.buildAnalysisPrompt(campaign, metricsData, industryBenchmarks);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em marketing digital e análise de dados de publicidade. 
            Analise os dados de performance de campanhas e forneça insights acionáveis, 
            recomendações estratégicas e identificação de oportunidades de otimização.
            Responda sempre em português brasileiro e seja específico com números e métricas.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('Resposta vazia da IA');
      }

      return this.parseAIResponse(campaign, metrics, aiResponse);
    } catch (error) {
      console.error('Erro na análise de IA:', error);
      throw new Error('Falha ao gerar insights de IA');
    }
  }

  // Generate optimization recommendations
  async generateOptimizationRecommendations(
    campaigns: Campaign[],
    allMetrics: AdMetrics[]
  ): Promise<AIInsight[]> {
    try {
      const campaignSummaries = campaigns.map(campaign => {
        const campaignMetrics = allMetrics.filter(m => m.campaign_id === campaign.id);
        return {
          campaign,
          metrics: this.calculateCampaignSummary(campaignMetrics)
        };
      });

      const prompt = this.buildOptimizationPrompt(campaignSummaries);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um consultor especialista em otimização de campanhas de publicidade digital.
            Analise o portfólio de campanhas e identifique oportunidades de otimização,
            redistribuição de orçamento e melhorias estratégicas.
            Foque em recomendações práticas e acionáveis.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('Resposta vazia da IA');
      }

      return this.parseOptimizationRecommendations(aiResponse);
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      throw new Error('Falha ao gerar recomendações de otimização');
    }
  }

  // Detect anomalies in campaign performance
  async detectAnomalies(metrics: AdMetrics[]): Promise<AIInsight[]> {
    try {
      const anomalyData = this.prepareAnomalyData(metrics);
      const prompt = this.buildAnomalyPrompt(anomalyData);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um analista de dados especializado em detecção de anomalias em campanhas publicitárias.
            Identifique padrões incomuns, quedas ou picos de performance que requerem atenção.
            Seja específico sobre as métricas afetadas e possíveis causas.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('Resposta vazia da IA');
      }

      return this.parseAnomalyDetection(aiResponse);
    } catch (error) {
      console.error('Erro na detecção de anomalias:', error);
      throw new Error('Falha ao detectar anomalias');
    }
  }

  // Generate market insights and trends
  async generateMarketInsights(
    campaigns: Campaign[],
    metrics: AdMetrics[],
    timeframe: 'week' | 'month' | 'quarter'
  ): Promise<AIInsight[]> {
    try {
      const trendData = this.prepareTrendData(campaigns, metrics, timeframe);
      const prompt = this.buildMarketInsightsPrompt(trendData, timeframe);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um estrategista de marketing digital com expertise em análise de tendências de mercado.
            Analise os dados de performance e identifique tendências, padrões sazonais e oportunidades de mercado.
            Forneça insights estratégicos para tomada de decisão.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('Resposta vazia da IA');
      }

      return this.parseMarketInsights(aiResponse);
    } catch (error) {
      console.error('Erro ao gerar insights de mercado:', error);
      throw new Error('Falha ao gerar insights de mercado');
    }
  }

  // Helper methods
  private prepareMetricsData(metrics: AdMetrics[]) {
    const summary = metrics.reduce((acc, metric) => ({
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      spend: acc.spend + metric.spend,
      conversions: acc.conversions + metric.conversions,
      reach: acc.reach + metric.reach
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0 });

    const avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
    const avgCPC = metrics.reduce((sum, m) => sum + m.cpc, 0) / metrics.length;
    const avgROAS = metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length;

    return {
      ...summary,
      avgCTR: avgCTR || 0,
      avgCPC: avgCPC || 0,
      avgROAS: avgROAS || 0,
      dataPoints: metrics.length,
      dateRange: {
        start: metrics[metrics.length - 1]?.date,
        end: metrics[0]?.date
      }
    };
  }

  private buildAnalysisPrompt(campaign: Campaign, metricsData: any, benchmarks?: any): string {
    return `
Analise a performance da seguinte campanha de publicidade:

DADOS DA CAMPANHA:
- Nome: ${campaign.name}
- Plataforma: ${campaign.platform}
- Objetivo: ${campaign.objective}
- Status: ${campaign.status}
- Período: ${metricsData.dateRange.start} até ${metricsData.dateRange.end}

MÉTRICAS DE PERFORMANCE:
- Impressões: ${metricsData.impressions.toLocaleString()}
- Cliques: ${metricsData.clicks.toLocaleString()}
- Gasto: R$ ${metricsData.spend.toLocaleString()}
- Conversões: ${metricsData.conversions}
- Alcance: ${metricsData.reach.toLocaleString()}
- CTR Médio: ${metricsData.avgCTR.toFixed(2)}%
- CPC Médio: R$ ${metricsData.avgCPC.toFixed(2)}
- ROAS Médio: ${metricsData.avgROAS.toFixed(2)}

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

  private buildOptimizationPrompt(campaignSummaries: any[]): string {
    const campaignData = campaignSummaries.map(cs => 
      `${cs.campaign.name} (${cs.campaign.platform}): CTR ${cs.metrics.ctr.toFixed(2)}%, ROAS ${cs.metrics.roas.toFixed(2)}, Gasto R$ ${cs.metrics.spend.toFixed(2)}`
    ).join('\n');

    return `
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
  }

  private buildAnomalyPrompt(anomalyData: any): string {
    return `
Analise os dados de performance em busca de anomalias:

${JSON.stringify(anomalyData, null, 2)}

Identifique:
1. Quedas ou picos incomuns em métricas
2. Padrões anômalos que requerem investigação
3. Possíveis causas das anomalias
4. Ações recomendadas para cada anomalia

Responda em formato JSON com array de insights sobre anomalias detectadas.
`;
  }

  private buildMarketInsightsPrompt(trendData: any, timeframe: string): string {
    return `
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
  }

  private parseAIResponse(campaign: Campaign, metrics: AdMetrics[], aiResponse: string): CampaignAnalysis {
    try {
      const cleanJson = this.extractJsonFromMarkdown(aiResponse);
      const parsed = JSON.parse(cleanJson);
      
      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        platform: campaign.platform,
        overall_score: parsed.overall_score || 0,
        performance_trend: parsed.performance_trend || 'stable',
        summary: parsed.summary || 'Análise não disponível',
        insights: parsed.insights?.map((insight: any, index: number) => ({
          id: `insight-${campaign.id}-${index}`,
          type: insight.type || 'performance',
          title: insight.title || 'Insight',
          description: insight.description || '',
          impact: insight.impact || 'medium',
          confidence: insight.confidence || 70,
          actionable: true,
          recommendations: insight.recommendations || [],
          metrics_analyzed: ['ctr', 'cpc', 'roas', 'conversions'],
          created_at: new Date().toISOString()
        })) || [],
        key_metrics: this.generateKeyMetrics(metrics)
      };
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error);
      return this.generateFallbackAnalysis(campaign, metrics);
    }
  }

  private parseOptimizationRecommendations(aiResponse: string): AIInsight[] {
    try {
      const cleanJson = this.extractJsonFromMarkdown(aiResponse);
      const parsed = JSON.parse(cleanJson);
      return parsed.map((insight: any, index: number) => ({
        id: `optimization-${index}`,
        type: 'optimization',
        title: insight.title || 'Recomendação de Otimização',
        description: insight.description || '',
        impact: insight.impact || 'medium',
        confidence: insight.confidence || 75,
        actionable: true,
        recommendations: insight.recommendations || [],
        metrics_analyzed: ['performance', 'budget', 'targeting'],
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao parsear recomendações:', error);
      return [];
    }
  }

  private parseAnomalyDetection(aiResponse: string): AIInsight[] {
    try {
      const cleanJson = this.extractJsonFromMarkdown(aiResponse);
      const parsed = JSON.parse(cleanJson);
      return parsed.map((anomaly: any, index: number) => ({
        id: `anomaly-${index}`,
        type: 'alert',
        title: anomaly.title || 'Anomalia Detectada',
        description: anomaly.description || '',
        impact: anomaly.impact || 'high',
        confidence: anomaly.confidence || 80,
        actionable: true,
        recommendations: anomaly.recommendations || [],
        metrics_analyzed: ['trends', 'patterns'],
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao parsear anomalias:', error);
      return [];
    }
  }

  private parseMarketInsights(aiResponse: string): AIInsight[] {
    try {
      const cleanJson = this.extractJsonFromMarkdown(aiResponse);
      const parsed = JSON.parse(cleanJson);
      return parsed.map((insight: any, index: number) => ({
        id: `market-${index}`,
        type: 'trend',
        title: insight.title || 'Insight de Mercado',
        description: insight.description || '',
        impact: insight.impact || 'medium',
        confidence: insight.confidence || 70,
        actionable: true,
        recommendations: insight.recommendations || [],
        metrics_analyzed: ['market_trends', 'seasonality'],
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao parsear insights de mercado:', error);
      return [];
    }
  }

  private calculateCampaignSummary(metrics: AdMetrics[]) {
    if (metrics.length === 0) return { ctr: 0, roas: 0, spend: 0 };
    
    return {
      ctr: metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length,
      roas: metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length,
      spend: metrics.reduce((sum, m) => sum + m.spend, 0)
    };
  }

  private prepareAnomalyData(metrics: AdMetrics[]) {
    // Prepare data for anomaly detection
    return metrics.slice(-30).map(m => ({
      date: m.date,
      ctr: m.ctr,
      cpc: m.cpc,
      roas: m.roas,
      spend: m.spend,
      conversions: m.conversions
    }));
  }

  private prepareTrendData(campaigns: Campaign[], metrics: AdMetrics[], timeframe: string) {
    const platformData = campaigns.reduce((acc, campaign) => {
      const campaignMetrics = metrics.filter(m => m.campaign_id === campaign.id);
      if (!acc[campaign.platform]) {
        acc[campaign.platform] = [];
      }
      acc[campaign.platform].push(...campaignMetrics);
      return acc;
    }, {} as Record<string, AdMetrics[]>);

    return {
      timeframe,
      platforms: Object.keys(platformData),
      data: platformData
    };
  }

  private generateKeyMetrics(metrics: AdMetrics[]) {
    const avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
    const avgROAS = metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length;
    const avgCPC = metrics.reduce((sum, m) => sum + m.cpc, 0) / metrics.length;

    return [
      {
        metric: 'CTR',
        value: avgCTR,
        benchmark: 2.0,
        status: avgCTR >= 2.0 ? 'above' : avgCTR >= 1.5 ? 'on_target' : 'below'
      },
      {
        metric: 'ROAS',
        value: avgROAS,
        benchmark: 4.0,
        status: avgROAS >= 4.0 ? 'above' : avgROAS >= 3.0 ? 'on_target' : 'below'
      },
      {
        metric: 'CPC',
        value: avgCPC,
        benchmark: 1.5,
        status: avgCPC <= 1.5 ? 'above' : avgCPC <= 2.0 ? 'on_target' : 'below'
      }
    ] as const;
  }

  private generateFallbackAnalysis(campaign: Campaign, metrics: AdMetrics[]): CampaignAnalysis {
    return {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      platform: campaign.platform,
      overall_score: 75,
      performance_trend: 'stable',
      summary: 'Análise básica da campanha. Configure a API da OpenAI para insights avançados.',
      insights: [
        {
          id: `fallback-${campaign.id}`,
          type: 'performance',
          title: 'Análise Básica',
          description: 'Configure a API da OpenAI para obter insights detalhados com IA.',
          impact: 'medium',
          confidence: 50,
          actionable: false,
          recommendations: ['Configure a chave da API OpenAI'],
          metrics_analyzed: ['basic'],
          created_at: new Date().toISOString()
        }
      ],
      key_metrics: this.generateKeyMetrics(metrics)
    };
  }
}