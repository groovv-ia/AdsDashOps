/**
 * GoogleSystemUserService
 *
 * Servico para gerenciar a conexao com o Google Ads via Developer Token.
 * Responsavel por salvar credenciais, validar conexao, listar contas
 * e gerenciar vinculacoes de contas ao workspace.
 *
 * Este servico chama as Edge Functions do Supabase para operacoes
 * que requerem acesso a API do Google Ads.
 */

import { supabase } from '../supabase';
import type {
  GoogleConnection,
  GoogleAdAccount,
  GoogleSyncJob,
  ValidateGoogleConnectionResponse,
  ListGoogleAccountsResponse,
  GoogleSyncStatusResponse,
  GoogleInsightsDaily,
  GoogleInsightsQueryOptions,
} from '../connectors/google/types';

// URL base das Edge Functions
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// ============================================
// Funcoes Auxiliares para Chamadas de API
// ============================================

/**
 * Obtem headers de autorizacao para chamadas as Edge Functions
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

/**
 * Chama uma Edge Function com tratamento de erros padronizado
 */
async function callEdgeFunction<T>(
  functionName: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, unknown>
): Promise<T> {
  const headers = await getAuthHeaders();

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Funcoes de Conexao
// ============================================

/**
 * Parametros para validacao de conexao Google Ads
 * Inclui todas as credenciais OAuth necessarias
 */
export interface ValidateGoogleConnectionParams {
  oauth_client_id: string;
  oauth_client_secret: string;
  refresh_token: string;
  developer_token: string;
  customer_id: string;
  login_customer_id?: string;
}

/**
 * Valida as credenciais do Google Ads e salva a conexao
 * Chama a Edge Function google-validate-connection
 *
 * IMPORTANTE: Todas as credenciais OAuth sao fornecidas pelo usuario.
 * Nao usamos variaveis de ambiente para credenciais - cada conexao tem suas proprias.
 *
 * @param params - Objeto contendo todas as credenciais necessarias
 */
export async function validateGoogleConnection(
  params: ValidateGoogleConnectionParams
): Promise<ValidateGoogleConnectionResponse> {
  try {
    console.log('[GoogleSystemUserService] Validando conexao via Edge Function...');

    const result = await callEdgeFunction<{
      status: string;
      workspace_id?: string;
      customer_id?: string;
      customer_name?: string;
      accounts_count?: number;
      accounts?: Array<{
        customer_id: string;
        name: string;
        currency_code: string;
        timezone: string;
        is_manager: boolean;
      }>;
      error?: string;
      hint?: string;
    }>('google-validate-connection', 'POST', {
      oauth_client_id: params.oauth_client_id,
      oauth_client_secret: params.oauth_client_secret,
      refresh_token: params.refresh_token,
      developer_token: params.developer_token,
      customer_id: params.customer_id,
      login_customer_id: params.login_customer_id,
    });

    if (result.status === 'connected') {
      console.log(`[GoogleSystemUserService] Conexao validada: ${result.accounts_count} conta(s)`);
      return {
        status: 'connected',
        workspace_id: result.workspace_id,
        customer_id: result.customer_id,
        customer_name: result.customer_name,
        accounts_count: result.accounts_count,
      };
    }

    return {
      status: 'invalid',
      error: result.error || 'Erro ao validar conexao',
    };
  } catch (error) {
    console.error('[GoogleSystemUserService] Erro ao validar conexao:', error);
    return {
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Desconecta o Google Ads do workspace atual
 */
export async function disconnectGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'Workspace nao encontrado' };
    }

    // Remove a conexao (cascade remove contas e dados relacionados)
    const { error } = await supabase
      .from('google_connections')
      .delete()
      .eq('workspace_id', workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao desconectar',
    };
  }
}

// ============================================
// Funcoes de Listagem de Contas
// ============================================

/**
 * Lista todas as contas Google Ads vinculadas ao workspace
 * Pode chamar a Edge Function ou buscar do banco local
 */
export async function listGoogleAdAccounts(
  useEdgeFunction: boolean = false
): Promise<ListGoogleAccountsResponse> {
  try {
    if (useEdgeFunction) {
      // Chama Edge Function para listar contas
      const result = await callEdgeFunction<{
        accounts: GoogleAdAccount[];
        total: number;
        error?: string;
      }>('google-list-adaccounts', 'GET');

      return {
        accounts: result.accounts || [],
        total: result.total || 0,
        error: result.error,
      };
    }

    // Busca do banco local
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { accounts: [], total: 0, error: 'Workspace nao encontrado' };
    }

    const { data, error } = await supabase
      .from('google_ad_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) {
      return { accounts: [], total: 0, error: error.message };
    }

    return {
      accounts: data || [],
      total: data?.length || 0,
    };
  } catch (error) {
    return {
      accounts: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Erro ao listar contas',
    };
  }
}

/**
 * Atualiza a selecao de uma conta para sincronizacao
 */
export async function updateAccountSelection(
  accountId: string,
  isSelected: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('google_ad_accounts')
      .update({ is_selected: isSelected })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar selecao',
    };
  }
}

/**
 * Seleciona todas as contas para sincronizacao
 */
export async function selectAllAccounts(
  select: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'Workspace nao encontrado' };
    }

    const { error } = await supabase
      .from('google_ad_accounts')
      .update({ is_selected: select })
      .eq('workspace_id', workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar selecao',
    };
  }
}

// ============================================
// Funcoes de Status
// ============================================

/**
 * Obtem o status da conexao Google Ads do workspace
 */
export async function getGoogleConnectionStatus(): Promise<GoogleConnection | null> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return null;

    const { data, error } = await supabase
      .from('google_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !data) return null;

    return data;
  } catch (error) {
    console.error('Erro ao obter status da conexao:', error);
    return null;
  }
}

/**
 * Obtem status completo de sincronizacao do Google Ads
 * Chama a Edge Function google-get-sync-status
 */
export async function getGoogleSyncStatus(): Promise<GoogleSyncStatusResponse> {
  try {
    console.log('[GoogleSystemUserService] Buscando status via Edge Function...');

    const result = await callEdgeFunction<GoogleSyncStatusResponse>(
      'google-get-sync-status',
      'POST'
    );

    console.log(`[GoogleSystemUserService] Status recebido: ${result.ad_accounts?.length || 0} contas`);
    return result;
  } catch (error) {
    console.error('[GoogleSystemUserService] Erro ao obter status:', error);

    // Fallback para busca local em caso de erro
    return getGoogleSyncStatusLocal();
  }
}

/**
 * Versao local do getGoogleSyncStatus (fallback)
 */
async function getGoogleSyncStatusLocal(): Promise<GoogleSyncStatusResponse> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return createEmptySyncStatus('Workspace nao encontrado');
    }

    // Busca dados do workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single();

    // Busca conexao
    const { data: connection } = await supabase
      .from('google_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Busca contas
    const { data: accounts } = await supabase
      .from('google_ad_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    // Busca jobs recentes
    const { data: recentJobs } = await supabase
      .from('google_sync_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Conta total de insights
    const { count: insightsCount } = await supabase
      .from('google_insights_daily')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // Conta jobs com erro
    const { count: errorJobsCount } = await supabase
      .from('google_sync_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'failed');

    // Determina health status
    let healthStatus: 'healthy' | 'stale' | 'error' | 'disconnected' | 'pending_first_sync' =
      'disconnected';
    if (connection) {
      if (connection.status === 'error') {
        healthStatus = 'error';
      } else if (connection.status === 'active') {
        if (!insightsCount || insightsCount === 0) {
          healthStatus = 'pending_first_sync';
        } else {
          healthStatus = 'healthy';
        }
      }
    }

    return {
      workspace: {
        id: workspace?.id || workspaceId,
        name: workspace?.name || 'Workspace',
      },
      connection: connection
        ? {
            status: connection.status,
            customer_id: connection.customer_id,
            last_validated_at: connection.last_validated_at || '',
          }
        : null,
      health_status: healthStatus,
      ad_accounts: (accounts || []).map((acc) => ({
        id: acc.id,
        customer_id: acc.customer_id,
        name: acc.name,
        currency_code: acc.currency_code,
        timezone: acc.timezone,
        status: acc.status,
        is_manager: acc.is_manager,
        is_selected: acc.is_selected,
        last_sync_at: acc.last_sync_at,
      })),
      recent_jobs: (recentJobs || []) as GoogleSyncJob[],
      totals: {
        ad_accounts: accounts?.length || 0,
        total_insights_rows: insightsCount || 0,
        jobs_with_errors: errorJobsCount || 0,
      },
    };
  } catch (error) {
    console.error('Erro ao obter status de sincronizacao (local):', error);
    return createEmptySyncStatus(
      error instanceof Error ? error.message : 'Erro ao obter status'
    );
  }
}

/**
 * Cria um objeto de status vazio para casos de erro
 */
function createEmptySyncStatus(error?: string): GoogleSyncStatusResponse {
  return {
    workspace: { id: '', name: '' },
    connection: null,
    health_status: 'disconnected',
    ad_accounts: [],
    recent_jobs: [],
    totals: {
      ad_accounts: 0,
      total_insights_rows: 0,
      jobs_with_errors: 0,
    },
    error,
  };
}

// ============================================
// Funcoes de Sincronizacao
// ============================================

/**
 * Executa sincronizacao de dados do Google Ads
 * Chama a Edge Function google-run-sync
 */
export async function runGoogleSync(options: {
  accountIds?: string[];
  dateFrom: string;
  dateTo: string;
  syncType?: 'full' | 'incremental';
}): Promise<{
  success: boolean;
  jobId?: string;
  accountsSynced?: number;
  campaignsSynced?: number;
  adGroupsSynced?: number;
  adsSynced?: number;
  keywordsSynced?: number;
  metricsSynced?: number;
  error?: string;
}> {
  try {
    console.log('[GoogleSystemUserService] Iniciando sincronizacao via Edge Function...');

    const result = await callEdgeFunction<{
      success: boolean;
      job_id?: string;
      accounts_synced?: number;
      campaigns_synced?: number;
      ad_groups_synced?: number;
      ads_synced?: number;
      keywords_synced?: number;
      metrics_synced?: number;
      errors?: string[];
      error?: string;
    }>('google-run-sync', 'POST', {
      account_ids: options.accountIds,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      sync_type: options.syncType || 'full',
    });

    if (result.success) {
      console.log(`[GoogleSystemUserService] Sincronizacao concluida: ${result.metrics_synced} metricas`);
    }

    return {
      success: result.success,
      jobId: result.job_id,
      accountsSynced: result.accounts_synced,
      campaignsSynced: result.campaigns_synced,
      adGroupsSynced: result.ad_groups_synced,
      adsSynced: result.ads_synced,
      keywordsSynced: result.keywords_synced,
      metricsSynced: result.metrics_synced,
      error: result.errors?.join('; ') || result.error,
    };
  } catch (error) {
    console.error('[GoogleSystemUserService] Erro na sincronizacao:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// ============================================
// Funcoes de Dados (Insights)
// ============================================

/**
 * Busca insights do Google Ads do banco de dados
 */
export async function getGoogleInsights(
  options: GoogleInsightsQueryOptions
): Promise<{ data: GoogleInsightsDaily[]; error?: string }> {
  try {
    let query = supabase.from('google_insights_daily').select('*');

    // Aplica filtros
    if (options.workspaceId) {
      query = query.eq('workspace_id', options.workspaceId);
    } else {
      const workspaceId = await getCurrentWorkspaceId();
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
    }

    if (options.accountId) {
      query = query.eq('account_id', options.accountId);
    }
    if (options.customerId) {
      query = query.eq('customer_id', options.customerId);
    }
    if (options.campaignId) {
      query = query.eq('campaign_id', options.campaignId);
    }
    if (options.adGroupId) {
      query = query.eq('ad_group_id', options.adGroupId);
    }
    if (options.dateFrom) {
      query = query.gte('date', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('date', options.dateTo);
    }

    query = query.order('date', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as GoogleInsightsDaily[] };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Erro ao buscar insights',
    };
  }
}

/**
 * Busca metricas agregadas por periodo
 */
export async function getGoogleMetricsSummary(options: {
  accountId?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<{
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  error?: string;
}> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        error: 'Workspace nao encontrado',
      };
    }

    let query = supabase
      .from('google_insights_daily')
      .select('impressions, clicks, cost, conversions, conversion_value')
      .eq('workspace_id', workspaceId)
      .gte('date', options.dateFrom)
      .lte('date', options.dateTo);

    if (options.accountId) {
      query = query.eq('account_id', options.accountId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        error: error.message,
      };
    }

    // Agrega os valores
    const summary = (data || []).reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
        cost: acc.cost + (Number(row.cost) || 0),
        conversions: acc.conversions + (Number(row.conversions) || 0),
        conversionValue: acc.conversionValue + (Number(row.conversion_value) || 0),
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0 }
    );

    // Calcula metricas derivadas
    const ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    const cpc = summary.clicks > 0 ? summary.cost / summary.clicks : 0;
    const roas = summary.cost > 0 ? summary.conversionValue / summary.cost : 0;

    return {
      impressions: summary.impressions,
      clicks: summary.clicks,
      cost: summary.cost,
      conversions: summary.conversions,
      ctr,
      cpc,
      roas,
    };
  } catch (error) {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
      error: error instanceof Error ? error.message : 'Erro ao calcular metricas',
    };
  }
}

// ============================================
// Funcoes de Dados Adicionais
// ============================================

/**
 * Busca campanhas do Google Ads
 */
export async function getGoogleCampaigns(accountId?: string): Promise<{
  data: Array<{
    id: string;
    campaign_id: string;
    name: string;
    status: string;
    advertising_channel_type: string;
    budget_amount_micros: number;
  }>;
  error?: string;
}> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { data: [], error: 'Workspace nao encontrado' };
    }

    let query = supabase
      .from('google_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Erro ao buscar campanhas',
    };
  }
}

/**
 * Busca ad groups do Google Ads
 */
export async function getGoogleAdGroups(campaignId?: string): Promise<{
  data: Array<{
    id: string;
    ad_group_id: string;
    campaign_id: string;
    name: string;
    status: string;
    type: string;
  }>;
  error?: string;
}> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { data: [], error: 'Workspace nao encontrado' };
    }

    let query = supabase
      .from('google_ad_groups')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Erro ao buscar ad groups',
    };
  }
}

/**
 * Busca keywords do Google Ads
 */
export async function getGoogleKeywords(adGroupId?: string): Promise<{
  data: Array<{
    id: string;
    keyword_id: string;
    ad_group_id: string;
    text: string;
    match_type: string;
    status: string;
    quality_score: number;
  }>;
  error?: string;
}> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { data: [], error: 'Workspace nao encontrado' };
    }

    let query = supabase
      .from('google_keywords')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('text');

    if (adGroupId) {
      query = query.eq('ad_group_id', adGroupId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Erro ao buscar keywords',
    };
  }
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Obtem o ID do workspace atual do usuario
 */
async function getCurrentWorkspaceId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Busca o workspace do usuario (owner ou membro)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) return workspace.id;

    // Se nao for owner, busca como membro
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return membership?.workspace_id || null;
  } catch (error) {
    console.error('Erro ao obter workspace:', error);
    return null;
  }
}

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
export function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, '');
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Remove formatacao do Customer ID
 */
export function cleanCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, '');
}

/**
 * Valida formato do Customer ID
 */
export function isValidCustomerId(customerId: string): boolean {
  const clean = cleanCustomerId(customerId);
  return clean.length === 10 && /^\d{10}$/.test(clean);
}
