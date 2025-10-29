import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Interface que define as propriedades do componente Loading
 *
 * @property size - Define o tamanho do spinner (sm, md, lg)
 * @property text - Texto opcional exibido abaixo do spinner
 * @property fullScreen - Define se deve ocupar a tela inteira
 * @property variant - Estilo visual do loading (spinner, dots, pulse)
 * @property className - Classes CSS adicionais
 */
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

/**
 * Componente Loading reutilizável
 *
 * Exibe indicadores de carregamento com diferentes estilos e tamanhos.
 * Pode ser usado inline ou em tela cheia para estados de loading da aplicação.
 *
 * Variantes disponíveis:
 * - spinner: Ícone rotativo (padrão)
 * - dots: Três pontos pulsantes
 * - pulse: Círculo pulsante
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  variant = 'spinner',
  className = '',
}) => {
  // Define os tamanhos baseados na prop size
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  // Renderiza o spinner rotativo
  const renderSpinner = () => (
    <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
  );

  // Renderiza três pontos pulsantes
  const renderDots = () => {
    const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';
    return (
      <div className="flex space-x-2">
        <div className={`${dotSize} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
        <div className={`${dotSize} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
        <div className={`${dotSize} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
      </div>
    );
  };

  // Renderiza círculo pulsante
  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`} />
  );

  // Seleciona a variante do loading
  const loadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  // Container do loading
  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {loadingIndicator()}
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  // Se for fullScreen, renderiza com overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  // Caso contrário, renderiza inline
  return content;
};

/**
 * Componente LoadingOverlay
 *
 * Variante específica para sobrepor conteúdo existente com um loading
 * Útil para indicar loading em cards, seções ou containers específicos
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text,
  size = 'md',
  variant = 'spinner',
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <Loading size={size} text={text} variant={variant} />
        </div>
      )}
    </div>
  );
};

/**
 * Componente LoadingSkeleton
 *
 * Skeleton loader para melhorar a percepção de performance
 * Mostra placeholder animado enquanto o conteúdo carrega
 */
interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  avatar?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  className = '',
  avatar = false,
}) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {avatar && (
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${100 - (index * 10)}%` }}
        />
      ))}
    </div>
  );
};
