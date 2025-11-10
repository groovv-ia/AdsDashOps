/**
 * Serviço para gerenciar dados do dashboard
 *
 * Este serviço centraliza o acesso aos dados de campanhas, métricas e análises.
 * Busca dados do Supabase quando disponíveis e retorna no formato compatível
 * com os dados mockados existentes, garantindo compatibilidade total.
 */

import { supabase } from '../supabase';
import { Campaign, AdMetrics, AdSet, Ad, AdAccount } from '../../types/advertising';

export class DashboardDataService {
  private static instance: DashboardDataService;

  // Singleton pattern para garantir uma única instância
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
   * Busca métricas de anúncios do usuário
   * Pode filtrar por IDs de campanhas específicas
   * ATUALIZADO: Retorna array vazio se não houver métricas (sem erro)
   */
  async fetchMetrics(campaignIds?: string[]): Promise<AdMetrics[]> {
    try {
      if (!supabase) {
        console.log('❌ fetchMetrics: Supabase não disponível');
        return [];
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('❌ fetchMetrics: Usuário não autenticado');
        return [];
      }

      console.log('🔍 Buscando métricas do usuário:', user.user.id, campaignIds ? `para ${campaignIds.length} campanhas` : '');

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('user_id', user.user.id)
        .order('date', { ascending: false });

      // Aplica filtro de campanhas se fornecido
      if (campaignIds && campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        return [];
      }

      console.log(`✅ ${data?.length || 0} métricas encontradas`);

      // Se não há métricas, retorna array vazio (não é erro)
      if (!data || data.length === 0) {
        console.log('⚠️ Nenhuma métrica encontrada - campanhas sem dados de performance');
        return [];
      }

      // Transforma dados do banco para formato esperado
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
      console.error('❌ Erro ao buscar métricas:', error);
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
   * Retorna objeto com todas as entidades
   */
  async fetchAllDashboardData(): Promise<{
    campaigns: Campaign[];
    metrics: AdMetrics[];
    adSets: AdSet[];
    ads: Ad[];
    adAccounts: AdAccount[];
    hasRealData: boolean;
  }> {
    try {
      // Executa todas as buscas em paralelo para melhor performance
      const [campaigns, metrics, adSets, ads, adAccounts, hasData] = await Promise.all([
        this.fetchCampaigns(),
        this.fetchMetrics(),
        this.fetchAdSets(),
        this.fetchAds(),
        this.fetchAdAccounts(),
        this.hasRealData()
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
   * Útil para análises e relatórios
   */
  async fetchMetricsForPeriod(startDate: Date, endDate: Date, campaignIds?: string[]): Promise<AdMetrics[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('user_id', user.user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

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
