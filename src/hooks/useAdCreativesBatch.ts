/**
 * Hook useAdCreativesBatch
 *
 * Gerencia busca em lote de criativos de anuncios.
 * Carrega automaticamente quando recebe lista de ads e
 * fornece acesso individual aos criativos por ad_id.
 *
 * Melhorias:
 * - Cache localStorage como fallback quando API falha
 * - Verifica localStorage antes de chamar API
 * - Salva criativos no localStorage apos busca bem-sucedida
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  prefetchCreativesForAds,
  getCreativesFromCacheBatch,
} from '../lib/services/AdCreativeService';
import {
  getCachedCreativesBatch,
  cacheCreativesBatch,
} from '../lib/services/CreativesCacheService';
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
   * Estrategia:
   * 1. Verifica localStorage primeiro
   * 2. Busca na API apenas os que faltam
   * 3. Salva novos criativos no localStorage
   * 4. Usa localStorage como fallback em caso de erro
   */
  const fetchCreatives = useCallback(async () => {
    // Recalcula adIds dentro do callback para garantir que sempre esta atualizado
    const currentAdIds = safeAds
      .filter(ad => ad && typeof ad === 'object' && ad.entity_id)
      .map(ad => ad.entity_id);

    if (currentAdIds.length === 0 || !metaAdAccountId) {
      setState(prev => ({
        ...prev,
        globalLoading: false,
        globalError: null,
      }));
      return;
    }

    // Evita busca duplicada
    if (fetchingRef.current) {
      console.log('[useAdCreativesBatch] Busca ja em andamento, ignorando...');
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

    // PASSO 1: Verifica cache localStorage primeiro
    const localCached = getCachedCreativesBatch(currentAdIds);
    const localCachedIds = Object.keys(localCached);
    const missingFromLocalCache = currentAdIds.filter(id => !localCached[id]);

    console.log('[useAdCreativesBatch] Cache localStorage:', {
      cached_count: localCachedIds.length,
      missing_count: missingFromLocalCache.length,
    });

    // Se todos os criativos estao no cache local, usa direto
    if (missingFromLocalCache.length === 0) {
      console.log('[useAdCreativesBatch] Todos os criativos encontrados no localStorage');

      const allLoadedStates: Record<string, LoadingState> = {};
      for (const adId of currentAdIds) {
        allLoadedStates[adId] = { isLoading: false, hasError: false };
      }

      setState(prev => ({
        creatives: { ...prev.creatives, ...localCached },
        loadingStates: { ...prev.loadingStates, ...allLoadedStates },
        globalLoading: false,
        globalError: null,
        fetchedCount: 0,
        cachedCount: localCachedIds.length,
      }));

      fetchingRef.current = false;
      return;
    }

    try {
      // PASSO 2: Busca na API (prefetch busca no banco e API se necessario)
      const result = await prefetchCreativesForAds(currentAdIds, metaAdAccountId);

      console.log('[useAdCreativesBatch] Resultado do prefetch:', {
        creatives_count: Object.keys(result.creatives).length,
        errors_count: Object.keys(result.errors).length,
      });

      // PASSO 3: Combina criativos do localStorage + API
      const combinedCreatives: Record<string, MetaAdCreative> = {
        ...localCached,
        ...result.creatives,
      };

      // Salva novos criativos no localStorage para cache futuro
      if (Object.keys(result.creatives).length > 0) {
        const newCreativesToCache: Record<string, MetaAdCreative> = {};
        for (const [adId, creative] of Object.entries(result.creatives)) {
          // So salva se nao estava no cache local
          if (!localCached[adId]) {
            newCreativesToCache[adId] = creative;
          }
        }
        if (Object.keys(newCreativesToCache).length > 0) {
          cacheCreativesBatch(newCreativesToCache);
          console.log('[useAdCreativesBatch] Salvos no localStorage:', Object.keys(newCreativesToCache).length);
        }
      }

      // Atualiza estados de loading individuais
      const newLoadingStates: Record<string, LoadingState> = {};
      for (const adId of currentAdIds) {
        if (result.errors[adId] && !combinedCreatives[adId]) {
          // So marca erro se nao temos o criativo de nenhuma fonte
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
      const apiCount = Object.keys(result.creatives).filter(id => !localCached[id]).length;

      setState(prev => ({
        creatives: { ...prev.creatives, ...combinedCreatives },
        loadingStates: { ...prev.loadingStates, ...newLoadingStates },
        globalLoading: false,
        globalError: result.errors._batch || null,
        fetchedCount: apiCount,
        cachedCount: localCachedIds.length,
      }));

      console.log('[useAdCreativesBatch] Estado atualizado com sucesso');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[useAdCreativesBatch] Erro ao buscar criativos:', {
        message: errorMessage,
        error,
      });

      // PASSO 4: Usa localStorage como fallback em caso de erro
      if (localCachedIds.length > 0) {
        console.log('[useAdCreativesBatch] Usando localStorage como fallback apos erro');

        const fallbackLoadingStates: Record<string, LoadingState> = {};
        for (const adId of currentAdIds) {
          if (localCached[adId]) {
            fallbackLoadingStates[adId] = { isLoading: false, hasError: false };
          } else {
            fallbackLoadingStates[adId] = {
              isLoading: false,
              hasError: true,
              errorMessage: 'Nao encontrado no cache',
            };
          }
        }

        setState(prev => ({
          creatives: { ...prev.creatives, ...localCached },
          loadingStates: { ...prev.loadingStates, ...fallbackLoadingStates },
          globalLoading: false,
          globalError: `${errorMessage} (usando cache local)`,
          fetchedCount: 0,
          cachedCount: localCachedIds.length,
        }));
      } else {
        // Marca todos como erro se nao tem cache
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
      }
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
