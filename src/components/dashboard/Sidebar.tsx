import React, { useState } from 'react';
import { Settings, Headphones, Building2, ChevronDown, Link, RefreshCw } from 'lucide-react';
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
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  items: MenuItem[];
}

// Itens do menu organizados por secao
const menuSections: MenuSection[] = [
  {
    id: 'meta',
    title: 'Meta Ads',
    icon: MetaIcon,
    accentColor: 'blue',
    items: [
      { icon: Link, label: 'Conexao Meta', page: 'meta-admin' },
      { icon: RefreshCw, label: 'Meta Ads Sync', page: 'meta-sync' },
    ],
  },
  {
    id: 'google',
    title: 'Google Ads',
    icon: GoogleIcon,
    accentColor: 'emerald',
    items: [
      { icon: Link, label: 'Conexao Google', page: 'google-admin' },
      { icon: RefreshCw, label: 'Google Ads Sync', page: 'google-sync' },
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
  // Estado para controlar quais secoes estao expandidas
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta: true,
    google: true,
  });

  // Alterna o estado de expansao de uma secao
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Handler para click em item do menu
  const handlePageClick = (page: string) => {
    if (onPageChange) {
      onPageChange(page);
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Verifica se algum item da secao esta ativo
  const isSectionActive = (section: MenuSection) => {
    return section.items.some(item => item.page === currentPage);
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

          {/* Navegacao */}
          <nav className="flex-1 overflow-y-auto py-4">
            {/* Secoes colapsaveis (Meta Ads, Google Ads) */}
            <div className="px-3 space-y-2">
              {menuSections.map((section) => {
                const isExpanded = expandedSections[section.id];
                const isActive = isSectionActive(section);

                return (
                  <div key={section.id} className="rounded-xl overflow-hidden">
                    {/* Header da secao - clicavel para expandir/colapsar */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                        transition-all duration-200 group
                        ${isActive
                          ? 'bg-white shadow-sm border border-slate-200'
                          : 'hover:bg-white/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5" />
                        <span className={`
                          font-semibold text-sm
                          ${isActive ? 'text-slate-900' : 'text-slate-700'}
                        `}>
                          {section.title}
                        </span>
                      </div>
                      <ChevronDown
                        className={`
                          w-4 h-4 text-slate-400 transition-transform duration-200
                          ${isExpanded ? 'rotate-180' : ''}
                        `}
                      />
                    </button>

                    {/* Itens da secao - com animacao */}
                    <div className={`
                      overflow-hidden transition-all duration-200 ease-in-out
                      ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}
                    `}>
                      <div className="pl-4 space-y-0.5">
                        {section.items.map((item, itemIndex) => {
                          const isItemActive = currentPage === item.page;
                          return (
                            <button
                              key={itemIndex}
                              onClick={() => handlePageClick(item.page)}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                                transition-all duration-150
                                ${isItemActive
                                  ? section.id === 'meta'
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'bg-emerald-50 text-emerald-700 font-medium'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }
                              `}
                            >
                              <item.icon className={`
                                w-4 h-4 flex-shrink-0
                                ${isItemActive
                                  ? section.id === 'meta' ? 'text-blue-500' : 'text-emerald-500'
                                  : 'text-slate-400'
                                }
                              `} />
                              <span className="text-sm">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separador */}
            <div className="my-4 mx-3 border-t border-slate-200" />

            {/* Itens gerais */}
            <div className="px-3 space-y-1">
              {generalMenuItems.map((item, index) => {
                const isItemActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handlePageClick(item.page)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-150
                      ${isItemActive
                        ? 'bg-white shadow-sm border border-slate-200 text-slate-900 font-medium'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                      }
                    `}
                  >
                    <item.icon className={`
                      w-5 h-5 flex-shrink-0
                      ${isItemActive ? 'text-slate-700' : 'text-slate-400'}
                    `} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Card de Upgrade */}
          <div className="p-3 flex-shrink-0">
            <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl relative overflow-hidden">
              {/* Decoracao de fundo */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-xl" />

              <div className="relative z-10">
                <h3 className="font-semibold text-white text-sm mb-1">Upgrade para Pro</h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Analises avancadas e campanhas ilimitadas
                </p>
                <button className="w-full bg-white text-slate-900 text-xs font-medium py-2 rounded-lg hover:bg-slate-100 transition-colors">
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
