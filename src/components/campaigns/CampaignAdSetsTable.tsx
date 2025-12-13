/**
 * CampaignAdSetsTable - Tabela de Conjuntos de Anuncios
 *
 * Exibe os conjuntos de anuncios (ad sets) de uma campanha com suas metricas,
 * permitindo ordenacao e filtragem por status.
 */

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import type { AdSetData } from '../../lib/services/CampaignExtractedDataService';

// ============================================
// Tipos e Interfaces
// ============================================

interface CampaignAdSetsTableProps {
  adSets: AdSetData[];
  loading?: boolean;
  onSelectAdSet?: (adSetId: string) => void;
  selectedAdSetId?: string;
}

type SortField = 'adset_name' | 'impressions' | 'clicks' | 'spend' | 'conversions' | 'ctr' | 'cpc' | 'roas';
type SortDirection = 'asc' | 'desc';

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Formata numero para exibicao
 */
function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Formata valor monetario
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/**
 * Formata percentual
 */
function formatPercent(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

/**
 * Retorna cor do badge de status
 */
function getStatusColor(status: string): string {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'ACTIVE':
    case 'ATIVO':
      return 'bg-green-100 text-green-700';
    case 'PAUSED':
    case 'PAUSADO':
      return 'bg-yellow-100 text-yellow-700';
    case 'COMPLETED':
    case 'FINALIZADO':
      return 'bg-blue-100 text-blue-700';
    case 'DELETED':
    case 'EXCLUIDO':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Traduz status para portugues
 */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ACTIVE': 'Ativo',
    'PAUSED': 'Pausado',
    'COMPLETED': 'Finalizado',
    'DELETED': 'Excluido',
    'UNKNOWN': 'Desconhecido',
  };
  return statusMap[status.toUpperCase()] || status;
}

// ============================================
// Componente Principal
// ============================================

export function CampaignAdSetsTable({
  adSets,
  loading = false,
  onSelectAdSet,
  selectedAdSetId,
}: CampaignAdSetsTableProps) {
  // Estado de ordenacao
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estado de filtro
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Status unicos para filtro
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(adSets.map(as => as.status.toUpperCase()));
    return Array.from(statuses);
  }, [adSets]);

  // Ordenar e filtrar adsets
  const sortedAndFilteredAdSets = useMemo(() => {
    let filtered = adSets;

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(as => as.status.toUpperCase() === statusFilter);
    }

    // Ordenar
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'adset_name':
          comparison = a.adset_name.localeCompare(b.adset_name);
          break;
        default:
          comparison = (a[sortField] as number) - (b[sortField] as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [adSets, sortField, sortDirection, statusFilter]);

  /**
   * Alterna ordenacao de uma coluna
   */
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  /**
   * Renderiza icone de ordenacao
   */
  function renderSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  }

  // Skeleton loading
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded mb-1" />
        ))}
      </div>
    );
  }

  // Estado vazio
  if (adSets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum conjunto de anuncios encontrado nesta campanha.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Barra de filtros */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {sortedAndFilteredAdSets.length} de {adSets.length} conjuntos de anuncios
        </p>

        {/* Filtro de status */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Status: {statusFilter === 'all' ? 'Todos' : translateStatus(statusFilter)}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showFilterMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowFilterMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    statusFilter === 'all' ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  Todos
                </button>
                {uniqueStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      statusFilter === status ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {translateStatus(status)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              {onSelectAdSet && <th className="w-10" />}
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('adset_name')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                >
                  Nome {renderSortIcon('adset_name')}
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-700">Status</th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('impressions')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Impressoes {renderSortIcon('impressions')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('clicks')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Cliques {renderSortIcon('clicks')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('spend')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Gastos {renderSortIcon('spend')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('conversions')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  Conversoes {renderSortIcon('conversions')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('ctr')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  CTR {renderSortIcon('ctr')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('cpc')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  CPC {renderSortIcon('cpc')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('roas')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900 ml-auto"
                >
                  ROAS {renderSortIcon('roas')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredAdSets.map(adSet => {
              const isSelected = selectedAdSetId === adSet.adset_id;

              return (
                <tr
                  key={adSet.adset_id}
                  className={`
                    border-b border-gray-100 transition-colors
                    ${onSelectAdSet ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                  `}
                  onClick={() => onSelectAdSet?.(adSet.adset_id)}
                >
                  {/* Botao de expansao */}
                  {onSelectAdSet && (
                    <td className="py-3 px-2">
                      {isSelected ? (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  )}

                  {/* Nome */}
                  <td className="py-3 px-2">
                    <div className="max-w-[200px]">
                      <p className="font-medium text-gray-900 truncate" title={adSet.adset_name}>
                        {adSet.adset_name}
                      </p>
                      <p className="text-xs text-gray-500">ID: {adSet.adset_id}</p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(adSet.status)}`}>
                      {translateStatus(adSet.status)}
                    </span>
                  </td>

                  {/* Impressoes */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(adSet.impressions)}
                  </td>

                  {/* Cliques */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(adSet.clicks)}
                  </td>

                  {/* Gastos */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(adSet.spend)}
                  </td>

                  {/* Conversoes */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(adSet.conversions)}
                  </td>

                  {/* CTR */}
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatPercent(adSet.ctr)}
                  </td>

                  {/* CPC */}
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatCurrency(adSet.cpc)}
                  </td>

                  {/* ROAS */}
                  <td className="py-3 px-2 text-right">
                    <span className={`font-medium ${
                      adSet.roas >= 3 ? 'text-green-600' :
                      adSet.roas >= 1 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {adSet.roas.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total de Impressoes</p>
            <p className="font-semibold text-gray-900">
              {formatNumber(sortedAndFilteredAdSets.reduce((sum, as) => sum + as.impressions, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Cliques</p>
            <p className="font-semibold text-gray-900">
              {formatNumber(sortedAndFilteredAdSets.reduce((sum, as) => sum + as.clicks, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Gastos</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(sortedAndFilteredAdSets.reduce((sum, as) => sum + as.spend, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Conversoes</p>
            <p className="font-semibold text-gray-900">
              {formatNumber(sortedAndFilteredAdSets.reduce((sum, as) => sum + as.conversions, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
