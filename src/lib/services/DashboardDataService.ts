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
   * @param clientId - ID do cliente para filtrar (opcional)
   */
  async hasRealData(clientId?: string | null): Promise<boolean> {
    try {
      if (!supabase) return false;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('❌ hasRealData: Usuário não autenticado');
        return false;
      }

      let query = supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('❌ Erro ao verificar dados reais:', error);
        return false;
      }

      const hasData = (count ?? 0) > 0;
      console.log(`✅ hasRealData: ${hasData} (${count} campanhas encontradas${clientId ? ' para cliente ' + clientId : ''})`);

      return hasData;
    } catch (error) {
      console.error('❌ Erro ao verificar dados reais:', error);
      return false;
    }
  }

  /**
   * Busca campanhas do usuário autenticado
   * @param clientId - ID do cliente para filtrar (opcional). Se null, busca de todos os clientes
   */
  async fetchCampaigns(clientId?: string | null): Promise<Campaign[]> {
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

      console.log('🔍 Buscando campanhas do usuário:', user.user.id, clientId ? `(cliente: ${clientId})` : '(todos os clientes)');

      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.user.id);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_date', { ascending: false });

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
   * @param clientId - ID do cliente para filtrar (opcional)
   * @param campaignIds - IDs de campanhas específicas para filtrar (opcional)
   */
  async fetchMetrics(clientId?: string | null, campaignIds?: string[]): Promise<AdMetrics[]> {
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

      console.log('🔍 Buscando métricas do usuário:', user.user.id, clientId ? `(cliente: ${clientId})` : '', campaignIds ? `(${campaignIds.length} campanhas)` : '');

      let query = supabase
        .from('ad_metrics')
        .select('*')
        .eq('user_id', user.user.id);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      // Aplica filtro de campanhas se fornecido
      if (campaignIds && campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds);
      }

      query = query.order('date', { ascending: false });

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
   * @param clientId - ID do cliente para filtrar (opcional)
   */
  async fetchAdSets(clientId?: string | null): Promise<AdSet[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      let query = supabase
        .from('ad_sets')
        .select('*')
        .eq('user_id', user.user.id);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
   * @param clientId - ID do cliente para filtrar (opcional)
   */
  async fetchAds(clientId?: string | null): Promise<Ad[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      let query = supabase
        .from('ads')
        .select('*')
        .eq('user_id', user.user.id);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
   * @param clientId - ID do cliente para filtrar (opcional)
   */
  async fetchAdAccounts(clientId?: string | null): Promise<AdAccount[]> {
    try {
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // NOTA: Agora buscamos de oauth_tokens ao invés de data_connections
      let query = supabase
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('platform', 'meta')
        .eq('is_active', true);

      // Filtra por cliente se fornecido
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar ad accounts:', error);
        return [];
      }

      // Transforma oauth_tokens em contas de anúncios
      return (data || []).map(token => ({
        id: token.id,
        name: token.account_name || `Meta Account ${token.account_id}`,
        platform: 'Meta',
        account_id: token.account_id || token.id,
        is_active: token.is_active
      }));
    } catch (error) {
      console.error('Erro ao buscar ad accounts:', error);
      return [];
    }
  }

  /**
   * Busca todos os dados necessários para o dashboard de uma vez
   * @param clientId - ID do cliente para filtrar (opcional). Se null, busca de todos os clientes
   */
  async fetchAllDashboardData(clientId?: string | null): Promise<{
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
        this.fetchCampaigns(clientId),
        this.fetchMetrics(clientId),
        this.fetchAdSets(clientId),
        this.fetchAds(clientId),
        this.fetchAdAccounts(clientId),
        this.hasRealData(clientId)
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
