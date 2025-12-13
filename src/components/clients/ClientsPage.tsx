import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, TrendingUp, AlertCircle, CheckCircle, UserPlus, Mail } from 'lucide-react';
import { useClient, Client } from '../../contexts/ClientContext';
import { ClientForm } from './ClientForm';
import { InviteClientUserModal } from './InviteClientUserModal';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

// Interface para estatísticas de um cliente
interface ClientStats {
  clientId: string;
  campaignsCount: number;
  accountsCount: number;
  totalSpend: number;
  totalImpressions: number;
}

// Componente principal da página de clientes
export function ClientsPage() {
  const {
    clients,
    loading: clientsLoading,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
    selectClient
  } = useClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [invitingClient, setInvitingClient] = useState<Client | null>(null);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Carrega estatísticas de todos os clientes
  useEffect(() => {
    loadClientStats();
  }, [clients]);

  // Função para carregar estatísticas dos clientes
  const loadClientStats = async () => {
    if (clients.length === 0) {
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);
      const stats: Record<string, ClientStats> = {};

      // Carrega estatísticas para cada cliente
      for (const client of clients) {
        // Conta campanhas
        const { count: campaignsCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id);

        // Conta contas conectadas (oauth tokens ativos)
        const { count: accountsCount } = await supabase
          .from('oauth_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('is_active', true);

        // Busca métricas agregadas dos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: metricsData } = await supabase
          .from('ad_metrics')
          .select('spend, impressions')
          .eq('client_id', client.id)
          .gte('date', thirtyDaysAgo.toISOString());

        const totalSpend = metricsData?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0;
        const totalImpressions = metricsData?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0;

        stats[client.id] = {
          clientId: client.id,
          campaignsCount: campaignsCount || 0,
          accountsCount: accountsCount || 0,
          totalSpend,
          totalImpressions
        };
      }

      setClientStats(stats);
    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Handler para criar cliente
  const handleCreateClient = async (name: string, description: string) => {
    const client = await createClient(name, description);
    if (client) {
      setShowCreateModal(false);
      showNotification('success', 'Cliente criado com sucesso!');
      await loadClientStats();
      return true;
    }
    showNotification('error', 'Erro ao criar cliente');
    return false;
  };

  // Handler para editar cliente
  const handleEditClient = async (name: string, description: string) => {
    if (!editingClient) return false;

    const success = await updateClient(editingClient.id, { name, description });
    if (success) {
      setEditingClient(null);
      showNotification('success', 'Cliente atualizado com sucesso!');
      return true;
    }
    showNotification('error', 'Erro ao atualizar cliente');
    return false;
  };

  // Handler para excluir cliente
  const handleDeleteClient = async () => {
    if (!deletingClient) return;

    const success = await deleteClient(deletingClient.id);
    if (success) {
      setDeletingClient(null);
      showNotification('success', 'Cliente excluído com sucesso!');
      await loadClientStats();
    } else {
      showNotification('error', 'Erro ao excluir cliente');
    }
  };

  // Função para exibir notificação
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handler para selecionar um cliente e navegar
  const handleSelectClient = (client: Client) => {
    selectClient(client);
    showNotification('success', `Cliente "${client.name}" selecionado`);
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gerenciar Clientes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Organize suas campanhas por cliente para melhor controle
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Notificação */}
      {notification && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          notification.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <p className={`text-sm ${
            notification.type === 'success'
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}>
            {notification.message}
          </p>
        </div>
      )}

      {/* Lista de clientes em grid */}
      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Crie seu primeiro cliente para começar a organizar suas campanhas e conexões de anúncios.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Cliente
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => {
            const stats = clientStats[client.id];
            const isLoading = loadingStats || !stats;

            return (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectClient(client)}
              >
                <div className="p-6">
                  {/* Header do card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {client.name}
                      </h3>
                      {client.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {client.description}
                        </p>
                      )}
                    </div>

                    {/* Botoes de acao */}
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvitingClient(client);
                        }}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Convidar usuario"
                      >
                        <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClient(client);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingClient(client);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Campanhas */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Campanhas
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {stats.campaignsCount}
                        </span>
                      </div>

                      {/* Contas conectadas */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Contas Conectadas
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {stats.accountsCount}
                        </span>
                      </div>

                      {/* Gasto total (últimos 30 dias) */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Gasto (30 dias)
                        </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(stats.totalSpend)}
                        </span>
                      </div>

                      {/* Impressões */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Impressões
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(stats.totalImpressions)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de criação */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Criar Novo Cliente"
        >
          <ClientForm
            onSave={handleCreateClient}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}

      {/* Modal de edição */}
      {editingClient && (
        <Modal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          title="Editar Cliente"
        >
          <ClientForm
            client={editingClient}
            onSave={handleEditClient}
            onCancel={() => setEditingClient(null)}
          />
        </Modal>
      )}

      {/* Modal de confirmacao de exclusao */}
      {deletingClient && (
        <Modal
          isOpen={!!deletingClient}
          onClose={() => setDeletingClient(null)}
          title="Excluir Cliente"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Atencao!</p>
                <p>
                  Voce esta prestes a excluir o cliente <strong>{deletingClient.name}</strong>.
                  As campanhas e dados associados nao serao excluidos, mas precisarao ser reatribuidos a outro cliente.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeletingClient(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteClient}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Cliente
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de convite de usuario */}
      {invitingClient && (
        <InviteClientUserModal
          isOpen={!!invitingClient}
          onClose={() => setInvitingClient(null)}
          client={invitingClient}
          onInviteSent={() => {
            showNotification('success', 'Convite enviado com sucesso!');
          }}
        />
      )}
    </div>
  );
}
