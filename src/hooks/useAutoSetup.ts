/**
 * useAutoSetup Hook
 *
 * Hook para automação de criação de clientes e vinculação de contas Meta.
 * Fornece funções reutilizáveis para o processo de setup.
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  bindAccountsToClients,
  autoBindIfPossible,
  type BindingResult,
} from '../lib/utils/AutoBindHelper';
import {
  generateClientNameSuggestions,
  generateGroupedClientName,
} from '../lib/utils/ClientNameSuggestions';
import { completeSetupStep } from '../lib/services/SetupService';

export interface MetaAccount {
  id: string;
  name: string;
}

export interface ClientCreationResult {
  clientId: string;
  clientName: string;
  accountIds: string[];
}

export interface AutoSetupResult {
  success: boolean;
  clientsCreated: number;
  accountsBound: number;
  error?: string;
}

/**
 * Hook com funções de automação para o setup
 */
export function useAutoSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cria um cliente para cada conta Meta
   */
  const createClientForEachAccount = async (
    accounts: MetaAccount[],
    workspaceId: string,
    userId: string
  ): Promise<AutoSetupResult> => {
    setLoading(true);
    setError(null);

    try {
      // Gera sugestões de nomes para os clientes
      const suggestions = await generateClientNameSuggestions(
        accounts,
        workspaceId
      );

      const createdClients: ClientCreationResult[] = [];

      // Cria um cliente para cada conta
      for (const suggestion of suggestions) {
        // Cria o cliente
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .insert({
            workspace_id: workspaceId,
            name: suggestion.suggestedName,
          })
          .select()
          .single();

        if (clientError) {
          console.error('Error creating client:', clientError);
          continue;
        }

        createdClients.push({
          clientId: client.id,
          clientName: client.name,
          accountIds: [suggestion.accountId],
        });
      }

      // Vincula cada conta ao seu respectivo cliente
      const bindings = createdClients.map((client) => ({
        clientId: client.clientId,
        accountIds: client.accountIds,
      }));

      const bindResult = await bindAccountsToClients(bindings, workspaceId);

      // Marca os steps como completos
      await completeSetupStep(userId, workspaceId, 'clients');
      await completeSetupStep(userId, workspaceId, 'bindings');

      setLoading(false);

      return {
        success: true,
        clientsCreated: createdClients.length,
        accountsBound: bindResult.boundCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        clientsCreated: 0,
        accountsBound: 0,
        error: errorMessage,
      };
    }
  };

  /**
   * Cria um único cliente e vincula todas as contas a ele
   */
  const createSingleClientForAccounts = async (
    accounts: MetaAccount[],
    workspaceId: string,
    userId: string,
    clientName?: string,
    userEmail?: string
  ): Promise<AutoSetupResult> => {
    setLoading(true);
    setError(null);

    try {
      // Gera ou usa o nome fornecido
      const finalClientName =
        clientName || (await generateGroupedClientName(workspaceId, userEmail));

      // Cria o cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          workspace_id: workspaceId,
          name: finalClientName,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Vincula todas as contas a este cliente
      const accountIds = accounts.map((acc) => acc.id);
      const bindResult = await bindAccountsToClients(
        [
          {
            clientId: client.id,
            accountIds,
          },
        ],
        workspaceId
      );

      // Marca os steps como completos
      await completeSetupStep(userId, workspaceId, 'clients');
      await completeSetupStep(userId, workspaceId, 'bindings');

      setLoading(false);

      return {
        success: true,
        clientsCreated: 1,
        accountsBound: bindResult.boundCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        clientsCreated: 0,
        accountsBound: 0,
        error: errorMessage,
      };
    }
  };

  /**
   * Tenta vincular automaticamente contas não vinculadas
   * (usado quando há apenas 1 cliente)
   */
  const autoBindAccounts = async (
    workspaceId: string
  ): Promise<BindingResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await autoBindIfPossible(workspaceId);
      setLoading(false);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        boundCount: 0,
        error: errorMessage,
      };
    }
  };

  /**
   * Vincula manualmente contas específicas a clientes
   */
  const bindAccountsManually = async (
    bindings: Array<{ clientId: string; accountIds: string[] }>,
    workspaceId: string,
    userId: string
  ): Promise<BindingResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await bindAccountsToClients(bindings, workspaceId);

      if (result.success) {
        await completeSetupStep(userId, workspaceId, 'bindings');
      }

      setLoading(false);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        boundCount: 0,
        error: errorMessage,
      };
    }
  };

  /**
   * Limpa o erro
   */
  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    clearError,
    createClientForEachAccount,
    createSingleClientForAccounts,
    autoBindAccounts,
    bindAccountsManually,
  };
}
