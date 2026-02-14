/**
 * Hook useAdCreativesBatch
 *
 * Gerencia busca em lote de criativos de anuncios com estrategia de 2 fases:
 * Fase 1 (instantanea): carrega placeholders do banco local (Supabase)
 * Fase 2 (real-time): busca dados HD da API via Edge Function e substitui
 *
 * Fornece indicador de carregamento individual por ad_id enquanto
 * a busca real-time esta em andamento.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  prefetchCreativesForAds,
  getCreativesFromCacheBatch,
} from '../lib/services/AdCreativeService';
import type { MetaAdCreative } from '../types/adAnalysis';

// Interface para status de loading individual
interface LoadingState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// Interface do estado do hook
interface UseAdCreativesBatchState {
  creatives: Record<string, MetaAdCreative>;
  loadingStates: Record<string, LoadingState>;
  globalLoading: boolean;
  globalError: string | null;
  fetchedCount: number;
  cachedCount: number;
}

// Interface do retorno do hook
interface UseAdCreativesBatchReturn extends UseAdCreativesBatchState {
  getCreative: (adId: string) => MetaAdCreative | null;
  getLoadingState: (adId: string) => LoadingState;
  refetch: () => Promise<void>;
  hasCreative: (adId: string) => boolean;
}

/**
 * Hook para gerenciamento de criativos em lote com busca em tempo real.
 * Fase 1: carrega placeholders do cache local imediatamente.
 * Fase 2: busca dados atualizados da API em paralelo e substitui.
 */
export function useAdCreativesBatch(
  ads: Array<{ entity_id: string; meta_ad_account_id: string }> | undefined,
  autoFetch = true
): UseAdCreativesBatchReturn {
  // Estado principal
  const [state, setState] = useState<UseAdCreativesBatchState>({
    creatives: {},
    loadingStates: {},
    globalLoading: false,
    globalError: null,
    fetchedCount: 0,
    cachedCount: 0,
  });

  // Ref para evitar double-fetch em StrictMode
  const fetchingRef = useRef(false);
  const lastAdsRef = useRef<string>('');

  // Proteção contra undefined: garante que ads sempre seja um array válido
  const safeAds = Array.isArray(ads) ? ads : [];

  // Extrai IDs unicos e meta_ad_account_id com proteção contra undefined
  const adIds = safeAds
    .filter(ad => ad && typeof ad === 'object' && ad.entity_id)
    .map(ad => ad.entity_id);
  const metaAdAccountId = safeAds.length > 0 && safeAds[0]?.meta_ad_account_id
    ? safeAds[0].meta_ad_account_id
    : '';
  const adsKey = adIds.sort().join(',');

  /**
   * Busca criativos em 2 fases:
   * Fase 1: carrega placeholders do cache local (instantaneo)
   * Fase 2: busca dados atualizados da API e substitui os placeholders
   */
  const fetchCreatives = useCallback(async () => {
    // Recalcula adIds dentro do callback para garantir que sempre está atualizado
    const currentAdIds = safeAds
      .filter(ad => ad && typeof ad === 'object' && ad.entity_id)
      .map(ad => ad.entity_id);

    if (currentAdIds.length === 0) {
      setState(prev => ({
        ...prev,
        globalLoading: false,
        globalError: null,
      }));
      return;
    }

    // Evita busca duplicada
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    // Define loading para todos os ads (indicador de carregamento visivel)
    const initialLoadingStates: Record<string, LoadingState> = {};
    for (const adId of currentAdIds) {
      initialLoadingStates[adId] = { isLoading: true, hasError: false };
    }

    setState(prev => ({
      ...prev,
      loadingStates: { ...prev.loadingStates, ...initialLoadingStates },
      globalLoading: true,
      globalError: null,
    }));

    // ========== FASE 1: Carrega placeholders do cache local ==========
    try {
      const cached = await getCreativesFromCacheBatch(currentAdIds);

      if (Object.keys(cached).length > 0) {
        // Mostra placeholders imediatamente, mas mantem isLoading=true
        // para que o indicador de carregamento continue visivel
        setState(prev => ({
          ...prev,
          creatives: { ...prev.creatives, ...cached },
          cachedCount: Object.keys(cached).length,
        }));
      }
    } catch (cacheError) {
      console.error('[useAdCreativesBatch] Erro ao carregar cache (fase 1):', cacheError);
      // Continua para fase 2 mesmo se cache falhar
    }

    // ========== FASE 2: Busca dados atualizados da API ==========
    // Sem metaAdAccountId: nao consegue chamar a edge function, finaliza com cache
    if (!metaAdAccountId) {
      const finalStates: Record<string, LoadingState> = {};
      for (const adId of currentAdIds) {
        finalStates[adId] = { isLoading: false, hasError: false };
      }

      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, ...finalStates },
        globalLoading: false,
      }));
      fetchingRef.current = false;
      return;
    }

    try {
      // Envia TODOS os IDs para a API (o servidor decide cache vs fetch)
      const result = await prefetchCreativesForAds(currentAdIds, metaAdAccountId);

      // Atualiza estados de loading individuais
      const newLoadingStates: Record<string, LoadingState> = {};
      for (const adId of currentAdIds) {
        if (result.errors[adId]) {
          newLoadingStates[adId] = {
            isLoading: false,
            hasError: true,
            errorMessage: result.errors[adId],
          };
        } else {
          newLoadingStates[adId] = {
            isLoading: false,
            hasError: false,
          };
        }
      }

      // Substitui placeholders pelos dados reais da API
      setState(prev => ({
        creatives: { ...prev.creatives, ...result.creatives },
        loadingStates: { ...prev.loadingStates, ...newLoadingStates },
        globalLoading: false,
        globalError: result.errors._batch || null,
        fetchedCount: Object.keys(result.creatives).length,
        cachedCount: prev.cachedCount,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[useAdCreativesBatch] Erro na busca real-time (fase 2):', error);

      // Marca todos como finalizados (mantem placeholders do cache se existirem)
      const errorLoadingStates: Record<string, LoadingState> = {};
      for (const adId of currentAdIds) {
        errorLoadingStates[adId] = {
          isLoading: false,
          hasError: true,
          errorMessage,
        };
      }

      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, ...errorLoadingStates },
        globalLoading: false,
        globalError: errorMessage,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [adsKey, metaAdAccountId, safeAds]);

  // Carrega automaticamente quando ads mudam
  useEffect(() => {
    if (!autoFetch) return;
    if (adsKey === lastAdsRef.current) return;
    if (!adsKey || adsKey.length === 0) return;

    lastAdsRef.current = adsKey;
    fetchCreatives();
  }, [adsKey, autoFetch, fetchCreatives]);

  /**
   * Retorna criativo de um ad especifico
   */
  const getCreative = useCallback(
    (adId: string): MetaAdCreative | null => {
      return state.creatives[adId] || null;
    },
    [state.creatives]
  );

  /**
   * Retorna estado de loading de um ad especifico
   */
  const getLoadingState = useCallback(
    (adId: string): LoadingState => {
      return (
        state.loadingStates[adId] || {
          isLoading: false,
          hasError: false,
        }
      );
    },
    [state.loadingStates]
  );

  /**
   * Verifica se criativo existe para um ad
   */
  const hasCreative = useCallback(
    (adId: string): boolean => {
      return !!state.creatives[adId];
    },
    [state.creatives]
  );

  /**
   * Forca refetch de todos os criativos
   */
  const refetch = useCallback(async () => {
    lastAdsRef.current = '';
    fetchingRef.current = false;
    await fetchCreatives();
  }, [fetchCreatives]);

  return {
    ...state,
    getCreative,
    getLoadingState,
    refetch,
    hasCreative,
  };
}

/**
 * Hook simplificado para carregar criativos do cache apenas
 * Nao faz fetch automatico, util para verificar cache local
 */
export function useAdCreativesCache(
  adIds: string[]
): {
  creatives: Record<string, MetaAdCreative>;
  loading: boolean;
} {
  const [creatives, setCreatives] = useState<Record<string, MetaAdCreative>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adIds.length === 0) {
      setCreatives({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCache() {
      setLoading(true);
      const cached = await getCreativesFromCacheBatch(adIds);

      if (!cancelled) {
        setCreatives(cached);
        setLoading(false);
      }
    }

    loadCache();

    return () => {
      cancelled = true;
    };
  }, [adIds.join(',')]);

  return { creatives, loading };
}

export default useAdCreativesBatch;
