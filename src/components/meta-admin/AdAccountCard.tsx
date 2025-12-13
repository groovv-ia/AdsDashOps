/**
 * AdAccountCard
 *
 * Card visual para exibir uma conta de anuncios do Meta Ads.
 * Mostra nome, ID, status, metricas resumidas e acoes de sincronizacao.
 */

import React from 'react';
import {
  Building2,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Interface para os dados da conta de anuncios
export interface AdAccountData {
  id: string;
  metaId: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  lastSyncAt?: string;
  syncStatus?: 'synced' | 'syncing' | 'stale' | 'error' | 'never';
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

interface AdAccountCardProps {
  account: AdAccountData;
  isSelected?: boolean;
  isSyncing?: boolean;
  onSelect: (accountId: string) => void;
  onSync: (accountId: string) => void;
}

export const AdAccountCard: React.FC<AdAccountCardProps> = ({
  account,
  isSelected = false,
  isSyncing = false,
  onSelect,
  onSync,
}) => {
  // Formata valor monetario
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formata numeros grandes de forma compacta
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  // Retorna a cor e icone baseado no status de sincronizacao
  const getSyncStatusInfo = () => {
    switch (account.syncStatus) {
      case 'synced':
        return {
          color: 'text-green-600 bg-green-50',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: 'Sincronizado',
        };
      case 'syncing':
        return {
          color: 'text-blue-600 bg-blue-50',
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          label: 'Sincronizando',
        };
      case 'stale':
        return {
          color: 'text-amber-600 bg-amber-50',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Desatualizado',
        };
      case 'error':
        return {
          color: 'text-red-600 bg-red-50',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Erro',
        };
      default:
        return {
          color: 'text-gray-500 bg-gray-50',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Nunca sincronizado',
        };
    }
  };

  // Retorna cor do status da conta (ACTIVE, PAUSED, etc)
  const getAccountStatusColor = () => {
    switch (account.status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'DISABLED':
        return 'bg-red-100 text-red-700';
      case 'PAUSED':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const syncInfo = getSyncStatusInfo();

  // Formata a data da ultima sincronizacao
  const formatLastSync = () => {
    if (!account.lastSyncAt) return 'Nunca';

    const date = new Date(account.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Ha poucos minutos';
    if (diffHours < 24) return `Ha ${diffHours}h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Ha ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div
      className={`
        relative bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer
        hover:shadow-lg hover:border-blue-300
        ${isSelected ? 'border-blue-500 shadow-lg ring-2 ring-blue-100' : 'border-gray-200'}
      `}
      onClick={() => onSelect(account.id)}
    >
      {/* Header do Card com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white truncate" title={account.name}>
                {account.name}
              </h3>
              <p className="text-xs text-blue-100 font-mono">
                {account.metaId}
              </p>
            </div>
          </div>

          {/* Badge de status da conta */}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAccountStatusColor()}`}>
            {account.status}
          </span>
        </div>
      </div>

      {/* Corpo do Card */}
      <div className="p-4">
        {/* Info de sincronizacao */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-xs font-medium ${syncInfo.color}`}>
            {syncInfo.icon}
            <span>{syncInfo.label}</span>
          </div>
          <span className="text-xs text-gray-500">
            {formatLastSync()}
          </span>
        </div>

        {/* Metricas em Grid */}
        {account.metrics ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Gasto */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-gray-500 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs">Gasto</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(account.metrics.spend, account.currency)}
              </p>
            </div>

            {/* Impressoes */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-gray-500 mb-1">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">Impressoes</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatCompact(account.metrics.impressions)}
              </p>
            </div>

            {/* Cliques */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-gray-500 mb-1">
                <MousePointer className="w-3.5 h-3.5" />
                <span className="text-xs">Cliques</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatCompact(account.metrics.clicks)}
              </p>
            </div>

            {/* CTR */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-gray-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs">CTR</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {account.metrics.ctr.toFixed(2)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-gray-500">
              Sincronize para ver metricas
            </p>
          </div>
        )}

        {/* Acoes */}
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSync(account.id);
            }}
            disabled={isSyncing}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg
              text-sm font-medium transition-colors
              ${isSyncing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
            `}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sincronizar</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSelect(account.id)}
            className="flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Ver detalhes"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Info adicional */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{account.currency}</span>
          <span>{account.timezone}</span>
        </div>
      </div>

      {/* Indicador de selecao */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};
