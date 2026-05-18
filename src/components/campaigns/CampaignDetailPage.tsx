/**
 * CampaignDetailPage
 *
 * Pagina de detalhe de uma campanha com hierarquia completa.
 * Exibe KPIs, grafico de tendencia, tabela de AdSets e tabela de Ads
 * em uma unica pagina com scroll (sem tabs).
 *
 * Suporta drill-down: clicar em um AdSet navega para AdSetDetailPage.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  Layers,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { CampaignAdSetsTable } from './CampaignAdSetsTable';
import { CampaignAdsTable } from './CampaignAdsTable';
import { CampaignObservationPanel } from './CampaignObservationPanel';
import { AdDetailModal } from '../ad-analysis';
import { useWorkspacePeriod } from '../../hooks/useWorkspacePeriod';
import { useAdCreativesBatch } from '../../hooks/useAdCreativesBatch';
import {
  fetchCampaignHierarchy,
  type HierarchyMetrics,
  type CampaignHierarchyResult,
} from '../../lib/services/CampaignDetailService';
import { calculatePeriodKPIs, type DailyInsightRow } from '../../lib/services/MetaRealTimeService';
import type { AdSetData, AdData } from '../../lib/services/CampaignExtractedDataService';
import type { MetaAdCreative } from '../../types/adAnalysis';
import { logger } from '../../lib/utils/logger';

// ============================================
// Tipos
// ============================================

interface CampaignDetailPageProps {
  campaignId: string;
  campaignName: string;
  metaAdAccountId: string;
  campaignStatus?: string;
  campaignObjective?: string;
  onBack: () => void;
  onNavigateToAdSet: (adSetId: string, adSetName: string) => void;
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
 * Converte HierarchyMetrics para AdSetData (formato esperado pelo CampaignAdSetsTable)
 */
function mapToAdSetData(metrics: HierarchyMetrics[]): AdSetData[] {
  return metrics.map(m => ({
    adset_id: m.entity_id,
    adset_name: m.entity_name,
    status: 'ACTIVE',
    campaign_id: m.campaign_id || '',
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
    ads_count: 0,
    messaging_conversations_started: m.messaging_conversations_started,
    cost_per_messaging_conversation_started: m.cost_per_messaging_conversation,
    leads: m.leads,
    cost_per_lead: m.cost_per_lead,
  }));
}

/**
 * Converte HierarchyMetrics para AdData (formato esperado pelo CampaignAdsTable)
 */
function mapToAdData(metrics: HierarchyMetrics[], metaAdAccountId: string): AdData[] {
  return metrics.map(m => ({
    ad_id: m.entity_id,
    ad_name: m.entity_name,
    adset_id: m.adset_id || '',
    adset_name: m.adset_name || '',
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

export const CampaignDetailPage: React.FC<CampaignDetailPageProps> = ({
  campaignId,
  campaignName,
  metaAdAccountId,
  campaignStatus,
  campaignObjective,
  onBack,
  onNavigateToAdSet,
}) => {
  // Periodo do workspace
  const { selectedPeriod, dateRange: periodDateRange, setPeriod } = useWorkspacePeriod();

  // Estados de dados
  const [hierarchyData, setHierarchyData] = useState<CampaignHierarchyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado do grafico
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');

  // Estado do modal de anuncio
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Dados processados para as tabelas
  const adSetsData = useMemo(
    () => (hierarchyData ? mapToAdSetData(hierarchyData.adSets) : []),
    [hierarchyData]
  );

  const adsData = useMemo(
    () => (hierarchyData ? mapToAdData(hierarchyData.ads, metaAdAccountId) : []),
    [hierarchyData, metaAdAccountId]
  );

  // KPIs calculados a partir dos adSets (somam para a campanha total)
  const kpis = useMemo(() => {
    if (!hierarchyData || hierarchyData.adSets.length === 0) return null;
    return calculatePeriodKPIs(hierarchyData.adSets);
  }, [hierarchyData]);

  // Dados diarios para o grafico
  const dailyData = useMemo(
    () => hierarchyData?.dailyCampaign || [],
    [hierarchyData]
  );

  // Hook de criativos para a tabela de ads
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

  // Carrega dados da campanha
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchCampaignHierarchy({
        meta_ad_account_id: metaAdAccountId,
        campaign_entity_id: campaignId,
        campaign_name: campaignName,
        date_from: periodDateRange.dateFrom,
        date_to: periodDateRange.dateTo,
      });

      setHierarchyData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(msg);
      logger.error('Erro ao carregar detalhes da campanha', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, campaignName, metaAdAccountId, periodDateRange]);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // Breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [
    { id: 'campaigns', label: 'Campanhas', type: 'home' },
    { id: campaignId, label: campaignName, type: 'campaign' },
  ];

  // Handler para selecao de AdSet (drill-down)
  const handleAdSetClick = (adSetId: string) => {
    const adSet = adSetsData.find(as => as.adset_id === adSetId);
    if (adSet) {
      onNavigateToAdSet(adSetId, adSet.adset_name);
    }
  };

  // Handler para selecao de anuncio (modal)
  const handleAdClick = (ad: AdData) => {
    setSelectedAd(ad);
    setIsAdModalOpen(true);
  };

  // Calcula tendencia (segunda metade vs primeira metade do periodo)
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

  // Status badge
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    const s = status?.toUpperCase() || '';
    if (s === 'ACTIVE' || s === 'ATIVO') return 'success';
    if (s === 'PAUSED' || s === 'PAUSADO') return 'warning';
    if (s === 'DELETED' || s === 'ENDED') return 'error';
    return 'info';
  };

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando detalhes da campanha...</p>
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
      {/* Header com breadcrumb e controles */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3">
            <BreadcrumbNav
              items={breadcrumbItems}
              onNavigate={(item) => {
                if (item.id === 'campaigns') onBack();
              }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{campaignName}</h1>
              {campaignStatus && (
                <Badge variant={getStatusVariant(campaignStatus)}>
                  {campaignStatus}
                </Badge>
              )}
              {campaignObjective && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {campaignObjective}
                </span>
              )}
              {hierarchyData?.source === 'database' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  Dados do banco
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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

      {/* KPIs da campanha */}
      {kpis && (
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

      {/* Metricas secundarias */}
      {kpis && (
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

      {/* Metricas de conversas e leads */}
      {kpis && (kpis.totalMessagingConversations > 0 || kpis.totalLeads > 0) && (
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

      {/* Grafico de tendencia temporal */}
      {dailyData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tendencia de Performance</h3>
              <p className="text-sm text-gray-500">Evolucao das metricas no periodo</p>
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

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="campaignDetailGradient" x1="0" y1="0" x2="0" y2="1">
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
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#campaignDetailGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Secao: Observacoes do Gestor + Analise com IA */}
      <CampaignObservationPanel
        campaignId={campaignId}
        campaignName={campaignName}
        campaignObjective={campaignObjective}
        metaAdAccountId={metaAdAccountId}
        metrics={kpis ? {
          impressions:  kpis.totalImpressions,
          clicks:       kpis.totalClicks,
          spend:        kpis.totalSpend,
          conversions:  kpis.totalConversions,
          reach:        kpis.totalReach,
          ctr:          kpis.avgCtr,
          cpc:          kpis.avgCpc,
          cpm:          kpis.avgCpm,
          roas:         kpis.roas ?? undefined,
          leads:        kpis.totalLeads > 0 ? kpis.totalLeads : undefined,
          cost_per_lead: kpis.costPerLead > 0 ? kpis.costPerLead : undefined,
          messaging_conversations: kpis.totalMessagingConversations > 0
            ? kpis.totalMessagingConversations : undefined,
          cost_per_messaging_conversation: kpis.costPerConversation > 0
            ? kpis.costPerConversation : undefined,
          frequency: kpis.avgFrequency,
        } : null}
        period={{ start: periodDateRange.dateFrom, end: periodDateRange.dateTo }}
      />

      {/* Secao: Conjuntos de Anuncios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Conjuntos de Anuncios
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {adSetsData.length}
            </span>
          </div>
          <p className="text-xs text-gray-400">Clique para ver detalhes</p>
        </div>

        {adSetsData.length > 0 ? (
          <CampaignAdSetsTable
            adSets={adSetsData}
            onSelectAdSet={handleAdSetClick}
          />
        ) : (
          <Card className="text-center py-8">
            <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum conjunto de anuncios encontrado para este periodo.</p>
          </Card>
        )}
      </div>

      {/* Secao: Anuncios */}
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
            showAdSetColumn={true}
            onSelectAd={handleAdClick}
            getCreative={getCreative}
            getLoadingState={getLoadingState}
          />
        ) : (
          <Card className="text-center py-8">
            <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum anuncio encontrado para este periodo.</p>
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
            adset_id: selectedAd.adset_id,
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
