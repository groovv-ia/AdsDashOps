import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// Tipos de alerta
type AlertType = 'info' | 'success' | 'warning' | 'error';

// Props do componente Alert
interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
  className?: string;
}

// Componente Alert para exibir mensagens ao usuário
export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  dismissible = false,
  className = '',
}) => {
  // Configurações de estilo por tipo
  const typeConfig: Record<AlertType, {
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = {
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600" />,
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-lg p-4 relative
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start">
        {/* Ícone */}
        <div className="flex-shrink-0">{config.icon}</div>

        {/* Conteúdo */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="font-semibold mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>

        {/* Botão de fechar */}
        {dismissible && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 -mr-1 -mt-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded p-1 hover:bg-black hover:bg-opacity-5"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Hook para gerenciar alertas na aplicação
export const useAlert = () => {
  const [alerts, setAlerts] = React.useState<Array<{
    id: string;
    type: AlertType;
    title?: string;
    message: string;
  }>>([]);

  // Função para adicionar um alerta
  const addAlert = (
    type: AlertType,
    message: string,
    title?: string,
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, type, title, message }]);

    // Remove o alerta automaticamente após a duração
    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
  };

  // Função para remover um alerta
  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return {
    alerts,
    addAlert,
    removeAlert,
    success: (message: string, title?: string) => addAlert('success', message, title),
    error: (message: string, title?: string) => addAlert('error', message, title),
    warning: (message: string, title?: string) => addAlert('warning', message, title),
    info: (message: string, title?: string) => addAlert('info', message, title),
  };
};
