import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

/**
 * Componente InfoTooltip
 *
 * Exibe um ícone de ajuda que ao passar o mouse mostra uma dica contextual.
 * Útil para explicar funcionalidades e orientar o usuário.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  position = 'top',
  className = '',
  iconSize = 'sm'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900'
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <HelpCircle
        className={`${iconSizeClasses[iconSize]} text-gray-400 hover:text-gray-600 cursor-help transition-colors`}
      />

      {isVisible && (
        <div
          className={`absolute z-[9999] ${positionClasses[position]} pointer-events-none`}
          style={{ minWidth: '200px', maxWidth: '300px' }}
        >
          <div className="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl">
            {content}
            <div
              className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-transparent`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
