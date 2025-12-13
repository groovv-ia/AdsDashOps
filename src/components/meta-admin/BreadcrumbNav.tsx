/**
 * BreadcrumbNav
 *
 * Componente de navegacao breadcrumb para drill-down na pagina de sync.
 * Permite navegar entre: Contas > Conta Selecionada > Campanhas > etc
 */

import React from 'react';
import { ChevronRight, Home, Building2, Target, Layers, FileText } from 'lucide-react';

// Tipo de item do breadcrumb
export interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'home' | 'account' | 'campaign' | 'adset' | 'ad';
  onClick?: () => void;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem) => void;
  className?: string;
}

// Icones para cada tipo de item
const TYPE_ICONS: Record<BreadcrumbItem['type'], React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  account: <Building2 className="w-4 h-4" />,
  campaign: <Target className="w-4 h-4" />,
  adset: <Layers className="w-4 h-4" />,
  ad: <FileText className="w-4 h-4" />,
};

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  items,
  onNavigate,
  className = '',
}) => {
  if (items.length === 0) return null;

  return (
    <nav
      className={`flex items-center space-x-1 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        return (
          <React.Fragment key={item.id}>
            {/* Separador (exceto no primeiro item) */}
            {!isFirst && (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}

            {/* Item do breadcrumb */}
            {isLast ? (
              // Ultimo item - nao clicavel
              <span className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-900 font-medium">
                <span className="text-gray-500">
                  {TYPE_ICONS[item.type]}
                </span>
                <span className="max-w-[200px] truncate">{item.label}</span>
              </span>
            ) : (
              // Items anteriores - clicaveis
              <button
                onClick={() => onNavigate(item)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-400">
                  {TYPE_ICONS[item.type]}
                </span>
                <span className="max-w-[150px] truncate">{item.label}</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/**
 * Hook para gerenciar estado do breadcrumb
 */
export interface NavigationState {
  currentView: 'accounts' | 'account-detail' | 'campaign-detail';
  selectedAccountId: string | null;
  selectedAccountName: string | null;
  selectedCampaignId: string | null;
  selectedCampaignName: string | null;
}

export const createBreadcrumbItems = (state: NavigationState): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    {
      id: 'home',
      label: 'Contas',
      type: 'home',
    },
  ];

  // Se uma conta esta selecionada
  if (state.selectedAccountId && state.selectedAccountName) {
    items.push({
      id: state.selectedAccountId,
      label: state.selectedAccountName,
      type: 'account',
    });
  }

  // Se uma campanha esta selecionada
  if (state.selectedCampaignId && state.selectedCampaignName) {
    items.push({
      id: state.selectedCampaignId,
      label: state.selectedCampaignName,
      type: 'campaign',
    });
  }

  return items;
};
