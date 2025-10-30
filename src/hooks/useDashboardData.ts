/**
 * Hook customizado para gerenciar dados do dashboard
 *
 * Este hook centraliza a lógica de busca e gerenciamento de dados.
 * Automaticamente usa dados reais do Supabase quando disponíveis,
 * ou retorna dados mockados como fallback para demonstração.
 */

import { useState, useEffect } from 'react';
import { DashboardDataService } from '../lib/services/DashboardDataService';
import {
  mockCampaigns,
  mockMetrics,
  mockAdSets,
  mockAds,
  mockAdAccounts
} from '../data/mockData';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../types/advertising';

interface DashboardData {
  campaigns: Campaign[];
  metrics: AdMetrics[];
  adSets: AdSet[];
  ads: Ad[];
  adAccounts: AdAccount[];
  isUsingRealData: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook principal para gerenciar dados do dashboard
 *
 * Retorna dados do Supabase quando disponíveis, ou dados mockados como fallback.
 * Mantém interface idêntica aos dados mockados para compatibilidade total.
 */
export const useDashboardData = (): DashboardData => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [metrics, setMetrics] = useState<AdMetrics[]>(mockMetrics);
  const [adSets, setAdSets] = useState<AdSet[]>(mockAdSets);
  const [ads, setAds] = useState<Ad[]>(mockAds);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(mockAdAccounts);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataService = DashboardDataService.getInstance();

  /**
   * Carrega dados do Supabase ou usa mocks como fallback
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Busca todos os dados do banco em paralelo
      const data = await dataService.fetchAllDashboardData();

      // Verifica se temos dados reais
      if (data.hasRealData && data.campaigns.length > 0) {
        // Usa dados reais do banco
        setCampaigns(data.campaigns);
        setMetrics(data.metrics);
        setAdSets(data.adSets);
        setAds(data.ads);
        setAdAccounts(data.adAccounts);
        setIsUsingRealData(true);

        console.log('✅ Usando dados reais do Supabase:', {
          campanhas: data.campaigns.length,
          métricas: data.metrics.length,
          adSets: data.adSets.length,
          ads: data.ads.length
        });
      } else {
        // Usa dados mockados como fallback
        setCampaigns(mockCampaigns);
        setMetrics(mockMetrics);
        setAdSets(mockAdSets);
        setAds(mockAds);
        setAdAccounts(mockAdAccounts);
        setIsUsingRealData(false);

        console.log('📊 Usando dados de demonstração (mocks)');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');

      // Em caso de erro, usa mocks como fallback
      setCampaigns(mockCampaigns);
      setMetrics(mockMetrics);
      setAdSets(mockAdSets);
      setAds(mockAds);
      setAdAccounts(mockAdAccounts);
      setIsUsingRealData(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Função para atualizar dados manualmente
   */
  const refresh = async () => {
    await loadData();
  };

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
    loading,
    error,
    refresh
  };
};

/**
 * Hook para buscar dados filtrados por período
 * Útil para análises e relatórios específicos
 */
export const useDashboardDataForPeriod = (
  startDate: Date,
  endDate: Date,
  campaignIds?: string[]
) => {
  const [metrics, setMetrics] = useState<AdMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataService = DashboardDataService.getInstance();

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await dataService.fetchMetricsForPeriod(startDate, endDate, campaignIds);

      if (data.length > 0) {
        setMetrics(data);
      } else {
        // Fallback para mocks filtrados por data
        const filteredMocks = mockMetrics.filter(metric => {
          const metricDate = new Date(metric.date);
          return metricDate >= startDate && metricDate <= endDate;
        });
        setMetrics(filteredMocks);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas do período:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [startDate, endDate, campaignIds?.join(',')]);

  return {
    metrics,
    loading,
    error,
    refresh: loadMetrics
  };
};
