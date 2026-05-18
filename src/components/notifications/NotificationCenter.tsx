import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  Zap,
  RefreshCw,
  Shield,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Notification } from '../../types/notifications';
import { NotificationService } from '../../lib/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

// Mapeamento de categoria para icone e label
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  all:         { icon: Bell,        label: 'Todas'       },
  system:      { icon: Info,        label: 'Sistema'     },
  campaign:    { icon: Zap,         label: 'Campanhas'   },
  budget:      { icon: DollarSign,  label: 'Orçamento'   },
  performance: { icon: TrendingDown,label: 'Performance' },
  sync:        { icon: RefreshCw,   label: 'Sync'        },
  security:    { icon: Shield,      label: 'Segurança'   },
};

// Cor do icone por tipo/prioridade
function getIconStyle(type: string, priority: string): string {
  if (priority === 'urgent') return 'text-red-600 bg-red-100';
  switch (type) {
    case 'success':     return 'text-green-600 bg-green-100';
    case 'error':       return 'text-red-600 bg-red-100';
    case 'warning':     return 'text-amber-600 bg-amber-100';
    case 'performance': return 'text-orange-600 bg-orange-100';
    case 'budget':      return 'text-emerald-600 bg-emerald-100';
    case 'campaign':    return 'text-blue-600 bg-blue-100';
    default:            return 'text-blue-600 bg-blue-100';
  }
}

// Cor da barra lateral do item por prioridade/tipo
function getAccentColor(type: string, priority: string): string {
  if (priority === 'urgent') return 'bg-red-500';
  if (priority === 'high')   return 'bg-orange-400';
  switch (type) {
    case 'success': return 'bg-green-400';
    case 'error':   return 'bg-red-400';
    case 'warning': return 'bg-amber-400';
    default:        return 'bg-blue-400';
  }
}

function getNotificationIcon(type: string, category: string): React.ElementType {
  switch (type) {
    case 'success': return CheckCircle;
    case 'error':   return XCircle;
    case 'warning': return AlertTriangle;
    default:
      switch (category) {
        case 'performance': return TrendingDown;
        case 'budget':      return DollarSign;
        case 'campaign':    return Zap;
        case 'sync':        return RefreshCw;
        case 'security':    return Shield;
        default:            return Info;
      }
  }
}

// Formata tempo relativo
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)   return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h atrás`;
  const days = Math.floor(diff / 86400);
  if (days < 7)    return `${days}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Agrupa notificações por data
function groupByDate(list: Notification[]): { label: string; items: Notification[] }[] {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    'Hoje': [],
    'Ontem': [],
    'Esta semana': [],
    'Mais antigas': [],
  };

  list.forEach(n => {
    const d = new Date(n.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today)       groups['Hoje'].push(n);
    else if (day >= yesterday) groups['Ontem'].push(n);
    else if (day >= weekAgo)   groups['Esta semana'].push(n);
    else                       groups['Mais antigas'].push(n);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // IDs com hover ativo (para mostrar acoes)
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const service = NotificationService.getInstance();

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, onlyUnread, categoryFilter]);

  useEffect(() => {
    const unsub = service.addListener(n => {
      setNotifications(prev => [n, ...prev]);
    });
    return unsub;
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let list = await service.getNotifications(150);
      if (onlyUnread)           list = list.filter(n => !n.read);
      if (categoryFilter !== 'all') list = list.filter(n => n.category === categoryFilter);
      setNotifications(list);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await service.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    await service.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const remove = async (id: string) => {
    await service.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups = groupByDate(notifications);

  return (
    <>
      {/* Overlay sutil — sem bloquear a tela */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } bg-black/20`}
        aria-hidden="true"
      />

      {/* Painel deslizante */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-gray-100">
          {/* Linha título */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900">Notificações</h2>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toggle não lidas */}
          <div className="flex items-center gap-2 px-5 pb-3">
            <button
              onClick={() => setOnlyUnread(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                !onlyUnread
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setOnlyUnread(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                onlyUnread
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Não lidas {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Filtros por categoria — scroll horizontal */}
          <div className="flex gap-1.5 px-5 pb-4 overflow-x-auto scrollbar-hide">
            {Object.entries(CATEGORY_CONFIG).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  categoryFilter === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lista ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState onlyUnread={onlyUnread} />
          ) : (
            <div className="py-2">
              {groups.map(({ label, items }) => (
                <div key={label}>
                  {/* Cabeçalho do grupo sticky */}
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-5 py-2 border-b border-gray-50">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>

                  {items.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      isHovered={hoveredId === n.id}
                      onHover={setHoveredId}
                      onMarkRead={markAsRead}
                      onDelete={remove}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Item de notificação ──────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification: n,
  isHovered,
  onHover,
  onMarkRead,
  onDelete,
}) => {
  const Icon = getNotificationIcon(n.type, n.category);
  const iconStyle = getIconStyle(n.type, n.priority);
  const accent = getAccentColor(n.type, n.priority);
  const showHighPriority = n.priority === 'urgent' || n.priority === 'high';

  return (
    <div
      className={`relative flex gap-3 px-5 py-3.5 transition-colors cursor-default group
        ${!n.read ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50/60'}`}
      onMouseEnter={() => onHover(n.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Barra de acento lateral */}
      {!n.read && (
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accent} rounded-r`} />
      )}

      {/* Icone */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${iconStyle}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {n.title}
          </p>
          {/* Acoes em hover */}
          <div className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-150
            ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {!n.read && (
              <button
                onClick={() => onMarkRead(n.id)}
                className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Marcar como lida"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(n.id)}
              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
          {n.message}
        </p>

        {/* Rodapé do item */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400">{formatTimeAgo(n.created_at)}</span>

          {showHighPriority && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
              n.priority === 'urgent'
                ? 'bg-red-100 text-red-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {n.priority === 'urgent' ? 'Urgente' : 'Alta'}
            </span>
          )}

          {n.metadata?.platform && (
            <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {n.metadata.platform}
            </span>
          )}

          {n.action_url && (
            <a
              href={n.action_url}
              className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
            >
              {n.action_label || 'Ver detalhes'}
              <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Estado vazio ─────────────────────────────────────────────
const EmptyState: React.FC<{ onlyUnread: boolean }> = ({ onlyUnread }) => (
  <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Bell className="w-7 h-7 text-gray-400" />
    </div>
    <p className="text-sm font-semibold text-gray-700 mb-1">
      {onlyUnread ? 'Tudo em dia!' : 'Sem notificações'}
    </p>
    <p className="text-xs text-gray-400 leading-relaxed">
      {onlyUnread
        ? 'Você não tem notificações não lidas no momento.'
        : 'As notificações de campanhas, sincronizações e alertas aparecerão aqui.'}
    </p>
  </div>
);
