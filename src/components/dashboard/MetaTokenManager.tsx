import React, { useState } from 'react';
import { Key, Check, AlertCircle, Loader, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { MetaTokenValidator, MetaAdAccountInfo } from '../../lib/services/MetaTokenValidator';
import { supabase } from '../../lib/supabase';
import { encryptData } from '../../lib/utils/encryption';
import { logger } from '../../lib/utils/logger';

/**
 * Componente para gerenciar tokens de acesso da Meta Ads
 * Permite inserir, validar e salvar tokens manualmente
 */
export const MetaTokenManager: React.FC = () => {
  // Estados do componente
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    accounts?: MetaAdAccountInfo[];
  } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Instância do validador
  const validator = new MetaTokenValidator();

  /**
   * Valida o token inserido pelo usuário
   */
  const handleValidateToken = async () => {
    if (!accessToken.trim()) {
      setValidationResult({
        success: false,
        message: 'Por favor, insira um access token',
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      logger.info('Starting token validation...');

      // Testa a conexão completa
      const result = await validator.testConnection(accessToken.trim());

      if (result.success && result.accounts) {
        setValidationResult({
          success: true,
          message: `Token válido! Encontradas ${result.accounts.length} conta(s) publicitária(s).`,
          accounts: result.accounts,
        });

        // Se houver apenas uma conta, seleciona automaticamente
        if (result.accounts.length === 1) {
          setSelectedAccountId(result.accounts[0].id);
        }

        logger.info('Token validation successful', {
          accountsCount: result.accounts.length,
        });
      } else {
        setValidationResult({
          success: false,
          message: result.error || 'Erro ao validar token',
        });

        logger.warn('Token validation failed', { error: result.error });
      }
    } catch (error: any) {
      setValidationResult({
        success: false,
        message: error.message || 'Erro ao validar token',
      });

      logger.error('Token validation error', error);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Salva o token validado no banco de dados
   */
  const handleSaveToken = async () => {
    if (!selectedAccountId) {
      alert('Por favor, selecione uma conta publicitária');
      return;
    }

    const selectedAccount = validationResult?.accounts?.find(
      acc => acc.id === selectedAccountId
    );

    if (!selectedAccount) {
      alert('Conta selecionada não encontrada');
      return;
    }

    setIsSaving(true);

    try {
      // Busca o usuário autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error('Usuário não autenticado');
      }

      logger.info('Saving Meta token to database...', {
        accountId: selectedAccount.accountId,
      });

      // Criptografa o token antes de salvar
      const encryptedToken = encryptData(accessToken.trim());

      // Insere ou atualiza o token no banco
      const { error: insertError } = await supabase
        .from('oauth_tokens')
        .upsert({
          user_id: userData.user.id,
          platform: 'meta',
          access_token: encryptedToken,
          account_id: selectedAccount.id,
          account_name: selectedAccount.name,
          is_active: true,
          last_used_at: new Date().toISOString(),
          expires_at: null, // Meta tokens de longa duração não expiram
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,account_id',
        });

      if (insertError) {
        throw insertError;
      }

      logger.info('Meta token saved successfully');

      // Limpa o formulário
      setAccessToken('');
      setValidationResult(null);
      setSelectedAccountId('');

      alert('✅ Token salvo com sucesso! Você já pode sincronizar seus dados da Meta Ads.');
    } catch (error: any) {
      logger.error('Failed to save Meta token', error);
      alert(`Erro ao salvar token: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Conectar Meta Ads
            </h3>
            <p className="text-sm text-gray-600">
              Insira seu Access Token da Meta para conectar suas contas publicitárias
            </p>
          </div>
        </div>

        {/* Campo de Token */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Access Token da Meta
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Cole aqui seu access token..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isValidating || isSaving}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Obtenha seu token em:{' '}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Facebook Graph API Explorer
            </a>
          </p>
        </div>

        {/* Botão Validar */}
        <Button
          onClick={handleValidateToken}
          disabled={!accessToken.trim() || isValidating || isSaving}
          className="w-full"
        >
          {isValidating ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Validando token...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Validar Token
            </>
          )}
        </Button>

        {/* Resultado da Validação */}
        {validationResult && (
          <Alert
            variant={validationResult.success ? 'success' : 'error'}
            icon={validationResult.success ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          >
            {validationResult.message}
          </Alert>
        )}

        {/* Lista de Contas Encontradas */}
        {validationResult?.success && validationResult.accounts && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a conta publicitária:
              </label>
              <div className="space-y-2">
                {validationResult.accounts.map((account) => (
                  <label
                    key={account.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAccountId === account.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="account"
                      value={account.id}
                      checked={selectedAccountId === account.id}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-600">
                        ID: {account.accountId} • {account.currency} • {account.timezoneName}
                      </p>
                      {account.accountStatus === 1 && (
                        <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                          <Check className="w-3 h-3 mr-1" />
                          Ativa
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Botão Salvar */}
            <Button
              onClick={handleSaveToken}
              disabled={!selectedAccountId || isSaving}
              variant="primary"
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Conexão
                </>
              )}
            </Button>
          </div>
        )}

        {/* Instruções */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Como obter seu Access Token:
          </h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Acesse o Facebook Graph API Explorer</li>
            <li>Selecione seu App da Meta</li>
            <li>Adicione as permissões: ads_read, ads_management</li>
            <li>Clique em "Generate Access Token"</li>
            <li>Copie o token gerado e cole acima</li>
          </ol>
        </div>
      </div>
    </Card>
  );
};
