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
import { MetaCampaignSelector } from './MetaCampaignSelector';
import { SelectedCampaignsMetrics } from './SelectedCampaignsMetrics';
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
  selectedCampaignsCount?: number;
  campaignSelectionCompleted?: boolean;
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
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState<string>('');

  // Estados para edição de token
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);

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

        // Conta campanhas totais
        const { count: totalCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id);

        // Conta campanhas ativas
        const { count: activeCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id)
          .eq('status', 'ACTIVE');

        // Conta campanhas selecionadas
        const { count: selectedCampaignsCount } = await supabase
          .from('selected_campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id);

        enrichedConnections.push({
          id: conn.id,
          accountId: conn.config?.accountId || metaAccount?.account_id || '',
          accountName: conn.account_label || metaAccount?.account_name || 'Conta Meta',
          status: conn.status,
          lastSync: conn.last_sync,
          currency: conn.config?.currency || metaAccount?.currency || 'BRL',
          totalCampaigns: totalCampaigns || 0,
          activeCampaigns: activeCampaigns || 0,
          selectedCampaignsCount: selectedCampaignsCount || 0,
          campaignSelectionCompleted: conn.campaign_selection_completed || false,
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

      // Cria serviço de sincronização com callback de progresso
      const syncService = new MetaSyncService(accessToken, (progress) => {
        setSyncProgress(progress.message);

        // Se chegou na fase de aguardar seleção, mostra seletor
        if (progress.phase === 'awaiting_selection' && progress.campaigns) {
          logger.info('Sincronização retornou campanhas para seleção', {
            count: progress.campaigns.length
          });

          // Busca informações da conexão
          const connection = connections.find(c => c.id === connectionId);
          if (connection) {
            setSelectedAccount(connection);
            setAvailableCampaigns(progress.campaigns);
            setShowCampaignSelector(true);
          }
        }
      });

      // Executa sincronização
      await syncService.syncConnection(connectionId);

      logger.info('Sincronização concluída', { connectionId });
      setSyncProgress('');

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
   * Abre visualização de métricas das campanhas selecionadas
   */
  const handleViewMetrics = (connection: MetaConnection) => {
    setSelectedAccount(connection);
    setShowMetrics(true);
  };

  /**
   * Abre seletor de campanhas para editar seleção
   */
  const handleManageSelection = async (connection: MetaConnection) => {
    try {
      logger.info('Carregando campanhas para editar seleção', { connectionId: connection.id });

      // Busca todas as campanhas sincronizadas desta conta
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('connection_id', connection.id);

      if (campaignsError) throw campaignsError;

      if (!campaigns || campaigns.length === 0) {
        setError('Nenhuma campanha encontrada. Sincronize a conta primeiro.');
        return;
      }

      setSelectedAccount(connection);
      setAvailableCampaigns(campaigns);
      setShowCampaignSelector(true);

    } catch (err: any) {
      logger.error('Erro ao carregar campanhas', err);
      setError(err.message || 'Erro ao carregar campanhas');
    }
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

  // Se está exibindo seletor de campanhas
  if (showCampaignSelector && selectedAccount) {
    return (
      <MetaCampaignSelector
        connectionId={selectedAccount.id}
        accountId={selectedAccount.accountId}
        accountName={selectedAccount.accountName}
        campaigns={availableCampaigns}
        onSelectionComplete={() => {
          setShowCampaignSelector(false);
          setSelectedAccount(null);
          setAvailableCampaigns([]);
          loadConnections();
        }}
        onCancel={() => {
          setShowCampaignSelector(false);
          setSelectedAccount(null);
          setAvailableCampaigns([]);
        }}
      />
    );
  }

  // Se está exibindo métricas
  if (showMetrics && selectedAccount) {
    return (
      <SelectedCampaignsMetrics
        connectionId={selectedAccount.id}
        accountName={selectedAccount.accountName}
        onBack={() => {
          setShowMetrics(false);
          setSelectedAccount(null);
        }}
      />
    );
  }

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
                      <p className="text-gray-500">Campanhas Selecionadas</p>
                      <p className="font-medium text-gray-900">
                        {connection.selectedCampaignsCount || 0} de {connection.totalCampaigns}
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

              {/* Progresso da sincronização */}
              {syncingId === connection.id && syncProgress && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">{syncProgress}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                {/* Botão Ver Métricas - apenas se campanhas foram selecionadas */}
                {connection.campaignSelectionCompleted && connection.selectedCampaignsCount && connection.selectedCampaignsCount > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleViewMetrics(connection)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Métricas
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleViewCampaigns(connection)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Campanhas
                </Button>

                {/* Botão Gerenciar Seleção - se já selecionou antes */}
                {connection.campaignSelectionCompleted && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleManageSelection(connection)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Seleção
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(connection.id)}
                  disabled={syncingId === connection.id}
                >
                  {syncingId === connection.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {syncProgress ? 'Sincronizando...' : 'Aguarde...'}
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
                  Token
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
