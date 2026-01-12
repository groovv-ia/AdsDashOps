/**
 * AdDetailModal Component
 *
 * Modal completo para visualizacao de detalhes de um anuncio
 * incluindo criativo (imagem/video), metricas com graficos e analise de IA.
 * Suporta dados pre-carregados para exibicao imediata.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Eye,
  Image,
  BarChart3,
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointer,
  Users,
  Target,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAdDetailData, type PreloadedMetricsData } from '../../hooks/useAdDetails';
import { ScoreCircle } from './ScoreCircle';
import { ImageZoomModal } from './ImageZoomModal';
import { CreativeAIAnalysisTab } from './CreativeAIAnalysisTab';
import { AdDetailTab, getCreativeTypeLabel } from '../../types/adAnalysis';
import type { AdDetailModalState, PreloadedInsightRow, MetaAdCreative } from '../../types/adAnalysis';
import type { MetricsAIAnalysis } from '../../types/metricsAnalysis';
import {
  getPerformanceScoreColor,
  getPerformanceScoreLabel,
  getImpactColor,
  getImpactLabel,
  getTrendInfo,
  getBenchmarkStatusColor,
  getBenchmarkStatusLabel,
} from '../../types/metricsAnalysis';

// Interface para props do modal
interface AdDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  adData: AdDetailModalState['adData'];
  dateRange?: { start: string; end: string };
  // Metricas pre-carregadas da pagina pai (evita nova query)
  preloadedMetrics?: PreloadedInsightRow[];
  // Criativo pre-carregado (evita nova busca)
  preloadedCreative?: MetaAdCreative | null;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  isOpen,
  onClose,
  adData,
  dateRange,
  preloadedMetrics = [],
  preloadedCreative,
}) => {
  const [activeTab, setActiveTab] = useState<AdDetailTab>(AdDetailTab.OVERVIEW);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Datas padrao: ultimos 30 dias
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const startDate = dateRange?.start || defaultStartDate;
  const endDate = dateRange?.end || defaultEndDate;

  // Verifica se ha dados pre-carregados
  const hasPreloadedData = preloadedMetrics.length > 0;

  // Prepara dados pre-carregados para o hook de analise de metricas com IA
  // Este formato e necessario para evitar nova query ao banco durante analise
  const preloadedMetricsForAI: PreloadedMetricsData | null = useMemo(() => {
    if (!hasPreloadedData || !adData?.entity_name) return null;

    const totals = preloadedMetrics.reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        reach: acc.reach + (row.reach || 0),
        clicks: acc.clicks + (row.clicks || 0),
        spend: acc.spend + (row.spend || 0),
      }),
      { impressions: 0, reach: 0, clicks: 0, spend: 0 }
    );

    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    const avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;

    const dailyMetrics = [...preloadedMetrics]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        date: row.date,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        spend: row.spend || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
        cpm: row.cpm || 0,
      }));

    return {
      entityName: adData.entity_name,
      totalSpend: totals.spend,
      totalImpressions: totals.impressions,
      totalReach: totals.reach,
      totalClicks: totals.clicks,
      avgCtr,
      avgCpc,
      avgCpm,
      avgFrequency,
      dailyMetrics,
    };
  }, [hasPreloadedData, preloadedMetrics, adData?.entity_name]);

  // Hook combinado para todos os dados - passa dados pre-carregados para analise de metricas
  const {
    creative: fetchedCreative,
    creativeLoading: fetchedCreativeLoading,
    creativeError,
    refreshCreative,
    analysis,
    analysisLoading,
    isAnalyzing,
    analyzeAd,
    hasAnalysis,
    metrics: fetchedMetrics,
    metricsLoading,
    metricsAnalysis,
    metricsAnalysisLoading,
    metricsAnalysisError,
    isAnalyzingMetrics,
    analyzeMetrics,
    hasMetricsAnalysis,
  } = useAdDetailData(
    adData?.ad_id || null,
    adData?.entity_name || null,
    adData?.meta_ad_account_id || null,
    startDate,
    endDate,
    preloadedMetricsForAI
  );

  // Usa criativo pre-carregado se disponivel, senao usa o buscado pelo hook
  const creative = preloadedCreative !== undefined ? preloadedCreative : fetchedCreative;
  const creativeLoading = preloadedCreative !== undefined ? false : fetchedCreativeLoading;

  // Agrega metricas pre-carregadas no formato para exibicao na aba de metricas
  const aggregatedPreloadedMetrics = useMemo(() => {
    if (!hasPreloadedData) return null;

    const totals = preloadedMetrics.reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        reach: acc.reach + (row.reach || 0),
        clicks: acc.clicks + (row.clicks || 0),
        spend: acc.spend + (row.spend || 0),
      }),
      { impressions: 0, reach: 0, clicks: 0, spend: 0 }
    );

    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    const avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;

    const dailyMetrics = [...preloadedMetrics]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ad_id: row.entity_id,
        date: row.date,
        impressions: row.impressions || 0,
        reach: row.reach || 0,
        frequency: row.reach > 0 ? row.impressions / row.reach : 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
        cpm: row.cpm || 0,
        spend: row.spend || 0,
        conversions: 0,
        conversion_rate: 0,
        cost_per_conversion: 0,
      }));

    return {
      total_impressions: totals.impressions,
      total_reach: totals.reach,
      avg_frequency: avgFrequency,
      total_clicks: totals.clicks,
      avg_ctr: avgCtr,
      avg_cpc: avgCpc,
      avg_cpm: avgCpm,
      total_spend: totals.spend,
      total_conversions: 0,
      avg_conversion_rate: 0,
      avg_cost_per_conversion: 0,
      daily_metrics: dailyMetrics,
    };
  }, [hasPreloadedData, preloadedMetrics]);

  // Escolhe a fonte de metricas: pre-carregadas ou buscadas
  const metrics = hasPreloadedData ? aggregatedPreloadedMetrics : fetchedMetrics;
  const isMetricsLoading = hasPreloadedData ? false : metricsLoading;

  // Fecha modal com ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !imageZoomOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, imageZoomOpen]);

  if (!isOpen || !adData) return null;

  // Handler para copiar ID
  const handleCopyId = async () => {
    await navigator.clipboard.writeText(adData.ad_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Handler para analise de IA
  const handleAnalyze = async () => {
    if (!creative) return;

    const imageUrl = creative.thumbnail_url || creative.image_url;
    if (!imageUrl) {
      alert('Nenhuma imagem disponível para análise');
      return;
    }

    try {
      await analyzeAd({
        meta_ad_account_id: adData.meta_ad_account_id,
        image_url: imageUrl,
        copy_data: {
          title: creative.title || undefined,
          body: creative.body || undefined,
          description: creative.description || undefined,
          cta: creative.call_to_action || undefined,
        },
      });
    } catch {
      alert('Erro ao analisar anúncio. Tente novamente.');
    }
  };

  // Tabs disponiveis
  // Funcao helper para obter a melhor URL de imagem disponivel (prioriza HD)
  const getBestImageUrl = (creative: MetaAdCreative | null): string | null => {
    if (!creative) return null;

    // Prioridade: image_url_hd > image_url > thumbnail_url
    return creative.image_url_hd || creative.image_url || creative.thumbnail_url || null;
  };

  // Funcao para determinar qualidade da imagem
  const getImageQuality = (creative: MetaAdCreative | null): 'hd' | 'sd' | 'low' | 'unknown' => {
    if (!creative) return 'unknown';

    // Usa o campo thumbnail_quality se disponivel
    if (creative.thumbnail_quality) {
      return creative.thumbnail_quality as 'hd' | 'sd' | 'low' | 'unknown';
    }

    // Fallback: determina pela largura/altura
    const width = creative.image_width || 0;
    const height = creative.image_height || 0;

    if ((width >= 1280 && height >= 720) || (width >= 720 && height >= 1280)) return 'hd';
    if ((width >= 640 && height >= 480) || (width >= 480 && height >= 640)) return 'sd';
    if (width > 0 && height > 0) return 'low';

    return 'unknown';
  };

  const tabs = [
    { id: AdDetailTab.OVERVIEW, label: 'Visão Geral', icon: Eye },
    { id: AdDetailTab.CREATIVE, label: 'Criativo', icon: Image },
    { id: AdDetailTab.METRICS, label: 'Métricas', icon: BarChart3 },
    { id: AdDetailTab.AI_ANALYSIS_METRICS, label: 'Análise IA - Performance', icon: BarChart3 },
    { id: AdDetailTab.AI_ANALYSIS_CREATIVE, label: 'Análise IA - Criativo', icon: Sparkles },
  ];

  // URL da imagem para visualizacao (prioriza HD)
  const displayImageUrl = getBestImageUrl(creative);
  const imageQuality = getImageQuality(creative);

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal Panel */}
        <div className="relative ml-auto w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {adData.entity_name || 'Detalhes do Anúncio'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copiar ID"
                >
                  {copiedId ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span className="font-mono">{adData.ad_id}</span>
                </button>
                {adData.status && (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      adData.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {adData.status}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-200 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview Tab */}
            {activeTab === AdDetailTab.OVERVIEW && (
              <OverviewTab
                adData={adData}
                creative={creative}
                creativeLoading={creativeLoading}
                metrics={metrics}
                metricsLoading={isMetricsLoading}
                hasAnalysis={hasAnalysis}
                analysis={analysis}
                onImageClick={() => setImageZoomOpen(true)}
                onAnalyzeClick={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            )}

            {/* Creative Tab */}
            {activeTab === AdDetailTab.CREATIVE && (
              <CreativeTab
                creative={creative}
                loading={creativeLoading}
                error={creativeError}
                onRefresh={refreshCreative}
                onImageClick={() => setImageZoomOpen(true)}
              />
            )}

            {/* Metrics Tab */}
            {activeTab === AdDetailTab.METRICS && (
              <MetricsTab
                metrics={metrics}
                loading={isMetricsLoading}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {/* AI Analysis Tab - METRICAS - Focado em performance */}
            {activeTab === AdDetailTab.AI_ANALYSIS_METRICS && (
              <MetricsAIAnalysisTab
                metricsAnalysis={metricsAnalysis}
                loading={metricsAnalysisLoading}
                error={metricsAnalysisError}
                isAnalyzing={isAnalyzingMetrics}
                hasMetrics={!!metrics && metrics.total_impressions > 0}
                onAnalyze={analyzeMetrics}
              />
            )}

            {/* AI Analysis Tab - CRIATIVO - Focado em elementos visuais e copy */}
            {activeTab === AdDetailTab.AI_ANALYSIS_CREATIVE && (
              <CreativeAIAnalysisTab
                analysis={analysis}
                creative={creative}
                metrics={metrics}
                isAnalyzing={isAnalyzing}
                error={analysisError}
                onAnalyze={async () => {
                  if (!creative || !creative.image_url) {
                    alert('Criativo não possui imagem disponível para análise.');
                    return;
                  }

                  // Prepara contexto de performance se métricas disponíveis
                  const performanceContext = metrics ? {
                    total_impressions: metrics.total_impressions,
                    total_clicks: metrics.total_clicks,
                    ctr: metrics.avg_ctr,
                    cpc: metrics.avg_cpc,
                    cpm: metrics.avg_cpm,
                    total_spend: metrics.total_spend,
                    conversions: metrics.total_conversions || 0,
                    conversion_rate: metrics.avg_conversion_rate || 0,
                  } : undefined;

                  // Solicita análise do criativo
                  await analyzeAd({
                    meta_ad_account_id: creative.meta_ad_account_id,
                    image_url: creative.image_url,
                    copy_data: {
                      title: creative.title || undefined,
                      body: creative.body || undefined,
                      description: creative.description || undefined,
                      cta: creative.call_to_action || undefined,
                    },
                    performance_context: performanceContext,
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {displayImageUrl && (
        <ImageZoomModal
          isOpen={imageZoomOpen}
          onClose={() => setImageZoomOpen(false)}
          imageUrl={displayImageUrl}
          imageUrlHd={creative?.image_url_hd}
          quality={imageQuality}
          title={adData.entity_name}
        />
      )}
    </>
  );
};

// ============================================
// Sub-componentes das Tabs
// ============================================

// Overview Tab Component
interface OverviewTabProps {
  adData: AdDetailModalState['adData'];
  creative: ReturnType<typeof useAdDetailData>['creative'];
  creativeLoading: boolean;
  metrics: ReturnType<typeof useAdDetailData>['metrics'];
  metricsLoading: boolean;
  hasAnalysis: boolean;
  analysis: ReturnType<typeof useAdDetailData>['analysis'];
  onImageClick: () => void;
  onAnalyzeClick: () => void;
  isAnalyzing: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  adData,
  creative,
  creativeLoading,
  metrics,
  metricsLoading,
  hasAnalysis,
  analysis,
  onImageClick,
  onAnalyzeClick,
  isAnalyzing,
}) => {
  // Usa a melhor URL disponivel (prioriza HD)
  const imageUrl = creative?.image_url_hd || creative?.image_url || creative?.thumbnail_url;

  // Funcoes de formatacao
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const formatNumber = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n));
  const formatPercent = (n: number) => `${n.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Info basica + Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-gray-900">Informações</h3>
          <div className="space-y-2 text-sm">
            {adData?.campaign_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Campanha:</span>
                <span className="text-gray-900 font-medium truncate ml-2">{adData.campaign_name}</span>
              </div>
            )}
            {adData?.adset_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Conjunto:</span>
                <span className="text-gray-900 font-medium truncate ml-2">{adData.adset_name}</span>
              </div>
            )}
            {creative && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="text-gray-900 font-medium">
                  {getCreativeTypeLabel(creative.creative_type)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Preview</h3>
          {creativeLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : imageUrl ? (
            <div
              className="relative cursor-pointer group"
              onClick={onImageClick}
            >
              <img
                src={imageUrl}
                alt="Preview do anúncio"
                className="w-full h-64 object-contain rounded-lg bg-gray-100"
              />
              {creative?.creative_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <Play className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-sm font-medium">Clique para ampliar</span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-gray-100 rounded-lg text-gray-400">
              <Image className="w-8 h-8 mb-2" />
              <p className="text-xs text-gray-500">Sem preview disponível</p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Performance</h3>
        {metricsLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Gasto Total"
              value={formatCurrency(metrics.total_spend)}
              icon={DollarSign}
              color="green"
            />
            <KPICard
              label="CTR"
              value={formatPercent(metrics.avg_ctr)}
              icon={TrendingUp}
              color="blue"
            />
            <KPICard
              label="CPC"
              value={formatCurrency(metrics.avg_cpc)}
              icon={MousePointer}
              color="cyan"
            />
            <KPICard
              label="Impressões"
              value={formatNumber(metrics.total_impressions)}
              icon={Eye}
              color="amber"
            />
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            Nenhuma métrica disponível
          </div>
        )}
      </div>

      {/* Status da analise de IA */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasAnalysis ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Sparkles className={`w-5 h-5 ${hasAnalysis ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Análise de IA</h4>
              <p className="text-sm text-gray-500">
                {hasAnalysis
                  ? `Score geral: ${analysis?.overall_score}/100`
                  : 'Ainda não analisado'}
              </p>
            </div>
          </div>
          {!hasAnalysis && creative && (creative.thumbnail_url || creative.image_url) && (
            <button
              onClick={onAnalyzeClick}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar com IA
                </>
              )}
            </button>
          )}
          {hasAnalysis && (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
};

// KPI Card helper com icone e cor
interface KPICardProps {
  label: string;
  value: string;
  icon?: React.FC<{ className?: string }>;
  color?: 'green' | 'blue' | 'cyan' | 'amber' | 'red';
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-100 text-green-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    cyan: 'bg-cyan-50 border-cyan-100 text-cyan-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    red: 'bg-red-50 border-red-100 text-red-600',
  };

  return (
    <div className={`rounded-lg p-3 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-50" />}
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
};

// Creative Tab Component com suporte a video
interface CreativeTabProps {
  creative: ReturnType<typeof useAdDetailData>['creative'];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onImageClick: () => void;
}

const CreativeTab: React.FC<CreativeTabProps> = ({
  creative,
  loading,
  error,
  onRefresh,
  onImageClick,
}) => {
  // Estados para controle do video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handlers do video
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handler de refresh que preserva o criativo durante a atualizacao
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mostra loading apenas se nao tiver criativo
  if (loading && !creative) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando criativo...</p>
        </div>
      </div>
    );
  }

  if (error && !creative) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Erro ao carregar criativo</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mx-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
          </button>
        </div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Criativo não encontrado</p>
          <p className="text-sm text-gray-500 mb-4">
            O criativo deste anúncio ainda não foi sincronizado. Isso pode acontecer com anúncios
            mais antigos ou que foram criados recentemente.
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Buscando...' : 'Buscar criativo agora'}
          </button>
        </div>
      </div>
    );
  }

  // Usa a melhor URL disponivel (prioriza HD)
  const imageUrl = creative.image_url_hd || creative.image_url || creative.thumbnail_url;
  const videoUrl = creative.video_url;
  const isVideo = creative.creative_type === 'video' && videoUrl;

  // Determina qualidade da imagem
  const imageQuality = creative.thumbnail_quality || 'unknown';
  const qualityConfig = {
    hd: { label: 'HD', color: 'bg-green-100 text-green-700' },
    sd: { label: 'SD', color: 'bg-blue-100 text-blue-700' },
    low: { label: 'Baixa', color: 'bg-orange-100 text-orange-700' },
    unknown: { label: '', color: '' },
  };

  return (
    <div className="space-y-6">
      {/* Preview da midia (imagem ou video) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Visual</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
              {getCreativeTypeLabel(creative.creative_type)}
            </span>
            {imageQuality !== 'unknown' && qualityConfig[imageQuality as keyof typeof qualityConfig].label && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${qualityConfig[imageQuality as keyof typeof qualityConfig].color}`}>
                {qualityConfig[imageQuality as keyof typeof qualityConfig].label}
              </span>
            )}
            {creative.image_width && creative.image_height && (
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded font-mono">
                {creative.image_width}×{creative.image_height}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
              title="Atualizar criativo"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overlay de loading durante refresh */}
        {isRefreshing && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-700">Atualizando criativo...</span>
          </div>
        )}

        {/* Player de video se for video */}
        {isVideo ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              poster={imageUrl || undefined}
              className="w-full max-h-[600px] object-contain"
              muted={isMuted}
              playsInline
              onEnded={() => setIsPlaying(false)}
            />
            {/* Controles do video */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
                <button
                  onClick={onImageClick}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <div
            className="relative cursor-pointer group rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
            onClick={onImageClick}
          >
            <img
              src={imageUrl}
              alt="Criativo do anúncio"
              className="w-full max-h-[600px] object-contain"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="px-4 py-2 bg-black/70 rounded-lg">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Clique para expandir
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-100 rounded-lg">
            <Image className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Textos do anuncio */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Textos do Anúncio</h3>

        {creative.title && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Título</label>
            <p className="mt-1 text-gray-900">{creative.title}</p>
          </div>
        )}

        {creative.body && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Corpo</label>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{creative.body}</p>
          </div>
        )}

        {creative.description && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Descrição</label>
            <p className="mt-1 text-gray-900">{creative.description}</p>
          </div>
        )}

        {creative.call_to_action && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Call-to-Action</label>
            <span className="mt-1 inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
              {creative.call_to_action.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {creative.link_url && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Link de Destino</label>
            <a
              href={creative.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
            >
              {creative.link_url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {!creative.title && !creative.body && !creative.description && (
          <p className="text-gray-500 text-sm">Nenhum texto disponível</p>
        )}
      </div>

      {/* Link preview Meta */}
      {creative.preview_url && (
        <div className="pt-4 border-t border-gray-200">
          <a
            href={creative.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Ver preview completo no Meta
          </a>
        </div>
      )}
    </div>
  );
};

// Metrics Tab Component com graficos
interface MetricsTabProps {
  metrics: ReturnType<typeof useAdDetailData>['metrics'];
  loading: boolean;
  startDate: string;
  endDate: string;
}

const MetricsTab: React.FC<MetricsTabProps> = ({ metrics, loading, startDate, endDate }) => {
  // Tipo de grafico selecionado
  const [chartType, setChartType] = useState<'spend' | 'performance'>('spend');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.daily_metrics.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma métrica disponível para este período</p>
        </div>
      </div>
    );
  }

  // Funcoes de formatacao
  const formatNumber = (n: number) => n.toLocaleString('pt-BR');
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const formatPercent = (n: number) => `${n.toFixed(2)}%`;
  const formatCompact = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return formatNumber(n);
  };

  // Dados para graficos
  const chartData = metrics.daily_metrics.map((day) => ({
    date: day.date,
    dateLabel: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    spend: day.spend,
    impressions: day.impressions,
    clicks: day.clicks,
    ctr: day.ctr,
    cpc: day.cpc,
    cpm: day.cpm,
  }));

  return (
    <div className="space-y-6">
      {/* Periodo */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
      </div>

      {/* Grid de metricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Gasto Total</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.total_spend)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Impressões</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(metrics.total_impressions)}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Cliques</span>
            <MousePointer className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(metrics.total_clicks)}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Alcance</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(metrics.total_reach)}</p>
        </div>
      </div>

      {/* Metricas secundarias */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MetricBadge label="CTR" value={formatPercent(metrics.avg_ctr)} trend="up" />
        <MetricBadge label="CPC" value={formatCurrency(metrics.avg_cpc)} />
        <MetricBadge label="CPM" value={formatCurrency(metrics.avg_cpm)} />
        <MetricBadge label="Frequência" value={metrics.avg_frequency.toFixed(2)} />
        <MetricBadge label="Conversões" value={formatNumber(metrics.total_conversions)} />
        <MetricBadge label="Custo/Conv." value={formatCurrency(metrics.avg_cost_per_conversion)} />
      </div>

      {/* Graficos */}
      {chartData.length > 1 && (
        <div className="space-y-4">
          {/* Seletor de tipo de grafico */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Evolução Diária</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setChartType('spend')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartType === 'spend'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Gasto
              </button>
              <button
                onClick={() => setChartType('performance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartType === 'performance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Performance
              </button>
            </div>
          </div>

          {/* Grafico de Gasto */}
          {chartType === 'spend' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dateLabel" stroke="#9ca3af" fontSize={11} />
                    <YAxis
                      tickFormatter={(v) => `R$${v}`}
                      stroke="#9ca3af"
                      fontSize={11}
                      width={60}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#spendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grafico de Performance (Impressoes e Cliques) */}
          {chartType === 'performance' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dateLabel" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} width={60} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === 'impressions' ? 'Impressões' : 'Cliques',
                      ]}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="impressions"
                      name="impressions"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      name="clicks"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Legenda */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-600">Impressões</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-600">Cliques</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela de metricas diarias */}
      {metrics.daily_metrics.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Métricas Diárias</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Data</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Impressões</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Cliques</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">CTR</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.daily_metrics.slice(0, 10).map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">
                      {new Date(day.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatNumber(day.impressions)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatNumber(day.clicks)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatPercent(day.ctr)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatCurrency(day.spend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {metrics.daily_metrics.length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Exibindo 10 de {metrics.daily_metrics.length} dias
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Metric Badge helper
const MetricBadge: React.FC<{ label: string; value: string; trend?: 'up' | 'down' }> = ({
  label,
  value,
  trend,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="flex items-center justify-center gap-1">
      <span className="text-sm font-semibold text-gray-900">{value}</span>
      {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
      {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
    </div>
  </div>
);

// Metrics AI Analysis Tab Component - NOVO FOCO EM METRICAS DE PERFORMANCE
interface MetricsAIAnalysisTabProps {
  metricsAnalysis: MetricsAIAnalysis | null;
  loading: boolean;
  error: string | null;
  isAnalyzing: boolean;
  hasMetrics: boolean;
  onAnalyze: () => void;
}

const MetricsAIAnalysisTab: React.FC<MetricsAIAnalysisTabProps> = ({
  metricsAnalysis,
  loading,
  error,
  isAnalyzing,
  hasMetrics,
  onAnalyze,
}) => {
  // Estado de loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando analise...</p>
        </div>
      </div>
    );
  }

  // Estado de analisando
  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative">
            <BarChart3 className="w-12 h-12 text-blue-500 animate-pulse mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-gray-900 font-medium mt-6 mb-2">Analisando metricas com IA...</p>
          <p className="text-sm text-gray-500">Isso pode levar de 15 a 45 segundos</p>
        </div>
      </div>
    );
  }

  // Estado de erro - exibe mensagem e botao para tentar novamente
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erro na Analise
          </h3>
          <p className="text-gray-500 mb-4">
            {error}
          </p>
          <button
            onClick={onAnalyze}
            disabled={!hasMetrics}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5" />
            Tentar Novamente
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Se o erro persistir, verifique sua conexao ou tente mais tarde
          </p>
        </div>
      </div>
    );
  }

  // Estado sem analise - prompt para analisar
  if (!metricsAnalysis) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analise de Metricas com IA
          </h3>
          <p className="text-gray-500 mb-6">
            Obtenha insights detalhados sobre a performance do seu anuncio, incluindo
            tendencias, anomalias, comparativos com benchmarks e recomendacoes de otimizacao.
          </p>
          {hasMetrics ? (
            <button
              onClick={onAnalyze}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="w-5 h-5" />
              Analisar Metricas com IA
            </button>
          ) : (
            <p className="text-sm text-amber-600">
              Nenhuma metrica disponivel para analise neste periodo
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Usa GPT-4 para analise estrategica de performance
          </p>
        </div>
      </div>
    );
  }

  // Renderiza analise completa
  const scores = metricsAnalysis.performance_scores;
  const overallColor = getPerformanceScoreColor(scores.overall_score);

  return (
    <div className="space-y-6">
      {/* Scores de Performance */}
      <div className={`rounded-xl p-6 border ${overallColor.border} ${overallColor.bg}`}>
        <h3 className="font-medium text-gray-900 mb-4 text-center">Scores de Performance</h3>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <ScoreCircle score={scores.efficiency_score} size="sm" label="Eficiencia" />
          <ScoreCircle score={scores.cost_score} size="sm" label="Custo" />
          <ScoreCircle score={scores.overall_score} size="lg" label="Geral" />
          <ScoreCircle score={scores.reach_score} size="sm" label="Alcance" />
          <ScoreCircle score={scores.conversion_score} size="sm" label="Conversao" />
        </div>
        <div className="text-center mt-4">
          <span className={`text-sm font-medium ${overallColor.text}`}>
            Performance: {getPerformanceScoreLabel(scores.overall_score)}
          </span>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Resumo Executivo</h3>
        </div>
        <p className="text-gray-700">{metricsAnalysis.executive_summary}</p>
      </div>

      {/* Diagnostico Geral */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Diagnostico</h3>
        </div>
        <p className="text-gray-600 text-sm">{metricsAnalysis.overall_diagnosis}</p>
      </div>

      {/* Areas de Atencao Prioritaria */}
      {metricsAnalysis.priority_areas && metricsAnalysis.priority_areas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-amber-900">Areas de Atencao Prioritaria</h3>
          </div>
          <ul className="space-y-2">
            {metricsAnalysis.priority_areas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tendencias Identificadas */}
      {metricsAnalysis.trends && metricsAnalysis.trends.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Tendencias Identificadas</h3>
          </div>
          <div className="space-y-4">
            {metricsAnalysis.trends.map((trend, i) => {
              const trendInfo = getTrendInfo(trend.direction);
              return (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{trend.metric}</span>
                    <div className="flex items-center gap-2">
                      {trendInfo.arrow === 'up' && <TrendingUp className={`w-4 h-4 ${trendInfo.color}`} />}
                      {trendInfo.arrow === 'down' && <TrendingDown className={`w-4 h-4 ${trendInfo.color}`} />}
                      <span className={`text-sm font-medium ${trendInfo.color}`}>
                        {trend.change_percent > 0 ? '+' : ''}{trend.change_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{trend.interpretation}</p>
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Sparkles className="w-3 h-3" />
                    {trend.action_suggested}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomalias Detectadas */}
      {metricsAnalysis.anomalies && metricsAnalysis.anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-900">Anomalias Detectadas</h3>
          </div>
          <div className="space-y-4">
            {metricsAnalysis.anomalies.map((anomaly, i) => {
              const impactColor = getImpactColor(anomaly.severity);
              return (
                <div key={i} className="p-4 bg-white rounded-lg border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{anomaly.metric}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${impactColor.bg} ${impactColor.text}`}>
                      {getImpactLabel(anomaly.severity)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{anomaly.description}</p>
                  {anomaly.possible_causes.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 uppercase">Possiveis Causas:</span>
                      <ul className="mt-1 space-y-1">
                        {anomaly.possible_causes.map((cause, j) => (
                          <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-gray-400">-</span> {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {anomaly.recommended_actions.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase">Acoes Recomendadas:</span>
                      <ul className="mt-1 space-y-1">
                        {anomaly.recommended_actions.map((action, j) => (
                          <li key={j} className="text-xs text-blue-600 flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparacao com Benchmarks */}
      {metricsAnalysis.benchmark_comparisons && metricsAnalysis.benchmark_comparisons.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Comparativo com Benchmarks</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metricsAnalysis.benchmark_comparisons.map((comp, i) => {
              const statusColor = getBenchmarkStatusColor(comp.status);
              return (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{comp.metric}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColor.bg} ${statusColor.text}`}>
                      {getBenchmarkStatusLabel(comp.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Atual: {typeof comp.current_value === 'number' ? comp.current_value.toFixed(2) : comp.current_value}</span>
                    <span>Benchmark: {typeof comp.benchmark_value === 'number' ? comp.benchmark_value.toFixed(2) : comp.benchmark_value}</span>
                  </div>
                  <p className="text-xs text-gray-600">{comp.interpretation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights Detalhados */}
      {metricsAnalysis.insights && metricsAnalysis.insights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Insights ({metricsAnalysis.insights.length})</h3>
          </div>
          <div className="space-y-4">
            {metricsAnalysis.insights.map((insight, i) => {
              const impactColor = getImpactColor(insight.impact);
              return (
                <div key={i} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${impactColor.bg} ${impactColor.text}`}>
                        {getImpactLabel(insight.impact)}
                      </span>
                      <span className="text-xs text-gray-400">{insight.confidence}% conf.</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">
                      <strong>Atual:</strong> {insight.current_value}
                    </span>
                    {insight.expected_value && (
                      <span className="text-gray-500">
                        <strong>Ideal:</strong> {insight.expected_value}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{insight.recommendation}</p>
                    </div>
                    {insight.potential_improvement && (
                      <p className="text-xs text-blue-600 mt-2 ml-6">
                        Melhoria potencial: {insight.potential_improvement}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recomendacoes de Otimizacao */}
      {metricsAnalysis.recommendations && metricsAnalysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900">
              Recomendacoes de Otimizacao ({metricsAnalysis.recommendations.length})
            </h3>
          </div>
          <div className="space-y-4">
            {metricsAnalysis.recommendations.map((rec, i) => {
              const priorityColor = getImpactColor(rec.priority);
              return (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full ${priorityColor.bg} ${priorityColor.text} flex items-center justify-center text-xs font-bold`}>
                        {i + 1}
                      </span>
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColor.bg} ${priorityColor.text}`}>
                      {getImpactLabel(rec.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100 mb-3">
                    <span className="text-xs text-green-600 uppercase font-medium">Impacto Esperado:</span>
                    <p className="text-sm text-green-800 mt-1">{rec.expected_impact}</p>
                    {rec.estimated_improvement && (
                      <p className="text-xs text-green-600 mt-1 font-medium">{rec.estimated_improvement}</p>
                    )}
                  </div>
                  {rec.implementation_steps && rec.implementation_steps.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 uppercase">Passos para Implementacao:</span>
                      <ol className="mt-2 space-y-1">
                        {rec.implementation_steps.map((step, j) => (
                          <li key={j} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs flex-shrink-0">
                              {j + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {rec.metrics_to_monitor && rec.metrics_to_monitor.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">Metricas para monitorar:</span>
                      {rec.metrics_to_monitor.map((metric, j) => (
                        <span key={j} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {metric}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Previsao de Curto Prazo */}
      {metricsAnalysis.short_term_forecast && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
            <h3 className="font-medium text-gray-900">Previsao de Curto Prazo</h3>
          </div>
          <p className="text-gray-700">{metricsAnalysis.short_term_forecast}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
        <span>
          Analisado em: {new Date(metricsAnalysis.analyzed_at).toLocaleString('pt-BR')}
        </span>
        <span>Modelo: {metricsAnalysis.model_used}</span>
      </div>

      {/* Re-analyze button */}
      <div className="flex justify-center">
        <button
          onClick={onAnalyze}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Gerar nova analise
        </button>
      </div>
    </div>
  );
};

export default AdDetailModal;
