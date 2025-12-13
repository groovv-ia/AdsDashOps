/**
 * CampaignCard
 *
 * Componente Card de Campanha para exibir informacoes e metricas
 * de uma campanha do Meta Ads.
 *
 * Features:
 * - Display de metricas resumidas (impressoes, cliques, gastos, conversoes)
 * - Indicadores visuais de performance (cores baseadas em ROAS)
 * - Badge de status da campanha (ativa, pausada, removida)
 * - Informacoes de orcamento e periodo ativo
 * - Botao para acessar analise completa
 */

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
  Percent,
  Users,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CampaignWithMetrics } from '../../lib/services/CampaignDataService';

interface CampaignCardProps {
  campaign: CampaignWithMetrics;
  onViewAnalysis: (campaignId: string) => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onViewAnalysis }) => {
  /**
   * Retorna variante do badge de status baseado no status da campanha
   */
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === 'ATIVO') return 'success';
    if (statusUpper === 'PAUSED' || statusUpper === 'PAUSADO') return 'warning';
    if (statusUpper === 'ENDED' || statusUpper === 'FINALIZADO' || statusUpper === 'DELETED')
      return 'error';
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
    if (statusUpper === 'DELETED') return 'Removida';
    return status;
  };

  /**
   * Retorna cor de borda do card baseado na performance (ROAS)
   */
  const getPerformanceColor = (): string => {
    const roas = campaign.metrics.roas;
    const hasMetrics = campaign.metrics.impressions > 0 || campaign.metrics.spend > 0;

    // Se nao tem metricas, usa cor neutra
    if (!hasMetrics) return 'border-l-4 border-l-gray-300';

    // Se tem metricas, avalia performance
    if (roas >= 3) return 'border-l-4 border-l-green-500';
    if (roas >= 1.5) return 'border-l-4 border-l-yellow-500';
    if (roas > 0) return 'border-l-4 border-l-orange-500';
    return 'border-l-4 border-l-gray-300';
  };

  /**
   * Formata valores monetarios
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Formata numeros grandes de forma compacta (ex: 1.5K, 2.3M)
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
   * Formata tempo relativo da ultima sincronizacao
   */
  const getLastSyncText = (): string => {
    if (!campaign.last_sync) return 'Nao sincronizado';

    const lastSync = new Date(campaign.last_sync);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Ha ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Ha ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Ha ${diffDays}d`;
  };

  /**
   * Traduz objetivos de campanha
   */
  const getObjectiveText = (objective: string): string => {
    const objectivesMap: Record<string, string> = {
      CONVERSIONS: 'Conversoes',
      OUTCOME_TRAFFIC: 'Trafego',
      OUTCOME_ENGAGEMENT: 'Engajamento',
      OUTCOME_LEADS: 'Leads',
      OUTCOME_AWARENESS: 'Reconhecimento',
      OUTCOME_SALES: 'Vendas',
      REACH: 'Alcance',
      TRAFFIC: 'Trafego',
      ENGAGEMENT: 'Engajamento',
      APP_INSTALLS: 'Instalacoes de App',
      VIDEO_VIEWS: 'Visualizacoes de Video',
      LEAD_GENERATION: 'Geracao de Leads',
      MESSAGES: 'Mensagens',
      STORE_VISITS: 'Visitas a Loja',
    };

    return objectivesMap[objective?.toUpperCase()] || objective || 'Geral';
  };

  // Verifica se a campanha tem metricas
  const hasMetrics =
    campaign.metrics.impressions > 0 ||
    campaign.metrics.spend > 0 ||
    campaign.metrics.clicks > 0;

  return (
    <Card
      className={`hover:shadow-xl transition-all duration-300 ${getPerformanceColor()} overflow-hidden`}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 truncate mb-2" title={campaign.name}>
            {campaign.name}
          </h3>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-300">
              Meta
            </span>
            <Badge variant={getStatusVariant(campaign.status)}>
              {getStatusText(campaign.status)}
            </Badge>
            <span className="text-xs text-gray-500">{getObjectiveText(campaign.objective)}</span>
          </div>
        </div>
      </div>

      {/* Secao de metricas principais */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Impressoes */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center space-x-2 mb-1">
            <Eye className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Impressoes</span>
          </div>
          <p className="text-xl font-bold text-blue-900">
            {formatCompactNumber(campaign.metrics.impressions)}
          </p>
        </div>

        {/* Cliques */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200">
          <div className="flex items-center space-x-2 mb-1">
            <MousePointer className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Cliques</span>
          </div>
          <p className="text-xl font-bold text-orange-900">
            {formatCompactNumber(campaign.metrics.clicks)}
          </p>
        </div>

        {/* Gastos */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Gasto</span>
          </div>
          <p className="text-xl font-bold text-green-900">
            {formatCurrency(campaign.metrics.spend)}
          </p>
        </div>

        {/* Alcance */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-3 border border-teal-200">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-medium text-teal-700">Alcance</span>
          </div>
          <p className="text-xl font-bold text-teal-900">
            {formatCompactNumber(campaign.metrics.reach)}
          </p>
        </div>
      </div>

      {/* Secao de metricas calculadas */}
      <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-gray-200">
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
          <p className="text-xs text-gray-500 mb-1">CPM</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(campaign.metrics.cpm)}
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
            ) : campaign.metrics.roas > 0 ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Conversoes destacadas */}
      {campaign.metrics.conversions > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 rounded-lg p-3 mb-4 border border-pink-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-pink-600" />
              <span className="text-sm font-medium text-pink-700">Conversoes</span>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-pink-900">
                {formatCompactNumber(campaign.metrics.conversions)}
              </p>
              {campaign.metrics.cost_per_result > 0 && (
                <p className="text-xs text-pink-600">
                  {formatCurrency(campaign.metrics.cost_per_result)} por resultado
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informacoes adicionais */}
      <div className="space-y-2 mb-4">
        {/* Orcamento */}
        {(campaign.daily_budget || campaign.lifetime_budget) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Orcamento:</span>
            <span className="font-medium text-gray-900">
              {campaign.daily_budget
                ? `${formatCurrency(campaign.daily_budget)}/dia`
                : campaign.lifetime_budget
                  ? `${formatCurrency(campaign.lifetime_budget)} total`
                  : 'Nao definido'}
            </span>
          </div>
        )}

        {/* Dias ativos */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Dias com dados:</span>
          <span className="font-medium text-gray-900">
            {campaign.days_active} {campaign.days_active === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        {/* Ultima sincronizacao */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Ultima data:
          </span>
          <span className="font-medium text-gray-900">{campaign.last_sync || '-'}</span>
        </div>
      </div>

      {/* Botao de acao */}
      <Button onClick={() => onViewAnalysis(campaign.id)} className="w-full" size="sm">
        <BarChart3 className="h-4 w-4 mr-2" />
        Ver Analise Completa
        <ExternalLink className="h-3 w-3 ml-2" />
      </Button>
    </Card>
  );
};
