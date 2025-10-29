import { supabase } from './supabase';

export interface ConnectionConfig {
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  expiresAt?: string;
}

export interface DataSourceConnection {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  config: ConnectionConfig;
  lastSync?: string;
  error?: string;
}

// Meta Ads API Integration
export class MetaAdsConnector {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  async authenticate(accessToken: string): Promise<{ isValid: boolean; accountInfo?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me?access_token=${accessToken}`);
      const data = await response.json();
      
      if (data.error) {
        return { isValid: false, error: data.error.message };
      }
      
      return { isValid: true, accountInfo: data };
    } catch (error) {
      return { isValid: false, error: 'Erro ao conectar com Meta Ads API' };
    }
  }

  async getAdAccounts(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar contas Meta:', error);
      return [];
    }
  }

  async getCampaigns(accessToken: string, accountId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/campaigns?fields=id,name,status,objective,created_time&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar campanhas Meta:', error);
      return [];
    }
  }

  async getInsights(accessToken: string, accountId: string, dateRange: { since: string; until: string }): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/insights?fields=impressions,clicks,spend,conversions,reach,frequency,ctr,cpc&time_range=${JSON.stringify(dateRange)}&access_token=${accessToken}`
      );
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar insights Meta:', error);
      return [];
    }
  }
}

// Google Ads API Integration
export class GoogleAdsConnector {
  private baseUrl = 'https://googleads.googleapis.com/v14';

  async authenticate(accessToken: string): Promise<{ isValid: boolean; accountInfo?: any; error?: string }> {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
      const data = await response.json();
      
      if (data.error) {
        return { isValid: false, error: data.error.message };
      }
      
      return { isValid: true, accountInfo: data };
    } catch (error) {
      return { isValid: false, error: 'Erro ao conectar com Google Ads API' };
    }
  }

  async getCustomers(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers:listAccessibleCustomers`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': process.env.VITE_GOOGLE_DEVELOPER_TOKEN || '',
          }
        }
      );
      const data = await response.json();
      return data.resourceNames || [];
    } catch (error) {
      console.error('Erro ao buscar clientes Google Ads:', error);
      return [];
    }
  }

  async getCampaigns(accessToken: string, customerId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type
        FROM campaign
      `;

      const response = await fetch(
        `${this.baseUrl}/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': process.env.VITE_GOOGLE_DEVELOPER_TOKEN || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        }
      );
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Erro ao buscar campanhas Google Ads:', error);
      return [];
    }
  }
}

// TikTok Ads API Integration
export class TikTokAdsConnector {
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  async authenticate(accessToken: string): Promise<{ isValid: boolean; accountInfo?: any; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user/info/`,
        {
          headers: {
            'Access-Token': accessToken,
          }
        }
      );
      const data = await response.json();
      
      if (data.code !== 0) {
        return { isValid: false, error: data.message };
      }
      
      return { isValid: true, accountInfo: data.data };
    } catch (error) {
      return { isValid: false, error: 'Erro ao conectar com TikTok Ads API' };
    }
  }

  async getAdvertisers(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/advertiser/info/`,
        {
          headers: {
            'Access-Token': accessToken,
          }
        }
      );
      const data = await response.json();
      return data.data?.list || [];
    } catch (error) {
      console.error('Erro ao buscar anunciantes TikTok:', error);
      return [];
    }
  }

  async getCampaigns(accessToken: string, advertiserId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/campaign/get/?advertiser_id=${advertiserId}`,
        {
          headers: {
            'Access-Token': accessToken,
          }
        }
      );
      const data = await response.json();
      return data.data?.list || [];
    } catch (error) {
      console.error('Erro ao buscar campanhas TikTok:', error);
      return [];
    }
  }
}

// Data Sync Service
export class DataSyncService {
  private metaConnector = new MetaAdsConnector();
  private googleConnector = new GoogleAdsConnector();
  private tiktokConnector = new TikTokAdsConnector();

  async syncDataSource(connection: DataSourceConnection): Promise<{ success: boolean; error?: string }> {
    try {
      // Update status to syncing
      await this.updateConnectionStatus(connection.id, 'syncing');

      let syncResult;
      switch (connection.platform.toLowerCase()) {
        case 'meta':
          syncResult = await this.syncMetaData(connection);
          break;
        case 'google':
          syncResult = await this.syncGoogleData(connection);
          break;
        case 'tiktok':
          syncResult = await this.syncTikTokData(connection);
          break;
        default:
          throw new Error(`Plataforma não suportada: ${connection.platform}`);
      }

      if (syncResult.success) {
        await this.updateConnectionStatus(connection.id, 'connected', new Date().toISOString());
        return { success: true };
      } else {
        await this.updateConnectionStatus(connection.id, 'error', undefined, syncResult.error);
        return { success: false, error: syncResult.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.updateConnectionStatus(connection.id, 'error', undefined, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async syncMetaData(connection: DataSourceConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, accountId } = connection.config;
      
      // Validate token
      const authResult = await this.metaConnector.authenticate(accessToken);
      if (!authResult.isValid) {
        return { success: false, error: authResult.error };
      }

      // Get campaigns
      const campaigns = await this.metaConnector.getCampaigns(accessToken, accountId);
      
      // Get insights for last 30 days
      const dateRange = {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0]
      };
      const insights = await this.metaConnector.getInsights(accessToken, accountId, dateRange);

      // Store data in Supabase
      await this.storeMetaData(connection.id, campaigns, insights);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao sincronizar Meta' };
    }
  }

  private async syncGoogleData(connection: DataSourceConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, accountId } = connection.config;
      
      // Validate token
      const authResult = await this.googleConnector.authenticate(accessToken);
      if (!authResult.isValid) {
        return { success: false, error: authResult.error };
      }

      // Get campaigns
      const campaigns = await this.googleConnector.getCampaigns(accessToken, accountId);

      // Store data in Supabase
      await this.storeGoogleData(connection.id, campaigns);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao sincronizar Google Ads' };
    }
  }

  private async syncTikTokData(connection: DataSourceConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, accountId } = connection.config;
      
      // Validate token
      const authResult = await this.tiktokConnector.authenticate(accessToken);
      if (!authResult.isValid) {
        return { success: false, error: authResult.error };
      }

      // Get campaigns
      const campaigns = await this.tiktokConnector.getCampaigns(accessToken, accountId);

      // Store data in Supabase
      await this.storeTikTokData(connection.id, campaigns);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao sincronizar TikTok Ads' };
    }
  }

  private async storeMetaData(connectionId: string, campaigns: any[], insights: any[]): Promise<void> {
    // Store campaigns
    for (const campaign of campaigns) {
      await supabase.from('campaigns').upsert({
        id: campaign.id,
        name: campaign.name,
        platform: 'Meta',
        status: campaign.status,
        objective: campaign.objective,
        created_date: campaign.created_time,
        connection_id: connectionId,
      });
    }

    // Store insights
    for (const insight of insights) {
      await supabase.from('ad_metrics').upsert({
        campaign_id: insight.campaign_id,
        date: insight.date_start,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        spend: parseFloat(insight.spend || '0'),
        conversions: insight.conversions || 0,
        reach: insight.reach || 0,
        frequency: parseFloat(insight.frequency || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        cpc: parseFloat(insight.cpc || '0'),
        connection_id: connectionId,
      });
    }
  }

  private async storeGoogleData(connectionId: string, campaigns: any[]): Promise<void> {
    for (const result of campaigns) {
      const campaign = result.campaign;
      await supabase.from('campaigns').upsert({
        id: campaign.id,
        name: campaign.name,
        platform: 'Google',
        status: campaign.status,
        objective: campaign.advertising_channel_type,
        connection_id: connectionId,
      });
    }
  }

  private async storeTikTokData(connectionId: string, campaigns: any[]): Promise<void> {
    for (const campaign of campaigns) {
      await supabase.from('campaigns').upsert({
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        platform: 'TikTok',
        status: campaign.status,
        objective: campaign.objective_type,
        connection_id: connectionId,
      });
    }
  }

  private async updateConnectionStatus(
    connectionId: string, 
    status: string, 
    lastSync?: string, 
    error?: string
  ): Promise<void> {
    const updateData: any = { status };
    if (lastSync) updateData.last_sync = lastSync;
    if (error) updateData.error = error;

    await supabase
      .from('data_connections')
      .update(updateData)
      .eq('id', connectionId);
  }
}

// OAuth Helper Functions
export const initiateOAuth = {
  meta: (clientId: string, redirectUri: string) => {
    const scope = 'ads_read,ads_management,business_management';
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    window.open(authUrl, 'meta-oauth', 'width=600,height=600');
  },

  google: (clientId: string, redirectUri: string) => {
    const scope = 'https://www.googleapis.com/auth/adwords';
    const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&access_type=offline`;
    window.open(authUrl, 'google-oauth', 'width=600,height=600');
  },

  tiktok: (clientId: string, redirectUri: string) => {
    const scope = 'user_info:read,advertiser_management:read,campaign_management:read,reporting:read';
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    window.open(authUrl, 'tiktok-oauth', 'width=600,height=600');
  }
};

// Token Exchange Functions
export const exchangeCodeForToken = {
  meta: async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
    const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });
    return response.json();
  },

  google: async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
        grant_type: 'authorization_code',
      }),
    });
    return response.json();
  },

  tiktok: async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: clientId,
        secret: clientSecret,
        auth_code: code,
      }),
    });
    return response.json();
  }
};