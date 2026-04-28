/**
 * MetaAdminPage
 *
 * Pagina de administracao para configurar conexao Meta Ads.
 *
 * Dois metodos de conexao:
 * 1. Facebook Login for Business (FLFB) - recomendado, 1 clique, token permanente
 * 2. Manual - formulario com Business Manager ID + System User Token (avancado)
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
  Sparkles,
  ArrowRight,
  Trash2,
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
import { redirectToFLFB } from '../../lib/facebook-sdk';
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
  connectionMethod?: 'manual' | 'flfb';
  businessManagerId?: string;
  scopes?: string[];
  lastValidated?: string;
  adAccountsCount?: number;
}

/** Passos do fluxo FLFB para exibicao de progresso */
type FLFBStep =
  | 'idle'
  | 'redirecting'
  | 'validating_token'
  | 'fetching_accounts'
  | 'saving'
  | 'done'
  | 'error';

const FLFB_STEP_LABELS: Record<FLFBStep, string> = {
  idle: '',
  redirecting: 'Redirecionando para o Facebook...',
  validating_token: 'Validando token...',
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

  // --- Estado do fluxo FLFB ---
  const [flfbStep, setFlfbStep] = useState<FLFBStep>('idle');
  const [flfbError, setFlfbError] = useState<string | null>(null);

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

  // Carrega status inicial e processa retorno do OAuth FLFB se houver code no localStorage
  useEffect(() => {
    loadSyncStatus();
    loadDirectAccountCount();
    processFLFBReturn();
  }, []);

  // Abre formulario manual automaticamente se desconectado ou metodo manual
  useEffect(() => {
    if (!loadingStatus) {
      const isManual = connectionStatus?.connectionMethod === 'manual';
      const isDisconnected = !connectionStatus?.connected;
      setShowManualForm(isManual || isDisconnected);
    }
  }, [loadingStatus, connectionStatus]);

  /**
   * Processa o retorno do fluxo FLFB apos o redirect de volta para /meta-admin.
   * Le o authorization code do localStorage (salvo pelo OAuthCallback) e
   * envia para a edge function meta-business-login para obter o BISUAT.
   */
  const processFLFBReturn = async () => {
    const code = localStorage.getItem('flfb_oauth_code');
    const flfbError = localStorage.getItem('flfb_oauth_error');

    // Limpa chaves do localStorage independente do resultado
    localStorage.removeItem('flfb_oauth_code');
    localStorage.removeItem('flfb_oauth_error');
    localStorage.removeItem('flfb_oauth_state');
    localStorage.removeItem('flfb_oauth_flow');

    if (flfbError) {
      setFlfbStep('error');
      setFlfbError(flfbError);
      return;
    }

    if (!code) return;

    console.log('[MetaAdminPage] Authorization code FLFB detectado, processando...');
    setFlfbStep('validating_token');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFlfbStep('error');
        setFlfbError('Sessao expirada. Faca login novamente.');
        return;
      }

      setFlfbStep('fetching_accounts');

      const redirectUri =
        import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/meta-business-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFlfbStep('error');
        setFlfbError(data.error || 'Erro ao processar conexao. Tente novamente.');
        return;
      }

      setFlfbStep('saving');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setFlfbStep('done');
      setGlobalSuccess(
        `Conectado com sucesso! ${data.adaccounts_count} conta(s) de anuncios vinculadas.`
      );

      await Promise.all([loadSyncStatus(), loadAdAccounts(), loadDirectAccountCount()]);

      setTimeout(() => setFlfbStep('idle'), 3000);
    } catch (err) {
      setFlfbStep('error');
      setFlfbError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
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

      // Busca workspace como owner
      const { data: workspaceOwner } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      let workspaceId = workspaceOwner?.id || null;

      // Fallback: busca como membro
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
        // Tenta renovar sessao em caso de erro RLS
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
          const isTokenExpired = status.connection.status === 'token_expired';
          setConnectionStatus({
            connected: status.connection.status === 'connected',
            tokenExpired: isTokenExpired,
            connectionMethod: (status.connection as { connection_method?: 'manual' | 'flfb' }).connection_method || 'manual',
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
   * Remove a conexao Meta do workspace atual:
   * - Deleta os registros de meta_connections
   * - Deleta as meta_ad_accounts vinculadas
   * - Deleta os meta_sync_state vinculados
   * Apos isso, recarrega a pagina para refletir o estado desconectado.
   */
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setGlobalSuccess(null);
    setManualError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Descobre o workspace do usuario
      const { data: ownedWs } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      let workspaceId = ownedWs?.id || null;

      if (!workspaceId) {
        const { data: memberWs } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .maybeSingle();
        workspaceId = memberWs?.workspace_id || null;
      }

      if (!workspaceId) {
        setManualError('Workspace nao encontrado.');
        return;
      }

      // Remove sync state, ad accounts e conexao (nessa ordem por FK)
      await supabase.from('meta_sync_state').delete().eq('workspace_id', workspaceId);
      await supabase.from('meta_ad_accounts').delete().eq('workspace_id', workspaceId);
      await supabase.from('meta_connections').delete().eq('workspace_id', workspaceId);

      // Reseta estado local
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
    setFlfbError(null);
    await Promise.all([loadAdAccounts(), loadSyncStatus(), loadDirectAccountCount()]);
    setGlobalSuccess('Dados atualizados com sucesso!');
    setTimeout(() => setGlobalSuccess(null), 3000);
  };

  // ============================================================
  // Facebook Login for Business (FLFB)
  // ============================================================

  /**
   * Inicia o fluxo FLFB via redirecionamento direto.
   * O Facebook autentica e redireciona de volta para /oauth-callback,
   * que salva o code no localStorage e redireciona para /meta-admin.
   * O processFLFBReturn() no useEffect inicial processa o code ao montar.
   */
  const handleFLFBConnect = () => {
    setFlfbError(null);
    setGlobalSuccess(null);
    setFlfbStep('redirecting');

    const result = redirectToFLFB();

    if (!result.success) {
      setFlfbStep('error');
      setFlfbError(result.error || 'Erro ao iniciar conexao com o Facebook.');
    }
    // Se success, o redirecionamento ocorre e a pagina sera recarregada ao voltar
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
  // Helpers de estilo
  // ============================================================

  const getFLFBButtonState = () => {
    // "redirecting" mostra loading brevemente antes do browser navegar para o Facebook
    const isLoading = flfbStep !== 'idle' && flfbStep !== 'done' && flfbStep !== 'error';
    const isDone = flfbStep === 'done';
    return { isLoading, isDone };
  };

  const getConnectionMethodBadge = () => {
    if (!connectionStatus?.connected) return null;
    if (connectionStatus.connectionMethod === 'flfb') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
          <Sparkles className="w-3 h-3" />
          Token Permanente
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
        Token Manual
      </span>
    );
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

  const { isLoading: flfbLoading, isDone: flfbDone } = getFLFBButtonState();
  const isConnected = connectionStatus?.connected === true;
  const isFLFBMethod = connectionStatus?.connectionMethod === 'flfb';

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
                  {/* Badge de status de conexao */}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'text-emerald-700 bg-emerald-100 border border-emerald-300' : 'text-red-600 bg-red-100 border border-red-200'}`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                  {/* Badge do metodo de conexao */}
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
                {connectionStatus.lastValidated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ultima validacao: {new Date(connectionStatus.lastValidated).toLocaleString('pt-BR')}
                  </p>
                )}

                {/* Sugestao de migrar para FLFB quando usando metodo manual */}
                {isConnected && !isFLFBMethod && (
                  <button
                    onClick={handleFLFBConnect}
                    disabled={flfbLoading}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Migrar para conexao automatica (token permanente)
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lado direito: badge de saude + botao de desconectar */}
            <div className="flex flex-col items-end gap-2">
              {syncStatus && isConnected && syncStatus.health_status !== 'error' && (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getSyncStatusColor(syncStatus.health_status)}`}>
                  {getSyncStatusLabel(syncStatus.health_status)}
                </span>
              )}
              {syncStatus?.health_status === 'stale' && (
                <p className="text-xs text-amber-600">Acesse "Meta Ads Sync" para atualizar</p>
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

              {/* Confirmacao de desconexao */}
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
              <h3 className="font-semibold text-red-800">Token do System User Invalido</h3>
              <p className="text-sm text-red-700 mt-1">
                O token atual foi revogado ou esta invalido. Use o botao "Conectar com Meta" abaixo
                para reconectar automaticamente, ou cole um novo token no formulario manual.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ======================================================
          SECAO A: Facebook Login for Business (metodo principal)
          ====================================================== */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-start gap-4">
          {/* Icone */}
          <div className="p-3 bg-blue-600 rounded-xl flex-shrink-0">
            <img src="/meta-icon.svg" alt="Meta" className="w-6 h-6 brightness-0 invert" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg">Conectar com Meta</h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                Recomendado
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Autorize em 1 clique usando o Facebook Login for Business.
              Gera um token de sistema permanente que nunca precisa ser renovado.
            </p>

            {/* Beneficios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: '1', label: '1 clique', desc: 'Sem copiar tokens' },
                { icon: '∞', label: 'Token permanente', desc: 'Nunca expira' },
                { icon: '🔒', label: 'Seguro', desc: 'Padrao Meta oficial' },
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
              onClick={handleFLFBConnect}
              disabled={flfbLoading}
              className={`
                inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200 shadow-sm
                ${flfbDone
                  ? 'bg-emerald-600 text-white cursor-default'
                  : flfbLoading
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md'
                }
              `}
            >
              {flfbLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {flfbDone && <CheckCircle className="w-4 h-4" />}
              {!flfbLoading && !flfbDone && (
                <img src="/meta-icon.svg" alt="" className="w-4 h-4 brightness-0 invert" />
              )}
              {flfbDone
                ? 'Conectado!'
                : flfbLoading
                  ? FLFB_STEP_LABELS[flfbStep]
                  : isConnected && isFLFBMethod
                    ? 'Reconectar com Meta'
                    : 'Conectar com Meta'
              }
            </button>

            {/* Barra de progresso em etapas */}
            {flfbLoading && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex gap-1">
                  {(['redirecting', 'validating_token', 'fetching_accounts', 'saving'] as FLFBStep[]).map((step) => {
                    const steps: FLFBStep[] = ['redirecting', 'validating_token', 'fetching_accounts', 'saving'];
                    const currentIdx = steps.indexOf(flfbStep);
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
                <p className="text-xs text-gray-500">{FLFB_STEP_LABELS[flfbStep]}</p>
              </div>
            )}

            {/* Mensagem de erro do FLFB */}
            {flfbStep === 'error' && flfbError && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{flfbError}</p>
                  <button
                    onClick={() => { setFlfbStep('idle'); setFlfbError(null); }}
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
        {/* Cabecalho colapsavel */}
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Conexao manual por System User (avancado)
            </span>
          </div>
          {showManualForm
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </button>

        {/* Conteudo do formulario */}
        {showManualForm && (
          <div className="p-5 space-y-4 bg-white">
            <p className="text-sm text-gray-500">
              Use este metodo se preferir inserir manualmente o Business Manager ID e o token de System User.
              Para a maioria dos casos, o botao "Conectar com Meta" acima e mais simples.
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
                Como obter o Token do System User?
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
