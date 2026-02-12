/**
 * SimpleGoogleConnect
 *
 * Componente simplificado para conexao com Google Ads via OAuth
 * Fluxo: Clicar -> Autorizar no Google -> Selecionar conta -> Pronto!
 *
 * O fluxo OAuth do Google requer:
 * 1. Client ID e Client Secret configurados no Google Cloud Console
 * 2. Developer Token aprovado no Google Ads API Center
 * 3. URLs de callback configuradas no Google Cloud Console
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  XCircle,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { GoogleSyncService } from '../../lib/services/GoogleSyncService';

// Icone do Google Ads
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/google-ads-icon.svg" alt="Google Ads" className={className} />
);

// Interface para conta do Google Ads
interface GoogleAdAccount {
  id: string;
  customer_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
}

// Interface para dados da conexao
interface ConnectionData {
  id: string;
  name: string;
  customer_id: string;
  status: string;
  last_sync_at: string | null;
  oauth_email?: string;
}

// Interface para progresso de sincronizacao
interface SyncProgress {
  phase: string;
  message: string;
  percentage: number;
  current: number;
  total: number;
}

export const SimpleGoogleConnect: React.FC = () => {
  // Estados para controle do fluxo
  const [status, setStatus] = useState<
    'disconnected' | 'connecting' | 'selecting' | 'connected' | 'syncing'
  >('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<GoogleAdAccount[]>([]);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);

  // Estados para progresso da sincronizacao
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Verificar conexao existente ao montar
  useEffect(() => {
    checkExistingConnection();
  }, []);

  // Processa callback OAuth quando usuario retorna do fluxo de autorizacao
  useEffect(() => {
    const processOAuthReturn = async () => {
      try {
        // Verifica se ha um codigo de autorizacao aguardando processamento
        const code = localStorage.getItem('google_oauth_code');
        const platform = localStorage.getItem('google_oauth_platform');
        const oauthError = localStorage.getItem('google_oauth_error');

        console.log('[Google Connect] Verificando retorno do OAuth:', {
          hasCode: !!code,
          platform,
          hasError: !!oauthError,
        });

        if (oauthError) {
          console.error('[Google Connect] Erro no OAuth recebido:', oauthError);

          // Mapeamento de erros comuns do Google
          let userFriendlyError = oauthError;
          if (oauthError.includes('redirect_uri_mismatch')) {
            userFriendlyError =
              'Erro de configuracao: URL de redirecionamento nao autorizada no Google Cloud Console.';
          } else if (oauthError.includes('access_denied')) {
            userFriendlyError =
              'Autorizacao cancelada. Voce precisa autorizar o aplicativo para continuar.';
          } else if (oauthError.includes('invalid_scope')) {
            userFriendlyError =
              'Erro de permissoes: Os escopos solicitados nao estao configurados no Google Cloud Console.';
          }

          setError(userFriendlyError);
          setStatus('disconnected');
          setLoading(false);

          // Limpa localStorage
          localStorage.removeItem('google_oauth_error');
          localStorage.removeItem('google_oauth_flow');
          localStorage.removeItem('google_oauth_state');
          return;
        }

        if (code && platform === 'google') {
          console.log('[Google Connect] Codigo OAuth detectado, iniciando processamento...');
          setStatus('connecting');
          setLoading(true);
          setError(null);

          // Limpa localStorage
          localStorage.removeItem('google_oauth_code');
          localStorage.removeItem('google_oauth_platform');
          localStorage.removeItem('google_oauth_flow');
          localStorage.removeItem('google_oauth_state');

          // Processa o codigo
          await exchangeCodeForToken(code);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao processar autorizacao';
        console.error('[Google Connect] Erro ao processar retorno OAuth:', errorMessage);
        setError(errorMessage);
        setStatus('disconnected');
        setLoading(false);
      }
    };

    processOAuthReturn();
  }, []);

  /**
   * Verifica se ja existe uma conexao Google ativa para este usuario
   */
  const checkExistingConnection = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Busca workspace do usuario
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!workspace) return;

      // Busca conexao existente
      const { data, error: fetchError } = await supabase
        .from('google_connections')
        .select('id, customer_id, status, last_sync_at, oauth_email')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setConnectionData({
          id: data.id,
          name: `Google Ads - ${data.customer_id}`,
          customer_id: data.customer_id,
          status: data.status,
          last_sync_at: data.last_sync_at,
          oauth_email: data.oauth_email,
        });
        setStatus('connected');

        // Carrega contas vinculadas
        await loadLinkedAccounts(data.id);
      }
    } catch (err) {
      console.error('[Google Connect] Erro ao verificar conexao existente:', err);
    }
  };

  /**
   * Carrega contas vinculadas a uma conexao
   */
  const loadLinkedAccounts = async (connectionId: string) => {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('google_ad_accounts')
        .select('id, customer_id, name, currency_code, timezone, status')
        .eq('connection_id', connectionId);

      if (accountsError) throw accountsError;

      if (accountsData) {
        setAccounts(accountsData);
      }
    } catch (err) {
      console.error('[Google Connect] Erro ao carregar contas:', err);
    }
  };

  /**
   * Inicia o fluxo OAuth do Google usando redirecionamento
   */
  const handleConnect = () => {
    console.log('[Google Connect] ========================================');
    console.log('[Google Connect] Iniciando processo de conexao OAuth');

    setLoading(true);
    setError(null);

    // Configuracoes do OAuth
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;
    const scope = 'https://www.googleapis.com/auth/adwords';
    const state = `google_${Date.now()}`;

    // Validacao de configuracao
    console.log('[Google Connect] Configuracoes OAuth:');
    console.log(
      '  - Client ID:',
      clientId ? `${clientId.substring(0, 20)}...` : 'NAO CONFIGURADO'
    );
    console.log('  - Redirect URI:', redirectUri);
    console.log('  - Scope:', scope);
    console.log('  - State:', state);

    // Validacao: Client ID obrigatorio
    if (!clientId) {
      console.error('[Google Connect] VITE_GOOGLE_CLIENT_ID nao esta configurado no .env');
      setError('Client ID do Google nao configurado. Verifique o arquivo .env');
      setLoading(false);
      return;
    }

    // Salva estado no localStorage para retomar apos o callback
    localStorage.setItem('google_oauth_state', state);
    localStorage.setItem('google_oauth_flow', 'connecting');

    // Constroi URL de autorizacao do Google
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    console.log('[Google Connect] URL de autorizacao construida');
    console.log('[Google Connect] Redirecionando para Google...');

    try {
      window.location.href = authUrl;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Google Connect] Erro ao redirecionar:', errorMessage);
      setError(`Erro ao iniciar autorizacao: ${errorMessage}`);
      setLoading(false);
      localStorage.removeItem('google_oauth_flow');
    }
  };

  /**
   * Troca o codigo de autorizacao por tokens de acesso via Edge Function (server-side)
   * O Client Secret nunca e exposto ao browser
   */
  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log('[Exchange Token] Iniciando troca de codigo por token via Edge Function');

      const redirectUri =
        import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      // Chama Edge Function que faz a troca server-side (Client Secret fica no servidor)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-exchange-token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            include_user_info: true,
          }),
        }
      );

      const tokenData = await response.json();

      if (tokenData.error) {
        console.error('[Exchange Token] Erro na resposta:', tokenData.error);
        throw new Error(tokenData.error);
      }

      if (!tokenData.access_token) {
        throw new Error('Token de acesso nao recebido do Google');
      }

      console.log('[Exchange Token] Token obtido com sucesso!');
      console.log('[Exchange Token] Email do usuario:', tokenData.user_email);

      // Salva tokens temporariamente
      sessionStorage.setItem('google_temp_access_token', tokenData.access_token);
      sessionStorage.setItem('google_temp_refresh_token', tokenData.refresh_token || '');
      sessionStorage.setItem('google_temp_email', tokenData.user_email || '');
      sessionStorage.setItem(
        'google_temp_expires_at',
        String(Date.now() + (tokenData.expires_in || 3600) * 1000)
      );

      // Busca contas de anuncios
      await fetchAdAccounts(tokenData.access_token);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter token de acesso';
      console.error('[Exchange Token] Erro:', errorMessage);
      setError(errorMessage);
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Busca contas de anuncios do Google Ads
   */
  const fetchAdAccounts = async (accessToken: string) => {
    try {
      console.log('[Fetch Accounts] Buscando contas de anuncios do Google Ads');

      // Chama Edge Function para listar contas (developer_token lido server-side)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-list-adaccounts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error('[Fetch Accounts] Erro ao buscar contas:', data.error);
        throw new Error(data.error);
      }

      const accountsList = data.accounts || [];

      console.log('[Fetch Accounts] Contas encontradas:', accountsList.length);

      if (accountsList.length === 0) {
        setError(
          'Nenhuma conta de anuncios encontrada. Verifique se sua conta Google tem acesso a contas do Google Ads.'
        );
        setStatus('disconnected');
        setLoading(false);
        return;
      }

      setAccounts(accountsList);
      setStatus('selecting');
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao buscar contas de anuncios';
      console.error('[Fetch Accounts] Erro:', errorMessage);
      setError(errorMessage);
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Finaliza a conexao salvando a conta selecionada
   */
  const handleAccountSelect = async (accountId: string) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Recupera tokens temporarios
      const accessToken = sessionStorage.getItem('google_temp_access_token');
      const refreshToken = sessionStorage.getItem('google_temp_refresh_token');
      const oauthEmail = sessionStorage.getItem('google_temp_email');
      const expiresAt = sessionStorage.getItem('google_temp_expires_at');

      if (!accessToken) throw new Error('Token de acesso nao encontrado');

      // Busca conta selecionada
      const selectedAcc = accounts.find((acc) => acc.customer_id === accountId);
      if (!selectedAcc) throw new Error('Conta nao encontrada');

      // Busca workspace do usuario
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (wsError || !workspace) {
        throw new Error('Workspace nao encontrado');
      }

      // Salva conexao no banco de dados
      const { data: connection, error: insertError } = await supabase
        .from('google_connections')
        .upsert(
          {
            workspace_id: workspace.id,
            customer_id: selectedAcc.customer_id,
            developer_token: '',
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: expiresAt ? new Date(parseInt(expiresAt)).toISOString() : null,
            oauth_email: oauthEmail,
            oauth_client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            oauth_scopes: ['https://www.googleapis.com/auth/adwords'],
            status: 'active',
            last_validated_at: new Date().toISOString(),
          },
          {
            onConflict: 'workspace_id',
          }
        )
        .select()
        .single();

      if (insertError) throw insertError;

      // Salva conta de anuncios selecionada
      await supabase.from('google_ad_accounts').upsert(
        {
          connection_id: connection.id,
          workspace_id: workspace.id,
          customer_id: selectedAcc.customer_id,
          name: selectedAcc.name,
          currency_code: selectedAcc.currency_code,
          timezone: selectedAcc.timezone,
          status: selectedAcc.status,
          is_selected: true,
        },
        {
          onConflict: 'connection_id,customer_id',
        }
      );

      // Limpa tokens temporarios
      sessionStorage.removeItem('google_temp_access_token');
      sessionStorage.removeItem('google_temp_refresh_token');
      sessionStorage.removeItem('google_temp_email');
      sessionStorage.removeItem('google_temp_expires_at');

      setConnectionData({
        id: connection.id,
        name: `Google Ads - ${selectedAcc.name}`,
        customer_id: selectedAcc.customer_id,
        status: 'active',
        last_sync_at: null,
        oauth_email: oauthEmail || undefined,
      });
      setStatus('connected');
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar';
      console.error('[Google Connect] Erro ao salvar conexao:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  /**
   * Inicia sincronizacao de dados da conta Google Ads
   */
  const syncData = useCallback(async () => {
    if (!connectionData) return;

    try {
      console.log('[Google Connect] Iniciando sincronizacao...');

      setIsSyncing(true);
      setStatus('syncing');
      setSyncProgress({
        phase: 'starting',
        message: 'Preparando sincronizacao...',
        percentage: 0,
        current: 0,
        total: 0,
      });
      setError(null);

      // Chama Edge Function de sincronizacao
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-run-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connection_id: connectionData.id,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('[Google Connect] Sincronizacao concluida!');

      setSyncProgress({
        phase: 'complete',
        message: 'Sincronizacao concluida com sucesso!',
        percentage: 100,
        current: data.campaigns_synced || 0,
        total: data.campaigns_synced || 0,
      });

      setTimeout(() => {
        setStatus('connected');
        setIsSyncing(false);
        setSyncProgress(null);
        checkExistingConnection();
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar';
      console.error('[Google Connect] Erro na sincronizacao:', errorMessage);
      setError('Erro ao sincronizar: ' + errorMessage);
      setIsSyncing(false);
      setStatus('connected');
    }
  }, [connectionData]);

  /**
   * Desconecta a conta Google
   */
  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta Google Ads?')) return;

    setLoading(true);

    try {
      if (connectionData) {
        // Remove contas vinculadas
        await supabase
          .from('google_ad_accounts')
          .delete()
          .eq('connection_id', connectionData.id);

        // Remove conexao
        await supabase.from('google_connections').delete().eq('id', connectionData.id);
      }

      setConnectionData(null);
      setStatus('disconnected');
      setAccounts([]);
    } catch (err) {
      console.error('[Google Connect] Erro ao desconectar:', err);
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formata Customer ID com hifens
   */
  const formatCustomerId = (id: string): string => {
    const cleanId = id.replace(/\D/g, '');
    if (cleanId.length === 10) {
      return `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;
    }
    return id;
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <GoogleIcon className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Ads</h3>
            <p className="text-sm text-gray-600">Pesquisa, Display, YouTube</p>
          </div>
        </div>

        {/* Badge de status */}
        {status === 'connected' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Conectado
          </span>
        )}
        {status === 'disconnected' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            Nao conectado
          </span>
        )}
      </div>

      {/* Exibicao de erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Erro na Conexao</h4>
              <p className="text-sm text-red-800 mb-2">{error}</p>

              {/* Instrucoes para erro de redirect_uri */}
              {error.includes('redirect_uri') && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900">
                  <strong>Como corrigir:</strong>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>
                      Acesse:{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Google Cloud Console
                      </a>
                    </li>
                    <li>Selecione seu projeto</li>
                    <li>Edite as credenciais OAuth 2.0</li>
                    <li>
                      Em "URIs de redirecionamento autorizados", adicione:{' '}
                      <code className="bg-white px-1 rounded">
                        {import.meta.env.VITE_OAUTH_REDIRECT_URL ||
                          `${window.location.origin}/oauth-callback`}
                      </code>
                    </li>
                    <li>Salve e tente novamente</li>
                  </ol>
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800 text-xl leading-none"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Estado: Desconectado */}
      {status === 'disconnected' && (
        <div>
          <p className="text-gray-600 mb-4">
            Conecte sua conta Google para importar dados de campanhas do Google Ads.
          </p>
          <Button onClick={handleConnect} loading={loading} disabled={loading}>
            Conectar com Google
          </Button>
          <p className="text-xs text-gray-500 mt-3">
            Voce sera redirecionado para o Google para autorizar o acesso.
          </p>
        </div>
      )}

      {/* Estado: Conectando (aguardando autorizacao) */}
      {status === 'connecting' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Processando autorizacao...</p>
          <p className="text-sm text-gray-500 mt-2">Aguarde enquanto buscamos suas contas</p>
        </div>
      )}

      {/* Estado: Selecionando conta */}
      {status === 'selecting' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-600" />
            Selecione uma conta de anuncios
          </h4>
          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account.customer_id}
                onClick={() => handleAccountSelect(account.customer_id)}
                disabled={loading}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 hover:bg-blue-50'
                } border-gray-200`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-600">
                      ID: {formatCustomerId(account.customer_id)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {account.currency_code} | {account.timezone}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      account.status === 'ENABLED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {account.status === 'ENABLED' ? 'Ativo' : account.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatus('disconnected');
              setAccounts([]);
              sessionStorage.removeItem('google_temp_access_token');
              sessionStorage.removeItem('google_temp_refresh_token');
              sessionStorage.removeItem('google_temp_email');
              sessionStorage.removeItem('google_temp_expires_at');
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Estado: Sincronizando */}
      {status === 'syncing' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-blue-800">
                Sincronizando dados do Google Ads...
              </p>
            </div>

            {syncProgress && (
              <div className="space-y-2">
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-blue-700">{syncProgress.message}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Este processo pode levar alguns minutos dependendo da quantidade de campanhas.
          </p>
        </div>
      )}

      {/* Estado: Conectado */}
      {status === 'connected' && connectionData && !isSyncing && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-green-800 font-medium">
                  {connectionData.name || `Conta ${formatCustomerId(connectionData.customer_id)}`}
                </p>
                {connectionData.oauth_email && (
                  <p className="text-xs text-green-600 mt-1">
                    Conectado como: {connectionData.oauth_email}
                  </p>
                )}
                {connectionData.last_sync_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Ultima sincronizacao: {new Date(connectionData.last_sync_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            </div>
          </div>

          {/* Lista de contas vinculadas */}
          {accounts.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Contas vinculadas:</p>
              <div className="space-y-1">
                {accounts.map((acc) => (
                  <div
                    key={acc.customer_id}
                    className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center"
                  >
                    <span>{acc.name}</span>
                    <span className="text-gray-500">{formatCustomerId(acc.customer_id)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncData}
              icon={RefreshCw}
              disabled={isSyncing}
            >
              Sincronizar Agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading || isSyncing}
            >
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* Link para documentacao */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <a
          href="https://developers.google.com/google-ads/api/docs/first-call/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Documentacao do Google Ads API
        </a>
      </div>
    </Card>
  );
};
