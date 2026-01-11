/**
 * VideoAnalysisService
 *
 * Serviço para gerenciar análises de criativos de vídeo.
 * Integra com Edge Functions do Supabase para análise com IA de frames.
 */

import { supabase } from '../supabase';
import type {
  VideoAnalysis,
  VideoFrameAnalysis,
  AnalyzeVideoPayload,
  AnalyzeVideoResponse,
} from '../../types/videoAnalysis';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

/**
 * Solicita análise de vídeo para a IA
 * Analisa frames-chave e fornece insights temporais
 */
export async function requestVideoAnalysis(
  payload: AnalyzeVideoPayload
): Promise<AnalyzeVideoResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${FUNCTIONS_URL}/meta-analyze-video-ai`, {
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
    throw new Error(error.error || 'Erro ao analisar vídeo');
  }

  return response.json();
}

/**
 * Busca análise de vídeo mais recente para um anúncio
 */
export async function getLatestVideoAnalysis(
  adId: string
): Promise<VideoAnalysis | null> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise de vídeo:', error);
    return null;
  }

  return data;
}

/**
 * Busca todas as análises de frames de um vídeo
 */
export async function getVideoFrameAnalyses(
  videoAnalysisId: string
): Promise<VideoFrameAnalysis[]> {
  const { data, error } = await supabase
    .from('video_frame_analyses')
    .select('*')
    .eq('video_analysis_id', videoAnalysisId)
    .order('timestamp_seconds', { ascending: true });

  if (error) {
    console.error('Erro ao buscar análises de frames:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca análise completa de vídeo (análise geral + frames)
 */
export async function getCompleteVideoAnalysis(
  adId: string
): Promise<{ analysis: VideoAnalysis | null; frames: VideoFrameAnalysis[] }> {
  const analysis = await getLatestVideoAnalysis(adId);

  if (!analysis) {
    return { analysis: null, frames: [] };
  }

  const frames = await getVideoFrameAnalyses(analysis.id);

  return { analysis, frames };
}

/**
 * Busca histórico de análises de vídeo de um anúncio
 */
export async function getVideoAnalysisHistory(
  adId: string,
  limit = 10
): Promise<VideoAnalysis[]> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar histórico de análises:', error);
    return [];
  }

  return data || [];
}

/**
 * Deleta uma análise de vídeo
 * (Cascata: deleta também os frames associados)
 */
export async function deleteVideoAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('video_analyses')
    .delete()
    .eq('id', analysisId);

  if (error) {
    console.error('Erro ao deletar análise de vídeo:', error);
    return false;
  }

  return true;
}

/**
 * Verifica se um anúncio já possui análise de vídeo
 */
export async function hasVideoAnalysis(adId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('video_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('ad_id', adId);

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Busca frame específico por timestamp
 */
export async function getFrameByTimestamp(
  videoAnalysisId: string,
  timestampSeconds: number
): Promise<VideoFrameAnalysis | null> {
  const { data, error } = await supabase
    .from('video_frame_analyses')
    .select('*')
    .eq('video_analysis_id', videoAnalysisId)
    .eq('timestamp_seconds', timestampSeconds)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar frame:', error);
    return null;
  }

  return data;
}

/**
 * Identifica frame com melhor score (mais impactante)
 */
export function getBestFrame(frames: VideoFrameAnalysis[]): VideoFrameAnalysis | null {
  if (frames.length === 0) return null;

  return frames.reduce((best, current) =>
    current.frame_score > best.frame_score ? current : best
  );
}

/**
 * Identifica frame com pior score
 */
export function getWorstFrame(frames: VideoFrameAnalysis[]): VideoFrameAnalysis | null {
  if (frames.length === 0) return null;

  return frames.reduce((worst, current) =>
    current.frame_score < worst.frame_score ? current : worst
  );
}

/**
 * Calcula score médio dos frames de um vídeo
 */
export function calculateAverageFrameScore(frames: VideoFrameAnalysis[]): number {
  if (frames.length === 0) return 0;

  const sum = frames.reduce((acc, frame) => acc + frame.frame_score, 0);
  return Math.round(sum / frames.length);
}

/**
 * Analisa progressão de qualidade ao longo do vídeo
 */
export function analyzeQualityProgression(frames: VideoFrameAnalysis[]): {
  trend: 'improving' | 'declining' | 'stable';
  description: string;
} {
  if (frames.length < 2) {
    return { trend: 'stable', description: 'Dados insuficientes para análise de progressão' };
  }

  const firstHalf = frames.slice(0, Math.floor(frames.length / 2));
  const secondHalf = frames.slice(Math.floor(frames.length / 2));

  const firstHalfAvg = calculateAverageFrameScore(firstHalf);
  const secondHalfAvg = calculateAverageFrameScore(secondHalf);

  const difference = secondHalfAvg - firstHalfAvg;

  if (difference > 5) {
    return {
      trend: 'improving',
      description: `Qualidade melhora ao longo do vídeo (+${difference.toFixed(0)} pontos)`,
    };
  } else if (difference < -5) {
    return {
      trend: 'declining',
      description: `Qualidade diminui ao longo do vídeo (${difference.toFixed(0)} pontos)`,
    };
  } else {
    return {
      trend: 'stable',
      description: 'Qualidade consistente ao longo do vídeo',
    };
  }
}
