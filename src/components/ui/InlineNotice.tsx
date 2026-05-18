import React, { useState } from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  X,
  ChevronRight,
} from 'lucide-react';

// Variantes visuais do aviso inline
export type InlineNoticeVariant = 'info' | 'success' | 'warning' | 'error' | 'tip';

interface InlineNoticeProps {
  variant?: InlineNoticeVariant;
  title: string;
  description?: string;
  /** Botão de acao opcional */
  actionLabel?: string;
  onAction?: () => void;
  /** Permite dispensar o aviso */
  dismissible?: boolean;
  /** Icone customizado (substitui o padrão) */
  icon?: React.ElementType;
  className?: string;
}

// Configuracao visual por variante
const VARIANTS: Record<
  InlineNoticeVariant,
  { container: string; icon: string; title: string; desc: string; defaultIcon: React.ElementType }
> = {
  info: {
    container: 'bg-blue-50 border border-blue-200',
    icon:      'text-blue-600 bg-blue-100',
    title:     'text-blue-900',
    desc:      'text-blue-700',
    defaultIcon: Info,
  },
  success: {
    container: 'bg-green-50 border border-green-200',
    icon:      'text-green-600 bg-green-100',
    title:     'text-green-900',
    desc:      'text-green-700',
    defaultIcon: CheckCircle2,
  },
  warning: {
    container: 'bg-amber-50 border border-amber-200',
    icon:      'text-amber-600 bg-amber-100',
    title:     'text-amber-900',
    desc:      'text-amber-700',
    defaultIcon: AlertTriangle,
  },
  error: {
    container: 'bg-red-50 border border-red-200',
    icon:      'text-red-600 bg-red-100',
    title:     'text-red-900',
    desc:      'text-red-700',
    defaultIcon: XCircle,
  },
  tip: {
    container: 'bg-gray-50 border border-gray-200',
    icon:      'text-gray-600 bg-gray-100',
    title:     'text-gray-800',
    desc:      'text-gray-600',
    defaultIcon: Lightbulb,
  },
};

export const InlineNotice: React.FC<InlineNoticeProps> = ({
  variant = 'info',
  title,
  description,
  actionLabel,
  onAction,
  dismissible = false,
  icon: CustomIcon,
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const v = VARIANTS[variant];
  const Icon = CustomIcon ?? v.defaultIcon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 animate-[fadeSlideDown_0.25s_ease-out]
        ${v.container} ${className}`}
    >
      {/* Icone */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${v.icon}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${v.title}`}>{title}</p>
        {description && (
          <p className={`text-xs mt-0.5 leading-relaxed ${v.desc}`}>{description}</p>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`inline-flex items-center gap-0.5 text-xs font-semibold mt-2 ${v.title} hover:underline`}
          >
            {actionLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Botao dispensar */}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={`flex-shrink-0 p-1 rounded-lg transition-colors ${v.icon} hover:opacity-70`}
          title="Dispensar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
