/**
 * Hook useAdCreativesBatch
 *
 * Gerencia busca em lote de criativos de anuncios.
 * Carrega automaticamente quando recebe lista de ads e
 * fornece acesso individual aos criativos por ad_id.
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
 * Hook para gerenciamento de criativos em lote
 * Busca automaticamente quando ads mudam
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
   * Busca criativos em lote
   * Quando metaAdAccountId nao esta disponivel, carrega apenas do cache local (Supabase)
   * sem chamar a edge function. Isso garante que thumbnails aparecem na listagem.
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

    // Sem metaAdAccountId: carrega apenas do cache local (nao chama edge function)
    if (!metaAdAccountId) {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      setState(prev => ({ ...prev, globalLoading: true, globalError: null }));

      try {
        const cached = await getCreativesFromCacheBatch(currentAdIds);
        const newLoadingStates: Record<string, LoadingState> = {};
        for (const adId of currentAdIds) {
          newLoadingStates[adId] = { isLoading: false, hasError: false };
        }

        setState(prev => ({
          creatives: { ...prev.creatives, ...cached },
          loadingStates: { ...prev.loadingStates, ...newLoadingStates },
          globalLoading: false,
          globalError: null,
          fetchedCount: 0,
          cachedCount: Object.keys(cached).length,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState(prev => ({ ...prev, globalLoading: false, globalError: errorMessage }));
      } finally {
        fetchingRef.current = false;
      }
      return;
    }

    // Evita busca duplicada
    if (fetchingRef.current) {
      console.log('[useAdCreativesBatch] Busca já em andamento, ignorando...');
      return;
    }
    fetchingRef.current = true;

    console.log('[useAdCreativesBatch] Iniciando busca de criativos:', {
      ad_count: currentAdIds.length,
      meta_ad_account_id: metaAdAccountId,
    });

    // Define loading para todos os ads
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

    try {
      const result = await prefetchCreativesForAds(currentAdIds, metaAdAccountId);

      console.log('[useAdCreativesBatch] Resultado do prefetch:', {
        creatives_count: Object.keys(result.creatives).length,
        errors_count: Object.keys(result.errors).length,
      });

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

      // Calcula contadores
      const cachedCount = Object.keys(result.creatives).filter(
        id => !result.errors[id]
      ).length;

      setState(prev => ({
        creatives: { ...prev.creatives, ...result.creatives },
        loadingStates: { ...prev.loadingStates, ...newLoadingStates },
        globalLoading: false,
        globalError: result.errors._batch || null,
        fetchedCount: Object.keys(result.creatives).length - cachedCount,
        cachedCount,
      }));

      console.log('[useAdCreativesBatch] Estado atualizado com sucesso');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[useAdCreativesBatch] Erro ao buscar criativos:', {
        message: errorMessage,
        error,
      });

      // Marca todos como erro
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
  }, [adsKey, metaAdAccountId, safeAds]); // Usando adsKey + safeAds para ter acesso aos dados completos

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
