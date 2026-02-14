/**
 * CreativeComparisonView
 *
 * Visualizacao lado a lado de criativos selecionados.
 * Compara imagens, metricas de performance e textos.
 * Destaca o melhor criativo em cada metrica.
 */

import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Crown,
  TrendingUp,
  TrendingDown,
  Image,
  Play,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  MessageSquare,
  Users,
  Save,
  Sparkles,
} from 'lucide-react';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';

interface CreativeComparisonViewProps {
  creatives: EnrichedCreative[];
  onBack: () => void;
  onSave?: (name: string) => void;
}

// Metricas para comparacao com configuracao de "maior eh melhor"
const COMPARISON_METRICS = [
  { key: 'impressions', label: 'Impressoes', format: 'number', higherIsBetter: true, icon: Eye },
  { key: 'clicks', label: 'Cliques', format: 'number', higherIsBetter: true, icon: MousePointer },
  { key: 'ctr', label: 'CTR', format: 'percent', higherIsBetter: true, icon: TrendingUp },
  { key: 'cpc', label: 'CPC', format: 'currency', higherIsBetter: false, icon: DollarSign },
  { key: 'cpm', label: 'CPM', format: 'currency', higherIsBetter: false, icon: DollarSign },
  { key: 'spend', label: 'Investimento', format: 'currency', higherIsBetter: false, icon: DollarSign },
  { key: 'reach', label: 'Alcance', format: 'number', higherIsBetter: true, icon: Users },
  { key: 'conversions', label: 'Conversoes', format: 'number', higherIsBetter: true, icon: Target },
  { key: 'roas', label: 'ROAS', format: 'multiplier', higherIsBetter: true, icon: TrendingUp },
  { key: 'leads', label: 'Leads', format: 'number', higherIsBetter: true, icon: Target },
  { key: 'messagingConversations', label: 'Conversas', format: 'number', higherIsBetter: true, icon: MessageSquare },
] as const;

// Formata valor de metrica
function formatMetricValue(value: number, format: string): string {
  switch (format) {
    case 'percent': return `${value.toFixed(2)}%`;
    case 'currency': return `R$ ${value.toFixed(2).replace('.', ',')}`;
    case 'multiplier': return `${value.toFixed(2)}x`;
    default: {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
      return value.toFixed(0);
    }
  }
}

export const CreativeComparisonView: React.FC<CreativeComparisonViewProps> = ({
  creatives,
  onBack,
  onSave,
}) => {
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Encontra melhor valor para cada metrica
  const getBestIndex = (key: string, higherIsBetter: boolean): number => {
    let bestIdx = 0;
    let bestVal = creatives[0]?.metrics[key as keyof typeof creatives[0]['metrics']] as number || 0;

    for (let i = 1; i < creatives.length; i++) {
      const val = creatives[i]?.metrics[key as keyof typeof creatives[i]['metrics']] as number || 0;
      if (higherIsBetter ? val > bestVal : val < bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  // Calcula variacao percentual entre dois valores
  const getVariation = (val: number, best: number): number => {
    if (best === 0) return 0;
    return ((val - best) / best) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Comparacao de Criativos
            </h2>
            <p className="text-sm text-gray-500">
              {creatives.length} criativos selecionados para analise comparativa
            </p>
          </div>
        </div>

        {/* Botao salvar comparacao */}
        {onSave && (
          <div className="flex items-center gap-2">
            {showSave ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Nome da comparacao..."
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (saveName.trim()) {
                      onSave(saveName.trim());
                      setShowSave(false);
                      setSaveName('');
                    }
                  }}
                  disabled={!saveName.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg
                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowSave(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSave(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600
                  bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <Save className="w-4 h-4" />
                Salvar comparacao
              </button>
            )}
          </div>
        )}
      </div>

      {/* Area de imagens lado a lado */}
      <div className={`grid gap-4 ${
        creatives.length === 2 ? 'grid-cols-2'
        : creatives.length === 3 ? 'grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4'
      }`}>
        {creatives.map((creative, idx) => {
          const c = creative.creative;
          const imageUrl = c.cached_image_url || c.image_url_hd || c.image_url
            || c.cached_thumbnail_url || c.thumbnail_url;
          const isVideo = c.creative_type === 'video';
          const hasImg = imageUrl && !imgErrors[c.ad_id];

          return (
            <div key={c.ad_id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Label do criativo */}
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-amber-500' : 'bg-rose-500'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-sm font-medium text-gray-900 truncate flex-1" title={creative.adName}>
                  {creative.adName}
                </span>
                {creative.aiScore !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-[11px] font-bold text-amber-700">{creative.aiScore}</span>
                  </div>
                )}
              </div>

              {/* Imagem */}
              <div className="aspect-square bg-gray-50 relative">
                {hasImg ? (
                  <>
                    <img
                      src={imageUrl!}
                      alt={creative.adName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setImgErrors(prev => ({ ...prev, [c.ad_id]: true }))}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="bg-white/90 rounded-full p-2">
                          <Play className="w-5 h-5 text-gray-800 fill-gray-800" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-10 h-10 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Texto do criativo */}
              {(c.title || c.body) && (
                <div className="px-4 py-3 border-t border-gray-50 space-y-1">
                  {c.title && (
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{c.title}</p>
                  )}
                  {c.body && (
                    <p className="text-xs text-gray-500 line-clamp-3">{c.body}</p>
                  )}
                  {c.call_to_action && (
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full mt-1">
                      {c.call_to_action.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabela comparativa de metricas */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Comparativo de metricas</h3>
        </div>

        <div className="divide-y divide-gray-50">
          {COMPARISON_METRICS.map(metric => {
            const bestIdx = getBestIndex(metric.key, metric.higherIsBetter);
            const bestVal = creatives[bestIdx]?.metrics[metric.key as keyof typeof creatives[0]['metrics']] as number || 0;
            const Icon = metric.icon;

            return (
              <div key={metric.key} className="flex items-center">
                {/* Label da metrica */}
                <div className="w-40 flex-shrink-0 px-6 py-3 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                </div>

                {/* Valores para cada criativo */}
                <div className={`flex-1 grid ${
                  creatives.length === 2 ? 'grid-cols-2'
                  : creatives.length === 3 ? 'grid-cols-3'
                  : 'grid-cols-4'
                } divide-x divide-gray-50`}>
                  {creatives.map((creative, idx) => {
                    const val = creative.metrics[metric.key as keyof typeof creative.metrics] as number || 0;
                    const isBest = idx === bestIdx && creatives.length > 1;
                    const variation = getVariation(val, bestVal);

                    return (
                      <div
                        key={creative.creative.ad_id}
                        className={`px-4 py-3 text-center ${isBest ? 'bg-green-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {isBest && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`text-sm font-semibold ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                            {formatMetricValue(val, metric.format)}
                          </span>
                        </div>
                        {!isBest && variation !== 0 && (
                          <span className={`text-[10px] font-medium ${
                            (metric.higherIsBetter ? variation < 0 : variation > 0) ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo: criativo vencedor */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">Resumo da comparacao</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMPARISON_METRICS.filter(m => ['ctr', 'cpc', 'roas', 'conversions', 'impressions', 'spend'].includes(m.key)).map(metric => {
            const bestIdx = getBestIndex(metric.key, metric.higherIsBetter);
            const winner = creatives[bestIdx];
            if (!winner) return null;

            return (
              <div key={metric.key} className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  bestIdx === 0 ? 'bg-blue-500' : bestIdx === 1 ? 'bg-emerald-500' : bestIdx === 2 ? 'bg-amber-500' : 'bg-rose-500'
                }`}>
                  {String.fromCharCode(65 + bestIdx)}
                </div>
                <span className="text-xs text-gray-600">
                  Melhor <span className="font-semibold text-gray-800">{metric.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreativeComparisonView;
