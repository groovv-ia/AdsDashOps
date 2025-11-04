import { supabase } from '../supabase';
import { logger } from '../utils/logger';

/**
 * Serviço responsável por sincronizar dados da Meta Ads API
 * Busca campanhas, ad sets, ads e métricas diretamente da API do Facebook
 */
export class MetaSyncService {
  private baseUrl = 'https://graph.facebook.com/v19.0';
  private accessToken: string;

  constructor(accessToken?: string) {
    // Usa token passado ou busca do ambiente
    this.accessToken = accessToken || import.meta.env.VITE_META_ACCESS_TOKEN || '';
  }

  /**
   * Sincroniza todos os dados de uma conexão Meta
   * @param connectionId ID da conexão no banco de dados
   */
  async syncConnection(connectionId: string): Promise<void> {
    try {
      logger.info('Iniciando sincronização Meta', { connectionId });

      // Atualiza status para sincronizando
      await supabase
        .from('data_connections')
        .update({ status: 'syncing' })
        .eq('id', connectionId);

      // Busca dados da conexão
      const { data: connection } = await supabase
        .from('data_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (!connection) throw new Error('Conexão não encontrada');

      // Busca token OAuth se não foi passado no construtor
      if (!this.accessToken) {
        const { data: tokenData } = await supabase
          .from('oauth_tokens')
          .select('access_token')
          .eq('connection_id', connectionId)
          .single();

        if (tokenData?.access_token) {
          this.accessToken = tokenData.access_token;
        }
      }

      const accountId = connection.config?.accountId;
      if (!accountId) throw new Error('Account ID não encontrado');

      // 1. Busca campanhas
      logger.info('Buscando campanhas Meta');
      const campaigns = await this.fetchCampaigns(accountId);
      logger.info('Campanhas encontradas', { count: campaigns.length });

      // 2. Salva campanhas no banco
      for (const campaign of campaigns) {
        await this.saveCampaign(connectionId, campaign);

        // 3. Busca ad sets de cada campanha
        const adSets = await this.fetchAdSets(campaign.id);
        logger.info('Ad Sets encontrados', { campaignId: campaign.id, count: adSets.length });

        // 4. Salva ad sets no banco
        for (const adSet of adSets) {
          await this.saveAdSet(connectionId, campaign.id, adSet);

          // 5. Busca anúncios de cada ad set
          const ads = await this.fetchAds(adSet.id);
          logger.info('Anúncios encontrados', { adSetId: adSet.id, count: ads.length });

          // 6. Salva anúncios no banco
          for (const ad of ads) {
            await this.saveAd(connectionId, campaign.id, adSet.id, ad);
          }
        }

        // 7. Busca métricas da campanha (últimos 30 dias)
        const dateEnd = new Date().toISOString().split('T')[0];
        const dateStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const insights = await this.fetchInsights(campaign.id, dateStart, dateEnd);
        logger.info('Métricas encontradas', { campaignId: campaign.id, count: insights.length });

        // 8. Salva métricas no banco
        for (const insight of insights) {
          await this.saveMetrics(connectionId, campaign.id, insight);
        }
      }

      // Atualiza status para conectado
      await supabase
        .from('data_connections')
        .update({
          status: 'connected',
          last_sync: new Date().toISOString()
        })
        .eq('id', connectionId);

      logger.info('Sincronização Meta concluída', { connectionId });
    } catch (error: any) {
      logger.error('Erro na sincronização Meta', error, { connectionId });

      // Atualiza status para erro
      await supabase
        .from('data_connections')
        .update({ status: 'error' })
        .eq('id', connectionId);

      throw error;
    }
  }

  /**
   * Busca todas as campanhas de uma conta
   */
  private async fetchCampaigns(accountId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${accountId}/campaigns?fields=id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    return data.data || [];
  }

  /**
   * Busca todos os ad sets de uma campanha
   */
  private async fetchAdSets(campaignId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    return data.data || [];
  }

  /**
   * Busca todos os anúncios de um ad set
   */
  private async fetchAds(adSetId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${adSetId}/ads?fields=id,name,status,creative{title,body,image_url}&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    return data.data || [];
  }

  /**
   * Busca métricas/insights de uma campanha
   */
  private async fetchInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<any[]> {
    const url = `${this.baseUrl}/${campaignId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc,actions,action_values&time_range={"since":"${dateStart}","until":"${dateEnd}"}&time_increment=1&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`);
    }

    return data.data || [];
  }

  /**
   * Salva uma campanha no banco de dados
   */
  private async saveCampaign(connectionId: string, campaign: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('campaigns')
      .upsert({
        id: campaign.id,
        connection_id: connectionId,
        user_id: user.id,
        name: campaign.name,
        platform: 'Meta',
        status: campaign.status,
        objective: campaign.objective,
        created_date: campaign.created_time,
        start_date: campaign.start_time,
        end_date: campaign.stop_time,
        daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
        lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
        budget_remaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
  }

  /**
   * Salva um ad set no banco de dados
   */
  private async saveAdSet(connectionId: string, campaignId: string, adSet: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('ad_sets')
      .upsert({
        id: adSet.id,
        campaign_id: campaignId,
        connection_id: connectionId,
        user_id: user.id,
        name: adSet.name,
        status: adSet.status,
        daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
        lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
        targeting: JSON.stringify(adSet.targeting || {}),
        optimization_goal: adSet.optimization_goal,
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
  }

  /**
   * Salva um anúncio no banco de dados
   */
  private async saveAd(connectionId: string, campaignId: string, adSetId: string, ad: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('ads')
      .upsert({
        id: ad.id,
        ad_set_id: adSetId,
        campaign_id: campaignId,
        connection_id: connectionId,
        user_id: user.id,
        name: ad.name,
        status: ad.status,
        ad_type: ad.creative?.object_type || 'other',
        headline: ad.creative?.title,
        description: ad.creative?.body,
        thumbnail_url: ad.creative?.image_url,
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
  }

  /**
   * Salva métricas no banco de dados
   */
  private async saveMetrics(connectionId: string, campaignId: string, insight: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Extrai conversões das actions
    const actions = insight.actions || [];
    const conversions = actions.find((a: any) =>
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'purchase'
    )?.value || 0;

    // Extrai valor das conversões
    const actionValues = insight.action_values || [];
    const conversionValue = actionValues.find((a: any) =>
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'purchase'
    )?.value || 0;

    const spend = parseFloat(insight.spend || '0');
    const roas = conversionValue > 0 && spend > 0 ? conversionValue / spend : 0;

    const { error } = await supabase
      .from('ad_metrics')
      .upsert({
        connection_id: connectionId,
        user_id: user.id,
        campaign_id: campaignId,
        date: insight.date_start,
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: spend,
        reach: parseInt(insight.reach || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        cpc: parseFloat(insight.cpc || '0'),
        conversions: parseFloat(conversions),
        roas: roas,
      }, {
        onConflict: 'connection_id,campaign_id,date'
      });

    if (error) throw error;
  }
}
