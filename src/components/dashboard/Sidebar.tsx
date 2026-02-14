import React, { useState } from 'react';
import { Settings, Headphones, Building2, ChevronDown, Link, RefreshCw, BarChart3, Palette } from 'lucide-react';
import { WorkspaceSelector } from '../workspaces/WorkspaceSelector';
import { UpgradeBanner } from './UpgradeBanner';

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
      { icon: Palette, label: 'Analise de Criativos', page: 'meta-creative-analysis' },
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
      { icon: BarChart3, label: 'Ver Campanhas', page: 'google-campaigns' },
      { icon: Palette, label: 'Analise de Criativos', page: 'google-creative-analysis' },
    ],
  },
];

// Item de Workspaces na navegacao principal
const workspacesItem: MenuItem = { icon: Building2, label: 'Workspaces', page: 'workspaces' };

// Itens de suporte e configuracoes - exibidos abaixo do Workspaces
const supportItems: MenuItem[] = [
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
  // Google Ads inicia recolhida para economizar espaco vertical
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta: true,
    google: false,
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
  // Inclui paginas de detalhes que nao estao no menu mas pertencem a secao
  const isSectionActive = (section: MenuSection) => {
    const sectionPages = section.items.map(item => item.page);
    // Adiciona paginas de detalhes para cada secao
    if (section.id === 'google') {
      sectionPages.push('google-campaign-detail');
    }
    return sectionPages.includes(currentPage);
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
          fixed left-0 top-0 h-full w-64 bg-white z-50
          shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo - tamanho aumentado para maior destaque */}
          <div className="p-6 pb-4 flex-shrink-0">
            <div className="flex items-center justify-center">
              <img
                src="/logotipo-adsops.fw.png"
                alt="AdsOPS"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>

          {/* Seletor de Workspace */}
          <div className="px-3 py-3 border-b border-slate-50">
            <WorkspaceSelector
              onNavigateToWorkspaces={() => handlePageClick('workspaces')}
              compact
            />
          </div>

          {/* Container de navegacao simplificado sem scroll */}
          <nav className="flex-1 py-3">
            {/* Secoes colapsaveis (Meta Ads, Google Ads) */}
            <div className="px-3 space-y-1">
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
                          ? 'bg-slate-50'
                          : 'hover:bg-slate-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5" />
                        <span className={`
                          font-medium text-base leading-6
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
                      ${isExpanded ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}
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
                                    : 'bg-[#EEEFF9] text-[#4C53F7] font-medium'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }
                              `}
                            >
                              <item.icon className={`
                                w-[18px] h-[18px] flex-shrink-0
                                ${isItemActive
                                  ? section.id === 'meta' ? 'text-blue-500' : 'text-[#4C53F7]'
                                  : 'text-slate-400'
                                }
                              `} />
                              <span className="text-sm font-medium leading-6">{item.label}</span>
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
            <div className="my-3 mx-3 border-t border-slate-100" />

            {/* Item Workspaces */}
            <div className="px-3">
              <button
                onClick={() => handlePageClick(workspacesItem.page)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150
                  ${currentPage === workspacesItem.page
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <workspacesItem.icon className={`
                  w-5 h-5 flex-shrink-0
                  ${currentPage === workspacesItem.page ? 'text-slate-700' : 'text-slate-400'}
                `} />
                <span className="text-base font-medium leading-6">{workspacesItem.label}</span>
              </button>
            </div>

            {/* Itens de Suporte e Configuracoes */}
            <div className="px-3 space-y-0.5 mt-1">
              {supportItems.map((item, index) => {
                const isItemActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handlePageClick(item.page)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-150
                      ${isItemActive
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <item.icon className={`
                      w-5 h-5 flex-shrink-0
                      ${isItemActive ? 'text-slate-700' : 'text-slate-400'}
                    `} />
                    <span className="text-base font-medium leading-6">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Banner de Upgrade Pro no rodape */}
          <UpgradeBanner onUpgradeClick={() => handlePageClick('upgrade')} />
        </div>
      </aside>
    </>
  );
};
