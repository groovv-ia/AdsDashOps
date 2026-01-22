import { useState, useEffect } from 'react';
import {
  analyzeCreativeWithClaude,
  getCreativeAnalysis,
  deleteCreativeAnalysis,
  type ClaudeCreativeAnalysis as ClaudeAnalysisType
} from '../lib/services/ClaudeAnalysisService';

/**
 * Re-exporta o tipo ClaudeCreativeAnalysis do serviço
 */
export type ClaudeCreativeAnalysis = ClaudeAnalysisType;

/**
 * Interface para recomendações individuais
 */
export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'visual' | 'copy' | 'cta' | 'targeting' | 'testing' | 'general';
  title: string;
  description: string;
  expected_impact?: string;
}

/**
 * Hook para gerenciar análise de criativos com Claude AI
 *
 * @param creativeId - ID do criativo a ser analisado
 * @returns Estado e funções para gerenciar análise
 */
export function useCreativeAnalysis(creativeId: string | null) {
  const [analysis, setAnalysis] = useState<ClaudeCreativeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega análise existente do banco de dados
   */
  useEffect(() => {
    if (!creativeId) {
      setAnalysis(null);
      return;
    }

    const loadAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const existingAnalysis = await getCreativeAnalysis(creativeId);
        setAnalysis(existingAnalysis);
      } catch (err) {
        console.error('Error loading analysis:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [creativeId]);

  /**
   * Executa uma nova análise do criativo
   * Verifica se já existe uma análise antes de criar uma nova
   *
   * @param force - Se true, força nova análise mesmo que já exista uma
   */
  const analyze = async (force: boolean = false): Promise<ClaudeCreativeAnalysis | null> => {
    if (!creativeId) {
      setError('ID do criativo não fornecido');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Verifica se já existe análise (a menos que force seja true)
      if (!force && analysis) {
        return analysis;
      }

      // Executa nova análise
      const newAnalysis = await analyzeCreativeWithClaude(creativeId);
      setAnalysis(newAnalysis);

      return newAnalysis;
    } catch (err) {
      console.error('Error analyzing creative:', err);
      setError(err instanceof Error ? err.message : 'Erro ao analisar criativo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Re-analisa o criativo (força nova análise)
   */
  const reanalyze = async (): Promise<ClaudeCreativeAnalysis | null> => {
    return analyze(true);
  };

  /**
   * Deleta a análise existente
   */
  const deleteAnalysis = async (): Promise<boolean> => {
    if (!analysis) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      await deleteCreativeAnalysis(analysis.creative_id);
      setAnalysis(null);

      return true;
    } catch (err) {
      console.error('Error deleting analysis:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar análise');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    analysis,
    loading,
    error,
    analyze,
    reanalyze,
    deleteAnalysis,
    hasAnalysis: !!analysis,
  };
}
