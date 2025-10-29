import React from 'react';
import { X } from 'lucide-react';

/**
 * Interface que define as propriedades do componente Badge
 *
 * @property children - Conteúdo exibido dentro do badge
 * @property variant - Estilo visual do badge
 * @property size - Tamanho do badge
 * @property removable - Se true, exibe botão para remover o badge
 * @property onRemove - Callback executado ao remover o badge
 * @property icon - Ícone opcional exibido antes do conteúdo
 * @property className - Classes CSS adicionais
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  className?: string;
  dot?: boolean;
}

/**
 * Componente Badge reutilizável
 *
 * Badge é usado para exibir status, categorias, contadores ou tags.
 * Suporta diferentes variantes de cores, tamanhos e pode ser removível.
 *
 * Casos de uso:
 * - Status de campanhas (Ativo, Pausado, Finalizado)
 * - Categorias e tags
 * - Contadores de notificações
 * - Filtros aplicados
 * - Labels de estado
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  icon,
  className = '',
  dot = false,
}) => {
  // Define as classes de variante (cor/estilo)
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  // Define as classes de tamanho
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Define o tamanho do ícone baseado no tamanho do badge
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Define a cor do dot baseado na variante
  const dotColorClasses = {
    default: 'bg-gray-400',
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
    info: 'bg-cyan-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-500',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
        transition-all duration-200
      `}
    >
      {/* Dot indicator (ponto colorido) */}
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotColorClasses[variant]}`} />
      )}

      {/* Ícone opcional */}
      {icon && (
        <span className={iconSizeClasses[size]}>
          {icon}
        </span>
      )}

      {/* Conteúdo do badge */}
      <span>{children}</span>

      {/* Botão de remover (se removable = true) */}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className={`
            ${iconSizeClasses[size]}
            hover:bg-black/10 rounded-full p-0.5 transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
          `}
          aria-label="Remover"
          type="button"
        >
          <X className="w-full h-full" />
        </button>
      )}
    </span>
  );
};

/**
 * Componente BadgeGroup
 *
 * Container para agrupar múltiplos badges com espaçamento consistente
 */
interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
  wrap?: boolean;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  className = '',
  wrap = true,
}) => {
  return (
    <div
      className={`
        flex items-center gap-2
        ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-x-auto'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * Componente StatusBadge
 *
 * Badge especializado para status com mapeamento de cores automático
 */
interface StatusBadgeProps {
  status: 'Active' | 'Paused' | 'Ended' | 'Draft' | 'Pending' | 'Error' | 'Success';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  // Mapeamento de status para variantes
  const statusVariantMap: Record<typeof status, BadgeProps['variant']> = {
    Active: 'success',
    Paused: 'warning',
    Ended: 'gray',
    Draft: 'info',
    Pending: 'warning',
    Error: 'danger',
    Success: 'success',
  };

  // Mapeamento de status para textos em português
  const statusTextMap: Record<typeof status, string> = {
    Active: 'Ativo',
    Paused: 'Pausado',
    Ended: 'Finalizado',
    Draft: 'Rascunho',
    Pending: 'Pendente',
    Error: 'Erro',
    Success: 'Sucesso',
  };

  return (
    <Badge
      variant={statusVariantMap[status]}
      size={size}
      dot={showDot}
      className={className}
    >
      {statusTextMap[status]}
    </Badge>
  );
};

/**
 * Componente CountBadge
 *
 * Badge especializado para exibir contadores (ex: notificações)
 * Útil para indicar quantidade de itens, notificações não lidas, etc.
 */
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  size?: 'sm' | 'md' | 'lg';
  showZero?: boolean;
  className?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  variant = 'danger',
  size = 'sm',
  showZero = false,
  className = '',
}) => {
  // Não renderiza se count é 0 e showZero é false
  if (count === 0 && !showZero) {
    return null;
  }

  // Formata o número (ex: 99+)
  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size={size}
      className={`font-bold ${className}`}
    >
      {displayCount}
    </Badge>
  );
};
