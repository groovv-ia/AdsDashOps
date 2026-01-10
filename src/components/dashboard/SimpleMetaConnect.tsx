import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

/**
 * Componente simplificado para conexão com Meta Ads
 *
 * Fluxo corrigido:
 * 1. OAuth → Obtém token
 * 2. Busca informações do usuário Meta e Business Manager
 * 3. Busca contas de anúncios
 * 4. Usuário seleciona conta(s) e pode fornecer Token System User
 * 5. Salva em meta_connections, meta_ad_accounts e oauth_tokens
 *
 * Estrutura de dados:
 * - meta_connections: Conexão do workspace com Meta (business_manager_id, status, scopes)
 * - meta_ad_accounts: Contas de anúncios vinculadas ao workspace
 * - oauth_tokens: Tokens OAuth (access_token e system_user_token)
 */

// Props opcionais para integração com wizard e outros componentes
interface SimpleMetaConnectProps {
  // Callback chamado quando a conexão é concluída com sucesso
  onConnectionSuccess?: (accounts: Array<{ id: string; name: string }>) => void;

  // Callback chamado quando o usuário cancela o processo
  onCancel?: () => void;

  // Se true, oculta o componente quando já está conectado
  hideIfConnected?: boolean;
}

export const SimpleMetaConnect: React.FC<SimpleMetaConnectProps> = ({
  onConnectionSuccess,
  onCancel,
  hideIfConnected = false,
}) => {
  // Estados para controle do fluxo
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'selecting' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountsIds, setSelectedAccountsIds] = useState<string[]>([]);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Estado para Token System User
  const [systemUserToken, setSystemUserToken] = useState<string>('');

  // Informações do usuário Meta
  const [metaUserId, setMetaUserId] = useState<string | null>(null);
  const [metaUserName, setMetaUserName] = useState<string | null>(null);
  const [businessManagerId, setBusinessManagerId] = useState<string | null>(null);

  // Verificar se já existe conexão Meta ativa
  useEffect(() => {
    checkExistingConnection();
  }, []);

  // Processa callback OAuth quando usuário retorna do fluxo de autorização
  useEffect(() => {
    const processOAuthReturn = async () => {
      try {
        // Verifica se há um código de autorização aguardando processamento
        const code = localStorage.getItem('meta_oauth_code');
        const platform = localStorage.getItem('meta_oauth_platform');
        const error = localStorage.getItem('meta_oauth_error');

        console.log('🔍 [Meta Connect] Verificando retorno do OAuth:', {
          hasCode: !!code,
          platform,
          hasError: !!error,
        });

        if (error) {
          console.error('❌ [Meta Connect] Erro no OAuth recebido:', error);

          // Mapeamento de erros comuns do Facebook
          let userFriendlyError = error;
          if (error.includes('redirect_uri')) {
            userFriendlyError = 'Erro de configuração: URL de redirecionamento não autorizada no Facebook. Verifique as configurações do App no Facebook Developer Console.';
          } else if (error.includes('access_denied')) {
            userFriendlyError = 'Autorização cancelada. Você precisa autorizar o aplicativo para continuar.';
          } else if (error.includes('invalid_scope')) {
            userFriendlyError = 'Erro de permissões: As permissões solicitadas não estão configuradas no App do Facebook.';
          }

          setError(userFriendlyError);
          setStatus('disconnected');
          setLoading(false);

          // Limpa localStorage
          localStorage.removeItem('meta_oauth_error');
          localStorage.removeItem('meta_oauth_flow');
          localStorage.removeItem('meta_oauth_state');
          return;
        }

        if (code && platform === 'meta') {
          console.log('✅ [Meta Connect] Código OAuth detectado, iniciando processamento...');
          setStatus('connecting');
          setLoading(true);
          setError(null);

          // Limpa localStorage
          localStorage.removeItem('meta_oauth_code');
          localStorage.removeItem('meta_oauth_platform');
          localStorage.removeItem('meta_oauth_flow');
          localStorage.removeItem('meta_oauth_state');

          // Processa o código
          await exchangeCodeForToken(code);
        }
      } catch (err: any) {
        console.error('❌ [Meta Connect] Erro ao processar retorno OAuth:', err);
        setError(err.message || 'Erro ao processar autorização');
        setStatus('disconnected');
        setLoading(false);
      }
    };

    processOAuthReturn();
  }, []);

  /**
   * Verifica se já existe uma conexão Meta ativa para este workspace
   * e carrega o Token System User salvo
   */
  const checkExistingConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca workspace do usuário
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!workspace) {
        console.log('⚠️ Nenhum workspace encontrado para o usuário');
        return;
      }

      setWorkspaceId(workspace.id);

      // Verifica se existe meta_connection para este workspace
      const { data: metaConnection } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (metaConnection && metaConnection.status === 'connected') {
        console.log('✅ Conexão Meta encontrada:', metaConnection);
        setConnectionData(metaConnection);
        setStatus('connected');
        setBusinessManagerId(metaConnection.business_manager_id);

        // Busca o Token System User salvo no banco
        // O token está em oauth_tokens vinculado ao user_id com platform='meta'
        const { data: tokenData } = await supabase
          .from('oauth_tokens')
          .select('system_user_token')
          .eq('user_id', user.id)
          .eq('platform', 'meta')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tokenData?.system_user_token) {
          setSystemUserToken(tokenData.system_user_token);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar conexão existente:', err);
    }
  };

  /**
   * Inicia o fluxo OAuth do Meta usando redirecionamento direto
   * Mais confiável que popup pois não é bloqueado pelos navegadores
   */
  const handleConnect = () => {
    console.log('🚀 [Meta Connect] ========================================');
    console.log('🚀 [Meta Connect] Iniciando processo de conexão OAuth');

    setLoading(true);
    setError(null);

    // Configurações do OAuth
    const clientId = import.meta.env.VITE_META_APP_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;
    const scope = 'ads_read,ads_management,business_management';
    const state = `meta_${Date.now()}`;

    // Validação de configuração
    console.log('🚀 [Meta Connect] Configurações OAuth:');
    console.log('  - Client ID:', clientId ? `${clientId.substring(0, 10)}...` : '❌ NÃO CONFIGURADO');
    console.log('  - Redirect URI:', redirectUri);
    console.log('  - Scope:', scope);
    console.log('  - State:', state);

    // Validação: Client ID obrigatório
    if (!clientId) {
      console.error('❌ [Meta Connect] VITE_META_APP_ID não está configurado no .env');
      setError('App ID do Meta não configurado. Verifique o arquivo .env');
      setLoading(false);
      return;
    }

    // Validação: Formato do Client ID
    if (!/^\d+$/.test(clientId)) {
      console.error('❌ [Meta Connect] VITE_META_APP_ID tem formato inválido:', clientId);
      setError('App ID do Meta está no formato incorreto. Deve conter apenas números.');
      setLoading(false);
      return;
    }

    // Salva estado no localStorage para retomar após o callback
    localStorage.setItem('meta_oauth_state', state);
    localStorage.setItem('meta_oauth_flow', 'connecting');

    // Constrói URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

    console.log('🚀 [Meta Connect] Redirecionando para autorização...');

    try {
      window.location.href = authUrl;
      console.log('✅ [Meta Connect] Redirecionamento iniciado');
    } catch (err: any) {
      console.error('❌ [Meta Connect] Erro ao tentar redirecionar:', err);
      setError(`Erro ao iniciar autorização: ${err.message}`);
      setLoading(false);
      localStorage.removeItem('meta_oauth_flow');
    }
  };

  /**
   * Troca o código de autorização por um access token
   */
  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log('🔄 [Exchange Token] Iniciando troca de código por token');

      const clientId = import.meta.env.VITE_META_APP_ID;
      const clientSecret = import.meta.env.VITE_META_APP_SECRET;
      const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

      if (!clientId || !clientSecret) {
        throw new Error('Client ID ou Client Secret não configurados no .env');
      }

      console.log('🔄 [Exchange Token] Fazendo requisição para Graph API...');

      const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const data = await response.json();

      if (data.error) {
        console.error('❌ [Exchange Token] Erro na resposta do Facebook:', data.error);
        throw new Error(data.error.message || 'Erro ao obter token');
      }

      if (!data.access_token) {
        console.error('❌ [Exchange Token] Token não recebido');
        throw new Error('Token de acesso não recebido');
      }

      console.log('✅ [Exchange Token] Token obtido com sucesso!');

      // Busca informações do usuário Meta e contas
      await fetchMetaUserInfoAndAccounts(data.access_token);
    } catch (err: any) {
      console.error('❌ [Exchange Token] Erro:', err);
      setError(err.message || 'Erro ao obter token de acesso');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Busca informações do usuário Meta, Business Manager e contas de anúncios
   */
  const fetchMetaUserInfoAndAccounts = async (accessToken: string) => {
    try {
      console.log('📋 [Fetch Info] Buscando informações do usuário Meta');

      // 1. Busca info do usuário
      const userResponse = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
      const userData = await userResponse.json();

      if (userData.error) throw new Error(userData.error.message);

      console.log('✅ Usuário Meta:', userData.name, userData.id);
      setMetaUserId(userData.id);
      setMetaUserName(userData.name);

      // 2. Busca Business Managers do usuário
      const businessesResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/businesses?access_token=${accessToken}`
      );
      const businessesData = await businessesResponse.json();

      let businessId = null;
      if (businessesData.data && businessesData.data.length > 0) {
        businessId = businessesData.data[0].id;
        console.log('✅ Business Manager:', businessesData.data[0].name, businessId);
        setBusinessManagerId(businessId);
      }

      // 3. Busca contas de anúncios
      console.log('📋 [Fetch Accounts] Buscando contas de anúncios');
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name&access_token=${accessToken}`
      );
      const accountsData = await accountsResponse.json();

      if (accountsData.error) throw new Error(accountsData.error.message);

      const accountsList = accountsData.data || [];
      console.log('✅ Contas encontradas:', accountsList.length);

      if (accountsList.length === 0) {
        setError('Nenhuma conta de anúncios encontrada. Verifique se sua conta Meta tem acesso a contas de anúncios.');
        setStatus('disconnected');
        setLoading(false);
        return;
      }

      // Salva token temporariamente para uso posterior
      sessionStorage.setItem('meta_temp_token', accessToken);
      sessionStorage.setItem('meta_temp_business_id', businessId || '');

      setAccounts(accountsList);
      setStatus('selecting');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ [Fetch Info] Erro:', err);
      setError(err.message || 'Erro ao buscar informações do Meta');
      setStatus('disconnected');
      setLoading(false);
    }
  };

  /**
   * Finaliza a conexão salvando as contas selecionadas no banco
   * Salva em: meta_connections, meta_ad_accounts e oauth_tokens
   */
  const handleFinishSetup = async () => {
    if (selectedAccountsIds.length === 0) {
      setError('Selecione pelo menos uma conta de anúncios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const accessToken = sessionStorage.getItem('meta_temp_token');
      if (!accessToken) throw new Error('Token não encontrado');

      const businessId = sessionStorage.getItem('meta_temp_business_id') || businessManagerId;

      // Busca ou cria workspace
      let workspace = workspaceId;
      if (!workspace) {
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (workspaceData) {
          workspace = workspaceData.id;
        } else {
          // Cria workspace
          const { data: newWorkspace, error: workspaceError } = await supabase
            .from('workspaces')
            .insert({
              name: `${user.email}'s Workspace`,
              owner_id: user.id,
            })
            .select()
            .single();

          if (workspaceError) throw workspaceError;
          workspace = newWorkspace.id;
        }
        setWorkspaceId(workspace);
      }

      console.log('🔧 Salvando conexão Meta no workspace:', workspace);

      // 1. Cria ou atualiza meta_connection
      const { data: existingConnection } = await supabase
        .from('meta_connections')
        .select('id')
        .eq('workspace_id', workspace)
        .maybeSingle();

      let connectionId: string;

      if (existingConnection) {
        // Atualiza conexão existente
        const { data: updatedConnection, error: updateError } = await supabase
          .from('meta_connections')
          .update({
            status: 'connected',
            business_manager_id: businessId,
            granted_scopes: ['ads_read', 'ads_management', 'business_management'],
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id)
          .select()
          .single();

        if (updateError) throw updateError;
        connectionId = updatedConnection.id;
      } else {
        // Cria nova conexão
        const { data: newConnection, error: insertError } = await supabase
          .from('meta_connections')
          .insert({
            workspace_id: workspace,
            status: 'connected',
            business_manager_id: businessId,
            granted_scopes: ['ads_read', 'ads_management', 'business_management'],
            last_validated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        connectionId = newConnection.id;
      }

      console.log('✅ Meta Connection criada/atualizada:', connectionId);

      // 2. Salva contas de anúncios selecionadas em meta_ad_accounts
      for (const accountId of selectedAccountsIds) {
        const account = accounts.find(acc => acc.id === accountId);
        if (!account) continue;

        // Verifica se a conta já existe
        const { data: existingAccount } = await supabase
          .from('meta_ad_accounts')
          .select('id')
          .eq('workspace_id', workspace)
          .eq('meta_ad_account_id', account.id)
          .maybeSingle();

        if (!existingAccount) {
          // Insere nova conta
          const { error: accountError } = await supabase
            .from('meta_ad_accounts')
            .insert({
              workspace_id: workspace,
              meta_ad_account_id: account.id,
              name: account.name,
              currency: account.currency,
              timezone_name: account.timezone_name || 'UTC',
              account_status: account.account_status,
              primary_connection_id: connectionId,
            });

          if (accountError) {
            console.error('❌ Erro ao salvar conta:', account.name, accountError);
          } else {
            console.log('✅ Conta salva:', account.name);
          }
        } else {
          console.log('ℹ️ Conta já existe:', account.name);
        }
      }

      // 3. Salva ou atualiza oauth_tokens
      const { data: existingToken } = await supabase
        .from('oauth_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'meta')
        .maybeSingle();

      if (existingToken) {
        // Atualiza token existente
        const { error: tokenError } = await supabase
          .from('oauth_tokens')
          .update({
            access_token: accessToken,
            system_user_token: systemUserToken.trim() || null,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
            last_refreshed_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (tokenError) throw tokenError;
      } else {
        // Cria novo token
        const { error: tokenError } = await supabase
          .from('oauth_tokens')
          .insert({
            user_id: user.id,
            connection_id: connectionId,
            platform: 'meta',
            access_token: accessToken,
            system_user_token: systemUserToken.trim() || null,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
          });

        if (tokenError) throw tokenError;
      }

      console.log('✅ Token OAuth salvo');

      // Limpa tokens temporários
      sessionStorage.removeItem('meta_temp_token');
      sessionStorage.removeItem('meta_temp_business_id');

      // Atualiza estado
      setConnectionData({ id: connectionId, workspace_id: workspace, status: 'connected' });
      setStatus('connected');
      setLoading(false);

      alert(`✅ Conexão Meta configurada com sucesso!\n\n${selectedAccountsIds.length} conta(s) vinculada(s) ao workspace.`);

      // Recarrega a conexão
      await checkExistingConnection();

      // Chama callback de sucesso se fornecido
      if (onConnectionSuccess) {
        const connectedAccounts = selectedAccountsIds.map(accountId => {
          const account = accounts.find(acc => acc.id === accountId);
          return {
            id: accountId,
            name: account?.name || 'Unknown Account',
          };
        });
        onConnectionSuccess(connectedAccounts);
      }
    } catch (err: any) {
      console.error('❌ Erro ao salvar conexão:', err);
      setError(err.message || 'Erro ao conectar');
      setLoading(false);
    }
  };

  /**
   * Salva ou atualiza o Token System User no banco de dados
   */
  const handleSaveSystemUserToken = async () => {
    if (!connectionData) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('oauth_tokens')
        .update({ system_user_token: systemUserToken.trim() || null })
        .eq('user_id', user.id)
        .eq('platform', 'meta');

      if (error) throw error;

      alert('✅ Token System User salvo com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar Token System User:', err);
      setError(err.message || 'Erro ao salvar token');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desconecta a conta Meta
   */
  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta Meta?\n\nIsso removerá todas as contas de anúncios vinculadas.')) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (workspaceId) {
        // Remove meta_connections (isso removerá em cascata as contas)
        await supabase
          .from('meta_connections')
          .delete()
          .eq('workspace_id', workspaceId);

        // Remove oauth_tokens
        await supabase
          .from('oauth_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'meta');
      }

      setConnectionData(null);
      setStatus('disconnected');
      setAccounts([]);
      setSelectedAccountsIds([]);
      setSystemUserToken('');
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle seleção de conta
   */
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountsIds(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  /**
   * Renderiza o estado atual da conexão
   */

  // Se hideIfConnected é true e já está conectado, não renderiza nada
  if (hideIfConnected && status === 'connected') {
    return null;
  }

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

      {/* Exibição de erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Erro</h4>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
          <p className="text-gray-600">Processando autorização...</p>
        </div>
      )}

      {/* Estado: Selecionando contas */}
      {status === 'selecting' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Selecione as contas de anúncios</h4>

          {/* Campo para Token System User (opcional) */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token System User (opcional)
            </label>
            <input
              type="text"
              value={systemUserToken}
              onChange={(e) => setSystemUserToken(e.target.value)}
              placeholder="Cole aqui o Token System User do Meta"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-gray-600 mt-2">
              💡 Token de longa duração para sincronização avançada (pode ser adicionado depois)
            </p>
          </div>

          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => toggleAccountSelection(account.id)}
                disabled={loading}
                className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                  selectedAccountsIds.includes(account.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAccountsIds.includes(account.id)}
                    readOnly
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-600">
                      ID: {account.account_id} • {account.currency} • {account.account_status}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleFinishSetup}
              disabled={loading || selectedAccountsIds.length === 0}
              loading={loading}
            >
              Conectar {selectedAccountsIds.length > 0 && `(${selectedAccountsIds.length})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus('disconnected');
                setAccounts([]);
                setSelectedAccountsIds([]);
                sessionStorage.removeItem('meta_temp_token');
                sessionStorage.removeItem('meta_temp_business_id');

                // Chama callback de cancelamento se fornecido
                if (onCancel) {
                  onCancel();
                }
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Estado: Conectado */}
      {status === 'connected' && connectionData && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <strong>Conexão Meta ativa</strong>
            </p>
            {businessManagerId && (
              <p className="text-xs text-green-600 mt-1">
                Business Manager ID: {businessManagerId}
              </p>
            )}
          </div>

          {/* Campo para Token System User - visível mesmo após conectado */}
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token System User
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={systemUserToken}
                onChange={(e) => setSystemUserToken(e.target.value)}
                placeholder="Cole aqui o Token System User do Meta"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSystemUserToken}
                disabled={loading || !systemUserToken.trim()}
              >
                Salvar
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {systemUserToken ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Token configurado
                </span>
              ) : (
                '💡 Token de longa duração para sincronização avançada (opcional)'
              )}
            </p>
          </div>

          <div className="flex space-x-2">
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
    </Card>
  );
};
