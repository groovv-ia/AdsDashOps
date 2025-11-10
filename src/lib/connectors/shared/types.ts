export interface ApiCredentials {
  id: string;
  userId: string;
  platform: 'meta' | 'google' | 'tiktok';
  appId: string;
  appSecret: string;
  developerToken?: string;
  isActive: boolean;
}

export interface OAuthToken {
  id: string;
  connectionId: string;
  userId: string;
  platform: 'meta' | 'google' | 'tiktok';
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: string;
  scope?: string;
  accountId: string;
  lastRefreshedAt: string;
  refreshAttempts: number;
}

export interface SyncJob {
  id: string;
  connectionId: string;
  userId: string;
  platform: string;
  syncType: 'full' | 'incremental' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  recordsSynced: {
    campaigns: number;
    ad_sets: number;
    ads: number;
    metrics: number;
  };
  errors: Array<{
    message: string;
    code?: string;
    timestamp: string;
  }>;
  durationSeconds?: number;
}

export interface Campaign {
  id: string;
  connectionId: string;
  userId: string;
  name: string;
  platform: string;
  accountId?: string;
  status: string;
  objective?: string;
  createdDate?: string;
  startDate?: string;
  endDate?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetRemaining?: number;
  bidStrategy?: string;
  optimizationGoal?: string;
  buyingType?: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  connectionId: string;
  userId: string;
  name: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  bidAmount?: number;
  startTime?: string;
  endTime?: string;
  targetingJson?: Record<string, any>;
}

export interface Ad {
  id: string;
  adSetId: string;
  campaignId: string;
  connectionId: string;
  userId: string;
  name: string;
  status: string;
  adType?: string;
  creativeUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  callToAction?: string;
  linkUrl?: string;
  headline?: string;
  description?: string;
}

export interface AdMetrics {
  id?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  connectionId: string;
  userId: string;
  date: string;
  // Métricas básicas
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach?: number;
  frequency?: number;
  // Métricas de taxa (valores da API, não recalculados)
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpp?: number;
  // Conversões - NOVOS CAMPOS
  conversionValue?: number; // Valor real das conversões (action_values)
  roas?: number;
  costPerResult?: number;
  // Cliques detalhados - NOVOS CAMPOS
  inlineLinkClicks?: number;
  costPerInlineLinkClick?: number;
  outboundClicks?: number;
  // Vídeo
  videoViews?: number;
  videoAvgTimeWatched?: number;
  // Engajamento
  engagementRate?: number;
  qualityScore?: number;
}

export interface AdCreative {
  id: string;
  adId: string;
  connectionId: string;
  userId: string;
  name: string;
  creativeType: string;
  title?: string;
  body?: string;
  callToAction?: string;
  linkUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageHash?: string;
}

export interface AudienceInsight {
  campaignId?: string;
  adSetId?: string;
  connectionId: string;
  userId: string;
  date: string;
  ageRange?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  devicePlatform?: string;
  placement?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface ConversionEvent {
  campaignId: string;
  connectionId: string;
  userId: string;
  eventName: string;
  eventSource: string;
  date: string;
  conversionCount: number;
  conversionValue: number;
  costPerConversion: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  recordsSynced?: {
    campaigns: number;
    adSets: number;
    ads: number;
    metrics: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  paging?: {
    next?: string;
    previous?: string;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}
