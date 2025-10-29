import React, { forwardRef } from 'react';

// Props do componente Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Componente Input reutilizável com label, erro e helper text
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    // Gera um ID único se não fornecido
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Classes base do input
    const baseClasses = `
      px-3 py-2 border rounded-lg
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-100 disabled:cursor-not-allowed
      transition-colors
      ${fullWidth ? 'w-full' : ''}
      ${icon ? 'pl-10' : ''}
      ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
    `.trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        {/* Container do input com ícone */}
        <div className="relative">
          {/* Ícone à esquerda */}
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={`${baseClasses} ${className}`}
            {...props}
          />
        </div>

        {/* Mensagem de erro */}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
