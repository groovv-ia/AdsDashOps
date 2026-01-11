/**
 * useScrollRestoration
 *
 * Hook customizado para gerenciar a posição do scroll durante navegação.
 * Salva a posição atual antes de navegar e restaura quando o usuário volta.
 *
 * Features:
 * - Salva posição do scroll no sessionStorage
 * - Restaura automaticamente ao montar o componente
 * - Suporta múltiplas páginas/views com keys únicas
 * - Smooth scroll para melhor UX
 */

import { useEffect, useRef } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

// Key base para armazenamento no sessionStorage
const SCROLL_STORAGE_KEY = 'scroll_position';

/**
 * Hook para gerenciar restauração de scroll
 * @param key - Identificador único para a view (ex: 'meta-accounts-list')
 * @param enabled - Se o scroll restoration está ativo (padrão: true)
 */
export const useScrollRestoration = (key: string, enabled: boolean = true) => {
  const savedPositionRef = useRef<ScrollPosition | null>(null);
  const restoredRef = useRef(false);

  /**
   * Salva a posição atual do scroll
   * Chamado antes de navegar para outra view
   */
  const saveScrollPosition = () => {
    if (!enabled) return;

    const position: ScrollPosition = {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(`${SCROLL_STORAGE_KEY}_${key}`, JSON.stringify(position));
      console.log(`[ScrollRestoration] Posição salva para "${key}":`, position);
    } catch (error) {
      console.error('[ScrollRestoration] Erro ao salvar posição:', error);
    }
  };

  /**
   * Restaura a posição do scroll
   * Chamado quando o componente é montado
   */
  const restoreScrollPosition = () => {
    if (!enabled || restoredRef.current) return;

    try {
      const savedData = sessionStorage.getItem(`${SCROLL_STORAGE_KEY}_${key}`);
      if (!savedData) {
        console.log(`[ScrollRestoration] Nenhuma posição salva encontrada para "${key}"`);
        return;
      }

      const position: ScrollPosition = JSON.parse(savedData);
      savedPositionRef.current = position;

      // Verifica se a posição salva é recente (menos de 5 minutos)
      const isRecent = Date.now() - position.timestamp < 5 * 60 * 1000;
      if (!isRecent) {
        console.log(`[ScrollRestoration] Posição salva muito antiga para "${key}", ignorando`);
        clearScrollPosition();
        return;
      }

      // Aguarda um tick para garantir que o DOM foi renderizado
      requestAnimationFrame(() => {
        // Usa scroll suave para melhor experiência
        window.scrollTo({
          top: position.y,
          left: position.x,
          behavior: 'smooth',
        });

        console.log(`[ScrollRestoration] Posição restaurada para "${key}":`, position);
        restoredRef.current = true;

        // Limpa a posição salva após restaurar
        clearScrollPosition();
      });
    } catch (error) {
      console.error('[ScrollRestoration] Erro ao restaurar posição:', error);
    }
  };

  /**
   * Limpa a posição salva do storage
   */
  const clearScrollPosition = () => {
    try {
      sessionStorage.removeItem(`${SCROLL_STORAGE_KEY}_${key}`);
      console.log(`[ScrollRestoration] Posição removida para "${key}"`);
    } catch (error) {
      console.error('[ScrollRestoration] Erro ao limpar posição:', error);
    }
  };

  /**
   * Reseta o flag de restauração (útil para forçar nova restauração)
   */
  const resetRestoration = () => {
    restoredRef.current = false;
  };

  // Restaura scroll ao montar o componente
  useEffect(() => {
    if (enabled) {
      // Pequeno delay para garantir que o conteúdo foi renderizado
      const timeoutId = setTimeout(restoreScrollPosition, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, key]);

  // Limpa posição ao desmontar se não foi restaurada
  useEffect(() => {
    return () => {
      if (!restoredRef.current && enabled) {
        // clearScrollPosition();
      }
    };
  }, [enabled, key]);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    resetRestoration,
    savedPosition: savedPositionRef.current,
  };
};
