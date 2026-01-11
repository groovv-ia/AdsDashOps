/**
 * SyncStatusBadge
 *
 * Badge reutilizavel para exibir status de sincronizacao.
 * Usado em cards de contas, tabelas e headers.
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';

// Tipos de status possiveis
// - just_synced: Sincronizado nos ultimos 5 minutos (verde intenso)
// - synced: Sincronizado e atualizado nas ultimas 24 horas (verde)
// - syncing: Sincronizando agora (azul com animacao)
// - stale: Desatualizado, mais de 24 horas (amarelo)
// - error: Erro na sincronizacao (vermelho)
// - never: Nunca sincronizado (cinza)
// - disconnected: Conta desconectada (cinza escuro)
export type SyncStatus = 'just_synced' | 'synced' | 'syncing' | 'stale' | 'error' | 'never' | 'disconnected';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSyncAt?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Configuracoes de cada status
const STATUS_CONFIG: Record<SyncStatus, {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  just_synced: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 border-emerald-300',
    icon: <CheckCircle2 className="w-full h-full" />,
    label: 'Atualizado agora',
  },
  synced: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: <CheckCircle2 className="w-full h-full" />,
    label: 'Sincronizado',
  },
  syncing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Loader2 className="w-full h-full animate-spin" />,
    label: 'Sincronizando...',
  },
  stale: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: <Clock className="w-full h-full" />,
    label: 'Desatualizado',
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="w-full h-full" />,
    label: 'Erro',
  },
  never: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: <Clock className="w-full h-full" />,
    label: 'Aguardando sincronizacao',
  },
  disconnected: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: <XCircle className="w-full h-full" />,
    label: 'Desconectado',
  },
};

// Tamanhos do badge
const SIZE_CONFIG = {
  sm: {
    container: 'px-1.5 py-0.5 text-xs',
    icon: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    gap: 'gap-2',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  lastSyncAt,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  // Formata a data da ultima sincronizacao
  const formatLastSync = () => {
    if (!lastSyncAt) return null;

    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const lastSyncFormatted = formatLastSync();

  return (
    <div
      className={`
        inline-flex items-center ${sizeConfig.gap} ${sizeConfig.container}
        rounded-full border font-medium
        ${config.bgColor} ${config.color}
        ${className}
      `}
    >
      {/* Icone */}
      <span className={sizeConfig.icon}>
        {config.icon}
      </span>

      {/* Label */}
      {showLabel && (
        <span>{config.label}</span>
      )}

      {/* Tempo desde ultima sincronizacao */}
      {lastSyncFormatted && showLabel && (
        <span className="opacity-70">({lastSyncFormatted})</span>
      )}
    </div>
  );
};

/**
 * Componente simplificado apenas com o indicador de ponto colorido
 */
interface SyncStatusDotProps {
  status: SyncStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const DOT_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export const SyncStatusDot: React.FC<SyncStatusDotProps> = ({
  status,
  size = 'md',
  pulse = false,
}) => {
  // Retorna a cor do ponto baseado no status
  const getColor = () => {
    switch (status) {
      case 'just_synced':
        return 'bg-emerald-500';
      case 'synced':
        return 'bg-green-500';
      case 'syncing':
        return 'bg-blue-500';
      case 'stale':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <span className="relative inline-flex">
      <span
        className={`
          ${DOT_SIZES[size]} rounded-full ${getColor()}
          ${pulse && status === 'syncing' ? 'animate-pulse' : ''}
        `}
      />
      {/* Efeito de pulse para syncing */}
      {status === 'syncing' && (
        <span
          className={`
            absolute inline-flex h-full w-full rounded-full
            ${getColor()} opacity-75 animate-ping
          `}
        />
      )}
    </span>
  );
};
