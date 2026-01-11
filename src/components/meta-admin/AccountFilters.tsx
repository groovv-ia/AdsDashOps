/**
 * AccountFilters
 *
 * Componente de busca e filtros para a lista de contas Meta Ads.
 * Permite buscar por nome, filtrar por status e ordenar resultados.
 */

import React from 'react';
import { Search, Filter, SortAsc, X, Activity, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

// Opcoes de status para filtro
export type StatusFilter = 'all' | 'active' | 'paused';

// Opcoes de sincronizacao para filtro
export type SyncFilter = 'all' | 'synced' | 'not-synced' | 'error';

// Opcoes de atividade recente para filtro (últimas 48h)
export type ActivityFilter = 'all' | 'active-now' | 'inactive' | 'no-recent-activity';

// Opcoes de ordenacao
export type SortOption = 'name-asc' | 'name-desc' | 'spend-desc' | 'date-desc' | 'activity-desc' | 'recent-spend-desc';

// Interface das props do componente
interface AccountFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  syncFilter: SyncFilter;
  onSyncFilterChange: (sync: SyncFilter) => void;
  activityFilter: ActivityFilter;
  onActivityFilterChange: (activity: ActivityFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  filteredCount: number;
  activeAccountsCount?: number; // Número de contas ativas agora (com atividade nas últimas 48h)
}

export const AccountFilters: React.FC<AccountFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  syncFilter,
  onSyncFilterChange,
  activityFilter,
  onActivityFilterChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  activeAccountsCount = 0,
}) => {
  // Verifica se ha filtros ativos (alem da busca)
  const hasActiveFilters = statusFilter !== 'all' || syncFilter !== 'all' || activityFilter !== 'all';

  // Limpa todos os filtros
  const clearAllFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onSyncFilterChange('all');
    onActivityFilterChange('all');
  };

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar contas por nome..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Limpar busca"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filtros e ordenacao */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro por status da conta */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
          </select>
        </div>

        {/* Filtro por status de sincronizacao */}
        <div className="flex items-center gap-2">
          <select
            value={syncFilter}
            onChange={(e) => onSyncFilterChange(e.target.value as SyncFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas sincronizações</option>
            <option value="synced">Sincronizadas</option>
            <option value="not-synced">Não sincronizadas</option>
            <option value="error">Com erro</option>
          </select>
        </div>

        {/* Filtro por atividade recente (últimas 48h) */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <select
            value={activityFilter}
            onChange={(e) => onActivityFilterChange(e.target.value as ActivityFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toda atividade</option>
            <option value="active-now">Ativas agora (48h)</option>
            <option value="inactive">Sem atividade recente</option>
            <option value="no-recent-activity">Anúncios ativos sem métricas</option>
          </select>
        </div>

        {/* Ordenacao */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="spend-desc">Maior gasto (total)</option>
            <option value="recent-spend-desc">Maior gasto (48h)</option>
            <option value="activity-desc">Mais ativas (48h)</option>
            <option value="date-desc">Última sincronização</option>
          </select>
        </div>

        {/* Botao limpar filtros */}
        {(hasActiveFilters || searchQuery) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={clearAllFilters}
            className="ml-auto"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Card de estatísticas de atividade */}
      {activeAccountsCount > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {activeAccountsCount} {activeAccountsCount === 1 ? 'conta ativa' : 'contas ativas'} agora
              </p>
              <p className="text-xs text-emerald-700">
                Com atividade nas últimas 48 horas
              </p>
            </div>
          </div>
          <button
            onClick={() => onActivityFilterChange('active-now')}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Filtrar ativas
          </button>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Exibindo <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> contas
        </span>

        {/* Indicadores de filtros ativos */}
        {(hasActiveFilters || searchQuery) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtros ativos:</span>
            <div className="flex gap-1">
              {searchQuery && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  Busca
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                  Status
                </span>
              )}
              {syncFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  Sincronização
                </span>
              )}
              {activityFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                  Atividade
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountFilters;
