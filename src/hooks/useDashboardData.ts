/**
 * Hook customizado para gerenciar dados do dashboard
 *
 * Este hook centraliza a lógica de busca e gerenciamento de dados.
 * ATUALIZADO: Métricas vem DIRETAMENTE DA API META em tempo real, sem usar banco de dados.
 * Campanhas e estruturas continuam vindo do banco para referência.
 * Usa dados mockados apenas como fallback para demonstração quando não há dados reais.
 */

import { useState, useEffect, useCallback } from 'react';
import { DashboardDataService } from '../lib/services/DashboardDataService';
import {
  mockCampaigns,
  mockMetrics,
  mockAdSets,
  mockAds,
  mockAdAccounts
} from '../data/mockData';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../types/advertising';
import { logger } from '../lib/utils/logger';

interface DashboardData {
  campaigns: Campaign[];
  metrics: AdMetrics[];
  adSets: AdSet[];
  ads: Ad[];
  adAccounts: AdAccount[];
  isUsingRealData: boolean;
  isUsingRealtimeMetrics: boolean; // Indica se métricas vem da API em tempo real
  lastMetricsUpdate: Date | null; // Timestamp da última atualização de métricas
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshMetrics: () => Promise<void>; // Força atualização de métricas da API
  clearCache: () => void; // Limpa cache de métricas
}

/**
 * Hook principal para gerenciar dados do dashboard
 *
 * ATUALIZADO: Métricas são buscadas DIRETAMENTE da API Meta em tempo real.
 * Campanhas vem do banco de dados para referência.
 * Mantém dados mockados apenas como fallback para demonstração.
 */
export const useDashboardData = (): DashboardData => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [metrics, setMetrics] = useState<AdMetrics[]>(mockMetrics);
  const [adSets, setAdSets] = useState<AdSet[]>(mockAdSets);
  const [ads, setAds] = useState<Ad[]>(mockAds);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(mockAdAccounts);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [isUsingRealtimeMetrics, setIsUsingRealtimeMetrics] = useState(false);
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataService = DashboardDataService.getInstance();

  /**
   * Carrega dados do banco e da API Meta em tempo real
   * ATUALIZADO: Métricas vem DIRETAMENTE da API Meta, não do banco de dados
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Iniciando carregamento de dados do dashboard...');

      // Busca dados: campanhas do banco + métricas da API Meta em tempo real
      const data = await dataService.fetchAllDashboardData();

      logger.info('Resultado da busca', {
        hasRealData: data.hasRealData,
        campanhas: data.campaigns.length,
        metricas: data.metrics.length,
        metricsSource: 'API Meta (realtime)',
        adSets: data.adSets.length,
        ads: data.ads.length
      });

      // Verifica se temos campanhas reais
      if (data.hasRealData && data.campaigns.length > 0) {
        // Usa dados reais: campanhas do banco + métricas da API
        setCampaigns(data.campaigns);
        setMetrics(data.metrics);
        setAdSets(data.adSets);
        setAds(data.ads);
        setAdAccounts(data.adAccounts);
        setIsUsingRealData(true);
        setIsUsingRealtimeMetrics(data.metrics.length > 0);
        setLastMetricsUpdate(new Date());

        logger.info('✅ Dashboard carregado com dados reais', {
          campanhas: data.campaigns.length,
          metricas: data.metrics.length,
          source: 'API Meta (realtime)',
          adSets: data.adSets.length,
          ads: data.ads.length
        });

        if (data.metrics.length === 0) {
          logger.warn('Campanhas encontradas, mas sem métricas da API Meta');
          logger.warn('Verifique se as campanhas têm dados no período selecionado');
        }
      } else {
        // Usa dados mockados como fallback para demonstração
        setCampaigns(mockCampaigns);
        setMetrics(mockMetrics);
        setAdSets(mockAdSets);
        setAds(mockAds);
        setAdAccounts(mockAdAccounts);
        setIsUsingRealData(false);
        setIsUsingRealtimeMetrics(false);
        setLastMetricsUpdate(null);

        logger.info('Usando dados de demonstração (mocks) - Nenhuma campanha encontrada');
      }
    } catch (err) {
      logger.error('Erro ao carregar dados do dashboard', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');

      // Em caso de erro, usa mocks como fallback
      setCampaigns(mockCampaigns);
      setMetrics(mockMetrics);
      setAdSets(mockAdSets);
      setAds(mockAds);
      setAdAccounts(mockAdAccounts);
      setIsUsingRealData(false);
      setIsUsingRealtimeMetrics(false);
      setLastMetricsUpdate(null);
    } finally {
      setLoading(false);
    }
  }, [dataService]);

  /**
   * Atualiza todos os dados (campanhas + métricas da API)
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  /**
   * Atualiza apenas métricas da API Meta (força busca sem cache)
   */
  const refreshMetrics = useCallback(async () => {
    try {
      setLoading(true);
      logger.info('Atualizando métricas da API Meta (forçando atualização)...');

      const campaignIds = campaigns.map(c => c.id);
      if (campaignIds.length === 0) {
        logger.warn('Nenhuma campanha disponível para atualizar métricas');
        return;
      }

      // Força busca sem cache (useCache = false)
      const freshMetrics = await dataService.fetchMetrics(campaignIds, undefined, undefined, false);

      setMetrics(freshMetrics);
      setIsUsingRealtimeMetrics(freshMetrics.length > 0);
      setLastMetricsUpdate(new Date());

      logger.info(`Métricas atualizadas: ${freshMetrics.length} registros`);
    } catch (err) {
      logger.error('Erro ao atualizar métricas', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar métricas');
    } finally {
      setLoading(false);
    }
  }, [campaigns, dataService]);

  /**
   * Limpa o cache de métricas
   */
  const clearCache = useCallback(() => {
    dataService.clearMetricsCache();
    logger.info('Cache de métricas limpo');
  }, [dataService]);

  // Carrega dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  return {
    campaigns,
    metrics,
    adSets,
    ads,
    adAccounts,
    isUsingRealData,
    isUsingRealtimeMetrics,
    lastMetricsUpdate,
    loading,
    error,
    refresh,
    refreshMetrics,
    clearCache
  };
};

/**
 * Hook para buscar dados filtrados por período DIRETAMENTE DA API META
 * Útil para análises e relatórios específicos com dados em tempo real
 *
 * @param startDate Data de início do período
 * @param endDate Data de fim do período
 * @param campaignIds Array opcional de IDs de campanhas
 * @param useCache Se true, usa cache (padrão: true)
 */
export const useDashboardDataForPeriod = (
  startDate: Date,
  endDate: Date,
  campaignIds?: string[],
  useCache: boolean = true
) => {
  const [metrics, setMetrics] = useState<AdMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const dataService = DashboardDataService.getInstance();

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Buscando métricas da API Meta para período', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        campaignIds: campaignIds?.length || 'todas'
      });

      // Busca métricas DIRETAMENTE da API Meta
      const data = await dataService.fetchMetricsForPeriod(startDate, endDate, campaignIds, useCache);

      if (data.length > 0) {
        setMetrics(data);
        setLastUpdate(new Date());
        logger.info(`Métricas do período carregadas: ${data.length} registros`);
      } else {
        // Fallback para mocks filtrados por data
        const filteredMocks = mockMetrics.filter(metric => {
          const metricDate = new Date(metric.date);
          return metricDate >= startDate && metricDate <= endDate;
        });
        setMetrics(filteredMocks);
        setLastUpdate(null);
        logger.warn('Sem métricas da API, usando dados de demonstração');
      }
    } catch (err) {
      logger.error('Erro ao carregar métricas do período', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMetrics([]);
      setLastUpdate(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, campaignIds, useCache, dataService]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdate,
    refresh: loadMetrics
  };
};
