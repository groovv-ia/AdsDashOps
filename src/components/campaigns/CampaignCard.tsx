import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CampaignWithMetrics } from '../../lib/services/CampaignDataService';

interface CampaignCardProps {
  campaign: CampaignWithMetrics;
  onViewAnalysis: (campaignId: string) => void;
}

/**
 * Componente Card de Campanha
 *
 * Exibe informações essenciais de uma campanha em um card visual moderno
 * Inclui métricas principais, badges de status e botão de análise detalhada
 *
 * Features:
 * - Display de métricas resumidas (impressões, cliques, gastos, conversões)
 * - Indicadores visuais de performance (cores baseadas em ROAS)
 * - Badge de status da campanha (ativa, pausada, finalizada)
 * - Badge de plataforma (Meta, Google, TikTok)
 * - Informações de orçamento e período ativo
 * - Botão para acessar análise completa
 */
export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onViewAnalysis }) => {
  /**
   * Retorna cor do badge de status baseado no status da campanha
   */
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === 'ATIVO') return 'success';
    if (statusUpper === 'PAUSED' || statusUpper === 'PAUSADO') return 'warning';
    if (statusUpper === 'ENDED' || statusUpper === 'FINALIZADO') return 'error';
    return 'info';
  };

  /**
   * Retorna texto traduzido do status
   */
  const getStatusText = (status: string): string => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'ACTIVE') return 'Ativa';
    if (statusUpper === 'PAUSED') return 'Pausada';
    if (statusUpper === 'ENDED') return 'Finalizada';
    return status;
  };

  /**
   * Retorna cor do badge de plataforma
   */
  const getPlatformColor = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'meta':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'google':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'tiktok':
        return 'bg-pink-100 text-pink-700 border-pink-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  /**
   * Retorna cor de fundo do card baseado na performance (ROAS)
   * ATUALIZADO: Verifica se tem dados antes de avaliar performance
   */
  const getPerformanceColor = (): string => {
    const roas = campaign.metrics.roas;
    const hasMetrics = campaign.metrics.impressions > 0 || campaign.metrics.spend > 0;

    // Se não tem métricas, usa cor neutra
    if (!hasMetrics) return 'border-l-4 border-l-gray-300';

    // Se tem métricas, avalia performance
    if (roas >= 3) return 'border-l-4 border-l-green-500';
    if (roas >= 1.5) return 'border-l-4 border-l-yellow-500';
    if (roas > 0) return 'border-l-4 border-l-orange-500';
    return 'border-l-4 border-l-gray-300';
  };

  /**
   * Formata valores monetários
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Formata números grandes de forma compacta (ex: 1.5K, 2.3M)
   */
  const formatCompactNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  /**
   * Formata tempo relativo da última sincronização
   */
  const getLastSyncText = (): string => {
    if (!campaign.last_sync) return 'Não sincronizado';

    const lastSync = new Date(campaign.last_sync);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays}d`;
  };

  /**
   * Traduz objetivos de campanha
   */
  const getObjectiveText = (objective: string): string => {
    const objectivesMap: Record<string, string> = {
      'CONVERSIONS': 'Conversões',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_AWARENESS': 'Reconhecimento',
      'OUTCOME_SALES': 'Vendas',
      'REACH': 'Alcance',
      'TRAFFIC': 'Tráfego',
      'ENGAGEMENT': 'Engajamento',
      'APP_INSTALLS': 'Instalações de App',
      'VIDEO_VIEWS': 'Visualizações de Vídeo',
      'LEAD_GENERATION': 'Geração de Leads',
      'MESSAGES': 'Mensagens',
      'STORE_VISITS': 'Visitas à Loja',
    };

    return objectivesMap[objective.toUpperCase()] || objective;
  };

  // Verifica se a campanha tem métricas
  const hasMetrics = campaign.metrics.impressions > 0 || campaign.metrics.spend > 0 || campaign.metrics.clicks > 0;

  return (
    <Card
      className={`hover:shadow-xl transition-all duration-300 ${getPerformanceColor()} overflow-hidden`}
    >
      {/* Banner de aviso se não tiver métricas */}
      {!hasMetrics && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <span className="text-xs text-yellow-800">Sem métricas - Execute uma nova sincronização</span>
        </div>
      )}

      {/* Header do card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 truncate mb-2" title={campaign.name}>
            {campaign.name}
          </h3>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlatformColor(campaign.platform)}`}>
              {campaign.platform}
            </span>
            <Badge variant={getStatusVariant(campaign.status)}>
              {getStatusText(campaign.status)}
            </Badge>
            <span className="text-xs text-gray-500">
              {getObjectiveText(campaign.objective)}
            </span>
          </div>
        </div>
      </div>

      {/* Seção de métricas principais */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Impressões */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center space-x-2 mb-1">
            <Eye className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Impressões</span>
          </div>
          <p className="text-xl font-bold text-blue-900">
            {formatCompactNumber(campaign.metrics.impressions)}
          </p>
        </div>

        {/* Cliques */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center space-x-2 mb-1">
            <MousePointer className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Cliques</span>
          </div>
          <p className="text-xl font-bold text-purple-900">
            {formatCompactNumber(campaign.metrics.clicks)}
          </p>
        </div>

        {/* Gastos */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Gasto</span>
          </div>
          <p className="text-xl font-bold text-orange-900">
            {formatCurrency(campaign.metrics.spend)}
          </p>
        </div>

        {/* Conversões */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Conversões</span>
          </div>
          <p className="text-xl font-bold text-green-900">
            {formatCompactNumber(campaign.metrics.conversions)}
          </p>
        </div>
      </div>

      {/* Seção de métricas calculadas */}
      <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">CTR</p>
          <p className="text-sm font-semibold text-gray-900">
            {campaign.metrics.ctr.toFixed(2)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">CPC</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(campaign.metrics.cpc)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">ROAS</p>
          <div className="flex items-center justify-center space-x-1">
            <p className="text-sm font-semibold text-gray-900">
              {campaign.metrics.roas.toFixed(2)}x
            </p>
            {campaign.metrics.roas >= 2 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : campaign.metrics.roas >= 1 ? (
              <TrendingUp className="h-3 w-3 text-yellow-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="space-y-2 mb-4">
        {/* Orçamento */}
        {(campaign.daily_budget || campaign.lifetime_budget) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Orçamento:</span>
            <span className="font-medium text-gray-900">
              {campaign.daily_budget
                ? `${formatCurrency(campaign.daily_budget)}/dia`
                : campaign.lifetime_budget
                  ? `${formatCurrency(campaign.lifetime_budget)} total`
                  : 'Não definido'}
            </span>
          </div>
        )}

        {/* Dias ativos */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Período ativo:</span>
          <span className="font-medium text-gray-900">
            {campaign.days_active} {campaign.days_active === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        {/* Ad Sets e Ads */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Conjuntos/Anúncios:</span>
          <span className="font-medium text-gray-900">
            {campaign.total_ad_sets} / {campaign.total_ads}
          </span>
        </div>

        {/* Última sincronização */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Última sync:
          </span>
          <span className="font-medium text-gray-900">
            {getLastSyncText()}
          </span>
        </div>
      </div>

      {/* Botão de ação */}
      <Button
        onClick={() => onViewAnalysis(campaign.id)}
        className="w-full"
        size="sm"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Ver Análise Completa
        <ExternalLink className="h-3 w-3 ml-2" />
      </Button>
    </Card>
  );
};
