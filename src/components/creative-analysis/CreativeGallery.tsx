/**
 * CreativeGallery
 *
 * Grid responsivo de cards de criativos.
 * Suporta selecao multipla, loading e paginacao infinita.
 * Passa estado de loading real-time por criativo para cada card.
 */

import React, { useRef, useCallback } from 'react';
import {
  Loader2,
  ImageOff,
  CheckSquare,
  Square,
  GitCompare,
} from 'lucide-react';
import { CreativeCard } from './CreativeCard';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';
import type { CreativeLoadingState } from '../../hooks/useCreativeAnalysis';

interface CreativeGalleryProps {
  creatives: EnrichedCreative[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  selectedIds: Set<string>;
  creativeLoadingStates: Record<string, CreativeLoadingState>;
  onToggleSelect: (adId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onLoadMore: () => void;
  onCreativeClick: (creative: EnrichedCreative) => void;
  onCompare: () => void;
}

export const CreativeGallery: React.FC<CreativeGalleryProps> = ({
  creatives,
  loading,
  hasMore,
  total,
  selectedIds,
  creativeLoadingStates,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onLoadMore,
  onCreativeClick,
  onCompare,
}) => {
  // Ref para observer de scroll infinito
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, onLoadMore]);

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar de selecao e contagem */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Contagem de resultados */}
          <span className="text-sm text-gray-500">
            {loading && creatives.length === 0
              ? 'Buscando criativos...'
              : `${total} criativo${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
            }
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botoes de selecao */}
          {creatives.length > 0 && (
            <>
              <button
                onClick={hasSelection ? onClearSelection : onSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600
                  hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                {hasSelection ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5" />
                )}
                {hasSelection ? `${selectedIds.size} selecionados` : 'Selecionar todos'}
              </button>

              {/* Botao comparar (visivel quando 2+ selecionados) */}
              {selectedIds.size >= 2 && (
                <button
                  onClick={onCompare}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white
                    bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Comparar ({selectedIds.size})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Estado vazio */}
      {!loading && creatives.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Nenhum criativo encontrado
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Ajuste os filtros ou sincronize dados de campanhas para ver criativos aqui.
          </p>
        </div>
      )}

      {/* Grid de cards */}
      {creatives.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {creatives.map(creative => {
            const adId = creative.creative.ad_id;
            const loadingState = creativeLoadingStates[adId];

            return (
              <CreativeCard
                key={adId}
                creative={creative}
                isSelected={selectedIds.has(adId)}
                isLoadingImage={loadingState?.isLoading || false}
                onToggleSelect={onToggleSelect}
                onClick={onCreativeClick}
              />
            );
          })}
        </div>
      )}

      {/* Loading spinner para carga inicial */}
      {loading && creatives.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-500">Carregando criativos...</span>
          </div>
        </div>
      )}

      {/* Sentinel para scroll infinito + loading de paginacao */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando mais...
            </div>
          )}
        </div>
      )}

      {/* Indicador de fim da lista */}
      {!hasMore && creatives.length > 0 && creatives.length >= 24 && (
        <div className="text-center py-4">
          <span className="text-xs text-gray-400">
            Todos os {total} criativos foram carregados
          </span>
        </div>
      )}
    </div>
  );
};

export default CreativeGallery;
