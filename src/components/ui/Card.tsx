import React from 'react';

// Props do componente Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: () => void;
}

// Componente Card reutilizável para exibir conteúdo em containers estilizados
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  padding = 'medium',
  onClick,
}) => {
  // Classes de padding baseadas na prop
  const paddingClasses = {
    none: '',
    small: 'p-3',
    medium: 'p-4 sm:p-6',
    large: 'p-6 sm:p-8',
  };

  // Classes base do card
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200';
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

  return (
    <div
      className={`${baseClasses} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {/* Renderiza título e subtítulo se fornecidos */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Conteúdo do card */}
      {children}
    </div>
  );
};
