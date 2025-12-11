import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { MetaSyncService, SyncProgress } from '../../lib/services/MetaSyncService';
import { encryptData } from '../../lib/utils/encryption';
import { logger } from '../../lib/utils/logger';

/**
 * Interface para representar uma conta Meta
 */
interface MetaAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
}

/**
 * Props do componente
 */
interface ClientMetaConnectProps {
  clientId: string;
  clientName: string;
  onConnectionComplete?: () => void;
}

/**
 * Componente de conexão Meta específico para um cliente
 *
 * Fluxo:
 * 1. Verifica se cliente já tem conexão Meta (máximo 1 por cliente)
 * 2. Se não tiver, permite iniciar OAuth
 * 3. Após OAuth, busca todas as contas disponíveis
 * 4. Usuário seleciona quais contas deseja conectar (múltipla seleção)
 * 5. Cria oauth_tokens para cada conta selecionada
 * 6. Inicia sincronização automática
 */
export const ClientMetaConnect: React.FC<ClientMetaConnectProps> = ({
  clientId,
  clientName,
  onConnectionComplete
}) => {
  // Estados do fluxo principal
  const [status, setStatus] = useState<'checking' | 'disconnected' | 'connecting' | 'selecting' | 'connected' | 'syncing'>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para seleção de contas
  const [availableAccounts, setAvailableAccounts] = useState<MetaAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [tempAccessToken, setTempAccessToken] = useState<string>('');

  // Estados para contas conectadas
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  // Estados para sincronização
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncingTokenId, setSyncingTokenId] = useState<string | null>(null);

  /**
   * Verifica se cliente já tem conexão Meta ao carregar
   */
  useEffect(() => {
    checkExistingConnection();
  }, [clientId]);

  /**
   * Verifica se o cliente já possui contas Meta conectadas
   */
  const checkExistingConnection = async () => {
    try {
      setStatus('checking');

      logger.info('Verificando conexão Meta existente', { clientId, clientName });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Busca oauth_tokens ativos deste cliente para plataforma Meta
      const { data: tokens, error: tokensError } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      if (tokens && tokens.length > 0) {
        logger.info('Cliente já possui contas Meta conectadas', {
          clientId,
          accountsCount: tokens.length
        });

        setConnectedAccounts(tokens);
        setStatus('connected');
      } else {
        logger.info('Cliente não possui contas Meta conectadas', { clientId });
        setStatus('disconnected');
      }
    } catch (err: any) {
      logger.error('Erro ao verificar conexão Meta', err);
      setError(err.message || 'Erro ao verificar conexão');
      setStatus('disconnected');
    }
  };

  /**
   * Inicia o fluxo OAuth Meta
   * Validação: apenas 1 conexão Meta por cliente
   */
  const handleStartOAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verifica se já existe conexão ativa para este cliente
      const { data: existingTokens } = await supabase
        .from('oauth_tokens')
        .select('id')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('is_active', true);

      if (existingTokens && existingTokens.length > 0) {
        setError('Este cliente já possui uma conexão Meta ativa. Desconecte as contas existentes antes de adicionar novas.');
        setLoading(false);
        return;
      }

      setStatus('connecting');

      // Configurações do OAuth
      const clientAppId = import.meta.env.VITE_META_APP_ID;
      const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;
      const scope = 'ads_read,ads_management,business_management';

      // Inclui clientId no state para identificar após redirect
      const state = `meta_${clientId}_${Date.now()}`;

      if (!clientAppId) {
        setError('VITE_META_APP_ID não configurado. Configure no arquivo .env');
        setStatus('disconnected');
        setLoading(false);
        return;
      }

      // URL de autorização Facebook
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

      logger.info('Iniciando OAuth Meta', { clientId, clientName, authUrl: authUrl.substring(0, 100) + '...' });

      // Abre popup
      const popup = window.open(authUrl, 'meta-oauth', 'width=600,height=700');

    // Listener para resposta do popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-success' && event.data.platform === 'meta') {
        window.removeEventListener('message', handleMessage);

        const { code } = event.data;

        if (code) {
          await exchangeCodeForToken(code);
        }

        if (popup && !popup.closed) {
          popup.close();
        }
      } else if (event.data.type === 'oauth-error') {
        window.removeEventListener('message', handleMessage);
        setError(event.data.error || 'Erro ao autorizar');
        setStatus('disconnected');
        setLoading(false);

        if (popup && !popup.closed) {
          popup.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Detecta se popup foi fechado
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        if (status === 'connecting') {
          setStatus('disconnected');
          setLoading(false);
          setError('Autorização cancelada');
        }
      }
    }, 1000);
    } catch (err: any) {
      logger.error('Erro ao verificar conexões existentes', err);
      setError(err.message || 'Erro ao verificar conexões');
      setLoading(false);
    }
  };

  /**
   * Troca código OAuth por access token
   */
  const exchangeCodeForToken = async (code: string) => {
    try {
      const clientAppId = import.meta.env.VITE_META_APP_ID;
      const clientSecret = import.meta.env.VITE_META_APP_SECRET;
      const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      logger.info('Trocando código por token');

      const response = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientAppId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro ao obter token');
      }

      logger.info('Token obtido com sucesso');

      // Busca contas disponíveis
      await fetchAvailableAccounts(data.access_token);

    } catch (err: any) {
      logger.error('Erro ao trocar código por token', err);
      setError(err.message || 'Erro ao obter token');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Busca todas as contas Meta disponíveis para o usuário
   */
  const fetchAvailableAccounts = async (accessToken: string) => {
    try {
      logger.info('Buscando contas Meta disponíveis');

      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status,currency&access_token=${accessToken}`
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro ao buscar contas');
      }

      const accounts: MetaAccount[] = data.data || [];

      if (accounts.length === 0) {
        setError('Nenhuma conta de anúncios encontrada na sua conta Meta');
        setStatus('disconnected');
        setLoading(false);
        return;
      }

      logger.info('Contas encontradas', { count: accounts.length });

      // Salva token temporariamente
      setTempAccessToken(accessToken);
      setAvailableAccounts(accounts);
      setStatus('selecting');
      setLoading(false);

    } catch (err: any) {
      logger.error('Erro ao buscar contas', err);
      setError(err.message || 'Erro ao buscar contas');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Toggle seleção de uma conta
   */
  const toggleAccountSelection = (accountId: string) => {
    const newSelection = new Set(selectedAccountIds);

    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }

    setSelectedAccountIds(newSelection);
  };

  /**
   * Conecta as contas selecionadas
   */
  const handleConnectSelectedAccounts = async () => {
    if (selectedAccountIds.size === 0) {
      setError('Selecione pelo menos uma conta');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      logger.info('Conectando contas selecionadas', {
        clientId,
        accountsCount: selectedAccountIds.size
      });

      // Criptografa token
      const encryptedToken = encryptData(tempAccessToken.trim());

      // Calcula data de expiração (60 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      // Cria oauth_token para cada conta selecionada
      const tokensToInsert = Array.from(selectedAccountIds).map(accountId => {
        const account = availableAccounts.find(a => a.id === accountId);

        return {
          user_id: user.id,
          client_id: clientId,
          platform: 'meta',
          account_id: account?.id || accountId,
          account_name: account?.name || 'Meta Account',
          access_token: encryptedToken,
          is_active: true,
          sync_frequency: 'daily',
          expires_at: expiresAt.toISOString(),
        };
      });

      const { data: insertedTokens, error: insertError } = await supabase
        .from('oauth_tokens')
        .insert(tokensToInsert)
        .select();

      if (insertError) throw insertError;

      logger.info('Tokens criados com sucesso', {
        count: insertedTokens?.length || 0
      });

      // Limpa token temporário
      setTempAccessToken('');
      setSelectedAccountIds(new Set());

      // Atualiza lista de contas conectadas
      setConnectedAccounts(insertedTokens || []);
      setStatus('connected');
      setLoading(false);

      // Inicia sincronização da primeira conta
      if (insertedTokens && insertedTokens.length > 0) {
        setTimeout(() => {
          syncAccount(insertedTokens[0].id, tempAccessToken);
        }, 1000);
      }

      // Callback de sucesso
      if (onConnectionComplete) {
        onConnectionComplete();
      }

    } catch (err: any) {
      logger.error('Erro ao conectar contas', err);
      setError(err.message || 'Erro ao conectar contas');
      setLoading(false);
    }
  };

  /**
   * Sincroniza dados de uma conta específica
   * NOTA: Sincronização será implementada no SyncScheduler service
   * Por ora, apenas marca como agendada
   */
  const syncAccount = async (tokenId: string, accessToken?: string) => {
    try {
      setSyncingTokenId(tokenId);
      setError(null);

      logger.info('Agendando sincronização de conta', { tokenId });

      // Atualiza flag para indicar que precisa sincronizar
      await supabase
        .from('oauth_tokens')
        .update({
          last_sync_at: null, // Força nova sincronização
        })
        .eq('id', tokenId);

      logger.info('Sincronização agendada com sucesso', { tokenId });

      // Mostra mensagem de sucesso
      setError(null);

      // Simula pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSyncingTokenId(null);

      // Recarrega contas conectadas
      await checkExistingConnection();

    } catch (err: any) {
      logger.error('Erro ao agendar sincronização', err);
      setError('Erro ao agendar sincronização: ' + err.message);
      setSyncingTokenId(null);
    }
  };

  /**
   * Renderização
   */
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Meta Ads
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Facebook e Instagram Ads para {clientName}
          </p>
        </div>
      </div>

      {/* Estado: Verificando */}
      {status === 'checking' && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Verificando conexões...</span>
        </div>
      )}

      {/* Estado: Desconectado */}
      {status === 'disconnected' && (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Conecte contas do Meta Ads para importar campanhas do Facebook e Instagram.
          </p>
          <Button onClick={handleStartOAuth} loading={loading} disabled={loading}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Conectar Meta Ads
          </Button>
        </div>
      )}

      {/* Estado: Conectando */}
      {status === 'connecting' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-medium mb-2">
            Aguardando autorização...
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete a autorização na janela popup
          </p>
        </div>
      )}

      {/* Estado: Selecionando contas */}
      {status === 'selecting' && (
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Selecione as contas que deseja conectar
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Você pode selecionar múltiplas contas. Apenas 1 conexão é permitida por cliente.
          </p>

          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {availableAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => toggleAccountSelection(account.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedAccountIds.has(account.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      ID: {account.account_id} • {account.currency}
                    </div>
                  </div>
                  {selectedAccountIds.has(account.id) && (
                    <CheckCircle className="w-5 h-5 text-blue-600 ml-3" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleConnectSelectedAccounts}
              loading={loading}
              disabled={loading || selectedAccountIds.size === 0}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Conectar {selectedAccountIds.size} conta{selectedAccountIds.size !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus('disconnected');
                setAvailableAccounts([]);
                setSelectedAccountIds(new Set());
                setTempAccessToken('');
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Estado: Conectado */}
      {status === 'connected' && (
        <div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {connectedAccounts.length} conta{connectedAccounts.length !== 1 ? 's' : ''} conectada{connectedAccounts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {connectedAccounts.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {token.account_name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {token.account_id}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncAccount(token.id)}
                  disabled={syncingTokenId === token.id}
                >
                  {syncingTokenId === token.id ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado: Sincronizando */}
      {status === 'syncing' && syncProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Sincronizando dados...
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>

            <p className="text-xs text-blue-700 dark:text-blue-400">
              {syncProgress.message}
            </p>

            {syncProgress.total > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {syncProgress.current} de {syncProgress.total} ({syncProgress.percentage}%)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-600 dark:text-red-400 underline mt-1"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
