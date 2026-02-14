/**
 * useCreativeAnalysis Hook
 *
 * Gerencia estado do modulo de analise de criativos.
 * Controla filtros, busca, selecao, comparacao e paginacao.
 * Integra busca real-time via Edge Function para imagens HD da Meta API.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  searchCreatives,
  fetchCampaignOptions,
  fetchAdsetOptions,
  type CreativeSearchFilters,
  type EnrichedCreative,
  type CampaignOption,
  type AdsetOption,
} from '../lib/services/CreativeAnalysisService';
import { prefetchCreativesForAds } from '../lib/services/AdCreativeService';
import type { MetaAdCreative } from '../types/adAnalysis';

// View modes disponiveis
export type ViewMode = 'gallery' | 'comparison' | 'timeline';

// Estado de loading por criativo individual
export interface CreativeLoadingState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// Estado do hook
interface CreativeAnalysisState {
  creatives: EnrichedCreative[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  fetchingImages: boolean;
  error: string | null;
  filters: CreativeSearchFilters;
  viewMode: ViewMode;
  selectedIds: Set<string>;
  campaignOptions: CampaignOption[];
  adsetOptions: AdsetOption[];
  loadingOptions: boolean;
  currentPage: number;
  creativeLoadingStates: Record<string, CreativeLoadingState>;
}

// Retorno do hook
interface CreativeAnalysisReturn extends CreativeAnalysisState {
  updateFilters: (partial: Partial<CreativeSearchFilters>) => void;
  resetFilters: () => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleSelect: (adId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  getSelectedCreatives: () => EnrichedCreative[];
  loadAdsetOptions: (campaignId: string) => Promise<void>;
  refreshCampaignOptions: () => Promise<void>;
}

// Quantidade de itens por pagina
const PAGE_SIZE = 24;

// Filtros padroes
function defaultFilters(platform: 'meta' | 'google'): CreativeSearchFilters {
  // Ultimos 30 dias como padrao
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    platform,
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
    sortBy: 'spend',
    sortOrder: 'desc',
    limit: PAGE_SIZE,
    offset: 0,
  };
}

/**
 * Dispara fetch real-time para buscar imagens HD da API do Meta.
 * Agrupa os ad_ids por meta_ad_account_id e faz uma chamada por conta.
 * Retorna os criativos atualizados para merge no state.
 */
async function fetchRealTimeCreatives(
  creatives: EnrichedCreative[]
): Promise<{
  updatedCreatives: Record<string, MetaAdCreative>;
  errors: Record<string, string>;
}> {
  // Agrupa ad_ids por meta_ad_account_id
  const accountGroups: Record<string, string[]> = {};
  for (const c of creatives) {
    const accountId = c.metaAdAccountId || c.creative.meta_ad_account_id;
    if (!accountId) continue;
    if (!accountGroups[accountId]) accountGroups[accountId] = [];
    accountGroups[accountId].push(c.creative.ad_id);
  }

  const allCreatives: Record<string, MetaAdCreative> = {};
  const allErrors: Record<string, string> = {};

  // Faz fetch em paralelo para cada conta
  const promises = Object.entries(accountGroups).map(async ([accountId, adIds]) => {
    try {
      const result = await prefetchCreativesForAds(adIds, accountId);
      Object.assign(allCreatives, result.creatives);
      Object.assign(allErrors, result.errors);
    } catch (err) {
      // Marca todos os ads desta conta com erro
      for (const adId of adIds) {
        allErrors[adId] = err instanceof Error ? err.message : 'Erro ao buscar criativo';
      }
    }
  });

  await Promise.all(promises);
  return { updatedCreatives: allCreatives, errors: allErrors };
}

/**
 * Merge os criativos frescos da API no array de EnrichedCreative existente.
 * Substitui o objeto creative mantendo todo o resto (metricas, nomes, tags).
 */
function mergeCreativesIntoState(
  existing: EnrichedCreative[],
  freshCreatives: Record<string, MetaAdCreative>
): EnrichedCreative[] {
  return existing.map(enriched => {
    const fresh = freshCreatives[enriched.creative.ad_id];
    if (!fresh) return enriched;
    return { ...enriched, creative: fresh };
  });
}

export function useCreativeAnalysis(platform: 'meta' | 'google'): CreativeAnalysisReturn {
  const [state, setState] = useState<CreativeAnalysisState>({
    creatives: [],
    total: 0,
    hasMore: false,
    loading: false,
    fetchingImages: false,
    error: null,
    filters: defaultFilters(platform),
    viewMode: 'gallery',
    selectedIds: new Set(),
    campaignOptions: [],
    adsetOptions: [],
    loadingOptions: false,
    currentPage: 0,
    creativeLoadingStates: {},
  });

  // Ref para evitar buscas duplicadas em StrictMode
  const searchingRef = useRef(false);
  const initialLoadRef = useRef(false);
  // Ref para abortar fetch real-time quando nova busca comeca
  const fetchAbortRef = useRef(0);

  /**
   * Dispara busca real-time de imagens para uma lista de criativos.
   * Marca loading por ad_id, faz a chamada, e merge os resultados no state.
   */
  const triggerRealTimeFetch = useCallback(async (creativesToFetch: EnrichedCreative[], fetchId: number) => {
    // Apenas Meta suporta fetch real-time
    if (platform !== 'meta') return;

    // Filtra criativos que tem meta_ad_account_id
    const fetchable = creativesToFetch.filter(
      c => c.metaAdAccountId || c.creative.meta_ad_account_id
    );
    if (fetchable.length === 0) return;

    // Marca loading por ad_id
    const loadingStates: Record<string, CreativeLoadingState> = {};
    for (const c of fetchable) {
      loadingStates[c.creative.ad_id] = { isLoading: true, hasError: false };
    }

    setState(prev => ({
      ...prev,
      fetchingImages: true,
      creativeLoadingStates: { ...prev.creativeLoadingStates, ...loadingStates },
    }));

    try {
      const { updatedCreatives, errors } = await fetchRealTimeCreatives(fetchable);

      // Verifica se nao foi abortado por nova busca
      if (fetchAbortRef.current !== fetchId) return;

      // Monta loading states finais
      const finalStates: Record<string, CreativeLoadingState> = {};
      for (const c of fetchable) {
        const adId = c.creative.ad_id;
        const fresh = updatedCreatives[adId];
        const hasError = !!errors[adId];

        // So marca erro se nao tem imagem usavel
        const hasUsableImage = fresh && (
          fresh.cached_image_url || fresh.image_url_hd || fresh.image_url
          || fresh.cached_thumbnail_url || fresh.thumbnail_url
        );

        finalStates[adId] = {
          isLoading: false,
          hasError: hasError && !hasUsableImage,
          errorMessage: hasError && !hasUsableImage ? errors[adId] : undefined,
        };
      }

      setState(prev => ({
        ...prev,
        creatives: mergeCreativesIntoState(prev.creatives, updatedCreatives),
        fetchingImages: false,
        creativeLoadingStates: { ...prev.creativeLoadingStates, ...finalStates },
      }));
    } catch {
      if (fetchAbortRef.current !== fetchId) return;
      setState(prev => ({ ...prev, fetchingImages: false }));
    }
  }, [platform]);

  // Carrega opcoes de campanha na montagem
  const refreshCampaignOptions = useCallback(async () => {
    setState(prev => ({ ...prev, loadingOptions: true }));
    try {
      const options = await fetchCampaignOptions(platform);
      setState(prev => ({ ...prev, campaignOptions: options, loadingOptions: false }));
    } catch {
      setState(prev => ({ ...prev, loadingOptions: false }));
    }
  }, [platform]);

  // Carrega opcoes de adset para uma campanha
  const loadAdsetOptions = useCallback(async (campaignId: string) => {
    try {
      const options = await fetchAdsetOptions(campaignId);
      setState(prev => ({ ...prev, adsetOptions: options }));
    } catch {
      // silencioso
    }
  }, []);

  // Busca principal -- depois dispara fetch real-time automaticamente
  const search = useCallback(async () => {
    if (searchingRef.current) return;
    searchingRef.current = true;

    // Incrementa fetchId para abortar fetches anteriores
    const fetchId = ++fetchAbortRef.current;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      creativeLoadingStates: {},
    }));

    try {
      const result = await searchCreatives(state.filters);

      // Verifica se nao foi abortado
      if (fetchAbortRef.current !== fetchId) return;

      setState(prev => ({
        ...prev,
        creatives: result.creatives,
        total: result.total,
        hasMore: result.hasMore,
        loading: false,
        currentPage: 0,
      }));

      // Dispara fetch real-time em background para buscar imagens HD
      triggerRealTimeFetch(result.creatives, fetchId);
    } catch (err) {
      if (fetchAbortRef.current !== fetchId) return;
      const message = err instanceof Error ? err.message : 'Erro ao buscar criativos';
      setState(prev => ({ ...prev, loading: false, error: message }));
    } finally {
      searchingRef.current = false;
    }
  }, [state.filters, triggerRealTimeFetch]);

  // Carrega mais resultados (paginacao) -- tambem dispara fetch real-time
  const loadMore = useCallback(async () => {
    if (searchingRef.current || !state.hasMore) return;
    searchingRef.current = true;

    const fetchId = fetchAbortRef.current;
    const nextOffset = (state.currentPage + 1) * PAGE_SIZE;

    try {
      const result = await searchCreatives({
        ...state.filters,
        offset: nextOffset,
      });

      setState(prev => ({
        ...prev,
        creatives: [...prev.creatives, ...result.creatives],
        hasMore: result.hasMore,
        currentPage: prev.currentPage + 1,
      }));

      // Dispara fetch real-time somente para os novos criativos da pagina
      triggerRealTimeFetch(result.creatives, fetchId);
    } catch {
      // silencioso na paginacao
    } finally {
      searchingRef.current = false;
    }
  }, [state.filters, state.currentPage, state.hasMore, triggerRealTimeFetch]);

  // Atualiza filtros e dispara busca automaticamente
  const updateFilters = useCallback((partial: Partial<CreativeSearchFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...partial, offset: 0 },
      selectedIds: new Set(),
    }));
  }, []);

  // Reseta todos os filtros
  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: defaultFilters(platform),
      selectedIds: new Set(),
      adsetOptions: [],
    }));
  }, [platform]);

  // Toggle selecao de um criativo
  const toggleSelect = useCallback((adId: string) => {
    setState(prev => {
      const next = new Set(prev.selectedIds);
      if (next.has(adId)) {
        next.delete(adId);
      } else {
        next.add(adId);
      }
      return { ...prev, selectedIds: next };
    });
  }, []);

  // Seleciona todos os criativos visiveis
  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIds: new Set(prev.creatives.map(c => c.creative.ad_id)),
    }));
  }, []);

  // Limpa selecao
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedIds: new Set() }));
  }, []);

  // Altera modo de visualizacao
  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // Retorna criativos selecionados
  const getSelectedCreatives = useCallback((): EnrichedCreative[] => {
    return state.creatives.filter(c => state.selectedIds.has(c.creative.ad_id));
  }, [state.creatives, state.selectedIds]);

  // Carga inicial: opcoes + busca
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    refreshCampaignOptions();
    search();
  }, []);

  // Re-busca quando filtros mudam (com debounce para searchQuery)
  const filtersRef = useRef(state.filters);
  useEffect(() => {
    const prev = filtersRef.current;
    const curr = state.filters;

    // Ignora mudanca inicial
    if (prev === curr) return;
    filtersRef.current = curr;

    // Debounce para busca por texto
    if (prev.searchQuery !== curr.searchQuery) {
      const timer = setTimeout(() => search(), 400);
      return () => clearTimeout(timer);
    }

    search();
  }, [state.filters, search]);

  return {
    ...state,
    updateFilters,
    resetFilters,
    search,
    loadMore,
    toggleSelect,
    selectAll,
    clearSelection,
    setViewMode,
    getSelectedCreatives,
    loadAdsetOptions,
    refreshCampaignOptions,
  };
}

export default useCreativeAnalysis;
