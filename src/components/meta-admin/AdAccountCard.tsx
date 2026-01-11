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
  Layers,
  Grid3X3,
  ImageIcon,
  Calendar,
  Activity,
  Zap,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Interface para contagem de entidades (total e ativos)
interface EntityCount {
  total: number;
  active: number;
}

// Interface para contagem de todas as entidades da conta
interface EntityCounts {
  campaign: EntityCount;
  adset: EntityCount;
  ad: EntityCount;
}

// Interface para métricas recentes (últimas 48h)
interface RecentMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
}

// Interface para atividade recente da conta
interface RecentActivity {
  has_recent_spend: boolean;
  has_recent_impressions: boolean;
  last_activity_date: string | null;
  active_ads_count: number;
  recent_metrics: RecentMetrics;
  activity_status: 'active' | 'paused' | 'inactive';
  days_since_last_activity: number | null;
  is_really_active: boolean;
}

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
  // Novos campos para indicadores de entidades
  entityCounts?: EntityCounts; // Contagem de campanhas, adsets e ads (total/ativos)
  latestDataDate?: string; // Data mais recente dos dados sincronizados (ISO)
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    reach?: number;
    cpc?: number;
    cpm?: number;
  };
  // Informações de atividade recente (últimas 48h)
  recentActivity?: RecentActivity;
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

  // Retorna cor da borda lateral baseado no status de atividade real e sincronização
  const getPerformanceColor = (): string => {
    // Prioridade 1: Status de atividade real (se disponível)
    if (account.recentActivity) {
      // Conta realmente ativa (com spend ou impressões nas últimas 48h)
      if (account.recentActivity.is_really_active) {
        return 'border-l-4 border-l-emerald-500';
      }
      // Tem anúncios ativos mas sem métricas recentes (ramp-up ou problema)
      if (account.recentActivity.activity_status === 'paused' && account.recentActivity.active_ads_count > 0) {
        return 'border-l-4 border-l-amber-500';
      }
      // Inativa (sem anúncios ativos e sem métricas)
      if (account.recentActivity.activity_status === 'inactive') {
        return 'border-l-4 border-l-gray-400';
      }
    }

    // Prioridade 2: Status de sincronização (fallback)
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

  // Formata tempo relativo para a data mais recente dos dados
  // Retorna strings como "hoje", "ha 1 dia", "ha 3 dias", etc.
  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return 'Sem dados';

    const date = new Date(dateString);
    const now = new Date();
    // Zera horas para comparar apenas datas
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'ha 1 dia';
    if (diffDays < 7) return `ha ${diffDays} dias`;
    if (diffDays < 14) return 'ha 1 semana';
    if (diffDays < 30) return `ha ${Math.floor(diffDays / 7)} semanas`;
    return `ha ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  };

  // Verifica se a conta tem entidades sincronizadas
  const hasEntityCounts = account.entityCounts &&
    (account.entityCounts.campaign.total > 0 ||
     account.entityCounts.adset.total > 0 ||
     account.entityCounts.ad.total > 0);

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
            {/* Badge de atividade real (últimas 48h) */}
            {account.recentActivity && (
              <>
                {account.recentActivity.is_really_active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse">
                    <Zap className="w-3 h-3 mr-1" />
                    Ativa Agora
                  </span>
                ) : account.recentActivity.activity_status === 'paused' && account.recentActivity.active_ads_count > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-100 text-amber-700 border-amber-300">
                    <Activity className="w-3 h-3 mr-1" />
                    Sem Atividade
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
                    <Activity className="w-3 h-3 mr-1" />
                    Inativa
                  </span>
                )}
              </>
            )}
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

      {/* Seção de Métricas Recentes (Últimas 48h) */}
      {account.recentActivity && account.recentActivity.is_really_active && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-semibold text-gray-900">Atividade Recente (48h)</h4>
            </div>
            {account.recentActivity.days_since_last_activity !== null && (
              <span className="text-xs text-gray-500">
                Última atividade: {account.recentActivity.days_since_last_activity === 0 ? 'hoje' : `há ${account.recentActivity.days_since_last_activity}d`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Gasto Recente */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-2.5 border border-emerald-200">
              <div className="flex items-center space-x-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Gasto</span>
              </div>
              <p className="text-base font-bold text-emerald-900">
                {formatCurrency(account.recentActivity.recent_metrics.spend || 0, account.currency)}
              </p>
            </div>

            {/* Impressões Recentes */}
            <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-lg p-2.5 border border-sky-200">
              <div className="flex items-center space-x-1.5 mb-1">
                <Eye className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-xs font-medium text-sky-700">Impressões</span>
              </div>
              <p className="text-base font-bold text-sky-900">
                {formatCompact(account.recentActivity.recent_metrics.impressions)}
              </p>
            </div>

            {/* Cliques Recentes */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-2.5 border border-orange-200">
              <div className="flex items-center space-x-1.5 mb-1">
                <MousePointer className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Cliques</span>
              </div>
              <p className="text-base font-bold text-orange-900">
                {formatCompact(account.recentActivity.recent_metrics.clicks)}
              </p>
            </div>

            {/* Anúncios Ativos */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2.5 border border-teal-200">
              <div className="flex items-center space-x-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-xs font-medium text-teal-700">Ads Ativos</span>
              </div>
              <p className="text-base font-bold text-teal-900">
                {account.recentActivity.active_ads_count}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Secao de indicadores de entidades (campanhas, conjuntos, anuncios) */}
      {hasEntityCounts && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          {/* Badges de entidades em linha */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Campanhas */}
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium">
                <span className="text-green-600">{account.entityCounts?.campaign.active || 0}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{account.entityCounts?.campaign.total || 0}</span>
              </span>
              <span className="text-xs text-gray-500">camp.</span>
            </div>
            {/* Conjuntos */}
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-cyan-50 rounded-lg border border-cyan-100">
              <Grid3X3 className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-xs font-medium">
                <span className="text-green-600">{account.entityCounts?.adset.active || 0}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{account.entityCounts?.adset.total || 0}</span>
              </span>
              <span className="text-xs text-gray-500">conj.</span>
            </div>
            {/* Anuncios */}
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-teal-50 rounded-lg border border-teal-100">
              <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-medium">
                <span className="text-green-600">{account.entityCounts?.ad.active || 0}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{account.entityCounts?.ad.total || 0}</span>
              </span>
              <span className="text-xs text-gray-500">ads</span>
            </div>
          </div>
          {/* Indicador de freshness dos dados */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>Dados ate <span className="font-medium text-gray-700">{formatRelativeTime(account.latestDataDate)}</span></span>
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
