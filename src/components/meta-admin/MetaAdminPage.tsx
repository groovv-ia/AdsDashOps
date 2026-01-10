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
import {
  validateMetaConnection,
  listMetaAdAccounts,
  getMetaSyncStatus,
  AdAccount,
  SyncStatusResponse,
} from '../../lib/services/MetaSystemUserService';
import { supabase } from '../../lib/supabase';
import { forceSessionRefresh, isRLSError } from '../../utils/sessionRefresh';

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

  // Contagem direta do banco
  const [dbAccountCount, setDbAccountCount] = useState<number | null>(null);

  // Carrega status inicial
  useEffect(() => {
    loadSyncStatus();
    loadDirectAccountCount();
  }, []);

  /**
   * Busca diretamente do banco de dados o número real de contas salvas
   * Isso nos dá visibilidade sobre o que realmente está armazenado
   */
  const loadDirectAccountCount = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('[MetaAdminPage] Erro ao buscar usuário:', userError);
        return;
      }

      if (!user) {
        console.log('[MetaAdminPage] Usuário não autenticado');
        return;
      }

      console.log('[MetaAdminPage] Buscando workspace para usuário:', user.email);

      // Busca workspace do usuário (como owner)
      const { data: workspaceOwner, error: workspaceOwnerError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (workspaceOwnerError) {
        console.error('[MetaAdminPage] Erro ao buscar workspace como owner:', workspaceOwnerError);
      }

      // Se não encontrou como owner, busca como membro
      let workspaceId: string | null = workspaceOwner?.id || null;

      if (!workspaceId) {
        console.log('[MetaAdminPage] Workspace não encontrado como owner, buscando como membro...');
        const { data: workspaceMember, error: workspaceMemberError } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (workspaceMemberError) {
          console.error('[MetaAdminPage] Erro ao buscar workspace como membro:', workspaceMemberError);
        }

        workspaceId = workspaceMember?.workspace_id || null;
      }

      if (!workspaceId) {
        console.error('[MetaAdminPage] ⚠️ Workspace não encontrado para usuário:', user.email);
        console.error('[MetaAdminPage] Verifique se o workspace foi criado corretamente');
        setDbAccountCount(0);
        return;
      }

      console.log('[MetaAdminPage] ✓ Workspace encontrado:', workspaceId);

      // Conta quantas contas existem no banco
      const { count, error } = await supabase
        .from('meta_ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[MetaAdminPage] ❌ Erro ao contar contas no banco:', error);
        console.error('[MetaAdminPage] Código do erro:', error.code);
        console.error('[MetaAdminPage] Mensagem:', error.message);
        console.error('[MetaAdminPage] Detalhes:', error.details);

        // Se o erro for de RLS (permissão negada), tenta renovar sessão automaticamente
        if (isRLSError(error)) {
          console.error('[MetaAdminPage] 🔒 ERRO DE RLS DETECTADO - Tentando renovar sessão...');

          const refreshed = await forceSessionRefresh();

          if (refreshed) {
            console.log('[MetaAdminPage] ✓ Sessão renovada, tentando contar novamente...');
            // Aguarda 500ms para garantir que o novo token foi propagado
            await new Promise(resolve => setTimeout(resolve, 500));

            // Tenta contar novamente com o novo token
            const { count: retryCount, error: retryError } = await supabase
              .from('meta_ad_accounts')
              .select('*', { count: 'exact', head: true })
              .eq('workspace_id', workspaceId);

            if (retryError) {
              console.error('[MetaAdminPage] ❌ Ainda com erro após refresh:', retryError);
              setDbAccountCount(null);
            } else {
              console.log(`[MetaAdminPage] ✓✓ SUCESSO após refresh! Contas: ${retryCount}`);
              setDbAccountCount(retryCount);
              return; // Sai da função com sucesso
            }
          } else {
            console.error('[MetaAdminPage] ❌ Falha ao renovar sessão');
          }
        }

        setDbAccountCount(null);
      } else {
        console.log(`[MetaAdminPage] ✓ Contas no banco de dados: ${count}`);
        setDbAccountCount(count);
      }
    } catch (err) {
      console.error('[MetaAdminPage] ❌ Erro ao buscar contagem direta:', err);
    }
  };

  const loadSyncStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getMetaSyncStatus();
      console.log('[MetaAdminPage] Status completo recebido:', status);
      console.log('[MetaAdminPage] Contas no status:', status.ad_accounts?.length || 0);

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
          console.log('[MetaAdminPage] Mapeando contas para exibição');
          setAdAccounts(
            status.ad_accounts.map((acc) => ({
              id: acc.meta_id,
              name: acc.name,
              currency: acc.currency,
              timezone: acc.timezone,
              status: acc.status,
            }))
          );
        } else {
          console.log('[MetaAdminPage] Nenhuma conta encontrada no status');
          setAdAccounts([]);
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
      console.log('[MetaAdminPage] Iniciando validação da conexão...');
      const result = await validateMetaConnection(businessManagerId, systemUserToken);

      if (result.status === 'connected') {
        console.log('[MetaAdminPage] ✓ Conexão validada com sucesso');
        console.log('[MetaAdminPage] Workspace ID:', result.workspace_id);
        console.log('[MetaAdminPage] Contas encontradas:', result.adaccounts_count);

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

        // Aguarda 2 segundos para garantir que as contas foram salvas no banco
        console.log('[MetaAdminPage] Aguardando 2s para sincronização do banco...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Recarrega lista de contas e contagem direta
        console.log('[MetaAdminPage] Recarregando dados...');
        await loadAdAccounts();
        await loadSyncStatus();
        await loadDirectAccountCount();
      } else {
        console.error('[MetaAdminPage] ❌ Erro na validação:', result.error);
        setError(result.error || 'Erro ao validar conexao');
        if (result.missing_scopes && result.missing_scopes.length > 0) {
          setError(
            `Permissoes faltando: ${result.missing_scopes.join(', ')}. ` +
              'O token precisa ter as permissoes ads_read e business_management.'
          );
        }
      }
    } catch (err) {
      console.error('[MetaAdminPage] ❌ Exceção durante validação:', err);
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
        console.log(`[MetaAdminPage] Contas carregadas via Edge Function: ${result.adaccounts.length}`);
      }
    } catch (err) {
      console.error('Erro ao listar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Força um refresh completo de todos os dados
   * Útil para verificar se as Edge Functions foram atualizadas
   */
  const handleForceRefresh = async () => {
    console.log('[MetaAdminPage] Forçando refresh completo...');
    setError(null);
    setSuccess(null);

    await Promise.all([
      loadAdAccounts(),
      loadSyncStatus(),
      loadDirectAccountCount(),
    ]);

    setSuccess('Dados atualizados com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'pending_first_sync':
        return 'text-blue-600 bg-blue-100';
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
      case 'pending_first_sync':
        return 'Aguardando Sincronizacao';
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

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadSyncStatus} disabled={loadingStatus}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={handleForceRefresh}
            disabled={loadingStatus || loadingAccounts}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(loadingStatus || loadingAccounts) ? 'animate-spin' : ''}`} />
            Refresh Completo
          </Button>
        </div>
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
                {dbAccountCount !== null && (
                  <p className="text-xs text-blue-600 font-mono mt-1">
                    [Debug] {dbAccountCount} contas salvas no banco de dados
                  </p>
                )}
                {connectionStatus?.adAccountsCount && dbAccountCount === 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-semibold mb-1">
                      ⚠️ Contas não salvas no banco de dados
                    </p>
                    <p className="text-xs text-yellow-700 mb-2">
                      As contas foram detectadas mas não estão visíveis devido às políticas de segurança.
                    </p>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                      }}
                      className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    >
                      Fazer Logout e Relogar
                    </button>
                  </div>
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
