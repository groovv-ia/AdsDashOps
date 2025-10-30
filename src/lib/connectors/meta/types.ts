export interface MetaAccount {
  id: string;
  name: string;
  accountId: string;
  accountStatus: number;
  currency: string;
  timezone: string;
}

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
  bidStrategy?: string;
  buyingType?: string;
}

export interface MetaAdSet {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  optimizationGoal?: string;
  billingEvent?: string;
  bidAmount?: number;
  startTime?: string;
  endTime?: string;
  targeting?: any;
}

export interface MetaAd {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: string;
  creative?: {
    id: string;
    name: string;
    title?: string;
    body?: string;
    imageUrl?: string;
    videoId?: string;
    thumbnailUrl?: string;
    callToAction?: {
      type: string;
      value?: {
        link?: string;
      };
    };
  };
}

export interface MetaInsights {
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  frequency?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  costPerConversion?: number;
  videoViews?: number;
  videoAvgTimeWatched?: number;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  actionValues?: Array<{
    action_type: string;
    value: string;
  }>;
}

export interface MetaInsightsBreakdown extends MetaInsights {
  ageRange?: string;
  gender?: string;
  country?: string;
  region?: string;
  devicePlatform?: string;
  placement?: string;
}

export interface MetaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  errorSubcode?: number;
  fbtraceId?: string;
}
