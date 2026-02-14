/**
 * CreativeAnalysisPage
 *
 * Pagina principal do modulo de analise de criativos.
 * Integra filtros, galeria, comparacao, timeline e painel de detalhes.
 * Recebe `platform` como prop para funcionar tanto no contexto Meta quanto Google.
 * Dispara busca real-time de imagens HD automaticamente apos cada busca.
 */

import React, { useState, useCallback } from 'react';
import {
  LayoutGrid,
  GitCompare,
  LineChart,
  Palette,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCreativeAnalysis, type ViewMode } from '../../hooks/useCreativeAnalysis';
import { saveComparison, addCreativeTag, removeCreativeTag } from '../../lib/services/CreativeAnalysisService';
import { CreativeFilters } from './CreativeFilters';
import { CreativeGallery } from './CreativeGallery';
import { CreativeComparisonView } from './CreativeComparisonView';
import { CreativePerformanceTimeline } from './CreativePerformanceTimeline';
import { CreativeDetailPanel } from './CreativeDetailPanel';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';

interface CreativeAnalysisPageProps {
  platform: 'meta' | 'google';
}

// Tabs de visualizacao
const VIEW_TABS: Array<{ mode: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { mode: 'gallery', label: 'Galeria', icon: LayoutGrid },
  { mode: 'comparison', label: 'Comparacao', icon: GitCompare },
  { mode: 'timeline', label: 'Timeline', icon: LineChart },
];

export const CreativeAnalysisPage: React.FC<CreativeAnalysisPageProps> = ({ platform }) => {
  // Estado do hook principal (agora inclui fetchingImages e creativeLoadingStates)
  const {
    creatives,
    total,
    hasMore,
    loading,
    fetchingImages,
    error,
    filters,
    viewMode,
    selectedIds,
    campaignOptions,
    adsetOptions,
    creativeLoadingStates,
    updateFilters,
    resetFilters,
    search,
    loadMore,
    toggleSelect,
    selectAll,
    clearSelection,
    setViewMode,
    getSelectedCreatives,
    loadAdsetOptions,
    refreshCampaignOptions,
  } = useCreativeAnalysis(platform);

  // Estado do painel de detalhe lateral
  const [detailCreative, setDetailCreative] = useState<EnrichedCreative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Abre painel de detalhe ao clicar em um criativo
  const handleCreativeClick = useCallback((creative: EnrichedCreative) => {
    setDetailCreative(creative);
    setDetailOpen(true);
  }, []);

  // Fecha painel de detalhe
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setDetailCreative(null), 300);
  }, []);

  // Entra no modo comparacao com criativos selecionados
  const handleCompare = useCallback(() => {
    if (selectedIds.size >= 2) {
      setViewMode('comparison');
    }
  }, [selectedIds, setViewMode]);

  // Salva comparacao no banco
  const handleSaveComparison = useCallback(async (name: string) => {
    const adIds = [...selectedIds];
    await saveComparison(name, adIds, platform, filters.dateFrom, filters.dateTo, filters as unknown as Record<string, unknown>);
  }, [selectedIds, platform, filters]);

  // Handler para adicionar tag
  const handleAddTag = useCallback(async (adId: string, tag: string) => {
    const success = await addCreativeTag(adId, tag);
    if (success) {
      search();
    }
  }, [search]);

  // Handler para remover tag
  const handleRemoveTag = useCallback(async (adId: string, tag: string) => {
    const success = await removeCreativeTag(adId, tag);
    if (success) {
      search();
    }
  }, [search]);

  // Volta da comparacao/timeline para galeria
  const handleBackToGallery = useCallback(() => {
    setViewMode('gallery');
  }, [setViewMode]);

  // Atualiza detailCreative quando os criativos sao atualizados pelo fetch real-time
  const currentDetailCreative = detailCreative
    ? creatives.find(c => c.creative.ad_id === detailCreative.creative.ad_id) || detailCreative
    : null;

  // Titulo da pagina baseado na plataforma
  const platformTitle = platform === 'meta' ? 'Meta Ads' : 'Google Ads';

  return (
    <div className="space-y-6">
      {/* Header da pagina */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            platform === 'meta' ? 'bg-blue-50' : 'bg-emerald-50'
          }`}>
            <Palette className={`w-6 h-6 ${
              platform === 'meta' ? 'text-blue-600' : 'text-emerald-600'
            }`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Analise de Criativos
            </h1>
            <p className="text-sm text-gray-500">
              Explore, compare e analise seus criativos do {platformTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de fetch real-time em andamento */}
          {fetchingImages && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs font-medium text-blue-600">Buscando imagens HD...</span>
            </div>
          )}

          {/* Tabs de modo de visualizacao */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {VIEW_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.mode;
              // Desabilita comparison/timeline se nao tem criativos selecionados
              const isDisabled = (tab.mode === 'comparison' || tab.mode === 'timeline')
                && selectedIds.size < 2 && viewMode !== tab.mode;

              return (
                <button
                  key={tab.mode}
                  onClick={() => !isDisabled && setViewMode(tab.mode)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                  title={isDisabled ? 'Selecione 2+ criativos para usar este modo' : tab.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Botao de atualizar */}
          <button
            onClick={() => {
              refreshCampaignOptions();
              search();
            }}
            disabled={loading}
            className={`
              p-2.5 rounded-xl border transition-all
              ${loading
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros (sempre visiveis no modo galeria) */}
      {viewMode === 'gallery' && (
        <CreativeFilters
          filters={filters}
          campaignOptions={campaignOptions}
          adsetOptions={adsetOptions}
          onUpdateFilters={updateFilters}
          onReset={resetFilters}
          onLoadAdsets={loadAdsetOptions}
          loading={loading}
        />
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao buscar criativos</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={search}
            className="ml-auto text-sm font-medium text-red-700 hover:text-red-900 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Conteudo principal baseado no modo de visualizacao */}
      {viewMode === 'gallery' && (
        <CreativeGallery
          creatives={creatives}
          loading={loading}
          hasMore={hasMore}
          total={total}
          selectedIds={selectedIds}
          creativeLoadingStates={creativeLoadingStates}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onLoadMore={loadMore}
          onCreativeClick={handleCreativeClick}
          onCompare={handleCompare}
        />
      )}

      {viewMode === 'comparison' && (
        <CreativeComparisonView
          creatives={getSelectedCreatives()}
          creativeLoadingStates={creativeLoadingStates}
          onBack={handleBackToGallery}
          onSave={handleSaveComparison}
        />
      )}

      {viewMode === 'timeline' && (
        <CreativePerformanceTimeline
          creatives={getSelectedCreatives()}
          onBack={handleBackToGallery}
        />
      )}

      {/* Painel de detalhe lateral -- usa criativo atualizado pelo fetch real-time */}
      <CreativeDetailPanel
        creative={currentDetailCreative}
        isOpen={detailOpen}
        onClose={handleCloseDetail}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        isLoadingCreative={
          currentDetailCreative
            ? creativeLoadingStates[currentDetailCreative.creative.ad_id]?.isLoading || false
            : false
        }
      />
    </div>
  );
};

export default CreativeAnalysisPage;
