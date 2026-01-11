/**
 * Tipos TypeScript para análise de carrosséis de anúncios
 *
 * Define interfaces para análise de carrosséis incluindo:
 * - Análise geral do carrossel
 * - Análise individual de cada slide
 * - Storytelling e coerência visual
 */

// Interface para análise de storytelling do carrossel
export interface CarouselStorytellingAnalysis {
  narrative_flow: string; // Avaliação do fluxo narrativo entre slides
  story_arc: string; // Estrutura da história (início, meio, fim)
  engagement_progression: string; // Como o engajamento evolui entre slides
  message_consistency: string; // Consistência da mensagem ao longo dos slides
  emotional_journey: string; // Jornada emocional do espectador
  drop_off_prediction: string; // Previsão de onde usuários podem parar de deslizar
}

// Interface para análise de coerência visual entre slides
export interface CarouselVisualCoherence {
  color_consistency: string; // Consistência de cores entre slides
  typography_consistency: string; // Consistência tipográfica
  layout_consistency: string; // Consistência de layout
  brand_consistency: string; // Consistência de marca
  visual_rhythm: string; // Ritmo visual entre transições
  contrast_balance: string; // Equilíbrio de contraste entre slides
}

// Interface para análise completa do carrossel
export interface CarouselAnalysis {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  overall_score: number; // Score geral do carrossel (0-100)
  storytelling_score: number; // Score de storytelling (0-100)
  coherence_score: number; // Score de coerência visual (0-100)
  slide_count: number; // Número de slides no carrossel
  analysis_data: {
    storytelling: CarouselStorytellingAnalysis;
    visual_coherence: CarouselVisualCoherence;
    key_strengths: string[]; // Pontos fortes do carrossel
    improvement_areas: string[]; // Áreas de melhoria
    slide_order_suggestions: string[]; // Sugestões de reordenação de slides
    optimal_slide_count: string; // Análise se o número de slides é ideal
  };
  model_used: string; // Modelo de IA usado (ex: gpt-4o)
  tokens_used: number; // Tokens consumidos na análise
  analyzed_at: string; // Data/hora da análise
  created_at: string;
}

// Interface para análise individual de um slide do carrossel
export interface CarouselSlideAnalysis {
  id: string;
  carousel_analysis_id: string;
  workspace_id: string;
  slide_number: number; // Posição do slide no carrossel (1, 2, 3...)
  image_url: string | null;
  slide_score: number; // Score individual do slide (0-100)
  visual_analysis: {
    composition_score: number;
    color_usage: string;
    text_visibility: string;
    attention_grabbing: string;
    key_visual_elements: string[]; // Elementos visuais identificados
  };
  copy_analysis: {
    message_clarity: string;
    call_to_action: string;
    text_amount: string; // Quantidade de texto (ideal, pouco, muito)
    readability: string;
  };
  insights: {
    role_in_story: string; // Papel deste slide na narrativa geral
    strengths: string[]; // Pontos fortes específicos do slide
    improvements: string[]; // Melhorias sugeridas para este slide
    optimal_position: number | null; // Posição ideal sugerida (se diferente da atual)
  };
  created_at: string;
}

// Interface para payload de requisição de análise de carrossel
export interface AnalyzeCarouselPayload {
  ad_id: string;
  meta_ad_account_id: string;
  slides: Array<{
    slide_number: number;
    image_url: string;
    copy_data?: {
      title?: string;
      body?: string;
      description?: string;
    };
  }>;
  performance_context?: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    engagement_rate: number;
  };
}

// Interface para resposta de análise de carrossel
export interface AnalyzeCarouselResponse {
  carousel_analysis: CarouselAnalysis;
  slide_analyses: CarouselSlideAnalysis[];
  tokens_used: number;
  saved: boolean;
  save_error?: string;
}

// Função helper para obter label de posição do slide
export function getSlidePositionLabel(position: number, total: number): string {
  if (position === 1) return 'Primeiro Slide (Gancho)';
  if (position === total) return 'Último Slide (CTA Final)';
  if (position === Math.ceil(total / 2)) return 'Slide Central';
  return `Slide ${position} de ${total}`;
}

// Função helper para obter cor do score de storytelling
export function getStorytellingScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-green-700', bg: 'bg-green-100' };
  if (score >= 60) return { text: 'text-blue-700', bg: 'bg-blue-100' };
  if (score >= 40) return { text: 'text-yellow-700', bg: 'bg-yellow-100' };
  return { text: 'text-red-700', bg: 'bg-red-100' };
}

// Função helper para obter cor do score de coerência
export function getCoherenceScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-purple-700', bg: 'bg-purple-100' };
  if (score >= 60) return { text: 'text-indigo-700', bg: 'bg-indigo-100' };
  if (score >= 40) return { text: 'text-orange-700', bg: 'bg-orange-100' };
  return { text: 'text-red-700', bg: 'bg-red-100' };
}
