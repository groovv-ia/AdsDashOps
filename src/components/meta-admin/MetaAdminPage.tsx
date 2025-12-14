/**
 * MetaAdminPage
 *
 * Pagina de administracao para configurar conexao Meta Ads via System User.
 * Permite validar token, ver status da conexao e listar ad accounts.
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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MetaAccountClientBinder } from './MetaAccountClientBinder';
import {
  validateMetaConnection,
  listMetaAdAccounts,
  getMetaSyncStatus,
  AdAccount,
  SyncStatusResponse,
} from '../../lib/services/MetaSystemUserService';

interface ConnectionStatus {
  connected: boolean;
  businessManagerId?: string;
  scopes?: string[];
  lastValidated?: string;
  adAccountsCount?: number;
}

export const MetaAdminPage: React.FC = () => {
  // Estado do formulario
  const [businessManagerId, setBusinessManagerId] = useState('');
  const [systemUserToken, setSystemUserToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Estado da conexao
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);

  // Estado de loading
  const [validating, setValidating] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carrega status inicial
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getMetaSyncStatus();

      if (status.error) {
        console.error('Erro ao carregar status:', status.error);
      } else {
        setSyncStatus(status);

        if (status.connection) {
          setConnectionStatus({
            connected: status.connection.status === 'connected',
            businessManagerId: status.connection.business_manager_id,
            scopes: status.connection.granted_scopes,
            lastValidated: status.connection.last_validated_at,
            adAccountsCount: status.totals.ad_accounts,
          });
          setBusinessManagerId(status.connection.business_manager_id || '');
        }

        if (status.ad_accounts.length > 0) {
          setAdAccounts(
            status.ad_accounts.map((acc) => ({
              id: acc.meta_id,
              name: acc.name,
              currency: acc.currency,
              timezone: acc.timezone,
              status: acc.status,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleValidateConnection = async () => {
    if (!businessManagerId.trim() || !systemUserToken.trim()) {
      setError('Preencha o Business Manager ID e o Token do System User');
      return;
    }

    setValidating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await validateMetaConnection(businessManagerId, systemUserToken);

      if (result.status === 'connected') {
        setConnectionStatus({
          connected: true,
          businessManagerId: result.business_manager_id,
          scopes: result.scopes,
          lastValidated: new Date().toISOString(),
          adAccountsCount: result.adaccounts_count,
        });
        setSuccess(
          `Conexao validada com sucesso! ${result.adaccounts_count} contas de anuncios encontradas.`
        );
        setSystemUserToken('');

        // Recarrega lista de contas
        await loadAdAccounts();
        await loadSyncStatus();
      } else {
        setError(result.error || 'Erro ao validar conexao');
        if (result.missing_scopes && result.missing_scopes.length > 0) {
          setError(
            `Permissoes faltando: ${result.missing_scopes.join(', ')}. ` +
              'O token precisa ter as permissoes ads_read e business_management.'
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setValidating(false);
    }
  };

  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await listMetaAdAccounts();

      if (result.error) {
        console.error('Erro ao listar contas:', result.error);
      } else {
        setAdAccounts(result.adaccounts);
      }
    } catch (err) {
      console.error('Erro ao listar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'stale':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saudavel';
      case 'stale':
        return 'Desatualizado';
      case 'error':
        return 'Com Erros';
      default:
        return 'Desconectado';
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conexao Meta Ads</h2>
            <p className="text-gray-600">Configure a conexao do System User para sincronizar dados</p>
          </div>
        </div>

        <Button variant="outline" onClick={loadSyncStatus} disabled={loadingStatus}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Card */}
      {connectionStatus && (
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {connectionStatus.connected ? (
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
                </h3>
                {connectionStatus.businessManagerId && (
                  <p className="text-sm text-gray-600">
                    Business Manager: {connectionStatus.businessManagerId}
                  </p>
                )}
                {connectionStatus.adAccountsCount !== undefined && (
                  <p className="text-sm text-gray-600">
                    {connectionStatus.adAccountsCount} conta(s) de anuncios
                  </p>
                )}
                {connectionStatus.lastValidated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ultima validacao: {new Date(connectionStatus.lastValidated).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {syncStatus && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(
                  syncStatus.health_status
                )}`}
              >
                {getHealthStatusLabel(syncStatus.health_status)}
              </span>
            )}
          </div>

          {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Permissoes concedidas:</p>
              <div className="flex flex-wrap gap-2">
                {connectionStatus.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Form de Conexao */}
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {connectionStatus?.connected ? 'Atualizar Conexao' : 'Nova Conexao'}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Manager ID
            </label>
            <input
              type="text"
              value={businessManagerId}
              onChange={(e) => setBusinessManagerId(e.target.value)}
              placeholder="Ex: 123456789012345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Encontre em: Business Settings &rarr; Business Info
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token do System User
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={systemUserToken}
                onChange={(e) => setSystemUserToken(e.target.value)}
                placeholder="Cole o token aqui..."
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
              Crie em: Business Settings &rarr; System Users &rarr; Generate Token
            </p>
          </div>

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

          <Button
            onClick={handleValidateConnection}
            disabled={validating || !businessManagerId.trim() || !systemUserToken.trim()}
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

      {/* Lista de Ad Accounts */}
      {adAccounts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Contas de Anuncios ({adAccounts.length})</h3>
            </div>

            <Button variant="outline" size="sm" onClick={loadAdAccounts} disabled={loadingAccounts}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccounts ? 'animate-spin' : ''}`} />
              Recarregar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Moeda</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fuso</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {adAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">{account.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{account.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{account.currency}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{account.timezone}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          account.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vinculacao de Contas a Clientes */}
      {connectionStatus?.connected && syncStatus?.workspace && (
        <MetaAccountClientBinder
          workspaceId={syncStatus.workspace.id}
          onBindingChange={loadSyncStatus}
        />
      )}

      {/* Instrucoes */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Como obter o Token do System User</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            Acesse o{' '}
            <a
              href="https://business.facebook.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              Meta Business Suite
            </a>
          </li>
          <li>Va em Business Settings &rarr; System Users</li>
          <li>Crie ou selecione um System User existente</li>
          <li>Clique em "Generate New Token"</li>
          <li>
            Selecione as permissoes: <strong>ads_read</strong>, <strong>business_management</strong>
          </li>
          <li>Copie o token gerado e cole no campo acima</li>
        </ol>
      </Card>
    </div>
  );
};
