/**
 * CarouselAnalysisService
 *
 * Serviço para gerenciar análises de criativos de carrossel.
 * Integra com Edge Functions do Supabase para análise com IA.
 */

import { supabase } from '../supabase';
import type {
  CarouselAnalysis,
  CarouselSlideAnalysis,
  AnalyzeCarouselPayload,
  AnalyzeCarouselResponse,
} from '../../types/carouselAnalysis';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

/**
 * Solicita análise de carrossel para a IA
 * Envia múltiplas imagens e analisa storytelling e coerência
 */
export async function requestCarouselAnalysis(
  payload: AnalyzeCarouselPayload
): Promise<AnalyzeCarouselResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${FUNCTIONS_URL}/meta-analyze-carousel-ai`, {
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
    throw new Error(error.error || 'Erro ao analisar carrossel');
  }

  return response.json();
}

/**
 * Busca análise de carrossel mais recente para um anúncio
 */
export async function getLatestCarouselAnalysis(
  adId: string
): Promise<CarouselAnalysis | null> {
  const { data, error } = await supabase
    .from('carousel_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise de carrossel:', error);
    return null;
  }

  return data;
}

/**
 * Busca todas as análises de slides de um carrossel
 */
export async function getCarouselSlideAnalyses(
  carouselAnalysisId: string
): Promise<CarouselSlideAnalysis[]> {
  const { data, error } = await supabase
    .from('carousel_slide_analyses')
    .select('*')
    .eq('carousel_analysis_id', carouselAnalysisId)
    .order('slide_number', { ascending: true });

  if (error) {
    console.error('Erro ao buscar análises de slides:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca análise completa de carrossel (análise geral + slides)
 */
export async function getCompleteCarouselAnalysis(
  adId: string
): Promise<{ analysis: CarouselAnalysis | null; slides: CarouselSlideAnalysis[] }> {
  const analysis = await getLatestCarouselAnalysis(adId);

  if (!analysis) {
    return { analysis: null, slides: [] };
  }

  const slides = await getCarouselSlideAnalyses(analysis.id);

  return { analysis, slides };
}

/**
 * Busca histórico de análises de carrossel de um anúncio
 */
export async function getCarouselAnalysisHistory(
  adId: string,
  limit = 10
): Promise<CarouselAnalysis[]> {
  const { data, error } = await supabase
    .from('carousel_analyses')
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
 * Deleta uma análise de carrossel
 * (Cascata: deleta também os slides associados)
 */
export async function deleteCarouselAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('carousel_analyses')
    .delete()
    .eq('id', analysisId);

  if (error) {
    console.error('Erro ao deletar análise de carrossel:', error);
    return false;
  }

  return true;
}

/**
 * Verifica se um anúncio já possui análise de carrossel
 */
export async function hasCarouselAnalysis(adId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('carousel_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('ad_id', adId);

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Calcula score médio dos slides de um carrossel
 */
export function calculateAverageSlideScore(slides: CarouselSlideAnalysis[]): number {
  if (slides.length === 0) return 0;

  const sum = slides.reduce((acc, slide) => acc + slide.slide_score, 0);
  return Math.round(sum / slides.length);
}

/**
 * Identifica slide com melhor performance
 */
export function getBestSlide(slides: CarouselSlideAnalysis[]): CarouselSlideAnalysis | null {
  if (slides.length === 0) return null;

  return slides.reduce((best, current) =>
    current.slide_score > best.slide_score ? current : best
  );
}

/**
 * Identifica slide com pior performance
 */
export function getWorstSlide(slides: CarouselSlideAnalysis[]): CarouselSlideAnalysis | null {
  if (slides.length === 0) return null;

  return slides.reduce((worst, current) =>
    current.slide_score < worst.slide_score ? current : worst
  );
}
