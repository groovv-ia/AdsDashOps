/**
 * Hook para gerenciar estado de conexões de fontes de dados
 *
 * Este hook centraliza o acesso às conexões ativas do usuário,
 * verificando se existem fontes de dados conectadas e gerenciando
 * a seleção da conta ativa no dashboard.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Interface para conexão de fonte de dados
export interface DataConnection {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  config: {
    accountId: string;
    accountName: string;
    currency?: string;
  };
  logo: string;
  description: string;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

interface UseDataConnectionsReturn {
  // Lista de todas as conexões do usuário
  connections: DataConnection[];

  // Conexão atualmente ativa/selecionada
  activeConnection: DataConnection | null;

  // Verifica se usuário tem pelo menos uma conexão ativa
  hasConnections: boolean;

  // Verifica se usuário tem conexões mas nenhuma está sincronizada
  hasConnectionsButNoData: boolean;

  // Estado de carregamento
  loading: boolean;

  // Erro se houver
  error: string | null;

  // Função para selecionar uma conexão como ativa
  setActiveConnection: (connectionId: string) => void;

  // Função para recarregar lista de conexões
  refreshConnections: () => Promise<void>;

  // Função para obter conexão por ID
  getConnectionById: (id: string) => DataConnection | undefined;
}

/**
 * Hook principal para gerenciar conexões de fontes de dados
 */
export const useDataConnections = (): UseDataConnectionsReturn => {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [activeConnection, setActiveConnectionState] = useState<DataConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega todas as conexões do usuário autenticado
   */
  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verifica se usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setConnections([]);
        setActiveConnectionState(null);
        setLoading(false);
        return;
      }

      // Busca todas as conexões do usuário
      const { data, error: fetchError } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const loadedConnections = (data || []) as DataConnection[];
      setConnections(loadedConnections);

      // Tenta restaurar conexão ativa do localStorage
      const savedActiveConnectionId = localStorage.getItem('active_connection_id');

      if (savedActiveConnectionId) {
        const savedConnection = loadedConnections.find(conn => conn.id === savedActiveConnectionId);
        if (savedConnection && savedConnection.status === 'connected') {
          setActiveConnectionState(savedConnection);
        } else {
          // Se conexão salva não existe ou não está conectada, limpa localStorage
          localStorage.removeItem('active_connection_id');
          // Seleciona primeira conexão ativa disponível
          const firstActive = loadedConnections.find(conn => conn.status === 'connected');
          setActiveConnectionState(firstActive || null);
          if (firstActive) {
            localStorage.setItem('active_connection_id', firstActive.id);
          }
        }
      } else {
        // Se não tem conexão salva, seleciona primeira conexão ativa
        const firstActive = loadedConnections.find(conn => conn.status === 'connected');
        setActiveConnectionState(firstActive || null);
        if (firstActive) {
          localStorage.setItem('active_connection_id', firstActive.id);
        }
      }

    } catch (err) {
      console.error('Erro ao carregar conexões:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setConnections([]);
      setActiveConnectionState(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Seleciona uma conexão como ativa
   */
  const setActiveConnection = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (connection && connection.status === 'connected') {
      setActiveConnectionState(connection);
      localStorage.setItem('active_connection_id', connectionId);
    }
  };

  /**
   * Recarrega lista de conexões
   */
  const refreshConnections = async () => {
    await loadConnections();
  };

  /**
   * Obtém conexão por ID
   */
  const getConnectionById = (id: string): DataConnection | undefined => {
    return connections.find(conn => conn.id === id);
  };

  // Carrega conexões ao montar componente
  useEffect(() => {
    loadConnections();

    // Escuta mudanças em tempo real nas conexões
    const channel = supabase
      .channel('data_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_connections'
        },
        () => {
          // Recarrega conexões quando houver mudanças
          loadConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calcula propriedades derivadas
  const hasConnections = connections.length > 0;
  const hasConnectionsButNoData = connections.length > 0 &&
    connections.every(conn => conn.last_sync === null);

  return {
    connections,
    activeConnection,
    hasConnections,
    hasConnectionsButNoData,
    loading,
    error,
    setActiveConnection,
    refreshConnections,
    getConnectionById
  };
};

/**
 * Hook simplificado que retorna apenas se usuário tem conexões
 * Útil para guardas de rota e verificações rápidas
 */
export const useHasConnections = (): { hasConnections: boolean; loading: boolean } => {
  const [hasConnections, setHasConnections] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasConnections(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('data_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'connected')
          .limit(1);

        if (error) throw error;

        setHasConnections((data?.length ?? 0) > 0);
      } catch (err) {
        console.error('Erro ao verificar conexões:', err);
        setHasConnections(false);
      } finally {
        setLoading(false);
      }
    };

    checkConnections();
  }, []);

  return { hasConnections, loading };
};
