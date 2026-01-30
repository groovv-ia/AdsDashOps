/**
 * GoogleCampaignsPage
 *
 * Pagina principal de visualizacao de campanhas do Google Ads.
 * Exibe campanhas sincronizadas com metricas agregadas.
 *
 * Features:
 * - Grid responsivo de cards de campanhas
 * - Filtros por conta, status e periodo
 * - Busca em tempo real por nome
 * - Ordenacao por multiplos criterios
 * - Estatisticas gerais no topo
 * - Navegacao para detalhes da campanha
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Percent,
  Target,
  AlertCircle,
  ChevronDown,
  ArrowUpDown,
  BarChart3,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GoogleCampaignCard } from './GoogleCampaignCard';
import {
  GoogleInsightsDataService,
  GoogleCampaignWithMetrics,
  GoogleMetricsSummary,
} from '../../lib/services/GoogleInsightsDataService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useDebounce } from '../../hooks/useDebounce';

interface GoogleCampaignsPageProps {
  onNavigateToCampaignDetail: (campaignId: string) => void;
  onNavigateBack?: () => void;
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

// Opcoes de ordenacao
const SORT_OPTIONS = [
  { label: 'Maior Gasto', value: 'cost_desc' },
  { label: 'Menor Gasto', value: 'cost_asc' },
  { label: 'Mais Impressoes', value: 'impressions_desc' },
  { label: 'Mais Cliques', value: 'clicks_desc' },
  { label: 'Melhor CTR', value: 'ctr_desc' },
  { label: 'Melhor ROAS', value: 'roas_desc' },
  { label: 'Mais Conversoes', value: 'conversions_desc' },
  { label: 'Nome (A-Z)', value: 'name_asc' },
];

export const GoogleCampaignsPage: React.FC<GoogleCampaignsPageProps> = ({
  onNavigateToCampaignDetail,
}) => {
  // Contexto do workspace
  const { currentWorkspace } = useWorkspace();

  // Estado dos dados
  const [campaigns, setCampaigns] = useState<GoogleCampaignWithMetrics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<GoogleCampaignWithMetrics[]>([]);
  const [summary, setSummary] = useState<GoogleMetricsSummary | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; customer_id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_30');
  const [sortBy, setSortBy] = useState<string>('cost_desc');

  // Estados da UI
  const [showFilters, setShowFilters] = useState(true);

  // Debounce da busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Servico de dados
  const dataService = new GoogleInsightsDataService();

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
      dateFrom = new Date(today);
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
   * Carrega dados das campanhas
   */
  const loadData = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError('');

    try {
      dataService.setWorkspace(currentWorkspace.id);

      // Carrega contas
      const accountsData = await dataService.getAccounts();
      setAccounts(accountsData);

      // Carrega campanhas com metricas
      const { dateFrom, dateTo } = getDateRange();
      const accountIds = selectedAccount !== 'all' ? [selectedAccount] : undefined;

      const campaignsData = await dataService.getCampaignsWithMetrics(
        dateFrom,
        dateTo,
        {
          accountIds,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
        }
      );

      setCampaigns(campaignsData);

      // Carrega resumo
      const summaryData = await dataService.getMetricsSummary(dateFrom, dateTo, accountIds);
      setSummary(summaryData);
    } catch (err) {
      console.error('[GoogleCampaignsPage] Erro ao carregar dados:', err);
      setError('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, selectedAccount, selectedStatus, selectedPeriod, getDateRange]);

  // Carrega dados ao montar e quando filtros mudam
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtra e ordena campanhas
  useEffect(() => {
    let filtered = [...campaigns];

    // Filtro de busca
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchLower)
      );
    }

    // Ordenacao
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'cost_desc':
          return b.cost - a.cost;
        case 'cost_asc':
          return a.cost - b.cost;
        case 'impressions_desc':
          return b.impressions - a.impressions;
        case 'clicks_desc':
          return b.clicks - a.clicks;
        case 'ctr_desc':
          return b.ctr - a.ctr;
        case 'roas_desc':
          return b.roas - a.roas;
        case 'conversions_desc':
          return b.conversions - a.conversions;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return b.cost - a.cost;
      }
    });

    setFilteredCampaigns(filtered);
  }, [campaigns, debouncedSearchTerm, sortBy]);

  /**
   * Formata valores monetarios
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  /**
   * Formata numeros grandes
   */
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  // Renderiza estado vazio
  if (!loading && campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Campanhas Google Ads</h1>
            <p className="text-slate-500 mt-1">Visualize e analise suas campanhas</p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma campanha encontrada
            </h3>
            <p className="text-slate-500 mb-6">
              Sincronize suas contas do Google Ads para visualizar campanhas e metricas aqui.
            </p>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('changePage', { detail: { page: 'google-sync' } }))}
              variant="primary"
            >
              Ir para Sincronizacao
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campanhas Google Ads</h1>
          <p className="text-slate-500 mt-1">
            {filteredCampaigns.length} campanha{filteredCampaigns.length !== 1 ? 's' : ''} encontrada{filteredCampaigns.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Resumo de Metricas */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Impressoes</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(summary.totalImpressions)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MousePointer className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cliques</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(summary.totalClicks)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Investimento</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(summary.totalCost)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Conversoes</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(summary.totalConversions)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Percent className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">CTR Medio</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summary.avgCtr.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">ROAS Medio</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summary.avgRoas.toFixed(2)}x
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Conta */}
            <div>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as contas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os status</option>
                <option value="ENABLED">Ativas</option>
                <option value="PAUSED">Pausadas</option>
                <option value="REMOVED">Removidas</option>
              </select>
            </div>

            {/* Periodo */}
            <div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ordenacao */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Grid de Campanhas */}
      {!loading && filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <GoogleCampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => onNavigateToCampaignDetail(campaign.campaign_id)}
            />
          ))}
        </div>
      )}

      {/* Sem resultados da busca */}
      {!loading && campaigns.length > 0 && filteredCampaigns.length === 0 && (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-slate-500">
            Tente ajustar os filtros ou o termo de busca
          </p>
        </Card>
      )}
    </div>
  );
};
