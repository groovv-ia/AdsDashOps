import React, { useState, useEffect } from 'react';
import { Bell, Settings, User, LogOut, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { NotificationSettingsModal } from '../notifications/NotificationSettings';
import { signOut } from '../../lib/supabase';
import { User as UserType } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface DashboardHeaderProps {
  user: UserType;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onPageChange?: (page: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  onToggleSidebar,
  sidebarOpen,
  onPageChange,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load avatar URL from profile
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      } catch (error) {
        console.error('Erro ao carregar avatar:', error);
      }
    };

    if (user) {
      loadAvatar();
    }
  }, [user]);

  // Listen for profile updates
  useEffect(() => {
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const updatedProfile = payload.new as any;
          if (updatedProfile.avatar_url) {
            setAvatarUrl(updatedProfile.avatar_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const handleSettingsClick = () => {
    if (onPageChange) {
      onPageChange('settings');
    }
    setProfileDropdownOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-gray-900">
                Análise de Publicidade
              </h1>
              <p className="text-sm text-gray-600">
                Bem-vindo de volta, {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
            </div>
            
            <div className="block sm:hidden">
              <div className="flex items-center space-x-2">
                <img 
                  src="/logotipo-adsops.fw.png" 
                  alt="AdsOPS" 
                  className="h-6 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-3">
            <NotificationBell onClick={() => setNotificationCenterOpen(true)} />

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium max-w-24 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}
                </span>
              </Button>

              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button 
                      onClick={() => {
                        setNotificationSettingsOpen(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Notificações
                    </button>
                    <button 
                      onClick={handleSettingsClick}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        onOpenSettings={() => {
          setNotificationCenterOpen(false);
          setNotificationSettingsOpen(true);
        }}
      />

      {/* Notification Settings */}
      <NotificationSettingsModal
        isOpen={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
    </>
  );
};