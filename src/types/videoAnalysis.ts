/**
 * Tipos TypeScript para análise de vídeos de anúncios
 *
 * Define interfaces para análise de vídeos incluindo:
 * - Análise do gancho (primeiros 3 segundos)
 * - Análise de retenção e ritmo
 * - Análise de frames-chave
 */

// Interface para análise do gancho do vídeo (primeiros 3 segundos)
export interface VideoHookAnalysis {
  hook_score: number; // Score do gancho (0-100)
  attention_capture: string; // Capacidade de capturar atenção
  first_frame_impact: string; // Impacto do primeiro frame
  opening_message: string; // Mensagem dos primeiros 3 segundos
  visual_elements: string[]; // Elementos visuais no gancho
  audio_elements: string; // Elementos de áudio (música, voz, efeitos)
  scroll_stop_potential: string; // Potencial de parar o scroll
}

// Interface para análise de retenção do vídeo
export interface VideoRetentionAnalysis {
  retention_score: number; // Score de retenção (0-100)
  pacing_analysis: string; // Análise do ritmo do vídeo
  scene_changes: number; // Número de mudanças de cena
  visual_variety: string; // Variedade visual ao longo do vídeo
  engagement_peaks: number[]; // Timestamps de picos de engajamento (em segundos)
  potential_drop_points: number[]; // Timestamps onde viewers podem sair
  optimal_duration: string; // Análise se a duração é ideal
}

// Interface para análise de CTA no vídeo
export interface VideoCTAAnalysis {
  cta_score: number; // Score do CTA (0-100)
  cta_timing: string; // Análise do timing do CTA
  cta_visibility: string; // Visibilidade do CTA
  cta_clarity: string; // Clareza da ação solicitada
  cta_urgency: string; // Senso de urgência
  closing_strength: string; // Força do fechamento do vídeo
}

// Interface para análise de elementos textuais sobrepostos
export interface VideoTextOverlayAnalysis {
  text_presence: boolean; // Se há texto sobreposto
  text_readability: string; // Legibilidade do texto
  text_timing: string; // Timing de aparição do texto
  text_relevance: string; // Relevância do texto para a mensagem
  captions_present: boolean; // Se há legendas
}

// Interface para análise completa de vídeo
export interface VideoAnalysis {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  overall_score: number; // Score geral do vídeo (0-100)
  hook_score: number; // Score do gancho (0-100)
  retention_score: number; // Score de retenção (0-100)
  cta_score: number; // Score do CTA (0-100)
  video_duration_seconds: number; // Duração do vídeo em segundos
  analysis_data: {
    hook_analysis: VideoHookAnalysis;
    retention_analysis: VideoRetentionAnalysis;
    cta_analysis: VideoCTAAnalysis;
    text_overlay_analysis: VideoTextOverlayAnalysis;
    key_strengths: string[]; // Pontos fortes do vídeo
    improvement_areas: string[]; // Áreas de melhoria
    editing_suggestions: string[]; // Sugestões de edição
    sound_analysis: string; // Análise de áudio/música
    mobile_optimization: string; // Otimização para mobile
  };
  model_used: string; // Modelo de IA usado
  tokens_used: number;
  analyzed_at: string;
  created_at: string;
}

// Interface para análise de um frame específico do vídeo
export interface VideoFrameAnalysis {
  id: string;
  video_analysis_id: string;
  workspace_id: string;
  timestamp_seconds: number; // Timestamp do frame (em segundos)
  frame_url: string | null; // URL do frame extraído
  frame_score: number; // Score visual do frame (0-100)
  insights: {
    visual_description: string; // Descrição do que aparece no frame
    key_elements: string[]; // Elementos-chave visíveis
    text_content: string | null; // Texto visível no frame (se houver)
    emotional_tone: string; // Tom emocional do frame
    attention_level: string; // Nível de atenção que o frame gera
    role_in_video: string; // Papel deste frame no vídeo (gancho, meio, CTA)
  };
  created_at: string;
}

// Interface para payload de requisição de análise de vídeo
export interface AnalyzeVideoPayload {
  ad_id: string;
  meta_ad_account_id: string;
  video_url: string;
  video_duration_seconds: number;
  frame_timestamps: number[]; // Timestamps para extrair frames (ex: [0, 3, 15, 30])
  copy_data?: {
    title?: string;
    body?: string;
    description?: string;
    cta?: string;
  };
  performance_context?: {
    total_impressions: number;
    video_plays: number;
    video_views_3s: number; // Views de 3+ segundos
    video_views_15s: number; // Views de 15+ segundos
    video_completion_rate: number;
    ctr: number;
  };
}

// Interface para resposta de análise de vídeo
export interface AnalyzeVideoResponse {
  video_analysis: VideoAnalysis;
  frame_analyses: VideoFrameAnalysis[];
  tokens_used: number;
  saved: boolean;
  save_error?: string;
}

// Função helper para obter label de timestamp
export function getTimestampLabel(seconds: number): string {
  if (seconds === 0) return 'Início (Frame 1)';
  if (seconds <= 3) return `Gancho (${seconds}s)`;
  if (seconds <= 15) return `Desenvolvimento (${seconds}s)`;
  return `${seconds}s`;
}

// Função helper para formatar duração de vídeo
export function formatVideoDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Função helper para obter cor do score de gancho
export function getHookScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-green-700', bg: 'bg-green-100' };
  if (score >= 60) return { text: 'text-blue-700', bg: 'bg-blue-100' };
  if (score >= 40) return { text: 'text-yellow-700', bg: 'bg-yellow-100' };
  return { text: 'text-red-700', bg: 'bg-red-100' };
}

// Função helper para obter cor do score de retenção
export function getRetentionScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-purple-700', bg: 'bg-purple-100' };
  if (score >= 60) return { text: 'text-indigo-700', bg: 'bg-indigo-100' };
  if (score >= 40) return { text: 'text-orange-700', bg: 'bg-orange-100' };
  return { text: 'text-red-700', bg: 'bg-red-100' };
}

// Função helper para determinar papel do frame baseado no timestamp
export function getFrameRole(timestamp: number, duration: number): string {
  if (timestamp === 0) return 'opening';
  if (timestamp <= 3) return 'hook';
  if (timestamp >= duration - 5) return 'cta';
  if (timestamp >= duration / 2) return 'development';
  return 'middle';
}
