/**
 * ImageZoomModal Component
 *
 * Modal para visualização de imagens em tela cheia
 * com suporte a zoom e navegação.
 */

import React, { useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, ExternalLink, Download } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
  title?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Imagem do anúncio',
  title,
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fecha modal com ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Registra listener de teclado
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

  // Reset zoom quando modal abre
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setIsLoading(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handlers de zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Abre imagem em nova aba
  const handleOpenExternal = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Container do conteúdo */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header com controles */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50">
          <div className="flex items-center gap-4">
            {title && (
              <h3 className="text-white font-medium truncate max-w-md">{title}</h3>
            )}
            <span className="text-gray-400 text-sm">
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
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
              disabled={zoom >= 3}
              className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button
              onClick={handleOpenExternal}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <a
              href={imageUrl}
              download
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-5 h-5" />
            </a>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Container da imagem */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>

        {/* Instrução de navegação */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full">
          <span className="text-white/70 text-sm">
            Pressione ESC para fechar | Scroll para navegar
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageZoomModal;
