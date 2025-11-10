import React, { useState, useEffect } from 'react';
import {
  Target,
  Filter,
  Search,
  Grid3x3,
  List,
  RefreshCw,
  AlertCircle,
  Download,
  TrendingUp,
  DollarSign,
  Eye
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CampaignCard } from './CampaignCard';
import { CampaignDataService, CampaignWithMetrics } from '../../lib/services/CampaignDataService';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/utils/logger';
import { useDebounce } from '../../hooks/useDebounce';

interface CampaignsPageProps {
  onNavigateToAnalysis: (campaignId: string) => void;
}

/**
 * Página principal de visualização de campanhas
 *
 * Exibe todas as campanhas sincronizadas em um layout de cards
 * com filtros, busca e ordenação
 *
 * Features:
 * - Grid responsivo de cards de campanhas
 * - Filtros por plataforma, status e período
 * - Busca em tempo real por nome
 * - Ordenação por múltiplos critérios
 * - Estatísticas gerais no topo
 * - Estados de loading e erro
 */
export const CampaignsPage: React.FC<CampaignsPageProps> = ({ onNavigateToAnalysis }) => {
  // Estado dos dados
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30'); // dias
  const [sortBy, setSortBy] = useState<string>('recent'); // recent, spend, conversions, roas

  // Estados da UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);

  // Debounce da busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const campaignService = new CampaignDataService();

  /**
   * Carrega campanhas ao montar o componente
   */
  useEffect(() => {
    loadCampaigns();
  }, [dateRange]);

  /**
   * Aplica filtros quando campanhas ou filtros mudam
   */
  useEffect(() => {
    applyFilters();
  }, [campaigns, debouncedSearchTerm, selectedPlatform, selectedStatus, sortBy]);

  /**
   * Busca campanhas do usuário
   */
  const loadCampaigns = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      logger.info('Carregando campanhas do usuário');

      // Calcula período
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange));
      const dateTo = new Date();

      // Busca campanhas
      const campaignsData = await campaignService.fetchUserCampaigns(user.id, {
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
      });

      setCampaigns(campaignsData);
      logger.info('Campanhas carregadas', { count: campaignsData.length });

    } catch (err: any) {
      logger.error('Erro ao carregar campanhas', err);
      setError(err.message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Aplica filtros e ordenação às campanhas
   */
  const applyFilters = () => {
    let filtered = [...campaigns];

    // Filtro por plataforma
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(c => c.platform.toLowerCase() === selectedPlatform.toLowerCase());
    }

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status.toUpperCase() === selectedStatus.toUpperCase());
    }

    // Filtro por busca
    if (debouncedSearchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case 'spend':
          return b.metrics.spend - a.metrics.spend;
        case 'conversions':
          return b.metrics.conversions - a.metrics.conversions;
        case 'roas':
          return b.metrics.roas - a.metrics.roas;
        case 'ctr':
          return b.metrics.ctr - a.metrics.ctr;
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  };

  /**
   * Calcula estatísticas gerais
   */
  const getStats = () => {
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status.toUpperCase() === 'ACTIVE').length,
      totalSpend: campaigns.reduce((sum, c) => sum + c.metrics.spend, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + c.metrics.impressions, 0),
      avgRoas: campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + c.metrics.roas, 0) / campaigns.length
        : 0,
    };
  };

  const stats = getStats();

  /**
   * Retorna lista de plataformas únicas
   */
  const getUniquePlatforms = (): string[] => {
    const platforms = campaigns.map(c => c.platform);
    return Array.from(new Set(platforms));
  };

  /**
   * Formata valores monetários
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
   * Formata números grandes de forma compacta
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-gray-600">Visualize e analise todas as suas campanhas sincronizadas</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadCampaigns}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">Total de Campanhas</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.active} ativas</p>
            </div>
            <Target className="h-10 w-10 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium mb-1">Impressões</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatCompactNumber(stats.totalImpressions)}
              </p>
              <p className="text-xs text-purple-600 mt-1">nos últimos {dateRange} dias</p>
            </div>
            <Eye className="h-10 w-10 text-purple-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium mb-1">Gasto Total</p>
              <p className="text-3xl font-bold text-orange-900">
                {formatCurrency(stats.totalSpend)}
              </p>
              <p className="text-xs text-orange-600 mt-1">investido</p>
            </div>
            <DollarSign className="h-10 w-10 text-orange-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">Conversões</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCompactNumber(stats.totalConversions)}
              </p>
              <p className="text-xs text-green-600 mt-1">total</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700 font-medium mb-1">ROAS Médio</p>
              <p className="text-3xl font-bold text-indigo-900">
                {stats.avgRoas.toFixed(2)}x
              </p>
              <p className="text-xs text-indigo-600 mt-1">retorno sobre investimento</p>
            </div>
            <TrendingUp className="h-10 w-10 text-indigo-600 opacity-50" />
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

            {/* Filtro por plataforma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plataforma
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas</option>
                {getUniquePlatforms().map(platform => (
                  <option key={platform} value={platform.toLowerCase()}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
                <option value="ENDED">Finalizada</option>
              </select>
            </div>

            {/* Ordenação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="recent">Mais recente</option>
                <option value="spend">Maior gasto</option>
                <option value="conversions">Mais conversões</option>
                <option value="roas">Melhor ROAS</option>
                <option value="ctr">Melhor CTR</option>
              </select>
            </div>
          </div>

          {/* Filtros aplicados */}
          {(selectedPlatform !== 'all' || selectedStatus !== 'all' || searchTerm) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filtros aplicados:</span>
              {selectedPlatform !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedPlatform}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {selectedStatus}
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  "{searchTerm}"
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPlatform('all');
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

      {/* Grid de campanhas */}
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

      {filteredCampaigns.length === 0 ? (
        <Card className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-600 mb-4">
            {campaigns.length === 0
              ? 'Você ainda não possui campanhas sincronizadas. Conecte suas contas de anúncios para começar.'
              : 'Nenhuma campanha corresponde aos filtros selecionados. Tente ajustar os filtros.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Exibindo <span className="font-medium">{filteredCampaigns.length}</span> de{' '}
              <span className="font-medium">{campaigns.length}</span> campanhas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onViewAnalysis={onNavigateToAnalysis}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
