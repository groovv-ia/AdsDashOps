/**
 * MetricsAIAnalysisService
 *
 * Serviço para análise de métricas de campanhas/anúncios usando IA.
 * Processa dados de performance e gera insights acionáveis sobre
 * CTR, CPC, conversões, tendências e oportunidades de otimização.
 */

import { supabase } from '../supabase';
import type {
  MetricsAIAnalysis,
  MetricsInputData,
  AnalyzeMetricsPayload,
  AnalyzeMetricsResponse,
  AnalysisLevel,
  DailyMetricPoint,
  PreviousPeriodComparison,
  MetricsBenchmarks,
} from '../../types/metricsAnalysis';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// Interface para dados pre-carregados (vindos do modal)
export interface PreloadedMetricsData {
  entityName: string;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgFrequency: number;
  dailyMetrics: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
  }>;
}

/**
 * Constroi MetricsInputData a partir de dados pre-carregados
 */
function buildMetricsInputFromPreloaded(
  entityId: string,
  entityLevel: AnalysisLevel,
  startDate: string,
  endDate: string,
  data: PreloadedMetricsData
): MetricsInputData {
  return {
    entity_id: entityId,
    entity_name: data.entityName,
    entity_level: entityLevel,
    start_date: startDate,
    end_date: endDate,
    days_count: data.dailyMetrics.length,
    total_impressions: data.totalImpressions,
    total_reach: data.totalReach,
    total_clicks: data.totalClicks,
    total_spend: data.totalSpend,
    total_conversions: 0,
    avg_ctr: data.avgCtr,
    avg_cpc: data.avgCpc,
    avg_cpm: data.avgCpm,
    avg_frequency: data.avgFrequency,
    avg_conversion_rate: 0,
    avg_cost_per_conversion: 0,
    daily_metrics: data.dailyMetrics.map(d => ({
      date: d.date,
      impressions: d.impressions,
      clicks: d.clicks,
      spend: d.spend,
      ctr: d.ctr,
      cpc: d.cpc,
      cpm: d.cpm,
      conversions: 0,
    })),
  };
}

/**
 * Solicita análise de métricas com IA via Edge Function
 */
export async function requestMetricsAnalysis(
  payload: AnalyzeMetricsPayload
): Promise<AnalyzeMetricsResponse> {
  // Verifica autenticação do usuário
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Chama a Edge Function de análise de métricas
  const response = await fetch(`${FUNCTIONS_URL}/meta-analyze-metrics-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao analisar métricas');
  }

  return response.json();
}

/**
 * Busca a análise de métricas mais recente para uma entidade
 */
export async function getLatestMetricsAnalysis(
  entityId: string,
  entityLevel: AnalysisLevel
): Promise<MetricsAIAnalysis | null> {
  const { data, error } = await supabase
    .from('meta_metrics_ai_analyses')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_level', entityLevel)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise de métricas:', error);
    return null;
  }

  return data;
}

/**
 * Busca histórico de análises de métricas
 */
export async function getMetricsAnalysisHistory(
  entityId: string,
  entityLevel: AnalysisLevel,
  limit = 10
): Promise<MetricsAIAnalysis[]> {
  const { data, error } = await supabase
    .from('meta_metrics_ai_analyses')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_level', entityLevel)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar histórico de análises:', error);
    return [];
  }

  return data || [];
}

/**
 * Prepara dados de métricas do banco para análise
 * Busca métricas diárias e calcula agregados
 * Tambem aceita dados pre-carregados para evitar nova query
 */
export async function prepareMetricsDataForAnalysis(
  entityId: string,
  entityLevel: AnalysisLevel,
  startDate: string,
  endDate: string,
  preloadedData?: PreloadedMetricsData
): Promise<MetricsInputData | null> {
  // Se dados pre-carregados foram fornecidos, usa eles
  if (preloadedData && preloadedData.dailyMetrics.length > 0) {
    return buildMetricsInputFromPreloaded(entityId, entityLevel, startDate, endDate, preloadedData);
  }

  // Busca métricas diárias da entidade
  const { data: dailyData, error } = await supabase
    .from('meta_insights_daily')
    .select('*')
    .eq('entity_id', entityId)
    .eq('level', entityLevel)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error || !dailyData || dailyData.length === 0) {
    console.error('Erro ao buscar métricas:', error);
    return null;
  }

  // Calcula totais e médias
  const totals = dailyData.reduce(
    (acc, row) => ({
      impressions: acc.impressions + (Number(row.impressions) || 0),
      reach: acc.reach + (Number(row.reach) || 0),
      clicks: acc.clicks + (Number(row.clicks) || 0),
      spend: acc.spend + (Number(row.spend) || 0),
      conversions: acc.conversions + extractConversions(row.actions_json),
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0 }
  );

  // Calcula métricas derivadas
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
  const avgConversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
  const avgCostPerConversion = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  // Prepara dados diários para análise de tendência
  const dailyMetrics: DailyMetricPoint[] = dailyData.map(row => ({
    date: row.date,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    spend: Number(row.spend) || 0,
    ctr: Number(row.ctr) || 0,
    cpc: Number(row.cpc) || 0,
    cpm: Number(row.cpm) || 0,
    conversions: extractConversions(row.actions_json),
  }));

  // Busca benchmarks (média da campanha/adset para comparação)
  const benchmarks = await fetchBenchmarks(entityId, entityLevel, startDate, endDate);

  // Calcula comparativo com período anterior
  const previousPeriod = await calculatePreviousPeriodComparison(
    entityId,
    entityLevel,
    startDate,
    endDate,
    totals
  );

  // Busca nome da entidade
  const entityName = dailyData[0]?.entity_name || entityId;

  return {
    entity_id: entityId,
    entity_name: entityName,
    entity_level: entityLevel,
    start_date: startDate,
    end_date: endDate,
    days_count: dailyData.length,
    total_impressions: totals.impressions,
    total_reach: totals.reach,
    total_clicks: totals.clicks,
    total_spend: totals.spend,
    total_conversions: totals.conversions,
    avg_ctr: avgCtr,
    avg_cpc: avgCpc,
    avg_cpm: avgCpm,
    avg_frequency: avgFrequency,
    avg_conversion_rate: avgConversionRate,
    avg_cost_per_conversion: avgCostPerConversion,
    daily_metrics: dailyMetrics,
    previous_period: previousPeriod,
    benchmarks,
  };
}

/**
 * Extrai conversões do campo actions_json
 */
function extractConversions(actionsJson: unknown): number {
  if (!actionsJson || typeof actionsJson !== 'object') return 0;

  const actions = actionsJson as Record<string, number>;
  // Procura por ações de conversão comuns
  return (
    (actions['purchase'] || 0) +
    (actions['lead'] || 0) +
    (actions['complete_registration'] || 0) +
    (actions['add_to_cart'] || 0) +
    (actions['initiate_checkout'] || 0)
  );
}

/**
 * Busca benchmarks para comparação (média do contexto pai)
 */
async function fetchBenchmarks(
  entityId: string,
  entityLevel: AnalysisLevel,
  startDate: string,
  endDate: string
): Promise<MetricsBenchmarks | undefined> {
  // Determina o nível pai para benchmark
  let parentLevel: AnalysisLevel | null = null;
  let contextName = '';

  if (entityLevel === 'ad') {
    parentLevel = 'adset';
    contextName = 'Média do Conjunto de Anúncios';
  } else if (entityLevel === 'adset') {
    parentLevel = 'campaign';
    contextName = 'Média da Campanha';
  } else if (entityLevel === 'campaign') {
    // Para campanhas, compara com média da conta
    contextName = 'Média da Conta';
  }

  // Busca métricas do nível pai para benchmark
  const { data, error } = await supabase
    .from('meta_insights_daily')
    .select('ctr, cpc, cpm, clicks, impressions')
    .eq('level', parentLevel || 'campaign')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error || !data || data.length === 0) {
    return undefined;
  }

  // Calcula médias do benchmark
  const avgCtr = data.reduce((sum, r) => sum + (Number(r.ctr) || 0), 0) / data.length;
  const avgCpc = data.reduce((sum, r) => sum + (Number(r.cpc) || 0), 0) / data.length;
  const avgCpm = data.reduce((sum, r) => sum + (Number(r.cpm) || 0), 0) / data.length;

  return {
    context_name: contextName,
    avg_ctr: avgCtr,
    avg_cpc: avgCpc,
    avg_cpm: avgCpm,
    avg_conversion_rate: 0, // Seria necessário calcular
  };
}

/**
 * Calcula comparativo com período anterior
 */
async function calculatePreviousPeriodComparison(
  entityId: string,
  entityLevel: AnalysisLevel,
  startDate: string,
  endDate: string,
  currentTotals: { impressions: number; clicks: number; spend: number; conversions: number }
): Promise<PreviousPeriodComparison | undefined> {
  // Calcula datas do período anterior
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - periodDays);

  const prevStartStr = prevStart.toISOString().split('T')[0];
  const prevEndStr = prevEnd.toISOString().split('T')[0];

  // Busca métricas do período anterior
  const { data, error } = await supabase
    .from('meta_insights_daily')
    .select('impressions, clicks, spend, ctr, cpc, actions_json')
    .eq('entity_id', entityId)
    .eq('level', entityLevel)
    .gte('date', prevStartStr)
    .lte('date', prevEndStr);

  if (error || !data || data.length === 0) {
    return undefined;
  }

  // Calcula totais do período anterior
  const prevTotals = data.reduce(
    (acc, row) => ({
      impressions: acc.impressions + (Number(row.impressions) || 0),
      clicks: acc.clicks + (Number(row.clicks) || 0),
      spend: acc.spend + (Number(row.spend) || 0),
      conversions: acc.conversions + extractConversions(row.actions_json),
      ctrSum: acc.ctrSum + (Number(row.ctr) || 0),
      cpcSum: acc.cpcSum + (Number(row.cpc) || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctrSum: 0, cpcSum: 0 }
  );

  // Calcula variações percentuais
  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const prevAvgCtr = prevTotals.impressions > 0
    ? (prevTotals.clicks / prevTotals.impressions) * 100
    : 0;
  const currentAvgCtr = currentTotals.impressions > 0
    ? (currentTotals.clicks / currentTotals.impressions) * 100
    : 0;

  const prevAvgCpc = prevTotals.clicks > 0
    ? prevTotals.spend / prevTotals.clicks
    : 0;
  const currentAvgCpc = currentTotals.clicks > 0
    ? currentTotals.spend / currentTotals.clicks
    : 0;

  return {
    impressions_change_percent: calcChange(currentTotals.impressions, prevTotals.impressions),
    clicks_change_percent: calcChange(currentTotals.clicks, prevTotals.clicks),
    spend_change_percent: calcChange(currentTotals.spend, prevTotals.spend),
    ctr_change_percent: calcChange(currentAvgCtr, prevAvgCtr),
    cpc_change_percent: calcChange(currentAvgCpc, prevAvgCpc),
    conversions_change_percent: calcChange(currentTotals.conversions, prevTotals.conversions),
  };
}

/**
 * Verifica se uma entidade já possui análise de métricas recente
 * (considera recente se foi feita nas últimas 24 horas)
 */
export async function hasRecentMetricsAnalysis(
  entityId: string,
  entityLevel: AnalysisLevel,
  hoursThreshold = 24
): Promise<boolean> {
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

  const { count, error } = await supabase
    .from('meta_metrics_ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .eq('entity_level', entityLevel)
    .gte('analyzed_at', thresholdDate.toISOString());

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Deleta uma análise de métricas específica
 */
export async function deleteMetricsAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('meta_metrics_ai_analyses')
    .delete()
    .eq('id', analysisId);

  return !error;
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número com separadores de milhar
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

/**
 * Formata percentual para exibição
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formata número de forma compacta (K, M)
 */
export function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatNumber(value);
}
