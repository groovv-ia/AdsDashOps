import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X, AlertTriangle } from 'lucide-react';

/**
 * Interface que define as propriedades do componente Alert
 *
 * @property variant - Tipo/severidade do alerta
 * @property title - Título do alerta
 * @property children - Mensagem/conteúdo do alerta
 * @property dismissible - Se true, permite fechar o alerta
 * @property onDismiss - Callback executado ao fechar o alerta
 * @property icon - Ícone customizado (sobrescreve o ícone padrão)
 * @property className - Classes CSS adicionais
 */
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Componente Alert
 *
 * Exibe mensagens de feedback para o usuário com diferentes níveis de severidade.
 * Útil para notificações, avisos, erros e mensagens informativas.
 *
 * Variantes:
 * - info: Mensagens informativas (azul)
 * - success: Operações bem-sucedidas (verde)
 * - warning: Avisos e atenções (amarelo)
 * - error: Erros e problemas (vermelho)
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className = '',
}) => {
  // Mapeia variantes para classes de estilo
  const variantClasses = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      defaultIcon: <Info className="w-5 h-5" />,
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-900',
      icon: 'text-green-600',
      title: 'text-green-900',
      defaultIcon: <CheckCircle className="w-5 h-5" />,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      defaultIcon: <AlertTriangle className="w-5 h-5" />,
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-900',
      icon: 'text-red-600',
      title: 'text-red-900',
      defaultIcon: <XCircle className="w-5 h-5" />,
    },
  };

  const styles = variantClasses[variant];

  return (
    <div
      className={`
        flex items-start p-4 border rounded-lg
        ${styles.container}
        ${className}
      `}
      role="alert"
    >
      {/* Ícone */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {icon || styles.defaultIcon}
      </div>

      {/* Conteúdo */}
      <div className="ml-3 flex-1">
        {title && (
          <h3 className={`text-sm font-semibold mb-1 ${styles.title}`}>
            {title}
          </h3>
        )}
        <div className="text-sm">
          {children}
        </div>
      </div>

      {/* Botão de fechar */}
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={`
            flex-shrink-0 ml-3 ${styles.icon}
            hover:bg-black/5 rounded p-1 transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
          `}
          aria-label="Fechar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Componente Toast
 *
 * Notificação temporária que aparece no canto da tela
 * Usado para feedback de ações do usuário
 */
interface ToastProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const Toast: React.FC<ToastProps> = ({
  variant = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  position = 'top-right',
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // Auto-fecha após duration
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Aguarda animação terminar
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Mapeia posições para classes CSS
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  // Mapeia variantes para cores e ícones
  const variantStyles = {
    info: {
      bg: 'bg-blue-600',
      icon: <Info className="w-5 h-5" />,
    },
    success: {
      bg: 'bg-green-600',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    warning: {
      bg: 'bg-yellow-600',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    error: {
      bg: 'bg-red-600',
      icon: <XCircle className="w-5 h-5" />,
    },
  };

  const styles = variantStyles[variant];

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        min-w-[320px] max-w-md
        ${styles.bg} text-white rounded-lg shadow-2xl
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}
      role="alert"
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>

        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-semibold mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm opacity-90">
            {message}
          </p>
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="
            flex-shrink-0 ml-3
            hover:bg-white/20 rounded p-1 transition-colors
            focus:outline-none focus:ring-2 focus:ring-white
          "
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar para indicar tempo restante */}
      {duration > 0 && (
        <div className="h-1 bg-white/30 overflow-hidden rounded-b-lg">
          <div
            className="h-full bg-white transition-all"
            style={{
              animation: `shrink ${duration}ms linear`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook useToast
 *
 * Facilita o uso de toasts na aplicação
 */
export interface ToastOptions {
  variant?: ToastProps['variant'];
  title?: string;
  duration?: number;
  position?: ToastProps['position'];
}

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([]);

  const showToast = (message: string, options?: ToastOptions) => {
    const id = Date.now().toString();
    const toast = {
      id,
      message,
      variant: options?.variant || 'info',
      title: options?.title,
      duration: options?.duration,
      position: options?.position || 'top-right',
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };

    setToasts(prev => [...prev, toast]);
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </>
  );

  return {
    showToast,
    success: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      showToast(message, { ...options, variant: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      showToast(message, { ...options, variant: 'error' }),
    warning: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      showToast(message, { ...options, variant: 'warning' }),
    info: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      showToast(message, { ...options, variant: 'info' }),
    ToastContainer,
  };
};
