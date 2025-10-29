export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AdAccount {
  id: string;
  name: string;
  platform: 'Meta' | 'TikTok' | 'Google';
  account_id: string;
  access_token?: string;
  is_active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'Meta' | 'TikTok' | 'Google';
  account_id: string;
  status: 'Active' | 'Paused' | 'Ended';
  objective: string;
  created_date: string;
  start_date: string;
  end_date?: string;
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: 'Active' | 'Paused' | 'Ended';
  daily_budget?: number;
  lifetime_budget?: number;
  targeting: string;
}

export interface Ad {
  id: string;
  name: string;
  ad_set_id: string;
  campaign_id: string;
  status: 'Active' | 'Paused' | 'Ended';
  ad_type: 'single_image' | 'carousel' | 'video' | 'text' | 'shopping' | 'display';
  creative_url?: string;
}

export interface AdMetrics {
  id: string;
  campaign_id: string;
  ad_set_id?: string;
  ad_id?: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  roas: number;
  cost_per_result: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FilterOptions {
  platforms: string[];
  campaigns: string[];
  adSets: string[];
  ads: string[];
  dateRange: DateRange;
}

export interface MetricsSummary {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  roas: number;
  cost_per_result: number;
}

export interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'database' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  accountId?: string;
  logo: string;
  description: string;
  metrics?: string[];
}