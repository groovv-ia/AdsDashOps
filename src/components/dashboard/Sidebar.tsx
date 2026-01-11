import React from 'react';
import { Settings, Headphones, Building2, Link, RefreshCw, Target } from 'lucide-react';
import { WorkspaceSelector } from '../workspaces/WorkspaceSelector';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

// Tipo para os itens do menu
interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  page: string;
}

// Lista de itens do menu em ordem plana (conforme imagem de referencia)
const menuItems: MenuItem[] = [
  { icon: Link, label: 'Conexao Meta', page: 'meta-admin' },
  { icon: Target, label: 'Campanhas', page: 'campaigns' },
  { icon: RefreshCw, label: 'Meta Ads Sync', page: 'meta-sync' },
  { icon: Building2, label: 'Workspaces', page: 'workspaces' },
  { icon: Headphones, label: 'Ajuda e Suporte', page: 'support' },
  { icon: Settings, label: 'Configuracoes', page: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentPage = 'meta-admin',
  onPageChange
}) => {
  // Handler para click em item do menu
  const handlePageClick = (page: string) => {
    if (onPageChange) {
      onPageChange(page);
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-slate-50 border-r border-slate-200 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-center">
              <img
                src="/logotipo-adsops.fw.png"
                alt="AdsOPS"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          {/* Seletor de Workspace */}
          <div className="px-3 py-3 border-b border-slate-200">
            <WorkspaceSelector
              onNavigateToWorkspaces={() => handlePageClick('workspaces')}
              compact
            />
          </div>

          {/* Navegacao - Menu plano */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 space-y-1">
              {menuItems.map((item, index) => {
                const isItemActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handlePageClick(item.page)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left
                      transition-all duration-150 relative
                      ${isItemActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }
                    `}
                  >
                    {/* Borda lateral esquerda para item ativo */}
                    {isItemActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                    )}
                    <item.icon className={`
                      w-5 h-5 flex-shrink-0
                      ${isItemActive ? 'text-blue-600' : 'text-slate-400'}
                    `} />
                    <span className={`
                      text-[15px] tracking-tight
                      ${isItemActive ? 'font-semibold' : 'font-medium'}
                    `}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Card de Upgrade - Estilo da imagem de referencia */}
          <div className="p-3 flex-shrink-0">
            <div className="p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl relative overflow-hidden">
              {/* Elementos decorativos de fundo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-300/20 rounded-full blur-xl" />
              <div className="absolute top-4 right-4 w-16 h-16 bg-blue-500/30 rounded-full blur-lg" />

              {/* Ilustracao decorativa */}
              <div className="relative z-10 flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center shadow-lg border-2 border-white/30">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>

              <div className="relative z-10 text-center">
                <h3 className="font-bold text-white text-[15px] mb-1">Upgrade para Pro</h3>
                <p className="text-[12px] text-blue-100/80 mb-4 leading-relaxed">
                  Obtenha analises avancadas e campanhas ilimitadas
                </p>
                <button className="w-full bg-white text-blue-700 text-[13px] font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                  Fazer Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
