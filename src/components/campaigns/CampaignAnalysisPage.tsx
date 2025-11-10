import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  CampaignDataService,
  CampaignWithMetrics,
  CampaignDailyMetrics,
  AdSetPerformance,
  AdPerformance
} from '../../lib/services/CampaignDataService';
import { logger } from '../../lib/utils/logger';

interface CampaignAnalysisPageProps {
  campaignId: string;
  onBack: () => void;
}

/**
 * Página de análise detalhada de uma campanha
 *
 * Exibe métricas completas, gráficos de tendência e análise de performance
 * de uma campanha específica
 *
 * Features:
 * - Métricas principais em cards destacados
 * - Gráficos de tendência temporal
 * - Análise de ad sets e anúncios
 * - Comparação com período anterior
 * - Insights e recomendações
 */
export const CampaignAnalysisPage: React.FC<CampaignAnalysisPageProps> = ({
  campaignId,
  onBack
}) => {
  // Estados dos dados
  const [campaign, setCampaign] = useState<CampaignWithMetrics | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<CampaignDailyMetrics[]>([]);
  const [adSets, setAdSets] = useState<AdSetPerformance[]>([]);
  const [ads, setAds] = useState<AdPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados da UI
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');
  const [dateRange, setDateRange] = useState<number>(30); // dias

  const campaignService = new CampaignDataService();

  /**
   * Carrega dados da campanha ao montar
   */
  useEffect(() => {
    loadCampaignData();
  }, [campaignId, dateRange]);

  /**
   * Busca todos os dados da campanha
   */
  const loadCampaignData = async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Carregando dados da campanha', { campaignId });

      // Calcula período
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - dateRange);
      const dateTo = new Date();

      // Carrega dados em paralelo
      const [campaignData, metricsData, adSetsData, adsData] = await Promise.all([
        campaignService.getCampaignById(campaignId),
        campaignService.getCampaignDailyMetrics(
          campaignId,
          dateFrom.toISOString().split('T')[0],
          dateTo.toISOString().split('T')[0]
        ),
        campaignService.getCampaignAdSets(campaignId),
        campaignService.getCampaignAds(campaignId)
      ]);

      if (!campaignData) {
        throw new Error('Campanha não encontrada');
      }

      setCampaign(campaignData);
      setDailyMetrics(metricsData);
      setAdSets(adSetsData);
      setAds(adsData);

      logger.info('Dados da campanha carregados', {
        metrics: metricsData.length,
        adSets: adSetsData.length,
        ads: adsData.length
      });

    } catch (err: any) {
      logger.error('Erro ao carregar dados da campanha', err);
      setError(err.message || 'Erro ao carregar dados da campanha');
    } finally {
      setLoading(false);
    }
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
   * Formata números grandes
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  /**
   * Formata data para exibição
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  /**
   * Calcula tendência de uma métrica (% de mudança)
   */
  const calculateTrend = (data: CampaignDailyMetrics[], metric: keyof CampaignDailyMetrics): number => {
    if (data.length < 2) return 0;

    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + (d[metric] as number), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + (d[metric] as number), 0) / secondHalf.length;

    if (firstAvg === 0) return 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  /**
   * Renderiza card de métrica principal
   */
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    bgColor: string;
    textColor: string;
  }> = ({ title, value, icon, trend, bgColor, textColor }) => (
    <Card className={`${bgColor} border-none`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor} opacity-80 mb-1`}>{title}</p>
          <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          {trend !== undefined && (
            <div className="flex items-center space-x-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className={`h-4 w-4 ${textColor}`} />
              ) : trend < 0 ? (
                <TrendingDown className={`h-4 w-4 ${textColor}`} />
              ) : null}
              <span className={`text-sm ${textColor} opacity-80`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs período anterior
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 ${textColor} opacity-20 rounded-lg`}>
          {icon}
        </div>
      </div>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando análise da campanha...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Campanhas
        </Button>
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Erro ao carregar campanha</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Calcula tendências
  const trends = {
    impressions: calculateTrend(dailyMetrics, 'impressions'),
    clicks: calculateTrend(dailyMetrics, 'clicks'),
    spend: calculateTrend(dailyMetrics, 'spend'),
    conversions: calculateTrend(dailyMetrics, 'conversions'),
  };

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Campanhas
          </Button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <Badge variant={campaign.status.toUpperCase() === 'ACTIVE' ? 'success' : 'warning'}>
              {campaign.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {campaign.platform} • {campaign.objective}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadCampaignData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Impressões"
          value={formatNumber(campaign.metrics.impressions)}
          icon={<Eye className="h-8 w-8" />}
          trend={trends.impressions}
          bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          textColor="text-white"
        />
        <MetricCard
          title="Cliques"
          value={formatNumber(campaign.metrics.clicks)}
          icon={<MousePointer className="h-8 w-8" />}
          trend={trends.clicks}
          bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
          textColor="text-white"
        />
        <MetricCard
          title="Gasto Total"
          value={formatCurrency(campaign.metrics.spend)}
          icon={<DollarSign className="h-8 w-8" />}
          trend={trends.spend}
          bgColor="bg-gradient-to-br from-orange-500 to-orange-600"
          textColor="text-white"
        />
        <MetricCard
          title="Conversões"
          value={formatNumber(campaign.metrics.conversions)}
          icon={<Target className="h-8 w-8" />}
          trend={trends.conversions}
          bgColor="bg-gradient-to-br from-green-500 to-green-600"
          textColor="text-white"
        />
      </div>

      {/* Métricas calculadas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-600 mb-1">CTR (Taxa de Cliques)</p>
          <p className="text-2xl font-bold text-gray-900">{campaign.metrics.ctr.toFixed(2)}%</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">CPC (Custo por Clique)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(campaign.metrics.cpc)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">CPM (Custo por Mil)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(campaign.metrics.cpm)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">ROAS (Retorno)</p>
          <p className="text-2xl font-bold text-gray-900">{campaign.metrics.roas.toFixed(2)}x</p>
        </Card>
      </div>

      {/* Gráfico de tendência temporal */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tendência de Performance</h3>
            <p className="text-sm text-gray-600">Evolução das métricas ao longo do tempo</p>
          </div>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="impressions">Impressões</option>
            <option value="clicks">Cliques</option>
            <option value="spend">Gasto</option>
            <option value="conversions">Conversões</option>
            <option value="ctr">CTR</option>
            <option value="roas">ROAS</option>
          </select>
        </div>

        {dailyMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={dailyMetrics}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => selectedMetric === 'spend' ? formatCurrency(value) : formatNumber(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                formatter={(value: any) =>
                  selectedMetric === 'spend' ? formatCurrency(value) : formatNumber(value)
                }
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMetric)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </Card>

      {/* Performance de Ad Sets */}
      {adSets.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance por Conjunto de Anúncios
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impressões</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cliques</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gasto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversões</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROAS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adSets.map(adSet => (
                  <tr key={adSet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{adSet.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={adSet.status.toUpperCase() === 'ACTIVE' ? 'success' : 'warning'}>
                        {adSet.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatNumber(adSet.impressions)}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatNumber(adSet.clicks)}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCurrency(adSet.spend)}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatNumber(adSet.conversions)}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{adSet.ctr.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{adSet.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lista de anúncios */}
      {ads.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Anúncios ({ads.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.slice(0, 6).map(ad => (
              <div key={ad.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3 mb-3">
                  {ad.thumbnail_url && (
                    <img
                      src={ad.thumbnail_url}
                      alt={ad.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{ad.name}</h4>
                    <Badge variant={ad.status.toUpperCase() === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                      {ad.status}
                    </Badge>
                  </div>
                </div>
                {ad.headline && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ad.headline}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cliques</p>
                    <p className="font-semibold">{formatNumber(ad.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gasto</p>
                    <p className="font-semibold">{formatCurrency(ad.spend)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CTR</p>
                    <p className="font-semibold">{ad.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Conversões</p>
                    <p className="font-semibold">{formatNumber(ad.conversions)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {ads.length > 6 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              E mais {ads.length - 6} anúncios...
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
