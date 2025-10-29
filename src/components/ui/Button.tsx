import React from 'react';
import { Loader2 } from 'lucide-react';

// Variantes de estilo do botão
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

// Tamanhos do botão
type ButtonSize = 'small' | 'medium' | 'large';

// Props do componente Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Componente Button reutilizável com várias variantes e tamanhos
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  // Classes de estilo baseadas na variante
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  };

  // Classes de tamanho
  const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  // Classes base do botão
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    border transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `.trim();

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {/* Mostra spinner quando loading */}
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}

      {/* Mostra ícone se fornecido e não está loading */}
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}

      {/* Texto do botão */}
      {children}
    </button>
  );
};
