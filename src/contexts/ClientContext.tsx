import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// Interface que define a estrutura de um cliente
interface Client {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interface para o contexto do cliente
interface ClientContextType {
  // Cliente atualmente selecionado (null significa "Todos os Clientes")
  selectedClient: Client | null;
  // Lista de todos os clientes do usuário
  clients: Client[];
  // Indicador de carregamento
  loading: boolean;
  // Função para selecionar um cliente
  selectClient: (client: Client | null) => void;
  // Função para recarregar a lista de clientes
  refreshClients: () => Promise<void>;
  // Função para criar um novo cliente
  createClient: (name: string, description?: string) => Promise<Client | null>;
  // Função para atualizar um cliente existente
  updateClient: (id: string, updates: Partial<Pick<Client, 'name' | 'description' | 'is_active'>>) => Promise<boolean>;
  // Função para excluir um cliente (soft delete)
  deleteClient: (id: string) => Promise<boolean>;
}

// Cria o contexto
const ClientContext = createContext<ClientContextType | undefined>(undefined);

// Props do provider
interface ClientProviderProps {
  children: ReactNode;
}

// Chave para armazenar o ID do cliente selecionado no localStorage
const SELECTED_CLIENT_KEY = 'selectedClientId';

export function ClientProvider({ children }: ClientProviderProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega a lista de clientes do usuário
  const loadClients = async () => {
    if (!user) {
      setClients([]);
      setSelectedClient(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients(data || []);

      // Restaura o cliente selecionado do localStorage
      const savedClientId = localStorage.getItem(SELECTED_CLIENT_KEY);
      if (savedClientId && savedClientId !== 'all') {
        const savedClient = data?.find(c => c.id === savedClientId);
        if (savedClient) {
          setSelectedClient(savedClient);
        } else {
          // Cliente salvo não existe mais, limpa o localStorage
          localStorage.removeItem(SELECTED_CLIENT_KEY);
          setSelectedClient(null);
        }
      } else if (savedClientId === 'all') {
        setSelectedClient(null);
      } else if (data && data.length > 0) {
        // Se não há cliente salvo, seleciona o primeiro
        setSelectedClient(data[0]);
        localStorage.setItem(SELECTED_CLIENT_KEY, data[0].id);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      setSelectedClient(null);
    } finally {
      setLoading(false);
    }
  };

  // Carrega clientes quando o usuário muda
  useEffect(() => {
    loadClients();
  }, [user]);

  // Função para selecionar um cliente
  const selectClient = (client: Client | null) => {
    setSelectedClient(client);

    // Salva a seleção no localStorage
    if (client) {
      localStorage.setItem(SELECTED_CLIENT_KEY, client.id);
    } else {
      localStorage.setItem(SELECTED_CLIENT_KEY, 'all');
    }
  };

  // Função para recarregar os clientes
  const refreshClients = async () => {
    await loadClients();
  };

  // Função para criar um novo cliente
  const createClient = async (name: string, description?: string): Promise<Client | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Adiciona o novo cliente à lista
      setClients(prev => [data, ...prev]);

      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      return null;
    }
  };

  // Função para atualizar um cliente
  const updateClient = async (
    id: string,
    updates: Partial<Pick<Client, 'name' | 'description' | 'is_active'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualiza o cliente na lista local
      setClients(prev => prev.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ));

      // Atualiza o cliente selecionado se for o mesmo
      if (selectedClient?.id === id) {
        setSelectedClient(prev => prev ? { ...prev, ...updates } : null);
      }

      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      return false;
    }
  };

  // Função para excluir um cliente (soft delete)
  const deleteClient = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Soft delete - marca como inativo
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove da lista local
      setClients(prev => prev.filter(c => c.id !== id));

      // Se o cliente excluído estava selecionado, limpa a seleção
      if (selectedClient?.id === id) {
        const remainingClients = clients.filter(c => c.id !== id);
        if (remainingClients.length > 0) {
          selectClient(remainingClients[0]);
        } else {
          selectClient(null);
          localStorage.removeItem(SELECTED_CLIENT_KEY);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  };

  const value: ClientContextType = {
    selectedClient,
    clients,
    loading,
    selectClient,
    refreshClients,
    createClient,
    updateClient,
    deleteClient
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

// Hook personalizado para usar o contexto do cliente
export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}

// Exporta o tipo Client para uso em outros componentes
export type { Client };
