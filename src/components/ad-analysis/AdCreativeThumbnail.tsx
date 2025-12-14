/**
 * AdCreativeThumbnail Component
 *
 * Exibe miniatura do criativo de um anuncio.
 * Suporta imagens, videos e estados de loading/erro.
 */

import React from 'react';
import { Image, Play, AlertCircle, Loader2 } from 'lucide-react';
import type { MetaAdCreative } from '../../types/adAnalysis';

// Props do componente
interface AdCreativeThumbnailProps {
  creative: MetaAdCreative | null;
  loading?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showTypeIndicator?: boolean;
  className?: string;
}

// Mapeamento de tamanhos
const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

// Tamanho do icone baseado no tamanho do thumbnail
const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// Tamanho do play overlay
const playSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const AdCreativeThumbnail: React.FC<AdCreativeThumbnailProps> = ({
  creative,
  loading = false,
  error = null,
  size = 'md',
  onClick,
  showTypeIndicator = true,
  className = '',
}) => {
  // Classes base do container
  const containerClasses = `
    ${sizeClasses[size]}
    relative rounded-lg overflow-hidden
    bg-gray-100 flex items-center justify-center
    ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}
    ${className}
  `;

  // Estado de loading
  if (loading) {
    return (
      <div className={containerClasses}>
        <Loader2 className={`${iconSizes[size]} text-gray-400 animate-spin`} />
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div
        className={`${containerClasses} bg-red-50`}
        title={error}
        onClick={onClick}
      >
        <AlertCircle className={`${iconSizes[size]} text-red-400`} />
      </div>
    );
  }

  // Sem criativo
  if (!creative) {
    return (
      <div
        className={`${containerClasses} bg-gray-100`}
        title="Criativo nao carregado"
        onClick={onClick}
      >
        <Image className={`${iconSizes[size]} text-gray-300`} />
      </div>
    );
  }

  // URL da imagem (thumbnail ou image_url)
  const imageUrl = creative.thumbnail_url || creative.image_url;
  const isVideo = creative.creative_type === 'video';

  // Sem imagem disponivel
  if (!imageUrl) {
    return (
      <div
        className={`${containerClasses} bg-gray-100`}
        title={creative.creative_type === 'unknown' ? 'Tipo desconhecido' : 'Sem preview'}
        onClick={onClick}
      >
        {isVideo ? (
          <Play className={`${iconSizes[size]} text-gray-400`} />
        ) : (
          <Image className={`${iconSizes[size]} text-gray-300`} />
        )}
      </div>
    );
  }

  // Renderiza thumbnail com imagem
  return (
    <div className={containerClasses} onClick={onClick}>
      <img
        src={imageUrl}
        alt={creative.title || 'Preview do anuncio'}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback para placeholder em caso de erro de carregamento
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement?.classList.add('bg-gray-200');
        }}
      />

      {/* Indicador de video */}
      {isVideo && showTypeIndicator && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white/90 rounded-full p-1">
            <Play className={`${playSizes[size]} text-gray-800 fill-gray-800`} />
          </div>
        </div>
      )}

      {/* Indicador de tipo no canto (opcional) */}
      {showTypeIndicator && creative.creative_type !== 'unknown' && (
        <div className="absolute bottom-0 right-0 px-1 py-0.5 bg-black/60 rounded-tl text-white text-[8px] uppercase font-medium">
          {creative.creative_type === 'video' ? 'VID' : 'IMG'}
        </div>
      )}
    </div>
  );
};

/**
 * Componente wrapper para exibir thumbnail com tooltip
 */
interface AdCreativeThumbnailWithTooltipProps extends AdCreativeThumbnailProps {
  adName?: string;
}

export const AdCreativeThumbnailWithTooltip: React.FC<AdCreativeThumbnailWithTooltipProps> = ({
  adName,
  creative,
  ...props
}) => {
  // Monta texto do tooltip
  const tooltipParts: string[] = [];

  if (adName) {
    tooltipParts.push(adName);
  }

  if (creative) {
    if (creative.creative_type && creative.creative_type !== 'unknown') {
      tooltipParts.push(`Tipo: ${creative.creative_type === 'video' ? 'Video' : 'Imagem'}`);
    }
    if (creative.title) {
      tooltipParts.push(`Titulo: ${creative.title}`);
    }
  } else if (props.loading) {
    tooltipParts.push('Carregando criativo...');
  } else if (props.error) {
    tooltipParts.push(`Erro: ${props.error}`);
  } else {
    tooltipParts.push('Clique para ver detalhes');
  }

  return (
    <div title={tooltipParts.join('\n')}>
      <AdCreativeThumbnail creative={creative} {...props} />
    </div>
  );
};

export default AdCreativeThumbnail;
