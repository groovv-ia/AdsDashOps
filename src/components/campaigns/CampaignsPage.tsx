/**
 * CampaignsPage
 *
 * Pagina principal de visualizacao de campanhas.
 * Integra dados do Meta Ads Sync para exibir campanhas com metricas reais.
 *
 * Features:
 * - Grid responsivo de cards de campanhas
 * - Filtros por plataforma, status e periodo
 * - Busca em tempo real por nome
 * - Ordenacao por multiplos criterios
 * - Estatisticas gerais no topo
 * - Integracao com Meta Insights Daily
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Eye,
  Database,
  Calendar,
  MousePointer,
  Percent,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CampaignCard } from './CampaignCard';
import { CampaignWithMetrics } from '../../lib/services/CampaignDataService';
import {
  MetaInsightsDataService,
  MetaCampaignData,
} from '../../lib/services/MetaInsightsDataService';
import { useClient } from '../../contexts/ClientContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useDebounce } from '../../hooks/useDebounce';
import { logger } from '../../lib/utils/logger';

interface CampaignsPageProps {
  onNavigateToAnalysis: (campaignId: string) => void;
  onNavigateToExtractedData?: () => void;
}

// Periodos pre-definidos
const DATE_PRESETS = [
  { label: 'Hoje', value: 'today', days: 0 },
  { label: 'Ultimos 7 dias', value: 'last_7', days: 7 },
  { label: 'Ultimos 14 dias', value: 'last_14', days: 14 },
  { label: 'Ultimos 30 dias', value: 'last_30', days: 30 },
  { label: 'Este mes', value: 'this_month', days: -1 },
  { label: 'Ultimos 90 dias', value: 'last_90', days: 90 },
];

export const CampaignsPage: React.FC<CampaignsPageProps> = ({
  onNavigateToAnalysis,
  onNavigateToExtractedData,
}) => {
  // Contextos do workspace e cliente selecionados
  const { currentWorkspace } = useWorkspace();
  const { selectedClient } = useClient();

  // Estado dos dados
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_30');
  const [sortBy, setSortBy] = useState<string>('spend');

  // Estados da UI
  const [showFilters, setShowFilters] = useState(true);

  // Debounce da busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Servico de dados
  const metaInsightsService = new MetaInsightsDataService();

  /**
   * Calcula datas baseado no preset selecionado
   */
  const getDateRange = useCallback(() => {
    const today = new Date();
    let dateFrom: Date;
    const dateTo: Date = today;

    const preset = DATE_PRESETS.find((p) => p.value === selectedPeriod);
    if (!preset) {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
    } else if (preset.value === 'today') {
      dateFrom = new Date();
    } else if (preset.value === 'this_month') {
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - preset.days);
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  /**
   * Carrega campanhas do Meta Insights
   */
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Carregando campanhas do Meta Insights');

      const { dateFrom, dateTo } = getDateRange();

      // Busca campanhas do Meta Insights passando workspace_id explicitamente
      const metaCampaigns = await metaInsightsService.fetchCampaignsWithMetrics({
        workspaceId: currentWorkspace?.id,
        clientId: selectedClient?.id,
        dateFrom,
        dateTo,
      });

      // Converte para formato CampaignWithMetrics
      const mappedCampaigns: CampaignWithMetrics[] = metaCampaigns.map((mc: MetaCampaignData) => ({
        id: mc.entity_id,
        name: mc.entity_name,
        platform: 'Meta',
        status: mc.status || 'UNKNOWN',
        objective: mc.objective || 'CONVERSIONS',
        connection_id: '',
        user_id: '',
        created_date: mc.first_date,
        start_date: mc.first_date,
        end_date: mc.last_date,
        daily_budget: mc.daily_budget,
        lifetime_budget: mc.lifetime_budget,
        meta_entity_id: mc.entity_id,
        meta_ad_account_id: mc.meta_ad_account_id,
        metrics: {
          impressions: mc.metrics.impressions,
          clicks: mc.metrics.clicks,
          spend: mc.metrics.spend,
          conversions: mc.metrics.conversions,
          reach: mc.metrics.reach,
          frequency: mc.metrics.frequency,
          ctr: mc.metrics.ctr,
          cpc: mc.metrics.cpc,
          cpm: mc.metrics.cpm,
          roas: mc.metrics.roas,
          cost_per_result: mc.metrics.cost_per_result,
          conversion_value: mc.metrics.conversion_value,
        },
        total_ad_sets: 0,
        total_ads: 0,
        last_sync: mc.last_date,
        days_active: mc.days_with_data,
        data_source: 'meta_insights',
      }));

      setCampaigns(mappedCampaigns);
      logger.info('Campanhas carregadas', { count: mappedCampaigns.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar campanhas';
      logger.error('Erro ao carregar campanhas', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, selectedClient, getDateRange]);

  /**
   * Carrega campanhas ao montar e quando filtros mudam
   */
  useEffect(() => {
    loadCampaigns();
  }, [selectedPeriod, selectedClient, currentWorkspace]);

  /**
   * Aplica filtros quando campanhas ou filtros mudam
   */
  useEffect(() => {
    applyFilters();
  }, [campaigns, debouncedSearchTerm, selectedStatus, sortBy]);

  /**
   * Aplica filtros e ordenacao as campanhas
   */
  const applyFilters = () => {
    let filtered = [...campaigns];

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(
        (c) => c.status.toUpperCase() === selectedStatus.toUpperCase()
      );
    }

    // Filtro por busca
    if (debouncedSearchTerm) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Ordenacao
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (
            new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
          );
        case 'spend':
          return b.metrics.spend - a.metrics.spend;
        case 'conversions':
          return b.metrics.conversions - a.metrics.conversions;
        case 'roas':
          return b.metrics.roas - a.metrics.roas;
        case 'ctr':
          return b.metrics.ctr - a.metrics.ctr;
        case 'impressions':
          return b.metrics.impressions - a.metrics.impressions;
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  };

  /**
   * Calcula estatisticas gerais
   */
  const getStats = () => {
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status.toUpperCase() === 'ACTIVE').length,
      totalSpend: campaigns.reduce((sum, c) => sum + c.metrics.spend, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + c.metrics.impressions, 0),
      totalClicks: campaigns.reduce((sum, c) => sum + c.metrics.clicks, 0),
      avgCtr:
        campaigns.length > 0
          ? campaigns.reduce((sum, c) => sum + c.metrics.ctr, 0) / campaigns.length
          : 0,
      avgRoas:
        campaigns.length > 0
          ? campaigns.reduce((sum, c) => sum + c.metrics.roas, 0) / campaigns.length
          : 0,
    };
  };

  const stats = getStats();

  /**
   * Formata valores monetarios
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Formata numeros grandes de forma compacta
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

  // Estado de loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando campanhas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-gray-600">
              Visualize e analise todas as suas campanhas do Meta Ads
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateToExtractedData && (
            <Button variant="secondary" size="sm" onClick={onNavigateToExtractedData}>
              <Database className="h-4 w-4 mr-2" />
              Ver Dados Extraidos
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={loadCampaigns} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Estatisticas gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <div className="text-center">
            <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-blue-700 font-medium">Campanhas</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            <p className="text-xs text-blue-600">{stats.active} ativas</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <div className="text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-green-700 font-medium">Gasto Total</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(stats.totalSpend)}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <div className="text-center">
            <Eye className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-purple-700 font-medium">Impressoes</p>
            <p className="text-2xl font-bold text-purple-900">
              {formatCompactNumber(stats.totalImpressions)}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <div className="text-center">
            <MousePointer className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-xs text-orange-700 font-medium">Cliques</p>
            <p className="text-2xl font-bold text-orange-900">
              {formatCompactNumber(stats.totalClicks)}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200">
          <div className="text-center">
            <Percent className="h-6 w-6 text-teal-600 mx-auto mb-2" />
            <p className="text-xs text-teal-700 font-medium">CTR Medio</p>
            <p className="text-2xl font-bold text-teal-900">{stats.avgCtr.toFixed(2)}%</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200">
          <div className="text-center">
            <TrendingUp className="h-6 w-6 text-pink-600 mx-auto mb-2" />
            <p className="text-xs text-pink-700 font-medium">Conversoes</p>
            <p className="text-2xl font-bold text-pink-900">
              {formatCompactNumber(stats.totalConversions)}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <div className="text-center">
            <TrendingUp className="h-6 w-6 text-cyan-600 mx-auto mb-2" />
            <p className="text-xs text-cyan-700 font-medium">ROAS Medio</p>
            <p className="text-2xl font-bold text-cyan-900">{stats.avgRoas.toFixed(2)}x</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar campanha
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome da campanha..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filtro por periodo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Periodo
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
                <option value="DELETED">Removida</option>
              </select>
            </div>

            {/* Ordenacao */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="spend">Maior gasto</option>
                <option value="impressions">Mais impressoes</option>
                <option value="conversions">Mais conversoes</option>
                <option value="roas">Melhor ROAS</option>
                <option value="ctr">Melhor CTR</option>
                <option value="recent">Mais recente</option>
              </select>
            </div>
          </div>

          {/* Filtros aplicados */}
          {(selectedStatus !== 'all' || searchTerm) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filtros aplicados:</span>
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {selectedStatus}
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  "{searchTerm}"
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Erro ao carregar campanhas</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Aviso sem campanhas */}
      {!error && campaigns.length === 0 && (
        <Card className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-600 mb-4">
            Nenhuma campanha foi sincronizada para o periodo selecionado.
            Execute uma sincronizacao no Meta Ads Sync para carregar os dados.
          </p>
        </Card>
      )}

      {/* Grid de campanhas */}
      {filteredCampaigns.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Exibindo <span className="font-medium">{filteredCampaigns.length}</span> de{' '}
              <span className="font-medium">{campaigns.length}</span> campanhas
            </p>
            <p className="text-xs text-gray-500">
              Periodo: {DATE_PRESETS.find((p) => p.value === selectedPeriod)?.label}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onViewAnalysis={onNavigateToAnalysis}
              />
            ))}
          </div>
        </>
      )}

      {/* Nenhum resultado de filtro */}
      {campaigns.length > 0 && filteredCampaigns.length === 0 && (
        <Card className="text-center py-8">
          <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            Nenhuma campanha corresponde aos filtros selecionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('all');
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Limpar filtros
          </button>
        </Card>
      )}
    </div>
  );
};
