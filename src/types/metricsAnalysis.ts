/**
 * Tipos TypeScript para análise de métricas de campanhas/anúncios com IA
 *
 * Define interfaces para análise de performance, tendências, anomalias
 * e recomendações baseadas em dados de métricas de publicidade.
 */

// Níveis de análise disponíveis
export type AnalysisLevel = 'ad' | 'adset' | 'campaign' | 'account';

// Tipos de insight de métricas
export type MetricsInsightType =
  | 'performance'      // Análise geral de performance
  | 'trend'            // Tendência identificada
  | 'anomaly'          // Anomalia detectada
  | 'optimization'     // Oportunidade de otimização
  | 'alert'            // Alerta importante
  | 'benchmark';       // Comparação com benchmark

// Níveis de impacto/prioridade
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';

// Direção de tendência
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'volatile';

// Status de métrica comparada ao benchmark
export type BenchmarkStatus = 'excellent' | 'good' | 'average' | 'below_average' | 'poor';

// Interface para métricas de entrada da análise
export interface MetricsInputData {
  // Identificação
  entity_id: string;
  entity_name: string;
  entity_level: AnalysisLevel;

  // Período analisado
  start_date: string;
  end_date: string;
  days_count: number;

  // Métricas totais do período
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_spend: number;
  total_conversions: number;

  // Métricas médias calculadas
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_frequency: number;
  avg_conversion_rate: number;
  avg_cost_per_conversion: number;

  // ROAS se disponível
  roas?: number;

  // Dados de tendência (últimos N dias)
  daily_metrics?: DailyMetricPoint[];

  // Comparativo com período anterior (se disponível)
  previous_period?: PreviousPeriodComparison;

  // Benchmarks do contexto (média do adset, campanha ou conta)
  benchmarks?: MetricsBenchmarks;

  // Objetivo da campanha (para contextualização)
  campaign_objective?: string;
}

// Interface para ponto de métrica diário
export interface DailyMetricPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions?: number;
}

// Interface para comparação com período anterior
export interface PreviousPeriodComparison {
  impressions_change_percent: number;
  clicks_change_percent: number;
  spend_change_percent: number;
  ctr_change_percent: number;
  cpc_change_percent: number;
  conversions_change_percent: number;
}

// Interface para benchmarks de contexto
export interface MetricsBenchmarks {
  context_name: string; // "Média do Ad Set", "Média da Campanha", etc.
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_conversion_rate: number;
}

// Interface para um insight individual de métricas
export interface MetricsInsight {
  id: string;
  type: MetricsInsightType;
  title: string;
  description: string;
  impact: ImpactLevel;
  confidence: number; // 0-100
  metric_affected: string;
  current_value: string;
  expected_value?: string;
  recommendation: string;
  potential_improvement?: string;
}

// Interface para análise de tendência
export interface TrendAnalysis {
  metric: string;
  direction: TrendDirection;
  change_percent: number;
  period_description: string;
  interpretation: string;
  action_suggested: string;
}

// Interface para anomalia detectada
export interface AnomalyDetection {
  metric: string;
  anomaly_type: 'spike' | 'drop' | 'pattern_break';
  severity: ImpactLevel;
  date_detected: string;
  description: string;
  possible_causes: string[];
  recommended_actions: string[];
}

// Interface para comparação com benchmark
export interface BenchmarkComparison {
  metric: string;
  current_value: number;
  benchmark_value: number;
  difference_percent: number;
  status: BenchmarkStatus;
  interpretation: string;
}

// Interface para recomendação de otimização
export interface OptimizationRecommendation {
  priority: ImpactLevel;
  category: 'budget' | 'targeting' | 'bidding' | 'schedule' | 'creative' | 'general';
  title: string;
  description: string;
  expected_impact: string;
  implementation_steps: string[];
  metrics_to_monitor: string[];
  estimated_improvement?: string;
}

// Interface para score de performance
export interface PerformanceScore {
  overall_score: number; // 0-100
  efficiency_score: number; // CTR, CPC optimization
  cost_score: number; // Custo-benefício
  reach_score: number; // Alcance e frequência
  conversion_score: number; // Conversões e ROAS
  trend_score: number; // Tendência de evolução
}

// Interface principal para resultado da análise de métricas com IA
export interface MetricsAIAnalysis {
  id: string;
  workspace_id: string;
  entity_id: string;
  entity_name: string;
  entity_level: AnalysisLevel;

  // Período analisado
  analysis_period: {
    start_date: string;
    end_date: string;
  };

  // Scores de performance
  performance_scores: PerformanceScore;

  // Resumo executivo
  executive_summary: string;

  // Diagnóstico geral
  overall_diagnosis: string;

  // Tendências identificadas
  trends: TrendAnalysis[];

  // Anomalias detectadas
  anomalies: AnomalyDetection[];

  // Comparações com benchmarks
  benchmark_comparisons: BenchmarkComparison[];

  // Insights detalhados
  insights: MetricsInsight[];

  // Recomendações de otimização
  recommendations: OptimizationRecommendation[];

  // Previsão de curto prazo
  short_term_forecast?: string;

  // Áreas de atenção prioritária
  priority_areas: string[];

  // Metadados da análise
  model_used: string;
  tokens_used: number;
  analyzed_at: string;
  created_at: string;
}

// Interface para payload de requisição de análise
export interface AnalyzeMetricsPayload {
  entity_id: string;
  entity_name: string;
  entity_level: AnalysisLevel;
  meta_ad_account_id: string;
  metrics_data: MetricsInputData;
}

// Interface para resposta da análise
export interface AnalyzeMetricsResponse {
  analysis: MetricsAIAnalysis;
  tokens_used: number;
  saved: boolean;
  save_error?: string;
}

// Interface para estado do componente de análise
export interface MetricsAnalysisState {
  analysis: MetricsAIAnalysis | null;
  loading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  hasAnalysis: boolean;
}

// Helper function para determinar cor do score
export function getPerformanceScoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 80) return { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' };
  if (score >= 60) return { text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' };
  if (score >= 40) return { text: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' };
  return { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
}

// Helper function para label de score
export function getPerformanceScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Baixo';
  return 'Crítico';
}

// Helper function para cor de impacto
export function getImpactColor(impact: ImpactLevel): { text: string; bg: string } {
  const colors: Record<ImpactLevel, { text: string; bg: string }> = {
    critical: { text: 'text-red-800', bg: 'bg-red-100' },
    high: { text: 'text-orange-800', bg: 'bg-orange-100' },
    medium: { text: 'text-amber-800', bg: 'bg-amber-100' },
    low: { text: 'text-blue-800', bg: 'bg-blue-100' },
  };
  return colors[impact];
}

// Helper function para label de impacto
export function getImpactLabel(impact: ImpactLevel): string {
  const labels: Record<ImpactLevel, string> = {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
  };
  return labels[impact];
}

// Helper function para ícone de tendência
export function getTrendInfo(direction: TrendDirection): { label: string; color: string; arrow: 'up' | 'down' | 'flat' } {
  const info: Record<TrendDirection, { label: string; color: string; arrow: 'up' | 'down' | 'flat' }> = {
    improving: { label: 'Melhorando', color: 'text-green-600', arrow: 'up' },
    declining: { label: 'Piorando', color: 'text-red-600', arrow: 'down' },
    stable: { label: 'Estável', color: 'text-gray-600', arrow: 'flat' },
    volatile: { label: 'Volátil', color: 'text-amber-600', arrow: 'flat' },
  };
  return info[direction];
}

// Helper function para cor de benchmark status
export function getBenchmarkStatusColor(status: BenchmarkStatus): { text: string; bg: string } {
  const colors: Record<BenchmarkStatus, { text: string; bg: string }> = {
    excellent: { text: 'text-green-800', bg: 'bg-green-100' },
    good: { text: 'text-blue-800', bg: 'bg-blue-100' },
    average: { text: 'text-gray-800', bg: 'bg-gray-100' },
    below_average: { text: 'text-amber-800', bg: 'bg-amber-100' },
    poor: { text: 'text-red-800', bg: 'bg-red-100' },
  };
  return colors[status];
}

// Helper function para label de benchmark status
export function getBenchmarkStatusLabel(status: BenchmarkStatus): string {
  const labels: Record<BenchmarkStatus, string> = {
    excellent: 'Excelente',
    good: 'Bom',
    average: 'Na Média',
    below_average: 'Abaixo da Média',
    poor: 'Baixo',
  };
  return labels[status];
}
