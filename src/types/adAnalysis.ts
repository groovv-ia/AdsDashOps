/**
 * Tipos TypeScript para análise de anúncios com IA
 *
 * Define interfaces para criativos, análises, recomendações
 * e dados relacionados aos anúncios do Meta Ads.
 */

// Tipos de criativos suportados
export type CreativeType = 'image' | 'video' | 'carousel' | 'dynamic' | 'unknown';

// Qualidade da thumbnail/imagem
export type ThumbnailQuality = 'hd' | 'sd' | 'low' | 'unknown';

// Status do fetch do criativo
export type FetchStatus = 'success' | 'partial' | 'failed' | 'pending';

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
  image_url_hd: string | null; // URL em alta definição quando disponível
  thumbnail_url: string | null;
  thumbnail_quality: ThumbnailQuality; // Qualidade da thumbnail
  image_width: number | null; // Largura da imagem em pixels
  image_height: number | null; // Altura da imagem em pixels
  video_url: string | null;
  video_id: string | null;
  preview_url: string | null;
  title: string | null;
  body: string | null;
  description: string | null;
  call_to_action: string | null;
  link_url: string | null;
  is_complete: boolean; // Se tem dados completos (imagem OU textos)
  fetch_status: FetchStatus; // Status do fetch
  fetch_attempts: number; // Número de tentativas de fetch
  last_validated_at: string | null; // Última validação
  error_message: string | null; // Última mensagem de erro
  extra_data: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
  updated_at?: string;
  // Campos de cache no Supabase Storage
  cached_image_url: string | null;
  cached_thumbnail_url: string | null;
  cached_video_url: string | null;
  cache_expires_at: string | null;
  video_source_url: string | null;
  video_duration: number | null;
  video_format: string | null;
  file_size: number | null;
}

// Interface para análise detalhada de elementos visuais específicos
export interface VisualElements {
  detected_objects: string[]; // Pessoas, produtos, ambientes identificados
  color_palette: string[]; // Cores principais identificadas (hex codes)
  typography_analysis: string; // Análise de fontes e textos visíveis
  composition_type: string; // Tipo de composição (regra dos terços, centralizado, etc)
  visual_hierarchy: string; // Análise da hierarquia visual
  contrast_level: string; // Nível de contraste (alto, médio, baixo)
}

// Interface para análise psicológica e emocional
export interface PsychologicalAnalysis {
  primary_emotion: string; // Emoção primária evocada
  emotional_triggers: string[]; // Gatilhos emocionais identificados
  persuasion_techniques: string[]; // Técnicas de persuasão utilizadas (scarcity, urgency, social proof, etc)
  target_audience_fit: string; // Adequação ao público-alvo
  cognitive_load: string; // Carga cognitiva (baixa, média, alta)
  trust_signals: string[]; // Sinais de confiança presentes
}

// Interface para análise de primeiro impacto
export interface FirstImpressionAnalysis {
  attention_score: number; // Score de atenção (0-100)
  scrollstopper_potential: string; // Potencial de parar o scroll
  three_second_message: string; // Mensagem captada em 3 segundos
  visual_clarity: string; // Claridade visual imediata
  focal_point: string; // Ponto focal principal
}

// Interface para análise de adequação a diferentes placements
export interface PlacementAnalysis {
  feed_suitability: string; // Adequação para feed (Facebook/Instagram)
  stories_suitability: string; // Adequação para stories
  reels_suitability: string; // Adequação para reels
  mobile_friendliness: string; // Amigabilidade mobile
  desktop_friendliness: string; // Amigabilidade desktop
}

// Interface para análise visual expandida do criativo
export interface VisualAnalysis {
  composition_score: number;
  color_usage: string;
  text_visibility: string;
  brand_consistency: string;
  attention_grabbing: string;
  key_strengths: string[];
  improvement_areas: string[];
  // Novos campos detalhados
  visual_elements?: VisualElements;
  psychological_analysis?: PsychologicalAnalysis;
  first_impression?: FirstImpressionAnalysis;
  placement_analysis?: PlacementAnalysis;
  design_trends?: string; // Análise de tendências de design
  modernization_suggestions?: string[]; // Sugestões de modernização
}

// Interface para análise da mensagem e proposta de valor
export interface MessageAnalysis {
  value_proposition_clarity: string; // Clareza da proposta de valor
  message_match_visual: string; // Coerência entre mensagem e visual
  tone_of_voice: string; // Tom de voz identificado
  readability_score: number; // Score de legibilidade (0-100)
  word_count: number; // Contagem de palavras
  power_words_used: string[]; // Palavras poderosas utilizadas
}

// Interface para análise expandida da copy/texto do anúncio
export interface CopyAnalysis {
  clarity_score: number;
  persuasion_level: 'baixo' | 'médio' | 'alto';
  urgency_present: boolean;
  cta_effectiveness: string;
  emotional_appeal: string;
  key_strengths: string[];
  improvement_areas: string[];
  // Novos campos detalhados
  message_analysis?: MessageAnalysis;
  headline_effectiveness?: string; // Avaliação específica do headline
  body_copy_effectiveness?: string; // Avaliação do corpo do texto
  cta_placement_analysis?: string; // Análise do posicionamento do CTA
  benefits_vs_features?: string; // Análise de benefícios vs características
}

// Interface para sugestão de teste A/B
export interface ABTestSuggestion {
  test_type: 'visual' | 'copy' | 'cta' | 'layout' | 'color';
  hypothesis: string; // Hipótese do teste
  variant_description: string; // Descrição da variante sugerida
  what_to_change: string; // O que mudar especificamente
  expected_outcome: string; // Resultado esperado
  metrics_to_track: string[]; // Métricas para acompanhar
  priority: RecommendationPriority;
}

// Interface para recomendação expandida de melhoria
export interface AdRecommendation {
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  description: string;
  expected_impact: string;
  // Novos campos
  implementation_difficulty?: 'easy' | 'medium' | 'hard'; // Dificuldade de implementação
  estimated_impact_percentage?: string; // Impacto estimado em percentual
  ab_test_suggestion?: ABTestSuggestion; // Sugestão de teste A/B relacionado
}

// Interface para contexto de performance (passado para análise)
export interface PerformanceContext {
  total_impressions: number;
  total_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  total_spend: number;
  conversions: number;
  conversion_rate: number;
  campaign_objective?: string; // Objetivo da campanha
}

// Interface para análise correlacionada com performance
export interface PerformanceCorrelation {
  performance_summary: string; // Resumo da performance atual
  visual_performance_link: string; // Como visual impacta performance
  copy_performance_link: string; // Como copy impacta performance
  underperforming_areas: string[]; // Áreas com baixa performance
  high_performing_elements: string[]; // Elementos de alta performance
  optimization_priority: string; // Prioridade de otimização baseada em dados
}

// Interface para análise completa expandida de IA do anúncio
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
  // Novos campos expandidos
  performance_correlation?: PerformanceCorrelation;
  ab_test_suggestions?: ABTestSuggestion[];
  competitive_analysis?: string; // Análise competitiva
  audience_insights?: string; // Insights sobre o público-alvo ideal
  strategic_recommendations?: string; // Recomendações estratégicas de alto nível
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
  // Novas metricas de conversas e leads
  messaging_conversations_started: number;
  cost_per_messaging_conversation_started: number;
  leads: number;
  cost_per_lead: number;
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
  // Novas metricas de conversas e leads (agregadas)
  total_messaging_conversations_started: number;
  avg_cost_per_messaging_conversation_started: number;
  total_leads: number;
  avg_cost_per_lead: number;
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

// Interface para payload expandido de análise de IA com contexto de performance
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
  // Novo: contexto de performance para análise correlacionada
  performance_context?: PerformanceContext;
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
  // Campos de conversao extraidos do actions_json
  leads?: number;
  messaging_conversations_started?: number;
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
    dynamic: 'Dinâmico',
    unknown: 'Desconhecido',
  };
  return labels[type] || 'Desconhecido';
}
