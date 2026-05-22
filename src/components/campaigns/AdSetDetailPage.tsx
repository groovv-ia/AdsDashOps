/**
 * AdSetDetailPage
 *
 * Pagina de detalhe de um Conjunto de Anuncios com metricas e lista de Ads.
 * Nivel de drill-down: Campanha > Conjunto de Anuncios > Anuncios
 *
 * Exibe KPIs do adset, grafico de tendencia e tabela de anuncios filhos.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye,
  MousePointer,
  DollarSign,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
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
import { BreadcrumbNav, type BreadcrumbItem } from '../meta-admin/BreadcrumbNav';
import { EnhancedPeriodSelector } from '../meta-admin/EnhancedPeriodSelector';
import { CampaignAdsTable } from './CampaignAdsTable';
import { AdDetailModal } from '../ad-analysis';
import { MetricLineChart } from './MetricLineChart';
import { ViewToggle, useViewMode } from '../ui/ViewToggle';
import { useWorkspacePeriod } from '../../hooks/useWorkspacePeriod';
import { useAdCreativesBatch } from '../../hooks/useAdCreativesBatch';
import {
  fetchAdSetDetail,
  type HierarchyMetrics,
  type AdSetDetailResult,
} from '../../lib/services/CampaignDetailService';
import { calculatePeriodKPIs, type DailyInsightRow } from '../../lib/services/MetaRealTimeService';
import type { AdData } from '../../lib/services/CampaignExtractedDataService';
import type { MetaAdCreative } from '../../types/adAnalysis';
import { logger } from '../../lib/utils/logger';

// ============================================
// Tipos
// ============================================

interface AdSetDetailPageProps {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  metaAdAccountId: string;
  onBack: () => void;
  onBackToCampaigns: () => void;
}

// ============================================
// Funcoes Auxiliares
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Converte HierarchyMetrics para AdData
 */
function mapToAdData(metrics: HierarchyMetrics[], metaAdAccountId: string, adSetId: string, adSetName: string): AdData[] {
  return metrics.map(m => ({
    ad_id: m.entity_id,
    ad_name: m.entity_name,
    adset_id: adSetId,
    adset_name: adSetName,
    campaign_id: m.campaign_id || '',
    status: 'ACTIVE',
    impressions: m.impressions,
    clicks: m.clicks,
    spend: m.spend,
    conversions: m.conversions,
    ctr: m.ctr,
    cpc: m.cpc,
    cpm: m.cpm,
    roas: m.roas,
    reach: m.reach,
    frequency: m.frequency,
    meta_ad_account_id: metaAdAccountId,
    messaging_conversations_started: m.messaging_conversations_started,
    cost_per_messaging_conversation_started: m.cost_per_messaging_conversation,
    leads: m.leads,
    cost_per_lead: m.cost_per_lead,
  }));
}

// ============================================
// Componente Principal
// ============================================

export const AdSetDetailPage: React.FC<AdSetDetailPageProps> = ({
  adSetId,
  adSetName,
  campaignId,
  campaignName,
  metaAdAccountId,
  onBack,
  onBackToCampaigns,
}) => {
  // Periodo do workspace
  const { selectedPeriod, dateRange: periodDateRange, setPeriod } = useWorkspacePeriod();

  // Estados de dados
  const [detailData, setDetailData] = useState<AdSetDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado do grafico (Area chart legado)
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');

  // Toggle de visualizacao: 'cards' (padrao) ou 'chart' (grafico de linhas)
  const [viewMode, setViewMode] = useViewMode('view_mode_adset_detail', 'cards');

  // Estado do modal de anuncio
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Dados processados para a tabela
  const adsData = useMemo(
    () => (detailData ? mapToAdData(detailData.ads, metaAdAccountId, adSetId, adSetName) : []),
    [detailData, metaAdAccountId, adSetId, adSetName]
  );

  // KPIs do AdSet
  const kpis = useMemo(() => {
    if (!detailData || detailData.ads.length === 0) return null;
    return calculatePeriodKPIs(detailData.ads);
  }, [detailData]);

  // Dados diarios para o grafico
  const dailyData = useMemo(
    () => detailData?.dailyAdSet || [],
    [detailData]
  );

  // Hook de criativos
  const adsForCreatives = useMemo(() => {
    return adsData.map(ad => ({
      entity_id: ad.ad_id,
      meta_ad_account_id: ad.meta_ad_account_id || metaAdAccountId,
    }));
  }, [adsData, metaAdAccountId]);

  const {
    getCreative,
    getLoadingState,
    globalLoading: creativesLoading,
    updateCreative,
  } = useAdCreativesBatch(adsData.length > 0 ? adsForCreatives : []);

  // Carrega dados
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchAdSetDetail({
        meta_ad_account_id: metaAdAccountId,
        adset_entity_id: adSetId,
        campaign_entity_id: campaignId,
        date_from: periodDateRange.dateFrom,
        date_to: periodDateRange.dateTo,
      });

      setDetailData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados do conjunto';
      setError(msg);
      logger.error('Erro ao carregar detalhes do AdSet', err);
    } finally {
      setLoading(false);
    }
  }, [adSetId, campaignId, metaAdAccountId, periodDateRange]);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // Breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [
    { id: 'campaigns', label: 'Campanhas', type: 'home' },
    { id: campaignId, label: campaignName, type: 'campaign' },
    { id: adSetId, label: adSetName, type: 'adset' },
  ];

  // Handler para click em anuncio (abre modal)
  const handleAdClick = (ad: AdData) => {
    setSelectedAd(ad);
    setIsAdModalOpen(true);
  };

  // Calcula tendencia
  const calculateTrend = (data: DailyInsightRow[], metric: keyof DailyInsightRow): number => {
    if (data.length < 2) return 0;
    const mid = Math.floor(data.length / 2);
    const first = data.slice(0, mid);
    const second = data.slice(mid);
    const firstAvg = first.reduce((s, d) => s + (d[metric] as number), 0) / first.length;
    const secondAvg = second.reduce((s, d) => s + (d[metric] as number), 0) / second.length;
    if (firstAvg === 0) return 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando detalhes do conjunto de anuncios...</p>
          </div>
        </div>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Erro ao carregar conjunto de anuncios</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  // Tendencias
  const trends = {
    impressions: calculateTrend(dailyData, 'impressions'),
    clicks: calculateTrend(dailyData, 'clicks'),
    spend: calculateTrend(dailyData, 'spend'),
    conversions: calculateTrend(dailyData, 'conversions'),
  };

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3">
            <BreadcrumbNav
              items={breadcrumbItems}
              onNavigate={(item) => {
                if (item.id === 'campaigns') onBackToCampaigns();
                if (item.id === campaignId) onBack();
              }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{adSetName}</h1>
              <Badge variant="info">Conjunto de Anuncios</Badge>
              {detailData?.source === 'database' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  Dados do banco
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Campanha: <span className="font-medium text-gray-700">{campaignName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <EnhancedPeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={(id, range) => setPeriod(id, range)}
              dateRange={periodDateRange}
            />
            <Button variant="secondary" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Modo: Grafico de linhas estilo Google Ads */}
      {viewMode === 'chart' && dailyData.length > 0 && (
        <MetricLineChart
          data={dailyData}
          defaultMetrics={['impressions', 'clicks', 'spend', 'conversions']}
          chartHeight={300}
        />
      )}
      {viewMode === 'chart' && dailyData.length === 0 && !loading && (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            Nenhum dado diario disponivel para o periodo selecionado.
          </p>
        </Card>
      )}

      {/* KPIs do AdSet — visivel apenas no modo cards */}
      {viewMode === 'cards' && kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100 mb-1">Impressoes</p>
                <p className="text-2xl font-bold">{formatCompactNumber(kpis.totalImpressions)}</p>
                {trends.impressions !== 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    {trends.impressions > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs text-blue-100">
                      {trends.impressions > 0 ? '+' : ''}{trends.impressions.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <Eye className="h-8 w-8 text-blue-200 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100 mb-1">Cliques</p>
                <p className="text-2xl font-bold">{formatCompactNumber(kpis.totalClicks)}</p>
                {trends.clicks !== 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    {trends.clicks > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs text-orange-100">
                      {trends.clicks > 0 ? '+' : ''}{trends.clicks.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <MousePointer className="h-8 w-8 text-orange-200 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100 mb-1">Gasto</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalSpend)}</p>
                {trends.spend !== 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    {trends.spend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs text-green-100">
                      {trends.spend > 0 ? '+' : ''}{trends.spend.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-200 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-100 mb-1">Conversoes</p>
                <p className="text-2xl font-bold">{formatCompactNumber(kpis.totalConversions)}</p>
                {trends.conversions !== 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    {trends.conversions > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="text-xs text-pink-100">
                      {trends.conversions > 0 ? '+' : ''}{trends.conversions.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <Target className="h-8 w-8 text-pink-200 opacity-50" />
            </div>
          </Card>
        </div>
      )}

      {/* Metricas secundarias — visivel apenas no modo cards */}
      {viewMode === 'cards' && kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <p className="text-sm text-gray-500 mb-1">Alcance</p>
            <p className="text-xl font-bold text-gray-900">{formatCompactNumber(kpis.totalReach)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 mb-1">CTR</p>
            <p className="text-xl font-bold text-gray-900">{kpis.avgCtr.toFixed(2)}%</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 mb-1">CPC</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.avgCpc)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 mb-1">CPM</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.avgCpm)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 mb-1">ROAS</p>
            <p className="text-xl font-bold text-gray-900">
              {kpis.roas !== null ? `${kpis.roas.toFixed(2)}x` : '-'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 mb-1">Custo/Resultado</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.costPerResult)}</p>
          </Card>
        </div>
      )}

      {/* Metricas de conversas e leads — visivel apenas no modo cards */}
      {viewMode === 'cards' && kpis && (kpis.totalMessagingConversations > 0 || kpis.totalLeads > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
            <p className="text-sm text-cyan-700 font-medium mb-1">Conversas Iniciadas</p>
            <p className="text-xl font-bold text-cyan-900">
              {formatNumber(kpis.totalMessagingConversations)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
            <p className="text-sm text-cyan-700 font-medium mb-1">Custo/Conversa</p>
            <p className="text-xl font-bold text-cyan-900">
              {formatCurrency(kpis.costPerConversation)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium mb-1">Total de Leads</p>
            <p className="text-xl font-bold text-emerald-900">
              {formatNumber(kpis.totalLeads)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium mb-1">Custo/Lead</p>
            <p className="text-xl font-bold text-emerald-900">
              {formatCurrency(kpis.costPerLead)}
            </p>
          </Card>
        </div>
      )}

      {/* Grafico de tendencia legado — visivel apenas no modo cards */}
      {viewMode === 'cards' && dailyData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tendencia de Performance</h3>
              <p className="text-sm text-gray-500">Evolucao das metricas do conjunto no periodo</p>
            </div>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="spend">Gasto</option>
              <option value="impressions">Impressoes</option>
              <option value="clicks">Cliques</option>
              <option value="conversions">Conversoes</option>
              <option value="ctr">CTR</option>
              <option value="cpc">CPC</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="adsetDetailGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                    : selectedMetric === 'ctr'
                      ? `${value.toFixed(1)}%`
                      : formatCompactNumber(value)
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
                formatter={(value: number) => [
                  selectedMetric === 'spend' || selectedMetric === 'cpc'
                    ? formatCurrency(value)
                    : selectedMetric === 'ctr'
                      ? `${value.toFixed(2)}%`
                      : formatNumber(value),
                  selectedMetric === 'spend' ? 'Gasto'
                    : selectedMetric === 'impressions' ? 'Impressoes'
                    : selectedMetric === 'clicks' ? 'Cliques'
                    : selectedMetric === 'conversions' ? 'Conversoes'
                    : selectedMetric === 'ctr' ? 'CTR'
                    : 'CPC',
                ]}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#adsetDetailGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Secao: Anuncios deste Conjunto */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Anuncios</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {adsData.length}
            </span>
          </div>
          {creativesLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando criativos...
            </div>
          )}
        </div>

        {adsData.length > 0 ? (
          <CampaignAdsTable
            ads={adsData}
            showAdSetColumn={false}
            onSelectAd={handleAdClick}
            getCreative={getCreative}
            getLoadingState={getLoadingState}
          />
        ) : (
          <Card className="text-center py-8">
            <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum anuncio encontrado para este conjunto no periodo selecionado.</p>
          </Card>
        )}
      </div>

      {/* Modal de detalhes do anuncio */}
      {selectedAd && (
        <AdDetailModal
          key={selectedAd.ad_id}
          isOpen={isAdModalOpen}
          onClose={() => {
            setIsAdModalOpen(false);
            setSelectedAd(null);
          }}
          adData={{
            ad_id: selectedAd.ad_id,
            entity_name: selectedAd.ad_name,
            meta_ad_account_id: selectedAd.meta_ad_account_id || metaAdAccountId,
            status: selectedAd.status,
            campaign_name: campaignName,
            campaign_id: campaignId,
            adset_id: adSetId,
          }}
          dateRange={{
            start: periodDateRange.dateFrom,
            end: periodDateRange.dateTo,
          }}
          preloadedCreative={getCreative(selectedAd.ad_id)}
          onEnriched={(creative) => {
            if (creative?.ad_id) {
              updateCreative(creative.ad_id, creative as MetaAdCreative);
            }
          }}
        />
      )}
    </div>
  );
};
