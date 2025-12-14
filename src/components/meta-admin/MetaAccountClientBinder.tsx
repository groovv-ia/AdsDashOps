/**
 * MetaAccountClientBinder
 *
 * Componente para vincular contas Meta Ads a clientes.
 * Permite gerenciar vínculos entre contas Meta e clientes de forma visual.
 */

import React, { useState, useEffect } from 'react';
import {
  Link2,
  Unlink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Users,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { bindAdAccountsToClient } from '../../lib/services/MetaSystemUserService';
import { useClient, Client } from '../../contexts/ClientContext';

// Interface para conta Meta com informações de vínculo
interface MetaAccountWithBinding {
  id: string; // UUID interno
  meta_ad_account_id: string; // ID do Meta (act_XXXXX)
  name: string;
  currency: string;
  timezone: string;
  account_status: string;
  client_id: string | null;
  client_name: string | null;
  binding_status: 'active' | 'inactive' | null;
}

interface MetaAccountClientBinderProps {
  workspaceId: string;
  onBindingChange?: () => void;
}

export const MetaAccountClientBinder: React.FC<MetaAccountClientBinderProps> = ({
  workspaceId,
  onBindingChange,
}) => {
  const { clients, refreshClients } = useClient();

  // Estado das contas
  const [accounts, setAccounts] = useState<MetaAccountWithBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Estado do modal
  const [showBindModal, setShowBindModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [binding, setBinding] = useState(false);

  // Mensagens
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carrega contas e vínculos
  useEffect(() => {
    loadAccounts();
    refreshClients();
  }, [workspaceId]);

  // Função para carregar contas com informações de vínculo
  const loadAccounts = async () => {
    setLoading(true);
    try {
      // Busca todas as contas Meta do workspace
      const { data: metaAccounts, error: accountsError } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (accountsError) throw accountsError;

      // Busca todos os vínculos
      const { data: bindings, error: bindingsError } = await supabase
        .from('client_meta_ad_accounts')
        .select(`
          meta_ad_account_id,
          client_id,
          status,
          clients (
            id,
            name
          )
        `);

      if (bindingsError) throw bindingsError;

      // Cria um mapa de vínculos por meta_ad_account_id (UUID interno)
      const bindingMap = new Map();
      (bindings || []).forEach((binding: any) => {
        bindingMap.set(binding.meta_ad_account_id, {
          client_id: binding.clients?.id || null,
          client_name: binding.clients?.name || null,
          binding_status: binding.status,
        });
      });

      // Combina as informações
      const accountsWithBindings: MetaAccountWithBinding[] = (metaAccounts || []).map((acc: any) => {
        const binding = bindingMap.get(acc.id);

        return {
          id: acc.id,
          meta_ad_account_id: acc.meta_ad_account_id,
          name: acc.name,
          currency: acc.currency,
          timezone: acc.timezone,
          account_status: acc.account_status,
          client_id: binding?.client_id || null,
          client_name: binding?.client_name || null,
          binding_status: binding?.binding_status || null,
        };
      });

      setAccounts(accountsWithBindings);
    } catch (error) {
      console.error('Error loading accounts:', error);
      showMessage('error', 'Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  // Função para vincular contas ao cliente selecionado
  const handleBindAccounts = async () => {
    if (!selectedClientId || selectedAccountIds.length === 0) {
      showMessage('error', 'Selecione um cliente e pelo menos uma conta');
      return;
    }

    setBinding(true);
    try {
      // Busca os meta_ad_account_id (formato act_XXX) das contas selecionadas
      const accountsToB = accounts.filter((acc) => selectedAccountIds.includes(acc.id));
      const metaIds = accountsToB.map((acc) => acc.meta_ad_account_id);

      // Chama a Edge Function para vincular
      const result = await bindAdAccountsToClient(selectedClientId, metaIds);

      if (result.success) {
        showMessage('success', `${result.bound_accounts} conta(s) vinculada(s) com sucesso!`);
        setShowBindModal(false);
        setSelectedAccountIds([]);
        setSelectedClientId('');
        await loadAccounts();
        onBindingChange?.();
      } else {
        showMessage('error', result.error || 'Erro ao vincular contas');
      }
    } catch (error) {
      console.error('Error binding accounts:', error);
      showMessage('error', 'Erro ao vincular contas');
    } finally {
      setBinding(false);
    }
  };

  // Função para desvincular conta
  const handleUnbindAccount = async (accountId: string) => {
    try {
      // Remove o vínculo da tabela client_meta_ad_accounts
      const { error } = await supabase
        .from('client_meta_ad_accounts')
        .delete()
        .eq('meta_ad_account_id', accountId);

      if (error) throw error;

      showMessage('success', 'Conta desvinculada com sucesso!');
      await loadAccounts();
      onBindingChange?.();
    } catch (error) {
      console.error('Error unbinding account:', error);
      showMessage('error', 'Erro ao desvincular conta');
    }
  };

  // Função para mostrar mensagem temporária
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Função para selecionar/deselecionar conta
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Filtra contas sem vínculo e com vínculo
  const unboundAccounts = accounts.filter((acc) => !acc.client_id);
  const boundAccounts = accounts.filter((acc) => acc.client_id);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando contas...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de feedback */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Seção de contas sem vínculo */}
      {unboundAccounts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">
                Contas sem Cliente ({unboundAccounts.length})
              </h3>
            </div>
            <Button
              onClick={() => setShowBindModal(true)}
              disabled={selectedAccountIds.length === 0}
              size="sm"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Vincular Selecionadas
            </Button>
          </div>

          <div className="space-y-2">
            {unboundAccounts.map((account) => (
              <div
                key={account.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedAccountIds.includes(account.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => toggleAccountSelection(account.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {account.meta_ad_account_id}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                  Sem Cliente
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Seção de contas vinculadas */}
      {boundAccounts.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              Contas Vinculadas ({boundAccounts.length})
            </h3>
          </div>

          <div className="space-y-2">
            {boundAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {account.meta_ad_account_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">{account.client_name}</p>
                    <p className="text-xs text-gray-500">Cliente</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnbindAccount(account.id)}
                  >
                    <Unlink className="w-3 h-3 mr-1" />
                    Desvincular
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mensagem quando não há contas */}
      {accounts.length === 0 && (
        <Card className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma conta encontrada
          </h3>
          <p className="text-gray-600">
            Conecte suas contas Meta Ads primeiro na aba de conexão
          </p>
        </Card>
      )}

      {/* Modal de seleção de cliente */}
      <Modal
        isOpen={showBindModal}
        onClose={() => setShowBindModal(false)}
        title="Vincular Contas a Cliente"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {selectedAccountIds.length} conta(s) selecionada(s)
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Cliente
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Escolha um cliente --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            {clients.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                Você precisa criar um cliente primeiro
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBindModal(false)}
              className="flex-1"
              disabled={binding}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleBindAccounts}
              className="flex-1"
              disabled={binding || !selectedClientId || clients.length === 0}
            >
              {binding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Vincular
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
