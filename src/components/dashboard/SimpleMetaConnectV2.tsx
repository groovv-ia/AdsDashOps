import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { MetaAccountSelector } from './MetaAccountSelector';
import { CampaignMultiSelector } from './CampaignMultiSelector';
import { supabase } from '../../lib/supabase';
import { MetaSyncService } from '../../lib/services/MetaSyncService';
import { useSelectedCampaigns } from '../../hooks/useSelectedCampaigns';

/**
 * Novo componente para conexão com Meta Ads com suporte a múltiplas contas
 *
 * Fluxo completo em 3 etapas:
 * 1. OAuth - Autorização do usuário
 * 2. Seleção de Conta - Escolher qual conta de anúncios conectar
 * 3. Seleção de Campanhas - Escolher quais campanhas monitorar
 *
 * Suporta múltiplas contas Meta conectadas simultaneamente
 */
export const SimpleMetaConnectV2: React.FC = () => {
  // Estados principais do fluxo
  type FlowStatus = 'disconnected' | 'connecting' | 'account-selection' | 'campaign-selection' | 'connected';
  const [status, setStatus] = useState<FlowStatus>('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados temporários durante o fluxo de conexão
  const [tempAccessToken, setTempAccessToken] = useState<string | null>(null);
  const [tempSelectedAccount, setTempSelectedAccount] = useState<any>(null);
  const [tempAccountLabel, setTempAccountLabel] = useState<string>('');

  // Contas Meta conectadas do usuário
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [activeMetaAccountId, setActiveMetaAccountId] = useState<string | null>(null);

  // Estado para modal de adicionar nova conta
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  /**
   * Carrega todas as contas Meta conectadas ao inicializar
   */
  useEffect(() => {
    loadMetaAccounts();
  }, []);

  /**
   * Busca todas as contas Meta conectadas do usuário
   */
  const loadMetaAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca contas Meta com suas conexões
      const { data: accounts, error: accountsError } = await supabase
        .from('meta_accounts')
        .select(`
          *,
          connection:data_connections!inner(*)
        `)
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (accountsError) throw accountsError;

      setMetaAccounts(accounts || []);

      // Define primeira conta como ativa se não houver nenhuma ativa
      if (accounts && accounts.length > 0 && !activeMetaAccountId) {
        const primaryAccount = accounts.find((a: any) => a.is_primary) || accounts[0];
        setActiveMetaAccountId(primaryAccount.id);
      }

      // Atualiza status para 'connected' se há contas
      if (accounts && accounts.length > 0) {
        setStatus('connected');
      }
    } catch (err) {
      console.error('Erro ao carregar contas Meta:', err);
    }
  };

  /**
   * Inicia o fluxo OAuth do Meta
   */
  const handleStartOAuth = () => {
    setLoading(true);
    setError(null);
    setStatus('connecting');

    // Configurações do OAuth
    const clientId = import.meta.env.VITE_META_APP_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;
    const scope = 'ads_read,ads_management,business_management';
    const state = `meta_${Date.now()}`;

    // URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

    // Abre popup para autorização
    const popup = window.open(authUrl, 'meta-oauth', 'width=600,height=700');

    // Listener para mensagens do popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-success' && event.data.platform === 'meta') {
        window.removeEventListener('message', handleMessage);

        const { code, accessToken } = event.data;

        // Se já recebeu o access token
        if (accessToken) {
          setTempAccessToken(accessToken);
          sessionStorage.setItem('meta_temp_token', accessToken);
          setStatus('account-selection');
          setLoading(false);
        } else if (code) {
          // Se recebeu apenas o código, troca por token
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
   * Troca código OAuth por access token
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

      setTempAccessToken(data.access_token);
      sessionStorage.setItem('meta_temp_token', data.access_token);
      setStatus('account-selection');
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao trocar código por token:', err);
      setError(err.message || 'Erro ao obter token de acesso');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Handler para quando usuário seleciona uma conta
   */
  const handleAccountSelected = async (account: any) => {
    setTempSelectedAccount(account);
    setStatus('campaign-selection');
  };

  /**
   * Handler para quando usuário confirma seleção de campanhas
   */
  const handleCampaignsSelected = async (campaigns: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const accessToken = tempAccessToken || sessionStorage.getItem('meta_temp_token');
      if (!accessToken) throw new Error('Token não encontrado');

      // 1. Cria conexão no data_connections
      const { data: connection, error: connectionError } = await supabase
        .from('data_connections')
        .insert({
          user_id: user.id,
          name: tempAccountLabel || `Meta Ads - ${tempSelectedAccount.name}`,
          platform: 'Meta',
          type: 'advertising',
          status: 'connected',
          account_label: tempAccountLabel,
          config: {
            accountId: tempSelectedAccount.id,
            accountName: tempSelectedAccount.name,
            currency: tempSelectedAccount.currency,
          },
          logo: '/meta-icon.svg',
          description: 'Facebook e Instagram Ads',
          campaign_selection_completed: true,
          last_sync: new Date().toISOString(),
        })
        .select()
        .single();

      if (connectionError) throw connectionError;

      // 2. Cria registro na meta_accounts
      const { data: metaAccount, error: metaAccountError } = await supabase
        .from('meta_accounts')
        .insert({
          user_id: user.id,
          connection_id: connection.id,
          account_id: tempSelectedAccount.account_id,
          account_name: tempSelectedAccount.name,
          account_label: tempAccountLabel,
          account_type: 'PERSONAL',
          account_status: tempSelectedAccount.account_status?.toString() || '1',
          total_campaigns: tempSelectedAccount.total_campaigns || 0,
          active_campaigns: tempSelectedAccount.active_campaigns || 0,
          currency: tempSelectedAccount.currency,
          is_primary: metaAccounts.length === 0, // Primeira conta é primária
          display_order: metaAccounts.length,
        })
        .select()
        .single();

      if (metaAccountError) throw metaAccountError;

      // 3. Salva token OAuth
      const { error: tokenError } = await supabase
        .from('oauth_tokens')
        .insert({
          user_id: user.id,
          connection_id: connection.id,
          platform: 'meta',
          access_token: accessToken.trim(),
          account_id: tempSelectedAccount.id,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
        });

      if (tokenError) throw tokenError;

      // 4. Salva campanhas selecionadas
      const campaignsToInsert = campaigns.map(campaign => ({
        user_id: user.id,
        connection_id: connection.id,
        meta_account_id: metaAccount.id,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
      }));

      const { error: campaignsError } = await supabase
        .from('selected_campaigns')
        .insert(campaignsToInsert);

      if (campaignsError) throw campaignsError;

      // 5. Limpa dados temporários
      setTempAccessToken(null);
      setTempSelectedAccount(null);
      setTempAccountLabel('');
      sessionStorage.removeItem('meta_temp_token');

      // 6. Recarrega contas e atualiza status
      await loadMetaAccounts();
      setStatus('connected');
      setShowAddAccountModal(false);

      // 7. Inicia sincronização automática
      setTimeout(() => {
        syncMetaAccount(connection.id);
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar conexão:', err);
      setError(err.message || 'Erro ao conectar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia sincronização de dados de uma conta Meta
   */
  const syncMetaAccount = async (connectionId: string) => {
    try {
      console.log('Iniciando sincronização Meta...', connectionId);

      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('connection_id', connectionId)
        .maybeSingle();

      const accessToken = tokenData?.access_token || import.meta.env.VITE_META_ACCESS_TOKEN;

      if (!accessToken) {
        throw new Error('Token de acesso não encontrado');
      }

      const syncService = new MetaSyncService(accessToken);
      await syncService.syncConnection(connectionId);

      await loadMetaAccounts();
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar dados: ' + err.message);
    }
  };

  /**
   * Handler para voltar à etapa anterior do fluxo
   */
  const handleBack = () => {
    if (status === 'campaign-selection') {
      setStatus('account-selection');
    } else if (status === 'account-selection') {
      setStatus('disconnected');
      setTempAccessToken(null);
      sessionStorage.removeItem('meta_temp_token');
    }
  };

  /**
   * Handler para desconectar uma conta Meta
   */
  const handleDisconnect = async (metaAccountId: string) => {
    if (!confirm('Deseja realmente desconectar esta conta Meta?')) return;

    setLoading(true);
    try {
      const account = metaAccounts.find(a => a.id === metaAccountId);
      if (!account) return;

      // Remove token OAuth
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('connection_id', account.connection_id);

      // Remove campanhas selecionadas
      await supabase
        .from('selected_campaigns')
        .delete()
        .eq('meta_account_id', metaAccountId);

      // Remove conta Meta
      await supabase
        .from('meta_accounts')
        .delete()
        .eq('id', metaAccountId);

      // Remove conexão
      await supabase
        .from('data_connections')
        .delete()
        .eq('id', account.connection_id);

      await loadMetaAccounts();
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderiza modal para fluxo de adição de conta
   */
  const renderAddAccountFlow = () => {
    if (status === 'account-selection' && tempAccessToken) {
      return (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowAddAccountModal(false);
            setStatus('connected');
            setTempAccessToken(null);
            sessionStorage.removeItem('meta_temp_token');
          }}
          title="Nova Conta Meta"
          size="xl"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Conta (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Cliente ABC, Conta Pessoal, Teste..."
              value={tempAccountLabel}
              onChange={(e) => setTempAccountLabel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Escolha um nome para identificar facilmente esta conta
            </p>
          </div>
          <MetaAccountSelector
            accessToken={tempAccessToken}
            onAccountSelect={handleAccountSelected}
            onBack={handleBack}
          />
        </Modal>
      );
    }

    if (status === 'campaign-selection' && tempSelectedAccount) {
      return (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowAddAccountModal(false);
            setStatus('connected');
          }}
          title="Selecione as Campanhas"
          size="xl"
        >
          <CampaignMultiSelector
            accountId={tempSelectedAccount.id}
            accessToken={tempAccessToken!}
            onConfirmSelection={handleCampaignsSelected}
            onBack={handleBack}
            loading={loading}
          />
        </Modal>
      );
    }

    return null;
  };

  /**
   * Renderiza lista de contas conectadas
   */
  const renderConnectedAccounts = () => {
    if (metaAccounts.length === 0) {
      return null;
    }

    return (
      <div className="mt-6 space-y-3">
        <h4 className="font-medium text-gray-900 text-sm">Contas Conectadas:</h4>
        {metaAccounts.map((account: any) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {account.account_label || account.account_name}
              </p>
              <p className="text-sm text-gray-600">
                ID: {account.account_id} • {account.active_campaigns} campanhas ativas
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncMetaAccount(account.connection_id)}
                icon={RefreshCw}
                title="Sincronizar"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                disabled={loading}
                title="Desconectar"
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

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

        {status === 'connected' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            {metaAccounts.length} {metaAccounts.length === 1 ? 'conta conectada' : 'contas conectadas'}
          </span>
        )}
      </div>

      {/* Estado: Desconectado ou pronto para adicionar nova conta */}
      {(status === 'disconnected' || status === 'connected') && (
        <div>
          <p className="text-gray-600 mb-4">
            {metaAccounts.length === 0
              ? 'Conecte sua conta Meta para importar dados de campanhas do Facebook e Instagram Ads.'
              : 'Adicione mais contas Meta para gerenciar múltiplos clientes em um só lugar.'
            }
          </p>
          <Button
            onClick={() => {
              setShowAddAccountModal(true);
              handleStartOAuth();
            }}
            loading={loading}
            disabled={loading}
            icon={metaAccounts.length > 0 ? Plus : undefined}
          >
            {metaAccounts.length === 0 ? 'Conectar Conta Meta' : 'Adicionar Outra Conta'}
          </Button>

          {renderConnectedAccounts()}
        </div>
      )}

      {/* Estado: Conectando */}
      {status === 'connecting' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Aguardando autorização...</p>
          <p className="text-sm text-gray-500 mt-2">
            Complete a autorização na janela que foi aberta
          </p>
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

      {/* Modal para fluxo de adição de conta */}
      {renderAddAccountFlow()}
    </Card>
  );
};
