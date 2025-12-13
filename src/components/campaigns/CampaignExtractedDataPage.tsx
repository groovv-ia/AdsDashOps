/**
 * CampaignExtractedDataPage - Pagina de Dados Extraidos de Campanha
 *
 * Pagina principal que integra a visualizacao de dados extraidos de uma campanha,
 * incluindo conjuntos de anuncios, anuncios individuais, comparacao de periodos
 * e graficos de tendencia.
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Database,
  Layers,
  Image as ImageIcon,
  TrendingUp,
  Calendar,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  campaignExtractedDataService,
  type ExtractedCampaign,
  type AdSetData,
  type AdData,
  type CampaignMetrics,
} from '../../lib/services/CampaignExtractedDataService';
import { ExtractedCampaignSelector } from './ExtractedCampaignSelector';
import { CampaignAdSetsTable } from './CampaignAdSetsTable';
import { CampaignAdsTable } from './CampaignAdsTable';
import { PeriodComparisonCard } from './PeriodComparisonCard';
import { CampaignTrendCharts } from './CampaignTrendCharts';
import { Loading } from '../ui/Loading';
import { Card } from '../ui/Card';

// ============================================
// Tipos e Interfaces
// ============================================

interface CampaignExtractedDataPageProps {
  onNavigateBack: () => void;
  initialCampaignId?: string;
}

type TabType = 'adsets' | 'ads' | 'comparison' | 'charts';

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Formata numero para exibicao
 */
function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Formata valor monetario
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/**
 * Formata percentual
 */
function formatPercent(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

// ============================================
// Componente de KPI Card
// ============================================

interface KPICardProps {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
}

function KPICard({ label, value, icon: Icon, color }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================

export function CampaignExtractedDataPage({
  onNavigateBack,
  initialCampaignId,
}: CampaignExtractedDataPageProps) {
  // Estados principais
  const [selectedCampaign, setSelectedCampaign] = useState<ExtractedCampaign | null>(null);
  const [selectedDataSetId, setSelectedDataSetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('adsets');

  // Estados de dados
  const [adSets, setAdSets] = useState<AdSetData[]>([]);
  const [ads, setAds] = useState<AdData[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);

  // Estados de carregamento
  const [loadingData, setLoadingData] = useState(false);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | undefined>(undefined);

  // Carregar dados quando campanha ou data set mudar
  useEffect(() => {
    if (selectedCampaign && selectedDataSetId) {
      loadCampaignData();
    }
  }, [selectedCampaign, selectedDataSetId]);

  /**
   * Carrega todos os dados da campanha selecionada
   */
  async function loadCampaignData() {
    if (!selectedCampaign || !selectedDataSetId) return;

    setLoadingData(true);

    // Carregar adsets, ads e metricas em paralelo
    const [adSetsResult, adsResult, metricsResult] = await Promise.all([
      campaignExtractedDataService.getAdSetsFromExtractedData(
        selectedCampaign.campaign_id,
        selectedDataSetId
      ),
      campaignExtractedDataService.getAdsFromExtractedData(
        selectedCampaign.campaign_id,
        selectedDataSetId
      ),
      campaignExtractedDataService.getCampaignMetrics(
        selectedCampaign.campaign_id,
        selectedDataSetId
      ),
    ]);

    if (adSetsResult.success) setAdSets(adSetsResult.adSets || []);
    if (adsResult.success) setAds(adsResult.ads || []);
    if (metricsResult.success) setMetrics(metricsResult.metrics || null);

    setLoadingData(false);
  }

  /**
   * Handler para selecao de campanha
   */
  function handleSelectCampaign(campaign: ExtractedCampaign) {
    setSelectedCampaign(campaign);
    setSelectedAdSetId(undefined);

    // Selecionar primeiro data set disponivel
    if (campaign.date_ranges.length > 0) {
      setSelectedDataSetId(campaign.date_ranges[0].data_set_id);
    }
  }

  /**
   * Handler para selecao de adset (filtrar anuncios)
   */
  function handleSelectAdSet(adSetId: string) {
    if (selectedAdSetId === adSetId) {
      setSelectedAdSetId(undefined);
    } else {
      setSelectedAdSetId(adSetId);
      setActiveTab('ads');
    }
  }

  // Filtrar anuncios pelo adset selecionado
  const filteredAds = selectedAdSetId
    ? ads.filter(ad => ad.adset_id === selectedAdSetId)
    : ads;

  // Renderizar tela de selecao de campanha
  if (!selectedCampaign) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Cabecalho */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onNavigateBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dados Extraidos de Campanhas
            </h1>
            <p className="text-gray-500 mt-1">
              Selecione uma campanha para visualizar seus dados detalhados
            </p>
          </div>
        </div>

        {/* Seletor de campanhas */}
        <Card className="p-6">
          <ExtractedCampaignSelector
            onSelectCampaign={handleSelectCampaign}
            selectedCampaignId={initialCampaignId}
          />
        </Card>
      </div>
    );
  }

  // Renderizar pagina principal com dados da campanha
  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedCampaign(null)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCampaign.campaign_name}
              </h1>
              <span className={`
                inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium
                ${selectedCampaign.platform === 'meta'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
                }
              `}>
                {selectedCampaign.platform === 'meta' ? 'Meta Ads' : selectedCampaign.platform}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              ID: {selectedCampaign.campaign_id}
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          {/* Seletor de Data Set */}
          <div className="relative">
            <select
              value={selectedDataSetId}
              onChange={e => setSelectedDataSetId(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white text-sm"
            >
              {selectedCampaign.date_ranges.map(range => (
                <option key={range.data_set_id} value={range.data_set_id}>
                  {range.data_set_name}
                </option>
              ))}
            </select>
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Botao de atualizar */}
          <button
            onClick={loadCampaignData}
            disabled={loadingData}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <KPICard
            label="Impressoes"
            value={formatNumber(metrics.impressions)}
            icon={TrendingUp}
            color="bg-blue-500"
          />
          <KPICard
            label="Cliques"
            value={formatNumber(metrics.clicks)}
            icon={TrendingUp}
            color="bg-green-500"
          />
          <KPICard
            label="Gastos"
            value={formatCurrency(metrics.spend)}
            icon={TrendingUp}
            color="bg-amber-500"
          />
          <KPICard
            label="Conversoes"
            value={formatNumber(metrics.conversions)}
            icon={TrendingUp}
            color="bg-purple-500"
          />
          <KPICard
            label="CTR"
            value={formatPercent(metrics.ctr)}
            icon={TrendingUp}
            color="bg-cyan-500"
          />
          <KPICard
            label="CPC"
            value={formatCurrency(metrics.cpc)}
            icon={TrendingUp}
            color="bg-orange-500"
          />
          <KPICard
            label="ROAS"
            value={`${metrics.roas.toFixed(2)}x`}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
        </div>
      )}

      {/* Tabs de navegacao */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          <button
            onClick={() => setActiveTab('adsets')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'adsets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Layers className="w-4 h-4" />
            Conjuntos de Anuncios
            {adSets.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {adSets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'ads'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <ImageIcon className="w-4 h-4" />
            Anuncios
            {ads.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {selectedAdSetId ? filteredAds.length : ads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'comparison'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            Comparar Periodos
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'charts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <TrendingUp className="w-4 h-4" />
            Graficos
          </button>
        </nav>
      </div>

      {/* Conteudo da tab ativa */}
      <div className="min-h-[400px]">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" />
            <span className="ml-3 text-gray-500">Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* Tab: Conjuntos de Anuncios */}
            {activeTab === 'adsets' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Conjuntos de Anuncios
                </h3>
                <CampaignAdSetsTable
                  adSets={adSets}
                  onSelectAdSet={handleSelectAdSet}
                  selectedAdSetId={selectedAdSetId}
                />
              </Card>
            )}

            {/* Tab: Anuncios */}
            {activeTab === 'ads' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Anuncios
                    {selectedAdSetId && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Filtrado por conjunto)
                      </span>
                    )}
                  </h3>
                  {selectedAdSetId && (
                    <button
                      onClick={() => setSelectedAdSetId(undefined)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
                <CampaignAdsTable
                  ads={filteredAds}
                  showAdSetColumn={!selectedAdSetId}
                />
              </Card>
            )}

            {/* Tab: Comparacao de Periodos */}
            {activeTab === 'comparison' && (
              <PeriodComparisonCard
                campaignId={selectedCampaign.campaign_id}
                availablePeriods={selectedCampaign.date_ranges}
              />
            )}

            {/* Tab: Graficos */}
            {activeTab === 'charts' && (
              <CampaignTrendCharts
                campaignId={selectedCampaign.campaign_id}
                dataSetId={selectedDataSetId}
                adSets={adSets}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
