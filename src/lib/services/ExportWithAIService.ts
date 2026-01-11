/**
 * ExportWithAIService
 *
 * Serviço para integração de insights de IA com exportação de relatórios.
 * Responsável por gerar, recuperar e formatar análises de IA para inclusão
 * em relatórios exportados (PDF, Excel, CSV).
 */

import {
  prepareMetricsDataForAnalysis,
  requestMetricsAnalysis,
  getLatestMetricsAnalysis,
  hasRecentMetricsAnalysis,
  type PreloadedMetricsData
} from './MetricsAIAnalysisService';
import type {
  MetricsAIAnalysis,
  AnalysisLevel,
  MetricsInputData,
} from '../../types/metricsAnalysis';

/**
 * Interface para dados consolidados de exportação
 */
export interface ExportDataWithAI {
  // Dados brutos
  rawData: any[];

  // Metadados da exportação
  metadata: {
    accountName: string;
    accountId: string;
    entityLevel: AnalysisLevel;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
    totalRecords: number;
  };

  // KPIs agregados
  kpis: {
    totalSpend: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    avgCtr: number;
    avgCpc: number;
    avgCpm: number;
    avgFrequency: number;
    totalConversions?: number;
    avgRoas?: number;
  };

  // Insights de IA (opcional)
  aiInsights?: MetricsAIAnalysis;

  // Indica se tem insights de IA
  hasAI: boolean;
}

/**
 * Opções para geração de insights de IA
 */
export interface AIInsightsOptions {
  // Se deve forçar geração de novos insights
  forceNew?: boolean;

  // Threshold de horas para considerar análise recente
  recentThresholdHours?: number;

  // Dados pre-carregados para evitar nova query
  preloadedData?: PreloadedMetricsData;
}

/**
 * Gera ou recupera insights de IA para uma entidade
 * Verifica se há análise recente e decide se gera nova ou reutiliza
 */
export async function generateOrFetchAIInsights(
  entityId: string,
  entityName: string,
  entityLevel: AnalysisLevel,
  metaAdAccountId: string,
  startDate: string,
  endDate: string,
  options: AIInsightsOptions = {}
): Promise<MetricsAIAnalysis | null> {
  const {
    forceNew = false,
    recentThresholdHours = 24,
    preloadedData
  } = options;

  try {
    // Verifica se há análise recente (se não for forçada nova)
    if (!forceNew) {
      const hasRecent = await hasRecentMetricsAnalysis(
        entityId,
        entityLevel,
        recentThresholdHours
      );

      // Se há análise recente, recupera e retorna
      if (hasRecent) {
        console.log('Recuperando análise de IA recente...');
        const existingAnalysis = await getLatestMetricsAnalysis(entityId, entityLevel);
        if (existingAnalysis) {
          return existingAnalysis;
        }
      }
    }

    // Prepara dados para análise
    console.log('Preparando dados para análise de IA...');
    const metricsData = await prepareMetricsDataForAnalysis(
      entityId,
      entityLevel,
      startDate,
      endDate,
      preloadedData
    );

    if (!metricsData) {
      console.error('Não foi possível preparar dados para análise');
      return null;
    }

    // Solicita nova análise de IA
    console.log('Solicitando nova análise de IA...');
    const response = await requestMetricsAnalysis({
      entity_id: entityId,
      entity_name: entityName,
      entity_level: entityLevel,
      meta_ad_account_id: metaAdAccountId,
      metrics_data: metricsData,
    });

    if (response && response.analysis) {
      console.log('Análise de IA gerada com sucesso');
      return response.analysis;
    }

    return null;
  } catch (error) {
    console.error('Erro ao gerar/recuperar insights de IA:', error);
    return null;
  }
}

/**
 * Prepara dados consolidados para exportação incluindo insights de IA
 */
export async function prepareExportDataWithAI(
  rawData: any[],
  metadata: ExportDataWithAI['metadata'],
  kpis: ExportDataWithAI['kpis'],
  includeAI: boolean,
  aiOptions?: {
    entityId: string;
    entityName: string;
    metaAdAccountId: string;
    preloadedData?: PreloadedMetricsData;
    forceNew?: boolean;
  }
): Promise<ExportDataWithAI> {
  let aiInsights: MetricsAIAnalysis | null = null;

  // Se deve incluir IA e as opções foram fornecidas
  if (includeAI && aiOptions) {
    aiInsights = await generateOrFetchAIInsights(
      aiOptions.entityId,
      aiOptions.entityName,
      metadata.entityLevel,
      aiOptions.metaAdAccountId,
      metadata.periodStart,
      metadata.periodEnd,
      {
        forceNew: aiOptions.forceNew,
        preloadedData: aiOptions.preloadedData,
      }
    );
  }

  return {
    rawData,
    metadata,
    kpis,
    aiInsights: aiInsights || undefined,
    hasAI: !!aiInsights,
  };
}

/**
 * Formata insights de IA para texto simples (útil para CSV)
 */
export function formatAIInsightsAsText(analysis: MetricsAIAnalysis): string {
  const lines: string[] = [];

  // Resumo executivo
  lines.push('=== RESUMO EXECUTIVO ===');
  lines.push(analysis.executive_summary);
  lines.push('');

  // Scores de performance
  lines.push('=== SCORES DE PERFORMANCE ===');
  const scores = analysis.performance_scores;
  lines.push(`Score Geral: ${scores.overall_score}/100`);
  lines.push(`Eficiência: ${scores.efficiency_score}/100`);
  lines.push(`Custo: ${scores.cost_score}/100`);
  lines.push(`Alcance: ${scores.reach_score}/100`);
  lines.push(`Conversão: ${scores.conversion_score}/100`);
  lines.push(`Tendência: ${scores.trend_score}/100`);
  lines.push('');

  // Diagnóstico geral
  lines.push('=== DIAGNÓSTICO ===');
  lines.push(analysis.overall_diagnosis);
  lines.push('');

  // Áreas prioritárias
  if (analysis.priority_areas && analysis.priority_areas.length > 0) {
    lines.push('=== ÁREAS DE ATENÇÃO PRIORITÁRIA ===');
    analysis.priority_areas.forEach((area, idx) => {
      lines.push(`${idx + 1}. ${area}`);
    });
    lines.push('');
  }

  // Tendências
  if (analysis.trends && analysis.trends.length > 0) {
    lines.push('=== TENDÊNCIAS IDENTIFICADAS ===');
    analysis.trends.forEach((trend, idx) => {
      lines.push(`${idx + 1}. ${trend.metric}: ${trend.direction} (${trend.change_percent.toFixed(1)}%)`);
      lines.push(`   ${trend.interpretation}`);
      lines.push(`   Ação: ${trend.action_suggested}`);
      lines.push('');
    });
  }

  // Recomendações
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    lines.push('=== RECOMENDAÇÕES DE OTIMIZAÇÃO ===');
    analysis.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      lines.push(`   ${rec.description}`);
      lines.push(`   Impacto Esperado: ${rec.expected_impact}`);
      if (rec.implementation_steps && rec.implementation_steps.length > 0) {
        lines.push(`   Passos:`);
        rec.implementation_steps.forEach((step, stepIdx) => {
          lines.push(`     ${stepIdx + 1}) ${step}`);
        });
      }
      lines.push('');
    });
  }

  // Anomalias
  if (analysis.anomalies && analysis.anomalies.length > 0) {
    lines.push('=== ANOMALIAS DETECTADAS ===');
    analysis.anomalies.forEach((anomaly, idx) => {
      lines.push(`${idx + 1}. ${anomaly.metric} - ${anomaly.anomaly_type} (${anomaly.severity})`);
      lines.push(`   ${anomaly.description}`);
      if (anomaly.recommended_actions && anomaly.recommended_actions.length > 0) {
        lines.push(`   Ações recomendadas:`);
        anomaly.recommended_actions.forEach(action => {
          lines.push(`   - ${action}`);
        });
      }
      lines.push('');
    });
  }

  // Previsão
  if (analysis.short_term_forecast) {
    lines.push('=== PREVISÃO DE CURTO PRAZO ===');
    lines.push(analysis.short_term_forecast);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extrai destaques principais dos insights de IA
 */
export function extractKeyHighlights(analysis: MetricsAIAnalysis): string[] {
  const highlights: string[] = [];

  // Score geral
  const overallScore = analysis.performance_scores.overall_score;
  highlights.push(`Performance Geral: ${overallScore}/100 (${getScoreLabel(overallScore)})`);

  // Primeira área prioritária
  if (analysis.priority_areas && analysis.priority_areas.length > 0) {
    highlights.push(`Prioridade #1: ${analysis.priority_areas[0]}`);
  }

  // Tendência mais significativa
  if (analysis.trends && analysis.trends.length > 0) {
    const significantTrend = analysis.trends.find(t => Math.abs(t.change_percent) > 20);
    if (significantTrend) {
      highlights.push(
        `${significantTrend.metric}: ${significantTrend.direction} ${Math.abs(significantTrend.change_percent).toFixed(1)}%`
      );
    }
  }

  // Recomendação de maior prioridade
  const criticalRec = analysis.recommendations?.find(r => r.priority === 'critical');
  const highRec = analysis.recommendations?.find(r => r.priority === 'high');
  const topRec = criticalRec || highRec;
  if (topRec) {
    highlights.push(`Recomendação: ${topRec.title}`);
  }

  // Anomalias críticas
  const criticalAnomalies = analysis.anomalies?.filter(a => a.severity === 'critical' || a.severity === 'high');
  if (criticalAnomalies && criticalAnomalies.length > 0) {
    highlights.push(`⚠️ ${criticalAnomalies.length} anomalia(s) detectada(s)`);
  }

  return highlights;
}

/**
 * Helper: Retorna label do score
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Baixo';
  return 'Crítico';
}

/**
 * Gera nome de arquivo descritivo para exportação
 */
export function generateExportFileName(
  format: 'pdf' | 'xlsx' | 'csv',
  metadata: ExportDataWithAI['metadata'],
  includeAI: boolean
): string {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const levelMap: Record<AnalysisLevel, string> = {
    campaign: 'Campanhas',
    adset: 'Conjuntos',
    ad: 'Anuncios',
    account: 'Conta',
  };

  const level = levelMap[metadata.entityLevel] || metadata.entityLevel;
  const aiSuffix = includeAI ? '_com_IA' : '';

  return `AdsOps_${level}_${timestamp}${aiSuffix}.${format}`;
}

/**
 * Calcula estatísticas agregadas dos dados para resumo
 */
export function calculateExportStatistics(data: any[]): Record<string, any> {
  if (data.length === 0) return {};

  const totals = data.reduce((acc, row) => ({
    impressions: acc.impressions + (Number(row.impressions) || 0),
    clicks: acc.clicks + (Number(row.clicks) || 0),
    spend: acc.spend + (Number(row.spend) || 0),
    reach: acc.reach + (Number(row.reach) || 0),
    conversions: acc.conversions + (Number(row.conversions) || 0),
  }), { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 });

  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;

  return {
    ...totals,
    avgCtr,
    avgCpc,
    avgCpm,
    avgFrequency,
    totalRows: data.length,
  };
}
