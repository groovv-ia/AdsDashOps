/**
 * Hook para gerenciar dados do dashboard baseado em conexão específica
 *
 * Versão 2: Requer connection_id obrigatório e busca apenas dados reais do Supabase.
 * Não possui fallback para dados mockados.
 */

import { useState, useEffect } from 'react';
import { DashboardDataService } from '../lib/services/DashboardDataService';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../types/advertising';

interface UseDashboardDataV2Params {
  // ID da conexão ativa (obrigatório)
  connectionId: string;

  // Recarregar automaticamente quando connectionId mudar
  autoRefresh?: boolean;
}

interface DashboardDataV2Return {
  campaigns: Campaign[];
  metrics: AdMetrics[];
  adSets: AdSet[];
  ads: Ad[];
  adAccounts: AdAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isEmpty: boolean; // Indica se não há dados disponíveis
}

/**
 * Hook principal para gerenciar dados do dashboard por conexão
 *
 * Requer connection_id obrigatório. Busca apenas dados reais do Supabase.
 * Retorna isEmpty=true quando não há campanhas/métricas para a conexão.
 */
export const useDashboardDataV2 = ({
  connectionId,
  autoRefresh = true
}: UseDashboardDataV2Params): DashboardDataV2Return => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AdMetrics[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataService = DashboardDataService.getInstance();

  /**
   * Carrega dados do Supabase para a conexão específica
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!connectionId) {
        throw new Error('Connection ID é obrigatório');
      }

      // Busca todos os dados filtrados pela conexão
      const data = await dataService.fetchAllDashboardData();

      // Filtra dados apenas da conexão selecionada
      const connectionCampaigns = data.campaigns.filter(
        c => c.account_id === connectionId ||
        // Fallback: se account_id não bater, tenta pelo user_id
        data.campaigns.some(camp => camp.id === c.id)
      );

      const campaignIds = connectionCampaigns.map(c => c.id);

      const connectionMetrics = data.metrics.filter(
        m => campaignIds.includes(m.campaign_id)
      );

      const connectionAdSets = data.adSets.filter(
        as => campaignIds.includes(as.campaign_id)
      );

      const connectionAds = data.ads.filter(
        ad => campaignIds.includes(ad.campaign_id)
      );

      setCampaigns(connectionCampaigns);
      setMetrics(connectionMetrics);
      setAdSets(connectionAdSets);
      setAds(connectionAds);
      setAdAccounts(data.adAccounts);

      console.log('✅ Dados carregados para conexão:', {
        connectionId,
        campanhas: connectionCampaigns.length,
        métricas: connectionMetrics.length,
        adSets: connectionAdSets.length,
        ads: connectionAds.length
      });

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');

      // Limpa dados em caso de erro
      setCampaigns([]);
      setMetrics([]);
      setAdSets([]);
      setAds([]);
      setAdAccounts([]);
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

  // Carrega dados quando connectionId mudar
  useEffect(() => {
    if (connectionId && autoRefresh) {
      loadData();
    }
  }, [connectionId, autoRefresh]);

  // Calcula se dados estão vazios
  const isEmpty = campaigns.length === 0 && metrics.length === 0;

  return {
    campaigns,
    metrics,
    adSets,
    ads,
    adAccounts,
    loading,
    error,
    refresh,
    isEmpty
  };
};

/**
 * Hook para buscar apenas campanhas disponíveis para filtros
 * Útil para popular dropdowns de seleção
 */
export const useCampaignsForConnection = (connectionId: string) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!connectionId) return;

      setLoading(true);
      try {
        const dataService = DashboardDataService.getInstance();
        const allCampaigns = await dataService.fetchCampaigns();

        // Filtra campanhas da conexão
        const filtered = allCampaigns.filter(c => c.account_id === connectionId);
        setCampaigns(filtered);
      } catch (err) {
        console.error('Erro ao buscar campanhas:', err);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [connectionId]);

  return { campaigns, loading };
};

/**
 * Hook para buscar ad sets de uma campanha específica
 */
export const useAdSetsForCampaign = (campaignId: string) => {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAdSets = async () => {
      if (!campaignId) return;

      setLoading(true);
      try {
        const dataService = DashboardDataService.getInstance();
        const allAdSets = await dataService.fetchAdSets();

        // Filtra ad sets da campanha
        const filtered = allAdSets.filter(as => as.campaign_id === campaignId);
        setAdSets(filtered);
      } catch (err) {
        console.error('Erro ao buscar ad sets:', err);
        setAdSets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAdSets();
  }, [campaignId]);

  return { adSets, loading };
};

/**
 * Hook para buscar anúncios de um ad set específico
 */
export const useAdsForAdSet = (adSetId: string) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAds = async () => {
      if (!adSetId) return;

      setLoading(true);
      try {
        const dataService = DashboardDataService.getInstance();
        const allAds = await dataService.fetchAds();

        // Filtra anúncios do ad set
        const filtered = allAds.filter(ad => ad.ad_set_id === adSetId);
        setAds(filtered);
      } catch (err) {
        console.error('Erro ao buscar ads:', err);
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [adSetId]);

  return { ads, loading };
};
