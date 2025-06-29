import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationService } from '../../lib/notificationService';

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadUnreadCount();

    // Listen for new notifications
    const unsubscribe = notificationService.addListener(() => {
      setHasNewNotification(true);
      loadUnreadCount();
      
      // Reset animation after 3 seconds
      setTimeout(() => setHasNewNotification(false), 3000);
    });

    return unsubscribe;
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contagem de não lidas:', error);
    }
  };

  const handleClick = () => {
    setHasNewNotification(false);
    onClick();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`relative ${hasNewNotification ? 'animate-bounce' : ''}`}
    >
      {hasNewNotification ? (
        <BellRing className="w-5 h-5 text-blue-600" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
};