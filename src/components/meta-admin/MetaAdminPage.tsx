/**
 * MetaAdminPage
 *
 * Pagina de administracao para configurar conexao Meta Ads.
 *
 * Dois metodos de conexao:
 * 1. OAuth padrao (recomendado) - 1 clique, User Access Token de 60 dias renovavel
 * 2. Manual - formulario com Business Manager ID + System User Token permanente (avancado)
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
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Trash2,
  PlusCircle,
  Search,
  Clock,
  Key,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  validateMetaConnection,
  processMetaUserLogin,
  refreshMetaToken,
  listMetaAdAccounts,
  getMetaSyncStatus,
  addMetaAccountManual,
  AdAccount,
  SyncStatusResponse,
} from '../../lib/services/MetaSystemUserService';
import { redirectToMetaOAuth } from '../../lib/facebook-sdk';
import { supabase } from '../../lib/supabase';
import { forceSessionRefresh, isRLSError } from '../../utils/sessionRefresh';

// URL base das edge functions
const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ============================================================
// Tipos
// ============================================================

interface ConnectionStatus {
  connected: boolean;
  tokenExpired: boolean;
  connectionMethod?: 'manual' | 'flfb' | 'user_token';
  businessManagerId?: string;
  scopes?: string[];
  lastValidated?: string;
  adAccountsCount?: number;
  tokenExpiresAt?: string;
}

/** Passos do fluxo OAuth para exibicao de progresso */
type OAuthStep =
  | 'idle'
  | 'redirecting'
  | 'exchanging_token'
  | 'fetching_accounts'
  | 'saving'
  | 'done'
  | 'error';

const OAUTH_STEP_LABELS: Record<OAuthStep, string> = {
  idle: '',
  redirecting: 'Redirecionando para o Facebook...',
  exchanging_token: 'Obtendo token de acesso...',
  fetching_accounts: 'Buscando contas de anuncios...',
  saving: 'Salvando configuracao...',
  done: 'Conectado com sucesso!',
  error: 'Erro na conexao',
};

// ============================================================
// Componente principal
// ============================================================

export const MetaAdminPage: React.FC = () => {
  // --- Estado da conexao ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [dbAccountCount, setDbAccountCount] = useState<number | null>(null);

  // --- Estado de loading geral ---
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // --- Estado do fluxo OAuth ---
  const [oauthStep, setOauthStep] = useState<OAuthStep>('idle');
  const [oauthError, setOauthError] = useState<string | null>(null);

  // --- Estado do formulario manual ---
  const [showManualForm, setShowManualForm] = useState(false);
  const [businessManagerId, setBusinessManagerId] = useState('');
  const [systemUserToken, setSystemUserToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // --- Mensagem de sucesso global ---
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // --- Confirmacao de desconexao ---
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // --- Adicao manual de conta ---
  const [manualAccountId, setManualAccountId] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);
  const [addAccountSuccess, setAddAccountSuccess] = useState<string | null>(null);

  // --- Renovacao de token ---
  const [refreshing, setRefreshing] = useState(false);

  // Carrega status inicial e processa retorno do OAuth se houver code no localStorage
  useEffect(() => {
    loadSyncStatus();
    loadDirectAccountCount();
    processOAuthReturn();
  }, []);

  // Abre formulario manual automaticamente se desconectado com metodo manual
  useEffect(() => {
    if (!loadingStatus) {
      const isManual = connectionStatus?.connectionMethod === 'manual';
      setShowManualForm(isManual && connectionStatus?.connected === true);
    }
  }, [loadingStatus, connectionStatus]);

  /**
   * Processa o retorno do fluxo OAuth apos o redirect de volta para /meta-admin.
   * Le o authorization code do localStorage (salvo pelo OAuthCallback) e
   * envia para a edge function meta-user-login para obter o User Access Token.
   * Tambem processa retornos legados do FLFB para retrocompatibilidade.
   */
  const processOAuthReturn = async () => {
    // Tenta novo fluxo OAuth primeiro, depois FLFB legado
    const code = localStorage.getItem('meta_user_oauth_code') || localStorage.getItem('flfb_oauth_code');
    const oauthErrorMsg = localStorage.getItem('meta_user_oauth_error') || localStorage.getItem('flfb_oauth_error');

    // Limpa chaves do localStorage independente do resultado
    localStorage.removeItem('meta_user_oauth_code');
    localStorage.removeItem('meta_user_oauth_error');
    localStorage.removeItem('meta_user_oauth_state');
    localStorage.removeItem('meta_user_oauth_flow');
    // Limpa chaves legadas do FLFB
    localStorage.removeItem('flfb_oauth_code');
    localStorage.removeItem('flfb_oauth_error');
    localStorage.removeItem('flfb_oauth_state');
    localStorage.removeItem('flfb_oauth_flow');

    if (oauthErrorMsg) {
      setOauthStep('error');
      setOauthError(oauthErrorMsg);
      return;
    }

    if (!code) return;

    console.log('[MetaAdminPage] Authorization code detectado, processando...');
    setOauthStep('exchanging_token');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setOauthStep('error');
        setOauthError('Sessao expirada. Faca login novamente.');
        return;
      }

      setOauthStep('fetching_accounts');

      const redirectUri =
        import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      // Chama a nova edge function meta-user-login
      const result = await processMetaUserLogin(code, redirectUri);

      if (result.status !== 'connected') {
        setOauthStep('error');
        setOauthError(result.details || result.error || 'Erro ao processar conexao. Tente novamente.');
        return;
      }

      setOauthStep('saving');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setOauthStep('done');
      setGlobalSuccess(
        `Conectado com sucesso! ${result.adaccounts_count} conta(s) de anuncios encontradas.`
      );

      await Promise.all([loadSyncStatus(), loadAdAccounts(), loadDirectAccountCount()]);

      setTimeout(() => setOauthStep('idle'), 3000);
    } catch (err) {
      setOauthStep('error');
      setOauthError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    }
  };

  // ============================================================
  // Carregamento de dados
  // ============================================================

  /** Busca contagem direta no banco para consistencia visual */
  const loadDirectAccountCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspaceOwner } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      let workspaceId = workspaceOwner?.id || null;

      if (!workspaceId) {
        const { data: workspaceMember } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .maybeSingle();
        workspaceId = workspaceMember?.workspace_id || null;
      }

      if (!workspaceId) {
        setDbAccountCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('meta_ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (error) {
        if (isRLSError(error)) {
          const refreshed = await forceSessionRefresh();
          if (refreshed) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { count: retryCount } = await supabase
              .from('meta_ad_accounts')
              .select('*', { count: 'exact', head: true })
              .eq('workspace_id', workspaceId);
            setDbAccountCount(retryCount);
            return;
          }
        }
        setDbAccountCount(null);
      } else {
        setDbAccountCount(count);
      }
    } catch (err) {
      console.error('[MetaAdminPage] Erro ao buscar contagem direta:', err);
    }
  };

  const loadSyncStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getMetaSyncStatus();

      if (!status.error) {
        setSyncStatus(status);

        if (status.connection) {
          const conn = status.connection as {
            status: string;
            business_manager_id: string;
            granted_scopes: string[];
            last_validated_at: string;
            connection_method?: string;
            token_expires_at?: string;
          };
          const isTokenExpired = conn.status === 'token_expired';
          setConnectionStatus({
            connected: conn.status === 'connected',
            tokenExpired: isTokenExpired,
            connectionMethod: (conn.connection_method as 'manual' | 'flfb' | 'user_token') || 'manual',
            businessManagerId: conn.business_manager_id,
            scopes: conn.granted_scopes,
            lastValidated: conn.last_validated_at,
            adAccountsCount: status.totals.ad_accounts,
            tokenExpiresAt: conn.token_expires_at,
          });
          setBusinessManagerId(conn.business_manager_id || '');
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
        } else {
          setAdAccounts([]);
        }
      }
    } catch (err) {
      console.error('[MetaAdminPage] Erro ao carregar status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await listMetaAdAccounts();
      if (!result.error) {
        setAdAccounts(result.adaccounts);
      }
    } catch (err) {
      console.error('[MetaAdminPage] Erro ao listar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Remove a conexao Meta do workspace via edge function meta-disconnect.
   */
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setGlobalSuccess(null);
    setManualError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setManualError('Sessao expirada. Faca login novamente.');
        return;
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/meta-disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setManualError(data.error || 'Erro ao desconectar. Tente novamente.');
        return;
      }

      setConnectionStatus(null);
      setAdAccounts([]);
      setSyncStatus(null);
      setDbAccountCount(0);
      setBusinessManagerId('');
      setConfirmDisconnect(false);
      setGlobalSuccess('Conexao removida com sucesso.');
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Erro ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleForceRefresh = async () => {
    setManualError(null);
    setOauthError(null);
    await Promise.all([loadAdAccounts(), loadSyncStatus(), loadDirectAccountCount()]);
    setGlobalSuccess('Dados atualizados com sucesso!');
    setTimeout(() => setGlobalSuccess(null), 3000);
  };

  // ============================================================
  // Renovacao de token
  // ============================================================

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const result = await refreshMetaToken();

      if (result.error) {
        if (result.requires_reconnect) {
          setOauthError('Token expirado. Reconecte clicando no botao abaixo.');
        } else {
          setManualError(result.error);
        }
      } else {
        const msg = result.was_renewed
          ? 'Token renovado com sucesso!'
          : 'Token validado com sucesso.';
        setGlobalSuccess(msg);
        setTimeout(() => setGlobalSuccess(null), 3000);
        await loadSyncStatus();
      }
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Erro ao renovar token.');
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================================
  // Adicao manual de conta de anuncios
  // ============================================================

  const handleAddAccountManual = async () => {
    if (!manualAccountId.trim()) {
      setAddAccountError('Informe o ID da conta de anuncios.');
      return;
    }

    setAddingAccount(true);
    setAddAccountError(null);
    setAddAccountSuccess(null);

    try {
      const result = await addMetaAccountManual(manualAccountId.trim());

      if (result.success) {
        const msg = result.already_exists
          ? result.message || 'Conta ja vinculada ao workspace.'
          : result.message || 'Conta adicionada com sucesso!';
        setAddAccountSuccess(msg);
        setManualAccountId('');
        await Promise.all([loadAdAccounts(), loadSyncStatus(), loadDirectAccountCount()]);
        setTimeout(() => setAddAccountSuccess(null), 5000);
      } else {
        setAddAccountError(result.error || 'Erro ao adicionar conta.');
      }
    } catch (err) {
      setAddAccountError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setAddingAccount(false);
    }
  };

  // ============================================================
  // Conexao OAuth padrao (metodo principal)
  // ============================================================

  const handleOAuthConnect = () => {
    setOauthError(null);
    setGlobalSuccess(null);
    setOauthStep('redirecting');

    const result = redirectToMetaOAuth();

    if (!result.success) {
      setOauthStep('error');
      setOauthError(result.error || 'Erro ao iniciar conexao com o Facebook.');
    }
  };

  // ============================================================
  // Conexao manual (formulario)
  // ============================================================

  const handleValidateConnection = async () => {
    if (!businessManagerId.trim() || !systemUserToken.trim()) {
      setManualError('Preencha o Business Manager ID e o Token do System User');
      return;
    }

    setValidating(true);
    setManualError(null);
    setManualSuccess(null);

    try {
      const result = await validateMetaConnection(businessManagerId, systemUserToken);

      if (result.status === 'connected') {
        setConnectionStatus({
          connected: true,
          tokenExpired: false,
          connectionMethod: 'manual',
          businessManagerId: result.business_manager_id,
          scopes: result.scopes,
          lastValidated: new Date().toISOString(),
          adAccountsCount: result.adaccounts_count,
        });
        setManualSuccess(
          `Conexao validada! ${result.adaccounts_count} conta(s) de anuncios encontradas.`
        );
        setSystemUserToken('');

        await new Promise(resolve => setTimeout(resolve, 2000));
        await Promise.all([loadAdAccounts(), loadSyncStatus(), loadDirectAccountCount()]);
      } else {
        if (result.missing_scopes && result.missing_scopes.length > 0) {
          setManualError(
            `Permissoes faltando: ${result.missing_scopes.join(', ')}. ` +
            'O token precisa ter ads_read e business_management.'
          );
        } else {
          setManualError(result.error || 'Erro ao validar conexao');
        }
      }
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setValidating(false);
    }
  };

  // ============================================================
  // Helpers
  // ============================================================

  const getOAuthButtonState = () => {
    const isLoading = oauthStep !== 'idle' && oauthStep !== 'done' && oauthStep !== 'error';
    const isDone = oauthStep === 'done';
    return { isLoading, isDone };
  };

  /** Retorna badge visual conforme o metodo de conexao */
  const getConnectionMethodBadge = () => {
    if (!connectionStatus?.connected) return null;
    if (connectionStatus.connectionMethod === 'user_token') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
          <Clock className="w-3 h-3" />
          Token OAuth (60 dias)
        </span>
      );
    }
    if (connectionStatus.connectionMethod === 'manual' || connectionStatus.connectionMethod === 'flfb') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
          <Key className="w-3 h-3" />
          Token Permanente
        </span>
      );
    }
    return null;
  };

  /** Calcula dias ate a expiracao do token */
  const getDaysUntilExpiry = (): number | null => {
    if (!connectionStatus?.tokenExpiresAt) return null;
    const expiresAt = new Date(connectionStatus.tokenExpiresAt).getTime();
    const now = Date.now();
    return Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border border-green-200';
      case 'pending_first_sync': return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'stale': return 'text-amber-600 bg-amber-50 border border-amber-200';
      case 'error': return 'text-red-600 bg-red-50 border border-red-200';
      default: return 'text-gray-500 bg-gray-50 border border-gray-200';
    }
  };

  const getSyncStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return 'Dados atualizados';
      case 'pending_first_sync': return 'Aguardando sincronizacao';
      case 'stale': return 'Sincronizar dados';
      case 'error': return 'Erro na sincronizacao';
      default: return 'Nao sincronizado';
    }
  };

  // ============================================================
  // Loading inicial
  // ============================================================

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

  const { isLoading: oauthLoading, isDone: oauthDone } = getOAuthButtonState();
  const isConnected = connectionStatus?.connected === true;
  const isUserToken = connectionStatus?.connectionMethod === 'user_token';
  const daysUntilExpiry = getDaysUntilExpiry();
  const showExpiryWarning = isUserToken && daysUntilExpiry !== null && daysUntilExpiry <= 14;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conexao Meta Ads</h2>
            <p className="text-gray-600">Configure a integracao com o Meta Business para sincronizar dados</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleForceRefresh} disabled={loadingStatus || loadingAccounts}>
            <RefreshCw className={`w-4 h-4 mr-2 ${(loadingStatus || loadingAccounts) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ---- Mensagem de sucesso global ---- */}
      {globalSuccess && (
        <div className="flex items-center space-x-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{globalSuccess}</p>
        </div>
      )}

      {/* ---- Status da conexao ---- */}
      {connectionStatus && (
        <Card className={`border-l-4 ${isConnected ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {/* Icone com indicador animado */}
              <div className={`relative p-2 rounded-xl ${isConnected ? 'bg-emerald-100' : 'bg-red-100'}`}>
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
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {isConnected
                      ? 'Meta Ads Conectado'
                      : connectionStatus.tokenExpired
                        ? 'Token Invalido -- Reconexao Necessaria'
                        : 'Desconectado'
                    }
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'text-emerald-700 bg-emerald-100 border border-emerald-300' : 'text-red-600 bg-red-100 border border-red-200'}`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                  {getConnectionMethodBadge()}
                </div>

                {connectionStatus.businessManagerId && (
                  <p className="text-sm text-gray-600">
                    Business Manager: <span className="font-mono text-gray-800">{connectionStatus.businessManagerId}</span>
                  </p>
                )}
                {connectionStatus.adAccountsCount !== undefined && (
                  <p className="text-sm text-gray-600">
                    {connectionStatus.adAccountsCount} conta(s) de anuncios vinculadas
                  </p>
                )}
                {dbAccountCount !== null && dbAccountCount > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    {dbAccountCount} conta(s) prontas para sincronizacao
                  </p>
                )}

                {/* Info de expiracao do token OAuth */}
                {isUserToken && daysUntilExpiry !== null && (
                  <p className={`text-xs mt-1 ${daysUntilExpiry <= 7 ? 'text-red-600 font-semibold' : daysUntilExpiry <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
                    Token expira em {daysUntilExpiry} dia(s)
                    {daysUntilExpiry <= 7 && ' -- renovacao necessaria!'}
                  </p>
                )}

                {connectionStatus.lastValidated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ultima validacao: {new Date(connectionStatus.lastValidated).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Lado direito: badges e acoes */}
            <div className="flex flex-col items-end gap-2">
              {syncStatus && isConnected && syncStatus.health_status !== 'error' && (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getSyncStatusColor(syncStatus.health_status)}`}>
                  {getSyncStatusLabel(syncStatus.health_status)}
                </span>
              )}
              {syncStatus?.health_status === 'stale' && (
                <p className="text-xs text-amber-600">Acesse "Meta Ads Sync" para atualizar</p>
              )}

              {/* Botao de renovar token (apenas para user_token) */}
              {isConnected && isUserToken && (
                <button
                  onClick={handleRefreshToken}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Renovar Token
                </button>
              )}

              {/* Botao de desconectar com confirmacao inline */}
              {isConnected && !confirmDisconnect && (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Desconectar
                </button>
              )}

              {isConnected && confirmDisconnect && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs text-red-700 font-medium">Confirmar?</span>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Sim, remover
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    disabled={disconnecting}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Escopos concedidos */}
          {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Permissoes concedidas:</p>
              <div className="flex flex-wrap gap-2">
                {connectionStatus.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200 font-medium"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ---- Alerta de token expirado ---- */}
      {connectionStatus?.tokenExpired && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Token Invalido</h3>
              <p className="text-sm text-red-700 mt-1">
                O token atual foi revogado ou esta invalido. Clique em "Conectar com Facebook" abaixo
                para reconectar, ou cole um novo token permanente no formulario avancado.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ---- Alerta de expiracao proxima (user_token) ---- */}
      {showExpiryWarning && !connectionStatus?.tokenExpired && (
        <Card className={`border-l-4 ${daysUntilExpiry! <= 7 ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${daysUntilExpiry! <= 7 ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <h3 className={`font-semibold ${daysUntilExpiry! <= 7 ? 'text-red-800' : 'text-amber-800'}`}>
                  Token expira em {daysUntilExpiry} dia(s)
                </h3>
                <p className={`text-sm mt-1 ${daysUntilExpiry! <= 7 ? 'text-red-700' : 'text-amber-700'}`}>
                  {daysUntilExpiry! <= 7
                    ? 'Renove agora para evitar perda de acesso aos dados.'
                    : 'O token sera renovado automaticamente, mas voce pode renovar manualmente.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefreshToken}
              disabled={refreshing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                daysUntilExpiry! <= 7
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              } disabled:opacity-60`}
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Renovar Agora
            </button>
          </div>
        </Card>
      )}

      {/* ======================================================
          SECAO A: Conexao via OAuth padrao (metodo principal)
          ====================================================== */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-xl flex-shrink-0">
            <img src="/meta-icon.svg" alt="Meta" className="w-6 h-6 brightness-0 invert" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg">Conectar com Facebook</h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                Recomendado
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Autorize em 1 clique usando sua conta do Facebook.
              Acessa automaticamente todas as contas de anuncios vinculadas ao seu perfil.
            </p>

            {/* Beneficios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: '1', label: '1 clique', desc: 'Sem copiar tokens' },
                { icon: '\u2713', label: 'Acesso direto', desc: 'Ve todas as suas contas' },
                { icon: '\u21BB', label: 'Renovavel', desc: 'Token de 60 dias' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <span className="text-base w-6 text-center font-bold text-blue-600">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Botao principal */}
            <button
              onClick={handleOAuthConnect}
              disabled={oauthLoading}
              className={`
                inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200 shadow-sm
                ${oauthDone
                  ? 'bg-emerald-600 text-white cursor-default'
                  : oauthLoading
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md'
                }
              `}
            >
              {oauthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {oauthDone && <CheckCircle className="w-4 h-4" />}
              {!oauthLoading && !oauthDone && (
                <img src="/meta-icon.svg" alt="" className="w-4 h-4 brightness-0 invert" />
              )}
              {oauthDone
                ? 'Conectado!'
                : oauthLoading
                  ? OAUTH_STEP_LABELS[oauthStep]
                  : isConnected
                    ? 'Reconectar com Facebook'
                    : 'Conectar com Facebook'
              }
            </button>

            {/* Barra de progresso em etapas */}
            {oauthLoading && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex gap-1">
                  {(['redirecting', 'exchanging_token', 'fetching_accounts', 'saving'] as OAuthStep[]).map((step) => {
                    const steps: OAuthStep[] = ['redirecting', 'exchanging_token', 'fetching_accounts', 'saving'];
                    const currentIdx = steps.indexOf(oauthStep);
                    const stepIdx = steps.indexOf(step);
                    return (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          stepIdx <= currentIdx ? 'bg-blue-500 w-6' : 'bg-gray-200 w-4'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">{OAUTH_STEP_LABELS[oauthStep]}</p>
              </div>
            )}

            {/* Mensagem de erro do OAuth */}
            {oauthStep === 'error' && oauthError && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{oauthError}</p>
                  <button
                    onClick={() => { setOauthStep('idle'); setOauthError(null); }}
                    className="mt-1 text-xs text-red-600 underline hover:text-red-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ======================================================
          SECAO B: Formulario Manual (colapsavel)
          ====================================================== */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Conexao avancada por System User (token permanente)
            </span>
          </div>
          {showManualForm
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </button>

        {showManualForm && (
          <div className="p-5 space-y-4 bg-white">
            <p className="text-sm text-gray-500">
              Use este metodo se tem um System User com token permanente (nunca expira)
              criado no Business Manager. Ideal para integracoes de longo prazo sem necessidade de renovacao.
            </p>

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
                Token do System User (permanente)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={systemUserToken}
                  onChange={(e) => setSystemUserToken(e.target.value)}
                  placeholder="Cole o token permanente aqui..."
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
                Crie em: Business Settings &rarr; System Users &rarr; Generate Token (selecione "Nunca expira")
              </p>
            </div>

            {manualError && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{manualError}</p>
              </div>
            )}

            {manualSuccess && (
              <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{manualSuccess}</p>
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
                  <Link2 className="w-4 h-4 mr-2" />
                  Validar e Conectar
                </>
              )}
            </Button>

            {/* Instrucoes expansiveis */}
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                Como obter o Token permanente do System User?
              </summary>
              <ol className="mt-2 list-decimal list-inside space-y-1.5 text-xs text-gray-600 pl-1">
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
                <li>Em "Token expiry" selecione <strong>"Never"</strong> (nunca expira)</li>
                <li>
                  Selecione: <strong>ads_read</strong> e <strong>business_management</strong>
                </li>
                <li>Copie o token gerado e cole no campo acima</li>
              </ol>
            </details>
          </div>
        )}
      </div>

      {/* ======================================================
          SECAO C1: Adicao manual de conta (exibida quando conectado)
          ====================================================== */}
      {isConnected && (
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <PlusCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Adicionar Conta de Anuncios</h3>
              <p className="text-sm text-gray-500">
                {adAccounts.length === 0
                  ? 'Nenhuma conta encontrada automaticamente. Adicione pelo ID da conta.'
                  : 'Adicione mais contas de anuncios pelo ID.'}
              </p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">Como encontrar o ID da conta:</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Acesse <strong>business.facebook.com</strong> e entre no seu Business Manager</li>
              <li>Va em <strong>Configuracoes</strong> &gt; <strong>Contas de Anuncios</strong></li>
              <li>Copie o ID numerico (ex: <span className="font-mono bg-blue-100 px-1 rounded">123456789</span>) ou o formato <span className="font-mono bg-blue-100 px-1 rounded">act_123456789</span></li>
            </ol>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={manualAccountId}
                  onChange={(e) => {
                    setManualAccountId(e.target.value);
                    setAddAccountError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !addingAccount && handleAddAccountManual()}
                  placeholder="ID da conta (ex: 123456789 ou act_123456789)"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={addingAccount}
                />
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleAddAccountManual}
              disabled={addingAccount || !manualAccountId.trim()}
            >
              {addingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>

          {addAccountError && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{addAccountError}</p>
            </div>
          )}

          {addAccountSuccess && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{addAccountSuccess}</p>
            </div>
          )}
        </Card>
      )}

      {/* ======================================================
          SECAO C: Lista de Ad Accounts
          ====================================================== */}
      {adAccounts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                Contas de Anuncios ({adAccounts.length})
              </h3>
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
    </div>
  );
};
