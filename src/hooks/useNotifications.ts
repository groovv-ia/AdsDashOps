import { useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { Notification } from '../types/advertising';

// Hook customizado para gerenciar notificações do usuário
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Função para buscar notificações do banco de dados
  const fetchNotifications = async (userId: string) => {
    if (isDemoMode || !supabase) {
      // Em modo demo, retorna notificações mock
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          user_id: userId,
          title: 'Bem-vindo ao Dashboard!',
          message: 'Configure suas fontes de dados para começar a monitorar suas campanhas.',
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          user_id: userId,
          title: 'Modo Demonstração Ativo',
          message: 'Você está usando dados de demonstração. Configure o Supabase para dados reais.',
          type: 'warning',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
      setLoading(false);
      return;
    }

    try {
      // Busca notificações do usuário, ordenadas por data (mais recentes primeiro)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Função para marcar uma notificação como lida
  const markAsRead = async (notificationId: string) => {
    if (isDemoMode || !supabase) {
      // Em modo demo, atualiza localmente
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Atualiza o estado local
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Função para marcar todas as notificações como lidas
  const markAllAsRead = async (userId: string) => {
    if (isDemoMode || !supabase) {
      // Em modo demo, atualiza localmente
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      // Atualiza o estado local
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
    }
  };

  // Função para criar uma nova notificação
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    if (isDemoMode || !supabase) {
      // Em modo demo, adiciona localmente
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setNotifications(prev => [newNotification, ...prev]);
      if (!newNotification.read) {
        setUnreadCount(prev => prev + 1);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;

      // Adiciona a nova notificação ao estado
      setNotifications(prev => [data, ...prev]);
      if (!data.read) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  // Busca notificações quando o hook é montado
  useEffect(() => {
    const getUserAndFetch = async () => {
      if (isDemoMode || !supabase) {
        await fetchNotifications('demo-user');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchNotifications(user.id);
      } else {
        setLoading(false);
      }
    };

    getUserAndFetch();

    // Se não estiver em modo demo, escuta mudanças em tempo real
    if (!isDemoMode && supabase) {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('Notificação atualizada:', payload);
            // Recarrega notificações quando há mudanças
            getUserAndFetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refresh: () => {
      if (isDemoMode || !supabase) {
        fetchNotifications('demo-user');
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) fetchNotifications(user.id);
        });
      }
    },
  };
};
