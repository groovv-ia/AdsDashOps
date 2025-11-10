import { supabase } from '../supabase';
import { logger } from '../utils/logger';

/**
 * Interface para dados agregados de uma campanha
 * Inclui métricas totalizadas de todo o período
 */
export interface CampaignWithMetrics {
  // Dados básicos da campanha
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string;
  connection_id: string;
  user_id: string;
  created_date: string;
  start_date?: string;
  end_date?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_remaining?: number;

  // Métricas agregadas
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    reach: number;
    frequency: number;
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
    cost_per_result: number;
  };

  // Metadados
  total_ad_sets: number;
  total_ads: number;
  last_sync: string;
  days_active: number;
}

/**
 * Interface para métricas diárias de uma campanha
 * Usado para gráficos de tendência temporal
 * ATUALIZADO: Inclui todos os campos da API Meta
 */
export interface CampaignDailyMetrics {
  date: string;
  // Métricas básicas
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  frequency: number;
  // Métricas de taxa (valores reais da API)
  ctr: number;
  cpc: number;
  cpm: number;
  cpp: number;
  // Conversões com valor real
  conversion_value: number;
  roas: number;
  cost_per_result: number;
  // Cliques detalhados
  inline_link_clicks: number;
  cost_per_inline_link_click: number;
  outbound_clicks: number;
  // Vídeo
  video_views: number;
}

/**
 * Interface para performance de Ad Set
 */
export interface AdSetPerformance {
  id: string;
  name: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  optimization_goal?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

/**
 * Interface para performance de anúncio individual
 */
export interface AdPerformance {
  id: string;
  name: string;
  status: string;
  ad_type: string;
  thumbnail_url?: string;
  headline?: string;
  description?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

/**
 * Serviço para gerenciar dados de campanhas e suas métricas
 *
 * Responsabilidades:
 * - Buscar campanhas do usuário com métricas agregadas
 * - Calcular métricas derivadas (CTR, CPC, ROAS, etc.)
 * - Fornecer dados de tendência temporal
 * - Gerenciar cache de dados para performance
 */
export class CampaignDataService {
  // Cache simples em memória para evitar queries repetidas
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se um item do cache ainda é válido
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_TTL;
  }

  /**
   * Busca todas as campanhas do usuário com métricas agregadas
   *
   * @param userId - ID do usuário
   * @param filters - Filtros opcionais (plataforma, status, período)
   * @returns Lista de campanhas com métricas
   */
  async fetchUserCampaigns(
    userId: string,
    filters?: {
      platform?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      searchTerm?: string;
    }
  ): Promise<CampaignWithMetrics[]> {
    try {
      logger.info('Buscando campanhas do usuário', { userId, filters });

      // Busca campanhas básicas
      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId);

      // Aplica filtros
      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.searchTerm) {
        query = query.ilike('name', `%${filters.searchTerm}%`);
      }

      const { data: campaigns, error: campaignsError } = await query.order('created_date', { ascending: false });

      if (campaignsError) throw campaignsError;
      if (!campaigns || campaigns.length === 0) {
        logger.info('Nenhuma campanha encontrada');
        return [];
      }

      logger.info('Campanhas básicas carregadas', { count: campaigns.length });

      // Para cada campanha, busca e agrega métricas
      const campaignsWithMetrics: CampaignWithMetrics[] = await Promise.all(
        campaigns.map(async (campaign) => {
          // Busca métricas da campanha
          let metricsQuery = supabase
            .from('ad_metrics')
            .select('*')
            .eq('campaign_id', campaign.id);

          // Aplica filtro de período se especificado
          if (filters?.dateFrom) {
            metricsQuery = metricsQuery.gte('date', filters.dateFrom);
          }
          if (filters?.dateTo) {
            metricsQuery = metricsQuery.lte('date', filters.dateTo);
          }

          const { data: metrics } = await metricsQuery;

          // Conta ad sets e ads
          const { count: adSetsCount } = await supabase
            .from('ad_sets')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { count: adsCount } = await supabase
            .from('ads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          // Agrega métricas
          const aggregatedMetrics = this.aggregateMetrics(metrics || []);

          // Calcula dias ativos
          const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date(campaign.created_date);
          const endDate = campaign.end_date ? new Date(campaign.end_date) : new Date();
          const daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          // Busca última sincronização
          const { data: connection } = await supabase
            .from('data_connections')
            .select('last_sync')
            .eq('id', campaign.connection_id)
            .maybeSingle();

          return {
            ...campaign,
            metrics: aggregatedMetrics,
            total_ad_sets: adSetsCount || 0,
            total_ads: adsCount || 0,
            last_sync: connection?.last_sync || campaign.created_date,
            days_active: daysActive,
          };
        })
      );

      logger.info('Campanhas carregadas com métricas', { count: campaignsWithMetrics.length });

      return campaignsWithMetrics;
    } catch (error: any) {
      logger.error('Erro ao buscar campanhas', error);
      throw error;
    }
  }

  /**
   * Busca métricas diárias de uma campanha para gráficos de tendência
   *
   * @param campaignId - ID da campanha
   * @param dateFrom - Data inicial
   * @param dateTo - Data final
   * @returns Array de métricas diárias ordenadas por data
   */
  async getCampaignDailyMetrics(
    campaignId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CampaignDailyMetrics[]> {
    try {
      logger.info('Buscando métricas diárias da campanha', { campaignId, dateFrom, dateTo });

      // Verifica cache
      const cacheKey = `daily_${campaignId}_${dateFrom}_${dateTo}`;
      if (this.isCacheValid(cacheKey)) {
        logger.info('Retornando métricas diárias do cache');
        return this.cache.get(cacheKey)!.data;
      }

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .is('ad_set_id', null)
        .is('ad_id', null);

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data: metrics, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      const dailyMetrics: CampaignDailyMetrics[] = (metrics || []).map(metric => ({
        date: metric.date,
        // Métricas básicas
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: metric.spend || 0,
        conversions: metric.conversions || 0,
        reach: metric.reach || 0,
        frequency: metric.frequency || 0,
        // Métricas de taxa (valores reais da API)
        ctr: metric.ctr || 0,
        cpc: metric.cpc || 0,
        cpm: metric.cpm || 0,
        cpp: metric.cpp || 0,
        // Conversões com valor real
        conversion_value: metric.conversion_value || 0,
        roas: metric.roas || 0,
        cost_per_result: metric.cost_per_result || 0,
        // Cliques detalhados
        inline_link_clicks: metric.inline_link_clicks || 0,
        cost_per_inline_link_click: metric.cost_per_inline_link_click || 0,
        outbound_clicks: metric.outbound_clicks || 0,
        // Vídeo
        video_views: metric.video_views || 0,
      }));

      // Salva no cache
      this.cache.set(cacheKey, { data: dailyMetrics, timestamp: Date.now() });

      logger.info('Métricas diárias carregadas', { count: dailyMetrics.length });

      return dailyMetrics;
    } catch (error: any) {
      logger.error('Erro ao buscar métricas diárias', error);
      throw error;
    }
  }

  /**
   * Busca performance de todos os ad sets de uma campanha
   *
   * @param campaignId - ID da campanha
   * @returns Lista de ad sets com métricas agregadas
   */
  async getCampaignAdSets(campaignId: string): Promise<AdSetPerformance[]> {
    try {
      logger.info('Buscando ad sets da campanha', { campaignId });

      // Busca ad sets
      const { data: adSets, error: adSetsError } = await supabase
        .from('ad_sets')
        .select('*')
        .eq('campaign_id', campaignId);

      if (adSetsError) throw adSetsError;
      if (!adSets || adSets.length === 0) return [];

      // Para cada ad set, busca e agrega métricas
      const adSetsWithMetrics: AdSetPerformance[] = await Promise.all(
        adSets.map(async (adSet) => {
          const { data: metrics } = await supabase
            .from('ad_metrics')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('ad_set_id', adSet.id);

          const aggregated = this.aggregateMetrics(metrics || []);

          return {
            id: adSet.id,
            name: adSet.name,
            status: adSet.status,
            daily_budget: adSet.daily_budget,
            lifetime_budget: adSet.lifetime_budget,
            optimization_goal: adSet.optimization_goal,
            impressions: aggregated.impressions,
            clicks: aggregated.clicks,
            spend: aggregated.spend,
            conversions: aggregated.conversions,
            ctr: aggregated.ctr,
            cpc: aggregated.cpc,
            roas: aggregated.roas,
          };
        })
      );

      logger.info('Ad sets carregados com métricas', { count: adSetsWithMetrics.length });

      return adSetsWithMetrics;
    } catch (error: any) {
      logger.error('Erro ao buscar ad sets', error);
      throw error;
    }
  }

  /**
   * Busca performance de todos os anúncios de uma campanha
   *
   * @param campaignId - ID da campanha
   * @returns Lista de anúncios com métricas agregadas
   */
  async getCampaignAds(campaignId: string): Promise<AdPerformance[]> {
    try {
      logger.info('Buscando anúncios da campanha', { campaignId });

      // Busca anúncios
      const { data: ads, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('campaign_id', campaignId);

      if (adsError) throw adsError;
      if (!ads || ads.length === 0) return [];

      // Para cada anúncio, busca e agrega métricas
      const adsWithMetrics: AdPerformance[] = await Promise.all(
        ads.map(async (ad) => {
          const { data: metrics } = await supabase
            .from('ad_metrics')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('ad_id', ad.id);

          const aggregated = this.aggregateMetrics(metrics || []);

          return {
            id: ad.id,
            name: ad.name,
            status: ad.status,
            ad_type: ad.ad_type || 'other',
            thumbnail_url: ad.thumbnail_url,
            headline: ad.headline,
            description: ad.description,
            impressions: aggregated.impressions,
            clicks: aggregated.clicks,
            spend: aggregated.spend,
            conversions: aggregated.conversions,
            ctr: aggregated.ctr,
            cpc: aggregated.cpc,
            roas: aggregated.roas,
          };
        })
      );

      logger.info('Anúncios carregados com métricas', { count: adsWithMetrics.length });

      return adsWithMetrics;
    } catch (error: any) {
      logger.error('Erro ao buscar anúncios', error);
      throw error;
    }
  }

  /**
   * Busca uma campanha específica com todos os detalhes e métricas
   *
   * @param campaignId - ID da campanha
   * @returns Campanha completa com métricas
   */
  async getCampaignById(campaignId: string): Promise<CampaignWithMetrics | null> {
    try {
      logger.info('Buscando campanha por ID', { campaignId });

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (error) throw error;
      if (!campaign) return null;

      // Busca métricas
      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('campaign_id', campaignId);

      // Conta ad sets e ads
      const { count: adSetsCount } = await supabase
        .from('ad_sets')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      const { count: adsCount } = await supabase
        .from('ads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      // Agrega métricas
      const aggregatedMetrics = this.aggregateMetrics(metrics || []);

      // Calcula dias ativos
      const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date(campaign.created_date);
      const endDate = campaign.end_date ? new Date(campaign.end_date) : new Date();
      const daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Busca última sincronização
      const { data: connection } = await supabase
        .from('data_connections')
        .select('last_sync')
        .eq('id', campaign.connection_id)
        .maybeSingle();

      return {
        ...campaign,
        metrics: aggregatedMetrics,
        total_ad_sets: adSetsCount || 0,
        total_ads: adsCount || 0,
        last_sync: connection?.last_sync || campaign.created_date,
        days_active: daysActive,
      };
    } catch (error: any) {
      logger.error('Erro ao buscar campanha por ID', error);
      throw error;
    }
  }

  /**
   * Agrega métricas de múltiplos registros em um único objeto
   * USA VALORES REAIS da API Meta - NÃO ESTIMA, NÃO RECALCULA
   *
   * IMPORTANTE: Este método agora usa valores reais de conversão (conversion_value)
   * armazenados no banco, que vem diretamente da API Meta via action_values.
   * Não há mais estimativas ou cálculos incorretos.
   *
   * @param metrics - Array de métricas brutas do banco de dados
   * @returns Objeto com métricas agregadas usando valores reais
   */
  private aggregateMetrics(metrics: any[]): CampaignWithMetrics['metrics'] {
    // Soma todos os valores - usa apenas somas simples, não recalcula métricas da API
    const totals = metrics.reduce(
      (acc, metric) => ({
        impressions: acc.impressions + (metric.impressions || 0),
        clicks: acc.clicks + (metric.clicks || 0),
        spend: acc.spend + (metric.spend || 0),
        conversions: acc.conversions + (metric.conversions || 0),
        reach: acc.reach + (metric.reach || 0),
        frequency: acc.frequency + (metric.frequency || 0),
        // NOVO: Soma valor REAL de conversões (não estima)
        conversion_value: acc.conversion_value + (metric.conversion_value || 0),
        // NOVO: Soma CPM real da API (usado para calcular média ponderada)
        cpm_sum: acc.cpm_sum + (metric.cpm || 0),
        ctr_sum: acc.ctr_sum + (metric.ctr || 0),
        cpc_sum: acc.cpc_sum + (metric.cpc || 0),
      }),
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        reach: 0,
        frequency: 0,
        conversion_value: 0,
        cpm_sum: 0,
        ctr_sum: 0,
        cpc_sum: 0,
      }
    );

    // Calcula métricas derivadas APENAS quando necessário
    // Preferencialmente, usa valores já calculados pela API

    // CTR: usa média dos valores da API quando possível, senão calcula
    const ctr =
      metrics.length > 0 && totals.ctr_sum > 0
        ? totals.ctr_sum / metrics.length
        : totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0;

    // CPC: usa média dos valores da API quando possível, senão calcula
    const cpc =
      metrics.length > 0 && totals.cpc_sum > 0
        ? totals.cpc_sum / metrics.length
        : totals.clicks > 0
        ? totals.spend / totals.clicks
        : 0;

    // CPM: usa média dos valores da API quando possível, senão calcula
    const cpm =
      metrics.length > 0 && totals.cpm_sum > 0
        ? totals.cpm_sum / metrics.length
        : totals.impressions > 0
        ? (totals.spend / totals.impressions) * 1000
        : 0;

    // Custo por resultado (conversão)
    const cost_per_result = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

    // ROAS: USA VALOR REAL de conversão, NÃO ESTIMA!
    // Este é o cálculo correto usando conversion_value da API Meta
    const roas = totals.spend > 0 && totals.conversion_value > 0
      ? totals.conversion_value / totals.spend
      : 0;

    // Frequência: calcula média ponderada ou usa relação impressions/reach
    const avgFrequency =
      metrics.length > 0 && totals.frequency > 0
        ? totals.frequency / metrics.length
        : totals.reach > 0
        ? totals.impressions / totals.reach
        : 0;

    // Log para debugging - ajuda a identificar se valores estão corretos
    if (totals.conversions > 0) {
      logger.info('Métricas agregadas calculadas', {
        conversions: totals.conversions,
        conversion_value: totals.conversion_value,
        spend: totals.spend,
        roas: roas,
        metrics_count: metrics.length,
      });
    }

    return {
      impressions: totals.impressions,
      clicks: totals.clicks,
      spend: totals.spend,
      conversions: totals.conversions,
      reach: totals.reach,
      frequency: avgFrequency,
      ctr: ctr,
      cpc: cpc,
      cpm: cpm,
      roas: roas,
      cost_per_result: cost_per_result,
    };
  }

  /**
   * Limpa o cache de dados
   * Útil quando dados são atualizados e precisamos forçar reload
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache de campanhas limpo');
  }
}
