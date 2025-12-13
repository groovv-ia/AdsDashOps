/**
 * AdDetailModal Component
 *
 * Modal completo para visualização de detalhes de um anúncio
 * incluindo criativo, métricas e análise de IA.
 */

import React, { useState, useMemo } from 'react';
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
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react';
import { useAdDetailData } from '../../hooks/useAdDetails';
import { ScoreCircle } from './ScoreCircle';
import { RecommendationCard } from './RecommendationCard';
import { ImageZoomModal } from './ImageZoomModal';
import { AdDetailTab, getCreativeTypeLabel } from '../../types/adAnalysis';
import type { AdDetailModalState } from '../../types/adAnalysis';

interface AdDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  adData: AdDetailModalState['adData'];
  dateRange?: { start: string; end: string };
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  isOpen,
  onClose,
  adData,
  dateRange,
}) => {
  const [activeTab, setActiveTab] = useState<AdDetailTab>(AdDetailTab.OVERVIEW);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Datas padrão: últimos 30 dias
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const startDate = dateRange?.start || defaultStartDate;
  const endDate = dateRange?.end || defaultEndDate;

  // Hook combinado para todos os dados
  const {
    creative,
    creativeLoading,
    creativeError,
    refreshCreative,
    analysis,
    analysisLoading,
    isAnalyzing,
    analyzeAd,
    hasAnalysis,
    metrics,
    metricsLoading,
  } = useAdDetailData(
    adData?.ad_id || null,
    adData?.meta_ad_account_id || null,
    startDate,
    endDate
  );

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

  // Handler para análise de IA
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

  // Tabs disponíveis
  const tabs = [
    { id: AdDetailTab.OVERVIEW, label: 'Visão Geral', icon: Eye },
    { id: AdDetailTab.CREATIVE, label: 'Criativo', icon: Image },
    { id: AdDetailTab.METRICS, label: 'Métricas', icon: BarChart3 },
    { id: AdDetailTab.AI_ANALYSIS, label: 'Análise IA', icon: Sparkles },
  ];

  // URL da imagem para visualização
  const displayImageUrl = creative?.thumbnail_url || creative?.image_url;

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
                metricsLoading={metricsLoading}
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
                loading={metricsLoading}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {/* AI Analysis Tab */}
            {activeTab === AdDetailTab.AI_ANALYSIS && (
              <AIAnalysisTab
                analysis={analysis}
                loading={analysisLoading}
                isAnalyzing={isAnalyzing}
                hasCreative={!!creative}
                hasImage={!!displayImageUrl}
                onAnalyze={handleAnalyze}
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
  const imageUrl = creative?.thumbnail_url || creative?.image_url;

  return (
    <div className="space-y-6">
      {/* Info básica + Preview */}
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
            <div className="h-32 flex items-center justify-center">
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
                className="w-full h-32 object-cover rounded-lg"
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
            <div className="h-32 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
              <Image className="w-8 h-8" />
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
            <KPICard label="Gasto Total" value={`R$ ${metrics.total_spend.toFixed(2)}`} />
            <KPICard label="CTR" value={`${metrics.avg_ctr.toFixed(2)}%`} />
            <KPICard label="CPC" value={`R$ ${metrics.avg_cpc.toFixed(2)}`} />
            <KPICard label="Conversões" value={metrics.total_conversions.toString()} />
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            Nenhuma métrica disponível
          </div>
        )}
      </div>

      {/* Status da análise de IA */}
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

// KPI Card helper
const KPICard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-lg font-semibold text-gray-900">{value}</div>
  </div>
);

// Creative Tab Component
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
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando criativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Erro ao carregar criativo</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum criativo disponível</p>
        </div>
      </div>
    );
  }

  const imageUrl = creative.thumbnail_url || creative.image_url;

  return (
    <div className="space-y-6">
      {/* Preview da imagem */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Visual</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
              {getCreativeTypeLabel(creative.creative_type)}
            </span>
            <button
              onClick={onRefresh}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Atualizar criativo"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        {imageUrl ? (
          <div
            className="relative cursor-pointer group rounded-lg overflow-hidden border border-gray-200"
            onClick={onImageClick}
          >
            <img
              src={imageUrl}
              alt="Criativo do anúncio"
              className="w-full max-h-96 object-contain bg-gray-50"
            />
            {creative.creative_type === 'video' && (
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs rounded">
                <Play className="w-3 h-3" />
                Vídeo
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-100 rounded-lg">
            <Image className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Textos do anúncio */}
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

// Metrics Tab Component
interface MetricsTabProps {
  metrics: ReturnType<typeof useAdDetailData>['metrics'];
  loading: boolean;
  startDate: string;
  endDate: string;
}

const MetricsTab: React.FC<MetricsTabProps> = ({ metrics, loading, startDate, endDate }) => {
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

  const formatNumber = (n: number) => n.toLocaleString('pt-BR');
  const formatCurrency = (n: number) => `R$ ${n.toFixed(2)}`;
  const formatPercent = (n: number) => `${n.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Impressões" value={formatNumber(metrics.total_impressions)} />
        <MetricCard label="Alcance" value={formatNumber(metrics.total_reach)} />
        <MetricCard label="Frequência" value={metrics.avg_frequency.toFixed(2)} />
        <MetricCard label="Cliques" value={formatNumber(metrics.total_clicks)} />
        <MetricCard label="CTR" value={formatPercent(metrics.avg_ctr)} highlight />
        <MetricCard label="CPC" value={formatCurrency(metrics.avg_cpc)} />
        <MetricCard label="CPM" value={formatCurrency(metrics.avg_cpm)} />
        <MetricCard label="Gasto Total" value={formatCurrency(metrics.total_spend)} highlight />
        <MetricCard label="Conversões" value={formatNumber(metrics.total_conversions)} />
      </div>

      {/* Tabela de métricas diárias */}
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

// Metric Card helper
const MetricCard: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className={`rounded-lg p-4 ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={`text-xl font-semibold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
      {value}
    </div>
  </div>
);

// AI Analysis Tab Component
interface AIAnalysisTabProps {
  analysis: ReturnType<typeof useAdDetailData>['analysis'];
  loading: boolean;
  isAnalyzing: boolean;
  hasCreative: boolean;
  hasImage: boolean;
  onAnalyze: () => void;
}

const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({
  analysis,
  loading,
  isAnalyzing,
  hasCreative,
  hasImage,
  onAnalyze,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative">
            <Sparkles className="w-12 h-12 text-blue-500 animate-pulse mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-gray-900 font-medium mt-6 mb-2">Analisando anúncio com IA...</p>
          <p className="text-sm text-gray-500">Isso pode levar de 10 a 30 segundos</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Análise de IA disponível
          </h3>
          <p className="text-gray-500 mb-6">
            Obtenha insights detalhados sobre o criativo e a copy do seu anúncio
            usando inteligência artificial.
          </p>
          {hasCreative && hasImage ? (
            <button
              onClick={onAnalyze}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="w-5 h-5" />
              Analisar com IA
            </button>
          ) : (
            <p className="text-sm text-amber-600">
              {!hasCreative
                ? 'Carregue o criativo primeiro para analisar'
                : 'Nenhuma imagem disponível para análise'}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Usa GPT-4 Vision para análise avançada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-6 text-center">Pontuação Geral</h3>
        <div className="flex items-center justify-center gap-8">
          <ScoreCircle score={analysis.creative_score} size="md" label="Criativo" />
          <ScoreCircle score={analysis.overall_score} size="lg" label="Geral" />
          <ScoreCircle score={analysis.copy_score} size="md" label="Copy" />
        </div>
      </div>

      {/* Visual Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Análise Visual</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-500">Uso de cores:</span>
            <p className="text-gray-900">{analysis.visual_analysis.color_usage}</p>
          </div>
          <div>
            <span className="text-gray-500">Visibilidade do texto:</span>
            <p className="text-gray-900">{analysis.visual_analysis.text_visibility}</p>
          </div>
          <div>
            <span className="text-gray-500">Consistência visual:</span>
            <p className="text-gray-900">{analysis.visual_analysis.brand_consistency}</p>
          </div>
          <div>
            <span className="text-gray-500">Capacidade de atrair:</span>
            <p className="text-gray-900">{analysis.visual_analysis.attention_grabbing}</p>
          </div>
        </div>
        {analysis.visual_analysis.key_strengths.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 uppercase">Pontos fortes</span>
            <ul className="mt-1 space-y-1">
              {analysis.visual_analysis.key_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.visual_analysis.improvement_areas.length > 0 && (
          <div>
            <span className="text-xs text-gray-500 uppercase">Áreas de melhoria</span>
            <ul className="mt-1 space-y-1">
              {analysis.visual_analysis.improvement_areas.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Copy Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Análise da Copy</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-500">Nível de persuasão:</span>
            <p className="text-gray-900 capitalize">{analysis.copy_analysis.persuasion_level}</p>
          </div>
          <div>
            <span className="text-gray-500">Urgência presente:</span>
            <p className="text-gray-900">{analysis.copy_analysis.urgency_present ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <span className="text-gray-500">Eficácia do CTA:</span>
            <p className="text-gray-900">{analysis.copy_analysis.cta_effectiveness}</p>
          </div>
          <div>
            <span className="text-gray-500">Apelo emocional:</span>
            <p className="text-gray-900">{analysis.copy_analysis.emotional_appeal}</p>
          </div>
        </div>
        {analysis.copy_analysis.key_strengths.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 uppercase">Pontos fortes</span>
            <ul className="mt-1 space-y-1">
              {analysis.copy_analysis.key_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.copy_analysis.improvement_areas.length > 0 && (
          <div>
            <span className="text-xs text-gray-500 uppercase">Áreas de melhoria</span>
            <ul className="mt-1 space-y-1">
              {analysis.copy_analysis.improvement_areas.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-4">
            Recomendações ({analysis.recommendations.length})
          </h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
        <span>
          Analisado em: {new Date(analysis.analyzed_at).toLocaleString('pt-BR')}
        </span>
        <span>Modelo: {analysis.model_used}</span>
      </div>

      {/* Re-analyze button */}
      <div className="flex justify-center">
        <button
          onClick={onAnalyze}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Gerar nova análise
        </button>
      </div>
    </div>
  );
};

export default AdDetailModal;
