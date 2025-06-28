import React, { useState } from 'react';
import { Bell, Settings, User, LogOut, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { signOut } from '../../lib/supabase';
import { User as UserType } from '@supabase/supabase-js';

interface DashboardHeaderProps {
  user: UserType;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
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
            <h1 className="text-lg font-semibold text-gray-900">
              Analytics
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-3">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
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
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center">
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
  );
};