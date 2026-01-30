/**
 * GoogleInsightsDataService
 *
 * Servico responsavel por buscar e processar dados do Google Ads
 * armazenados no banco de dados Supabase.
 *
 * Funcionalidades:
 * - Buscar campanhas com metricas agregadas
 * - Buscar grupos de anuncios de uma campanha
 * - Buscar anuncios e keywords
 * - Agregar metricas por periodo
 * - Filtrar por conta, status e datas
 */

import { supabase } from '../supabase';

// ============================================
// Tipos e Interfaces
// ============================================

/**
 * Representa uma campanha do Google Ads com metricas agregadas
 */
export interface GoogleCampaignWithMetrics {
  id: string;
  campaign_id: string;
  customer_id: string;
  account_id: string | null;
  name: string;
  status: string;
  advertising_channel_type: string | null;
  bidding_strategy_type: string | null;
  budget_amount_micros: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // Metricas agregadas
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

/**
 * Representa um grupo de anuncios com metricas
 */
export interface GoogleAdGroupWithMetrics {
  id: string;
  ad_group_id: string;
  campaign_id: string;
  customer_id: string;
  name: string;
  status: string;
  type: string | null;
  cpc_bid_micros: number;
  // Metricas agregadas
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  roas: number;
}

/**
 * Representa um anuncio com metricas
 */
export interface GoogleAdWithMetrics {
  id: string;
  ad_id: string;
  ad_group_id: string;
  campaign_id: string;
  customer_id: string;
  name: string | null;
  status: string;
  type: string | null;
  final_urls: string[];
  headlines: string[];
  descriptions: string[];
  // Metricas agregadas
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

/**
 * Representa uma palavra-chave com metricas
 */
export interface GoogleKeywordWithMetrics {
  id: string;
  keyword_id: string;
  ad_group_id: string;
  campaign_id: string;
  customer_id: string;
  text: string;
  match_type: string;
  status: string;
  quality_score: number | null;
  cpc_bid_micros: number;
  // Metricas agregadas
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

/**
 * Metricas diarias do Google Ads
 */
export interface GoogleDailyMetric {
  date: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string | null;
  ad_group_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  keyword_id: string | null;
  keyword_text: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

/**
 * Resumo de metricas agregadas
 */
export interface GoogleMetricsSummary {
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgRoas: number;
}

/**
 * Filtros para busca de dados
 */
export interface GoogleDataFilters {
  workspaceId: string;
  accountIds?: string[];
  campaignIds?: string[];
  adGroupIds?: string[];
  status?: string;
  dateFrom: string;
  dateTo: string;
}

// ============================================
// Classe Principal do Servico
// ============================================

export class GoogleInsightsDataService {
  private workspaceId: string | null = null;

  /**
   * Define o workspace atual para as consultas
   */
  setWorkspace(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  /**
   * Busca o workspace do usuario atual
   */
  async getCurrentWorkspace(): Promise<string | null> {
    if (this.workspaceId) return this.workspaceId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Tenta buscar workspace como owner
    const { data: ownedWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      this.workspaceId = ownedWorkspace.id;
      return ownedWorkspace.id;
    }

    // Tenta buscar como membro
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      this.workspaceId = membership.workspace_id;
      return membership.workspace_id;
    }

    return null;
  }

  // ============================================
  // Busca de Campanhas
  // ============================================

  /**
   * Busca todas as campanhas do Google Ads com metricas agregadas
   */
  async getCampaignsWithMetrics(
    dateFrom: string,
    dateTo: string,
    filters?: {
      accountIds?: string[];
      status?: string;
    }
  ): Promise<GoogleCampaignWithMetrics[]> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) {
      console.error('[GoogleInsightsDataService] Workspace nao encontrado');
      return [];
    }

    // Busca campanhas
    let campaignsQuery = supabase
      .from('google_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (filters?.accountIds && filters.accountIds.length > 0) {
      campaignsQuery = campaignsQuery.in('account_id', filters.accountIds);
    }

    if (filters?.status && filters.status !== 'all') {
      campaignsQuery = campaignsQuery.eq('status', filters.status);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      console.error('[GoogleInsightsDataService] Erro ao buscar campanhas:', campaignsError);
      return [];
    }

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    // Busca metricas agregadas para cada campanha
    const campaignIds = campaigns.map((c) => c.campaign_id);

    const { data: metrics, error: metricsError } = await supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('campaign_id', campaignIds)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .is('ad_group_id', null);

    if (metricsError) {
      console.error('[GoogleInsightsDataService] Erro ao buscar metricas:', metricsError);
    }

    // Agrega metricas por campanha
    const metricsMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversion_value: number;
    }>();

    (metrics || []).forEach((m) => {
      const existing = metricsMap.get(m.campaign_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversion_value: 0,
      };

      metricsMap.set(m.campaign_id, {
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        cost: existing.cost + (m.cost || 0),
        conversions: existing.conversions + (m.conversions || 0),
        conversion_value: existing.conversion_value + (m.conversion_value || 0),
      });
    });

    // Combina campanhas com metricas
    return campaigns.map((campaign) => {
      const campaignMetrics = metricsMap.get(campaign.campaign_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversion_value: 0,
      };

      const ctr = campaignMetrics.impressions > 0
        ? (campaignMetrics.clicks / campaignMetrics.impressions) * 100
        : 0;
      const cpc = campaignMetrics.clicks > 0
        ? campaignMetrics.cost / campaignMetrics.clicks
        : 0;
      const cpm = campaignMetrics.impressions > 0
        ? (campaignMetrics.cost / campaignMetrics.impressions) * 1000
        : 0;
      const roas = campaignMetrics.cost > 0
        ? campaignMetrics.conversion_value / campaignMetrics.cost
        : 0;

      return {
        id: campaign.id,
        campaign_id: campaign.campaign_id,
        customer_id: campaign.customer_id,
        account_id: campaign.account_id,
        name: campaign.name,
        status: campaign.status,
        advertising_channel_type: campaign.advertising_channel_type,
        bidding_strategy_type: campaign.bidding_strategy_type,
        budget_amount_micros: campaign.budget_amount_micros || 0,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        impressions: campaignMetrics.impressions,
        clicks: campaignMetrics.clicks,
        cost: campaignMetrics.cost,
        conversions: campaignMetrics.conversions,
        conversion_value: campaignMetrics.conversion_value,
        ctr,
        cpc,
        cpm,
        roas,
      };
    });
  }

  // ============================================
  // Busca de Ad Groups
  // ============================================

  /**
   * Busca grupos de anuncios de uma campanha com metricas
   */
  async getAdGroupsWithMetrics(
    campaignId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<GoogleAdGroupWithMetrics[]> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) return [];

    // Busca ad groups da campanha
    const { data: adGroups, error: adGroupsError } = await supabase
      .from('google_ad_groups')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId);

    if (adGroupsError || !adGroups) {
      console.error('[GoogleInsightsDataService] Erro ao buscar ad groups:', adGroupsError);
      return [];
    }

    // Busca metricas por ad group
    const adGroupIds = adGroups.map((ag) => ag.ad_group_id);

    const { data: metrics } = await supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId)
      .in('ad_group_id', adGroupIds)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    // Agrega metricas
    const metricsMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversion_value: number;
    }>();

    (metrics || []).forEach((m) => {
      if (!m.ad_group_id) return;

      const existing = metricsMap.get(m.ad_group_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversion_value: 0,
      };

      metricsMap.set(m.ad_group_id, {
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        cost: existing.cost + (m.cost || 0),
        conversions: existing.conversions + (m.conversions || 0),
        conversion_value: existing.conversion_value + (m.conversion_value || 0),
      });
    });

    return adGroups.map((adGroup) => {
      const agMetrics = metricsMap.get(adGroup.ad_group_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversion_value: 0,
      };

      const ctr = agMetrics.impressions > 0
        ? (agMetrics.clicks / agMetrics.impressions) * 100
        : 0;
      const cpc = agMetrics.clicks > 0
        ? agMetrics.cost / agMetrics.clicks
        : 0;
      const roas = agMetrics.cost > 0
        ? agMetrics.conversion_value / agMetrics.cost
        : 0;

      return {
        id: adGroup.id,
        ad_group_id: adGroup.ad_group_id,
        campaign_id: adGroup.campaign_id,
        customer_id: adGroup.customer_id,
        name: adGroup.name,
        status: adGroup.status,
        type: adGroup.type,
        cpc_bid_micros: adGroup.cpc_bid_micros || 0,
        impressions: agMetrics.impressions,
        clicks: agMetrics.clicks,
        cost: agMetrics.cost,
        conversions: agMetrics.conversions,
        conversion_value: agMetrics.conversion_value,
        ctr,
        cpc,
        roas,
      };
    });
  }

  // ============================================
  // Busca de Anuncios
  // ============================================

  /**
   * Busca anuncios de um ad group com metricas
   */
  async getAdsWithMetrics(
    adGroupId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<GoogleAdWithMetrics[]> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) return [];

    const { data: ads, error } = await supabase
      .from('google_ads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('ad_group_id', adGroupId);

    if (error || !ads) {
      console.error('[GoogleInsightsDataService] Erro ao buscar anuncios:', error);
      return [];
    }

    // Busca metricas por anuncio
    const adIds = ads.map((a) => a.ad_id);

    const { data: metrics } = await supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('ad_group_id', adGroupId)
      .in('ad_id', adIds)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    const metricsMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
    }>();

    (metrics || []).forEach((m) => {
      if (!m.ad_id) return;

      const existing = metricsMap.get(m.ad_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };

      metricsMap.set(m.ad_id, {
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        cost: existing.cost + (m.cost || 0),
        conversions: existing.conversions + (m.conversions || 0),
      });
    });

    return ads.map((ad) => {
      const adMetrics = metricsMap.get(ad.ad_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };

      const ctr = adMetrics.impressions > 0
        ? (adMetrics.clicks / adMetrics.impressions) * 100
        : 0;
      const cpc = adMetrics.clicks > 0
        ? adMetrics.cost / adMetrics.clicks
        : 0;

      return {
        id: ad.id,
        ad_id: ad.ad_id,
        ad_group_id: ad.ad_group_id,
        campaign_id: ad.campaign_id,
        customer_id: ad.customer_id,
        name: ad.name,
        status: ad.status,
        type: ad.type,
        final_urls: ad.final_urls || [],
        headlines: ad.headlines || [],
        descriptions: ad.descriptions || [],
        impressions: adMetrics.impressions,
        clicks: adMetrics.clicks,
        cost: adMetrics.cost,
        conversions: adMetrics.conversions,
        ctr,
        cpc,
      };
    });
  }

  // ============================================
  // Busca de Keywords
  // ============================================

  /**
   * Busca palavras-chave de um ad group com metricas
   */
  async getKeywordsWithMetrics(
    adGroupId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<GoogleKeywordWithMetrics[]> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) return [];

    const { data: keywords, error } = await supabase
      .from('google_keywords')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('ad_group_id', adGroupId);

    if (error || !keywords) {
      console.error('[GoogleInsightsDataService] Erro ao buscar keywords:', error);
      return [];
    }

    // Busca metricas por keyword
    const keywordIds = keywords.map((k) => k.keyword_id);

    const { data: metrics } = await supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('ad_group_id', adGroupId)
      .in('keyword_id', keywordIds)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    const metricsMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
    }>();

    (metrics || []).forEach((m) => {
      if (!m.keyword_id) return;

      const existing = metricsMap.get(m.keyword_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };

      metricsMap.set(m.keyword_id, {
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        cost: existing.cost + (m.cost || 0),
        conversions: existing.conversions + (m.conversions || 0),
      });
    });

    return keywords.map((keyword) => {
      const kwMetrics = metricsMap.get(keyword.keyword_id) || {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };

      const ctr = kwMetrics.impressions > 0
        ? (kwMetrics.clicks / kwMetrics.impressions) * 100
        : 0;
      const cpc = kwMetrics.clicks > 0
        ? kwMetrics.cost / kwMetrics.clicks
        : 0;

      return {
        id: keyword.id,
        keyword_id: keyword.keyword_id,
        ad_group_id: keyword.ad_group_id,
        campaign_id: keyword.campaign_id,
        customer_id: keyword.customer_id,
        text: keyword.text,
        match_type: keyword.match_type,
        status: keyword.status,
        quality_score: keyword.quality_score,
        cpc_bid_micros: keyword.cpc_bid_micros || 0,
        impressions: kwMetrics.impressions,
        clicks: kwMetrics.clicks,
        cost: kwMetrics.cost,
        conversions: kwMetrics.conversions,
        ctr,
        cpc,
      };
    });
  }

  // ============================================
  // Metricas Diarias
  // ============================================

  /**
   * Busca metricas diarias para graficos de evolucao
   */
  async getDailyMetrics(
    campaignId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<GoogleDailyMetric[]> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) return [];

    const { data, error } = await supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .is('ad_group_id', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('[GoogleInsightsDataService] Erro ao buscar metricas diarias:', error);
      return [];
    }

    return data || [];
  }

  // ============================================
  // Resumo de Metricas
  // ============================================

  /**
   * Calcula resumo de metricas para todas as campanhas
   */
  async getMetricsSummary(
    dateFrom: string,
    dateTo: string,
    accountIds?: string[]
  ): Promise<GoogleMetricsSummary> {
    const campaigns = await this.getCampaignsWithMetrics(dateFrom, dateTo, {
      accountIds,
      status: 'all',
    });

    if (campaigns.length === 0) {
      return {
        totalImpressions: 0,
        totalClicks: 0,
        totalCost: 0,
        totalConversions: 0,
        totalConversionValue: 0,
        avgCtr: 0,
        avgCpc: 0,
        avgCpm: 0,
        avgRoas: 0,
      };
    }

    const totals = campaigns.reduce(
      (acc, campaign) => ({
        impressions: acc.impressions + campaign.impressions,
        clicks: acc.clicks + campaign.clicks,
        cost: acc.cost + campaign.cost,
        conversions: acc.conversions + campaign.conversions,
        conversion_value: acc.conversion_value + campaign.conversion_value,
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
    );

    return {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalCost: totals.cost,
      totalConversions: totals.conversions,
      totalConversionValue: totals.conversion_value,
      avgCtr: totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0,
      avgCpc: totals.clicks > 0
        ? totals.cost / totals.clicks
        : 0,
      avgCpm: totals.impressions > 0
        ? (totals.cost / totals.impressions) * 1000
        : 0,
      avgRoas: totals.cost > 0
        ? totals.conversion_value / totals.cost
        : 0,
    };
  }

  // ============================================
  // Busca de Contas
  // ============================================

  /**
   * Busca todas as contas Google Ads conectadas
   */
  async getAccounts(): Promise<Array<{
    id: string;
    customer_id: string;
    name: string;
    is_selected: boolean;
    last_sync_at: string | null;
  }>> {
    const workspaceId = await this.getCurrentWorkspace();
    if (!workspaceId) return [];

    const { data, error } = await supabase
      .from('google_ad_accounts')
      .select('id, customer_id, name, is_selected, last_sync_at')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) {
      console.error('[GoogleInsightsDataService] Erro ao buscar contas:', error);
      return [];
    }

    return data || [];
  }
}

// ============================================
// Instancia Singleton
// ============================================

export const googleInsightsService = new GoogleInsightsDataService();
