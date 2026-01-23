/**
 * GoogleSyncService
 *
 * Servico responsavel pela sincronizacao de dados do Google Ads.
 * Chama a Edge Function google-run-sync para executar a sincronizacao
 * no backend, com todos os dados sendo gerenciados pelo servidor.
 */

import { supabase } from '../supabase';
import type {
  GoogleAdAccount,
  GoogleSyncJob,
  SyncProgressCallback,
  GoogleSyncResult,
  GoogleSyncStatusResponse,
} from '../connectors/google/types';

// ============================================
// Constantes
// ============================================

// URL base das Edge Functions
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// Intervalo de polling para acompanhar progresso (ms)
const POLL_INTERVAL_MS = 2000;

// Timeout maximo para sincronizacao (10 minutos)
const SYNC_TIMEOUT_MS = 600000;

// ============================================
// Helpers para Edge Functions
// ============================================

/**
 * Obtem headers de autenticacao para chamadas as Edge Functions
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuario nao autenticado');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * Chama uma Edge Function do Google Ads
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
// Classe Principal
// ============================================

export class GoogleSyncService {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  // ============================================
  // Metodo Principal de Sincronizacao
  // ============================================

  /**
   * Executa sincronizacao completa via Edge Function
   * @param accounts - Lista de contas para sincronizar (filtra por is_selected)
   * @param dateFrom - Data inicial do periodo
   * @param dateTo - Data final do periodo
   * @param onProgress - Callback de progresso
   */
  async syncAccounts(
    accounts: GoogleAdAccount[],
    dateFrom: string,
    dateTo: string,
    onProgress?: SyncProgressCallback
  ): Promise<GoogleSyncResult> {
    const startTime = Date.now();

    // Filtra apenas contas selecionadas
    const selectedAccounts = accounts.filter((acc) => acc.is_selected);

    if (selectedAccounts.length === 0) {
      return {
        success: false,
        accounts_synced: 0,
        campaigns_synced: 0,
        ad_groups_synced: 0,
        ads_synced: 0,
        metrics_synced: 0,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        errors: ['Nenhuma conta selecionada para sincronizacao'],
        duration_ms: Date.now() - startTime,
      };
    }

    // IDs das contas selecionadas
    const accountIds = selectedAccounts.map((acc) => acc.customer_id);

    onProgress?.({
      phase: 'Iniciando sincronizacao',
      percentage: 0,
      itemsProcessed: 0,
      itemsTotal: selectedAccounts.length,
      message: `Preparando ${selectedAccounts.length} conta(s)...`,
    });

    try {
      // Chama Edge Function para iniciar sincronizacao
      const response = await callEdgeFunction<{
        success: boolean;
        job_id: string;
        accounts_synced: number;
        campaigns_synced: number;
        ad_groups_synced: number;
        ads_synced: number;
        keywords_synced: number;
        metrics_synced: number;
        error?: string;
      }>('google-run-sync', 'POST', {
        account_ids: accountIds,
        date_from: dateFrom,
        date_to: dateTo,
        sync_type: 'full',
      });

      // Se a Edge Function executa sincrona, retorna resultado direto
      if (response.success) {
        onProgress?.({
          phase: 'Sincronizacao concluida',
          percentage: 100,
          itemsProcessed: selectedAccounts.length,
          itemsTotal: selectedAccounts.length,
          message: `${response.accounts_synced} conta(s) sincronizada(s)`,
        });

        return {
          success: true,
          accounts_synced: response.accounts_synced,
          campaigns_synced: response.campaigns_synced,
          ad_groups_synced: response.ad_groups_synced,
          ads_synced: response.ads_synced,
          metrics_synced: response.metrics_synced,
          date_range_start: dateFrom,
          date_range_end: dateTo,
          errors: [],
          duration_ms: Date.now() - startTime,
        };
      }

      // Se temos um job_id, faz polling do progresso
      if (response.job_id) {
        return await this.pollSyncProgress(
          response.job_id,
          dateFrom,
          dateTo,
          startTime,
          onProgress
        );
      }

      // Erro generico
      throw new Error(response.error || 'Falha ao iniciar sincronizacao');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

      onProgress?.({
        phase: 'Erro na sincronizacao',
        percentage: 0,
        itemsProcessed: 0,
        itemsTotal: selectedAccounts.length,
        message: errorMsg,
      });

      return {
        success: false,
        accounts_synced: 0,
        campaigns_synced: 0,
        ad_groups_synced: 0,
        ads_synced: 0,
        metrics_synced: 0,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        errors: [errorMsg],
        duration_ms: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Polling de Progresso
  // ============================================

  /**
   * Faz polling do status do job de sincronizacao
   */
  private async pollSyncProgress(
    jobId: string,
    dateFrom: string,
    dateTo: string,
    startTime: number,
    onProgress?: SyncProgressCallback
  ): Promise<GoogleSyncResult> {
    const timeoutAt = startTime + SYNC_TIMEOUT_MS;

    while (Date.now() < timeoutAt) {
      // Busca status do job
      const { data: job, error } = await supabase
        .from('google_sync_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        throw new Error('Job de sincronizacao nao encontrado');
      }

      // Atualiza progresso
      onProgress?.({
        phase: job.current_phase || 'Sincronizando',
        percentage: job.progress || 0,
        itemsProcessed: job.items_processed || 0,
        itemsTotal: job.items_total || 0,
        message: job.current_phase || 'Processando dados...',
      });

      // Verifica status final
      if (job.status === 'completed') {
        return {
          success: true,
          accounts_synced: job.items_total || 0,
          campaigns_synced: job.campaigns_synced || 0,
          ad_groups_synced: job.ad_groups_synced || 0,
          ads_synced: job.ads_synced || 0,
          metrics_synced: job.metrics_synced || 0,
          date_range_start: dateFrom,
          date_range_end: dateTo,
          errors: [],
          duration_ms: Date.now() - startTime,
        };
      }

      if (job.status === 'failed' || job.status === 'cancelled') {
        return {
          success: false,
          accounts_synced: 0,
          campaigns_synced: job.campaigns_synced || 0,
          ad_groups_synced: job.ad_groups_synced || 0,
          ads_synced: job.ads_synced || 0,
          metrics_synced: job.metrics_synced || 0,
          date_range_start: dateFrom,
          date_range_end: dateTo,
          errors: [job.error_message || 'Sincronizacao falhou'],
          duration_ms: Date.now() - startTime,
        };
      }

      // Aguarda proximo poll
      await this.delay(POLL_INTERVAL_MS);
    }

    // Timeout
    return {
      success: false,
      accounts_synced: 0,
      campaigns_synced: 0,
      ad_groups_synced: 0,
      ads_synced: 0,
      metrics_synced: 0,
      date_range_start: dateFrom,
      date_range_end: dateTo,
      errors: ['Timeout: sincronizacao demorou mais que 10 minutos'],
      duration_ms: Date.now() - startTime,
    };
  }

  // ============================================
  // Metodos de Busca de Dados
  // ============================================

  /**
   * Busca status da sincronizacao
   */
  async getSyncStatus(): Promise<GoogleSyncStatusResponse | null> {
    try {
      return await callEdgeFunction<GoogleSyncStatusResponse>('google-get-sync-status', 'GET');
    } catch (error) {
      console.error('[GoogleSyncService] Erro ao buscar status:', error);
      return null;
    }
  }

  /**
   * Busca campanhas sincronizadas do banco de dados
   */
  async getCampaigns(customerId?: string): Promise<Array<{
    id: string;
    campaign_id: string;
    name: string;
    status: string;
    channel_type: string;
    budget_amount: number | null;
    budget_type: string | null;
  }>> {
    let query = supabase
      .from('google_campaigns')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('name');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GoogleSyncService] Erro ao buscar campanhas:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Busca grupos de anuncios sincronizados
   */
  async getAdGroups(campaignId?: string): Promise<Array<{
    id: string;
    ad_group_id: string;
    campaign_id: string;
    name: string;
    status: string;
    ad_group_type: string | null;
  }>> {
    let query = supabase
      .from('google_ad_groups')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('name');

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GoogleSyncService] Erro ao buscar grupos:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Busca anuncios sincronizados
   */
  async getAds(adGroupId?: string): Promise<Array<{
    id: string;
    ad_id: string;
    ad_group_id: string;
    campaign_id: string;
    name: string | null;
    status: string;
    ad_type: string | null;
    final_urls: string[] | null;
  }>> {
    let query = supabase
      .from('google_ads')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('created_at', { ascending: false });

    if (adGroupId) {
      query = query.eq('ad_group_id', adGroupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GoogleSyncService] Erro ao buscar anuncios:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Busca palavras-chave sincronizadas
   */
  async getKeywords(adGroupId?: string): Promise<Array<{
    id: string;
    keyword_id: string;
    ad_group_id: string;
    campaign_id: string;
    keyword_text: string;
    match_type: string;
    status: string;
    quality_score: number | null;
  }>> {
    let query = supabase
      .from('google_keywords')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('keyword_text');

    if (adGroupId) {
      query = query.eq('ad_group_id', adGroupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GoogleSyncService] Erro ao buscar keywords:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Busca metricas diarias
   */
  async getInsights(options: {
    customerId?: string;
    campaignId?: string;
    adGroupId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<Array<{
    date: string;
    campaign_id: string;
    campaign_name: string;
    ad_group_id: string | null;
    ad_group_name: string | null;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
  }>> {
    let query = supabase
      .from('google_insights_daily')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('date', { ascending: false });

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
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GoogleSyncService] Erro ao buscar insights:', error);
      return [];
    }

    return data || [];
  }

  // ============================================
  // Metodos Auxiliares
  // ============================================

  /**
   * Delay assincrono
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Funcoes Auxiliares Exportadas
// ============================================

/**
 * Cria instancia do servico de sincronizacao para o usuario atual
 */
export async function createGoogleSyncService(): Promise<GoogleSyncService | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Busca workspace como owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace) {
      return new GoogleSyncService(workspace.id);
    }

    // Tenta como membro
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      return new GoogleSyncService(membership.workspace_id);
    }

    return null;
  } catch (error) {
    console.error('[GoogleSyncService] Erro ao criar servico:', error);
    return null;
  }
}

/**
 * Executa sincronizacao rapida (ultimos 7 dias) via Edge Function
 */
export async function runQuickSync(
  accountIds?: string[],
  onProgress?: SyncProgressCallback
): Promise<GoogleSyncResult> {
  const service = await createGoogleSyncService();

  if (!service) {
    return {
      success: false,
      accounts_synced: 0,
      campaigns_synced: 0,
      ad_groups_synced: 0,
      ads_synced: 0,
      metrics_synced: 0,
      date_range_start: '',
      date_range_end: '',
      errors: ['Servico de sincronizacao nao disponivel'],
      duration_ms: 0,
    };
  }

  // Busca contas selecionadas
  const { data: accounts } = await supabase
    .from('google_ad_accounts')
    .select('*')
    .eq('is_selected', true);

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      accounts_synced: 0,
      campaigns_synced: 0,
      ad_groups_synced: 0,
      ads_synced: 0,
      metrics_synced: 0,
      date_range_start: '',
      date_range_end: '',
      errors: ['Nenhuma conta selecionada'],
      duration_ms: 0,
    };
  }

  // Filtra por IDs se especificado
  const targetAccounts = accountIds
    ? accounts.filter((acc) => accountIds.includes(acc.id))
    : accounts;

  // Define periodo (ultimos 7 dias)
  const dateTo = new Date().toISOString().split('T')[0];
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return service.syncAccounts(targetAccounts, dateFrom, dateTo, onProgress);
}

/**
 * Busca status completo da sincronizacao Google Ads
 */
export async function getGoogleSyncStatus(): Promise<GoogleSyncStatusResponse | null> {
  try {
    return await callEdgeFunction<GoogleSyncStatusResponse>('google-get-sync-status', 'GET');
  } catch (error) {
    console.error('[GoogleSyncService] Erro ao buscar status:', error);
    return null;
  }
}

/**
 * Lista todas as contas Google Ads do workspace
 */
export async function listGoogleAccounts(): Promise<{
  accounts: GoogleAdAccount[];
  total: number;
  connected: boolean;
  error?: string;
}> {
  try {
    return await callEdgeFunction<{
      accounts: GoogleAdAccount[];
      total: number;
      connected: boolean;
      error?: string;
    }>('google-list-adaccounts', 'GET');
  } catch (error) {
    console.error('[GoogleSyncService] Erro ao listar contas:', error);
    return {
      accounts: [],
      total: 0,
      connected: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Alterna selecao de uma conta Google Ads
 */
export async function toggleGoogleAccountSelection(
  accountId: string,
  isSelected: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('google_ad_accounts')
      .update({ is_selected: isSelected })
      .eq('id', accountId);

    return !error;
  } catch (error) {
    console.error('[GoogleSyncService] Erro ao alternar selecao:', error);
    return false;
  }
}
