/**
 * GoogleCampaignCard
 *
 * Card de exibicao de uma campanha do Google Ads com metricas.
 * Mostra informacoes resumidas e permite navegacao para detalhes.
 */

import React from 'react';
import {
  Eye,
  MousePointer,
  DollarSign,
  Target,
  TrendingUp,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Search,
  Monitor,
  Video,
  ShoppingBag,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { GoogleCampaignWithMetrics } from '../../lib/services/GoogleInsightsDataService';

interface GoogleCampaignCardProps {
  campaign: GoogleCampaignWithMetrics;
  onClick: () => void;
}

export const GoogleCampaignCard: React.FC<GoogleCampaignCardProps> = ({
  campaign,
  onClick,
}) => {
  /**
   * Retorna icone baseado no tipo de canal da campanha
   */
  const getChannelIcon = () => {
    switch (campaign.advertising_channel_type) {
      case 'SEARCH':
        return <Search className="w-4 h-4" />;
      case 'DISPLAY':
        return <Monitor className="w-4 h-4" />;
      case 'VIDEO':
        return <Video className="w-4 h-4" />;
      case 'SHOPPING':
        return <ShoppingBag className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  /**
   * Retorna cor do badge de status
   */
  const getStatusStyles = () => {
    switch (campaign.status) {
      case 'ENABLED':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          icon: <Play className="w-3 h-3" />,
          label: 'Ativa',
        };
      case 'PAUSED':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          icon: <Pause className="w-3 h-3" />,
          label: 'Pausada',
        };
      case 'REMOVED':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: <Trash2 className="w-3 h-3" />,
          label: 'Removida',
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          icon: null,
          label: campaign.status,
        };
    }
  };

  /**
   * Retorna cor do badge do tipo de canal
   */
  const getChannelStyles = () => {
    switch (campaign.advertising_channel_type) {
      case 'SEARCH':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'DISPLAY':
        return { bg: 'bg-purple-100', text: 'text-purple-700' };
      case 'VIDEO':
        return { bg: 'bg-rose-100', text: 'text-rose-700' };
      case 'SHOPPING':
        return { bg: 'bg-orange-100', text: 'text-orange-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700' };
    }
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
   * Formata numeros grandes
   */
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  const statusStyles = getStatusStyles();
  const channelStyles = getChannelStyles();

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Badge de Tipo */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${channelStyles.bg} ${channelStyles.text}`}>
              {getChannelIcon()}
              {campaign.advertising_channel_type || 'N/A'}
            </span>

            {/* Badge de Status */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
              {statusStyles.icon}
              {statusStyles.label}
            </span>
          </div>

          {/* Nome da Campanha */}
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
            {campaign.name}
          </h3>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
      </div>

      {/* Metricas Principais */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Impressoes */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Impressoes</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatNumber(campaign.impressions)}
            </p>
          </div>
        </div>

        {/* Cliques */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded">
            <MousePointer className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Cliques</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatNumber(campaign.clicks)}
            </p>
          </div>
        </div>

        {/* Custo */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 rounded">
            <DollarSign className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Investimento</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(campaign.cost)}
            </p>
          </div>
        </div>

        {/* Conversoes */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 rounded">
            <Target className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Conversoes</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatNumber(campaign.conversions)}
            </p>
          </div>
        </div>
      </div>

      {/* Metricas Secundarias */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          {/* CTR */}
          <div className="text-center">
            <p className="text-xs text-slate-500">CTR</p>
            <p className="text-sm font-medium text-slate-700">
              {campaign.ctr.toFixed(2)}%
            </p>
          </div>

          {/* CPC */}
          <div className="text-center">
            <p className="text-xs text-slate-500">CPC</p>
            <p className="text-sm font-medium text-slate-700">
              {formatCurrency(campaign.cpc)}
            </p>
          </div>

          {/* ROAS */}
          <div className="text-center">
            <p className="text-xs text-slate-500">ROAS</p>
            <p className={`text-sm font-medium ${campaign.roas >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
              {campaign.roas.toFixed(2)}x
            </p>
          </div>
        </div>

        {/* Indicador de Performance */}
        {campaign.roas >= 2 && (
          <div className="flex items-center gap-1 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Bom</span>
          </div>
        )}
      </div>
    </Card>
  );
};
