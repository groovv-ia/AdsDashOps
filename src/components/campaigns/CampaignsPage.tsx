/**
 * CampaignsPage
 *
 * Pagina principal de visualizacao de campanhas.
 * Busca dados em tempo real da Meta Ads API para exibir metricas identicas
 * ao Gerenciador de Anuncios.
 *
 * Features:
 * - Grid responsivo de cards de campanhas
 * - Filtros por plataforma, status e periodo
 * - Busca em tempo real por nome
 * - Ordenacao por multiplos criterios
 * - Estatisticas gerais no topo
 * - Metricas 100% identicas ao Gerenciador de Anuncios (via API em tempo real)
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
import {
  fetchRealTimeInsights,
  processToTotalsByEntity,
  PeriodMetrics,
} from '../../lib/services/MetaRealTimeService';
import { supabase } from '../../lib/supabase';
import { useClient } from '../../contexts/ClientContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useDebounce } from '../../hooks/useDebounce';
import { logger } from '../../lib/utils/logger';
import { useWorkspacePeriod } from '../../hooks/useWorkspacePeriod';
import { EnhancedPeriodSelector } from '../meta-admin/EnhancedPeriodSelector';

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
  const [sortBy, setSortBy] = useState<string>('spend');

  // Período de análise persistido por workspace
  const { selectedPeriod, dateRange: periodDateRange, setPeriod } = useWorkspacePeriod();

  // Estados da UI
  const [showFilters, setShowFilters] = useState(true);

  // Debounce da busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Servico de dados (fallback quando API real-time falha)
  const metaInsightsService = new MetaInsightsDataService();

  /** Retorna o dateRange do hook de periodo */
  const getDateRange = useCallback(() => periodDateRange, [periodDateRange]);

  /**
   * Busca contas Meta Ad vinculadas ao workspace atual
   */
  const fetchAdAccounts = async (workspaceId: string): Promise<Array<{ id: string; meta_ad_account_id: string; name: string }>> => {
    const { data, error } = await supabase
      .from('meta_ad_accounts')
      .select('id, meta_ad_account_id, name')
      .eq('workspace_id', workspaceId);

    if (error) {
      logger.error('Erro ao buscar contas Meta Ad', error);
      return [];
    }
    return data || [];
  };

  /**
   * Busca status e objetivo das campanhas no cache de entidades
   */
  const fetchCampaignEntities = async (
    workspaceId: string,
    entityIds: string[]
  ): Promise<Map<string, { status: string; objective?: string }>> => {
    const map = new Map<string, { status: string; objective?: string }>();
    if (entityIds.length === 0) return map;

    const { data } = await supabase
      .from('meta_entities_cache')
      .select('entity_id, effective_status, objective')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'campaign')
      .in('entity_id', entityIds);

    if (data) {
      for (const e of data) {
        map.set(e.entity_id, { status: e.effective_status || 'UNKNOWN', objective: e.objective });
      }
    }
    return map;
  };

  /**
   * Converte PeriodMetrics para CampaignWithMetrics
   */
  const mapPeriodMetricsToCampaign = (
    pm: PeriodMetrics,
    entityInfo: { status: string; objective?: string } | undefined,
    metaAdAccountId: string,
    dateFrom: string,
    dateTo: string
  ): CampaignWithMetrics => ({
    id: pm.entity_id,
    name: pm.entity_name,
    platform: 'Meta',
    status: entityInfo?.status || 'UNKNOWN',
    objective: entityInfo?.objective || 'CONVERSIONS',
    connection_id: '',
    user_id: '',
    created_date: dateFrom,
    start_date: dateFrom,
    end_date: dateTo,
    daily_budget: undefined,
    lifetime_budget: undefined,
    meta_entity_id: pm.entity_id,
    meta_ad_account_id: metaAdAccountId,
    metrics: {
      impressions: pm.impressions,
      clicks: pm.clicks,
      spend: pm.spend,
      conversions: pm.conversions,
      reach: pm.reach,
      frequency: pm.frequency,
      ctr: pm.ctr,
      cpc: pm.cpc,
      cpm: pm.cpm,
      roas: pm.roas,
      cost_per_result: pm.cost_per_result,
      conversion_value: pm.conversion_value,
    },
    total_ad_sets: 0,
    total_ads: 0,
    last_sync: dateTo,
    days_active: 0,
    data_source: 'meta_realtime',
  });

  /**
   * Carrega campanhas em tempo real da Meta API.
   * Para cada conta vinculada, chama a edge function que retorna metricas
   * identicas ao Gerenciador de Anuncios.
   * Em caso de erro, faz fallback para dados do banco (meta_insights_daily).
   */
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!currentWorkspace?.id) {
        setCampaigns([]);
        return;
      }

      const { dateFrom, dateTo } = getDateRange();
      logger.info('Carregando campanhas em tempo real da Meta API', { dateFrom, dateTo });

      // Busca todas as contas Meta do workspace
      const adAccounts = await fetchAdAccounts(currentWorkspace.id);

      if (adAccounts.length === 0) {
        setCampaigns([]);
        return;
      }

      // Busca insights em tempo real para todas as contas em paralelo
      const results = await Promise.allSettled(
        adAccounts.map(account =>
          fetchRealTimeInsights({
            meta_ad_account_id: account.meta_ad_account_id,
            level: 'campaign',
            date_from: dateFrom,
            date_to: dateTo,
            mode: 'totals',
          })
        )
      );

      // Combina resultados de todas as contas
      const allCampaignMetrics: Array<{ metrics: PeriodMetrics; accountId: string }> = [];
      let hasError = false;

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.totals.length > 0) {
          const periodMetrics = processToTotalsByEntity(result.value.totals, 'campaign');
          for (const pm of periodMetrics) {
            allCampaignMetrics.push({ metrics: pm, accountId: adAccounts[idx].meta_ad_account_id });
          }
        } else if (result.status === 'rejected') {
          hasError = true;
          logger.warn('Erro ao buscar insights da conta', { account: adAccounts[idx].name, error: result.reason });
        }
      });

      // Se nenhuma conta retornou dados, faz fallback para banco de dados
      if (allCampaignMetrics.length === 0 && hasError) {
        logger.info('Fallback: carregando campanhas do banco de dados');
        await loadCampaignsFromDatabase();
        return;
      }

      // Busca status/objetivo das campanhas
      const entityIds = allCampaignMetrics.map(c => c.metrics.entity_id);
      const entityInfoMap = await fetchCampaignEntities(currentWorkspace.id, entityIds);

      // Converte para formato CampaignWithMetrics
      const mappedCampaigns: CampaignWithMetrics[] = allCampaignMetrics.map(({ metrics, accountId }) =>
        mapPeriodMetricsToCampaign(metrics, entityInfoMap.get(metrics.entity_id), accountId, dateFrom, dateTo)
      );

      setCampaigns(mappedCampaigns);
      logger.info('Campanhas carregadas em tempo real', { count: mappedCampaigns.length });
    } catch (err) {
      logger.error('Erro ao carregar campanhas em tempo real, tentando fallback', err);
      await loadCampaignsFromDatabase();
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, selectedClient, getDateRange]);

  /**
   * Fallback: carrega campanhas do banco de dados (meta_insights_daily)
   * quando a API em tempo real falha.
   */
  const loadCampaignsFromDatabase = async () => {
    try {
      const { dateFrom, dateTo } = getDateRange();

      const metaCampaigns = await metaInsightsService.fetchCampaignsWithMetrics({
        workspaceId: currentWorkspace?.id,
        clientId: selectedClient?.id,
        dateFrom,
        dateTo,
      });

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
      setError('Usando dados do ultimo sync (API em tempo real indisponivel)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar campanhas';
      logger.error('Erro ao carregar campanhas do banco', err);
      setError(errorMessage);
    }
  };

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
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Periodo de Analise
              </label>
              <EnhancedPeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={(id, range) => setPeriod(id, range)}
                dateRange={periodDateRange}
              />
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
              Periodo: {periodDateRange.dateFrom} até {periodDateRange.dateTo}
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
