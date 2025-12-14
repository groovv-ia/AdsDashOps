/**
 * Hooks customizados para gerenciamento de detalhes de anúncios
 *
 * Fornece hooks React para buscar criativos, métricas e análises de IA
 * de anúncios do Meta Ads com gerenciamento de estados.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  fetchAdCreative,
  getAdCreativeFromCache,
  requestAIAnalysis,
  getLatestAIAnalysis,
  getAdAggregatedMetrics,
  refreshAdCreative,
} from '../lib/services/AdCreativeService';
import type {
  MetaAdCreative,
  AdAIAnalysis,
  AdMetricsAggregated,
  AnalyzeAdPayload,
} from '../types/adAnalysis';

// Interface para estado de loading/error genérico
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para gerenciar criativo de um anúncio
 */
export function useAdCreative(adId: string | null, metaAdAccountId: string | null) {
  const [state, setState] = useState<AsyncState<MetaAdCreative>>({
    data: null,
    loading: false,
    error: null,
  });
  const [isCached, setIsCached] = useState(false);

  // Busca criativo ao montar ou quando IDs mudam
  // O metaAdAccountId é opcional - se não fornecido, a Edge Function tentará descobrir
  const fetchCreative = useCallback(async () => {
    if (!adId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetchAdCreative({
        ad_id: adId,
        meta_ad_account_id: metaAdAccountId || undefined,
      });
      setState({ data: response.creative, loading: false, error: null });
      setIsCached(response.cached);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar criativo';
      setState({ data: null, loading: false, error: message });
    }
  }, [adId, metaAdAccountId]);

  // Força atualização do criativo
  // O metaAdAccountId é opcional
  const refresh = useCallback(async () => {
    if (!adId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await refreshAdCreative(adId, metaAdAccountId || '');
      setState({ data: response.creative, loading: false, error: null });
      setIsCached(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar criativo';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [adId, metaAdAccountId]);

  // Carrega do cache local primeiro
  const loadFromCache = useCallback(async () => {
    if (!adId) return;

    const cached = await getAdCreativeFromCache(adId);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      setIsCached(true);
    }
  }, [adId]);

  // Effect para buscar criativo quando IDs mudam
  // Primeiro tenta carregar do cache, depois busca se não encontrar
  // O metaAdAccountId é opcional - a Edge Function tentará descobrir se não fornecido
  useEffect(() => {
    if (!adId) return;

    let cancelled = false;

    async function loadCreative() {
      // Tenta carregar do cache local primeiro
      const cached = await getAdCreativeFromCache(adId);

      if (cancelled) return;

      if (cached) {
        setState({ data: cached, loading: false, error: null });
        setIsCached(true);
      } else {
        // Se não encontrou no cache, busca da API
        // Mesmo sem metaAdAccountId, a Edge Function tentará descobrir
        fetchCreative();
      }
    }

    loadCreative();

    return () => {
      cancelled = true;
    };
  }, [adId, metaAdAccountId]);

  return {
    creative: state.data,
    loading: state.loading,
    error: state.error,
    isCached,
    fetchCreative,
    refresh,
    loadFromCache,
  };
}

/**
 * Hook para gerenciar análise de IA de um anúncio
 */
export function useAdAIAnalysis(adId: string | null) {
  const [state, setState] = useState<AsyncState<AdAIAnalysis>>({
    data: null,
    loading: false,
    error: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Busca análise existente
  const fetchAnalysis = useCallback(async () => {
    if (!adId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const analysis = await getLatestAIAnalysis(adId);
      setState({ data: analysis, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar análise';
      setState({ data: null, loading: false, error: message });
    }
  }, [adId]);

  // Solicita nova análise
  const analyze = useCallback(async (payload: Omit<AnalyzeAdPayload, 'ad_id'>) => {
    if (!adId) return null;

    setIsAnalyzing(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await requestAIAnalysis({
        ad_id: adId,
        ...payload,
      });
      setState({ data: response.analysis, loading: false, error: null });
      setIsAnalyzing(false);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar anúncio';
      setState(prev => ({ ...prev, error: message }));
      setIsAnalyzing(false);
      throw err;
    }
  }, [adId]);

  // Effect para buscar análise quando ID muda
  useEffect(() => {
    if (adId) {
      fetchAnalysis();
    }
  }, [adId, fetchAnalysis]);

  return {
    analysis: state.data,
    loading: state.loading,
    error: state.error,
    isAnalyzing,
    fetchAnalysis,
    analyze,
    hasAnalysis: state.data !== null,
  };
}

/**
 * Hook para gerenciar métricas de um anúncio
 */
export function useAdMetrics(
  adId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const [state, setState] = useState<AsyncState<AdMetricsAggregated>>({
    data: null,
    loading: false,
    error: null,
  });

  // Busca métricas
  const fetchMetrics = useCallback(async () => {
    if (!adId || !startDate || !endDate) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const metrics = await getAdAggregatedMetrics(adId, startDate, endDate);
      setState({ data: metrics, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar métricas';
      setState({ data: null, loading: false, error: message });
    }
  }, [adId, startDate, endDate]);

  // Effect para buscar métricas quando parâmetros mudam
  useEffect(() => {
    if (adId && startDate && endDate) {
      fetchMetrics();
    }
  }, [adId, startDate, endDate, fetchMetrics]);

  return {
    metrics: state.data,
    loading: state.loading,
    error: state.error,
    fetchMetrics,
  };
}

/**
 * Hook combinado para todos os dados do detalhe do anúncio
 */
export function useAdDetailData(
  adId: string | null,
  metaAdAccountId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const creative = useAdCreative(adId, metaAdAccountId);
  const analysis = useAdAIAnalysis(adId);
  const metrics = useAdMetrics(adId, startDate, endDate);

  // Loading geral (qualquer um carregando)
  const isLoading = creative.loading || analysis.loading || metrics.loading;

  // Erros combinados
  const errors = [creative.error, analysis.error, metrics.error].filter(Boolean);

  // Refresh de todos os dados
  const refreshAll = useCallback(async () => {
    await Promise.all([
      creative.refresh(),
      analysis.fetchAnalysis(),
      metrics.fetchMetrics(),
    ]);
  }, [creative, analysis, metrics]);

  return {
    creative: creative.creative,
    creativeLoading: creative.loading,
    creativeError: creative.error,
    creativeCached: creative.isCached,
    refreshCreative: creative.refresh,

    analysis: analysis.analysis,
    analysisLoading: analysis.loading,
    analysisError: analysis.error,
    isAnalyzing: analysis.isAnalyzing,
    analyzeAd: analysis.analyze,
    hasAnalysis: analysis.hasAnalysis,

    metrics: metrics.metrics,
    metricsLoading: metrics.loading,
    metricsError: metrics.error,
    refreshMetrics: metrics.fetchMetrics,

    isLoading,
    errors,
    refreshAll,
  };
}
