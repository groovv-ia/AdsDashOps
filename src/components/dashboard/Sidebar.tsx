// Sidebar principal do dashboard
// Integra animacoes do Framer Motion com o layout existente
// Expande ao passar o mouse e recolhe ao sair

import React, { useState } from 'react';
import { Settings, Headphones, Building2, ChevronDown, Link, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceSelector } from '../workspaces/WorkspaceSelector';
import { UpgradeBanner } from './UpgradeBanner';
import { cn } from '../../lib/utils';

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

// Item de Workspaces na navegacao principal
const workspacesItem: MenuItem = { icon: Building2, label: 'Workspaces', page: 'workspaces' };

// Itens do rodape - exibidos como icones horizontais
const footerItems: MenuItem[] = [
  { icon: Headphones, label: 'Ajuda e Suporte', page: 'support' },
  { icon: Settings, label: 'Configuracoes', page: 'settings' },
];

// Larguras da sidebar para animacao
const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

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

  // Estado para controlar hover na sidebar (desktop)
  const [isHovered, setIsHovered] = useState(false);

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

  // Componente de texto animado - aparece/desaparece com hover
  const AnimatedText: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
  }) => (
    <motion.span
      animate={{
        opacity: isHovered ? 1 : 0,
        width: isHovered ? 'auto' : 0,
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn('overflow-hidden whitespace-nowrap', className)}
    >
      {children}
    </motion.span>
  );

  // Componente de conteudo animado - aparece/desaparece com hover
  const AnimatedContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className
  }) => (
    <motion.div
      animate={{
        opacity: isHovered ? 1 : 0,
        scale: isHovered ? 1 : 0.95,
        height: isHovered ? 'auto' : 0,
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn('overflow-hidden', !isHovered && 'pointer-events-none', className)}
    >
      {children}
    </motion.div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-full w-64 bg-white z-50 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] lg:hidden"
          >
            <MobileSidebarContent
              currentPage={currentPage}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              handlePageClick={handlePageClick}
              isSectionActive={isSectionActive}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - com animacao de largura */}
      <motion.aside
        className="hidden lg:block h-full bg-white shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] flex-shrink-0 overflow-hidden"
        animate={{
          width: isHovered ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo - com animacao de tamanho */}
          <div className="p-4 pb-3 flex-shrink-0">
            <div className="flex items-center justify-center">
              <motion.img
                src="/logotipo-adsops.fw.png"
                alt="AdsOPS"
                className="object-contain"
                animate={{
                  height: isHovered ? 48 : 32,
                }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              />
            </div>
          </div>

          {/* Seletor de Workspace - animado */}
          <AnimatedContent className="px-3 py-2 border-b border-slate-50">
            <WorkspaceSelector
              onNavigateToWorkspaces={() => handlePageClick('workspaces')}
              compact
            />
          </AnimatedContent>

          {/* Container de navegacao */}
          <nav className="flex-1 py-3 overflow-hidden">
            {/* Secoes colapsaveis (Meta Ads, Google Ads) */}
            <div className="px-2 space-y-1">
              {menuSections.map((section) => {
                const isExpanded = expandedSections[section.id];
                const isActive = isSectionActive(section);

                return (
                  <div key={section.id} className="rounded-xl overflow-hidden">
                    {/* Header da secao - clicavel para expandir/colapsar */}
                    <button
                      onClick={() => isHovered && toggleSection(section.id)}
                      className={cn(
                        'w-full flex items-center px-3 py-2.5 rounded-lg',
                        'transition-all duration-200 group',
                        isHovered ? 'justify-between' : 'justify-center',
                        isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 flex-shrink-0" />
                        <AnimatedText className={cn(
                          'font-medium text-base leading-6',
                          isActive ? 'text-slate-900' : 'text-slate-700'
                        )}>
                          {section.title}
                        </AnimatedText>
                      </div>
                      <motion.div
                        animate={{
                          opacity: isHovered ? 1 : 0,
                          rotate: isExpanded ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </motion.div>
                    </button>

                    {/* Itens da secao - com animacao */}
                    <AnimatePresence>
                      {isHovered && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 mt-1 space-y-0.5">
                            {section.items.map((item, itemIndex) => {
                              const isItemActive = currentPage === item.page;
                              return (
                                <button
                                  key={itemIndex}
                                  onClick={() => handlePageClick(item.page)}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                                    'transition-all duration-150',
                                    isItemActive
                                      ? section.id === 'meta'
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'bg-emerald-50 text-emerald-700 font-medium'
                                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                  )}
                                >
                                  <item.icon className={cn(
                                    'w-[18px] h-[18px] flex-shrink-0',
                                    isItemActive
                                      ? section.id === 'meta' ? 'text-blue-500' : 'text-emerald-500'
                                      : 'text-slate-400'
                                  )} />
                                  <span className="text-sm font-medium leading-6">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Separador */}
            <div className="my-3 mx-2 border-t border-slate-100" />

            {/* Item Workspaces */}
            <div className="px-2">
              <button
                onClick={() => handlePageClick(workspacesItem.page)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                  'transition-all duration-150',
                  isHovered ? 'justify-start' : 'justify-center',
                  currentPage === workspacesItem.page
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <workspacesItem.icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  currentPage === workspacesItem.page ? 'text-slate-700' : 'text-slate-400'
                )} />
                <AnimatedText className="text-base font-medium leading-6">
                  {workspacesItem.label}
                </AnimatedText>
              </button>
            </div>
          </nav>

          {/* Banner de Upgrade Pro - acima do rodape */}
          <AnimatedContent>
            <UpgradeBanner onUpgradeClick={() => handlePageClick('upgrade')} />
          </AnimatedContent>

          {/* Rodape fixo com icones de acao */}
          <div className="flex-shrink-0 border-t border-slate-100">
            {/* Barra de icones horizontais centralizada */}
            <div className="flex items-center justify-center gap-2 px-2 py-3">
              {footerItems.map((item, index) => {
                const isItemActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handlePageClick(item.page)}
                    title={item.label}
                    className={cn(
                      'p-2.5 rounded-lg transition-all duration-150',
                      isItemActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

// Conteudo da sidebar mobile - extraido para componente separado
interface MobileSidebarContentProps {
  currentPage: string;
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  handlePageClick: (page: string) => void;
  isSectionActive: (section: MenuSection) => boolean;
}

const MobileSidebarContent: React.FC<MobileSidebarContentProps> = ({
  currentPage,
  expandedSections,
  toggleSection,
  handlePageClick,
  isSectionActive,
}) => {
  return (
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
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
                    'transition-all duration-200 group',
                    isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-5 h-5" />
                    <span className={cn(
                      'font-medium text-base leading-6',
                      isActive ? 'text-slate-900' : 'text-slate-700'
                    )}>
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-slate-400 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {/* Itens da secao - com animacao */}
                <div className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
                )}>
                  <div className="pl-4 space-y-0.5">
                    {section.items.map((item, itemIndex) => {
                      const isItemActive = currentPage === item.page;
                      return (
                        <button
                          key={itemIndex}
                          onClick={() => handlePageClick(item.page)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                            'transition-all duration-150',
                            isItemActive
                              ? section.id === 'meta'
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          )}
                        >
                          <item.icon className={cn(
                            'w-[18px] h-[18px] flex-shrink-0',
                            isItemActive
                              ? section.id === 'meta' ? 'text-blue-500' : 'text-emerald-500'
                              : 'text-slate-400'
                          )} />
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
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
              'transition-all duration-150',
              currentPage === workspacesItem.page
                ? 'bg-slate-50 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <workspacesItem.icon className={cn(
              'w-5 h-5 flex-shrink-0',
              currentPage === workspacesItem.page ? 'text-slate-700' : 'text-slate-400'
            )} />
            <span className="text-base font-medium leading-6">{workspacesItem.label}</span>
          </button>
        </div>
      </nav>

      {/* Banner de Upgrade Pro - acima do rodape */}
      <UpgradeBanner onUpgradeClick={() => handlePageClick('upgrade')} />

      {/* Rodape fixo com icones de acao */}
      <div className="flex-shrink-0 border-t border-slate-100">
        {/* Barra de icones horizontais centralizada */}
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          {footerItems.map((item, index) => {
            const isItemActive = currentPage === item.page;
            return (
              <button
                key={index}
                onClick={() => handlePageClick(item.page)}
                title={item.label}
                className={cn(
                  'p-2.5 rounded-lg transition-all duration-150',
                  isItemActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                )}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
