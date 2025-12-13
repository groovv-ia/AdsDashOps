/**
 * Serviço para gerenciar dados do dashboard
 *
 * Este serviço centraliza o acesso aos dados de campanhas, métricas e análises.
 * ATUALIZADO: Busca métricas DIRETAMENTE da API Meta em tempo real, sem usar banco de dados.
 * Campanhas e estruturas continuam sendo buscadas do banco para referência.
 */

import { supabase } from '../supabase';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../../types/advertising';
import { MetaAdsService } from '../connectors/meta/MetaAdsService';
import { logger } from '../utils/logger';

export class DashboardDataService {
  private static instance: DashboardDataService;
  private metaService: MetaAdsService;

  // Singleton pattern para garantir uma única instância
  private constructor() {
    this.metaService = new MetaAdsService();
  }

  static getInstance(): DashboardDataService {
    if (!DashboardDataService.instance) {
      DashboardDataService.instance = new DashboardDataService();
    }
    return DashboardDataService.instance;
  }

  /**
   * Verifica se o usuário tem dados reais no banco
   * Retorna true se existem campanhas salvas
   * ATUALIZADO: Agora verifica apenas campanhas, métricas são opcionais
   */
  async hasRealData(): Promise<boolean> {
    try {
      if (!supabase) return false;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('❌ hasRealData: Usuário não autenticado');
        return false;
      }

      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id);

      if (error) {
        console.error('❌ Erro ao verificar dados reais:', error);
        return false;
      }

      const hasData = (count ?? 0) > 0;
      console.log(`✅ hasRealData: ${hasData} (${count} campanhas encontradas)`);

      return hasData;
    } catch (error) {
      console.error('❌ Erro ao verificar dados reais:', error);
      return false;
    }
  }

  /**
   * Busca campanhas do usuário autenticado
   * Retorna array vazio se não houver dados
   * CORRIGIDO: Usa order by created_date ao invés de created_at
   */
  async fetchCampaigns(): Promise<Campaign[]> {
    try {
      if (!supabase) {
        console.log('❌ fetchCampaigns: Supabase não disponível');
        return [];
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('❌ fetchCampaigns: Usuário não autenticado');
        return [];
      }

      console.log('🔍 Buscando campanhas do usuário:', user.user.id);

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar campanhas:', error);
        return [];
      }

      console.log(`✅ ${data?.length || 0} campanhas encontradas`);

      // Transforma dados do banco para formato esperado pela aplicação
      return (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        account_id: campaign.account_id || '',
        status: campaign.status,
        objective: campaign.objective || '',
        created_date: campaign.created_date || campaign.created_at?.split('T')[0] || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar campanhas:', error);
      return [];
    }
  }

  /**
   * Busca métricas de anúncios DIRETAMENTE DA API META em tempo real
   * NÃO usa banco de dados como intermediário
   * Pode filtrar por IDs de campanhas específicas
   *
   * @param campaignIds Array opcional de IDs de campanhas para filtrar
   * @param dateStart Data de início opcional (padrão: 30 dias atrás)
   * @param dateEnd Data de fim opcional (padrão: hoje)
   * @param useCache Se true, usa cache em memória (padrão: true)
   * @returns Array de métricas diretamente da API Meta
   */
  async fetchMetrics(
    campaignIds?: string[],
    dateStart?: string,
    dateEnd?: string,
    useCache: boolean = true
  ): Promise<AdMetrics[]> {
    try {
      if (!supabase) {
        logger.warn('fetchMetrics: Supabase não disponível');
        return [];
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        logger.warn('fetchMetrics: Usuário não autenticado');
        return [];
      }

      // Define período padrão se não fornecido (últimos 30 dias)
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const startDate = dateStart || defaultStartDate.toISOString().split('T')[0];
      const endDate = dateEnd || defaultEndDate.toISOString().split('T')[0];

      logger.info('Buscando métricas da API Meta (realtime)', {
        userId: user.user.id,
        campaignCount: campaignIds?.length || 'todas',
        period: `${startDate} a ${endDate}`,
        useCache
      });

      // Se IDs de campanhas foram fornecidos, busca métricas específicas
      if (campaignIds && campaignIds.length > 0) {
        // Primeiro, busca informações de conexão das campanhas
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, connection_id, platform')
          .in('id', campaignIds)
          .eq('user_id', user.user.id);

        if (!campaigns || campaigns.length === 0) {
          logger.warn('Nenhuma campanha encontrada para buscar métricas');
          return [];
        }

        // Agrupa campanhas por conexão para otimizar chamadas à API
        const campaignsByConnection = campaigns.reduce((acc, campaign) => {
          if (!acc[campaign.connection_id]) {
            acc[campaign.connection_id] = [];
          }
          acc[campaign.connection_id].push(campaign.id);
          return acc;
        }, {} as Record<string, string[]>);

        // Busca métricas de todas as conexões em paralelo
        const metricsPromises = Object.entries(campaignsByConnection).map(
          async ([connectionId, ids]) => {
            try {
              return await this.metaService.getMultipleCampaignInsightsRealtime(
                connectionId,
                ids,
                startDate,
                endDate,
                useCache
              );
            } catch (error) {
              logger.error('Erro ao buscar métricas da conexão', error, { connectionId });
              return [];
            }
          }
        );

        const metricsArrays = await Promise.all(metricsPromises);
        const allMetrics = metricsArrays.flat();

        logger.info(`Métricas recuperadas da API Meta: ${allMetrics.length} registros`);
        return allMetrics;
      }

      // Se nenhum ID foi fornecido, busca todas as campanhas do usuário
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, connection_id, platform')
        .eq('user_id', user.user.id);

      if (!allCampaigns || allCampaigns.length === 0) {
        logger.warn('Usuário não possui campanhas cadastradas');
        return [];
      }

      // Agrupa por conexão
      const campaignsByConnection = allCampaigns.reduce((acc, campaign) => {
        if (!acc[campaign.connection_id]) {
          acc[campaign.connection_id] = [];
        }
        acc[campaign.connection_id].push(campaign.id);
        return acc;
      }, {} as Record<string, string[]>);

      // Busca métricas de todas as conexões
      const metricsPromises = Object.entries(campaignsByConnection).map(
        async ([connectionId, ids]) => {
          try {
            return await this.metaService.getMultipleCampaignInsightsRealtime(
              connectionId,
              ids,
              startDate,
              endDate,
              useCache
            );
          } catch (error) {
            logger.error('Erro ao buscar métricas da conexão', error, { connectionId });
            return [];
          }
        }
      );

      const metricsArrays = await Promise.all(metricsPromises);
      const allMetrics = metricsArrays.flat();

      logger.info(`Métricas totais recuperadas da API Meta: ${allMetrics.length} registros`);
      return allMetrics;

    } catch (error) {
      logger.error('Erro ao buscar métricas da API Meta', error);
      return [];
    }
  }

  /**
   * Busca conjuntos de anúncios (ad sets)
   */
  async fetchAdSets(): Promise<AdSet[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('ad_sets')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ad sets:', error);
        return [];
      }

      return (data || []).map(adSet => ({
        id: adSet.id,
        name: adSet.name,
        campaign_id: adSet.campaign_id,
        status: adSet.status,
        daily_budget: parseFloat(adSet.daily_budget || '0'),
        lifetime_budget: parseFloat(adSet.lifetime_budget || '0'),
        targeting: adSet.targeting || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar ad sets:', error);
      return [];
    }
  }

  /**
   * Busca anúncios individuais
   */
  async fetchAds(): Promise<Ad[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ads:', error);
        return [];
      }

      return (data || []).map(ad => ({
        id: ad.id,
        name: ad.name,
        ad_set_id: ad.ad_set_id,
        campaign_id: ad.campaign_id,
        status: ad.status,
        ad_type: ad.ad_type || '',
        creative_url: ad.creative_url || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar ads:', error);
      return [];
    }
  }

  /**
   * Busca contas de anúncios conectadas
   */
  async fetchAdAccounts(): Promise<AdAccount[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('type', 'advertising')
        .eq('status', 'connected');

      if (error) {
        console.error('Erro ao buscar ad accounts:', error);
        return [];
      }

      // Transforma conexões em contas de anúncios
      return (data || []).map(connection => ({
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        account_id: connection.config?.accountId || connection.id,
        is_active: connection.status === 'connected'
      }));
    } catch (error) {
      console.error('Erro ao buscar ad accounts:', error);
      return [];
    }
  }

  /**
   * Busca todos os dados necessários para o dashboard de uma vez
   * ATUALIZADO: Métricas vem DIRETAMENTE DA API META em tempo real
   * Campanhas, ad sets e ads continuam vindo do banco para referência
   *
   * @param dateStart Data de início opcional para métricas
   * @param dateEnd Data de fim opcional para métricas
   * @param useCache Se true, usa cache para métricas (padrão: true)
   * @returns Objeto com todas as entidades do dashboard
   */
  async fetchAllDashboardData(
    dateStart?: string,
    dateEnd?: string,
    useCache: boolean = true
  ): Promise<{
    campaigns: Campaign[];
    metrics: AdMetrics[];
    adSets: AdSet[];
    ads: Ad[];
    adAccounts: AdAccount[];
    hasRealData: boolean;
  }> {
    try {
      // Busca campanhas primeiro para saber quais métricas buscar
      const [campaigns, adSets, ads, adAccounts, hasData] = await Promise.all([
        this.fetchCampaigns(),
        this.fetchAdSets(),
        this.fetchAds(),
        this.fetchAdAccounts(),
        this.hasRealData()
      ]);

      // Busca métricas DIRETAMENTE DA API META para as campanhas encontradas
      const campaignIds = campaigns.map(c => c.id);
      const metrics = campaignIds.length > 0
        ? await this.fetchMetrics(campaignIds, dateStart, dateEnd, useCache)
        : [];

      logger.info('Dashboard data loaded', {
        campaigns: campaigns.length,
        metrics: metrics.length,
        adSets: adSets.length,
        ads: ads.length,
        source: 'API Meta (realtime)'
      });

      return {
        campaigns,
        metrics,
        adSets,
        ads,
        adAccounts,
        hasRealData: hasData
      };
    } catch (error) {
      logger.error('Erro ao buscar dados do dashboard', error);
      return {
        campaigns: [],
        metrics: [],
        adSets: [],
        ads: [],
        adAccounts: [],
        hasRealData: false
      };
    }
  }

  /**
   * Limpa o cache de métricas do serviço Meta
   * Útil quando o usuário quer forçar atualização dos dados
   */
  clearMetricsCache(): void {
    this.metaService.clearCache();
    logger.info('Cache de métricas limpo');
  }

  /**
   * Busca métricas agregadas para um período específico DIRETAMENTE DA API META
   * Útil para análises e relatórios em tempo real
   *
   * @param startDate Data de início do período
   * @param endDate Data de fim do período
   * @param campaignIds Array opcional de IDs de campanhas para filtrar
   * @param useCache Se true, usa cache em memória (padrão: true)
   * @returns Array de métricas do período diretamente da API
   */
  async fetchMetricsForPeriod(
    startDate: Date,
    endDate: Date,
    campaignIds?: string[],
    useCache: boolean = true
  ): Promise<AdMetrics[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.fetchMetrics(campaignIds, startDateStr, endDateStr, useCache);
  }
}
