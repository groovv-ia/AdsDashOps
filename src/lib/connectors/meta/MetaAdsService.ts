import { FacebookAdsApi, AdAccount, Campaign, AdSet, Ad } from 'facebook-nodejs-business-sdk';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../../utils/logger';
import { TokenManager } from '../shared/TokenManager';
import { RateLimiter } from '../shared/RateLimiter';
import { supabase } from '../../supabase';
import {
  MetaAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsights,
  MetaInsightsBreakdown,
  MetaApiError
} from './types';
import { Campaign as CampaignType, AdSet as AdSetType, Ad as AdType, AdMetrics, AudienceInsight } from '../shared/types';
import { extractMetricsFromInsight, MetaInsightsRaw } from '../../utils/metaMetricsExtractor';

/**
 * Cache para armazenar métricas em memória e evitar chamadas excessivas à API
 */
interface MetricsCacheEntry {
  data: AdMetrics[];
  timestamp: number;
  expiresAt: number;
}

export class MetaAdsService {
  private api: FacebookAdsApi;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private httpClient: AxiosInstance;
  private baseUrl = 'https://graph.facebook.com/v19.0';

  // Cache em memória para métricas (5 minutos de TTL por padrão)
  private metricsCache: Map<string, MetricsCacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.api = FacebookAdsApi.init('');
    this.tokenManager = new TokenManager('meta');
    this.rateLimiter = new RateLimiter({
      maxRequests: 200,
      windowMs: 60 * 60 * 1000,
      platform: 'Meta',
    });

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    axiosRetry(this.httpClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429 ||
               error.response?.status === 500;
      },
    });
  }

  private async getAccessToken(connectionId: string): Promise<string> {
    const token = await this.tokenManager.getToken(connectionId);
    if (!token) {
      throw new Error('No access token found');
    }

    if (await this.tokenManager.needsRefresh(connectionId)) {
      logger.info('Token needs refresh', { connectionId });
      await this.refreshAccessToken(connectionId);
      const refreshedToken = await this.tokenManager.getToken(connectionId);
      return refreshedToken!.accessToken;
    }

    return token.accessToken;
  }

  private async refreshAccessToken(connectionId: string): Promise<void> {
    await this.tokenManager.refreshToken(connectionId, async (refreshToken) => {
      const response = await this.httpClient.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: import.meta.env.VITE_META_APP_ID,
          client_secret: import.meta.env.VITE_META_APP_SECRET,
          fb_exchange_token: refreshToken,
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in || 5184000,
      };
    });
  }

  async getAdAccounts(accessToken: string): Promise<MetaAccount[]> {
    try {
      await this.rateLimiter.waitForRateLimit('me/adaccounts');

      const response = await this.httpClient.get('/me/adaccounts', {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_id,account_status,currency,timezone_name',
        },
      });

      await this.rateLimiter.recordRequest('me/adaccounts');

      const accounts: MetaAccount[] = response.data.data.map((account: any) => ({
        id: account.id,
        name: account.name,
        accountId: account.account_id,
        accountStatus: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name,
      }));

      logger.info('Meta ad accounts retrieved', { count: accounts.length });
      return accounts;
    } catch (error: any) {
      logger.error('Failed to get Meta ad accounts', error);
      throw this.handleApiError(error);
    }
  }

  async getCampaigns(connectionId: string, accountId: string): Promise<CampaignType[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      await this.rateLimiter.waitForRateLimit(`${accountId}/campaigns`);

      const response = await this.httpClient.get(`/${accountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,bid_strategy,buying_type',
          limit: 100,
        },
      });

      await this.rateLimiter.recordRequest(`${accountId}/campaigns`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const campaigns: CampaignType[] = response.data.data.map((campaign: any) => ({
        id: campaign.id,
        connectionId,
        userId: userData.user!.id,
        name: campaign.name,
        platform: 'Meta',
        accountId: accountId,
        status: campaign.status,
        objective: campaign.objective,
        createdDate: campaign.created_time,
        startDate: campaign.start_time,
        endDate: campaign.stop_time,
        dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : undefined,
        lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : undefined,
        budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : undefined,
        bidStrategy: campaign.bid_strategy,
        buyingType: campaign.buying_type,
      }));

      logger.info('Meta campaigns retrieved', { accountId, count: campaigns.length });
      return campaigns;
    } catch (error: any) {
      logger.error('Failed to get Meta campaigns', error, { connectionId, accountId });
      throw this.handleApiError(error);
    }
  }

  async getAdSets(connectionId: string, campaignId: string): Promise<AdSetType[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      await this.rateLimiter.waitForRateLimit(`${campaignId}/adsets`);

      const response = await this.httpClient.get(`/${campaignId}/adsets`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,start_time,end_time,targeting',
          limit: 100,
        },
      });

      await this.rateLimiter.recordRequest(`${campaignId}/adsets`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const adSets: AdSetType[] = response.data.data.map((adSet: any) => ({
        id: adSet.id,
        campaignId,
        connectionId,
        userId: userData.user!.id,
        name: adSet.name,
        status: adSet.status,
        dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : undefined,
        lifetimeBudget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : undefined,
        optimizationGoal: adSet.optimization_goal,
        billingEvent: adSet.billing_event,
        bidAmount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : undefined,
        startTime: adSet.start_time,
        endTime: adSet.end_time,
        targeting: JSON.stringify(adSet.targeting),
        targetingJson: adSet.targeting,
      }));

      logger.info('Meta ad sets retrieved', { campaignId, count: adSets.length });
      return adSets;
    } catch (error: any) {
      logger.error('Failed to get Meta ad sets', error, { connectionId, campaignId });
      throw this.handleApiError(error);
    }
  }

  async getAds(connectionId: string, adSetId: string): Promise<AdType[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      await this.rateLimiter.waitForRateLimit(`${adSetId}/ads`);

      const response = await this.httpClient.get(`/${adSetId}/ads`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,creative{id,name,title,body,image_url,video_id,thumbnail_url,call_to_action}',
          limit: 100,
        },
      });

      await this.rateLimiter.recordRequest(`${adSetId}/ads`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data: adSetData } = await supabase
        .from('ad_sets')
        .select('campaign_id')
        .eq('id', adSetId)
        .single();

      const campaignId = adSetData?.campaign_id || '';

      const ads: AdType[] = response.data.data.map((ad: any) => ({
        id: ad.id,
        adSetId,
        campaignId,
        connectionId,
        userId: userData.user!.id,
        name: ad.name,
        status: ad.status,
        adType: ad.creative?.object_story_spec?.link_data ? 'link' : 'other',
        previewUrl: ad.creative?.preview_url,
        thumbnailUrl: ad.creative?.thumbnail_url || ad.creative?.image_url,
        callToAction: ad.creative?.call_to_action?.type,
        linkUrl: ad.creative?.call_to_action?.value?.link,
        headline: ad.creative?.title,
        description: ad.creative?.body,
      }));

      logger.info('Meta ads retrieved', { adSetId, count: ads.length });
      return ads;
    } catch (error: any) {
      logger.error('Failed to get Meta ads', error, { connectionId, adSetId });
      throw this.handleApiError(error);
    }
  }

  /**
   * Busca métricas diretamente da API Meta em tempo real, SEM salvar no banco de dados
   * Usa cache em memória para evitar chamadas excessivas à API
   *
   * @param connectionId ID da conexão do usuário
   * @param objectId ID do objeto (campanha, ad set ou anúncio)
   * @param objectType Tipo do objeto ('campaign', 'adset' ou 'ad')
   * @param dateStart Data de início (formato YYYY-MM-DD)
   * @param dateEnd Data de fim (formato YYYY-MM-DD)
   * @param useCache Se true, usa cache em memória (padrão: true)
   * @returns Array de métricas diretamente da API, sem passar pelo banco de dados
   */
  async getInsightsRealtime(
    connectionId: string,
    objectId: string,
    objectType: 'campaign' | 'adset' | 'ad',
    dateStart: string,
    dateEnd: string,
    useCache: boolean = true
  ): Promise<AdMetrics[]> {
    try {
      // Gera chave única para o cache baseada nos parâmetros
      const cacheKey = `${connectionId}-${objectId}-${objectType}-${dateStart}-${dateEnd}`;

      // Verifica se existe cache válido
      if (useCache) {
        const cached = this.metricsCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
          logger.info('Using cached metrics', {
            objectId,
            objectType,
            cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
          });
          return cached.data;
        }
      }

      // Busca token de acesso
      const accessToken = await this.getAccessToken(connectionId);

      // Respeita rate limit da API
      await this.rateLimiter.waitForRateLimit(`${objectId}/insights`);

      // Lista completa de campos - ALINHADA com MetaSyncService
      const fields = [
        // Métricas básicas
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        // Métricas de taxa (já calculadas pela API)
        'ctr', 'cpc', 'cpm', 'cpp',
        // Cliques detalhados
        'inline_link_clicks', 'cost_per_inline_link_click', 'outbound_clicks',
        // Conversões e ações
        'actions', 'action_values',
        // Vídeo
        'video_views', 'video_avg_time_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions'
      ].join(',');

      // Busca métricas diretamente da API Meta
      const response = await this.httpClient.get(`/${objectId}/insights`, {
        params: {
          access_token: accessToken,
          fields,
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          time_increment: 1,
          level: objectType,
        },
      });

      // Registra requisição para rate limiting
      await this.rateLimiter.recordRequest(`${objectId}/insights`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Extrai métricas usando helper compartilhado
      const metrics: AdMetrics[] = response.data.data.map((insight: MetaInsightsRaw) => {
        const extracted = extractMetricsFromInsight(insight);

        return {
          connectionId,
          userId: userData.user!.id,
          [`${objectType}Id`]: objectId,
          date: insight.date_start,
          // Usa dados extraídos pelo helper
          impressions: extracted.impressions,
          clicks: extracted.clicks,
          spend: extracted.spend,
          reach: extracted.reach,
          frequency: extracted.frequency,
          ctr: extracted.ctr,
          cpc: extracted.cpc,
          cpm: extracted.cpm,
          cpp: extracted.cpp,
          conversions: extracted.conversions,
          conversionValue: extracted.conversion_value,
          costPerResult: extracted.cost_per_result,
          inlineLinkClicks: extracted.inline_link_clicks,
          costPerInlineLinkClick: extracted.cost_per_inline_link_click,
          outboundClicks: extracted.outbound_clicks,
          videoViews: extracted.video_views,
          roas: extracted.roas,
        };
      });

      // Armazena no cache
      if (useCache) {
        this.metricsCache.set(cacheKey, {
          data: metrics,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_TTL_MS
        });

        // Limpa cache antigo para evitar uso excessivo de memória
        this.cleanExpiredCache();
      }

      logger.info('Meta insights retrieved from API (realtime)', {
        objectId,
        objectType,
        count: metrics.length,
        cached: useCache
      });

      return metrics;
    } catch (error: any) {
      logger.error('Failed to get Meta insights (realtime)', error, { connectionId, objectId });
      throw this.handleApiError(error);
    }
  }

  /**
   * Busca métricas de múltiplas campanhas em paralelo para otimizar performance
   *
   * @param connectionId ID da conexão do usuário
   * @param campaignIds Array de IDs de campanhas
   * @param dateStart Data de início (formato YYYY-MM-DD)
   * @param dateEnd Data de fim (formato YYYY-MM-DD)
   * @param useCache Se true, usa cache em memória (padrão: true)
   * @returns Array de métricas agregadas de todas as campanhas
   */
  async getMultipleCampaignInsightsRealtime(
    connectionId: string,
    campaignIds: string[],
    dateStart: string,
    dateEnd: string,
    useCache: boolean = true
  ): Promise<AdMetrics[]> {
    try {
      logger.info('Fetching insights for multiple campaigns', {
        connectionId,
        campaignCount: campaignIds.length
      });

      // Busca métricas de todas as campanhas em paralelo
      const metricsPromises = campaignIds.map(campaignId =>
        this.getInsightsRealtime(connectionId, campaignId, 'campaign', dateStart, dateEnd, useCache)
      );

      // Aguarda todas as requisições completarem
      const metricsArrays = await Promise.all(metricsPromises);

      // Combina todos os arrays em um único array
      const allMetrics = metricsArrays.flat();

      logger.info('Multi-campaign insights retrieved', {
        campaignCount: campaignIds.length,
        totalMetrics: allMetrics.length
      });

      return allMetrics;
    } catch (error: any) {
      logger.error('Failed to get multi-campaign insights', error, {
        connectionId,
        campaignCount: campaignIds.length
      });
      throw this.handleApiError(error);
    }
  }

  /**
   * Limpa entradas expiradas do cache para evitar uso excessivo de memória
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.metricsCache.entries()) {
      if (now >= entry.expiresAt) {
        this.metricsCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned expired cache entries', { count: cleanedCount });
    }
  }

  /**
   * Limpa todo o cache manualmente
   */
  clearCache(): void {
    const size = this.metricsCache.size;
    this.metricsCache.clear();
    logger.info('Cache cleared manually', { entriesCleared: size });
  }

  /**
   * @deprecated Use getInsightsRealtime() para buscar métricas direto da API
   * Mantido apenas para compatibilidade com código legado que salva no banco
   */
  async getInsights(
    connectionId: string,
    objectId: string,
    objectType: 'campaign' | 'adset' | 'ad',
    dateStart: string,
    dateEnd: string
  ): Promise<AdMetrics[]> {
    // Redireciona para o método de tempo real
    return this.getInsightsRealtime(connectionId, objectId, objectType, dateStart, dateEnd, true);
  }

  async getInsightsWithBreakdown(
    connectionId: string,
    accountId: string,
    dateStart: string,
    dateEnd: string,
    breakdowns: string[]
  ): Promise<AudienceInsight[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      await this.rateLimiter.waitForRateLimit(`${accountId}/insights`);

      const response = await this.httpClient.get(`/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,clicks,spend,actions',
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          time_increment: 1,
          level: 'campaign',
          breakdowns: breakdowns.join(','),
        },
      });

      await this.rateLimiter.recordRequest(`${accountId}/insights`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const insights: AudienceInsight[] = response.data.data.map((insight: any) => {
        const conversions = this.extractActionValue(insight.actions, 'offsite_conversion.fb_pixel_purchase');

        return {
          connectionId,
          userId: userData.user!.id,
          campaignId: insight.campaign_id,
          date: insight.date_start,
          ageRange: insight.age,
          gender: insight.gender,
          country: insight.country,
          region: insight.region,
          devicePlatform: insight.device_platform,
          placement: insight.placement,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          conversions,
        };
      });

      logger.info('Meta breakdown insights retrieved', { accountId, count: insights.length });
      return insights;
    } catch (error: any) {
      logger.error('Failed to get Meta breakdown insights', error, { connectionId, accountId });
      throw this.handleApiError(error);
    }
  }

  /**
   * @deprecated Use extractActionValue from metaMetricsExtractor helper instead
   * Mantido para compatibilidade com código legado
   */
  private extractActionValue(actions: any[] | undefined, actionType: string): number {
    if (!actions) return 0;
    const action = actions.find((a: any) => a.action_type === actionType);
    return action ? parseFloat(action.value) : 0;
  }

  private handleApiError(error: any): Error {
    if (error.response?.data?.error) {
      const metaError: MetaApiError = error.response.data.error;
      return new Error(`Meta API Error (${metaError.code}): ${metaError.message}`);
    }
    return error;
  }
}
