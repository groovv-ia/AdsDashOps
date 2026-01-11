import React from 'react';
import { Settings, Headphones, Building2 } from 'lucide-react';
import { WorkspaceSelector } from '../workspaces/WorkspaceSelector';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

// Componente para renderizar o icone da Meta
const MetaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/meta-icon.svg" alt="Meta" className={className} />
);

// Componente para renderizar o icone do Google Ads
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/google-ads-icon.svg" alt="Google Ads" className={className} />
);

// Tipo para os itens do menu - suporta icones Lucide ou imagens customizadas
interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  page: string;
}

// Tipo para secao do menu com titulo e itens
interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Itens do menu organizados por secao
const menuSections: MenuSection[] = [
  {
    title: 'Meta Ads',
    items: [
      { icon: MetaIcon, label: 'Conexao Meta', page: 'meta-admin' },
      { icon: MetaIcon, label: 'Meta Ads Sync', page: 'meta-sync' },
    ],
  },
  {
    title: 'Google Ads',
    items: [
      { icon: GoogleIcon, label: 'Conexao Google', page: 'google-admin' },
      { icon: GoogleIcon, label: 'Google Ads Sync', page: 'google-sync' },
    ],
  },
];

// Itens gerais do menu (sem secao)
const generalMenuItems: MenuItem[] = [
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
  const handlePageClick = (page: string) => {
    if (onPageChange) {
      onPageChange(page);
    }
    // Close sidebar on mobile after selection
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
          fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200/50 shadow-lg z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
            <div className="flex items-center justify-center">
              <img
                src="/logotipo-adsops.fw.png"
                alt="AdsOPS"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>

          {/* Seletor de Workspace */}
          <div className="px-4 py-3 border-b border-gray-200/50">
            <WorkspaceSelector
              onNavigateToWorkspaces={() => handlePageClick('workspaces')}
              compact
            />
          </div>

          <nav className="p-4 flex-1 overflow-y-auto">
            {/* Secoes agrupadas (Meta Ads, Google Ads) */}
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-4">
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <button
                        onClick={() => handlePageClick(item.page)}
                        className={`
                          w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${currentPage === item.page
                            ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-600 border-l-2 border-blue-500'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }
                        `}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Separador */}
            <div className="my-4 border-t border-gray-200/50" />

            {/* Itens gerais */}
            <ul className="space-y-1">
              {generalMenuItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handlePageClick(item.page)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                      ${currentPage === item.page
                        ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-600 border-l-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 flex-shrink-0">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200/50 relative overflow-hidden">
              {/* Background Image */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <img 
                  src="/a-confident-smiling-woma33.jpg" 
                  alt="Upgrade" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Profile Image */}
                <div className="flex justify-center mb-3">
                  <img 
                    src="/a-confident-smiling-woma33.jpg" 
                    alt="Upgrade to Pro" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                </div>
                
                <h3 className="font-medium text-gray-900 text-sm mb-1 text-center">Upgrade para Pro</h3>
                <p className="text-xs text-gray-600 mb-3 text-center">Obtenha análises avançadas e campanhas ilimitadas</p>
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs py-2 rounded-md hover:shadow-lg transition-shadow">
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