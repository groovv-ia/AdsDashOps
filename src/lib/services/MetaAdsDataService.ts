import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { decryptData } from '../utils/encryption';

/**
 * Interface para campanhas da Meta
 */
export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  createdTime: string;
  startTime?: string;
  stopTime?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetRemaining?: number;
}

/**
 * Interface para métricas/insights da Meta
 */
export interface MetaInsights {
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

/**
 * Serviço simplificado para extrair dados da Meta Ads
 * Busca tokens do banco de dados e faz requisições à API
 */
export class MetaAdsDataService {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';
  private httpClient: AxiosInstance;

  constructor() {
    // Configura cliente HTTP com retry automático
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Configura retry para erros de rede e rate limit
    axiosRetry(this.httpClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          error.response?.status === 500
        );
      },
    });
  }

  /**
   * Busca o access token do usuário para a plataforma Meta
   */
  private async getAccessToken(userId: string, accountId?: string): Promise<string> {
    try {
      let query = supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'meta')
        .eq('is_active', true);

      // Se accountId foi fornecido, filtra por ele
      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error('Failed to fetch access token', error);
        throw new Error('Erro ao buscar token de acesso');
      }

      if (!data) {
        throw new Error('Nenhum token ativo encontrado. Por favor, conecte sua conta Meta Ads.');
      }

      // Descriptografa o token
      const decryptedToken = decryptData(data.access_token);

      // Atualiza last_used_at
      await supabase
        .from('oauth_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform', 'meta');

      return decryptedToken;
    } catch (error: any) {
      logger.error('Error getting access token', error);
      throw error;
    }
  }

  /**
   * Busca todas as contas publicitárias do usuário
   */
  async getAdAccounts(userId: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      logger.info('Fetching Meta ad accounts...');

      const response = await this.httpClient.get('/me/adaccounts', {
        params: {
          access_token: accessToken,
          fields: 'id,account_id,name,account_status,currency,timezone_name',
        },
      });

      logger.info('Meta ad accounts retrieved', { count: response.data.data.length });

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to get Meta ad accounts', error);
      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Erro ao buscar contas publicitárias'
      );
    }
  }

  /**
   * Busca campanhas de uma conta publicitária
   */
  async getCampaigns(userId: string, accountId: string): Promise<MetaCampaign[]> {
    try {
      const accessToken = await this.getAccessToken(userId, accountId);

      logger.info('Fetching Meta campaigns...', { accountId });

      const response = await this.httpClient.get(`/${accountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining',
          limit: 100,
        },
      });

      const campaigns: MetaCampaign[] = response.data.data.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        createdTime: campaign.created_time,
        startTime: campaign.start_time,
        stopTime: campaign.stop_time,
        dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : undefined,
        lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : undefined,
        budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : undefined,
      }));

      logger.info('Meta campaigns retrieved', { accountId, count: campaigns.length });

      return campaigns;
    } catch (error: any) {
      logger.error('Failed to get Meta campaigns', error, { accountId });
      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Erro ao buscar campanhas'
      );
    }
  }

  /**
   * Busca insights/métricas de uma campanha
   */
  async getCampaignInsights(
    userId: string,
    campaignId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<MetaInsights[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      logger.info('Fetching Meta campaign insights...', { campaignId, dateStart, dateEnd });

      const response = await this.httpClient.get(`/${campaignId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,clicks,spend,reach,ctr,cpc,actions,action_values',
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          time_increment: 1, // Dados diários
        },
      });

      const insights: MetaInsights[] = response.data.data.map((insight: any) => {
        // Extrai conversões das actions
        const conversions = this.extractActionValue(
          insight.actions,
          'offsite_conversion.fb_pixel_purchase'
        );

        // Extrai valor de conversão
        const conversionValue = this.extractActionValue(
          insight.action_values,
          'offsite_conversion.fb_pixel_purchase'
        );

        const spend = parseFloat(insight.spend || '0');
        const roas = conversionValue > 0 && spend > 0 ? conversionValue / spend : 0;

        return {
          campaignId,
          date: insight.date_start,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend,
          reach: parseInt(insight.reach || '0'),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          conversions,
          roas,
        };
      });

      logger.info('Meta campaign insights retrieved', {
        campaignId,
        count: insights.length,
      });

      return insights;
    } catch (error: any) {
      logger.error('Failed to get Meta campaign insights', error, { campaignId });
      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Erro ao buscar métricas da campanha'
      );
    }
  }

  /**
   * Busca insights agregados de todas as campanhas de uma conta
   */
  async getAccountInsights(
    userId: string,
    accountId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<MetaInsights[]> {
    try {
      const accessToken = await this.getAccessToken(userId, accountId);

      logger.info('Fetching Meta account insights...', { accountId, dateStart, dateEnd });

      const response = await this.httpClient.get(`/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'campaign_id,impressions,clicks,spend,reach,ctr,cpc,actions,action_values',
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          time_increment: 1,
          level: 'campaign',
        },
      });

      const insights: MetaInsights[] = response.data.data.map((insight: any) => {
        const conversions = this.extractActionValue(
          insight.actions,
          'offsite_conversion.fb_pixel_purchase'
        );

        const conversionValue = this.extractActionValue(
          insight.action_values,
          'offsite_conversion.fb_pixel_purchase'
        );

        const spend = parseFloat(insight.spend || '0');
        const roas = conversionValue > 0 && spend > 0 ? conversionValue / spend : 0;

        return {
          campaignId: insight.campaign_id,
          date: insight.date_start,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend,
          reach: parseInt(insight.reach || '0'),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          conversions,
          roas,
        };
      });

      logger.info('Meta account insights retrieved', {
        accountId,
        count: insights.length,
      });

      return insights;
    } catch (error: any) {
      logger.error('Failed to get Meta account insights', error, { accountId });
      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Erro ao buscar métricas da conta'
      );
    }
  }

  /**
   * Extrai valor de uma action específica do array de actions
   */
  private extractActionValue(actions: any[] | undefined, actionType: string): number {
    if (!actions) return 0;
    const action = actions.find((a: any) => a.action_type === actionType);
    return action ? parseFloat(action.value) : 0;
  }

  /**
   * Verifica se o usuário tem tokens Meta ativos
   */
  async hasActiveToken(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'meta')
        .eq('is_active', true)
        .maybeSingle();

      return !error && !!data;
    } catch (error) {
      logger.error('Error checking for active token', error);
      return false;
    }
  }
}
