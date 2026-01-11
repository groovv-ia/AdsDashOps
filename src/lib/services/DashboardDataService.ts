/**
 * Serviço para gerenciar dados do dashboard
 * ATUALIZADO: Agora usa workspace_id para isolamento multi-tenant
 *
 * Este serviço centraliza o acesso aos dados de campanhas, métricas e análises.
 * Busca dados do Supabase quando disponíveis e retorna no formato compatível
 * com os dados mockados existentes, garantindo compatibilidade total.
 */

import { supabase } from '../supabase';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../../types/advertising';

/**
 * Interface para filtros de dashboard
 */
export interface DashboardFilters {
  workspaceId: string;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  campaignIds?: string[];
}

export class DashboardDataService {
  private static instance: DashboardDataService;

  static getInstance(): DashboardDataService {
    if (!DashboardDataService.instance) {
      DashboardDataService.instance = new DashboardDataService();
    }
    return DashboardDataService.instance;
  }

  /**
   * Verifica se o workspace tem dados reais no banco
   * ATUALIZADO: Agora usa workspace_id para isolamento
   */
  async hasRealData(workspaceId: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      if (!workspaceId) {
        console.log('workspace_id é obrigatório para verificar dados');
        return false;
      }

      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Erro ao verificar dados reais:', error);
        return false;
      }

      const hasData = (count ?? 0) > 0;
      return hasData;
    } catch (error) {
      console.error('Erro ao verificar dados reais:', error);
      return false;
    }
  }

  /**
   * Busca campanhas do workspace
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchCampaigns(workspaceId: string, clientId?: string): Promise<Campaign[]> {
    try {
      if (!supabase) {
        console.log('fetchCampaigns: Supabase não disponível');
        return [];
      }

      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar campanhas');
        return [];
      }

      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar campanhas:', error);
        return [];
      }

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
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
  }

  /**
   * Busca métricas de anúncios do workspace
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchMetrics(workspaceId: string, clientId?: string, campaignIds?: string[]): Promise<AdMetrics[]> {
    try {
      if (!supabase) {
        console.log('fetchMetrics: Supabase não disponível');
        return [];
      }

      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar métricas');
        return [];
      }

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (campaignIds && campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar métricas:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return (data || []).map(metric => ({
        id: metric.id,
        campaign_id: metric.campaign_id,
        ad_set_id: metric.ad_set_id,
        ad_id: metric.ad_id,
        date: metric.date,
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: parseFloat(metric.spend || '0'),
        conversions: metric.conversions || 0,
        reach: metric.reach || 0,
        frequency: parseFloat(metric.frequency || '0'),
        ctr: parseFloat(metric.ctr || '0'),
        cpc: parseFloat(metric.cpc || '0'),
        roas: parseFloat(metric.roas || '0'),
        cost_per_result: parseFloat(metric.cost_per_result || '0')
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return [];
    }
  }

  /**
   * Busca conjuntos de anúncios (ad sets) do workspace
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchAdSets(workspaceId: string, clientId?: string): Promise<AdSet[]> {
    try {
      if (!supabase) return [];
      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar ad sets');
        return [];
      }

      let query = supabase
        .from('ad_sets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

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
   * Busca anúncios individuais do workspace
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchAds(workspaceId: string, clientId?: string): Promise<Ad[]> {
    try {
      if (!supabase) return [];
      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar ads');
        return [];
      }

      let query = supabase
        .from('ads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

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
   * Busca contas de anúncios conectadas do workspace
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchAdAccounts(workspaceId: string): Promise<AdAccount[]> {
    try {
      if (!supabase) return [];
      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar ad accounts');
        return [];
      }

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('type', 'advertising')
        .eq('status', 'connected');

      if (error) {
        console.error('Erro ao buscar ad accounts:', error);
        return [];
      }

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
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchAllDashboardData(workspaceId: string, clientId?: string): Promise<{
    campaigns: Campaign[];
    metrics: AdMetrics[];
    adSets: AdSet[];
    ads: Ad[];
    adAccounts: AdAccount[];
    hasRealData: boolean;
  }> {
    try {
      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar dados do dashboard');
        return {
          campaigns: [],
          metrics: [],
          adSets: [],
          ads: [],
          adAccounts: [],
          hasRealData: false
        };
      }

      const [campaigns, metrics, adSets, ads, adAccounts, hasData] = await Promise.all([
        this.fetchCampaigns(workspaceId, clientId),
        this.fetchMetrics(workspaceId, clientId),
        this.fetchAdSets(workspaceId, clientId),
        this.fetchAds(workspaceId, clientId),
        this.fetchAdAccounts(workspaceId),
        this.hasRealData(workspaceId)
      ]);

      return {
        campaigns,
        metrics,
        adSets,
        ads,
        adAccounts,
        hasRealData: hasData
      };
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
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
   * Busca métricas agregadas para um período específico
   * ATUALIZADO: Agora usa workspace_id como filtro obrigatório
   */
  async fetchMetricsForPeriod(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    clientId?: string,
    campaignIds?: string[]
  ): Promise<AdMetrics[]> {
    try {
      if (!supabase) return [];
      if (!workspaceId) {
        console.error('workspace_id é obrigatório para buscar métricas do período');
        return [];
      }

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (campaignIds && campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar métricas do período:', error);
        return [];
      }

      return (data || []).map(metric => ({
        id: metric.id,
        campaign_id: metric.campaign_id,
        ad_set_id: metric.ad_set_id,
        ad_id: metric.ad_id,
        date: metric.date,
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: parseFloat(metric.spend || '0'),
        conversions: metric.conversions || 0,
        reach: metric.reach || 0,
        frequency: parseFloat(metric.frequency || '0'),
        ctr: parseFloat(metric.ctr || '0'),
        cpc: parseFloat(metric.cpc || '0'),
        roas: parseFloat(metric.roas || '0'),
        cost_per_result: parseFloat(metric.cost_per_result || '0')
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas do período:', error);
      return [];
    }
  }
}
