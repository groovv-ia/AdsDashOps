/**
 * CampaignExtractedDataPage - Pagina de Dados de Campanha
 *
 * Pagina principal que integra a visualizacao de dados de campanhas sincronizadas,
 * incluindo conjuntos de anuncios, anuncios individuais e graficos de tendencia.
 * Permite clicar em um anuncio para abrir seus detalhes com criativo completo.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Layers,
  Image as ImageIcon,
  TrendingUp,
  RefreshCw,
  Target,
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
import { CampaignTrendCharts } from './CampaignTrendCharts';
import { AdDetailModal } from '../ad-analysis';
import { useAdCreativesBatch } from '../../hooks/useAdCreativesBatch';
import { Loading } from '../ui/Loading';
import { Card } from '../ui/Card';

// ============================================
// Tipos e Interfaces
// ============================================

interface CampaignExtractedDataPageProps {
  onNavigateBack: () => void;
  initialCampaignId?: string;
}

type TabType = 'adsets' | 'ads' | 'charts';

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
  const [activeTab, setActiveTab] = useState<TabType>('adsets');

  // Estados de dados
  const [adSets, setAdSets] = useState<AdSetData[]>([]);
  const [ads, setAds] = useState<AdData[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);

  // Estados de carregamento
  const [loadingData, setLoadingData] = useState(false);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | undefined>(undefined);

  // Estados do modal de detalhes do anuncio
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Monta lista de ads para busca de criativos em lote
  // Inicia a busca independente da aba ativa para que os criativos
  // ja estejam carregados quando o usuario navegar para a aba de anuncios
  const adsForCreatives = useMemo(() => {
    if (ads.length === 0) return undefined;

    const adsWithAccount = ads.filter(ad => ad.meta_ad_account_id);
    if (adsWithAccount.length === 0) return undefined;

    return adsWithAccount.map(ad => ({
      entity_id: ad.ad_id,
      meta_ad_account_id: ad.meta_ad_account_id!,
    }));
  }, [ads]);

  // Hook para buscar criativos em lote automaticamente
  const { getCreative, getLoadingState } = useAdCreativesBatch(adsForCreatives);

  // Carregar dados quando campanha mudar
  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignData();
    }
  }, [selectedCampaign]);

  /**
   * Carrega todos os dados da campanha selecionada
   */
  async function loadCampaignData() {
    if (!selectedCampaign) return;

    setLoadingData(true);

    // Carregar adsets, ads e metricas em paralelo
    const [adSetsResult, adsResult, metricsResult] = await Promise.all([
      campaignExtractedDataService.getAdSetsFromExtractedData(selectedCampaign.campaign_id),
      campaignExtractedDataService.getAdsFromExtractedData(selectedCampaign.campaign_id),
      campaignExtractedDataService.getCampaignMetrics(selectedCampaign.campaign_id),
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

  /**
   * Handler para selecao de anuncio (abrir modal de detalhes)
   */
  function handleSelectAd(ad: AdData) {
    setSelectedAd(ad);
    setIsAdModalOpen(true);
  }

  /**
   * Fecha o modal de detalhes do anuncio
   */
  function handleCloseAdModal() {
    setIsAdModalOpen(false);
    setSelectedAd(null);
  }

  // Filtrar anuncios pelo adset selecionado
  const filteredAds = selectedAdSetId
    ? ads.filter(ad => ad.adset_id === selectedAdSetId)
    : ads;

  /**
   * Retorna cor e label do status
   */
  function getStatusInfo(status: string): { color: string; label: string } {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'ACTIVE':
        return { color: 'bg-green-100 text-green-700', label: 'Ativa' };
      case 'PAUSED':
        return { color: 'bg-yellow-100 text-yellow-700', label: 'Pausada' };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: status };
    }
  }

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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dados de Campanhas
              </h1>
              <p className="text-gray-500 mt-1">
                Selecione uma campanha para visualizar seus dados detalhados
              </p>
            </div>
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

  const statusInfo = getStatusInfo(selectedCampaign.status);

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCampaign.campaign_name}
              </h1>
              <span className={`
                inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium
                ${selectedCampaign.platform.toLowerCase() === 'meta'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
                }
              `}>
                {selectedCampaign.platform === 'Meta' ? 'Meta Ads' : selectedCampaign.platform}
              </span>
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              ID: {selectedCampaign.campaign_id}
            </p>
          </div>
        </div>

        {/* Botao de atualizar */}
        <button
          onClick={loadCampaignData}
          disabled={loadingData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-700">Atualizar</span>
        </button>
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
            color="bg-emerald-500"
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
            color="bg-teal-500"
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

            {/* Tab: Anuncios (com suporte a clique para detalhes) */}
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
                  onSelectAd={handleSelectAd}
                  getCreative={getCreative}
                  getLoadingState={getLoadingState}
                />
              </Card>
            )}

            {/* Tab: Graficos */}
            {activeTab === 'charts' && (
              <CampaignTrendCharts
                campaignId={selectedCampaign.campaign_id}
                dataSetId=""
                adSets={adSets}
              />
            )}
          </>
        )}
      </div>

      {/* Modal de detalhes do anuncio */}
      {selectedAd && (
        <AdDetailModal
          isOpen={isAdModalOpen}
          onClose={handleCloseAdModal}
          adData={{
            ad_id: selectedAd.ad_id,
            entity_name: selectedAd.ad_name,
            meta_ad_account_id: selectedAd.meta_ad_account_id || '',
            status: selectedAd.status,
            campaign_name: selectedCampaign.campaign_name,
            adset_name: selectedAd.adset_name,
          }}
          preloadedCreative={getCreative(selectedAd.ad_id)}
        />
      )}
    </div>
  );
}
