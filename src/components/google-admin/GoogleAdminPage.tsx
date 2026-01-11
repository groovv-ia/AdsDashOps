/**
 * GoogleAdminPage
 *
 * Pagina de administracao para configurar conexao com Google Ads.
 * Permite inserir Developer Token e Customer ID, validar conexao
 * e listar contas disponiveis para sincronizacao.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Link2,
  Building2,
  Loader2,
  Unplug,
  Info,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  validateGoogleConnection,
  getGoogleSyncStatus,
  listGoogleAdAccounts,
  updateAccountSelection,
  selectAllAccounts,
  disconnectGoogle,
  formatCustomerId,
} from '../../lib/services/GoogleSystemUserService';
import type {
  GoogleConnection,
  GoogleAdAccount,
  GoogleSyncStatusResponse,
} from '../../lib/connectors/google/types';

// Componente para renderizar o icone do Google Ads
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/google-ads-icon.svg" alt="Google Ads" className={className} />
);

export const GoogleAdminPage: React.FC = () => {
  // Estado do formulario
  const [developerToken, setDeveloperToken] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loginCustomerId, setLoginCustomerId] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Estado da conexao
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnection | null>(null);
  const [adAccounts, setAdAccounts] = useState<GoogleAdAccount[]>([]);
  const [syncStatus, setSyncStatus] = useState<GoogleSyncStatusResponse | null>(null);

  // Estado de loading
  const [validating, setValidating] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carrega status inicial
  useEffect(() => {
    loadSyncStatus();
  }, []);

  /**
   * Carrega status da conexao e contas
   */
  const loadSyncStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getGoogleSyncStatus();
      console.log('[GoogleAdminPage] Status carregado:', status);

      setSyncStatus(status);

      if (status.connection) {
        setConnectionStatus({
          id: '',
          workspace_id: status.workspace.id,
          developer_token: '***',
          customer_id: status.connection.customer_id,
          status: status.connection.status as 'active' | 'inactive' | 'error',
          last_validated_at: status.connection.last_validated_at,
          created_at: '',
          updated_at: '',
        });
        setCustomerId(status.connection.customer_id);
      }

      if (status.ad_accounts.length > 0) {
        setAdAccounts(status.ad_accounts as GoogleAdAccount[]);
      }
    } catch (err) {
      console.error('[GoogleAdminPage] Erro ao carregar status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  /**
   * Lista contas do banco de dados
   */
  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await listGoogleAdAccounts();
      if (result.error) {
        console.error('[GoogleAdminPage] Erro ao listar contas:', result.error);
      } else {
        setAdAccounts(result.accounts);
      }
    } catch (err) {
      console.error('[GoogleAdminPage] Erro ao listar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Valida e salva a conexao
   */
  const handleValidateConnection = async () => {
    if (!developerToken.trim() || !customerId.trim()) {
      setError('Preencha o Developer Token e o Customer ID');
      return;
    }

    setValidating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await validateGoogleConnection(
        developerToken,
        customerId,
        loginCustomerId || undefined
      );

      if (result.status === 'connected') {
        setSuccess(
          `Conexao validada com sucesso! ${result.accounts_count || 0} conta(s) encontrada(s).`
        );
        setDeveloperToken('');

        // Recarrega dados
        await loadSyncStatus();
        await loadAdAccounts();
      } else {
        setError(result.error || 'Erro ao validar conexao');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setValidating(false);
    }
  };

  /**
   * Desconecta o Google Ads
   */
  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Google Ads? Todos os dados serao removidos.')) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      const result = await disconnectGoogle();
      if (result.success) {
        setConnectionStatus(null);
        setAdAccounts([]);
        setSyncStatus(null);
        setCustomerId('');
        setSuccess('Google Ads desconectado com sucesso');
      } else {
        setError(result.error || 'Erro ao desconectar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  /**
   * Atualiza selecao de uma conta
   */
  const handleAccountSelection = async (accountId: string, selected: boolean) => {
    try {
      await updateAccountSelection(accountId, selected);
      // Atualiza estado local
      setAdAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, is_selected: selected } : acc
        )
      );
    } catch (err) {
      console.error('[GoogleAdminPage] Erro ao atualizar selecao:', err);
    }
  };

  /**
   * Seleciona ou deseleciona todas as contas
   */
  const handleSelectAll = async (select: boolean) => {
    try {
      await selectAllAccounts(select);
      setAdAccounts((prev) => prev.map((acc) => ({ ...acc, is_selected: select })));
    } catch (err) {
      console.error('[GoogleAdminPage] Erro ao selecionar todas:', err);
    }
  };

  /**
   * Refresh completo dos dados
   */
  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    await Promise.all([loadSyncStatus(), loadAdAccounts()]);
    setSuccess('Dados atualizados!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Retorna estilo do badge de status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-700 bg-emerald-100 border border-emerald-300';
      case 'error':
        return 'text-red-600 bg-red-100 border border-red-200';
      default:
        return 'text-gray-500 bg-gray-100 border border-gray-200';
    }
  };

  // Retorna label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Conectado';
      case 'error':
        return 'Erro';
      default:
        return 'Desconectado';
    }
  };

  // Retorna cor do health status
  const getHealthStatusStyle = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'pending_first_sync':
        return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'stale':
        return 'text-amber-600 bg-amber-50 border border-amber-200';
      case 'error':
        return 'text-red-600 bg-red-50 border border-red-200';
      default:
        return 'text-gray-500 bg-gray-50 border border-gray-200';
    }
  };

  // Retorna label do health status
  const getHealthStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Dados atualizados';
      case 'pending_first_sync':
        return 'Aguardando sync';
      case 'stale':
        return 'Dados desatualizados';
      case 'error':
        return 'Erro na sync';
      default:
        return 'Nao sincronizado';
    }
  };

  // Loading inicial
  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando configuracoes...</p>
        </div>
      </div>
    );
  }

  const isConnected = connectionStatus?.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg">
            <GoogleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conexao Google Ads</h2>
            <p className="text-gray-600">
              Configure as credenciais para sincronizar dados do Google Ads
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loadingStatus}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {isConnected && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="w-4 h-4 mr-2" />
              )}
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      {connectionStatus && (
        <Card className={`border-l-4 ${isConnected ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {/* Icone de status */}
              <div
                className={`relative p-2 rounded-xl ${isConnected ? 'bg-emerald-100' : 'bg-red-100'}`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    </span>
                  </>
                ) : (
                  <XCircle className="w-7 h-7 text-red-500" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {isConnected ? 'Google Ads Conectado' : 'Desconectado'}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeStyle(connectionStatus.status)}`}
                  >
                    {getStatusLabel(connectionStatus.status)}
                  </span>
                </div>

                {connectionStatus.customer_id && (
                  <p className="text-sm text-gray-600">
                    Customer ID:{' '}
                    <span className="font-mono text-gray-800">
                      {formatCustomerId(connectionStatus.customer_id)}
                    </span>
                  </p>
                )}

                {adAccounts.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {adAccounts.length} conta(s) vinculada(s)
                  </p>
                )}

                {connectionStatus.last_validated_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ultima validacao:{' '}
                    {new Date(connectionStatus.last_validated_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Badge de sincronizacao */}
            {syncStatus && isConnected && (
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getHealthStatusStyle(syncStatus.health_status)}`}
                >
                  {getHealthStatusLabel(syncStatus.health_status)}
                </span>
                {syncStatus.health_status === 'pending_first_sync' && (
                  <p className="text-xs text-blue-600">
                    Acesse "Google Ads Sync" para sincronizar
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Form de Conexao */}
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {isConnected ? 'Atualizar Conexao' : 'Nova Conexao'}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Developer Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Developer Token *
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={developerToken}
                onChange={(e) => setDeveloperToken(e.target.value)}
                placeholder="Cole o Developer Token aqui..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Obtenha em: Google Ads API Center &rarr; Developer Token
            </p>
          </div>

          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID *
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Ex: 123-456-7890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ID da conta MCC ou conta individual (com ou sem hifens)
            </p>
          </div>

          {/* Login Customer ID (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Customer ID (opcional)
            </label>
            <input
              type="text"
              value={loginCustomerId}
              onChange={(e) => setLoginCustomerId(e.target.value)}
              placeholder="Ex: 123-456-7890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ID da conta MCC usada para acessar outras contas (necessario se o Customer ID for uma conta filha)
            </p>
          </div>

          {/* Mensagens de erro e sucesso */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Botao de validacao */}
          <Button
            onClick={handleValidateConnection}
            disabled={validating || !developerToken.trim() || !customerId.trim()}
            className="w-full"
          >
            {validating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Validar e Conectar
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Lista de Contas */}
      {adAccounts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                Contas de Anuncios ({adAccounts.length})
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(true)}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(false)}
              >
                Desmarcar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAdAccounts}
                disabled={loadingAccounts}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccounts ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={adAccounts.every((acc) => acc.is_selected)}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Customer ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Moeda</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fuso</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Ultima Sync
                  </th>
                </tr>
              </thead>
              <tbody>
                {adAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={account.is_selected}
                        onChange={(e) =>
                          handleAccountSelection(account.id, e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">
                      {formatCustomerId(account.customer_id)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{account.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {account.currency_code}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{account.timezone}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          account.status === 'ENABLED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {account.last_sync_at
                        ? new Date(account.last_sync_at).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Selecione as contas que deseja sincronizar. Apos selecionar, acesse "Google Ads
                Sync" para iniciar a sincronizacao.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Instrucoes */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">
          Como obter as credenciais do Google Ads
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            Acesse o{' '}
            <a
              href="https://developers.google.com/google-ads/api/docs/first-call/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              Google Ads API Center
            </a>
          </li>
          <li>Solicite um Developer Token (pode demorar alguns dias para aprovacao)</li>
          <li>
            O Customer ID pode ser encontrado no canto superior direito do Google Ads
            (formato: XXX-XXX-XXXX)
          </li>
          <li>
            Se voce usa uma conta MCC para gerenciar varias contas, use o ID do MCC como
            "Login Customer ID"
          </li>
          <li>Cole o Developer Token e o Customer ID nos campos acima</li>
        </ol>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <strong>Importante:</strong> O Developer Token tem limite de 15.000 requisicoes
              por dia. A sincronizacao foi otimizada para respeitar esse limite.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
