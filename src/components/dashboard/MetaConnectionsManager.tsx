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
import { decryptData, encryptData } from '../../lib/utils/encryption';
import { MetaCampaignDetails } from './MetaCampaignDetails';
import { Modal } from '../ui/Modal';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para visualização de campanhas
  const [selectedAccount, setSelectedAccount] = useState<MetaConnection | null>(null);
  const [showCampaigns, setShowCampaigns] = useState(false);

  // Estados para edição de token
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);

  /**
   * Carrega todas as conexões Meta do usuário ao montar o componente
   */
  useEffect(() => {
    loadConnections();
  }, []);

  /**
   * Escuta eventos de sincronização completa para atualizar a lista automaticamente
   */
  useEffect(() => {
    const handleSyncCompleted = (event: CustomEvent) => {
      logger.info('Evento de sincronização completa recebido', event.detail);
      // Aguarda 1 segundo para garantir que o banco de dados foi atualizado
      setTimeout(() => {
        loadConnections();
      }, 1000);
    };

    window.addEventListener('syncCompleted', handleSyncCompleted as EventListener);
    return () => window.removeEventListener('syncCompleted', handleSyncCompleted as EventListener);
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

      logger.info('Sincronização concluída com sucesso', { connectionId });

      // Dispara evento de sincronização completa
      window.dispatchEvent(new CustomEvent('syncCompleted', {
        detail: { platform: 'meta', connectionId }
      }));

    } catch (err: any) {
      logger.error('Erro na sincronização', err);
      setError(err.message || 'Erro ao sincronizar dados');
    } finally {
      setSyncingId(null);

      // Aguarda 500ms para garantir que o banco de dados foi atualizado antes de recarregar
      // Isso evita race condition onde a UI recarrega antes do status ser atualizado
      setTimeout(async () => {
        await loadConnections();
      }, 500);
    }
  };

  /**
   * Abre modal para atualizar token
   */
  const handleEditToken = (connectionId: string) => {
    setEditingConnectionId(connectionId);
    setNewToken('');
    setShowTokenModal(true);
    setError('');
  };

  /**
   * Atualiza o token de uma conexão existente
   */
  const handleUpdateToken = async () => {
    if (!editingConnectionId || !newToken.trim()) {
      setError('Token é obrigatório');
      return;
    }

    // Valida formato do token Meta (deve começar com EAA)
    if (!newToken.trim().startsWith('EAA')) {
      setError('Token inválido. Tokens Meta devem começar com "EAA"');
      return;
    }

    setUpdatingToken(true);
    setError('');

    try {
      logger.info('Atualizando token da conexão', { connectionId: editingConnectionId });

      // Criptografa o novo token
      const encryptedToken = encryptData(newToken.trim());

      // Atualiza o token no banco
      const { error: updateError } = await supabase
        .from('oauth_tokens')
        .update({
          access_token: encryptedToken,
          updated_at: new Date().toISOString(),
        })
        .eq('connection_id', editingConnectionId);

      if (updateError) throw updateError;

      logger.info('Token atualizado com sucesso');

      // Fecha modal
      setShowTokenModal(false);
      setNewToken('');
      setEditingConnectionId(null);

      // Recarrega conexões
      await loadConnections();

      // Mostra mensagem de sucesso
      alert('Token atualizado com sucesso! Você já pode sincronizar os dados.');

    } catch (err: any) {
      logger.error('Erro ao atualizar token', err);
      setError(err.message || 'Erro ao atualizar token');
    } finally {
      setUpdatingToken(false);
    }
  };

  /**
   * Remove uma conexão e todos os dados associados
   */
  const handleRemove = async (connectionId: string) => {
    // Busca o nome da conta para exibir na confirmação
    const connection = connections.find(c => c.id === connectionId);
    const accountName = connection?.accountName || 'esta conta';

    const confirmMessage = `Tem certeza que deseja remover a conta "${accountName}"?\n\n` +
      `ATENÇÃO: Esta ação irá:\n` +
      `• Remover a conexão com a conta Meta\n` +
      `• Excluir todas as campanhas sincronizadas (${connection?.totalCampaigns || 0})\n` +
      `• Apagar todos os conjuntos de anúncios e anúncios\n` +
      `• Remover todas as métricas e históricos\n\n` +
      `Esta ação NÃO pode ser desfeita!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingId(connectionId);
    setError('');

    try {
      logger.info('Removendo conexão Meta', { connectionId, accountName });

      // Remove a conexão (as tabelas têm CASCADE, então remove tudo relacionado)
      const { error: deleteError } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', connectionId);

      if (deleteError) throw deleteError;

      logger.info('Conexão Meta removida com sucesso', { connectionId, accountName });

      // Mostra mensagem de sucesso
      alert(`Conta "${accountName}" removida com sucesso!`);

      // Recarrega lista
      await loadConnections();

    } catch (err: any) {
      logger.error('Erro ao remover conexão Meta', err);
      setError(err.message || 'Erro ao remover conexão. Tente novamente.');
    } finally {
      setDeletingId(null);
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
                    {(() => {
                      // Se status é erro mas a última sincronização foi recente (menos de 3 minutos),
                      // não exibe o badge de erro pois pode estar desatualizado
                      if (connection.status === 'error' && connection.lastSync) {
                        const lastSyncDate = new Date(connection.lastSync);
                        const now = new Date();
                        const diffMinutes = Math.floor((now.getTime() - lastSyncDate.getTime()) / 60000);

                        // Se foi há menos de 3 minutos, não mostra badge de erro
                        if (diffMinutes < 3) {
                          return (
                            <button
                              onClick={() => loadConnections()}
                              className="text-xs text-blue-600 hover:text-blue-800 underline px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200"
                              title="Status pode estar desatualizado. Clique para atualizar."
                            >
                              Atualizar status
                            </button>
                          );
                        }
                      }
                      return getStatusBadge(connection.status);
                    })()}
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
                  onClick={() => handleEditToken(connection.id)}
                  title="Atualizar token de acesso"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Atualizar Token
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRemove(connection.id)}
                  disabled={deletingId === connection.id || syncingId === connection.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === connection.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </>
                  )}
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

      {/* Modal de atualização de token */}
      {showTokenModal && (
        <Modal
          isOpen={showTokenModal}
          onClose={() => {
            setShowTokenModal(false);
            setNewToken('');
            setEditingConnectionId(null);
            setError('');
          }}
          title="Atualizar Token de Acesso"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Cole o novo token de acesso do Meta Ads. O token deve começar com "EAA".
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token de Acesso
              </label>
              <textarea
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="EAA..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />

              <p className="text-xs text-gray-500 mt-2">
                💡 Dica: Você pode obter um novo token no{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Meta Graph API Explorer
                </a>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleUpdateToken}
                disabled={updatingToken || !newToken.trim()}
                className="flex-1"
              >
                {updatingToken ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Atualizar Token
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setShowTokenModal(false);
                  setNewToken('');
                  setEditingConnectionId(null);
                  setError('');
                }}
                disabled={updatingToken}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
