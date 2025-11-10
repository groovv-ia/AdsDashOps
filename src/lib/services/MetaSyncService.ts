import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { decryptData } from '../utils/encryption';

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
   * Valida o token de acesso testando uma chamada simples à API
   */
  private async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      logger.info('Validando token com API Meta', {
        tokenPrefix: this.accessToken.substring(0, 20) + '...',
        tokenLength: this.accessToken.length
      });

      const url = `${this.baseUrl}/me?access_token=${this.accessToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        logger.error('Token inválido na API Meta', {
          errorCode: data.error.code,
          errorType: data.error.type,
          errorMessage: data.error.message,
          errorSubcode: data.error.error_subcode
        });
        return {
          valid: false,
          error: `${data.error.message} (Code: ${data.error.code})`
        };
      }

      logger.info('Token validado com sucesso na API Meta', {
        userId: data.id,
        userName: data.name
      });
      return { valid: true };
    } catch (error: any) {
      logger.error('Erro ao validar token', {
        error: error.message,
        stack: error.stack
      });
      return {
        valid: false,
        error: `Erro de conexão: ${error.message}`
      };
    }
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
        const { data: tokenData, error: tokenError } = await supabase
          .from('oauth_tokens')
          .select('access_token')
          .eq('connection_id', connectionId)
          .maybeSingle();

        if (tokenError) {
          logger.error('Erro ao buscar token no banco', tokenError);
          throw new Error(`Erro ao buscar token: ${tokenError.message}`);
        }

        if (!tokenData?.access_token) {
          logger.error('Token não encontrado no banco', { connectionId });
          throw new Error('Token de acesso não encontrado no banco de dados');
        }

        logger.info('Token encontrado no banco', {
          connectionId,
          tokenPrefix: tokenData.access_token.substring(0, 20) + '...',
          tokenLength: tokenData.access_token.length
        });

        // Verifica se o token parece estar criptografado (tokens Meta começam com EAA)
        const looksEncrypted = !tokenData.access_token.startsWith('EAA');

        if (looksEncrypted) {
          try {
            // Descriptografa o token antes de usar
            logger.info('Token parece estar criptografado, tentando descriptografar');
            this.accessToken = decryptData(tokenData.access_token).trim();
            logger.info('Token descriptografado com sucesso', {
              tokenLength: this.accessToken.length,
              tokenPrefix: this.accessToken.substring(0, 20) + '...'
            });
          } catch (decryptError: any) {
            logger.error('Erro ao descriptografar token', {
              error: decryptError.message,
              tokenPrefix: tokenData.access_token.substring(0, 20) + '...'
            });
            throw new Error(`Falha ao descriptografar token: ${decryptError.message}`);
          }
        } else {
          // Token não está criptografado, usa direto
          logger.info('Token não parece estar criptografado, usando diretamente');
          this.accessToken = tokenData.access_token.trim();
        }
      }

      if (!this.accessToken) {
        throw new Error('Token de acesso não encontrado');
      }

      logger.info('Iniciando validação do token');

      // Valida o token antes de prosseguir
      const validation = await this.validateToken();
      if (!validation.valid) {
        const errorMsg = validation.error || 'Token inválido';
        logger.error('Validação do token falhou', { error: errorMsg });
        throw new Error(`Validação do token falhou: ${errorMsg}`);
      }

      logger.info('Token validado com sucesso, prosseguindo com sincronização');

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

    logger.info('Buscando campanhas da Meta API', { accountId, url: url.replace(this.accessToken, 'TOKEN_HIDDEN') });

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      logger.error('Erro na Meta API ao buscar campanhas', data.error);
      throw new Error(`Meta API Error: ${data.error.message} (Code: ${data.error.code}, Type: ${data.error.type})`);
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

    // Verifica se a campanha já existe
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign.id)
      .maybeSingle();

    const campaignData = {
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      start_date: campaign.start_time,
      end_date: campaign.stop_time,
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
      budget_remaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
    };

    if (existing) {
      // Atualiza campanha existente
      const { error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', campaign.id);
      if (error) throw error;
    } else {
      // Insere nova campanha
      const { error } = await supabase
        .from('campaigns')
        .insert({
          id: campaign.id,
          connection_id: connectionId,
          user_id: user.id,
          platform: 'Meta',
          created_date: campaign.created_time,
          ...campaignData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva um ad set no banco de dados
   */
  private async saveAdSet(connectionId: string, campaignId: string, adSet: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verifica se o ad set já existe
    const { data: existing } = await supabase
      .from('ad_sets')
      .select('id')
      .eq('id', adSet.id)
      .maybeSingle();

    const adSetData = {
      name: adSet.name,
      status: adSet.status,
      daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
      lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
      targeting: JSON.stringify(adSet.targeting || {}),
      optimization_goal: adSet.optimization_goal,
    };

    if (existing) {
      // Atualiza ad set existente
      const { error } = await supabase
        .from('ad_sets')
        .update(adSetData)
        .eq('id', adSet.id);
      if (error) throw error;
    } else {
      // Insere novo ad set
      const { error } = await supabase
        .from('ad_sets')
        .insert({
          id: adSet.id,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          ...adSetData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva um anúncio no banco de dados
   */
  private async saveAd(connectionId: string, campaignId: string, adSetId: string, ad: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verifica se o anúncio já existe
    const { data: existing } = await supabase
      .from('ads')
      .select('id')
      .eq('id', ad.id)
      .maybeSingle();

    const adData = {
      name: ad.name,
      status: ad.status,
      ad_type: ad.creative?.object_type || 'other',
      headline: ad.creative?.title,
      description: ad.creative?.body,
      thumbnail_url: ad.creative?.image_url,
    };

    if (existing) {
      // Atualiza anúncio existente
      const { error } = await supabase
        .from('ads')
        .update(adData)
        .eq('id', ad.id);
      if (error) throw error;
    } else {
      // Insere novo anúncio
      const { error } = await supabase
        .from('ads')
        .insert({
          id: ad.id,
          ad_set_id: adSetId,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          ...adData,
        });
      if (error) throw error;
    }
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

    // Verifica se a métrica já existe (usando a unique constraint)
    const { data: existing } = await supabase
      .from('ad_metrics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('date', insight.date_start)
      .is('ad_set_id', null)
      .is('ad_id', null)
      .maybeSingle();

    const metricsData = {
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: spend,
      reach: parseInt(insight.reach || '0'),
      ctr: parseFloat(insight.ctr || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      conversions: parseFloat(conversions),
      roas: roas,
    };

    if (existing) {
      // Atualiza métrica existente
      const { error } = await supabase
        .from('ad_metrics')
        .update(metricsData)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insere nova métrica
      const { error } = await supabase
        .from('ad_metrics')
        .insert({
          connection_id: connectionId,
          user_id: user.id,
          campaign_id: campaignId,
          date: insight.date_start,
          ...metricsData,
        });
      if (error) throw error;
    }
  }
}
