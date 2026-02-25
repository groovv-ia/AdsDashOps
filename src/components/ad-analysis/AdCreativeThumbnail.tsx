/**
 * AdCreativeThumbnail Component
 *
 * Exibe miniatura do criativo de um anuncio.
 * Suporta imagens, videos e estados de loading/erro.
 *
 * Melhorias:
 * - Indicador de qualidade da imagem (HD/SD/Low)
 * - Melhor tratamento de fallbacks
 * - Suporte a imagens HD quando disponíveis
 * - Indicador de status de sincronização
 */

import React, { useState, useEffect } from 'react';
import { Image, Play, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { MetaAdCreative } from '../../types/adAnalysis';

// Props do componente
interface AdCreativeThumbnailProps {
  creative: MetaAdCreative | null;
  loading?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showTypeIndicator?: boolean;
  showQualityIndicator?: boolean; // Novo: mostra indicador de qualidade
  useHdWhenAvailable?: boolean; // Novo: usa imagem HD quando disponível
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
  showQualityIndicator = false,
  useHdWhenAvailable = true,
  className = '',
}) => {
  // Estado para controlar erro de carregamento de imagem (CDN expirado)
  const [imgError, setImgError] = useState(false);
  // Estado para carregamento progressivo: mostra thumbnail rapido, troca para HD quando carrega
  const [hdLoaded, setHdLoaded] = useState(false);

  // Reseta estados quando o criativo muda
  useEffect(() => {
    setImgError(false);
    setHdLoaded(false);
  }, [creative?.ad_id]);

  // Classes base do container (sem background padrao, sera adicionado conforme necessario)
  const baseContainerClasses = `
    ${sizeClasses[size]}
    relative rounded-lg overflow-hidden
    flex items-center justify-center
    ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}
    ${className}
  `;

  // Container com background para estados sem imagem
  const containerClassesWithBg = `${baseContainerClasses} bg-gray-100`;

  // Estado de loading
  if (loading) {
    return (
      <div className={containerClassesWithBg}>
        <Loader2 className={`${iconSizes[size]} text-gray-400 animate-spin`} />
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div
        className={`${baseContainerClasses} bg-red-50`}
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
        className={`${baseContainerClasses} bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200`}
        title="Criativo ainda nao carregado. Clique para tentar carregar."
        onClick={onClick}
      >
        <Image className={`${iconSizes[size]} text-gray-400`} />
      </div>
    );
  }

  // Seleciona URLs com estrategia de 3 camadas:
  // 1. cached_image_url (Supabase Storage - permanente, mais confiavel)
  // 2. image_url_hd / image_url (Meta CDN - alta resolucao, pode expirar)
  // 3. thumbnail_url (Meta CDN - p64x64 rapido, pode expirar)
  // 4. extra_data fallback

  // URL HD: prioriza cached (permanente), depois Meta CDN HD
  const hdUrl = creative.cached_image_url
    || (useHdWhenAvailable ? creative.image_url_hd : null)
    || creative.image_url
    || null;

  // URL thumbnail rapida: prioriza cached, depois Meta CDN
  const thumbnailUrl = creative.cached_thumbnail_url
    || creative.thumbnail_url
    || null;

  // URL final para exibicao (melhor disponivel)
  let imageUrl = hdUrl || thumbnailUrl;

  // Fallback: tenta extrair do raw creative armazenado no extra_data
  if (!imageUrl) {
    const extraData = creative.extra_data as Record<string, unknown> | undefined;
    const rawCreative = extraData?.raw_creative as Record<string, unknown> | undefined;
    if (rawCreative?.thumbnail_url && typeof rawCreative.thumbnail_url === 'string') {
      imageUrl = rawCreative.thumbnail_url;
    }
  }

  // Determina se temos uma versao HD separada para carregamento progressivo
  const hasProgressiveHd = !!(hdUrl && thumbnailUrl && hdUrl !== thumbnailUrl);
  // URL exibida: mostra thumbnail ate HD carregar (se progressivo)
  const displayUrl = hasProgressiveHd && !hdLoaded ? thumbnailUrl : imageUrl;

  const isVideo = creative.creative_type === 'video';
  const quality = creative.thumbnail_quality || 'unknown';
  const isHdQuality = quality === 'hd';

  // Helper para obter cor do indicador de qualidade
  const getQualityColor = () => {
    if (quality === 'hd') return 'bg-green-500';
    if (quality === 'sd') return 'bg-yellow-500';
    if (quality === 'low') return 'bg-orange-500';
    return 'bg-gray-400';
  };

  // Sem imagem disponivel - mostra placeholder
  if (!imageUrl) {
    return (
      <div
        className={`${baseContainerClasses} bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200`}
        title={creative.creative_type === 'unknown' ? 'Tipo desconhecido' : 'Sem preview disponivel'}
        onClick={onClick}
      >
        {isVideo ? (
          <Play className={`${iconSizes[size]} text-blue-500`} />
        ) : (
          <Image className={`${iconSizes[size]} text-blue-500`} />
        )}
        {/* Indicador de status incompleto */}
        {creative.fetch_status !== 'success' && (
          <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-white"></div>
        )}
      </div>
    );
  }

  // Se a imagem falhou ao carregar (URL expirada), mostra placeholder
  if (imgError) {
    return (
      <div
        className={`${baseContainerClasses} bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200`}
        title="Imagem expirada - clique para atualizar"
        onClick={onClick}
      >
        <Image className={`${iconSizes[size]} text-gray-400`} />
        <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-orange-400 rounded-full border border-white" />
      </div>
    );
  }

  // Renderiza thumbnail com imagem (carregamento progressivo)
  return (
    <div className={baseContainerClasses} onClick={onClick}>
      <img
        src={displayUrl || imageUrl || ''}
        alt={creative.title || 'Preview do anuncio'}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />

      {/* Pre-carrega imagem HD em background para troca progressiva */}
      {hasProgressiveHd && !hdLoaded && hdUrl && (
        <img
          src={hdUrl}
          alt=""
          className="hidden"
          onLoad={() => setHdLoaded(true)}
        />
      )}

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

      {/* Indicador de qualidade HD (opcional) */}
      {showQualityIndicator && quality !== 'unknown' && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 bg-black/70 rounded text-white">
          {isHdQuality && <Sparkles className="w-2 h-2" />}
          <span className="text-[7px] uppercase font-bold">
            {quality}
          </span>
        </div>
      )}

      {/* Indicador de qualidade - bolinha colorida no canto superior esquerdo */}
      {showQualityIndicator && quality !== 'unknown' && !creative.enriched_at && (
        <div
          className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400"
          title="Criativo pendente de enriquecimento HD"
        />
      )}
      {showQualityIndicator && quality !== 'unknown' && creative.enriched_at && (
        <div
          className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${getQualityColor()}`}
          title={`Qualidade: ${quality.toUpperCase()} — Enriquecido`}
        />
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
