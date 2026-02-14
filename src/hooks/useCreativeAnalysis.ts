/**
 * useCreativeAnalysis Hook
 *
 * Gerencia estado do modulo de analise de criativos.
 * Controla filtros, busca, selecao, comparacao e paginacao.
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

// View modes disponiveis
export type ViewMode = 'gallery' | 'comparison' | 'timeline';

// Estado do hook
interface CreativeAnalysisState {
  creatives: EnrichedCreative[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  filters: CreativeSearchFilters;
  viewMode: ViewMode;
  selectedIds: Set<string>;
  campaignOptions: CampaignOption[];
  adsetOptions: AdsetOption[];
  loadingOptions: boolean;
  currentPage: number;
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

export function useCreativeAnalysis(platform: 'meta' | 'google'): CreativeAnalysisReturn {
  const [state, setState] = useState<CreativeAnalysisState>({
    creatives: [],
    total: 0,
    hasMore: false,
    loading: false,
    error: null,
    filters: defaultFilters(platform),
    viewMode: 'gallery',
    selectedIds: new Set(),
    campaignOptions: [],
    adsetOptions: [],
    loadingOptions: false,
    currentPage: 0,
  });

  // Ref para evitar buscas duplicadas em StrictMode
  const searchingRef = useRef(false);
  const initialLoadRef = useRef(false);

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

  // Busca principal
  const search = useCallback(async () => {
    if (searchingRef.current) return;
    searchingRef.current = true;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await searchCreatives(state.filters);
      setState(prev => ({
        ...prev,
        creatives: result.creatives,
        total: result.total,
        hasMore: result.hasMore,
        loading: false,
        currentPage: 0,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar criativos';
      setState(prev => ({ ...prev, loading: false, error: message }));
    } finally {
      searchingRef.current = false;
    }
  }, [state.filters]);

  // Carrega mais resultados (paginacao)
  const loadMore = useCallback(async () => {
    if (searchingRef.current || !state.hasMore) return;
    searchingRef.current = true;

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
    } catch {
      // silencioso na paginacao
    } finally {
      searchingRef.current = false;
    }
  }, [state.filters, state.currentPage, state.hasMore]);

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
