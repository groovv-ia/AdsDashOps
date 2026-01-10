/**
 * UnboundAccountsModal
 *
 * Modal que alerta quando há contas Meta não vinculadas a nenhum cliente
 * e permite ao usuário fazer a vinculação rapidamente.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import {
  getUnboundMetaAccounts,
  getClientsFromWorkspace,
  bindAccountToClient,
  type UnboundAccount,
  type Client,
} from '../../lib/utils/AutoBindHelper';

interface UnboundAccountsModalProps {
  // Se o modal está aberto
  isOpen: boolean;

  // Callback para fechar o modal
  onClose: () => void;

  // Workspace ID
  workspaceId: string;

  // Callback quando vinculações são salvas
  onBindingsComplete?: () => void;
}

export const UnboundAccountsModal: React.FC<UnboundAccountsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onBindingsComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unboundAccounts, setUnboundAccounts] = useState<UnboundAccount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Mapeamento de conta → cliente selecionado
  const [bindings, setBindings] = useState<Record<string, string>>({});

  // Flag para criar novo cliente
  const [creatingNewClient, setCreatingNewClient] = useState<Record<string, boolean>>({});
  const [newClientNames, setNewClientNames] = useState<Record<string, string>>({});

  /**
   * Carrega contas não vinculadas e clientes disponíveis
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [accounts, clientsList] = await Promise.all([
        getUnboundMetaAccounts(workspaceId),
        getClientsFromWorkspace(workspaceId),
      ]);

      setUnboundAccounts(accounts);
      setClients(clientsList);

      // Se não há contas não vinculadas, fecha o modal
      if (accounts.length === 0) {
        onClose();
      }
    } catch (err) {
      console.error('Error loading unbound accounts:', err);
      setError('Erro ao carregar contas não vinculadas');
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, workspaceId]);

  /**
   * Salva as vinculações
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Para cada conta não vinculada
      for (const account of unboundAccounts) {
        const binding = bindings[account.meta_ad_account_id];

        if (!binding) continue; // Pula se não foi selecionado

        let clientId = binding;

        // Se está criando um novo cliente
        if (creatingNewClient[account.meta_ad_account_id]) {
          const newClientName = newClientNames[account.meta_ad_account_id];

          if (!newClientName || !newClientName.trim()) {
            setError(`Por favor, forneça um nome para o novo cliente da conta ${account.account_name}`);
            setSaving(false);
            return;
          }

          // Cria o novo cliente
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              workspace_id: workspaceId,
              name: newClientName.trim(),
            })
            .select()
            .single();

          if (clientError) throw clientError;
          clientId = newClient.id;
        }

        // Vincula a conta ao cliente
        await bindAccountToClient(clientId, account.meta_ad_account_id, workspaceId);
      }

      // Sucesso!
      if (onBindingsComplete) {
        onBindingsComplete();
      }

      onClose();
    } catch (err) {
      console.error('Error saving bindings:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar vinculações');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Alterna entre cliente existente e criar novo
   */
  const toggleCreateNew = (accountId: string) => {
    setCreatingNewClient(prev => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));

    // Limpa seleção quando alterna
    if (!creatingNewClient[accountId]) {
      const newBindings = { ...bindings };
      delete newBindings[accountId];
      setBindings(newBindings);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contas não vinculadas">
      <div className="space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Você tem contas não vinculadas
            </h3>
            <p className="text-sm text-gray-600">
              Para visualizar dados dessas contas, você precisa vinculá-las a um
              cliente existente ou criar um novo.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-600 mt-2">Carregando...</p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Lista de contas não vinculadas */}
        {!loading && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {unboundAccounts.map((account) => (
              <div
                key={account.meta_ad_account_id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="font-medium text-gray-900 mb-3">
                  {account.account_name}
                </div>

                {/* Opção: Cliente existente */}
                {!creatingNewClient[account.meta_ad_account_id] && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vincular ao cliente:
                    </label>
                    <select
                      value={bindings[account.meta_ad_account_id] || ''}
                      onChange={(e) =>
                        setBindings({
                          ...bindings,
                          [account.meta_ad_account_id]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Opção: Criar novo cliente */}
                {creatingNewClient[account.meta_ad_account_id] && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do novo cliente:
                    </label>
                    <input
                      type="text"
                      value={newClientNames[account.meta_ad_account_id] || ''}
                      onChange={(e) =>
                        setNewClientNames({
                          ...newClientNames,
                          [account.meta_ad_account_id]: e.target.value,
                        })
                      }
                      placeholder="Digite o nome do cliente"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Botão para alternar */}
                <button
                  onClick={() => toggleCreateNew(account.meta_ad_account_id)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {creatingNewClient[account.meta_ad_account_id]
                    ? 'Vincular a cliente existente'
                    : 'Criar novo cliente'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Botões de ação */}
        {!loading && unboundAccounts.length > 0 && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Fazer depois
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              Salvar vinculações
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
