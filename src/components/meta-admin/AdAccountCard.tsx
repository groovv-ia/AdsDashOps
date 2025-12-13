/**
 * AdAccountCard
 *
 * Card visual para exibir uma conta de anuncios do Meta Ads.
 * Design inspirado no CampaignCard para consistencia visual.
 *
 * Features:
 * - Indicador lateral de status colorido
 * - Metricas com fundo gradiente e cores por categoria
 * - Metricas secundarias em linha
 * - Info adicional e botao de acao
 */

import React from 'react';
import {
  Building2,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  BarChart3,
  Globe,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

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
    reach?: number;
    cpc?: number;
    cpm?: number;
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
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Formata numeros grandes de forma compacta (ex: 1.5K, 2.3M)
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  // Retorna cor da borda lateral baseado no status e metricas
  const getPerformanceColor = (): string => {
    if (!account.metrics) return 'border-l-4 border-l-gray-300';

    const hasMetrics = account.metrics.impressions > 0 || account.metrics.spend > 0;
    if (!hasMetrics) return 'border-l-4 border-l-gray-300';

    // Baseado no CTR para indicar performance
    const ctr = account.metrics.ctr;
    if (ctr >= 2) return 'border-l-4 border-l-green-500';
    if (ctr >= 1) return 'border-l-4 border-l-yellow-500';
    if (ctr > 0) return 'border-l-4 border-l-orange-500';
    return 'border-l-4 border-l-gray-300';
  };

  // Retorna a cor e icone baseado no status de sincronizacao
  const getSyncStatusInfo = () => {
    switch (account.syncStatus) {
      case 'synced':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: 'Sincronizado',
        };
      case 'syncing':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          label: 'Sincronizando',
        };
      case 'stale':
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Desatualizado',
        };
      case 'error':
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Erro',
        };
      default:
        return {
          color: 'text-gray-500 bg-gray-50 border-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Nunca sincronizado',
        };
    }
  };

  // Retorna variante do badge de status
  const getStatusVariant = (): 'success' | 'warning' | 'error' | 'info' => {
    switch (account.status) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'DISABLED':
        return 'error';
      default:
        return 'info';
    }
  };

  // Retorna texto traduzido do status
  const getStatusText = (): string => {
    switch (account.status) {
      case 'ACTIVE':
        return 'Ativa';
      case 'PAUSED':
        return 'Pausada';
      case 'DISABLED':
        return 'Desativada';
      default:
        return account.status;
    }
  };

  const syncInfo = getSyncStatusInfo();

  // Formata a data da ultima sincronizacao
  const formatLastSync = () => {
    if (!account.lastSyncAt) return 'Nunca';

    const date = new Date(account.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Ha ${diffMins} min`;
    if (diffHours < 24) return `Ha ${diffHours}h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Ha ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Calcula CPC e CPM se nao estiver presente
  const cpc = account.metrics?.cpc ?? (account.metrics?.clicks ? account.metrics.spend / account.metrics.clicks : 0);
  const cpm = account.metrics?.cpm ?? (account.metrics?.impressions ? (account.metrics.spend / account.metrics.impressions) * 1000 : 0);

  // Verifica se a conta tem metricas
  const hasMetrics = account.metrics && (account.metrics.impressions > 0 || account.metrics.spend > 0);

  return (
    <Card
      className={`
        hover:shadow-xl transition-all duration-300 ${getPerformanceColor()} overflow-hidden cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}
      `}
      onClick={() => onSelect(account.id)}
    >
      {/* Banner de aviso se nao tiver metricas */}
      {!hasMetrics && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <span className="text-xs text-yellow-800">
            Sem metricas - Clique em sincronizar
          </span>
        </div>
      )}

      {/* Header do card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 truncate" title={account.name}>
              {account.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-300">
              Meta
            </span>
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
            <span className="text-xs text-gray-500 font-mono">{account.metaId}</span>
          </div>
        </div>
      </div>

      {/* Secao de metricas principais - Grid 2x2 com gradientes */}
      {account.metrics && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Gasto */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Gasto</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(account.metrics.spend, account.currency)}
            </p>
          </div>

          {/* Impressoes */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Impressoes</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {formatCompact(account.metrics.impressions)}
            </p>
          </div>

          {/* Cliques */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center space-x-2 mb-1">
              <MousePointer className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">Cliques</span>
            </div>
            <p className="text-xl font-bold text-orange-900">
              {formatCompact(account.metrics.clicks)}
            </p>
          </div>

          {/* Alcance */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-3 border border-teal-200">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-medium text-teal-700">Alcance</span>
            </div>
            <p className="text-xl font-bold text-teal-900">
              {formatCompact(account.metrics.reach || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Secao de metricas calculadas - linha horizontal */}
      {account.metrics && (
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">CTR</p>
            <div className="flex items-center justify-center space-x-1">
              <p className="text-sm font-semibold text-gray-900">
                {account.metrics.ctr.toFixed(2)}%
              </p>
              {account.metrics.ctr >= 2 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : account.metrics.ctr >= 1 ? (
                <TrendingUp className="h-3 w-3 text-yellow-600" />
              ) : account.metrics.ctr > 0 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">CPC</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(cpc, account.currency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">CPM</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(cpm, account.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Estado sem metricas */}
      {!account.metrics && (
        <div className="bg-gray-50 rounded-lg p-6 mb-4 text-center">
          <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Sincronize para ver metricas
          </p>
        </div>
      )}

      {/* Info de sincronizacao */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${syncInfo.color}`}>
          {syncInfo.icon}
          <span>{syncInfo.label}</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatLastSync()}</span>
        </div>
      </div>

      {/* Acoes */}
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSync(account.id);
          }}
          disabled={isSyncing}
          className={`
            flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg
            text-sm font-medium transition-all duration-200
            ${isSyncing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'}
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
          className="flex items-center justify-center p-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="Ver detalhes"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Info adicional */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <DollarSign className="w-3 h-3" />
          <span>{account.currency}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Globe className="w-3 h-3" />
          <span>{account.timezone}</span>
        </div>
      </div>

      {/* Indicador de selecao */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </Card>
  );
};
