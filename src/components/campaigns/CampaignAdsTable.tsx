/**
 * CampaignAdsTable - Tabela de Anuncios Individuais
 *
 * Exibe os anuncios de uma campanha com suas metricas,
 * permitindo ordenacao, filtragem e visualizacao de thumbnails.
 */

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, ChevronDown, Image, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AdData } from '../../lib/services/CampaignExtractedDataService';

// ============================================
// Tipos e Interfaces
// ============================================

interface CampaignAdsTableProps {
  ads: AdData[];
  loading?: boolean;
  showAdSetColumn?: boolean;
}

type SortField = 'ad_name' | 'adset_name' | 'impressions' | 'clicks' | 'spend' | 'conversions' | 'ctr' | 'cpc' | 'roas';
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

/**
 * Retorna badge de performance baseado no ROAS
 */
function getPerformanceBadge(roas: number): { color: string; icon: typeof TrendingUp; label: string } {
  if (roas >= 3) {
    return { color: 'text-green-600', icon: TrendingUp, label: 'Excelente' };
  }
  if (roas >= 1.5) {
    return { color: 'text-blue-600', icon: TrendingUp, label: 'Bom' };
  }
  if (roas >= 1) {
    return { color: 'text-yellow-600', icon: Minus, label: 'Regular' };
  }
  return { color: 'text-red-600', icon: TrendingDown, label: 'Baixo' };
}

// ============================================
// Componente Principal
// ============================================

export function CampaignAdsTable({
  ads,
  loading = false,
  showAdSetColumn = true,
}: CampaignAdsTableProps) {
  // Estado de ordenacao
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estado de filtro
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Status unicos para filtro
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(ads.map(ad => ad.status.toUpperCase()));
    return Array.from(statuses);
  }, [ads]);

  // Ordenar e filtrar ads
  const sortedAndFilteredAds = useMemo(() => {
    let filtered = ads;

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ad => ad.status.toUpperCase() === statusFilter);
    }

    // Ordenar
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'ad_name':
          comparison = a.ad_name.localeCompare(b.ad_name);
          break;
        case 'adset_name':
          comparison = a.adset_name.localeCompare(b.adset_name);
          break;
        default:
          comparison = (a[sortField] as number) - (b[sortField] as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [ads, sortField, sortDirection, statusFilter]);

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
  if (ads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Image className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Nenhum anuncio encontrado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Barra de filtros */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {sortedAndFilteredAds.length} de {ads.length} anuncios
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
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('ad_name')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                >
                  Anuncio {renderSortIcon('ad_name')}
                </button>
              </th>
              {showAdSetColumn && (
                <th className="text-left py-3 px-2">
                  <button
                    onClick={() => handleSort('adset_name')}
                    className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                  >
                    Conjunto {renderSortIcon('adset_name')}
                  </button>
                </th>
              )}
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
              <th className="text-center py-3 px-2 font-medium text-gray-700">Performance</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredAds.map(ad => {
              const performance = getPerformanceBadge(ad.roas);
              const PerformanceIcon = performance.icon;

              return (
                <tr
                  key={ad.ad_id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Anuncio com thumbnail */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      {ad.thumbnail_url ? (
                        <img
                          src={ad.thumbnail_url}
                          alt={ad.ad_name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Image className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]" title={ad.ad_name}>
                          {ad.ad_name}
                        </p>
                        <p className="text-xs text-gray-500">ID: {ad.ad_id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Conjunto */}
                  {showAdSetColumn && (
                    <td className="py-3 px-2">
                      <p className="text-sm text-gray-700 truncate max-w-[120px]" title={ad.adset_name}>
                        {ad.adset_name || '-'}
                      </p>
                    </td>
                  )}

                  {/* Status */}
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                      {translateStatus(ad.status)}
                    </span>
                  </td>

                  {/* Impressoes */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(ad.impressions)}
                  </td>

                  {/* Cliques */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(ad.clicks)}
                  </td>

                  {/* Gastos */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(ad.spend)}
                  </td>

                  {/* Conversoes */}
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatNumber(ad.conversions)}
                  </td>

                  {/* CTR */}
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatPercent(ad.ctr)}
                  </td>

                  {/* CPC */}
                  <td className="py-3 px-2 text-right text-gray-700">
                    {formatCurrency(ad.cpc)}
                  </td>

                  {/* ROAS */}
                  <td className="py-3 px-2 text-right">
                    <span className={`font-medium ${
                      ad.roas >= 3 ? 'text-green-600' :
                      ad.roas >= 1 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {ad.roas.toFixed(2)}x
                    </span>
                  </td>

                  {/* Badge de Performance */}
                  <td className="py-3 px-2 text-center">
                    <div className={`inline-flex items-center gap-1 ${performance.color}`}>
                      <PerformanceIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{performance.label}</span>
                    </div>
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
              {formatNumber(sortedAndFilteredAds.reduce((sum, ad) => sum + ad.impressions, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Cliques</p>
            <p className="font-semibold text-gray-900">
              {formatNumber(sortedAndFilteredAds.reduce((sum, ad) => sum + ad.clicks, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Gastos</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(sortedAndFilteredAds.reduce((sum, ad) => sum + ad.spend, 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total de Conversoes</p>
            <p className="font-semibold text-gray-900">
              {formatNumber(sortedAndFilteredAds.reduce((sum, ad) => sum + ad.conversions, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
