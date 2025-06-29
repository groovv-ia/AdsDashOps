import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  Filter,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Notification } from '../../types/notifications';
import { NotificationService } from '../../lib/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onOpenSettings
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter, categoryFilter]);

  useEffect(() => {
    // Listen for new notifications
    const unsubscribe = notificationService.addListener((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let allNotifications = await notificationService.getNotifications(100);

      // Apply filters
      if (filter === 'unread') {
        allNotifications = allNotifications.filter(n => !n.read);
      } else if (filter === 'read') {
        allNotifications = allNotifications.filter(n => n.read);
      }

      if (categoryFilter !== 'all') {
        allNotifications = allNotifications.filter(n => n.category === categoryFilter);
      }

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const getNotificationIcon = (type: string, category: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      default:
        switch (category) {
          case 'performance': return TrendingDown;
          case 'budget': return DollarSign;
          case 'campaign': return Zap;
          case 'sync': return Clock;
          default: return Info;
        }
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600 bg-red-100';
    
    switch (type) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-gray-500 text-white'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md h-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notificações</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              {['all', 'unread', 'read'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType as any)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filter === filterType
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filterType === 'all' ? 'Todas' : filterType === 'unread' ? 'Não lidas' : 'Lidas'}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              {['all', 'system', 'campaign', 'budget', 'performance', 'sync'].map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    categoryFilter === category
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {category === 'all' ? 'Todas' : category}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                icon={CheckCheck}
              >
                Marcar todas como lidas
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma notificação</h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'Você não tem notificações não lidas'
                  : 'Você não tem notificações'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type, notification.category);
                const iconColor = getNotificationColor(notification.type, notification.priority);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${iconColor} flex-shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-2 mt-2">
                              {getPriorityBadge(notification.priority)}
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {notification.metadata?.platform && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {notification.metadata.platform}
                                </span>
                              )}
                            </div>

                            {notification.action_url && (
                              <a
                                href={notification.action_url}
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
                              >
                                {notification.action_label || 'Ver detalhes'}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Marcar como lida"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notification.id)}
                              title="Deletar"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};