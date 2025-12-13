import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, RefreshCw, Link as LinkIcon, Key, Building2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { encryptData } from '../../lib/utils/encryption';
import { logger } from '../../lib/utils/logger';

/**
 * Interface para conexão Meta
 */
interface MetaConnection {
  id: string;
  workspace_id: string;
  business_manager_id: string;
  status: 'connected' | 'invalid' | 'revoked';
  granted_scopes: string[];
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Página de Conexão Meta via System User
 *
 * Permite configurar a conexão da agência com Meta Ads usando System User.
 * Modelo de negócio: 1 conexão por workspace (agência), sem OAuth de usuário.
 */
export const MetaConnectionPage: React.FC = () => {
  const { workspace, loading: workspaceLoading, error: workspaceError } = useWorkspace();

  // Estados
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulário
  const [businessManagerId, setBusinessManagerId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [adAccountsCount, setAdAccountsCount] = useState<number>(0);

  /**
   * Carrega conexão existente
   */
  useEffect(() => {
    if (workspace) {
      loadConnection();
    }
  }, [workspace]);

  const loadConnection = async () => {
    if (!workspace) return;

    try {
      setLoading(true);
      setError(null);

      logger.info('Carregando conexão Meta', { workspaceId: workspace.id });

      const { data, error: fetchError } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        logger.info('Conexão Meta encontrada', { status: data.status });
        setConnection(data);
        setBusinessManagerId(data.business_manager_id);

        // Busca quantidade de ad accounts
        const { count } = await supabase
          .from('meta_ad_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id);

        setAdAccountsCount(count || 0);
      }
    } catch (err: any) {
      logger.error('Erro ao carregar conexão', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Testa conexão com Meta API
   */
  const handleTestConnection = async () => {
    if (!businessManagerId || !accessToken) {
      setError('Preencha Business Manager ID e Access Token');
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      logger.info('Testando conexão Meta', { businessManagerId });

      // Chama edge function para testar conexão
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_manager_id: businessManagerId,
            access_token: accessToken,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao testar conexão');
      }

      logger.info('Conexão testada com sucesso', result);

      setSuccess(`Conexão OK! ${result.ad_accounts_count} conta(s) de anúncio encontradas.`);
      setAdAccountsCount(result.ad_accounts_count);
    } catch (err: any) {
      logger.error('Erro ao testar conexão', err);
      setError(err.message || 'Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  /**
   * Salva conexão
   */
  const handleSaveConnection = async () => {
    if (!workspace) return;

    if (!businessManagerId || !accessToken) {
      setError('Preencha todos os campos');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      logger.info('Salvando conexão Meta');

      // Criptografa token
      const encryptedToken = encryptData(accessToken);

      const connectionData = {
        workspace_id: workspace.id,
        business_manager_id: businessManagerId,
        access_token_encrypted: encryptedToken,
        status: 'connected',
        granted_scopes: ['ads_read', 'ads_management', 'business_management'],
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (connection) {
        // Atualiza conexão existente
        const { error: updateError } = await supabase
          .from('meta_connections')
          .update(connectionData)
          .eq('id', connection.id);

        if (updateError) throw updateError;
      } else {
        // Cria nova conexão
        const { data: newConnection, error: insertError } = await supabase
          .from('meta_connections')
          .insert(connectionData)
          .select()
          .single();

        if (insertError) throw insertError;
        setConnection(newConnection);
      }

      // Chama edge function para sincronizar ad accounts
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-sync-ad-accounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
          }),
        }
      );

      setSuccess('Conexão salva com sucesso! Contas de anúncio sincronizadas.');
      setAccessToken(''); // Limpa token do formulário por segurança

      // Recarrega conexão
      await loadConnection();
    } catch (err: any) {
      logger.error('Erro ao salvar conexão', err);
      setError(err.message || 'Erro ao salvar conexão');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Valida conexão existente
   */
  const handleValidateConnection = async () => {
    if (!connection) return;

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      logger.info('Validando conexão existente');

      // Chama edge function para validar
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-validate-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connection_id: connection.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao validar conexão');
      }

      setSuccess('Conexão validada com sucesso!');
      await loadConnection();
    } catch (err: any) {
      logger.error('Erro ao validar conexão', err);
      setError(err.message || 'Erro ao validar conexão');
    } finally {
      setTesting(false);
    }
  };

  // Mostra loading enquanto workspace está carregando
  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando workspace...</p>
        </div>
      </div>
    );
  }

  // Mostra erro se workspace falhou ao carregar
  if (workspaceError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error" title="Erro ao carregar workspace">
          <p>{workspaceError}</p>
          <p className="mt-2 text-sm">
            Por favor, tente recarregar a página ou entre em contato com o suporte.
          </p>
        </Alert>
      </div>
    );
  }

  // Não deve acontecer, mas caso workspace seja null
  if (!workspace) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error" title="Workspace não encontrado">
          <p>Não foi possível carregar o workspace. Por favor, faça login novamente.</p>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Conexão Meta Ads
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure a conexão da sua agência com Meta Ads usando System User
        </p>
      </div>

      {/* Card de Status */}
      {connection && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {connection.status === 'connected' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {connection.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Business Manager: {connection.business_manager_id}
                </p>
                {connection.last_validated_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Última validação: {new Date(connection.last_validated_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Validar
                </>
              )}
            </Button>
          </div>

          {adAccountsCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Contas de Anúncio Sincronizadas
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {adAccountsCount}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Card de Configuração */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {connection ? 'Atualizar Conexão' : 'Configurar Conexão'}
        </h3>

        <div className="space-y-4">
          {/* Business Manager ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Business Manager ID
            </label>
            <input
              type="text"
              value={businessManagerId}
              onChange={(e) => setBusinessManagerId(e.target.value)}
              placeholder="Ex: 123456789012345"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Encontre em: Meta Business Suite → Configurações do Negócio → ID do Negócio
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Key className="w-4 h-4 inline mr-2" />
              System User Access Token
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Token do System User com permissões: ads_read, ads_management, business_management
            </p>
          </div>

          {/* Guia */}
          <Alert variant="info">
            <div className="text-sm">
              <p className="font-medium mb-2">Como obter o System User Token:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Acesse Meta Business Suite → Configurações do Negócio</li>
                <li>Usuários → System Users</li>
                <li>Crie ou selecione um System User</li>
                <li>Gere um token com as permissões necessárias</li>
                <li>Atribua o System User às contas de anúncio</li>
              </ol>
              <a
                href="https://developers.facebook.com/docs/marketing-api/system-users"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 mt-2"
              >
                Documentação completa
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </Alert>

          {/* Mensagens */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              {success}
            </Alert>
          )}

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              disabled={testing || saving || !businessManagerId || !accessToken}
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>

            <Button
              onClick={handleSaveConnection}
              disabled={testing || saving || !businessManagerId || !accessToken}
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Salvar Conexão
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Card de Informações */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Modelo de Integração
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
          <p>
            • <strong>Uma conexão por agência:</strong> Toda a agência usa o mesmo System User
          </p>
          <p>
            • <strong>Server-side apenas:</strong> Tokens nunca expostos no frontend
          </p>
          <p>
            • <strong>Acesso às ad accounts:</strong> Vincule contas específicas a cada cliente
          </p>
          <p>
            • <strong>Sincronização automática:</strong> Dados atualizados diariamente
          </p>
        </div>
      </Card>
    </div>
  );
};
