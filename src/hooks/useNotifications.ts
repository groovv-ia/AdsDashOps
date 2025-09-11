import { useState, useEffect } from 'react';
import { Notification, NotificationSettings } from '../types/notifications';
import { NotificationService, NotificationMonitoringService } from '../lib/notificationService';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const notificationService = NotificationService.getInstance();
  const monitoringService = NotificationMonitoringService.getInstance();

  useEffect(() => {
    initialize();
    
    return () => {
      monitoringService.stopMonitoring();
    };
  }, []);

  const initialize = async () => {
    try {
      // Check if Supabase is configured
      if (!supabase) {
        console.warn('Supabase não configurado - modo demo para notificações');
        setLoading(false);
        return;
      }

      // Initialize real-time notifications
      await notificationService.initializeRealTime();
      
      // Start monitoring
      monitoringService.startMonitoring();
      
      // Load initial data
      await Promise.all([
        loadNotifications(),
        loadUnreadCount(),
        loadSettings()
      ]);

      // Listen for new notifications
      notificationService.addListener((notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const userSettings = await notificationService.getSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      await notificationService.updateSettings(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    try {
      await notificationService.createNotification(notification);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    settings,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    createNotification,
    loadNotifications,
    loadUnreadCount
  };
};