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
  entity_id: string;
  entity_name: string;
  level: 'campaign' | 'adset' | 'ad';
  meta_ad_account_id: string;
  status?: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
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
    messaging_conversations_started: number;
    cost_per_messaging_conversation_started: number;
    leads: number;
    cost_per_lead: number;
  };
  first_date: string;
  last_date: string;
  days_with_data: number;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  /** Indica que o periodo inclui o dia corrente, cujos dados ainda podem mudar */
  is_partial_day: boolean;
  /** Indica que o reach e uma estimativa (maximo diario) pois nao pode ser somado entre dias */
  is_estimated_reach: boolean;
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
  // Novas metricas de conversas e leads
  messaging_conversations_started: number;
  cost_per_messaging_conversation_started: number;
  leads: number;
  cost_per_lead: number;
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
  frequency: number;
  unique_clicks: number;
  actions_json?: Record<string, unknown>;
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
 * Extrai conversoes do campo actions_json
 * O Meta retorna acoes em um formato de array com action_type e value
 */
function extractConversions(actionsJson: Record<string, unknown> | string | null | undefined): number {
  if (!actionsJson) return 0;

  // Se for string, tenta parsear como JSON
  let parsedJson = actionsJson;
  if (typeof actionsJson === 'string') {
    try {
      parsedJson = JSON.parse(actionsJson);
    } catch {
      return 0;
    }
  }

  // Se for um array, soma os valores relevantes
  if (Array.isArray(parsedJson)) {
    let total = 0;
    for (const action of parsedJson) {
      const actionType = action?.action_type || '';
      // Tipos de acao que contam como conversao
      if (
        actionType.includes('purchase') ||
        actionType.includes('lead') ||
        actionType.includes('complete_registration') ||
        actionType.includes('add_to_cart') ||
        actionType === 'offsite_conversion.fb_pixel_purchase' ||
        actionType === 'omni_purchase'
      ) {
        total += parseFloat(action?.value || '0');
      }
    }
    return total;
  }

  // Se for objeto, tenta acessar diretamente
  if (typeof parsedJson === 'object' && parsedJson !== null) {
    const purchase = (parsedJson as Record<string, number>)['purchase'] || 0;
    const lead = (parsedJson as Record<string, number>)['lead'] || 0;
    return purchase + lead;
  }

  return 0;
}

/**
 * Extrai conversas iniciadas do campo actions_json
 * O Meta retorna conversas iniciadas com action_type contendo "messaging_conversation_started"
 */
function extractMessagingConversationsStarted(actionsJson: Record<string, unknown> | string | null | undefined): number {
  if (!actionsJson) return 0;

  // Se for string, tenta parsear como JSON
  let parsedJson = actionsJson;
  if (typeof actionsJson === 'string') {
    try {
      parsedJson = JSON.parse(actionsJson);
    } catch {
      return 0;
    }
  }

  // Se for um array, soma os valores relevantes
  if (Array.isArray(parsedJson)) {
    let total = 0;
    for (const action of parsedJson) {
      const actionType = action?.action_type || '';
      // Tipos de acao que contam como conversas iniciadas
      if (
        actionType.includes('messaging_conversation_started') ||
        actionType.includes('onsite_conversion.messaging_conversation_started') ||
        actionType === 'onsite_conversion.messaging_conversation_started_7d'
      ) {
        total += parseFloat(action?.value || '0');
      }
    }
    return total;
  }

  // Se for objeto, tenta acessar diretamente
  if (typeof parsedJson === 'object' && parsedJson !== null) {
    const conversations = (parsedJson as Record<string, number>)['messaging_conversation_started'] || 0;
    return conversations;
  }

  return 0;
}

/**
 * Extrai leads do campo actions_json
 * O Meta retorna leads com action_type contendo "lead"
 */
function extractLeads(actionsJson: Record<string, unknown> | string | null | undefined): number {
  if (!actionsJson) return 0;

  // Se for string, tenta parsear como JSON
  let parsedJson = actionsJson;
  if (typeof actionsJson === 'string') {
    try {
      parsedJson = JSON.parse(actionsJson);
    } catch {
      return 0;
    }
  }

  // Se for um array, soma os valores relevantes
  if (Array.isArray(parsedJson)) {
    let total = 0;
    for (const action of parsedJson) {
      const actionType = action?.action_type || '';
      // Tipos de acao que contam como leads (usa apenas 'lead' para evitar duplicacao)
      if (actionType === 'lead') {
        total += parseFloat(action?.value || '0');
      }
    }
    return total;
  }

  // Se for objeto, tenta acessar diretamente
  if (typeof parsedJson === 'object' && parsedJson !== null) {
    const leads = (parsedJson as Record<string, number>)['lead'] || 0;
    return leads;
  }

  return 0;
}

/**
 * Extrai valor de conversao do campo action_values_json
 */
function extractConversionValue(actionValuesJson: Record<string, unknown> | string | null | undefined): number {
  if (!actionValuesJson) return 0;

  // Se for string, tenta parsear como JSON
  let parsedJson = actionValuesJson;
  if (typeof actionValuesJson === 'string') {
    try {
      parsedJson = JSON.parse(actionValuesJson);
    } catch {
      return 0;
    }
  }

  // Se for um array, soma os valores relevantes
  if (Array.isArray(parsedJson)) {
    let total = 0;
    for (const action of parsedJson) {
      const actionType = action?.action_type || '';
      if (
        actionType.includes('purchase') ||
        actionType === 'offsite_conversion.fb_pixel_purchase' ||
        actionType === 'omni_purchase'
      ) {
        total += parseFloat(action?.value || '0');
      }
    }
    return total;
  }

  // Se for objeto, tenta acessar diretamente
  if (typeof parsedJson === 'object' && parsedJson !== null) {
    const purchase = (parsedJson as Record<string, number>)['purchase'] || 0;
    return purchase;
  }

  return 0;
}

/**
 * Retorna a data de hoje no timezone America/Sao_Paulo (formato YYYY-MM-DD).
 * Usado para detectar se o periodo inclui dados parciais do dia corrente.
 */
function getTodayDateBRT(): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fallback para UTC
  }
  return now.toISOString().split('T')[0];
}

/**
 * Classe principal do servico de dados do Meta Insights
 */
export class MetaInsightsDataService {
  /**
   * Busca o workspace_id do usuario atual
   */
  private async getUserWorkspaceId(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_workspace_id');

      if (error) {
        logger.error('Erro ao buscar workspace_id via RPC', error);

        // Fallback: busca diretamente na tabela workspaces
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (wsError || !workspace) {
          logger.error('Erro ao buscar workspace diretamente', wsError);
          return null;
        }

        return workspace.id;
      }

      return data;
    } catch (err) {
      logger.error('Erro ao buscar workspace_id', err);
      return null;
    }
  }

  /**
   * Busca todas as campanhas com metricas agregadas do Meta Insights
   */
  async fetchCampaignsWithMetrics(
    options: MetaInsightsFilterOptions = {}
  ): Promise<MetaCampaignData[]> {
    try {
      logger.info('Buscando campanhas do Meta Insights', { options });

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
      const todayBRT = getTodayDateBRT();

      for (const insight of insights as RawInsight[]) {
        const existing = campaignsMap.get(insight.entity_id);
        const entity = entities.find(e => e.entity_id === insight.entity_id);

        const conversions = extractConversions(insight.actions_json);
        const conversionValue = extractConversionValue(insight.action_values_json);
        const messagingConversationsStarted = extractMessagingConversationsStarted(insight.actions_json);
        const leads = extractLeads(insight.actions_json);

        if (existing) {
          existing.metrics.impressions += Number(insight.impressions) || 0;
          existing.metrics.clicks += Number(insight.clicks) || 0;
          existing.metrics.spend += Number(insight.spend) || 0;
          // Reach e metrica de unicos: usa o MAIOR valor diario como estimativa conservadora
          // Somar reach entre dias inflaria o valor, pois a mesma pessoa pode ser contada em dias diferentes
          existing.metrics.reach = Math.max(existing.metrics.reach, Number(insight.reach) || 0);
          existing.metrics.conversions += conversions;
          existing.metrics.conversion_value += conversionValue;
          existing.metrics.messaging_conversations_started += messagingConversationsStarted;
          existing.metrics.leads += leads;
          existing.days_with_data += 1;

          // Detecta se o periodo inclui o dia corrente (dados parciais)
          if (insight.date === todayBRT) {
            existing.is_partial_day = true;
          }

          if (insight.date < existing.first_date) existing.first_date = insight.date;
          if (insight.date > existing.last_date) existing.last_date = insight.date;
        } else {
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
              impressions: Number(insight.impressions) || 0,
              clicks: Number(insight.clicks) || 0,
              spend: Number(insight.spend) || 0,
              reach: Number(insight.reach) || 0,
              frequency: Number(insight.frequency) || 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              conversions: conversions,
              conversion_value: conversionValue,
              roas: 0,
              cost_per_result: 0,
              messaging_conversations_started: messagingConversationsStarted,
              cost_per_messaging_conversation_started: 0,
              leads: leads,
              cost_per_lead: 0,
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
            is_partial_day: insight.date === todayBRT,
            is_estimated_reach: false,
          });
        }
      }

      // Calcula metricas derivadas e marca reach como estimativa quando multi-dia
      const campaigns = Array.from(campaignsMap.values()).map(campaign => {
        if (campaign.days_with_data > 1) {
          campaign.is_estimated_reach = true;
        }
        this.calculateDerivedMetrics(campaign.metrics);
        return campaign;
      });

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
      const todayBRT = getTodayDateBRT();

      for (const insight of (insights || []) as RawInsight[]) {
        const entity = (adsetEntities || []).find((e: CachedEntity) => e.entity_id === insight.entity_id);
        const existing = adsetsMap.get(insight.entity_id);
        const conversions = extractConversions(insight.actions_json);
        const conversionValue = extractConversionValue(insight.action_values_json);
        const messagingConversationsStarted = extractMessagingConversationsStarted(insight.actions_json);
        const leads = extractLeads(insight.actions_json);

        if (existing) {
          existing.metrics.impressions += Number(insight.impressions) || 0;
          existing.metrics.clicks += Number(insight.clicks) || 0;
          existing.metrics.spend += Number(insight.spend) || 0;
          // Reach: usa maximo diario (metrica de unicos nao pode ser somada)
          existing.metrics.reach = Math.max(existing.metrics.reach, Number(insight.reach) || 0);
          existing.metrics.conversions += conversions;
          existing.metrics.conversion_value += conversionValue;
          existing.metrics.messaging_conversations_started += messagingConversationsStarted;
          existing.metrics.leads += leads;
          existing.days_with_data += 1;
          if (insight.date === todayBRT) existing.is_partial_day = true;
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
              impressions: Number(insight.impressions) || 0,
              clicks: Number(insight.clicks) || 0,
              spend: Number(insight.spend) || 0,
              reach: Number(insight.reach) || 0,
              frequency: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              conversions: conversions,
              conversion_value: conversionValue,
              roas: 0,
              cost_per_result: 0,
              messaging_conversations_started: messagingConversationsStarted,
              cost_per_messaging_conversation_started: 0,
              leads: leads,
              cost_per_lead: 0,
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
            is_partial_day: insight.date === todayBRT,
            is_estimated_reach: false,
          });
        }
      }

      const adsets = Array.from(adsetsMap.values()).map(adset => {
        if (adset.days_with_data > 1) adset.is_estimated_reach = true;
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
      const todayBRT = getTodayDateBRT();

      for (const insight of (insights || []) as RawInsight[]) {
        const entity = (adEntities || []).find((e: CachedEntity) => e.entity_id === insight.entity_id);
        const existing = adsMap.get(insight.entity_id);
        const conversions = extractConversions(insight.actions_json);
        const conversionValue = extractConversionValue(insight.action_values_json);
        const messagingConversationsStarted = extractMessagingConversationsStarted(insight.actions_json);
        const leads = extractLeads(insight.actions_json);

        if (existing) {
          existing.metrics.impressions += Number(insight.impressions) || 0;
          existing.metrics.clicks += Number(insight.clicks) || 0;
          existing.metrics.spend += Number(insight.spend) || 0;
          // Reach: usa maximo diario (metrica de unicos nao pode ser somada)
          existing.metrics.reach = Math.max(existing.metrics.reach, Number(insight.reach) || 0);
          existing.metrics.conversions += conversions;
          existing.metrics.conversion_value += conversionValue;
          existing.metrics.messaging_conversations_started += messagingConversationsStarted;
          existing.metrics.leads += leads;
          existing.days_with_data += 1;
          if (insight.date === todayBRT) existing.is_partial_day = true;
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
              impressions: Number(insight.impressions) || 0,
              clicks: Number(insight.clicks) || 0,
              spend: Number(insight.spend) || 0,
              reach: Number(insight.reach) || 0,
              frequency: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              conversions: conversions,
              conversion_value: conversionValue,
              roas: 0,
              cost_per_result: 0,
              messaging_conversations_started: messagingConversationsStarted,
              cost_per_messaging_conversation_started: 0,
              leads: leads,
              cost_per_lead: 0,
            },
            first_date: insight.date,
            last_date: insight.date,
            days_with_data: 1,
            is_partial_day: insight.date === todayBRT,
            is_estimated_reach: false,
          });
        }
      }

      const ads = Array.from(adsMap.values()).map(ad => {
        if (ad.days_with_data > 1) ad.is_estimated_reach = true;
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

      const dailyMetrics: MetaDailyMetrics[] = (insights || []).map((insight: RawInsight) => {
        const conversions = extractConversions(insight.actions_json);
        const conversionValue = extractConversionValue(insight.action_values_json);
        const messagingConversationsStarted = extractMessagingConversationsStarted(insight.actions_json);
        const leads = extractLeads(insight.actions_json);
        const spend = Number(insight.spend) || 0;

        return {
          date: insight.date,
          entity_id: insight.entity_id,
          entity_name: insight.entity_name,
          level: insight.level,
          impressions: Number(insight.impressions) || 0,
          clicks: Number(insight.clicks) || 0,
          spend: spend,
          reach: Number(insight.reach) || 0,
          frequency: Number(insight.frequency) || 0,
          ctr: Number(insight.ctr) || 0,
          cpc: Number(insight.cpc) || 0,
          cpm: Number(insight.cpm) || 0,
          conversions: conversions,
          conversion_value: conversionValue,
          roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : 0,
          cost_per_result: conversions > 0 ? spend / conversions : 0,
          unique_clicks: Number(insight.unique_clicks) || 0,
          messaging_conversations_started: messagingConversationsStarted,
          cost_per_messaging_conversation_started: messagingConversationsStarted > 0 ? spend / messagingConversationsStarted : 0,
          leads: leads,
          cost_per_lead: leads > 0 ? spend / leads : 0,
        };
      });

      return dailyMetrics;
    } catch (error) {
      logger.error('Erro ao buscar metricas diarias', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de uma campanha especifica por entity_id
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
   * Calcula metricas derivadas (CTR, CPC, CPM, ROAS, custo por conversa, custo por lead)
   */
  private calculateDerivedMetrics(metrics: MetaCampaignData['metrics']): void {
    // Metricas basicas
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

    // Novas metricas: custo por conversa iniciada e custo por lead
    metrics.cost_per_messaging_conversation_started = metrics.messaging_conversations_started > 0
      ? metrics.spend / metrics.messaging_conversations_started
      : 0;

    metrics.cost_per_lead = metrics.leads > 0
      ? metrics.spend / metrics.leads
      : 0;
  }
}

// Exporta instancia singleton
export const metaInsightsService = new MetaInsightsDataService();
