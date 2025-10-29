import { useState, useEffect } from 'react';

/**
 * Hook useMediaQuery
 *
 * Hook para detectar media queries do CSS e responder a mudanças
 * no tamanho da tela ou preferências do sistema.
 *
 * @param query - Media query CSS (ex: "(min-width: 768px)")
 * @returns true se a media query corresponde
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 *
 * return (
 *   <div>
 *     {isMobile ? <MobileMenu /> : <DesktopMenu />}
 *   </div>
 * );
 */
export const useMediaQuery = (query: string): boolean => {
  // Inicializa com false para evitar erros SSR
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Verifica se window.matchMedia está disponível
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    // Cria o matcher da media query
    const mediaQuery = window.matchMedia(query);

    // Define o estado inicial
    setMatches(mediaQuery.matches);

    // Handler para mudanças na media query
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Adiciona listener (suporta tanto addEventListener quanto addListener)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback para navegadores antigos
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback para navegadores antigos
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
};

/**
 * Hook useBreakpoint
 *
 * Detecta o breakpoint atual do Tailwind CSS
 *
 * @returns Nome do breakpoint atual ('xs', 'sm', 'md', 'lg', 'xl', '2xl')
 *
 * @example
 * const breakpoint = useBreakpoint();
 *
 * return (
 *   <div>
 *     Breakpoint atual: {breakpoint}
 *     {breakpoint === 'xs' && <MobileLayout />}
 *     {breakpoint === 'lg' && <DesktopLayout />}
 *   </div>
 * );
 */
export const useBreakpoint = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2Xl = useMediaQuery('(min-width: 1536px)');

  if (is2Xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
};

/**
 * Hook useIsMobile
 *
 * Detecta se está em dispositivo móvel (largura < 768px)
 *
 * @returns true se for mobile
 *
 * @example
 * const isMobile = useIsMobile();
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 767px)');
};

/**
 * Hook useIsTablet
 *
 * Detecta se está em tablet (768px <= largura < 1024px)
 *
 * @returns true se for tablet
 */
export const useIsTablet = (): boolean => {
  const isMinTablet = useMediaQuery('(min-width: 768px)');
  const isMaxTablet = useMediaQuery('(max-width: 1023px)');
  return isMinTablet && isMaxTablet;
};

/**
 * Hook useIsDesktop
 *
 * Detecta se está em desktop (largura >= 1024px)
 *
 * @returns true se for desktop
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1024px)');
};

/**
 * Hook usePrefersColorScheme
 *
 * Detecta a preferência de tema do sistema
 *
 * @returns 'light' | 'dark' | 'no-preference'
 *
 * @example
 * const colorScheme = usePrefersColorScheme();
 *
 * useEffect(() => {
 *   if (colorScheme === 'dark') {
 *     document.documentElement.classList.add('dark');
 *   }
 * }, [colorScheme]);
 */
export const usePrefersColorScheme = (): 'light' | 'dark' | 'no-preference' => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');

  if (prefersDark) return 'dark';
  if (prefersLight) return 'light';
  return 'no-preference';
};

/**
 * Hook usePrefersReducedMotion
 *
 * Detecta se o usuário prefere reduzir animações
 *
 * @returns true se preferir movimento reduzido
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { x: 100 }}
 * />
 */
export const usePrefersReducedMotion = (): boolean => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

/**
 * Hook useOrientation
 *
 * Detecta a orientação do dispositivo
 *
 * @returns 'portrait' | 'landscape'
 *
 * @example
 * const orientation = useOrientation();
 *
 * return (
 *   <div>
 *     {orientation === 'landscape' && <LandscapeWarning />}
 *   </div>
 * );
 */
export const useOrientation = (): 'portrait' | 'landscape' => {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
};

/**
 * Hook useIsTouchDevice
 *
 * Detecta se o dispositivo suporta touch
 *
 * @returns true se suportar touch
 */
export const useIsTouchDevice = (): boolean => {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
};

/**
 * Hook useIsOnline
 *
 * Detecta se o navegador está online ou offline
 *
 * @returns true se online
 *
 * @example
 * const isOnline = useIsOnline();
 *
 * {!isOnline && <OfflineWarning />}
 */
export const useIsOnline = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
