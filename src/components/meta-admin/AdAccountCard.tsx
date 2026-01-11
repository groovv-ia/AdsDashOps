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

import React, { useState, useEffect } from 'react';
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
  Image,
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
  lastSyncDuration?: number; // Duracao da ultima sincronizacao em segundos
  syncStatus?: 'synced' | 'syncing' | 'stale' | 'error' | 'never';
  syncProgress?: number; // Progresso atual da sincronizacao (0-100)
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
  onSync: (accountId: string, syncCreatives: boolean) => void;
}

export const AdAccountCard: React.FC<AdAccountCardProps> = ({
  account,
  isSelected = false,
  isSyncing = false,
  onSelect,
  onSync,
}) => {
  // Estado para controlar se deve sincronizar criativos (imagens e videos dos anúncios)
  // Carrega preferência do localStorage ou usa true como padrão
  const [syncCreatives, setSyncCreatives] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`meta_sync_creatives_${account.metaId}`);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Salva a preferência de sincronização de criativos no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(`meta_sync_creatives_${account.metaId}`, String(syncCreatives));
    } catch (error) {
      console.error('Erro ao salvar preferência de criativos:', error);
    }
  }, [syncCreatives, account.metaId]);

  // Componente de progresso circular
  const CircularProgress: React.FC<{ progress: number; size?: number }> = ({
    progress,
    size = 48
  }) => {
    const circumference = 2 * Math.PI * (size / 2 - 4);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Circulo de fundo */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-blue-100"
          />
          {/* Circulo de progresso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-blue-600 transition-all duration-500 ease-out"
          />
        </svg>
        {/* Porcentagem central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-900">
            {progress}%
          </span>
        </div>
      </div>
    );
  };
  // Formata valor monetario
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Formata numeros grandes de forma compacta (ex: 1.5K, 2.3M)
  // Retorna '0' se o valor for undefined ou null
  const formatCompact = (value: number | undefined | null) => {
    if (value === undefined || value === null) {
      return '0';
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  // Retorna cor da borda lateral baseado no status de sincronização
  const getPerformanceColor = (): string => {
    // Se está sincronizado, borda verde
    if (account.syncStatus === 'synced') {
      return 'border-l-4 border-l-green-500';
    }

    // Se está sincronizando, borda azul
    if (account.syncStatus === 'syncing') {
      return 'border-l-4 border-l-blue-500';
    }

    // Se tem erro, borda vermelha
    if (account.syncStatus === 'error') {
      return 'border-l-4 border-l-red-500';
    }

    // Se está desatualizado, borda amarela
    if (account.syncStatus === 'stale') {
      return 'border-l-4 border-l-yellow-500';
    }

    // Nunca sincronizado ou sem métricas, borda cinza
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
    if (!account.lastSyncAt) return 'Nunca sincronizado';

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

  // Formata a data completa da ultima sincronizacao
  const formatLastSyncFull = () => {
    if (!account.lastSyncAt) return null;

    const date = new Date(account.lastSyncAt);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formata a duracao da sincronizacao
  const formatSyncDuration = () => {
    if (!account.lastSyncDuration) return null;

    if (account.lastSyncDuration < 60) {
      return `${account.lastSyncDuration}s`;
    }

    const minutes = Math.floor(account.lastSyncDuration / 60);
    const seconds = account.lastSyncDuration % 60;
    return `${minutes}min ${seconds}s`;
  };

  // Calcula CPC e CPM se nao estiver presente (com verificacoes de undefined)
  const cpc = account.metrics?.cpc ?? (
    account.metrics?.clicks && account.metrics?.spend
      ? account.metrics.spend / account.metrics.clicks
      : 0
  );
  const cpm = account.metrics?.cpm ?? (
    account.metrics?.impressions && account.metrics?.spend
      ? (account.metrics.spend / account.metrics.impressions) * 1000
      : 0
  );

  // Verifica se a conta tem metricas completas (spend e impressions definidos)
  const hasMetrics = account.metrics &&
    typeof account.metrics.spend === 'number' &&
    ((account.metrics.impressions || 0) > 0 || account.metrics.spend > 0);

  return (
    <Card
      className={`
        hover:shadow-xl transition-all duration-300 ${getPerformanceColor()} overflow-hidden
        cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:bg-gray-50/50
        ${isSelected ? 'ring-2 ring-blue-400 shadow-lg bg-blue-50/30' : ''}
      `}
      onClick={() => onSelect(account.id)}
      title="Clique para ver detalhes da conta"
    >
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
      {/* So mostra metricas se tiver spend, impressions, clicks (estrutura completa) */}
      {account.metrics && typeof account.metrics.spend === 'number' && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Gasto */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Gasto</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(account.metrics.spend || 0, account.currency)}
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
              {formatCompact(account.metrics.reach)}
            </p>
          </div>
        </div>
      )}

      {/* Secao de metricas calculadas - linha horizontal */}
      {account.metrics && typeof account.metrics.ctr === 'number' && (
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">CTR</p>
            <div className="flex items-center justify-center space-x-1">
              <p className="text-sm font-semibold text-gray-900">
                {(account.metrics.ctr || 0).toFixed(2)}%
              </p>
              {(account.metrics.ctr || 0) >= 2 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (account.metrics.ctr || 0) >= 1 ? (
                <TrendingUp className="h-3 w-3 text-yellow-600" />
              ) : (account.metrics.ctr || 0) > 0 ? (
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

      {/* Info de sincronizacao com progresso */}
      <div className="mb-4">
        {/* Sincronizacao em progresso - com grafico circular */}
        {account.syncStatus === 'syncing' && account.syncProgress !== undefined && (
          <div className={`rounded-lg p-4 mb-3 border transition-all duration-300 ${
            account.syncProgress === 100
              ? 'bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-300'
              : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-4">
              {/* Grafico circular de progresso ou check verde */}
              <div className="flex-shrink-0">
                {account.syncProgress === 100 ? (
                  <div className="relative">
                    {/* Animação de check verde */}
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    {/* Círculo de pulso */}
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                  </div>
                ) : (
                  <CircularProgress progress={account.syncProgress} size={56} />
                )}
              </div>

              {/* Informacoes da sincronizacao */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {account.syncProgress === 100 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">
                        Sincronização concluída!
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-sm font-semibold text-blue-900">
                        Sincronizando dados...
                      </span>
                    </>
                  )}
                </div>

                {/* Barra de progresso linear */}
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                      account.syncProgress === 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${account.syncProgress}%` }}
                  >
                    {/* Animacao de brilho */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>

                {/* Mensagem de status */}
                <p className={`text-xs mt-2 ${
                  account.syncProgress === 100
                    ? 'text-green-700 font-medium'
                    : 'text-blue-700'
                }`}>
                  {account.syncProgress === 100
                    ? 'Redirecionando para detalhes da conta...'
                    : 'Aguarde enquanto os dados são sincronizados com o Meta Ads'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status e ultima sincronizacao */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${syncInfo.color}`}>
            {syncInfo.icon}
            <span>{syncInfo.label}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatLastSync()}</span>
            </div>
            {formatLastSyncFull() && account.syncStatus !== 'syncing' && (
              <div className="text-xs text-gray-400 mt-0.5">
                {formatLastSyncFull()}
              </div>
            )}
          </div>
        </div>

        {/* Duracao da ultima sincronizacao */}
        {formatSyncDuration() && account.syncStatus !== 'syncing' && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Ultima sincronizacao concluida em</span>
            <span className="font-semibold text-blue-600">{formatSyncDuration()}</span>
          </div>
        )}
      </div>

      {/* Opcao para incluir criativos na sincronizacao */}
      <div
        className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex items-start space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={syncCreatives}
            onChange={(e) => setSyncCreatives(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-colors"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Image className={`w-4 h-4 transition-colors ${syncCreatives ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium transition-colors ${syncCreatives ? 'text-gray-900' : 'text-gray-600'}`}>
                Incluir criativos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Imagens e vídeos dos anúncios
            </p>
          </div>
        </label>
      </div>

      {/* Acoes */}
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSync(account.id, syncCreatives);
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

        {/* Indicador visual de que o card é clicável */}
        <div className="flex items-center justify-center p-2.5 rounded-lg bg-blue-50 text-blue-600">
          <ChevronRight className="w-5 h-5" />
        </div>
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
