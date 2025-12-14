/**
 * MetaConnectionsPage
 *
 * Pagina completa para gerenciar multiplas conexoes Meta e catalogo de Ad Accounts.
 * Substitui a pagina antiga de conexao unica.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Users,
  LinkIcon,
  Unlink,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  listConnections,
  createConnection,
  setDefaultConnection,
  removeConnection,
  listAdAccounts,
  syncAdAccounts,
  bindAdAccountToClient,
  unbindAdAccount,
  listClientsForBinding,
  type MetaConnection,
  type AdAccountCatalogItem,
  type ClientBasic,
} from '../../lib/services/MetaConnectionsService';

// ============================================
// Tipos
// ============================================

interface FormState {
  name: string;
  business_manager_id: string;
  system_user_token: string;
  set_as_default: boolean;
}

// ============================================
// Componente: ConnectionCard
// ============================================

interface ConnectionCardProps {
  connection: MetaConnection;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  onSync: (id: string) => void;
  isLoading: boolean;
  syncingId: string | null;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onSetDefault,
  onRemove,
  onSync,
  isLoading,
  syncingId,
}) => {
  const statusConfig = {
    connected: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Conectada' },
    invalid: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Invalida' },
    revoked: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Revogada' },
  };

  const status = statusConfig[connection.status] || statusConfig.invalid;
  const StatusIcon = status.icon;
  const isSyncing = syncingId === connection.id;

  return (
    <Card className="p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        {/* Info principal */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${connection.is_default ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Link2 className={`w-5 h-5 ${connection.is_default ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{connection.name}</h3>
              {connection.is_default && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Padrao
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              BM: {connection.business_manager_id}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
              <span className="text-xs text-gray-500">
                {connection.adaccounts_count || 0} contas
              </span>
              {connection.last_validated_at && (
                <span className="text-xs text-gray-400">
                  Validada: {new Date(connection.last_validated_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSync(connection.id)}
            disabled={isLoading || connection.status !== 'connected'}
            title="Sincronizar contas"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          {!connection.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault(connection.id)}
              disabled={isLoading}
              title="Definir como padrao"
            >
              <Star className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(connection.id)}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Remover conexao"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Escopos */}
      {connection.granted_scopes && connection.granted_scopes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Permissoes:</p>
          <div className="flex flex-wrap gap-1">
            {connection.granted_scopes.slice(0, 5).map((scope) => (
              <span
                key={scope}
                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {scope}
              </span>
            ))}
            {connection.granted_scopes.length > 5 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                +{connection.granted_scopes.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ============================================
// Componente: AddConnectionForm
// ============================================

interface AddConnectionFormProps {
  onSubmit: (form: FormState) => void;
  isLoading: boolean;
}

const AddConnectionForm: React.FC<AddConnectionFormProps> = ({ onSubmit, isLoading }) => {
  const [form, setForm] = useState<FormState>({
    name: '',
    business_manager_id: '',
    system_user_token: '',
    set_as_default: false,
  });
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isValid = form.name && form.business_manager_id && form.system_user_token;

  return (
    <Card className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">Adicionar nova conexao</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da conexao
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: BM Principal, BM Cliente X"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Business Manager ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Manager ID
            </label>
            <input
              type="text"
              value={form.business_manager_id}
              onChange={(e) => setForm({ ...form, business_manager_id: e.target.value })}
              placeholder="Ex: 123456789012345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System User Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.system_user_token}
                onChange={(e) => setForm({ ...form, system_user_token: e.target.value })}
                placeholder="Cole o token do System User aqui"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checkbox default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.set_as_default}
              onChange={(e) => setForm({ ...form, set_as_default: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Definir como conexao padrao</span>
          </label>

          {/* Botao submit */}
          <Button type="submit" disabled={!isValid || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validar e Conectar
              </>
            )}
          </Button>
        </form>
      )}
    </Card>
  );
};

// ============================================
// Componente: AdAccountsTable
// ============================================

interface AdAccountsTableProps {
  accounts: AdAccountCatalogItem[];
  clients: ClientBasic[];
  onBind: (metaAdAccountId: string, clientId: string, connectionId?: string) => void;
  onUnbind: (metaAdAccountId: string) => void;
  isLoading: boolean;
}

const AdAccountsTable: React.FC<AdAccountsTableProps> = ({
  accounts,
  clients,
  onBind,
  onUnbind,
  isLoading,
}) => {
  const [bindingAccountId, setBindingAccountId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  const handleBind = (account: AdAccountCatalogItem) => {
    if (!selectedClientId) return;
    onBind(account.meta_ad_account_id, selectedClientId, selectedConnectionId || undefined);
    setBindingAccountId(null);
    setSelectedClientId('');
    setSelectedConnectionId('');
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma conta de anuncio encontrada.</p>
        <p className="text-sm mt-1">Sincronize uma conexao para carregar as contas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Conta</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Moeda</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Conexao</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Vinculada a</th>
            <th className="text-center py-3 px-4 font-medium text-gray-700">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <React.Fragment key={account.id}>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                {/* Conta */}
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500">{account.meta_ad_account_id}</p>
                  </div>
                </td>

                {/* Moeda */}
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">{account.currency || '-'}</span>
                </td>

                {/* Conexao */}
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {account.primary_connection_name || '-'}
                  </span>
                </td>

                {/* Vinculada a */}
                <td className="py-3 px-4">
                  {account.client_bound ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      <Users className="w-3 h-3" />
                      {account.bound_client_name}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Nao vinculada</span>
                  )}
                </td>

                {/* Acoes */}
                <td className="py-3 px-4 text-center">
                  {account.client_bound ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnbind(account.meta_ad_account_id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Unlink className="w-4 h-4 mr-1" />
                      Desvincular
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBindingAccountId(account.meta_ad_account_id)}
                      disabled={isLoading}
                    >
                      <LinkIcon className="w-4 h-4 mr-1" />
                      Vincular
                    </Button>
                  )}
                </td>
              </tr>

              {/* Linha de vinculacao expandida */}
              {bindingAccountId === account.meta_ad_account_id && (
                <tr className="bg-blue-50">
                  <td colSpan={5} className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selecione o cliente
                        </label>
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {account.available_connections.length > 1 && (
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Conexao (opcional)
                          </label>
                          <select
                            value={selectedConnectionId}
                            onChange={(e) => setSelectedConnectionId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Automatica</option>
                            {account.available_connections.map((conn) => (
                              <option key={conn.id} value={conn.id}>
                                {conn.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-end gap-2">
                        <Button
                          onClick={() => handleBind(account)}
                          disabled={!selectedClientId || isLoading}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setBindingAccountId(null);
                            setSelectedClientId('');
                            setSelectedConnectionId('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// Componente Principal
// ============================================

export const MetaConnectionsPage: React.FC = () => {
  // Estados
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [accounts, setAccounts] = useState<AdAccountCatalogItem[]>([]);
  const [clients, setClients] = useState<ClientBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [conns, accs, cls] = await Promise.all([
        listConnections(),
        listAdAccounts(),
        listClientsForBinding(),
      ]);

      setConnections(conns);
      setAccounts(accs);
      setClients(cls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleCreateConnection = async (form: FormState) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createConnection({
        name: form.name,
        business_manager_id: form.business_manager_id,
        system_user_token: form.system_user_token,
        set_as_default: form.set_as_default,
      });

      setSuccess(`Conexao criada com sucesso! ${result.adaccounts_count} contas encontradas.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conexao');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (connectionId: string) => {
    setActionLoading(true);
    setError(null);

    try {
      await setDefaultConnection(connectionId);
      setSuccess('Conexao definida como padrao.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao definir conexao padrao');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta conexao?')) return;

    setActionLoading(true);
    setError(null);

    try {
      await removeConnection(connectionId);
      setSuccess('Conexao removida com sucesso.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover conexao');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    setSyncingId(connectionId);
    setError(null);

    try {
      const result = await syncAdAccounts(connectionId);
      setSuccess(`Sincronizacao concluida! ${result.total_accounts} contas atualizadas.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncingId(null);
    }
  };

  const handleBindAccount = async (metaAdAccountId: string, clientId: string, connectionId?: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const result = await bindAdAccountToClient({
        client_id: clientId,
        meta_ad_account_id: metaAdAccountId,
        connection_id: connectionId,
      });
      setSuccess(`Conta vinculada ao cliente "${result.client_name}".`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular conta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbindAccount = async (metaAdAccountId: string) => {
    if (!confirm('Tem certeza que deseja desvincular esta conta?')) return;

    setActionLoading(true);
    setError(null);

    try {
      await unbindAdAccount(metaAdAccountId);
      setSuccess('Conta desvinculada com sucesso.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular conta');
    } finally {
      setActionLoading(false);
    }
  };

  // Limpar mensagens apos alguns segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conexoes Meta</h1>
          <p className="text-gray-500 mt-1">
            Gerencie suas conexoes com o Meta Ads e vincule contas aos clientes.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Secao: Conexoes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conexoes ativas</h2>

        {connections.length === 0 ? (
          <Card className="p-8 text-center">
            <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhuma conexao configurada.</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione uma conexao para comecar a sincronizar dados do Meta Ads.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onSetDefault={handleSetDefault}
                onRemove={handleRemoveConnection}
                onSync={handleSyncConnection}
                isLoading={actionLoading}
                syncingId={syncingId}
              />
            ))}
          </div>
        )}

        {/* Formulario para adicionar */}
        <div className="mt-4">
          <AddConnectionForm onSubmit={handleCreateConnection} isLoading={actionLoading} />
        </div>
      </section>

      {/* Secao: Catalogo de Ad Accounts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Catalogo de Contas de Anuncio
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({accounts.length} contas)
          </span>
        </h2>

        <Card className="p-4">
          <AdAccountsTable
            accounts={accounts}
            clients={clients}
            onBind={handleBindAccount}
            onUnbind={handleUnbindAccount}
            isLoading={actionLoading}
          />
        </Card>
      </section>
    </div>
  );
};

export default MetaConnectionsPage;
