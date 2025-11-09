import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Activity,
  Filter,
  X
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MetaAdsService } from '../../lib/connectors/meta/MetaAdsService';
import { logger } from '../../lib/utils/logger';

interface MetaCampaignDetailsProps {
  accountId: string;
  accountName: string;
  connectionId: string;
  onClose?: () => void;
}

type ViewLevel = 'campaigns' | 'adsets' | 'ads';
type StatusFilter = 'all' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

/**
 * Componente para visualização detalhada de campanhas Meta
 *
 * Exibe hierarquia navegável:
 * - Campanhas -> Ad Sets -> Anúncios
 *
 * Cada nível mostra:
 * - Nome e status
 * - Métricas principais (impressões, cliques, gasto, conversões)
 * - Budget e performance
 */
export const MetaCampaignDetails: React.FC<MetaCampaignDetailsProps> = ({
  accountId,
  accountName,
  connectionId,
  onClose
}) => {
  // Estados para dados
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<Record<string, any[]>>({});
  const [ads, setAds] = useState<Record<string, any[]>>({});

  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  // Estados de filtro
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Carrega campanhas da conta ao montar componente
   */
  useEffect(() => {
    loadCampaigns();
  }, [accountId]);

  /**
   * Busca todas as campanhas da conta
   */
  const loadCampaigns = async () => {
    setLoading(true);
    setError('');

    try {
      logger.info('Carregando campanhas da conta', { accountId });

      const metaService = new MetaAdsService();
      const campaignsList = await metaService.getCampaigns(connectionId, accountId);

      logger.info('Campanhas carregadas', { count: campaignsList.length });
      setCampaigns(campaignsList);

    } catch (err: any) {
      logger.error('Erro ao carregar campanhas', err);
      setError(err.message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carrega ad sets de uma campanha quando expandida
   */
  const loadAdSets = async (campaignId: string) => {
    // Se já carregou antes, apenas expande
    if (adSets[campaignId]) {
      toggleCampaignExpansion(campaignId);
      return;
    }

    try {
      logger.info('Carregando ad sets da campanha', { campaignId });

      const metaService = new MetaAdsService();
      const adSetsList = await metaService.getAdSets(connectionId, campaignId);

      logger.info('Ad sets carregados', { campaignId, count: adSetsList.length });

      setAdSets(prev => ({
        ...prev,
        [campaignId]: adSetsList
      }));

      // Expande a campanha
      setExpandedCampaigns(prev => new Set(prev).add(campaignId));

    } catch (err: any) {
      logger.error('Erro ao carregar ad sets', err);
      setError(err.message || 'Erro ao carregar ad sets');
    }
  };

  /**
   * Carrega anúncios de um ad set quando expandido
   */
  const loadAds = async (adSetId: string) => {
    // Se já carregou antes, apenas expande
    if (ads[adSetId]) {
      toggleAdSetExpansion(adSetId);
      return;
    }

    try {
      logger.info('Carregando anúncios do ad set', { adSetId });

      const metaService = new MetaAdsService();
      const adsList = await metaService.getAds(connectionId, adSetId);

      logger.info('Anúncios carregados', { adSetId, count: adsList.length });

      setAds(prev => ({
        ...prev,
        [adSetId]: adsList
      }));

      // Expande o ad set
      setExpandedAdSets(prev => new Set(prev).add(adSetId));

    } catch (err: any) {
      logger.error('Erro ao carregar anúncios', err);
      setError(err.message || 'Erro ao carregar anúncios');
    }
  };

  /**
   * Alterna expansão de uma campanha
   */
  const toggleCampaignExpansion = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  /**
   * Alterna expansão de um ad set
   */
  const toggleAdSetExpansion = (adSetId: string) => {
    setExpandedAdSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adSetId)) {
        newSet.delete(adSetId);
      } else {
        newSet.add(adSetId);
      }
      return newSet;
    });
  };

  /**
   * Retorna badge de status com cores apropriadas
   */
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
      ACTIVE: { label: 'Ativo', variant: 'success' },
      PAUSED: { label: 'Pausado', variant: 'warning' },
      ARCHIVED: { label: 'Arquivado', variant: 'error' },
      DELETED: { label: 'Deletado', variant: 'error' },
      PENDING: { label: 'Pendente', variant: 'info' },
    };

    const config = statusMap[status] || { label: status, variant: 'info' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Formata valores monetários
   */
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formata números grandes
   */
  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  /**
   * Filtra campanhas baseado em status e busca
   */
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  /**
   * Renderiza métricas resumidas de uma campanha
   */
  const renderCampaignMetrics = (campaign: any) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
      <div className="flex items-center space-x-2 text-sm">
        <DollarSign className="h-4 w-4 text-green-600" />
        <div>
          <p className="text-gray-500 text-xs">Orçamento Diário</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(campaign.dailyBudget)}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm">
        <Target className="h-4 w-4 text-blue-600" />
        <div>
          <p className="text-gray-500 text-xs">Objetivo</p>
          <p className="font-semibold text-gray-900">
            {campaign.objective || 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm">
        <Activity className="h-4 w-4 text-purple-600" />
        <div>
          <p className="text-gray-500 text-xs">Tipo de Compra</p>
          <p className="font-semibold text-gray-900">
            {campaign.buyingType || 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm">
        <DollarSign className="h-4 w-4 text-orange-600" />
        <div>
          <p className="text-gray-500 text-xs">Orçamento Restante</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(campaign.budgetRemaining)}
          </p>
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza métricas de um ad set
   */
  const renderAdSetMetrics = (adSet: any) => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
      <div className="flex items-center space-x-2 text-sm">
        <DollarSign className="h-4 w-4 text-green-600" />
        <div>
          <p className="text-gray-500 text-xs">Orçamento Diário</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(adSet.dailyBudget)}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm">
        <Target className="h-4 w-4 text-blue-600" />
        <div>
          <p className="text-gray-500 text-xs">Meta de Otimização</p>
          <p className="font-semibold text-gray-900 text-xs">
            {adSet.optimizationGoal || 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm">
        <Activity className="h-4 w-4 text-purple-600" />
        <div>
          <p className="text-gray-500 text-xs">Evento de Cobrança</p>
          <p className="font-semibold text-gray-900">
            {adSet.billingEvent || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza detalhes de um anúncio
   */
  const renderAdDetails = (ad: any) => (
    <div className="flex items-start space-x-4 mt-3">
      {/* Thumbnail do anúncio */}
      {ad.thumbnailUrl && (
        <img
          src={ad.thumbnailUrl}
          alt={ad.name}
          className="w-24 h-24 object-cover rounded-lg"
        />
      )}

      {/* Informações do anúncio */}
      <div className="flex-1 space-y-2">
        {ad.headline && (
          <div>
            <p className="text-xs text-gray-500">Título</p>
            <p className="text-sm font-medium text-gray-900">{ad.headline}</p>
          </div>
        )}
        {ad.description && (
          <div>
            <p className="text-xs text-gray-500">Descrição</p>
            <p className="text-sm text-gray-700">{ad.description}</p>
          </div>
        )}
        {ad.callToAction && (
          <div>
            <p className="text-xs text-gray-500">Call to Action</p>
            <Badge variant="info">{ad.callToAction}</Badge>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="ml-4 text-gray-600">Carregando campanhas...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{accountName}</h2>
            <p className="text-sm text-gray-600">ID: {accountId}</p>
          </div>
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />

          {/* Filtro de status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="PAUSED">Pausados</option>
            <option value="ARCHIVED">Arquivados</option>
          </select>
        </div>

        {/* Contador */}
        <p className="mt-3 text-sm text-gray-600">
          Exibindo <strong>{filteredCampaigns.length}</strong> de <strong>{campaigns.length}</strong> campanhas
        </p>
      </Card>

      {/* Lista de campanhas */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            Nenhuma campanha encontrada
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              {/* Cabeçalho da campanha */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => loadAdSets(campaign.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {expandedCampaigns.has(campaign.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>

                    {/* Métricas da campanha */}
                    {renderCampaignMetrics(campaign)}
                  </div>
                </div>
              </div>

              {/* Ad Sets da campanha (expandido) */}
              {expandedCampaigns.has(campaign.id) && adSets[campaign.id] && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {adSets[campaign.id].length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      Nenhum ad set encontrado nesta campanha
                    </div>
                  ) : (
                    adSets[campaign.id].map((adSet) => (
                      <div key={adSet.id} className="border-b border-gray-200 last:border-b-0">
                        {/* Cabeçalho do ad set */}
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => loadAds(adSet.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 ml-8">
                                {expandedAdSets.has(adSet.id) ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                                <h4 className="font-medium text-gray-900 text-sm">{adSet.name}</h4>
                                {getStatusBadge(adSet.status)}
                              </div>

                              {/* Métricas do ad set */}
                              <div className="ml-8">
                                {renderAdSetMetrics(adSet)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Anúncios do ad set (expandido) */}
                        {expandedAdSets.has(adSet.id) && ads[adSet.id] && (
                          <div className="bg-white">
                            {ads[adSet.id].length === 0 ? (
                              <div className="p-4 ml-16 text-sm text-gray-500">
                                Nenhum anúncio encontrado neste ad set
                              </div>
                            ) : (
                              ads[adSet.id].map((ad) => (
                                <div key={ad.id} className="p-4 ml-16 border-t border-gray-100">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h5 className="font-medium text-gray-900 text-sm">{ad.name}</h5>
                                    {getStatusBadge(ad.status)}
                                  </div>
                                  {renderAdDetails(ad)}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
        </Card>
      )}
    </div>
  );
};
