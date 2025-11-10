import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  Plus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { MetaSyncService } from '../../lib/services/MetaSyncService';
import { logger } from '../../lib/utils/logger';
import { decryptData } from '../../lib/utils/encryption';
import { MetaCampaignDetails } from './MetaCampaignDetails';

interface MetaConnection {
  id: string;
  accountId: string;
  accountName: string;
  status: string;
  lastSync: string;
  currency: string;
  totalCampaigns: number;
  activeCampaigns: number;
}

interface MetaConnectionsManagerProps {
  onAddNew?: () => void;
}

/**
 * Componente de gerenciamento de conexões Meta Ads
 *
 * Permite visualizar, sincronizar e gerenciar todas as contas Meta conectadas
 *
 * Funcionalidades:
 * - Listar todas as contas conectadas
 * - Sincronizar dados manualmente
 * - Visualizar campanhas de cada conta
 * - Remover conexões
 * - Ver histórico de sincronizações
 */
export const MetaConnectionsManager: React.FC<MetaConnectionsManagerProps> = ({ onAddNew }) => {
  // Estados para dados
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Estados para visualização de campanhas
  const [selectedAccount, setSelectedAccount] = useState<MetaConnection | null>(null);
  const [showCampaigns, setShowCampaigns] = useState(false);

  /**
   * Carrega todas as conexões Meta do usuário
   */
  useEffect(() => {
    loadConnections();
  }, []);

  /**
   * Busca conexões do banco de dados
   */
  const loadConnections = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      logger.info('Carregando conexões Meta do usuário');

      // Busca conexões Meta
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'meta')
        .order('created_at', { ascending: false });

      if (connectionsError) throw connectionsError;

      // Para cada conexão, busca informações adicionais da tabela meta_accounts
      const enrichedConnections: MetaConnection[] = [];

      for (const conn of connectionsData || []) {
        const { data: metaAccount } = await supabase
          .from('meta_accounts')
          .select('*')
          .eq('connection_id', conn.id)
          .maybeSingle();

        // Conta campanhas
        const { count: totalCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id);

        const { count: activeCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id)
          .eq('status', 'ACTIVE');

        enrichedConnections.push({
          id: conn.id,
          accountId: conn.config?.accountId || metaAccount?.account_id || '',
          accountName: conn.account_label || metaAccount?.account_name || 'Conta Meta',
          status: conn.status,
          lastSync: conn.last_sync,
          currency: conn.config?.currency || metaAccount?.currency || 'BRL',
          totalCampaigns: totalCampaigns || 0,
          activeCampaigns: activeCampaigns || 0,
        });
      }

      logger.info('Conexões carregadas', { count: enrichedConnections.length });
      setConnections(enrichedConnections);

    } catch (err: any) {
      logger.error('Erro ao carregar conexões', err);
      setError(err.message || 'Erro ao carregar conexões');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza dados de uma conexão manualmente
   */
  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    setError('');

    try {
      logger.info('Iniciando sincronização manual', { connectionId });

      // Busca token OAuth
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('connection_id', connectionId)
        .maybeSingle();

      if (!tokenData?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Descriptografa o token antes de usar
      let accessToken: string;

      // Verifica se o token parece estar criptografado (tokens Meta começam com EAA)
      const looksEncrypted = !tokenData.access_token.startsWith('EAA');

      logger.info('Token recuperado do banco', {
        tokenLength: tokenData.access_token.length,
        tokenPrefix: tokenData.access_token.substring(0, 20) + '...',
        looksEncrypted
      });

      if (looksEncrypted) {
        try {
          logger.info('Token parece estar criptografado, descriptografando');
          accessToken = decryptData(tokenData.access_token).trim();
          logger.info('Token descriptografado com sucesso', {
            tokenLength: accessToken.length,
            tokenPrefix: accessToken.substring(0, 20) + '...'
          });
        } catch (decryptError: any) {
          logger.error('Erro ao descriptografar token', {
            error: decryptError.message
          });
          throw new Error(`Falha ao descriptografar token: ${decryptError.message}`);
        }
      } else {
        // Token não está criptografado, usa direto
        logger.info('Token não parece estar criptografado, usando diretamente');
        accessToken = tokenData.access_token.trim();
      }

      // Cria serviço de sincronização
      const syncService = new MetaSyncService(accessToken);

      // Executa sincronização
      await syncService.syncConnection(connectionId);

      logger.info('Sincronização concluída', { connectionId });

      // Recarrega conexões para atualizar last_sync
      await loadConnections();

    } catch (err: any) {
      logger.error('Erro na sincronização', err);
      setError(err.message || 'Erro ao sincronizar dados');
    } finally {
      setSyncingId(null);
    }
  };

  /**
   * Remove uma conexão
   */
  const handleRemove = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta conexão? Todos os dados serão perdidos.')) {
      return;
    }

    try {
      logger.info('Removendo conexão', { connectionId });

      const { error: deleteError } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', connectionId);

      if (deleteError) throw deleteError;

      logger.info('Conexão removida', { connectionId });

      // Recarrega lista
      await loadConnections();

    } catch (err: any) {
      logger.error('Erro ao remover conexão', err);
      setError(err.message || 'Erro ao remover conexão');
    }
  };

  /**
   * Abre visualização de campanhas de uma conta
   */
  const handleViewCampaigns = (connection: MetaConnection) => {
    setSelectedAccount(connection);
    setShowCampaigns(true);
  };

  /**
   * Retorna badge de status da conexão
   */
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
      connected: { label: 'Conectado', variant: 'success' },
      syncing: { label: 'Sincronizando', variant: 'info' },
      error: { label: 'Erro', variant: 'error' },
      disconnected: { label: 'Desconectado', variant: 'warning' },
    };

    const config = statusMap[status] || { label: 'Desconhecido', variant: 'info' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Formata data de última sincronização
   */
  const formatLastSync = (lastSync: string) => {
    if (!lastSync) return 'Nunca';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  };

  // Se está exibindo campanhas, mostra o componente de detalhes
  if (showCampaigns && selectedAccount) {
    return (
      <MetaCampaignDetails
        accountId={selectedAccount.accountId}
        accountName={selectedAccount.accountName}
        connectionId={selectedAccount.id}
        onClose={() => {
          setShowCampaigns(false);
          setSelectedAccount(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="ml-4 text-gray-600">Carregando conexões...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contas Meta Ads Conectadas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie suas contas de anúncios do Meta (Facebook/Instagram)
            </p>
          </div>
          {onAddNew && (
            <Button onClick={onAddNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nova Conta
            </Button>
          )}
        </div>

        {/* Estatísticas gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700 font-medium">Total de Contas</p>
            <p className="text-2xl font-bold text-blue-900">{connections.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">Campanhas Ativas</p>
            <p className="text-2xl font-bold text-green-900">
              {connections.reduce((sum, conn) => sum + conn.activeCampaigns, 0)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-sm text-purple-700 font-medium">Total de Campanhas</p>
            <p className="text-2xl font-bold text-purple-900">
              {connections.reduce((sum, conn) => sum + conn.totalCampaigns, 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Lista de conexões */}
      <div className="space-y-3">
        {connections.length === 0 ? (
          <Card className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Nenhuma conta Meta conectada</p>
            {onAddNew && (
              <Button onClick={onAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Conectar Primeira Conta
              </Button>
            )}
          </Card>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Nome e status */}
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {connection.accountName}
                    </h3>
                    {getStatusBadge(connection.status)}
                  </div>

                  {/* Informações da conta */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">ID da Conta</p>
                      <p className="font-medium text-gray-900">{connection.accountId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Moeda</p>
                      <p className="font-medium text-gray-900">{connection.currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Campanhas Ativas</p>
                      <p className="font-medium text-gray-900">
                        {connection.activeCampaigns} / {connection.totalCampaigns}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Última Sincronização</p>
                      <p className="font-medium text-gray-900 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatLastSync(connection.lastSync)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleViewCampaigns(connection)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Campanhas
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(connection.id)}
                  disabled={syncingId === connection.id}
                >
                  {syncingId === connection.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRemove(connection.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
};
