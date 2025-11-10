import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Eye, EyeOff, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { supabase } from '../../lib/supabase';
import { MetaAdsService } from '../../lib/connectors/meta/MetaAdsService';
import { encryptData } from '../../lib/utils/encryption';
import { logger } from '../../lib/utils/logger';

interface MetaAdsSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type SetupStep = 'credentials' | 'accounts' | 'campaigns' | 'complete';

interface MetaCredentials {
  appId: string;
  appSecret: string;
  accessToken: string;
}

/**
 * Componente de configuração simplificada para Meta Ads
 *
 * Permite ao usuário configurar conexão com Meta Ads de forma fácil
 * através de credenciais diretas (App ID, Secret, Access Token)
 *
 * Fluxo:
 * 1. Inserir credenciais e validar
 * 2. Listar e selecionar contas de anúncios
 * 3. Visualizar campanhas das contas selecionadas
 * 4. Concluir configuração e iniciar sincronização
 */
export const MetaAdsSetup: React.FC<MetaAdsSetupProps> = ({ onSuccess, onCancel }) => {
  // Estados para controle do fluxo
  const [currentStep, setCurrentStep] = useState<SetupStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para credenciais
  const [credentials, setCredentials] = useState<MetaCredentials>({
    appId: '',
    appSecret: '',
    accessToken: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  // Estados para contas Meta
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [searchAccount, setSearchAccount] = useState('');

  // Estados para campanhas
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  /**
   * Valida as credenciais inseridas testando conexão com a API Meta
   */
  const handleValidateCredentials = async () => {
    setValidating(true);
    setError('');

    try {
      // Validação básica de formato
      if (!credentials.appId || !credentials.appSecret || !credentials.accessToken) {
        throw new Error('Todos os campos são obrigatórios');
      }

      if (credentials.appId.length < 10) {
        throw new Error('App ID inválido. Deve ter pelo menos 10 caracteres.');
      }

      if (credentials.accessToken.length < 50) {
        throw new Error('Access Token inválido. Token muito curto.');
      }

      // Testa conexão real com a API
      logger.info('Validando credenciais Meta', { appId: credentials.appId });

      const testUrl = `https://graph.facebook.com/v19.0/me?access_token=${credentials.accessToken}`;
      const response = await fetch(testUrl);
      const data = await response.json();

      if (data.error) {
        throw new Error(`Erro na validação: ${data.error.message}`);
      }

      logger.info('Credenciais validadas com sucesso', { userId: data.id, name: data.name });

      setValidated(true);
      setSuccess('Credenciais validadas com sucesso!');

      // Avança para próximo passo após 1 segundo
      setTimeout(() => {
        handleFetchAccounts();
      }, 1000);

    } catch (err: any) {
      logger.error('Erro na validação de credenciais', err);
      setError(err.message || 'Erro ao validar credenciais');
      setValidated(false);
    } finally {
      setValidating(false);
    }
  };

  /**
   * Busca todas as contas de anúncios disponíveis para o token
   */
  const handleFetchAccounts = async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Buscando contas Meta');

      const metaService = new MetaAdsService();
      const accountsList = await metaService.getAdAccounts(credentials.accessToken);

      logger.info('Contas encontradas', { count: accountsList.length });

      setAccounts(accountsList);
      setCurrentStep('accounts');
      setSuccess(`${accountsList.length} conta(s) encontrada(s)!`);

    } catch (err: any) {
      logger.error('Erro ao buscar contas', err);
      setError(err.message || 'Erro ao buscar contas de anúncios');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva as credenciais e contas selecionadas no banco de dados
   */
  const handleSaveConnection = async () => {
    if (selectedAccounts.size === 0) {
      setError('Selecione pelo menos uma conta de anúncios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      logger.info('Salvando configuração Meta', {
        accountsCount: selectedAccounts.size
      });

      // Para cada conta selecionada, cria uma conexão
      for (const accountId of Array.from(selectedAccounts)) {
        const account = accounts.find(a => a.id === accountId);
        if (!account) continue;

        // 1. Criar registro na tabela data_connections
        const { data: connection, error: connectionError } = await supabase
          .from('data_connections')
          .insert({
            user_id: user.id,
            platform: 'meta',
            status: 'connected',
            config: {
              accountId: account.id,
              accountName: account.name,
              currency: account.currency,
            },
            account_label: account.name,
            last_sync: new Date().toISOString(),
          })
          .select()
          .single();

        if (connectionError) throw connectionError;

        // 2. Salvar token OAuth criptografado
        const encryptedToken = encryptData(credentials.accessToken);

        const { error: tokenError } = await supabase
          .from('oauth_tokens')
          .insert({
            user_id: user.id,
            connection_id: connection.id,
            platform: 'meta',
            access_token: encryptedToken,
            token_type: 'user_token',
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
            is_active: true,
          });

        if (tokenError) throw tokenError;

        // 3. Criar registro na tabela meta_accounts
        const { error: metaAccountError } = await supabase
          .from('meta_accounts')
          .insert({
            user_id: user.id,
            connection_id: connection.id,
            account_id: account.accountId,
            account_name: account.name,
            account_type: 'PERSONAL',
            account_status: account.accountStatus.toString(),
            currency: account.currency,
            is_primary: selectedAccounts.size === 1, // Marca como primary se for única
          });

        if (metaAccountError) throw metaAccountError;

        logger.info('Conta Meta configurada', { accountId: account.id });
      }

      setSuccess('Configuração salva com sucesso!');
      setCurrentStep('complete');

      // Dispara evento de sincronização completa
      window.dispatchEvent(new CustomEvent('syncCompleted', {
        detail: { platform: 'meta', accountsCount: selectedAccounts.size }
      }));

      // Chama callback de sucesso após 2 segundos
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (err: any) {
      logger.error('Erro ao salvar configuração', err);
      setError(err.message || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Alterna seleção de uma conta
   */
  const toggleAccountSelection = (accountId: string) => {
    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccounts(newSelection);
  };

  /**
   * Filtra contas baseado na busca
   */
  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchAccount.toLowerCase()) ||
    account.accountId.includes(searchAccount)
  );

  /**
   * Renderiza o status da conta
   */
  const getAccountStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Ativa</span>;
      case 2:
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Desabilitada</span>;
      case 3:
        return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Não Verificada</span>;
      default:
        return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">Desconhecida</span>;
    }
  };

  // Renderiza passo 1: Credenciais
  const renderCredentialsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Conectar Meta Ads
        </h2>
        <p className="text-gray-600">
          Insira suas credenciais do Meta for Developers para conectar suas contas de anúncios.
        </p>
      </div>

      {/* App ID */}
      <div>
        <label htmlFor="appId" className="block text-sm font-medium text-gray-700 mb-2">
          App ID
        </label>
        <input
          id="appId"
          type="text"
          value={credentials.appId}
          onChange={(e) => setCredentials({ ...credentials, appId: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="123456789012345"
          disabled={validated}
        />
        <p className="mt-1 text-xs text-gray-500">
          Encontre em: Meta for Developers → Settings → Basic → App ID
        </p>
      </div>

      {/* App Secret */}
      <div>
        <label htmlFor="appSecret" className="block text-sm font-medium text-gray-700 mb-2">
          App Secret
        </label>
        <div className="relative">
          <input
            id="appSecret"
            type={showSecret ? 'text' : 'password'}
            value={credentials.appSecret}
            onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••••••••••••••"
            disabled={validated}
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Encontre em: Meta for Developers → Settings → Basic → App Secret
        </p>
      </div>

      {/* Access Token */}
      <div>
        <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
          Access Token
        </label>
        <div className="relative">
          <textarea
            id="accessToken"
            value={credentials.accessToken}
            onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            rows={3}
            placeholder="EAAXXXXXXXXXXXxXXXXXXXXXXXXXXXXXXXX..."
            disabled={validated}
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Gere em: Meta for Developers → Tools → Graph API Explorer → Generate Access Token
        </p>
      </div>

      {/* Mensagens de erro e sucesso */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {success && validated && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <span>{success}</span>
        </Alert>
      )}

      {/* Botões de ação */}
      <div className="flex space-x-3">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={validating || loading}
          >
            Cancelar
          </Button>
        )}
        <Button
          onClick={handleValidateCredentials}
          disabled={validating || validated || !credentials.appId || !credentials.appSecret || !credentials.accessToken}
          className="flex-1"
        >
          {validating ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Validando...
            </>
          ) : validated ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Validado
            </>
          ) : (
            <>
              Validar Credenciais
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Renderiza passo 2: Seleção de contas
  const renderAccountsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Selecione as Contas de Anúncios
        </h2>
        <p className="text-gray-600">
          Escolha quais contas de anúncios você deseja conectar.
        </p>
      </div>

      {/* Campo de busca */}
      <div>
        <input
          type="text"
          value={searchAccount}
          onChange={(e) => setSearchAccount(e.target.value)}
          placeholder="Buscar por nome ou ID..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Lista de contas */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAccounts.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            Nenhuma conta encontrada
          </Card>
        ) : (
          filteredAccounts.map((account) => (
            <Card
              key={account.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedAccounts.has(account.id)
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => toggleAccountSelection(account.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedAccounts.has(account.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedAccounts.has(account.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{account.name}</h3>
                    {getAccountStatusBadge(account.accountStatus)}
                  </div>
                  <div className="ml-8 space-y-1 text-sm text-gray-600">
                    <p>ID: {account.accountId}</p>
                    <p>Moeda: {account.currency}</p>
                    <p>Fuso Horário: {account.timezone}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Mensagens */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <span>{success}</span>
        </Alert>
      )}

      {/* Resumo de seleção */}
      {selectedAccounts.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>{selectedAccounts.size}</strong> conta(s) selecionada(s)
          </p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex space-x-3">
        <Button
          variant="secondary"
          onClick={() => setCurrentStep('credentials')}
          disabled={loading}
        >
          Voltar
        </Button>
        <Button
          onClick={handleSaveConnection}
          disabled={loading || selectedAccounts.size === 0}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Salvando...
            </>
          ) : (
            <>
              Conectar {selectedAccounts.size} Conta(s)
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Renderiza passo 3: Conclusão
  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <Check className="h-8 w-8 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuração Concluída!
        </h2>
        <p className="text-gray-600">
          Suas contas Meta Ads foram conectadas com sucesso.
          <br />
          A sincronização inicial será iniciada automaticamente.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <RefreshCw className="inline h-4 w-4 mr-1" />
          Sincronizando dados das campanhas...
        </p>
      </div>
    </div>
  );

  return (
    <Card className="max-w-2xl mx-auto p-6">
      {currentStep === 'credentials' && renderCredentialsStep()}
      {currentStep === 'accounts' && renderAccountsStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </Card>
  );
};
