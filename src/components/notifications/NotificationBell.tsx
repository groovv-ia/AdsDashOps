import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { NotificationService } from '../../lib/notificationService';

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUrgent, setHasUrgent] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const service = NotificationService.getInstance();

  useEffect(() => {
    loadCount();

    const unsub = service.addListener((notification) => {
      setIsNew(true);
      loadCount();
      // Verifica se a notificacao entrante e urgente
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        setHasUrgent(true);
      }
      setTimeout(() => setIsNew(false), 3000);
    });

    return unsub;
  }, []);

  const loadCount = async () => {
    try {
      const count = await service.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silencioso
    }
  };

  const handleClick = () => {
    setIsNew(false);
    setHasUrgent(false);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-xl transition-all duration-200
        text-gray-500 hover:text-gray-800 hover:bg-gray-100
        ${isNew ? 'animate-[bell-shake_0.5s_ease-in-out]' : ''}`}
      title="Notificações"
    >
      {isNew ? (
        <BellRing className="w-5 h-5 text-blue-600" />
      ) : (
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-gray-700' : ''}`} />
      )}

      {unreadCount > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
            rounded-full text-white text-[10px] font-bold px-1 leading-none
            ${hasUrgent
              ? 'bg-red-500 animate-pulse shadow-[0_0_0_2px_white]'
              : 'bg-blue-600 shadow-[0_0_0_2px_white]'
            }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
