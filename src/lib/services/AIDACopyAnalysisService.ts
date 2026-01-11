/**
 * AIDACopyAnalysisService
 *
 * Serviço para gerenciar análises de copy usando framework AIDA.
 * Integra com Edge Functions do Supabase para análise com IA.
 */

import { supabase } from '../supabase';
import type {
  AIDACopyAnalysis,
  AnalyzeAIDAPayload,
  AnalyzeAIDAResponse,
} from '../../types/aidaAnalysis';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

/**
 * Solicita análise de copy usando framework AIDA
 */
export async function requestAIDAAnalysis(
  payload: AnalyzeAIDAPayload
): Promise<AnalyzeAIDAResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${FUNCTIONS_URL}/meta-analyze-copy-aida`, {
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
    throw new Error(error.error || 'Erro ao analisar copy com AIDA');
  }

  return response.json();
}

/**
 * Busca análise AIDA mais recente para um anúncio
 */
export async function getLatestAIDAAnalysis(
  adId: string
): Promise<AIDACopyAnalysis | null> {
  const { data, error } = await supabase
    .from('aida_copy_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise AIDA:', error);
    return null;
  }

  return data;
}

/**
 * Busca histórico de análises AIDA de um anúncio
 */
export async function getAIDAAnalysisHistory(
  adId: string,
  limit = 10
): Promise<AIDACopyAnalysis[]> {
  const { data, error } = await supabase
    .from('aida_copy_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar histórico de análises AIDA:', error);
    return [];
  }

  return data || [];
}

/**
 * Deleta uma análise AIDA
 */
export async function deleteAIDAAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('aida_copy_analyses')
    .delete()
    .eq('id', analysisId);

  if (error) {
    console.error('Erro ao deletar análise AIDA:', error);
    return false;
  }

  return true;
}

/**
 * Verifica se um anúncio já possui análise AIDA
 */
export async function hasAIDAAnalysis(adId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('aida_copy_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('ad_id', adId);

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Identifica a etapa AIDA com melhor performance
 */
export function getBestAIDAStage(analysis: AIDACopyAnalysis): {
  stage: 'attention' | 'interest' | 'desire' | 'action';
  score: number;
} {
  const stages = [
    { stage: 'attention' as const, score: analysis.attention_score },
    { stage: 'interest' as const, score: analysis.interest_score },
    { stage: 'desire' as const, score: analysis.desire_score },
    { stage: 'action' as const, score: analysis.action_score },
  ];

  return stages.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

/**
 * Identifica a etapa AIDA com pior performance
 */
export function getWorstAIDAStage(analysis: AIDACopyAnalysis): {
  stage: 'attention' | 'interest' | 'desire' | 'action';
  score: number;
} {
  const stages = [
    { stage: 'attention' as const, score: analysis.attention_score },
    { stage: 'interest' as const, score: analysis.interest_score },
    { stage: 'desire' as const, score: analysis.desire_score },
    { stage: 'action' as const, score: analysis.action_score },
  ];

  return stages.reduce((worst, current) =>
    current.score < worst.score ? current : worst
  );
}

/**
 * Analisa equilíbrio entre as etapas AIDA
 */
export function analyzeAIDABalance(analysis: AIDACopyAnalysis): {
  balanced: boolean;
  description: string;
  maxVariation: number;
} {
  const scores = [
    analysis.attention_score,
    analysis.interest_score,
    analysis.desire_score,
    analysis.action_score,
  ];

  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const maxVariation = Math.max(...scores.map(score => Math.abs(score - avg)));

  if (maxVariation <= 10) {
    return {
      balanced: true,
      description: 'Copy bem equilibrada em todas as etapas AIDA',
      maxVariation,
    };
  } else if (maxVariation <= 20) {
    return {
      balanced: false,
      description: 'Pequeno desequilíbrio entre etapas AIDA - ajustes menores recomendados',
      maxVariation,
    };
  } else {
    return {
      balanced: false,
      description: 'Desequilíbrio significativo entre etapas AIDA - revisar estratégia',
      maxVariation,
    };
  }
}

/**
 * Compara duas análises AIDA para mostrar evolução
 */
export function compareAIDAAnalyses(
  older: AIDACopyAnalysis,
  newer: AIDACopyAnalysis
): {
  overall_improvement: number;
  stage_improvements: {
    attention: number;
    interest: number;
    desire: number;
    action: number;
  };
  improved_stages: string[];
  declined_stages: string[];
} {
  const stage_improvements = {
    attention: newer.attention_score - older.attention_score,
    interest: newer.interest_score - older.interest_score,
    desire: newer.desire_score - older.desire_score,
    action: newer.action_score - older.action_score,
  };

  const improved_stages = Object.entries(stage_improvements)
    .filter(([_, improvement]) => improvement > 0)
    .map(([stage]) => stage);

  const declined_stages = Object.entries(stage_improvements)
    .filter(([_, improvement]) => improvement < 0)
    .map(([stage]) => stage);

  return {
    overall_improvement: newer.overall_score - older.overall_score,
    stage_improvements,
    improved_stages,
    declined_stages,
  };
}
