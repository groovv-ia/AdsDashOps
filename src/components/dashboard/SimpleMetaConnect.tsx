import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

/**
 * Componente simplificado para conexão com Meta Ads
 * Fluxo: Clicar → Autorizar no popup → Selecionar conta → Pronto!
 */
export const SimpleMetaConnect: React.FC = () => {
  // Estados para controle do fluxo
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'selecting' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [connectionData, setConnectionData] = useState<any>(null);

  // Verificar se já existe conexão Meta ativa
  useEffect(() => {
    checkExistingConnection();
  }, []);

  /**
   * Verifica se já existe uma conexão Meta ativa para este usuário
   */
  const checkExistingConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'Meta')
        .eq('status', 'connected')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConnectionData(data);
        setStatus('connected');
      }
    } catch (err) {
      console.error('Erro ao verificar conexão existente:', err);
    }
  };

  /**
   * Inicia o fluxo OAuth do Meta
   * Abre popup com tela de autorização do Facebook
   */
  const handleConnect = () => {
    setLoading(true);
    setError(null);
    setStatus('connecting');

    // Configurações do OAuth
    const clientId = import.meta.env.VITE_META_APP_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;
    const scope = 'ads_read,ads_management,business_management';
    const state = `meta_${Date.now()}`;

    // Constrói URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

    console.log('Iniciando OAuth Meta com URL:', authUrl);

    // Abre popup para autorização
    const popup = window.open(authUrl, 'meta-oauth', 'width=600,height=700');

    // Listener para receber mensagem do popup após autorização
    const handleMessage = async (event: MessageEvent) => {
      // Verifica origem por segurança
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-success' && event.data.platform === 'meta') {
        window.removeEventListener('message', handleMessage);

        const { code, accessToken } = event.data;

        // Se já recebeu o access token, busca contas
        if (accessToken) {
          await fetchAccounts(accessToken);
        } else if (code) {
          // Se recebeu apenas o código, precisa trocar por token
          await exchangeCodeForToken(code);
        }

        if (popup && !popup.closed) {
          popup.close();
        }
      } else if (event.data.type === 'oauth-error') {
        window.removeEventListener('message', handleMessage);
        setError(event.data.error || 'Erro ao autorizar com Meta');
        setStatus('disconnected');
        setLoading(false);

        if (popup && !popup.closed) {
          popup.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Verifica se popup foi fechado manualmente
    const checkPopupClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', handleMessage);
        if (status === 'connecting') {
          setStatus('disconnected');
          setLoading(false);
          setError('Autorização cancelada');
        }
      }
    }, 1000);
  };

  /**
   * Troca o código de autorização por um access token
   */
  const exchangeCodeForToken = async (code: string) => {
    try {
      const clientId = import.meta.env.VITE_META_APP_ID;
      const clientSecret = import.meta.env.VITE_META_APP_SECRET;
      const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      const response = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro ao obter token');
      }

      // Busca contas com o token obtido
      await fetchAccounts(data.access_token);
    } catch (err: any) {
      console.error('Erro ao trocar código por token:', err);
      setError(err.message || 'Erro ao obter token de acesso');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Busca todas as contas de anúncios do Meta do usuário
   */
  const fetchAccounts = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status,currency&access_token=${accessToken}`
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro ao buscar contas');
      }

      const accountsList = data.data || [];

      if (accountsList.length === 0) {
        setError('Nenhuma conta de anúncios encontrada');
        setStatus('disconnected');
        setLoading(false);
        return;
      }

      // Salva token temporariamente para uso posterior
      sessionStorage.setItem('meta_temp_token', accessToken);

      setAccounts(accountsList);
      setStatus('selecting');
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao buscar contas:', err);
      setError(err.message || 'Erro ao buscar contas');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Finaliza a conexão salvando a conta selecionada no banco
   */
  const handleAccountSelect = async (accountId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const accessToken = sessionStorage.getItem('meta_temp_token');
      if (!accessToken) throw new Error('Token não encontrado');

      const selectedAcc = accounts.find(acc => acc.id === accountId);
      if (!selectedAcc) throw new Error('Conta não encontrada');

      // Salva conexão no banco de dados
      const { data: connection, error: insertError } = await supabase
        .from('data_connections')
        .insert({
          user_id: user.id,
          name: `Meta Ads - ${selectedAcc.name}`,
          platform: 'Meta',
          type: 'advertising',
          status: 'connected',
          config: {
            accountId: selectedAcc.id,
            accountName: selectedAcc.name,
            currency: selectedAcc.currency,
          },
          logo: '/meta-icon.svg',
          description: 'Facebook e Instagram Ads',
          last_sync: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Salva token OAuth de forma segura
      const { error: tokenError } = await supabase
        .from('oauth_tokens')
        .insert({
          user_id: user.id,
          connection_id: connection.id,
          platform: 'Meta',
          access_token: accessToken,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
        });

      if (tokenError) throw tokenError;

      // Limpa token temporário
      sessionStorage.removeItem('meta_temp_token');

      setConnectionData(connection);
      setStatus('connected');
      setLoading(false);

      // Inicia sincronização automática
      setTimeout(() => {
        syncData(connection.id);
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar conexão:', err);
      setError(err.message || 'Erro ao conectar');
      setLoading(false);
    }
  };

  /**
   * Inicia sincronização de dados da conta Meta
   */
  const syncData = async (connectionId: string) => {
    try {
      // Atualiza status para sincronizando
      await supabase
        .from('data_connections')
        .update({ status: 'syncing' })
        .eq('id', connectionId);

      // TODO: Implementar lógica de sincronização real
      // Por enquanto, apenas simula a sincronização

      setTimeout(async () => {
        await supabase
          .from('data_connections')
          .update({
            status: 'connected',
            last_sync: new Date().toISOString()
          })
          .eq('id', connectionId);
      }, 3000);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    }
  };

  /**
   * Desconecta a conta Meta
   */
  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta Meta?')) return;

    setLoading(true);

    try {
      if (connectionData) {
        // Remove token OAuth
        await supabase
          .from('oauth_tokens')
          .delete()
          .eq('connection_id', connectionData.id);

        // Remove conexão
        await supabase
          .from('data_connections')
          .delete()
          .eq('id', connectionData.id);
      }

      setConnectionData(null);
      setStatus('disconnected');
      setAccounts([]);
      setSelectedAccount(null);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderiza o estado atual da conexão
   */
  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <img src="/meta-icon.svg" alt="Meta" className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Meta Ads</h3>
            <p className="text-sm text-gray-600">Facebook e Instagram</p>
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
            Não conectado
          </span>
        )}
      </div>

      {/* Estado: Desconectado */}
      {status === 'disconnected' && (
        <div>
          <p className="text-gray-600 mb-4">
            Conecte sua conta Meta para importar dados de campanhas do Facebook e Instagram Ads.
          </p>
          <Button onClick={handleConnect} loading={loading} disabled={loading}>
            Conectar com Meta
          </Button>
        </div>
      )}

      {/* Estado: Conectando (aguardando autorização) */}
      {status === 'connecting' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Aguardando autorização...</p>
          <p className="text-sm text-gray-500 mt-2">
            Complete a autorização na janela que foi aberta
          </p>
        </div>
      )}

      {/* Estado: Selecionando conta */}
      {status === 'selecting' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Selecione uma conta</h4>
          <div className="space-y-2 mb-4">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountSelect(account.id)}
                disabled={loading}
                className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                  selectedAccount === account.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{account.name}</div>
                <div className="text-sm text-gray-600">
                  ID: {account.account_id} • {account.currency}
                </div>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatus('disconnected');
              setAccounts([]);
              sessionStorage.removeItem('meta_temp_token');
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Estado: Conectado */}
      {status === 'connected' && connectionData && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>{connectionData.name}</strong> está conectado e sincronizando automaticamente.
            </p>
            <p className="text-xs text-green-600 mt-1">
              Última sincronização: {new Date(connectionData.last_sync).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncData(connectionData.id)}
              icon={RefreshCw}
            >
              Sincronizar Agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading}
            >
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-600 underline mt-1"
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
