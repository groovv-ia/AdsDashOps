// Interface para representar uma plataforma de publicidade
export type Platform = 'meta' | 'tiktok' | 'google';

// Status de uma campanha
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

// Interface para uma campanha de publicidade
export interface Campaign {
  id: string;
  name: string;
  platform: string; // Nome da plataforma (Meta, TikTok, Google Ads)
  status: CampaignStatus;
  budget: number;
  spend: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  user_id: string;
}

// Interface para um conjunto de anúncios
export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: CampaignStatus;
  budget: number;
  spend: number;
  created_at: string;
}

// Interface para um anúncio individual
export interface Ad {
  id: string;
  name: string;
  ad_set_id: string;
  campaign_id: string;
  status: CampaignStatus;
  creative_url?: string;
  created_at: string;
}

// Interface para métricas de performance
export interface Metric {
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
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  roas: number; // Return on ad spend
  cost_per_result: number;
  created_at: string;
}

// Interface para resumo agregado de métricas
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

// Interface para filtros do dashboard
export interface DashboardFilters {
  platforms: string[];
  campaigns: string[];
  adSets: string[];
  ads: string[];
  dateRange: [Date | null, Date | null];
}

// Interface para notificações do sistema
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
}

// Interface para configurações do sistema
export interface SystemSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  auto_refresh: boolean;
  refresh_interval: number; // em minutos
  email_notifications: boolean;
  push_notifications: boolean;
  currency: string;
  language: string;
  timezone: string;
  updated_at: string;
}

// Interface para dados de fonte de dados (conexões com plataformas)
export interface DataSource {
  id: string;
  user_id: string;
  platform: Platform;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  last_sync: string;
  created_at: string;
}

// Interface para insights de IA
export interface AIInsight {
  id: string;
  user_id: string;
  campaign_id?: string;
  insight_type: 'recommendation' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  created_at: string;
}
