import React from 'react';
import { BarChart3, Settings, Database, Sparkles, Headphones, Zap } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

const menuItems = [
  { icon: BarChart3, label: 'Dashboard', page: 'overview' },
  { icon: Sparkles, label: 'Análise com IA', page: 'ai-insights' },
  { icon: Database, label: 'Fontes de Dados', page: 'data-sources' },
  { icon: Zap, label: 'Integração Meta', page: 'meta-integration', highlight: true },
  { icon: Headphones, label: 'Ajuda e Suporte', page: 'support' },
  { icon: Settings, label: 'Configurações', page: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  currentPage = 'overview',
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

          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handlePageClick(item.page)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors relative
                      ${currentPage === item.page
                        ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 border-r-2 border-blue-500'
                        : item.highlight
                        ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {item.highlight && (
                      <span className="absolute right-2 top-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
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