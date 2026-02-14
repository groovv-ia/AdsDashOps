/**
 * CreativeCard
 *
 * Card individual de criativo na galeria.
 * Exibe thumbnail, nome, metricas resumidas e status.
 * Suporta selecao para comparacao e indicador de loading real-time.
 * Reseta estado de erro de imagem quando recebe dados frescos da API.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  Play,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Sparkles,
  Tag,
  Loader2,
} from 'lucide-react';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';

interface CreativeCardProps {
  creative: EnrichedCreative;
  isSelected: boolean;
  isLoadingImage?: boolean;
  onToggleSelect: (adId: string) => void;
  onClick: (creative: EnrichedCreative) => void;
}

// Formata numero com sufixo (1.2k, 3.4M)
function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

// Formata moeda BRL
function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// Formata percentual
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Retorna cor do status do anuncio
function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'bg-green-100 text-green-700';
    case 'PAUSED': return 'bg-yellow-100 text-yellow-700';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// Retorna label do status
function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Ativo';
    case 'PAUSED': return 'Pausado';
    case 'ARCHIVED': return 'Arquivado';
    default: return status;
  }
}

export const CreativeCard: React.FC<CreativeCardProps> = ({
  creative,
  isSelected,
  isLoadingImage = false,
  onToggleSelect,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const { metrics } = creative;
  const c = creative.creative;

  // Reseta erro de imagem quando a URL muda (dados frescos da API)
  const prevImageRef = useRef<string | null>(null);
  const imageUrl = c.cached_image_url || c.image_url_hd || c.image_url
    || c.cached_thumbnail_url || c.thumbnail_url || null;

  useEffect(() => {
    if (imageUrl !== prevImageRef.current) {
      prevImageRef.current = imageUrl;
      setImgError(false);
    }
  }, [imageUrl]);

  const isVideo = c.creative_type === 'video';
  const hasImage = imageUrl && !imgError;

  return (
    <div
      className={`
        group relative bg-white rounded-2xl overflow-hidden
        border-2 transition-all duration-200 cursor-pointer
        hover:shadow-lg hover:-translate-y-0.5
        ${isSelected
          ? 'border-blue-500 shadow-blue-100 shadow-md ring-2 ring-blue-200'
          : 'border-gray-100 hover:border-gray-200'
        }
      `}
    >
      {/* Checkbox de selecao no canto superior */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(c.ad_id);
        }}
        className={`
          absolute top-3 left-3 z-10 transition-all duration-150
          ${isSelected
            ? 'opacity-100 scale-100'
            : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
          }
        `}
      >
        {isSelected ? (
          <CheckCircle2 className="w-6 h-6 text-blue-500 drop-shadow-md" />
        ) : (
          <Circle className="w-6 h-6 text-white drop-shadow-md" />
        )}
      </button>

      {/* AI Score badge */}
      {creative.aiScore !== undefined && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-bold text-white">{creative.aiScore}</span>
        </div>
      )}

      {/* Area da imagem - clicavel para abrir detalhe */}
      <div
        onClick={() => onClick(creative)}
        className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100"
      >
        {hasImage ? (
          <>
            <img
              src={imageUrl}
              alt={creative.adName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {/* Overlay de video */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                  <Play className="w-6 h-6 text-gray-800 fill-gray-800" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? (
              <Play className="w-10 h-10 text-gray-300" />
            ) : (
              <Image className="w-10 h-10 text-gray-300" />
            )}
          </div>
        )}

        {/* Overlay de loading quando fetch real-time esta em andamento */}
        {isLoadingImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-[10px] font-medium text-blue-600">Buscando HD...</span>
            </div>
          </div>
        )}

        {/* Tipo do criativo - badge inferior esquerdo */}
        {c.creative_type !== 'unknown' && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
              {c.creative_type === 'video' ? 'Video' : c.creative_type === 'carousel' ? 'Carousel' : 'Imagem'}
            </span>
          </div>
        )}

        {/* Gradiente inferior para legibilidade do texto abaixo */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Conteudo do card */}
      <div onClick={() => onClick(creative)} className="p-4 space-y-3">
        {/* Nome e status */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1" title={creative.adName}>
            {creative.adName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 line-clamp-1 flex-1" title={creative.campaignName}>
              {creative.campaignName}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getStatusColor(creative.status)}`}>
              {getStatusLabel(creative.status)}
            </span>
          </div>
        </div>

        {/* Metricas em grid compacto */}
        <div className="grid grid-cols-2 gap-2">
          <MetricPill
            icon={<Eye className="w-3 h-3" />}
            label="Impress."
            value={formatCompact(metrics.impressions)}
          />
          <MetricPill
            icon={<MousePointer className="w-3 h-3" />}
            label="CTR"
            value={formatPercent(metrics.ctr)}
            highlight={metrics.ctr > 2}
          />
          <MetricPill
            icon={<DollarSign className="w-3 h-3" />}
            label="Gasto"
            value={formatCurrency(metrics.spend)}
          />
          <MetricPill
            icon={metrics.roas >= 1 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            label="ROAS"
            value={`${metrics.roas.toFixed(2)}x`}
            highlight={metrics.roas >= 2}
            warning={metrics.roas < 1 && metrics.spend > 0}
          />
        </div>

        {/* Tags */}
        {creative.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {creative.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] font-medium"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {creative.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{creative.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-componente para pill de metrica compacta
interface MetricPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
}

const MetricPill: React.FC<MetricPillProps> = ({ icon, label, value, highlight, warning }) => (
  <div className={`
    flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs
    ${warning
      ? 'bg-red-50 text-red-700'
      : highlight
        ? 'bg-green-50 text-green-700'
        : 'bg-gray-50 text-gray-600'
    }
  `}>
    <span className="opacity-60">{icon}</span>
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] uppercase tracking-wider opacity-60 leading-none">{label}</span>
      <span className="font-semibold leading-tight truncate">{value}</span>
    </div>
  </div>
);

export default CreativeCard;
