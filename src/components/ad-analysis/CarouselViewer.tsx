/**
 * CarouselViewer - Componente de Visualizacao de Carrossel
 *
 * Exibe os slides de um carrossel de anuncio com navegacao
 * entre slides, indicadores de posicao e informacoes de cada slide.
 * Suporta imagens resolvidas e fallback para image_hash.
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ExternalLink,
  Maximize2,
  Layers,
} from 'lucide-react';

// ============================================
// Tipos
// ============================================

/** Estrutura de um slide individual do carrossel */
export interface CarouselSlide {
  /** URL da imagem do slide (pode ser nula se apenas image_hash disponivel) */
  imageUrl?: string | null;
  /** Hash da imagem no Meta (usado como fallback) */
  imageHash?: string | null;
  /** Titulo/nome do slide */
  name?: string | null;
  /** Descricao do slide */
  description?: string | null;
  /** URL de destino do slide */
  link?: string | null;
  /** Tipo de call-to-action */
  callToAction?: string | null;
}

interface CarouselViewerProps {
  /** Lista de slides do carrossel */
  slides: CarouselSlide[];
  /** Callback ao clicar na imagem para expandir */
  onImageClick?: (slideIndex: number) => void;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// Componente Principal
// ============================================

export const CarouselViewer: React.FC<CarouselViewerProps> = ({
  slides,
  onImageClick,
  className = '',
}) => {
  // Slide atualmente exibido
  const [currentIndex, setCurrentIndex] = useState(0);

  // Controle de erro de imagem por slide
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  /**
   * Navega para o slide anterior
   */
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  /**
   * Navega para o proximo slide
   */
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev === totalSlides - 1 ? 0 : prev + 1));
  }, [totalSlides]);

  /**
   * Navega para um slide especifico
   */
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  /**
   * Marca erro de carregamento da imagem
   */
  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  }, []);

  // Se nao ha slides, exibe placeholder
  if (totalSlides === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-gray-400 ${className}`}>
        <Layers className="w-12 h-12 mb-3" />
        <p className="text-sm">Nenhum slide disponivel no carrossel</p>
      </div>
    );
  }

  const hasImageError = imageErrors[currentIndex];
  const slideImageUrl = currentSlide?.imageUrl;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Area principal do slide */}
      <div className="relative group">
        {/* Imagem do slide */}
        <div className="relative bg-gray-50 rounded-xl overflow-hidden aspect-square max-h-[480px] flex items-center justify-center">
          {slideImageUrl && !hasImageError ? (
            <>
              <img
                src={slideImageUrl}
                alt={currentSlide?.name || `Slide ${currentIndex + 1}`}
                className="w-full h-full object-contain"
                onError={() => handleImageError(currentIndex)}
              />
              {/* Botao de expandir no canto */}
              {onImageClick && (
                <button
                  onClick={() => onImageClick(currentIndex)}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Expandir imagem"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            /* Placeholder quando nao ha imagem */
            <div className="flex flex-col items-center justify-center text-gray-400 p-8">
              <ImageIcon className="w-16 h-16 mb-3" />
              <p className="text-sm text-center">
                {currentSlide?.imageHash
                  ? 'Imagem nao resolvida (image_hash disponivel)'
                  : 'Sem imagem disponivel'}
              </p>
              {currentSlide?.imageHash && (
                <p className="text-xs text-gray-300 mt-1 font-mono">
                  Hash: {currentSlide.imageHash.substring(0, 12)}...
                </p>
              )}
            </div>
          )}

          {/* Botoes de navegacao laterais */}
          {totalSlides > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Slide anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Proximo slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Badge de posicao */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 rounded-full text-white text-xs font-medium">
            {currentIndex + 1} de {totalSlides}
          </div>
        </div>
      </div>

      {/* Indicadores de posicao (dots) */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                rounded-full transition-all duration-200
                ${index === currentIndex
                  ? 'w-6 h-2 bg-blue-600'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }
              `}
              title={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Miniaturas dos slides */}
      {totalSlides > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {slides.map((slide, index) => {
            const hasError = imageErrors[index];
            return (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`
                  flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                  ${index === currentIndex
                    ? 'border-blue-600 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-400'
                  }
                `}
              >
                {slide.imageUrl && !hasError ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.name || `Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(index)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Informacoes do slide atual */}
      {(currentSlide?.name || currentSlide?.description || currentSlide?.callToAction) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {currentSlide.name && (
            <h4 className="font-medium text-gray-900 text-sm">
              {currentSlide.name}
            </h4>
          )}
          {currentSlide.description && (
            <p className="text-sm text-gray-600 mt-1">
              {currentSlide.description}
            </p>
          )}
          {currentSlide.callToAction && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {currentSlide.callToAction.replace(/_/g, ' ')}
            </span>
          )}
          {currentSlide.link && (
            <a
              href={currentSlide.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-3 h-3" />
              {currentSlide.link.length > 50
                ? currentSlide.link.substring(0, 50) + '...'
                : currentSlide.link
              }
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default CarouselViewer;
