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

export class MetaAdsService {
  private api: FacebookAdsApi;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private httpClient: AxiosInstance;
  private baseUrl = 'https://graph.facebook.com/v19.0';

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

  async getInsights(
    connectionId: string,
    objectId: string,
    objectType: 'campaign' | 'adset' | 'ad',
    dateStart: string,
    dateEnd: string
  ): Promise<AdMetrics[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      await this.rateLimiter.waitForRateLimit(`${objectId}/insights`);

      const response = await this.httpClient.get(`/${objectId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc,actions,action_values,video_views,video_avg_time_watched_actions',
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          time_increment: 1,
          level: objectType,
        },
      });

      await this.rateLimiter.recordRequest(`${objectId}/insights`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const metrics: AdMetrics[] = response.data.data.map((insight: any) => {
        const conversions = this.extractActionValue(insight.actions, 'offsite_conversion.fb_pixel_purchase');
        const conversionValue = this.extractActionValue(insight.action_values, 'offsite_conversion.fb_pixel_purchase');
        const videoViews = this.extractActionValue(insight.actions, 'video_view');

        return {
          connectionId,
          userId: userData.user!.id,
          [`${objectType}Id`]: objectId,
          date: insight.date_start,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          reach: parseInt(insight.reach || '0'),
          frequency: parseFloat(insight.frequency || '0'),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          conversions: conversions,
          costPerResult: conversions > 0 ? parseFloat(insight.spend || '0') / conversions : 0,
          videoViews,
          roas: conversionValue > 0 ? conversionValue / parseFloat(insight.spend || '1') : 0,
        };
      });

      logger.info('Meta insights retrieved', { objectId, objectType, count: metrics.length });
      return metrics;
    } catch (error: any) {
      logger.error('Failed to get Meta insights', error, { connectionId, objectId });
      throw this.handleApiError(error);
    }
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
