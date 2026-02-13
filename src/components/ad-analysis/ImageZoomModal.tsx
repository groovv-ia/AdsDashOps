/**
 * ImageZoomModal Component
 *
 * Modal para visualizacao de midia em tela cheia
 * com suporte a zoom para imagens, reproducao de video
 * e navegacao de carrossel.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import type { CarouselSlide } from './CarouselViewer';

// ============================================
// Tipos
// ============================================

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** URL da imagem (obrigatoria para imagens, usada como poster para videos) */
  imageUrl: string;
  /** URL HD da imagem (prioridade sobre imageUrl) */
  imageUrlHd?: string | null;
  /** Texto alternativo */
  alt?: string;
  /** Titulo exibido no header */
  title?: string;
  /** Qualidade da imagem para badge */
  quality?: 'hd' | 'sd' | 'low' | 'unknown';
  /** Tipo de criativo - define qual modo de exibicao usar */
  creativeType?: 'image' | 'video' | 'carousel' | 'dynamic' | 'unknown';
  /** URL do video (quando creativeType === 'video') */
  videoUrl?: string | null;
  /** Slides do carrossel (quando creativeType === 'carousel') */
  carouselSlides?: CarouselSlide[];
}

// ============================================
// Componente Principal
// ============================================

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageUrlHd,
  alt = 'Imagem do anuncio',
  title,
  quality = 'unknown',
  creativeType = 'image',
  videoUrl,
  carouselSlides = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Estado do video
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Estado do carrossel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselImageErrors, setCarouselImageErrors] = useState<Record<number, boolean>>({});

  // Determina o modo de exibicao
  const isVideo = creativeType === 'video' && !!videoUrl;
  const isCarousel = creativeType === 'carousel' && carouselSlides.length > 0;

  // Melhor URL de imagem disponivel
  const bestImageUrl = imageUrlHd || imageUrl;

  // URL atual do carrossel
  const currentCarouselSlide = isCarousel ? carouselSlides[carouselIndex] : null;
  const currentCarouselImageUrl = currentCarouselSlide?.imageUrl || null;

  /**
   * Fecha modal com ESC, navega carrossel com setas
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (isCarousel) {
      if (e.key === 'ArrowLeft') {
        setCarouselIndex(prev => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCarouselIndex(prev => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
      }
    }
  }, [onClose, isCarousel, carouselSlides.length]);

  // Registra listener de teclado e bloqueia scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // Reset estados quando modal abre
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setIsLoading(true);
      setIsPlaying(false);
      setCarouselIndex(0);
      setCarouselImageErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handlers de zoom (somente imagem e carrossel)
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Handlers de video
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handlers de carrossel
  const goToPreviousSlide = () => {
    setCarouselIndex(prev => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
    setIsLoading(true);
  };

  const goToNextSlide = () => {
    setCarouselIndex(prev => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
    setIsLoading(true);
  };

  const handleCarouselImageError = (index: number) => {
    setCarouselImageErrors(prev => ({ ...prev, [index]: true }));
  };

  // Abre midia em nova aba
  const handleOpenExternal = () => {
    const url = isVideo
      ? videoUrl!
      : isCarousel && currentCarouselImageUrl
        ? currentCarouselImageUrl
        : bestImageUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Labels e cores para badges de qualidade
  const qualityConfig = {
    hd: { label: 'HD', color: 'bg-green-500/90' },
    sd: { label: 'SD', color: 'bg-blue-500/90' },
    low: { label: 'Low', color: 'bg-orange-500/90' },
    unknown: { label: '', color: '' },
  };

  // Texto do tipo de midia para o header
  const mediaTypeLabel = isVideo ? 'Video' : isCarousel ? 'Carrossel' : 'Imagem';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Container do conteudo */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header com controles */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50">
          <div className="flex items-center gap-4">
            {title && (
              <h3 className="text-white font-medium truncate max-w-md">{title}</h3>
            )}
            <div className="flex items-center gap-2">
              {/* Badge do tipo de midia */}
              <span className="px-2 py-0.5 text-xs font-medium text-white/80 bg-white/10 rounded">
                {mediaTypeLabel}
              </span>

              {/* Zoom indicator (somente imagem/carrossel) */}
              {!isVideo && (
                <span className="text-gray-400 text-sm">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
              )}

              {/* Badge de qualidade */}
              {quality !== 'unknown' && qualityConfig[quality].label && (
                <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${qualityConfig[quality].color}`}>
                  {qualityConfig[quality].label}
                </span>
              )}

              {/* Indicador de posicao do carrossel */}
              {isCarousel && (
                <span className="text-gray-400 text-sm">
                  {carouselIndex + 1} de {carouselSlides.length}
                </span>
              )}
            </div>
          </div>

          {/* Botoes de acao */}
          <div className="flex items-center gap-2">
            {/* Controles de video */}
            {isVideo && (
              <>
                <button
                  onClick={togglePlay}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={isMuted ? 'Ativar som' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
              </>
            )}

            {/* Controles de zoom (imagem e carrossel) */}
            {!isVideo && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 4}
                  className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
              </>
            )}

            {/* Navegacao do carrossel */}
            {isCarousel && (
              <>
                <button
                  onClick={goToPreviousSlide}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Slide anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNextSlide}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Proximo slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
              </>
            )}

            {/* Abrir externamente */}
            <button
              onClick={handleOpenExternal}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Download (somente para imagem e carrossel com imagem) */}
            {!isVideo && (
              <a
                href={isCarousel && currentCarouselImageUrl ? currentCarouselImageUrl : bestImageUrl}
                download
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Baixar imagem"
              >
                <Download className="w-5 h-5" />
              </a>
            )}

            <div className="w-px h-6 bg-white/20 mx-2" />

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Container principal da midia */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {/* Spinner de carregamento */}
          {isLoading && !isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Modo Video */}
          {isVideo && (
            <video
              ref={videoRef}
              src={videoUrl!}
              poster={bestImageUrl}
              controls
              className="max-w-full max-h-full object-contain rounded-lg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={() => setIsLoading(false)}
            />
          )}

          {/* Modo Carrossel */}
          {isCarousel && !isVideo && (
            <div className="relative flex flex-col items-center max-w-full max-h-full">
              {/* Imagem do slide atual */}
              {currentCarouselImageUrl && !carouselImageErrors[carouselIndex] ? (
                <img
                  src={currentCarouselImageUrl}
                  alt={currentCarouselSlide?.name || `Slide ${carouselIndex + 1}`}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    handleCarouselImageError(carouselIndex);
                    setIsLoading(false);
                  }}
                  className="max-w-full max-h-[calc(100vh-180px)] object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/50 py-20">
                  <ImageIcon className="w-20 h-20 mb-4" />
                  <p className="text-sm">
                    {currentCarouselSlide?.imageHash
                      ? 'Imagem nao resolvida'
                      : 'Sem imagem disponivel'}
                  </p>
                </div>
              )}

              {/* Info do slide atual */}
              {currentCarouselSlide?.name && (
                <div className="mt-4 px-4 py-2 bg-black/50 rounded-lg">
                  <p className="text-white text-sm font-medium text-center">
                    {currentCarouselSlide.name}
                  </p>
                  {currentCarouselSlide.description && (
                    <p className="text-white/60 text-xs text-center mt-1">
                      {currentCarouselSlide.description}
                    </p>
                  )}
                </div>
              )}

              {/* Miniaturas do carrossel na parte inferior */}
              {carouselSlides.length > 1 && (
                <div className="flex gap-2 mt-4">
                  {carouselSlides.map((slide, index) => {
                    const hasError = carouselImageErrors[index];
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setCarouselIndex(index);
                          setIsLoading(true);
                        }}
                        className={`
                          flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all
                          ${index === carouselIndex
                            ? 'border-white ring-1 ring-white/30'
                            : 'border-white/20 hover:border-white/50'
                          }
                        `}
                      >
                        {slide.imageUrl && !hasError ? (
                          <img
                            src={slide.imageUrl}
                            alt={slide.name || `Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={() => handleCarouselImageError(index)}
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modo Imagem (padrao) */}
          {!isVideo && !isCarousel && (
            <img
              src={bestImageUrl}
              alt={alt}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          )}
        </div>

        {/* Instrucao de navegacao */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full">
          <span className="text-white/70 text-sm">
            {isCarousel
              ? 'Setas para navegar | ESC para fechar'
              : isVideo
                ? 'ESC para fechar'
                : 'ESC para fechar | Scroll para navegar'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageZoomModal;
