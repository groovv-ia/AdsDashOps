export interface GoogleCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType?: string;
  startDate?: string;
  endDate?: string;
  campaignBudget?: {
    amountMicros: string;
    deliveryMethod: string;
  };
}

export interface GoogleAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  type: string;
  cpcBidMicros?: string;
  cpmBidMicros?: string;
  targetCpaMicros?: string;
}

export interface GoogleAd {
  id: string;
  adGroupId: string;
  campaignId: string;
  status: string;
  type: string;
  finalUrls?: string[];
  headlines?: Array<{ text: string }>;
  descriptions?: Array<{ text: string }>;
  path1?: string;
  path2?: string;
}

export interface GoogleMetrics {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
  averageCpc: number;
  ctr: number;
  averagePosition?: number;
  qualityScore?: number;
  searchImpressionShare?: number;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  redirectUri: string;
  scope: string[];
}

export interface GoogleApiError {
  message: string;
  code: number;
  status: string;
  details?: any[];
}

export interface GAQLQuery {
  query: string;
  customerId: string;
}
