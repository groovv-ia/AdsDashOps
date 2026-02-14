/**
 * CreativeFilters
 *
 * Barra de filtros avancados para busca de criativos.
 * Suporta filtros por campanha, periodo, formato, performance e busca textual.
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type { CreativeSearchFilters, CampaignOption, AdsetOption } from '../../lib/services/CreativeAnalysisService';

interface CreativeFiltersProps {
  filters: CreativeSearchFilters;
  campaignOptions: CampaignOption[];
  adsetOptions: AdsetOption[];
  onUpdateFilters: (partial: Partial<CreativeSearchFilters>) => void;
  onReset: () => void;
  onLoadAdsets: (campaignId: string) => void;
  loading?: boolean;
}

// Opcoes de tipo de criativo
const CREATIVE_TYPES = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'dynamic', label: 'Dinamico' },
];

// Opcoes de ordenacao
const SORT_OPTIONS = [
  { value: 'spend', label: 'Maior gasto' },
  { value: 'impressions', label: 'Mais impressoes' },
  { value: 'clicks', label: 'Mais cliques' },
  { value: 'ctr', label: 'Melhor CTR' },
  { value: 'conversions', label: 'Mais conversoes' },
  { value: 'cpc', label: 'Menor CPC' },
  { value: 'date', label: 'Mais recente' },
];

// Periodos predefinidos
const PRESET_PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '14 dias', days: 14 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 },
];

export const CreativeFilters: React.FC<CreativeFiltersProps> = ({
  filters,
  campaignOptions,
  adsetOptions,
  onUpdateFilters,
  onReset,
  onLoadAdsets,
  loading,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Conta filtros ativos
  const activeFilterCount = [
    filters.campaignIds?.length,
    filters.adsetIds?.length,
    filters.creativeType && filters.creativeType !== 'all',
    filters.searchQuery,
    filters.minCtr,
    filters.maxCtr,
    filters.minSpend,
    filters.maxSpend,
    filters.minImpressions,
  ].filter(Boolean).length;

  // Handler para selecao de periodo predefinido
  const handlePresetPeriod = (days: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    onUpdateFilters({
      dateFrom: from.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    });
  };

  // Handler para selecao de campanha
  const handleCampaignChange = (value: string) => {
    if (value === '') {
      onUpdateFilters({ campaignIds: undefined, adsetIds: undefined });
    } else {
      onUpdateFilters({ campaignIds: [value], adsetIds: undefined });
      onLoadAdsets(value);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra principal de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Campo de busca textual */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value || undefined })}
            placeholder="Buscar por titulo, texto ou descricao..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-gray-400 transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onUpdateFilters({ searchQuery: undefined })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Seletor de campanha */}
        <div className="relative min-w-[200px]">
          <select
            value={filters.campaignIds?.[0] || ''}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          >
            <option value="">Todas as campanhas</option>
            {campaignOptions.map(c => (
              <option key={c.entityId} value={c.entityId}>
                {c.name} ({c.adCount} ads)
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Seletor de tipo */}
        <div className="relative min-w-[150px]">
          <select
            value={filters.creativeType || 'all'}
            onChange={(e) => onUpdateFilters({ creativeType: e.target.value === 'all' ? undefined : e.target.value })}
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          >
            {CREATIVE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Seletor de ordenacao */}
        <div className="relative min-w-[160px]">
          <select
            value={filters.sortBy || 'spend'}
            onChange={(e) => onUpdateFilters({
              sortBy: e.target.value as CreativeSearchFilters['sortBy'],
              sortOrder: e.target.value === 'cpc' ? 'asc' : 'desc',
            })}
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Botao filtros avancados */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${showAdvanced || activeFilterCount > 0
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Botao reset */}
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* Periodos predefinidos */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-1.5">
          {PRESET_PERIODS.map(p => {
            const now = new Date();
            const from = new Date(now.getTime() - p.days * 24 * 60 * 60 * 1000);
            const isActive = filters.dateFrom === from.toISOString().split('T')[0];

            return (
              <button
                key={p.days}
                onClick={() => handlePresetPeriod(p.days)}
                className={`
                  px-3 py-1 rounded-lg text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Datas customizadas */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onUpdateFilters({ dateFrom: e.target.value || undefined })}
            className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-400">ate</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onUpdateFilters({ dateTo: e.target.value || undefined })}
            className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Painel de filtros avancados */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filtros avancados de performance
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Adset (se campanha selecionada) */}
            {filters.campaignIds && filters.campaignIds.length > 0 && adsetOptions.length > 0 && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Conjunto de anuncios</label>
                <select
                  value={filters.adsetIds?.[0] || ''}
                  onChange={(e) => onUpdateFilters({ adsetIds: e.target.value ? [e.target.value] : undefined })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Todos os conjuntos</option>
                  {adsetOptions.map(a => (
                    <option key={a.entityId} value={a.entityId}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Min impressoes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Impressoes min.</label>
              <input
                type="number"
                value={filters.minImpressions || ''}
                onChange={(e) => onUpdateFilters({ minImpressions: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Min gasto */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gasto min. (R$)</label>
              <input
                type="number"
                step="0.01"
                value={filters.minSpend || ''}
                onChange={(e) => onUpdateFilters({ minSpend: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Max gasto */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gasto max. (R$)</label>
              <input
                type="number"
                step="0.01"
                value={filters.maxSpend || ''}
                onChange={(e) => onUpdateFilters({ maxSpend: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Sem limite"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Min CTR */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CTR min. (%)</label>
              <input
                type="number"
                step="0.01"
                value={filters.minCtr || ''}
                onChange={(e) => onUpdateFilters({ minCtr: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0%"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Max CTR */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CTR max. (%)</label>
              <input
                type="number"
                step="0.01"
                value={filters.maxCtr || ''}
                onChange={(e) => onUpdateFilters({ maxCtr: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Sem limite"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeFilters;
