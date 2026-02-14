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
import {
  requestMetricsAnalysis,
  getLatestMetricsAnalysis,
  prepareMetricsDataForAnalysis,
  type PreloadedMetricsData,
} from '../lib/services/MetricsAIAnalysisService';

// Re-exporta o tipo para uso externo
export type { PreloadedMetricsData };
import type {
  MetaAdCreative,
  AdAIAnalysis,
  AdMetricsAggregated,
  AnalyzeAdPayload,
} from '../types/adAnalysis';
import type {
  MetricsAIAnalysis,
  AnalysisLevel,
} from '../types/metricsAnalysis';

// Interface para estado de loading/error genérico
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para gerenciar criativo de um anuncio com busca real-time.
 * Estrategia fetch-first: mostra cache como placeholder, busca da API em paralelo.
 */
export function useAdCreative(adId: string | null, metaAdAccountId: string | null) {
  const [state, setState] = useState<AsyncState<MetaAdCreative>>({
    data: null,
    loading: false,
    error: null,
  });
  const [isCached, setIsCached] = useState(false);

  // Busca criativo da API (edge function)
  const fetchCreative = useCallback(async () => {
    if (!adId || !metaAdAccountId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetchAdCreative({
        ad_id: adId,
        meta_ad_account_id: metaAdAccountId,
      });
      setState({ data: response.creative, loading: false, error: null });
      setIsCached(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar criativo';
      // Mantem dados existentes (placeholder) em caso de erro na API
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [adId, metaAdAccountId]);

  // Forca atualizacao do criativo
  const refresh = useCallback(async () => {
    if (!adId || !metaAdAccountId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await refreshAdCreative(adId, metaAdAccountId);
      setState({ data: response.creative, loading: false, error: null });
      setIsCached(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar criativo';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [adId, metaAdAccountId]);

  // Carrega do cache local (usado como placeholder)
  const loadFromCache = useCallback(async () => {
    if (!adId) return;

    const cached = await getAdCreativeFromCache(adId);
    if (cached) {
      setState(prev => ({ ...prev, data: cached }));
      setIsCached(true);
    }
  }, [adId]);

  // Effect: busca real-time com cache como placeholder
  useEffect(() => {
    if (!adId) return;

    let cancelled = false;

    setState(prev => ({ ...prev, loading: true, error: null }));

    async function loadCreative() {
      // Fase 1: carrega placeholder do cache local (instantaneo)
      const cached = await getAdCreativeFromCache(adId);

      if (cancelled) return;

      if (cached) {
        // Mostra placeholder imediatamente, mantem loading=true
        setState(prev => ({ ...prev, data: cached }));
        setIsCached(true);
      }

      // Fase 2: busca da API em tempo real (substitui placeholder)
      if (metaAdAccountId) {
        try {
          const response = await fetchAdCreative({
            ad_id: adId,
            meta_ad_account_id: metaAdAccountId,
          });
          if (cancelled) return;
          setState({ data: response.creative, loading: false, error: null });
          setIsCached(false);
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Erro ao buscar criativo';
          // Se temos placeholder do cache, mantem e so desliga loading
          setState(prev => ({ ...prev, loading: false, error: prev.data ? null : message }));
        }
      } else {
        // Sem metaAdAccountId: finaliza com o que temos do cache
        setState(prev => ({ ...prev, loading: false }));
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
 * Hook para gerenciar análise de MÉTRICAS com IA de um anúncio/campanha
 * Esta é a nova análise focada em performance de métricas, não em criativos
 * Aceita dados pre-carregados para evitar nova query ao banco
 */
export function useMetricsAIAnalysis(
  entityId: string | null,
  entityName: string | null,
  entityLevel: AnalysisLevel,
  metaAdAccountId: string | null,
  startDate: string | null,
  endDate: string | null,
  preloadedMetricsData?: PreloadedMetricsData | null
) {
  const [state, setState] = useState<AsyncState<MetricsAIAnalysis>>({
    data: null,
    loading: false,
    error: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Busca análise existente
  const fetchAnalysis = useCallback(async () => {
    if (!entityId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const analysis = await getLatestMetricsAnalysis(entityId, entityLevel);
      setState({ data: analysis, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar análise';
      setState({ data: null, loading: false, error: message });
    }
  }, [entityId, entityLevel]);

  // Solicita nova análise de métricas
  const analyzeMetrics = useCallback(async () => {
    if (!entityId || !entityName || !metaAdAccountId || !startDate || !endDate) {
      throw new Error('Dados insuficientes para análise');
    }

    setIsAnalyzing(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      // Prepara dados de métricas para análise (usa pre-carregados se disponíveis)
      const metricsData = await prepareMetricsDataForAnalysis(
        entityId,
        entityLevel,
        startDate,
        endDate,
        preloadedMetricsData || undefined
      );

      if (!metricsData) {
        throw new Error('Não foi possível obter dados de métricas para análise. Verifique se há métricas disponíveis para este período.');
      }

      // Solicita análise via Edge Function
      const response = await requestMetricsAnalysis({
        entity_id: entityId,
        entity_name: entityName,
        entity_level: entityLevel,
        meta_ad_account_id: metaAdAccountId,
        metrics_data: metricsData,
      });

      setState({ data: response.analysis, loading: false, error: null });
      setIsAnalyzing(false);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar métricas';
      setState(prev => ({ ...prev, error: message }));
      setIsAnalyzing(false);
      throw err;
    }
  }, [entityId, entityName, entityLevel, metaAdAccountId, startDate, endDate, preloadedMetricsData]);

  // Effect para buscar análise existente quando parâmetros mudam
  useEffect(() => {
    if (entityId) {
      fetchAnalysis();
    }
  }, [entityId, fetchAnalysis]);

  return {
    metricsAnalysis: state.data,
    metricsAnalysisLoading: state.loading,
    metricsAnalysisError: state.error,
    isAnalyzingMetrics: isAnalyzing,
    fetchMetricsAnalysis: fetchAnalysis,
    analyzeMetrics,
    hasMetricsAnalysis: state.data !== null,
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
 * Inclui análise de métricas com IA (foco em performance, não criativos)
 */
export function useAdDetailData(
  adId: string | null,
  adName: string | null,
  metaAdAccountId: string | null,
  startDate: string | null,
  endDate: string | null,
  preloadedMetrics?: PreloadedMetricsData | null
) {
  const creative = useAdCreative(adId, metaAdAccountId);
  const analysis = useAdAIAnalysis(adId);
  const metrics = useAdMetrics(adId, startDate, endDate);

  // Análise de métricas com IA (nova funcionalidade)
  // Passa dados pre-carregados para evitar nova query ao banco
  const metricsAI = useMetricsAIAnalysis(
    adId,
    adName,
    'ad',
    metaAdAccountId,
    startDate,
    endDate,
    preloadedMetrics
  );

  // Loading geral (qualquer um carregando)
  const isLoading = creative.loading || analysis.loading || metrics.loading || metricsAI.metricsAnalysisLoading;

  // Erros combinados
  const errors = [
    creative.error,
    analysis.error,
    metrics.error,
    metricsAI.metricsAnalysisError
  ].filter(Boolean);

  // Refresh de todos os dados
  const refreshAll = useCallback(async () => {
    await Promise.all([
      creative.refresh(),
      analysis.fetchAnalysis(),
      metrics.fetchMetrics(),
      metricsAI.fetchMetricsAnalysis(),
    ]);
  }, [creative, analysis, metrics, metricsAI]);

  return {
    // Dados do criativo
    creative: creative.creative,
    creativeLoading: creative.loading,
    creativeError: creative.error,
    creativeCached: creative.isCached,
    refreshCreative: creative.refresh,

    // Análise de criativo (antiga - mantida para compatibilidade)
    analysis: analysis.analysis,
    analysisLoading: analysis.loading,
    analysisError: analysis.error,
    isAnalyzing: analysis.isAnalyzing,
    analyzeAd: analysis.analyze,
    hasAnalysis: analysis.hasAnalysis,

    // Métricas brutas
    metrics: metrics.metrics,
    metricsLoading: metrics.loading,
    metricsError: metrics.error,
    refreshMetrics: metrics.fetchMetrics,

    // Análise de MÉTRICAS com IA (nova - foco em performance)
    metricsAnalysis: metricsAI.metricsAnalysis,
    metricsAnalysisLoading: metricsAI.metricsAnalysisLoading,
    metricsAnalysisError: metricsAI.metricsAnalysisError,
    isAnalyzingMetrics: metricsAI.isAnalyzingMetrics,
    analyzeMetrics: metricsAI.analyzeMetrics,
    hasMetricsAnalysis: metricsAI.hasMetricsAnalysis,
    fetchMetricsAnalysis: metricsAI.fetchMetricsAnalysis,

    // Estados gerais
    isLoading,
    errors,
    refreshAll,
  };
}
