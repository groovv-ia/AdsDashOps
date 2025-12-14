/**
 * MetaSystemUserService
 *
 * Servico para comunicacao com as Edge Functions do Meta Ads System User.
 * Gerencia conexao, listagem de contas, vinculacao e sincronizacao.
 */

import { supabase } from '../supabase';

// Tipos para respostas das APIs
export interface ValidateConnectionResponse {
  status: 'connected' | 'invalid';
  workspace_id?: string;
  business_manager_id?: string;
  adaccounts_count?: number;
  scopes?: string[];
  meta_user_id?: string;
  meta_user_name?: string;
  error?: string;
  details?: string;
  missing_scopes?: string[];
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  amount_spent?: string;
}

export interface ListAdAccountsResponse {
  adaccounts: AdAccount[];
  total: number;
  error?: string;
}

export interface BindAdAccountsResponse {
  success: boolean;
  bound_accounts: number;
  client_id: string;
  ad_account_ids: string[];
  error?: string;
}

export interface SyncEntitiesResponse {
  from_cache: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    effective_status: string;
    objective?: string;
  }>;
  adsets: Array<{
    id: string;
    name: string;
    effective_status: string;
    campaign_id: string;
  }>;
  ads: Array<{
    id: string;
    name: string;
    effective_status: string;
    campaign_id: string;
    adset_id: string;
  }>;
  totals?: {
    campaigns: number;
    adsets: number;
    ads: number;
  };
  error?: string;
}

export interface SyncResult {
  mode: string;
  date_from: string;
  date_to: string;
  accounts_synced: number;
  insights_synced: number;
  creatives_synced?: number;
  errors: string[];
}

export interface SyncJob {
  id: string;
  job_type: string;
  level?: string;
  status: string;
  fetched_rows?: number;
  error_message?: string;
  date_from?: string;
  date_to?: string;
  started_at?: string;
  ended_at?: string;
}

export interface SyncState {
  meta_ad_account_id: string;
  client_id?: string;
  last_daily_date_synced?: string;
  last_intraday_synced_at?: string;
  last_success_at?: string;
  last_error?: string;
  sync_enabled: boolean;
}

export interface AccountFreshness {
  total_rows: number;
  latest_date: string | null;
  levels: Record<string, number>;
}

export interface SyncStatusResponse {
  workspace: {
    id: string;
    name: string;
  };
  connection: {
    status: string;
    business_manager_id: string;
    granted_scopes: string[];
    last_validated_at: string;
  } | null;
  health_status: 'healthy' | 'stale' | 'error' | 'disconnected';
  ad_accounts: Array<{
    id: string;
    meta_id: string;
    name: string;
    currency: string;
    timezone: string;
    status: string;
    freshness: AccountFreshness | null;
    last_sync_at: string | null;
    last_sync_duration: number | null;
    last_sync_records_count: number | null;
  }>;
  sync_states: SyncState[];
  recent_jobs: SyncJob[];
  totals: {
    ad_accounts: number;
    total_insights_rows: number;
    jobs_with_errors: number;
  };
  error?: string;
}

// URL base das Edge Functions
const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

// Headers de autenticacao
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuario nao autenticado');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
};

/**
 * Valida e salva conexao do System User do Meta
 */
export async function validateMetaConnection(
  businessManagerId: string,
  systemUserToken: string
): Promise<ValidateConnectionResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(getEdgeFunctionUrl('meta-validate-connection'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      business_manager_id: businessManagerId,
      system_user_token: systemUserToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      status: 'invalid',
      error: data.error || 'Erro ao validar conexao',
      details: data.details,
      missing_scopes: data.missing_scopes,
    };
  }

  return data;
}

/**
 * Lista todas as Ad Accounts acessiveis
 */
export async function listMetaAdAccounts(): Promise<ListAdAccountsResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(getEdgeFunctionUrl('meta-list-adaccounts'), {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      adaccounts: [],
      total: 0,
      error: data.error || 'Erro ao listar contas',
    };
  }

  return data;
}

/**
 * Vincula Ad Accounts a um cliente
 */
export async function bindAdAccountsToClient(
  clientId: string,
  adAccountIds: string[]
): Promise<BindAdAccountsResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(getEdgeFunctionUrl('meta-bind-adaccounts'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_id: clientId,
      ad_account_ids: adAccountIds,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      bound_accounts: 0,
      client_id: clientId,
      ad_account_ids: [],
      error: data.error || 'Erro ao vincular contas',
    };
  }

  return data;
}

/**
 * Sincroniza entidades (campaigns, adsets, ads) do Meta
 */
export async function syncMetaEntities(
  metaAdAccountId: string,
  force: boolean = false
): Promise<SyncEntitiesResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(getEdgeFunctionUrl('meta-sync-entities'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      meta_ad_account_id: metaAdAccountId,
      force,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      from_cache: false,
      campaigns: [],
      adsets: [],
      ads: [],
      error: data.error || 'Erro ao sincronizar entidades',
    };
  }

  return data;
}

/**
 * Executa sincronizacao de insights do Meta
 */
export async function runMetaSync(options: {
  mode: 'daily' | 'intraday' | 'backfill';
  clientId?: string;
  metaAdAccountId?: string;
  daysBack?: number;
  levels?: string[];
  syncCreatives?: boolean;
}): Promise<SyncResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(getEdgeFunctionUrl('meta-run-sync'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mode: options.mode,
      client_id: options.clientId,
      meta_ad_account_id: options.metaAdAccountId,
      days_back: options.daysBack || 7,
      levels: options.levels || ['campaign', 'adset', 'ad'],
      sync_creatives: options.syncCreatives ?? false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      mode: options.mode,
      date_from: '',
      date_to: '',
      accounts_synced: 0,
      insights_synced: 0,
      errors: [data.error || 'Erro ao executar sincronizacao'],
    };
  }

  return data;
}

/**
 * Obtem status de sincronizacao
 */
export async function getMetaSyncStatus(clientId?: string): Promise<SyncStatusResponse> {
  const headers = await getAuthHeaders();

  const url = new URL(getEdgeFunctionUrl('meta-get-sync-status'));
  if (clientId) {
    url.searchParams.set('client_id', clientId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      workspace: { id: '', name: '' },
      connection: null,
      health_status: 'disconnected',
      ad_accounts: [],
      sync_states: [],
      recent_jobs: [],
      totals: {
        ad_accounts: 0,
        total_insights_rows: 0,
        jobs_with_errors: 0,
      },
      error: data.error || 'Erro ao obter status',
    };
  }

  return data;
}

/**
 * Busca insights do banco de dados local
 */
export async function getInsightsFromDatabase(options: {
  workspaceId?: string;
  clientId?: string;
  metaAdAccountId?: string;
  level?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<{
  data: any[];
  error?: string;
}> {
  let query = supabase
    .from('meta_insights_daily')
    .select('*')
    .order('date', { ascending: false });

  if (options.clientId) {
    query = query.eq('client_id', options.clientId);
  }
  if (options.metaAdAccountId) {
    query = query.eq('meta_ad_account_id', options.metaAdAccountId);
  }
  if (options.level) {
    query = query.eq('level', options.level);
  }
  if (options.dateFrom) {
    query = query.gte('date', options.dateFrom);
  }
  if (options.dateTo) {
    query = query.lte('date', options.dateTo);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}

/**
 * Busca IDs de anuncios que pertencem a um adset especifico
 * Utiliza a tabela meta_insights_raw onde o adset_id esta no payload JSONB
 */
export async function getAdIdsByAdset(adsetId: string): Promise<string[]> {
  // Busca ads distintos que pertencem ao adset usando o payload JSONB
  const { data, error } = await supabase
    .from('meta_insights_raw')
    .select('entity_id')
    .eq('level', 'ad')
    .filter('payload->>adset_id', 'eq', adsetId);

  if (error || !data) {
    console.error('Erro ao buscar ads por adset:', error);
    return [];
  }

  // Remove duplicatas (pode haver multiplas datas para o mesmo ad)
  const uniqueAdIds = [...new Set(data.map((row) => row.entity_id))];
  return uniqueAdIds;
}

/**
 * Busca insights de anuncios filtrados por adset
 * Primeiro busca os IDs dos ads que pertencem ao adset, depois busca os insights
 */
export async function getAdInsightsByAdset(options: {
  clientId?: string;
  metaAdAccountId?: string;
  adsetId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<{
  data: any[];
  error?: string;
}> {
  // Busca os IDs dos ads que pertencem ao adset
  const adIds = await getAdIdsByAdset(options.adsetId);

  if (adIds.length === 0) {
    return { data: [], error: undefined };
  }

  // Busca os insights apenas para esses ads
  let query = supabase
    .from('meta_insights_daily')
    .select('*')
    .eq('level', 'ad')
    .in('entity_id', adIds)
    .order('date', { ascending: false });

  if (options.clientId) {
    query = query.eq('client_id', options.clientId);
  }
  if (options.metaAdAccountId) {
    query = query.eq('meta_ad_account_id', options.metaAdAccountId);
  }
  if (options.dateFrom) {
    query = query.gte('date', options.dateFrom);
  }
  if (options.dateTo) {
    query = query.lte('date', options.dateTo);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}
