import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * Interface que define as propriedades do componente Modal
 *
 * @property isOpen - Controla se o modal está visível ou não
 * @property onClose - Função callback executada ao fechar o modal
 * @property title - Título exibido no cabeçalho do modal
 * @property children - Conteúdo interno do modal
 * @property size - Define o tamanho do modal (sm, md, lg, xl, full)
 * @property showCloseButton - Define se deve exibir o botão X de fechar
 * @property closeOnOverlayClick - Define se deve fechar ao clicar fora do modal
 * @property closeOnEsc - Define se deve fechar ao pressionar ESC
 * @property footer - Conteúdo customizado para o rodapé do modal
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Componente Modal reutilizável
 *
 * Este componente fornece uma janela modal acessível e customizável
 * com suporte a diferentes tamanhos, animações e opções de fechamento.
 *
 * Funcionalidades:
 * - Bloqueia scroll do body quando aberto
 * - Fecha ao pressionar ESC (se habilitado)
 * - Fecha ao clicar no overlay (se habilitado)
 * - Trap de foco para acessibilidade
 * - Animações suaves de entrada/saída
 * - Diferentes tamanhos predefinidos
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  footer,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Bloqueia scroll do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Adiciona listener para tecla ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // Trap de foco dentro do modal (acessibilidade)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Fecha ao clicar no overlay
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Define as classes de tamanho do modal
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  // Não renderiza nada se o modal não está aberto
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Header do Modal */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer do Modal (opcional) */}
        {footer && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
