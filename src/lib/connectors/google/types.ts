/**
 * Tipos do Google Ads
 *
 * Este arquivo contém todas as interfaces e tipos relacionados
 * a integracao com a API do Google Ads.
 */

// ============================================
// Tipos da API do Google Ads
// ============================================

/**
 * Representa um cliente/conta do Google Ads
 */
export interface GoogleCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

/**
 * Representa uma campanha do Google Ads
 */
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

/**
 * Representa um grupo de anuncios do Google Ads
 */
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

/**
 * Representa um anuncio do Google Ads
 */
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

/**
 * Metricas de performance do Google Ads
 */
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

/**
 * Configuracao OAuth do Google Ads
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  redirectUri: string;
  scope: string[];
}

/**
 * Erro da API do Google Ads
 */
export interface GoogleApiError {
  message: string;
  code: number;
  status: string;
  details?: any[];
}

/**
 * Query GAQL (Google Ads Query Language)
 */
export interface GAQLQuery {
  query: string;
  customerId: string;
}

// ============================================
// Tipos do Banco de Dados (Supabase)
// ============================================

/**
 * Conexao Google Ads armazenada no banco
 */
export interface GoogleConnection {
  id: string;
  workspace_id: string;
  developer_token: string;
  customer_id: string;
  login_customer_id?: string;
  status: 'active' | 'inactive' | 'error';
  last_validated_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Conta Google Ads vinculada ao workspace
 */
export interface GoogleAdAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  customer_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
  is_manager: boolean;
  is_selected: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Job de sincronizacao do Google Ads
 */
export interface GoogleSyncJob {
  id: string;
  workspace_id: string;
  account_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  progress: number;
  current_phase?: string;
  items_processed: number;
  items_total: number;
  error_message?: string;
  sync_type: 'full' | 'incremental';
  date_range_start?: string;
  date_range_end?: string;
  campaigns_synced: number;
  ad_groups_synced: number;
  ads_synced: number;
  metrics_synced: number;
  created_at: string;
}

/**
 * Metricas diarias do Google Ads armazenadas no banco
 */
export interface GoogleInsightsDaily {
  id: string;
  workspace_id: string;
  account_id?: string;
  customer_id: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_group_id?: string;
  ad_group_name?: string;
  ad_id?: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Tipos de Resposta dos Servicos
// ============================================

/**
 * Resposta da validacao de conexao
 */
export interface ValidateGoogleConnectionResponse {
  status: 'connected' | 'invalid';
  workspace_id?: string;
  customer_id?: string;
  customer_name?: string;
  accounts_count?: number;
  error?: string;
  details?: string;
}

/**
 * Resposta da listagem de contas
 */
export interface ListGoogleAccountsResponse {
  accounts: GoogleAdAccount[];
  total: number;
  error?: string;
}

/**
 * Resposta da sincronizacao
 */
export interface GoogleSyncResult {
  success: boolean;
  accounts_synced: number;
  campaigns_synced: number;
  ad_groups_synced: number;
  ads_synced: number;
  metrics_synced: number;
  date_range_start: string;
  date_range_end: string;
  errors: string[];
  duration_ms: number;
}

/**
 * Status geral da conexao Google Ads
 */
export interface GoogleSyncStatusResponse {
  workspace: {
    id: string;
    name: string;
  };
  connection: {
    status: string;
    customer_id: string;
    last_validated_at: string;
  } | null;
  health_status: 'healthy' | 'stale' | 'error' | 'disconnected' | 'pending_first_sync';
  ad_accounts: Array<{
    id: string;
    customer_id: string;
    name: string;
    currency_code: string;
    timezone: string;
    status: string;
    is_manager: boolean;
    is_selected: boolean;
    last_sync_at: string | null;
  }>;
  recent_jobs: GoogleSyncJob[];
  totals: {
    ad_accounts: number;
    total_insights_rows: number;
    jobs_with_errors: number;
  };
  error?: string;
}

/**
 * Opcoes para busca de insights
 */
export interface GoogleInsightsQueryOptions {
  workspaceId?: string;
  accountId?: string;
  customerId?: string;
  campaignId?: string;
  adGroupId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Callback de progresso para sincronizacao
 */
export interface SyncProgressCallback {
  (progress: {
    phase: string;
    percentage: number;
    itemsProcessed: number;
    itemsTotal: number;
    message: string;
  }): void;
}
