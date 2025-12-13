/**
 * Tipos TypeScript para análise de anúncios com IA
 *
 * Define interfaces para criativos, análises, recomendações
 * e dados relacionados aos anúncios do Meta Ads.
 */

// Tipos de criativos suportados
export type CreativeType = 'image' | 'video' | 'carousel' | 'unknown';

// Níveis de prioridade para recomendações
export type RecommendationPriority = 'high' | 'medium' | 'low';

// Categorias de recomendações
export type RecommendationCategory = 'visual' | 'copy' | 'cta' | 'targeting' | 'general';

// Interface para o criativo do anúncio Meta
export interface MetaAdCreative {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  meta_creative_id: string | null;
  creative_type: CreativeType;
  image_url: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  video_id: string | null;
  preview_url: string | null;
  title: string | null;
  body: string | null;
  description: string | null;
  call_to_action: string | null;
  link_url: string | null;
  extra_data: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
}

// Interface para análise visual do criativo
export interface VisualAnalysis {
  composition_score: number;
  color_usage: string;
  text_visibility: string;
  brand_consistency: string;
  attention_grabbing: string;
  key_strengths: string[];
  improvement_areas: string[];
}

// Interface para análise da copy/texto do anúncio
export interface CopyAnalysis {
  clarity_score: number;
  persuasion_level: 'baixo' | 'médio' | 'alto';
  urgency_present: boolean;
  cta_effectiveness: string;
  emotional_appeal: string;
  key_strengths: string[];
  improvement_areas: string[];
}

// Interface para uma recomendação de melhoria
export interface AdRecommendation {
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  description: string;
  expected_impact: string;
}

// Interface para análise completa de IA do anúncio
export interface AdAIAnalysis {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  creative_score: number;
  copy_score: number;
  overall_score: number;
  visual_analysis: VisualAnalysis;
  copy_analysis: CopyAnalysis;
  recommendations: AdRecommendation[];
  image_url: string | null;
  model_used: string;
  tokens_used: number;
  analyzed_at: string;
  created_at: string;
}

// Interface para métricas do anúncio
export interface AdMetrics {
  ad_id: string;
  date: string;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  conversion_rate: number;
  cost_per_conversion: number;
}

// Interface para dados agregados de métricas
export interface AdMetricsAggregated {
  total_impressions: number;
  total_reach: number;
  avg_frequency: number;
  total_clicks: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  total_spend: number;
  total_conversions: number;
  avg_conversion_rate: number;
  avg_cost_per_conversion: number;
  daily_metrics: AdMetrics[];
}

// Interface para dados completos do detalhe do anúncio
export interface AdDetailData {
  ad_id: string;
  ad_name: string;
  status: string;
  campaign_name?: string;
  adset_name?: string;
  meta_ad_account_id: string;
  creative: MetaAdCreative | null;
  metrics: AdMetricsAggregated | null;
  ai_analysis: AdAIAnalysis | null;
}

// Interface para payload de busca de criativo
export interface FetchCreativePayload {
  ad_id: string;
  meta_ad_account_id: string;
  force_refresh?: boolean;
}

// Interface para resposta de busca de criativo
export interface FetchCreativeResponse {
  creative: MetaAdCreative;
  cached: boolean;
  save_error?: string;
}

// Interface para payload de análise de IA
export interface AnalyzeAdPayload {
  ad_id: string;
  meta_ad_account_id: string;
  image_url: string;
  copy_data: {
    title?: string;
    body?: string;
    description?: string;
    cta?: string;
  };
}

// Interface para resposta de análise de IA
export interface AnalyzeAdResponse {
  analysis: AdAIAnalysis;
  tokens_used: number;
  saved: boolean;
  save_error?: string;
}

// Interface para comparativo com benchmarks
export interface AdBenchmarkComparison {
  metric: string;
  ad_value: number;
  campaign_avg: number;
  account_avg: number;
  performance: 'above' | 'average' | 'below';
  difference_percent: number;
}

// Interface para dados de insights pre-carregados (do banco de dados)
export interface PreloadedInsightRow {
  id: string;
  level: string;
  entity_id: string;
  entity_name: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

// Interface para estado do modal de detalhes
export interface AdDetailModalState {
  isOpen: boolean;
  adData: {
    ad_id: string;
    entity_name: string;
    meta_ad_account_id: string;
    meta_ad_account_internal_id?: string;
    status?: string;
    campaign_name?: string;
    adset_name?: string;
  } | null;
}

// Enum para abas do modal de detalhes
export enum AdDetailTab {
  OVERVIEW = 'overview',
  CREATIVE = 'creative',
  METRICS = 'metrics',
  AI_ANALYSIS = 'ai_analysis',
}

// Interface para configuração de cores do score
export interface ScoreColorConfig {
  excellent: { min: number; color: string; bg: string };
  good: { min: number; color: string; bg: string };
  average: { min: number; color: string; bg: string };
  poor: { min: number; color: string; bg: string };
}

// Configuração padrão de cores para scores
export const DEFAULT_SCORE_COLORS: ScoreColorConfig = {
  excellent: { min: 80, color: 'text-green-600', bg: 'bg-green-100' },
  good: { min: 60, color: 'text-blue-600', bg: 'bg-blue-100' },
  average: { min: 40, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  poor: { min: 0, color: 'text-red-600', bg: 'bg-red-100' },
};

// Função helper para obter cor baseada no score
export function getScoreColor(score: number, config = DEFAULT_SCORE_COLORS): { color: string; bg: string } {
  if (score >= config.excellent.min) return { color: config.excellent.color, bg: config.excellent.bg };
  if (score >= config.good.min) return { color: config.good.color, bg: config.good.bg };
  if (score >= config.average.min) return { color: config.average.color, bg: config.average.bg };
  return { color: config.poor.color, bg: config.poor.bg };
}

// Função helper para formatar label de prioridade
export function getPriorityLabel(priority: RecommendationPriority): string {
  const labels: Record<RecommendationPriority, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  return labels[priority];
}

// Função helper para obter cor da prioridade
export function getPriorityColor(priority: RecommendationPriority): { text: string; bg: string } {
  const colors: Record<RecommendationPriority, { text: string; bg: string }> = {
    high: { text: 'text-red-700', bg: 'bg-red-100' },
    medium: { text: 'text-yellow-700', bg: 'bg-yellow-100' },
    low: { text: 'text-blue-700', bg: 'bg-blue-100' },
  };
  return colors[priority];
}

// Função helper para formatar label de categoria
export function getCategoryLabel(category: RecommendationCategory): string {
  const labels: Record<RecommendationCategory, string> = {
    visual: 'Visual',
    copy: 'Texto',
    cta: 'Call-to-Action',
    targeting: 'Segmentação',
    general: 'Geral',
  };
  return labels[category];
}

// Função helper para formatar tipo de criativo
export function getCreativeTypeLabel(type: CreativeType): string {
  const labels: Record<CreativeType, string> = {
    image: 'Imagem',
    video: 'Vídeo',
    carousel: 'Carrossel',
    unknown: 'Desconhecido',
  };
  return labels[type];
}
