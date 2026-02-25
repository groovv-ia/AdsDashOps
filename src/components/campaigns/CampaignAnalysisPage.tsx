/**
 * CampaignAnalysisPage
 *
 * Pagina de analise detalhada de uma campanha do Meta Ads.
 * Exibe metricas completas, graficos de tendencia e performance de AdSets/Ads.
 *
 * Features:
 * - Metricas principais em cards destacados
 * - Graficos de tendencia temporal
 * - Tabela de AdSets com metricas
 * - Tabela de Ads com metricas
 * - Filtro por periodo
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Layers,
  Image,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  MetaInsightsDataService,
  MetaCampaignData,
  MetaDailyMetrics,
} from '../../lib/services/MetaInsightsDataService';
import { useClient } from '../../contexts/ClientContext';
import { logger } from '../../lib/utils/logger';
import { useAdCreativesBatch } from '../../hooks/useAdCreativesBatch';
import { AdCreativeThumbnail, AdDetailModal } from '../ad-analysis';
import type { MetaAdCreative } from '../../types/adAnalysis';

interface CampaignAnalysisPageProps {
  campaignId: string;
  onBack: () => void;
}

// Periodos pre-definidos
const DATE_PRESETS = [
  { label: 'Ultimos 7 dias', value: 'last_7', days: 7 },
  { label: 'Ultimos 14 dias', value: 'last_14', days: 14 },
  { label: 'Ultimos 30 dias', value: 'last_30', days: 30 },
  { label: 'Ultimos 60 dias', value: 'last_60', days: 60 },
  { label: 'Ultimos 90 dias', value: 'last_90', days: 90 },
];

export const CampaignAnalysisPage: React.FC<CampaignAnalysisPageProps> = ({
  campaignId,
  onBack,
}) => {
  const { selectedClient } = useClient();

  // Estados dos dados
  const [campaign, setCampaign] = useState<MetaCampaignData | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<MetaDailyMetrics[]>([]);
  const [adSets, setAdSets] = useState<MetaCampaignData[]>([]);
  const [ads, setAds] = useState<MetaCampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados da UI
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_30');
  const [activeTab, setActiveTab] = useState<'overview' | 'adsets' | 'ads'>('overview');

  // Estados do modal de detalhes do anuncio
  const [selectedAd, setSelectedAd] = useState<MetaCampaignData | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Servico de dados
  const metaInsightsService = new MetaInsightsDataService();

  // Prepara lista de ads para busca de criativos em lote
  const adsForCreatives = useMemo(() => {
    return ads.map(ad => ({
      entity_id: ad.entity_id,
      meta_ad_account_id: ad.meta_ad_account_id,
    }));
  }, [ads]);

  // Hook de busca em lote de criativos - dispara automaticamente quando aba de ads esta ativa
  const {
    creatives,
    globalLoading: creativesLoading,
    getCreative,
    getLoadingState,
    refetch: refetchCreatives,
    updateCreative,
  } = useAdCreativesBatch(activeTab === 'ads' ? adsForCreatives : []);

  /**
   * Calcula datas baseado no preset selecionado
   */
  const getDateRange = useCallback(() => {
    const today = new Date();
    const preset = DATE_PRESETS.find((p) => p.value === selectedPeriod);
    const days = preset?.days || 30;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  /**
   * Carrega todos os dados da campanha
   */
  const loadCampaignData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Carregando dados da campanha', { campaignId });

      const { dateFrom, dateTo } = getDateRange();

      // Carrega dados em paralelo
      const [campaignData, metricsData, adSetsData, adsData] = await Promise.all([
        metaInsightsService.getCampaignByEntityId(campaignId, {
          clientId: selectedClient?.id,
          dateFrom,
          dateTo,
        }),
        metaInsightsService.fetchDailyMetrics(campaignId, {
          clientId: selectedClient?.id,
          dateFrom,
          dateTo,
        }),
        metaInsightsService.fetchCampaignAdSets(campaignId, {
          clientId: selectedClient?.id,
          dateFrom,
          dateTo,
        }),
        metaInsightsService.fetchCampaignAds(campaignId, {
          clientId: selectedClient?.id,
          dateFrom,
          dateTo,
        }),
      ]);

      if (!campaignData) {
        throw new Error('Campanha nao encontrada');
      }

      setCampaign(campaignData);
      setDailyMetrics(metricsData);
      setAdSets(adSetsData);
      setAds(adsData);

      logger.info('Dados da campanha carregados', {
        metrics: metricsData.length,
        adSets: adSetsData.length,
        ads: adsData.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      logger.error('Erro ao carregar dados da campanha', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedClient, getDateRange]);

  /**
   * Carrega dados ao montar e quando periodo muda
   */
  useEffect(() => {
    loadCampaignData();
  }, [selectedPeriod]);

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
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  /**
   * Formata numeros compactos
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
   * Formata data para exibicao
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  /**
   * Retorna variante do badge de status
   */
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    const statusUpper = status?.toUpperCase() || '';
    if (statusUpper === 'ACTIVE') return 'success';
    if (statusUpper === 'PAUSED') return 'warning';
    if (statusUpper === 'DELETED') return 'error';
    return 'info';
  };

  /**
   * Calcula tendencia de uma metrica
   */
  const calculateTrend = (
    data: MetaDailyMetrics[],
    metric: keyof MetaDailyMetrics
  ): number => {
    if (data.length < 2) return 0;

    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + (d[metric] as number), 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + (d[metric] as number), 0) / secondHalf.length;

    if (firstAvg === 0) return 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando analise da campanha...</p>
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

  // Calcula tendencias
  const trends = {
    impressions: calculateTrend(dailyMetrics, 'impressions'),
    clicks: calculateTrend(dailyMetrics, 'clicks'),
    spend: calculateTrend(dailyMetrics, 'spend'),
    conversions: calculateTrend(dailyMetrics, 'conversions'),
  };

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Campanhas
          </Button>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.entity_name}</h1>
            <Badge variant={getStatusVariant(campaign.status || '')}>
              {campaign.status || 'N/A'}
            </Badge>
            <span className="text-sm text-gray-500">Meta Ads</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={loadCampaignData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de metricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">Impressoes</p>
              <p className="text-3xl font-bold">{formatCompactNumber(campaign.metrics.impressions)}</p>
              {trends.impressions !== 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {trends.impressions > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm text-blue-100">
                    {trends.impressions > 0 ? '+' : ''}
                    {trends.impressions.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <Eye className="h-10 w-10 text-blue-200 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100 mb-1">Cliques</p>
              <p className="text-3xl font-bold">{formatCompactNumber(campaign.metrics.clicks)}</p>
              {trends.clicks !== 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {trends.clicks > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm text-orange-100">
                    {trends.clicks > 0 ? '+' : ''}
                    {trends.clicks.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <MousePointer className="h-10 w-10 text-orange-200 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100 mb-1">Gasto Total</p>
              <p className="text-3xl font-bold">{formatCurrency(campaign.metrics.spend)}</p>
              {trends.spend !== 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {trends.spend > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm text-green-100">
                    {trends.spend > 0 ? '+' : ''}
                    {trends.spend.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <DollarSign className="h-10 w-10 text-green-200 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-100 mb-1">Conversas</p>
              <p className="text-3xl font-bold">
                {formatCompactNumber(campaign.metrics.conversions)}
              </p>
              {trends.conversions !== 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {trends.conversions > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm text-pink-100">
                    {trends.conversions > 0 ? '+' : ''}
                    {trends.conversions.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <Target className="h-10 w-10 text-pink-200 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Metricas calculadas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Alcance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCompactNumber(campaign.metrics.reach)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">CTR</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaign.metrics.ctr.toFixed(2)}%
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">CPC</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(campaign.metrics.cpc)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">CPM</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(campaign.metrics.cpm)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">ROAS</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaign.metrics.roas.toFixed(2)}x
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Custo/Resultado</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(campaign.metrics.cost_per_result)}
          </p>
        </Card>
      </div>

      {/* Novas metricas de conversas e leads */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <p className="text-sm text-cyan-700 font-medium mb-1">Conversas Iniciadas</p>
          <p className="text-2xl font-bold text-cyan-900">
            {formatNumber(campaign.metrics.messaging_conversations_started)}
          </p>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <p className="text-sm text-cyan-700 font-medium mb-1">Custo/Conversa</p>
          <p className="text-2xl font-bold text-cyan-900">
            {formatCurrency(campaign.metrics.cost_per_messaging_conversation_started)}
          </p>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <p className="text-sm text-emerald-700 font-medium mb-1">Total de Leads</p>
          <p className="text-2xl font-bold text-emerald-900">
            {formatNumber(campaign.metrics.leads)}
          </p>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <p className="text-sm text-emerald-700 font-medium mb-1">Custo/Lead</p>
          <p className="text-2xl font-bold text-emerald-900">
            {formatCurrency(campaign.metrics.cost_per_lead)}
          </p>
        </Card>
      </div>

      {/* Tabs de navegacao */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Visao Geral
          </button>
          <button
            onClick={() => setActiveTab('adsets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'adsets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="h-4 w-4 inline mr-2" />
            Conjuntos de Anuncios ({adSets.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Image className="h-4 w-4 inline mr-2" />
            Anuncios ({ads.length})
          </button>
        </nav>
      </div>

      {/* Conteudo das tabs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Grafico de tendencia temporal */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Tendencia de Performance
                </h3>
                <p className="text-sm text-gray-600">
                  Evolucao das metricas ao longo do tempo
                </p>
              </div>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="impressions">Impressoes</option>
                <option value="clicks">Cliques</option>
                <option value="spend">Gasto</option>
                <option value="conversions">Conversas</option>
                <option value="ctr">CTR</option>
                <option value="cpc">CPC</option>
              </select>
            </div>

            {dailyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyMetrics}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                    tickFormatter={(value) =>
                      selectedMetric === 'spend' || selectedMetric === 'cpc'
                        ? formatCurrency(value)
                        : formatNumber(value)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                    formatter={(value: number) =>
                      selectedMetric === 'spend' || selectedMetric === 'cpc'
                        ? formatCurrency(value)
                        : selectedMetric === 'ctr'
                          ? `${value.toFixed(2)}%`
                          : formatNumber(value)
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
                Nenhum dado disponivel para o periodo selecionado
              </div>
            )}
          </Card>

          {/* Grafico de barras - Gasto por dia */}
          {dailyMetrics.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Gasto por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  />
                  <Bar dataKey="spend" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'adsets' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance por Conjunto de Anuncios
          </h3>

          {adSets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum conjunto de anuncios encontrado para esta campanha.</p>
              <p className="text-sm mt-1">
                Sincronize os dados no nivel de AdSets para visualizar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Impressoes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cliques
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Gasto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CTR
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CPC
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Conversas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adSets.map((adSet) => (
                    <tr key={adSet.entity_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {adSet.entity_name}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getStatusVariant(adSet.status || '')}>
                          {adSet.status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatNumber(adSet.metrics.impressions)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatNumber(adSet.metrics.clicks)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(adSet.metrics.spend)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {adSet.metrics.ctr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(adSet.metrics.cpc)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatNumber(adSet.metrics.conversions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'ads' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Performance por Anuncio
            </h3>
            {creativesLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando criativos...
              </div>
            )}
          </div>

          {ads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum anuncio encontrado para esta campanha.</p>
              <p className="text-sm mt-1">
                Sincronize os dados no nivel de Ads para visualizar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Preview
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Impressoes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cliques
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Gasto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CTR
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CPC
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CPM
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Conversas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ads.map((ad) => {
                    const creative = getCreative(ad.entity_id);
                    const loadingState = getLoadingState(ad.entity_id);

                    return (
                      <tr
                        key={ad.entity_id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedAd(ad);
                          setIsAdModalOpen(true);
                        }}
                      >
                        <td className="px-3 py-3">
                          <AdCreativeThumbnail
                            creative={creative}
                            loading={loadingState.isLoading}
                            error={loadingState.hasError ? loadingState.errorMessage : null}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {ad.entity_name}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getStatusVariant(ad.status || '')}>
                            {ad.status || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatNumber(ad.metrics.impressions)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatNumber(ad.metrics.clicks)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(ad.metrics.spend)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {ad.metrics.ctr.toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(ad.metrics.cpc)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(ad.metrics.cpm)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">
                          {formatNumber(ad.metrics.conversions)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal de detalhes do anuncio */}
      {selectedAd && (
        <AdDetailModal
          isOpen={isAdModalOpen}
          onClose={() => {
            setIsAdModalOpen(false);
            setSelectedAd(null);
          }}
          adData={{
            ad_id: selectedAd.entity_id,
            entity_name: selectedAd.entity_name,
            meta_ad_account_id: selectedAd.meta_ad_account_id,
            status: selectedAd.status,
            campaign_name: campaign?.entity_name,
            campaign_id: campaignId,
            adset_id: selectedAd.adset_id,
          }}
          dateRange={{
            start: getDateRange().dateFrom,
            end: getDateRange().dateTo,
          }}
          preloadedCreative={getCreative(selectedAd.entity_id)}
          onEnriched={(creative) => {
            if (selectedAd?.entity_id && creative) {
              updateCreative(selectedAd.entity_id, creative as MetaAdCreative);
            }
          }}
        />
      )}
    </div>
  );
};
