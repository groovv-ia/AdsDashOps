/**
 * MetaInsightsDataService
 *
 * Servico responsavel por buscar e agregar dados da tabela meta_insights_daily
 * para exibicao nas paginas de campanhas e analises.
 *
 * Este servico faz a ponte entre os dados sincronizados pelo Meta Ads Sync
 * e os componentes de visualizacao de campanhas.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';

/**
 * Interface para campanha com metricas do Meta Insights
 */
export interface MetaCampaignData {
  // Identificadores
  entity_id: string;
  entity_name: string;
  level: 'campaign' | 'adset' | 'ad';
  meta_ad_account_id: string;

  // Status e objetivo (do cache de entidades)
  status?: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;

  // Metricas agregadas
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    reach: number;
    frequency: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
    conversion_value: number;
    roas: number;
    cost_per_result: number;
  };

  // Metadados
  first_date: string;
  last_date: string;
  days_with_data: number;

  // Relacionamentos (para adsets e ads)
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
}

/**
 * Interface para metricas diarias do Meta Insights
 */
export interface MetaDailyMetrics {
  date: string;
  entity_id: string;
  entity_name: string;
  level: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversion_value: number;
  roas: number;
  cost_per_result: number;
  unique_clicks: number;
}

/**
 * Interface para insights brutos do banco de dados
 */
interface RawInsight {
  id: string;
  workspace_id: string;
  client_id?: string;
  meta_ad_account_id: string;
  level: string;
  entity_id: string;
  entity_name: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpp: number;
  frequency: number;
  conversions: number;
  conversion_value: number;
  unique_clicks: number;
  action_values_json?: Record<string, unknown>;
}

/**
 * Interface para entidade em cache
 */
interface CachedEntity {
  id: string;
  entity_id: string;
  entity_type: string;
  name: string;
  effective_status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  campaign_id?: string;
  adset_id?: string;
}

/**
 * Opcoes de filtro para busca de dados
 */
export interface MetaInsightsFilterOptions {
  workspaceId?: string;
  clientId?: string;
  metaAdAccountId?: string;
  level?: 'campaign' | 'adset' | 'ad';
  entityIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Classe principal do servico de dados do Meta Insights
 */
export class MetaInsightsDataService {
  // Cache em memoria para evitar queries repetidas
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se item do cache ainda e valido
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.CACHE_TTL;
  }

  /**
   * Busca o workspace_id do usuario atual
   */
  private async getUserWorkspaceId(): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_user_workspace_id');

    if (error) {
      logger.error('Erro ao buscar workspace_id', error);
      return null;
    }

    return data;
  }

  /**
   * Busca todas as campanhas com metricas agregadas do Meta Insights
   *
   * @param options - Opcoes de filtro
   * @returns Lista de campanhas com metricas agregadas
   */
  async fetchCampaignsWithMetrics(
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaCampaignData[]> {
    try {
      logger.info('Buscando campanhas do Meta Insights', { options });

      // Obtem workspace_id se nao fornecido
      const workspaceId = options.workspaceId || await this.getUserWorkspaceId();
      if (!workspaceId) {
        logger.warn('Workspace ID nao encontrado');
        return [];
      }

      // Busca insights agregados por campanha
      let query = supabase
        .from('meta_insights_daily')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('level', 'campaign');

      // Aplica filtros
      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options.metaAdAccountId) {
        query = query.eq('meta_ad_account_id', options.metaAdAccountId);
      }
      if (options.dateFrom) {
        query = query.gte('date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('date', options.dateTo);
      }
      if (options.entityIds && options.entityIds.length > 0) {
        query = query.in('entity_id', options.entityIds);
      }

      const { data: insights, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      if (!insights || insights.length === 0) {
        logger.info('Nenhum insight de campanha encontrado');
        return [];
      }

      // Busca entidades do cache para obter status e objetivo
      const entityIds = [...new Set(insights.map((i: RawInsight) => i.entity_id))];
      const entities = await this.fetchEntityDetails(workspaceId, entityIds, 'campaign');

      // Agrega metricas por campanha
      const campaignsMap = new Map<string, MetaCampaignData>();

      for (const insight of insights as RawInsight[]) {
        const existing = campaignsMap.get(insight.entity_id);
        const entity = entities.find(e => e.entity_id === insight.entity_id);

        if (existing) {
          // Soma metricas
          existing.metrics.impressions += insight.impressions || 0;
          existing.metrics.clicks += insight.clicks || 0;
          existing.metrics.spend += insight.spend || 0;
          existing.metrics.reach += insight.reach || 0;
          existing.metrics.conversions += insight.conversions || 0;
          existing.metrics.conversion_value += insight.conversion_value || 0;
          existing.days_with_data += 1;

          // Atualiza datas
          if (insight.date < existing.first_date) existing.first_date = insight.date;
          if (insight.date > existing.last_date) existing.last_date = insight.date;
        } else {
          // Cria nova entrada
          campaignsMap.set(insight.entity_id, {
            entity_id: insight.entity_id,
            entity_name: insight.entity_name || entity?.name || insight.entity_id,
            level: 'campaign',
            meta_ad_account_id: insight.meta_ad_account_id,
            status: entity?.effective_status || 'UNKNOWN',
            objective: entity?.objective,
            daily_budget: entity?.daily_budget,
            lifetime_budget: entity?.lifetime_budget,
            metrics: {
              impressions: insight.impressions || 0,
              clicks: insight.clicks || 0,
              spend: insight.spend || 0,
              reach: insight.reach || 0,
              frequency: insight.frequency || 0,
              ctr: 0, // Calculado depois
              cpc: 0, // Calculado depois
              cpm: 0, // Calculado depois
              conversions: insight.conversions || 0,
              conversion_value: insight.conversion_value || 0,
              roas: 0, // Calculado depois
              cost_per_result: 0, // Calculado depois
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
          });
        }
      }

      // Calcula metricas derivadas para cada campanha
      const campaigns = Array.from(campaignsMap.values()).map(campaign => {
        const m = campaign.metrics;

        // CTR = (cliques / impressoes) * 100
        m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;

        // CPC = gasto / cliques
        m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;

        // CPM = (gasto / impressoes) * 1000
        m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;

        // Frequencia = impressoes / alcance
        m.frequency = m.reach > 0 ? m.impressions / m.reach : 0;

        // ROAS = valor_conversao / gasto
        m.roas = m.spend > 0 && m.conversion_value > 0 ? m.conversion_value / m.spend : 0;

        // Custo por resultado = gasto / conversoes
        m.cost_per_result = m.conversions > 0 ? m.spend / m.conversions : 0;

        return campaign;
      });

      // Ordena por gasto (maior primeiro)
      campaigns.sort((a, b) => b.metrics.spend - a.metrics.spend);

      logger.info('Campanhas carregadas do Meta Insights', { count: campaigns.length });

      return campaigns;
    } catch (error) {
      logger.error('Erro ao buscar campanhas do Meta Insights', error);
      throw error;
    }
  }

  /**
   * Busca AdSets de uma campanha especifica
   *
   * @param campaignId - ID da campanha no Meta
   * @param options - Opcoes de filtro
   * @returns Lista de AdSets com metricas
   */
  async fetchCampaignAdSets(
    campaignId: string,
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaCampaignData[]> {
    try {
      logger.info('Buscando AdSets da campanha', { campaignId, options });

      const workspaceId = options.workspaceId || await this.getUserWorkspaceId();
      if (!workspaceId) return [];

      // Primeiro busca os adsets da campanha no cache de entidades
      const { data: adsetEntities, error: entitiesError } = await supabase
        .from('meta_entities_cache')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', 'adset')
        .eq('campaign_id', campaignId);

      if (entitiesError) throw entitiesError;

      const adsetIds = (adsetEntities || []).map((e: CachedEntity) => e.entity_id);
      if (adsetIds.length === 0) {
        logger.info('Nenhum adset encontrado para a campanha');
        return [];
      }

      // Busca insights dos adsets
      let query = supabase
        .from('meta_insights_daily')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('level', 'adset')
        .in('entity_id', adsetIds);

      if (options.dateFrom) {
        query = query.gte('date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('date', options.dateTo);
      }

      const { data: insights, error } = await query;

      if (error) throw error;

      // Agrega metricas por adset
      const adsetsMap = new Map<string, MetaCampaignData>();

      for (const insight of (insights || []) as RawInsight[]) {
        const entity = (adsetEntities || []).find((e: CachedEntity) => e.entity_id === insight.entity_id);
        const existing = adsetsMap.get(insight.entity_id);

        if (existing) {
          existing.metrics.impressions += insight.impressions || 0;
          existing.metrics.clicks += insight.clicks || 0;
          existing.metrics.spend += insight.spend || 0;
          existing.metrics.reach += insight.reach || 0;
          existing.metrics.conversions += insight.conversions || 0;
          existing.metrics.conversion_value += insight.conversion_value || 0;
          existing.days_with_data += 1;
        } else {
          adsetsMap.set(insight.entity_id, {
            entity_id: insight.entity_id,
            entity_name: insight.entity_name || entity?.name || insight.entity_id,
            level: 'adset',
            meta_ad_account_id: insight.meta_ad_account_id,
            status: entity?.effective_status || 'UNKNOWN',
            daily_budget: entity?.daily_budget,
            lifetime_budget: entity?.lifetime_budget,
            campaign_id: campaignId,
            metrics: {
              impressions: insight.impressions || 0,
              clicks: insight.clicks || 0,
              spend: insight.spend || 0,
              reach: insight.reach || 0,
              frequency: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              conversions: insight.conversions || 0,
              conversion_value: insight.conversion_value || 0,
              roas: 0,
              cost_per_result: 0,
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
          });
        }
      }

      // Calcula metricas derivadas
      const adsets = Array.from(adsetsMap.values()).map(adset => {
        this.calculateDerivedMetrics(adset.metrics);
        return adset;
      });

      adsets.sort((a, b) => b.metrics.spend - a.metrics.spend);

      return adsets;
    } catch (error) {
      logger.error('Erro ao buscar adsets da campanha', error);
      throw error;
    }
  }

  /**
   * Busca Ads de uma campanha especifica
   *
   * @param campaignId - ID da campanha no Meta
   * @param options - Opcoes de filtro
   * @returns Lista de Ads com metricas
   */
  async fetchCampaignAds(
    campaignId: string,
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaCampaignData[]> {
    try {
      logger.info('Buscando Ads da campanha', { campaignId, options });

      const workspaceId = options.workspaceId || await this.getUserWorkspaceId();
      if (!workspaceId) return [];

      // Busca ads da campanha no cache de entidades
      const { data: adEntities, error: entitiesError } = await supabase
        .from('meta_entities_cache')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', 'ad')
        .eq('campaign_id', campaignId);

      if (entitiesError) throw entitiesError;

      const adIds = (adEntities || []).map((e: CachedEntity) => e.entity_id);
      if (adIds.length === 0) {
        logger.info('Nenhum ad encontrado para a campanha');
        return [];
      }

      // Busca insights dos ads
      let query = supabase
        .from('meta_insights_daily')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('level', 'ad')
        .in('entity_id', adIds);

      if (options.dateFrom) {
        query = query.gte('date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('date', options.dateTo);
      }

      const { data: insights, error } = await query;

      if (error) throw error;

      // Agrega metricas por ad
      const adsMap = new Map<string, MetaCampaignData>();

      for (const insight of (insights || []) as RawInsight[]) {
        const entity = (adEntities || []).find((e: CachedEntity) => e.entity_id === insight.entity_id);
        const existing = adsMap.get(insight.entity_id);

        if (existing) {
          existing.metrics.impressions += insight.impressions || 0;
          existing.metrics.clicks += insight.clicks || 0;
          existing.metrics.spend += insight.spend || 0;
          existing.metrics.reach += insight.reach || 0;
          existing.metrics.conversions += insight.conversions || 0;
          existing.metrics.conversion_value += insight.conversion_value || 0;
          existing.days_with_data += 1;
        } else {
          adsMap.set(insight.entity_id, {
            entity_id: insight.entity_id,
            entity_name: insight.entity_name || entity?.name || insight.entity_id,
            level: 'ad',
            meta_ad_account_id: insight.meta_ad_account_id,
            status: entity?.effective_status || 'UNKNOWN',
            campaign_id: campaignId,
            adset_id: entity?.adset_id,
            metrics: {
              impressions: insight.impressions || 0,
              clicks: insight.clicks || 0,
              spend: insight.spend || 0,
              reach: insight.reach || 0,
              frequency: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              conversions: insight.conversions || 0,
              conversion_value: insight.conversion_value || 0,
              roas: 0,
              cost_per_result: 0,
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
          });
        }
      }

      // Calcula metricas derivadas
      const ads = Array.from(adsMap.values()).map(ad => {
        this.calculateDerivedMetrics(ad.metrics);
        return ad;
      });

      ads.sort((a, b) => b.metrics.spend - a.metrics.spend);

      return ads;
    } catch (error) {
      logger.error('Erro ao buscar ads da campanha', error);
      throw error;
    }
  }

  /**
   * Busca metricas diarias de uma campanha para graficos
   *
   * @param campaignId - ID da campanha no Meta
   * @param options - Opcoes de filtro
   * @returns Metricas diarias ordenadas por data
   */
  async fetchDailyMetrics(
    campaignId: string,
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaDailyMetrics[]> {
    try {
      logger.info('Buscando metricas diarias da campanha', { campaignId, options });

      const workspaceId = options.workspaceId || await this.getUserWorkspaceId();
      if (!workspaceId) return [];

      let query = supabase
        .from('meta_insights_daily')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('level', 'campaign')
        .eq('entity_id', campaignId)
        .order('date', { ascending: true });

      if (options.dateFrom) {
        query = query.gte('date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('date', options.dateTo);
      }

      const { data: insights, error } = await query;

      if (error) throw error;

      const dailyMetrics: MetaDailyMetrics[] = (insights || []).map((insight: RawInsight) => ({
        date: insight.date,
        entity_id: insight.entity_id,
        entity_name: insight.entity_name,
        level: insight.level,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        spend: insight.spend || 0,
        reach: insight.reach || 0,
        frequency: insight.frequency || 0,
        ctr: insight.ctr || 0,
        cpc: insight.cpc || 0,
        cpm: insight.cpm || 0,
        conversions: insight.conversions || 0,
        conversion_value: insight.conversion_value || 0,
        roas: insight.spend > 0 && insight.conversion_value > 0
          ? insight.conversion_value / insight.spend
          : 0,
        cost_per_result: insight.conversions > 0
          ? insight.spend / insight.conversions
          : 0,
        unique_clicks: insight.unique_clicks || 0,
      }));

      return dailyMetrics;
    } catch (error) {
      logger.error('Erro ao buscar metricas diarias', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de uma campanha especifica por entity_id
   *
   * @param entityId - ID da entidade no Meta
   * @param options - Opcoes de filtro
   * @returns Dados da campanha ou null
   */
  async getCampaignByEntityId(
    entityId: string,
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaCampaignData | null> {
    try {
      const campaigns = await this.fetchCampaignsWithMetrics({
        ...options,
        entityIds: [entityId],
      });

      return campaigns.length > 0 ? campaigns[0] : null;
    } catch (error) {
      logger.error('Erro ao buscar campanha por entity_id', error);
      return null;
    }
  }

  /**
   * Busca detalhes das entidades no cache
   */
  private async fetchEntityDetails(
    workspaceId: string,
    entityIds: string[],
    entityType: string
  ): Promise<CachedEntity[]> {
    if (entityIds.length === 0) return [];

    const { data, error } = await supabase
      .from('meta_entities_cache')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .in('entity_id', entityIds);

    if (error) {
      logger.error('Erro ao buscar entidades do cache', error);
      return [];
    }

    return (data || []) as CachedEntity[];
  }

  /**
   * Calcula metricas derivadas (CTR, CPC, CPM, ROAS)
   */
  private calculateDerivedMetrics(metrics: MetaCampaignData['metrics']): void {
    metrics.ctr = metrics.impressions > 0
      ? (metrics.clicks / metrics.impressions) * 100
      : 0;

    metrics.cpc = metrics.clicks > 0
      ? metrics.spend / metrics.clicks
      : 0;

    metrics.cpm = metrics.impressions > 0
      ? (metrics.spend / metrics.impressions) * 1000
      : 0;

    metrics.frequency = metrics.reach > 0
      ? metrics.impressions / metrics.reach
      : 0;

    metrics.roas = metrics.spend > 0 && metrics.conversion_value > 0
      ? metrics.conversion_value / metrics.spend
      : 0;

    metrics.cost_per_result = metrics.conversions > 0
      ? metrics.spend / metrics.conversions
      : 0;
  }

  /**
   * Limpa o cache de dados
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache do MetaInsightsDataService limpo');
  }
}

// Exporta instancia singleton
export const metaInsightsService = new MetaInsightsDataService();
