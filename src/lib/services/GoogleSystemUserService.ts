/**
 * GoogleSystemUserService
 *
 * Servico para gerenciar a conexao com o Google Ads via Developer Token.
 * Responsavel por salvar credenciais, validar conexao, listar contas
 * e gerenciar vinculacoes de contas ao workspace.
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

// ============================================
// Funcoes de Conexao
// ============================================

/**
 * Valida as credenciais do Google Ads e salva a conexao
 * @param developerToken - Token de desenvolvedor do Google Ads
 * @param customerId - ID do cliente (MCC ou conta individual)
 * @param loginCustomerId - ID de login opcional para acesso MCC
 */
export async function validateGoogleConnection(
  developerToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<ValidateGoogleConnectionResponse> {
  try {
    // Obtem o workspace_id do usuario atual
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return {
        status: 'invalid',
        error: 'Workspace nao encontrado',
      };
    }

    // Formata o Customer ID (remove hifens se houver)
    const formattedCustomerId = customerId.replace(/-/g, '');
    const formattedLoginCustomerId = loginCustomerId?.replace(/-/g, '');

    // Verifica se ja existe uma conexao para este workspace
    const { data: existingConnection } = await supabase
      .from('google_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Dados da conexao
    const connectionData = {
      workspace_id: workspaceId,
      developer_token: developerToken,
      customer_id: formattedCustomerId,
      login_customer_id: formattedLoginCustomerId || null,
      status: 'active' as const,
      last_validated_at: new Date().toISOString(),
      error_message: null,
    };

    // Insere ou atualiza a conexao
    let connectionId: string;
    if (existingConnection) {
      const { error: updateError } = await supabase
        .from('google_connections')
        .update(connectionData)
        .eq('id', existingConnection.id);

      if (updateError) {
        return {
          status: 'invalid',
          error: 'Erro ao atualizar conexao: ' + updateError.message,
        };
      }
      connectionId = existingConnection.id;
    } else {
      const { data: newConnection, error: insertError } = await supabase
        .from('google_connections')
        .insert(connectionData)
        .select('id')
        .single();

      if (insertError || !newConnection) {
        return {
          status: 'invalid',
          error: 'Erro ao salvar conexao: ' + (insertError?.message || 'Erro desconhecido'),
        };
      }
      connectionId = newConnection.id;
    }

    // Busca as contas disponiveis usando a API
    const accountsResult = await fetchGoogleAccounts(
      developerToken,
      formattedCustomerId,
      formattedLoginCustomerId
    );

    if (accountsResult.error) {
      // Atualiza status para erro
      await supabase
        .from('google_connections')
        .update({
          status: 'error',
          error_message: accountsResult.error,
        })
        .eq('id', connectionId);

      return {
        status: 'invalid',
        error: accountsResult.error,
      };
    }

    // Salva as contas encontradas no banco
    if (accountsResult.accounts && accountsResult.accounts.length > 0) {
      for (const account of accountsResult.accounts) {
        await supabase
          .from('google_ad_accounts')
          .upsert(
            {
              workspace_id: workspaceId,
              connection_id: connectionId,
              customer_id: account.customer_id,
              name: account.name,
              currency_code: account.currency_code,
              timezone: account.timezone,
              status: account.status,
              is_manager: account.is_manager,
            },
            { onConflict: 'workspace_id,customer_id' }
          );
      }
    }

    return {
      status: 'connected',
      workspace_id: workspaceId,
      customer_id: formattedCustomerId,
      customer_name: accountsResult.accounts?.[0]?.name || 'Conta Google Ads',
      accounts_count: accountsResult.accounts?.length || 0,
    };
  } catch (error) {
    console.error('Erro ao validar conexao Google:', error);
    return {
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Busca contas do Google Ads usando a API REST
 * Nota: Esta funcao simula a chamada a API do Google Ads.
 * Em producao, devera ser substituida por uma Edge Function
 * que faz a chamada real a API.
 */
async function fetchGoogleAccounts(
  _developerToken: string,
  customerId: string,
  _loginCustomerId?: string
): Promise<{ accounts: Partial<GoogleAdAccount>[]; error?: string }> {
  // Por enquanto, retorna a conta principal como uma conta valida
  // Em producao, esta funcao chamara a Edge Function google-list-accounts

  // Simula uma conta para testes
  // TODO: Implementar Edge Function para buscar contas reais
  return {
    accounts: [
      {
        customer_id: customerId,
        name: `Conta ${customerId}`,
        currency_code: 'BRL',
        timezone: 'America/Sao_Paulo',
        status: 'ENABLED',
        is_manager: false,
      },
    ],
  };
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
 */
export async function listGoogleAdAccounts(): Promise<ListGoogleAccountsResponse> {
  try {
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
 */
export async function getGoogleSyncStatus(): Promise<GoogleSyncStatusResponse> {
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
    console.error('Erro ao obter status de sincronizacao:', error);
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
