/**
 * CreativePreviewModal - Modal de Preview Completo do Criativo
 *
 * Exibe o preview completo do anuncio dentro da plataforma AdsOps,
 * tentando carregar via iframe o preview_url do Meta.
 * Caso o Meta bloqueie embedding (X-Frame-Options), exibe fallback
 * com o criativo em alta resolucao e textos formatados.
 * Inclui botao secundario para abrir diretamente no Meta.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Image as ImageIcon,
  Play,
  Layers,
} from 'lucide-react';
import type { MetaAdCreative } from '../../types/adAnalysis';
import { CarouselViewer, type CarouselSlide } from './CarouselViewer';

// ============================================
// Tipos
// ============================================

interface CreativePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** URL de preview do Meta (preview_shareable_link) */
  previewUrl?: string | null;
  /** Dados do criativo para fallback */
  creative?: MetaAdCreative | null;
  /** Nome do anuncio para exibicao no header */
  adName?: string;
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Extrai slides do carrossel a partir do extra_data do criativo
 */
function extractCarouselSlides(creative: MetaAdCreative): CarouselSlide[] {
  const extraData = creative.extra_data as Record<string, unknown>;
  const rawCreative = extraData?.raw_creative as Record<string, unknown> | undefined;
  const objectStorySpec = rawCreative?.object_story_spec as Record<string, unknown> | undefined;
  const linkData = objectStorySpec?.link_data as Record<string, unknown> | undefined;
  const childAttachments = linkData?.child_attachments as Array<Record<string, unknown>> | undefined;

  if (!childAttachments || !Array.isArray(childAttachments)) {
    return [];
  }

  return childAttachments.map(attachment => ({
    imageUrl: (attachment.picture as string) || null,
    imageHash: (attachment.image_hash as string) || null,
    name: (attachment.name as string) || null,
    description: (attachment.description as string) || null,
    link: (attachment.link as string) || null,
    callToAction: ((attachment.call_to_action as Record<string, unknown>)?.type as string) || null,
  }));
}

/**
 * Retorna o label legivel do tipo de criativo
 */
function getCreativeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    image: 'Imagem',
    video: 'Video',
    carousel: 'Carrossel',
    dynamic: 'Dinamico',
    unknown: 'Desconhecido',
  };
  return labels[type] || type;
}

// ============================================
// Componente Principal
// ============================================

export const CreativePreviewModal: React.FC<CreativePreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  creative,
  adName,
}) => {
  // Estado de erro de imagem para exibir placeholder quando URL expirada
  const [imgError, setImgError] = useState(false);

  // Reset de erro quando modal abre ou creative muda
  useEffect(() => {
    if (isOpen) setImgError(false);
  }, [isOpen, creative?.ad_id]);

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Sempre exibe fallback local -- Meta bloqueia iframes via X-Frame-Options
  const hasPreviewUrl = !!previewUrl;

  // Melhor URL de imagem disponivel, priorizando HD
  const hdImageUrl = creative?.image_url_hd || creative?.image_url || creative?.thumbnail_url;
  const isCarousel = creative?.creative_type === 'carousel';
  const isVideo = creative?.creative_type === 'video';
  const carouselSlides = isCarousel && creative ? extractCarouselSlides(creative) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {adName || 'Preview do Anuncio'}
            </h2>
            {creative?.creative_type && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {isCarousel && <Layers className="w-3 h-3" />}
                {isVideo && <Play className="w-3 h-3" />}
                {!isCarousel && !isVideo && <ImageIcon className="w-3 h-3" />}
                {getCreativeTypeLabel(creative.creative_type)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botao para abrir externamente no Meta */}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no Meta
              </a>
            )}

            {/* Botao de fechar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do modal -- exibe criativo com dados locais (iframe bloqueado pelo Meta) */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
              {/* Link para abrir preview externo no Meta */}
              {hasPreviewUrl && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Preview completo disponivel
                    </p>
                    <a
                      href={previewUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Abrir preview diretamente no Meta
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna esquerda: Imagem/Video/Carrossel */}
                <div>
                  {isCarousel && carouselSlides.length > 0 ? (
                    <CarouselViewer slides={carouselSlides} />
                  ) : isVideo ? (
                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                      {creative?.video_url ? (
                        <video
                          src={creative.video_url}
                          controls
                          className="w-full max-h-[480px] object-contain"
                          poster={hdImageUrl || undefined}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <Play className="w-16 h-16 mb-3" />
                          <p className="text-sm">Video nao disponivel para exibicao embarcada</p>
                          {creative?.video_id && (
                            <p className="text-xs text-gray-300 mt-1">ID: {creative.video_id}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : hdImageUrl && !imgError ? (
                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                      <img
                        src={hdImageUrl}
                        alt={adName || 'Criativo do anuncio'}
                        className="w-full max-h-[480px] object-contain"
                        onError={() => setImgError(true)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl text-gray-400">
                      <ImageIcon className="w-16 h-16 mb-3" />
                      <p className="text-sm">
                        {imgError ? 'Imagem expirada ou indisponivel' : 'Sem imagem disponivel'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Coluna direita: Textos do anuncio */}
                <div className="space-y-4">
                  {creative?.title && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titulo
                      </label>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {creative.title}
                      </p>
                    </div>
                  )}

                  {creative?.body && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Texto do Anuncio
                      </label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
                        {creative.body}
                      </p>
                    </div>
                  )}

                  {creative?.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descricao
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {creative.description}
                      </p>
                    </div>
                  )}

                  {creative?.call_to_action && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Call-to-Action
                      </label>
                      <div className="mt-1">
                        <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                          {creative.call_to_action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {creative?.link_url && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Link de Destino
                      </label>
                      <a
                        href={creative.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-1 text-sm text-blue-600 hover:text-blue-700 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {creative.link_url}
                      </a>
                    </div>
                  )}

                  {/* Metadados do criativo */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {creative?.creative_type && (
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-1 text-gray-700 font-medium">
                            {getCreativeTypeLabel(creative.creative_type)}
                          </span>
                        </div>
                      )}
                      {creative?.image_width && creative?.image_height && (
                        <div>
                          <span className="text-gray-500">Resolucao:</span>
                          <span className="ml-1 text-gray-700 font-medium">
                            {creative.image_width}x{creative.image_height}
                          </span>
                        </div>
                      )}
                      {creative?.thumbnail_quality && creative.thumbnail_quality !== 'unknown' && (
                        <div>
                          <span className="text-gray-500">Qualidade:</span>
                          <span className={`ml-1 font-medium ${
                            creative.thumbnail_quality === 'hd' ? 'text-green-600' :
                            creative.thumbnail_quality === 'sd' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {creative.thumbnail_quality.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {isCarousel && (
                        <div>
                          <span className="text-gray-500">Slides:</span>
                          <span className="ml-1 text-gray-700 font-medium">
                            {carouselSlides.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreativePreviewModal;
