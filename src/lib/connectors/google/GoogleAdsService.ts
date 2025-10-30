import { GoogleAdsApi, enums } from 'google-ads-api';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../../utils/logger';
import { TokenManager } from '../shared/TokenManager';
import { RateLimiter } from '../shared/RateLimiter';
import { supabase } from '../../supabase';
import { GoogleCustomer, GoogleCampaign, GoogleAdGroup, GoogleAd, GoogleMetrics } from './types';
import { Campaign as CampaignType, AdSet as AdSetType, Ad as AdType, AdMetrics } from '../shared/types';

export class GoogleAdsService {
  private client: GoogleAdsApi | null = null;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private httpClient: AxiosInstance;
  private developerToken: string;

  constructor() {
    this.tokenManager = new TokenManager('google');
    this.rateLimiter = new RateLimiter({
      maxRequests: 15000,
      windowMs: 24 * 60 * 60 * 1000,
      platform: 'Google',
    });
    this.developerToken = import.meta.env.VITE_GOOGLE_DEVELOPER_TOKEN || '';

    this.httpClient = axios.create({
      baseURL: 'https://www.googleapis.com',
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

  private async initializeClient(accessToken: string, refreshToken: string): Promise<void> {
    try {
      this.client = new GoogleAdsApi({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        developer_token: this.developerToken,
      });

      this.client.updateCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      logger.info('Google Ads API client initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Ads API client', error as Error);
      throw error;
    }
  }

  private async getAccessToken(connectionId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const token = await this.tokenManager.getToken(connectionId);
    if (!token) {
      throw new Error('No access token found');
    }

    if (await this.tokenManager.needsRefresh(connectionId)) {
      logger.info('Token needs refresh', { connectionId });
      await this.refreshAccessToken(connectionId);
      const refreshedToken = await this.tokenManager.getToken(connectionId);
      return {
        accessToken: refreshedToken!.accessToken,
        refreshToken: refreshedToken!.refreshToken!,
      };
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken!,
    };
  }

  private async refreshAccessToken(connectionId: string): Promise<void> {
    await this.tokenManager.refreshToken(connectionId, async (refreshToken) => {
      const response = await this.httpClient.post('/oauth2/v4/token', {
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        refreshToken: response.data.refresh_token || refreshToken,
      };
    });
  }

  async getCustomers(connectionId: string): Promise<GoogleCustomer[]> {
    try {
      const { accessToken, refreshToken } = await this.getAccessToken(connectionId);
      await this.initializeClient(accessToken, refreshToken);

      if (!this.client) throw new Error('Client not initialized');

      await this.rateLimiter.waitForRateLimit('listAccessibleCustomers');

      const response = await this.httpClient.get('/v1/customers:listAccessibleCustomers', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': this.developerToken,
        },
      });

      await this.rateLimiter.recordRequest('listAccessibleCustomers');

      const customerIds = response.data.resourceNames.map((resource: string) =>
        resource.replace('customers/', '')
      );

      const customers: GoogleCustomer[] = [];

      for (const customerId of customerIds) {
        try {
          const customer = this.client.Customer({
            customer_id: customerId,
            refresh_token: refreshToken,
          });

          const query = `
            SELECT
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.manager
            FROM customer
          `;

          const results = await customer.query(query);

          if (results.length > 0) {
            const customerData = results[0].customer;
            customers.push({
              resourceName: `customers/${customerId}`,
              id: customerId,
              descriptiveName: customerData.descriptive_name || '',
              currencyCode: customerData.currency_code || '',
              timeZone: customerData.time_zone || '',
              manager: customerData.manager || false,
            });
          }
        } catch (error) {
          logger.warn(`Failed to get customer details for ${customerId}`, { error });
        }
      }

      logger.info('Google customers retrieved', { count: customers.length });
      return customers;
    } catch (error: any) {
      logger.error('Failed to get Google customers', error);
      throw this.handleApiError(error);
    }
  }

  async getCampaigns(connectionId: string, customerId: string): Promise<CampaignType[]> {
    try {
      const { accessToken, refreshToken } = await this.getAccessToken(connectionId);
      await this.initializeClient(accessToken, refreshToken);

      if (!this.client) throw new Error('Client not initialized');

      await this.rateLimiter.waitForRateLimit(`${customerId}/campaigns`);

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign.start_date,
          campaign.end_date,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const results = await customer.query(query);
      await this.rateLimiter.recordRequest(`${customerId}/campaigns`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const campaigns: CampaignType[] = results.map((row: any) => {
        const campaign = row.campaign;
        const budget = row.campaign_budget;

        return {
          id: campaign.id.toString(),
          connectionId,
          userId: userData.user!.id,
          name: campaign.name,
          platform: 'Google',
          accountId: customerId,
          status: campaign.status,
          objective: campaign.advertising_channel_type,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          dailyBudget: budget?.amount_micros ? parseInt(budget.amount_micros) / 1000000 : undefined,
          bidStrategy: campaign.bidding_strategy_type,
        };
      });

      logger.info('Google campaigns retrieved', { customerId, count: campaigns.length });
      return campaigns;
    } catch (error: any) {
      logger.error('Failed to get Google campaigns', error, { connectionId, customerId });
      throw this.handleApiError(error);
    }
  }

  async getAdGroups(connectionId: string, customerId: string, campaignId: string): Promise<AdSetType[]> {
    try {
      const { accessToken, refreshToken } = await this.getAccessToken(connectionId);
      await this.initializeClient(accessToken, refreshToken);

      if (!this.client) throw new Error('Client not initialized');

      await this.rateLimiter.waitForRateLimit(`${customerId}/adgroups`);

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          ad_group.cpc_bid_micros,
          ad_group.cpm_bid_micros,
          ad_group.target_cpa_micros,
          campaign.id
        FROM ad_group
        WHERE campaign.id = ${campaignId}
        AND ad_group.status != 'REMOVED'
        ORDER BY ad_group.name
      `;

      const results = await customer.query(query);
      await this.rateLimiter.recordRequest(`${customerId}/adgroups`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const adGroups: AdSetType[] = results.map((row: any) => {
        const adGroup = row.ad_group;

        return {
          id: adGroup.id.toString(),
          campaignId: campaignId.toString(),
          connectionId,
          userId: userData.user!.id,
          name: adGroup.name,
          status: adGroup.status,
          bidAmount: adGroup.cpc_bid_micros ? parseInt(adGroup.cpc_bid_micros) / 1000000 : undefined,
          targetingJson: {
            type: adGroup.type,
          },
        };
      });

      logger.info('Google ad groups retrieved', { customerId, campaignId, count: adGroups.length });
      return adGroups;
    } catch (error: any) {
      logger.error('Failed to get Google ad groups', error, { connectionId, customerId, campaignId });
      throw this.handleApiError(error);
    }
  }

  async getAds(connectionId: string, customerId: string, adGroupId: string): Promise<AdType[]> {
    try {
      const { accessToken, refreshToken } = await this.getAccessToken(connectionId);
      await this.initializeClient(accessToken, refreshToken);

      if (!this.client) throw new Error('Client not initialized');

      await this.rateLimiter.waitForRateLimit(`${customerId}/ads`);

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.status,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.responsive_search_ad.path1,
          ad_group_ad.ad.responsive_search_ad.path2,
          ad_group.id,
          campaign.id
        FROM ad_group_ad
        WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status != 'REMOVED'
      `;

      const results = await customer.query(query);
      await this.rateLimiter.recordRequest(`${customerId}/ads`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data: adGroupData } = await supabase
        .from('ad_sets')
        .select('campaign_id')
        .eq('id', adGroupId)
        .single();

      const campaignId = adGroupData?.campaign_id || '';

      const ads: AdType[] = results.map((row: any) => {
        const ad = row.ad_group_ad.ad;
        const responsiveSearchAd = ad.responsive_search_ad;

        return {
          id: ad.id.toString(),
          adSetId: adGroupId.toString(),
          campaignId,
          connectionId,
          userId: userData.user!.id,
          name: `Ad ${ad.id}`,
          status: row.ad_group_ad.status,
          adType: ad.type,
          linkUrl: ad.final_urls?.[0],
          headline: responsiveSearchAd?.headlines?.[0]?.text,
          description: responsiveSearchAd?.descriptions?.[0]?.text,
        };
      });

      logger.info('Google ads retrieved', { customerId, adGroupId, count: ads.length });
      return ads;
    } catch (error: any) {
      logger.error('Failed to get Google ads', error, { connectionId, customerId, adGroupId });
      throw this.handleApiError(error);
    }
  }

  async getMetrics(
    connectionId: string,
    customerId: string,
    objectId: string,
    objectType: 'campaign' | 'ad_group' | 'ad',
    dateStart: string,
    dateEnd: string
  ): Promise<AdMetrics[]> {
    try {
      const { accessToken, refreshToken } = await this.getAccessToken(connectionId);
      await this.initializeClient(accessToken, refreshToken);

      if (!this.client) throw new Error('Client not initialized');

      await this.rateLimiter.waitForRateLimit(`${customerId}/metrics`);

      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const resourceName = objectType === 'campaign' ? 'campaign' : objectType === 'ad_group' ? 'ad_group' : 'ad_group_ad';
      const idField = objectType === 'campaign' ? 'campaign.id' : objectType === 'ad_group' ? 'ad_group.id' : 'ad_group_ad.ad.id';

      const query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc,
          metrics.ctr,
          metrics.search_impression_share
        FROM ${resourceName}
        WHERE ${idField} = ${objectId}
        AND segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
        ORDER BY segments.date
      `;

      const results = await customer.query(query);
      await this.rateLimiter.recordRequest(`${customerId}/metrics`);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const metrics: AdMetrics[] = results.map((row: any) => {
        const m = row.metrics;
        const segments = row.segments;

        return {
          connectionId,
          userId: userData.user!.id,
          [`${objectType === 'ad_group' ? 'adSet' : objectType}Id`]: objectId.toString(),
          date: segments.date,
          impressions: parseInt(m.impressions || '0'),
          clicks: parseInt(m.clicks || '0'),
          spend: m.cost_micros ? parseInt(m.cost_micros) / 1000000 : 0,
          conversions: parseFloat(m.conversions || '0'),
          ctr: parseFloat(m.ctr || '0') * 100,
          cpc: m.average_cpc ? parseInt(m.average_cpc) / 1000000 : 0,
          roas: m.conversions_value && m.cost_micros ?
            (parseFloat(m.conversions_value) / (parseInt(m.cost_micros) / 1000000)) : 0,
        };
      });

      logger.info('Google metrics retrieved', { customerId, objectId, count: metrics.length });
      return metrics;
    } catch (error: any) {
      logger.error('Failed to get Google metrics', error, { connectionId, customerId, objectId });
      throw this.handleApiError(error);
    }
  }

  private handleApiError(error: any): Error {
    if (error.response?.data?.error) {
      const googleError = error.response.data.error;
      return new Error(`Google Ads API Error (${googleError.code}): ${googleError.message}`);
    }
    return error;
  }
}
