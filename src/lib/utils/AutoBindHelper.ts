/**
 * AutoBindHelper
 *
 * Utilitário para vincular automaticamente contas Meta a clientes.
 * Detecta cenários onde a vinculação automática faz sentido e executa.
 */

import { supabase } from '../supabase';

export interface UnboundAccount {
  meta_ad_account_id: string;
  account_name: string;
  workspace_id: string;
}

export interface Client {
  id: string;
  name: string;
  workspace_id: string;
}

export interface BindingResult {
  success: boolean;
  boundCount: number;
  error?: string;
}

/**
 * Busca contas Meta que não estão vinculadas a nenhum cliente
 */
export async function getUnboundMetaAccounts(
  workspaceId: string
): Promise<UnboundAccount[]> {
  try {
    // Busca todas as contas Meta da conexão do workspace
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('meta_ad_account_id, account_name')
      .eq('workspace_id', workspaceId);

    if (!connections || connections.length === 0) {
      return [];
    }

    // Busca contas que já estão vinculadas
    const { data: boundAccounts } = await supabase
      .from('client_meta_ad_accounts')
      .select('meta_ad_account_id')
      .eq('workspace_id', workspaceId);

    const boundAccountIds = new Set(
      boundAccounts?.map((a) => a.meta_ad_account_id) || []
    );

    // Retorna apenas as não vinculadas
    return connections
      .filter((conn) => !boundAccountIds.has(conn.meta_ad_account_id))
      .map((conn) => ({
        meta_ad_account_id: conn.meta_ad_account_id,
        account_name: conn.account_name,
        workspace_id: workspaceId,
      }));
  } catch (error) {
    console.error('Error getting unbound accounts:', error);
    return [];
  }
}

/**
 * Busca todos os clientes de um workspace
 */
export async function getClientsFromWorkspace(
  workspaceId: string
): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, workspace_id')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting clients:', error);
    return [];
  }
}

/**
 * Vincula uma conta Meta a um cliente
 */
export async function bindAccountToClient(
  clientId: string,
  metaAdAccountId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('client_meta_ad_accounts').insert({
      client_id: clientId,
      meta_ad_account_id: metaAdAccountId,
      workspace_id: workspaceId,
    });

    if (error) {
      console.error('Error binding account:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error binding account to client:', error);
    return false;
  }
}

/**
 * Vincula múltiplas contas a um ou mais clientes
 */
export async function bindAccountsToClients(
  bindings: Array<{
    clientId: string;
    accountIds: string[];
  }>,
  workspaceId: string
): Promise<BindingResult> {
  try {
    let boundCount = 0;

    for (const binding of bindings) {
      for (const accountId of binding.accountIds) {
        const success = await bindAccountToClient(
          binding.clientId,
          accountId,
          workspaceId
        );
        if (success) boundCount++;
      }
    }

    return {
      success: true,
      boundCount,
    };
  } catch (error) {
    console.error('Error binding accounts to clients:', error);
    return {
      success: false,
      boundCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Vincula automaticamente contas quando há apenas um cliente
 * Retorna true se executou a vinculação automática
 */
export async function autoBindIfPossible(
  workspaceId: string
): Promise<BindingResult> {
  try {
    // Busca clientes do workspace
    const clients = await getClientsFromWorkspace(workspaceId);

    // Busca contas Meta não vinculadas
    const unboundAccounts = await getUnboundMetaAccounts(workspaceId);

    // Se não há contas não vinculadas, não há o que fazer
    if (unboundAccounts.length === 0) {
      return {
        success: true,
        boundCount: 0,
      };
    }

    // Se não há clientes, não pode vincular
    if (clients.length === 0) {
      return {
        success: false,
        boundCount: 0,
        error: 'No clients available',
      };
    }

    // Se tem apenas 1 cliente, vincula automaticamente todas as contas a ele
    if (clients.length === 1) {
      const result = await bindAccountsToClients(
        [
          {
            clientId: clients[0].id,
            accountIds: unboundAccounts.map((a) => a.meta_ad_account_id),
          },
        ],
        workspaceId
      );

      return result;
    }

    // Se tem múltiplos clientes, não faz vinculação automática
    // Deixa o usuário escolher
    return {
      success: false,
      boundCount: 0,
      error: 'Multiple clients available - manual binding required',
    };
  } catch (error) {
    console.error('Error in auto-bind:', error);
    return {
      success: false,
      boundCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verifica se existem contas não vinculadas que precisam de atenção
 */
export async function hasUnboundAccounts(workspaceId: string): Promise<boolean> {
  const unboundAccounts = await getUnboundMetaAccounts(workspaceId);
  return unboundAccounts.length > 0;
}

/**
 * Obtém estatísticas de vinculação para um workspace
 */
export async function getBindingStats(workspaceId: string): Promise<{
  totalAccounts: number;
  boundAccounts: number;
  unboundAccounts: number;
  totalClients: number;
}> {
  try {
    // Total de contas Meta
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('meta_ad_account_id')
      .eq('workspace_id', workspaceId);

    const totalAccounts = connections?.length || 0;

    // Contas vinculadas
    const { data: boundAccounts } = await supabase
      .from('client_meta_ad_accounts')
      .select('meta_ad_account_id')
      .eq('workspace_id', workspaceId);

    const boundCount = boundAccounts?.length || 0;

    // Total de clientes
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('workspace_id', workspaceId);

    const totalClients = clients?.length || 0;

    return {
      totalAccounts,
      boundAccounts: boundCount,
      unboundAccounts: totalAccounts - boundCount,
      totalClients,
    };
  } catch (error) {
    console.error('Error getting binding stats:', error);
    return {
      totalAccounts: 0,
      boundAccounts: 0,
      unboundAccounts: 0,
      totalClients: 0,
    };
  }
}
