import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  ArrowUpRight,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/utils/logger';

/**
 * Interface para métricas agregadas de campanhas
 */
interface AggregatedMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpc: number;
  roas: number;
  costPerResult: number;
}

/**
 * Interface para métricas de campanha individual
 */
interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

interface SelectedCampaignsMetricsProps {
  /** ID da conexão Meta */
  connectionId: string;
  /** Nome da conta para exibição */
  accountName: string;
  /** Callback para voltar */
  onBack?: () => void;
}

/**
 * Componente de visualização de métricas de campanhas selecionadas
 *
 * Exibe métricas agregadas e individuais apenas das campanhas selecionadas pelo usuário.
 * Permite filtrar por período e atualizar dados.
 *
 * Funcionalidades:
 * - Cards de resumo com métricas principais agregadas
 * - Tabela detalhada com métricas por campanha
 * - Filtro de período (7, 30, 90 dias ou customizado)
 * - Botão de atualização de dados
 * - Indicadores visuais de performance (tendências)
 */
export const SelectedCampaignsMetrics: React.FC<SelectedCampaignsMetricsProps> = ({
  connectionId,
  accountName,
  onBack
}) => {
  // Estados para dados
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics>({
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    reach: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    costPerResult: 0
  });
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics[]>([]);

  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Carrega métricas ao montar componente e quando período muda
   */
  useEffect(() => {
    loadMetrics();
  }, [connectionId, dateRange]);

  /**
   * Calcula datas baseado no período selecionado
   */
  const getDateRange = (): { startDate: string; endDate: string } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case '7':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  /**
   * Carrega métricas das campanhas selecionadas do banco
   */
  const loadMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Carregando métricas de campanhas selecionadas', { connectionId });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Busca campanhas selecionadas
      const { data: selectedCampaigns, error: selectedError } = await supabase
        .from('selected_campaigns')
        .select('campaign_id, campaign_name')
        .eq('connection_id', connectionId);

      if (selectedError) throw selectedError;
      if (!selectedCampaigns || selectedCampaigns.length === 0) {
        setError('Nenhuma campanha selecionada para esta conta');
        setLoading(false);
        return;
      }

      const campaignIds = selectedCampaigns.map(sc => sc.campaign_id);

      // Busca métricas das campanhas selecionadas
      const { startDate, endDate } = getDateRange();

      const { data: metricsData, error: metricsError } = await supabase
        .from('ad_metrics')
        .select(`
          campaign_id,
          date,
          impressions,
          clicks,
          spend,
          reach,
          ctr,
          cpc,
          conversions,
          roas
        `)
        .in('campaign_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .is('ad_set_id', null)
        .is('ad_id', null);

      if (metricsError) throw metricsError;

      // Calcula métricas agregadas
      const aggregated: AggregatedMetrics = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        reach: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        costPerResult: 0
      };

      // Métricas por campanha
      const byCampaign: Record<string, CampaignMetrics> = {};

      // Inicializa métricas por campanha
      selectedCampaigns.forEach(sc => {
        byCampaign[sc.campaign_id] = {
          campaignId: sc.campaign_id,
          campaignName: sc.campaign_name,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          roas: 0
        };
      });

      // Agrega métricas
      let metricsCount = 0;
      (metricsData || []).forEach(metric => {
        // Agregado total
        aggregated.impressions += metric.impressions || 0;
        aggregated.clicks += metric.clicks || 0;
        aggregated.spend += metric.spend || 0;
        aggregated.conversions += metric.conversions || 0;
        aggregated.reach += metric.reach || 0;
        aggregated.ctr += metric.ctr || 0;
        aggregated.cpc += metric.cpc || 0;
        aggregated.roas += metric.roas || 0;

        // Por campanha
        if (byCampaign[metric.campaign_id]) {
          byCampaign[metric.campaign_id].impressions += metric.impressions || 0;
          byCampaign[metric.campaign_id].clicks += metric.clicks || 0;
          byCampaign[metric.campaign_id].spend += metric.spend || 0;
          byCampaign[metric.campaign_id].conversions += metric.conversions || 0;
          byCampaign[metric.campaign_id].ctr += metric.ctr || 0;
          byCampaign[metric.campaign_id].cpc += metric.cpc || 0;
          byCampaign[metric.campaign_id].roas += metric.roas || 0;
        }

        metricsCount++;
      });

      // Calcula médias para métricas de taxa
      if (metricsCount > 0) {
        aggregated.ctr = aggregated.ctr / metricsCount;
        aggregated.cpc = aggregated.cpc / metricsCount;
        aggregated.roas = aggregated.roas / metricsCount;
      }

      // Calcula custo por resultado
      if (aggregated.conversions > 0) {
        aggregated.costPerResult = aggregated.spend / aggregated.conversions;
      }

      // Calcula médias por campanha
      Object.values(byCampaign).forEach(campaign => {
        const campaignMetricsCount = (metricsData || []).filter(
          m => m.campaign_id === campaign.campaignId
        ).length;

        if (campaignMetricsCount > 0) {
          campaign.ctr = campaign.ctr / campaignMetricsCount;
          campaign.cpc = campaign.cpc / campaignMetricsCount;
          campaign.roas = campaign.roas / campaignMetricsCount;
        }
      });

      setAggregatedMetrics(aggregated);
      setCampaignMetrics(Object.values(byCampaign));

      logger.info('Métricas carregadas', {
        totalCampaigns: selectedCampaigns.length,
        metricsCount
      });

    } catch (err: any) {
      logger.error('Erro ao carregar métricas', err);
      setError(err.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza métricas manualmente
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formata número grande
   */
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  /**
   * Formata percentual
   */
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="ml-4 text-gray-600">Carregando métricas...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          {onBack && (
            <Button onClick={onBack} variant="secondary">
              Voltar
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Métricas das Campanhas</h2>
              <p className="text-sm text-gray-600">{accountName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Filtro de período */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>

            {/* Botão de atualizar */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* Botão de voltar */}
            {onBack && (
              <Button variant="secondary" size="sm" onClick={onBack}>
                Voltar
              </Button>
            )}
          </div>
        </div>

        {/* Info de campanhas */}
        <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
          <Target className="h-4 w-4" />
          <span>
            Exibindo métricas de <strong>{campaignMetrics.length}</strong>{' '}
            {campaignMetrics.length === 1 ? 'campanha selecionada' : 'campanhas selecionadas'}
          </span>
        </div>
      </Card>

      {/* Cards de Métricas Agregadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Impressões */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">Impressões</p>
            <Eye className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatNumber(aggregatedMetrics.impressions)}
          </p>
        </Card>

        {/* Cliques */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Cliques</p>
            <MousePointerClick className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {formatNumber(aggregatedMetrics.clicks)}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            CTR: {formatPercentage(aggregatedMetrics.ctr)}
          </p>
        </Card>

        {/* Gasto */}
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-700">Gasto Total</p>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(aggregatedMetrics.spend)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            CPC: {formatCurrency(aggregatedMetrics.cpc)}
          </p>
        </Card>

        {/* Conversões */}
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-700">Conversões</p>
            <Target className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {formatNumber(aggregatedMetrics.conversions)}
          </p>
          <p className="text-xs text-orange-600 mt-1">
            ROAS: {aggregatedMetrics.roas.toFixed(2)}x
          </p>
        </Card>
      </div>

      {/* Tabela de Métricas por Campanha */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Desempenho por Campanha
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Campanha
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Impressões
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Cliques
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  CTR
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Gasto
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  CPC
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Conversões
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  ROAS
                </th>
              </tr>
            </thead>
            <tbody>
              {campaignMetrics.map((campaign, index) => (
                <tr
                  key={campaign.campaignId}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{campaign.campaignName}</p>
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatNumber(campaign.impressions)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatNumber(campaign.clicks)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatPercentage(campaign.ctr)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatCurrency(campaign.spend)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatCurrency(campaign.cpc)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatNumber(campaign.conversions)}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`font-semibold ${
                      campaign.roas >= 2 ? 'text-green-600' :
                      campaign.roas >= 1 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {campaign.roas.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {campaignMetrics.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Nenhuma métrica disponível para o período selecionado
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
