import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  Target,
  DollarSign,
  Eye,
  MousePointer,
  Download,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para campanha com metricas
interface CampaignWithMetrics {
  id: string;
  name: string;
  status: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

// Interface para adset expandido
interface AdSetWithMetrics {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

// Props do componente
interface ClientPortalCampaignsProps {
  clientId: string;
}

// Opcoes de periodo
const periodOptions = [
  { value: 7, label: 'Ultimos 7 dias' },
  { value: 14, label: 'Ultimos 14 dias' },
  { value: 30, label: 'Ultimos 30 dias' },
  { value: 90, label: 'Ultimos 90 dias' },
];

// Componente de listagem de campanhas do portal do cliente
export function ClientPortalCampaigns({ clientId }: ClientPortalCampaignsProps) {
  // Estados
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodDays, setPeriodDays] = useState(30);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [adSets, setAdSets] = useState<Record<string, AdSetWithMetrics[]>>({});
  const [loadingAdSets, setLoadingAdSets] = useState<string | null>(null);

  // Carrega campanhas ao montar e quando periodo muda
  useEffect(() => {
    loadCampaigns();
  }, [clientId, periodDays]);

  // Filtra campanhas quando busca ou filtro muda
  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter]);

  // Funcao para carregar campanhas com metricas
  const loadCampaigns = async () => {
    try {
      setLoading(true);

      const startDate = format(subDays(new Date(), periodDays), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Busca campanhas do cliente
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, status, objective')
        .eq('client_id', clientId)
        .order('name');

      if (campaignsError) {
        console.error('Erro ao buscar campanhas:', campaignsError);
        return;
      }

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        return;
      }

      // Busca metricas para cada campanha
      const campaignsWithMetrics = await Promise.all(
        campaignsData.map(async (campaign) => {
          const { data: metricsData } = await supabase
            .from('meta_insights_daily')
            .select('spend, impressions, clicks, reach, ctr, cpc, cpm')
            .eq('entity_id', campaign.id)
            .eq('level', 'campaign')
            .gte('date', startDate)
            .lte('date', endDate);

          const totals = metricsData?.reduce((acc, row) => ({
            spend: acc.spend + (Number(row.spend) || 0),
            impressions: acc.impressions + (Number(row.impressions) || 0),
            clicks: acc.clicks + (Number(row.clicks) || 0),
            reach: acc.reach + (Number(row.reach) || 0),
            sumCtr: acc.sumCtr + (Number(row.ctr) || 0),
            sumCpc: acc.sumCpc + (Number(row.cpc) || 0),
            sumCpm: acc.sumCpm + (Number(row.cpm) || 0),
            count: acc.count + 1
          }), {
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
            sumCtr: 0,
            sumCpc: 0,
            sumCpm: 0,
            count: 0
          }) || {
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
            sumCtr: 0,
            sumCpc: 0,
            sumCpm: 0,
            count: 0
          };

          return {
            ...campaign,
            spend: totals.spend,
            impressions: totals.impressions,
            clicks: totals.clicks,
            reach: totals.reach,
            ctr: totals.count > 0 ? totals.sumCtr / totals.count : 0,
            cpc: totals.count > 0 ? totals.sumCpc / totals.count : 0,
            cpm: totals.count > 0 ? totals.sumCpm / totals.count : 0
          };
        })
      );

      setCampaigns(campaignsWithMetrics.sort((a, b) => b.spend - a.spend));
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funcao para filtrar campanhas
  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  };

  // Funcao para expandir campanha e carregar adsets
  const handleExpandCampaign = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }

    setExpandedCampaign(campaignId);

    // Se ja carregou os adsets, nao carrega novamente
    if (adSets[campaignId]) return;

    try {
      setLoadingAdSets(campaignId);

      const startDate = format(subDays(new Date(), periodDays), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Busca adsets da campanha
      const { data: adSetsData } = await supabase
        .from('ad_sets')
        .select('id, name, status')
        .eq('campaign_id', campaignId)
        .eq('client_id', clientId);

      if (!adSetsData || adSetsData.length === 0) {
        setAdSets(prev => ({ ...prev, [campaignId]: [] }));
        return;
      }

      // Busca metricas para cada adset
      const adSetsWithMetrics = await Promise.all(
        adSetsData.map(async (adSet) => {
          const { data: metricsData } = await supabase
            .from('meta_insights_daily')
            .select('spend, impressions, clicks, ctr')
            .eq('entity_id', adSet.id)
            .eq('level', 'adset')
            .gte('date', startDate)
            .lte('date', endDate);

          const totals = metricsData?.reduce((acc, row) => ({
            spend: acc.spend + (Number(row.spend) || 0),
            impressions: acc.impressions + (Number(row.impressions) || 0),
            clicks: acc.clicks + (Number(row.clicks) || 0),
            sumCtr: acc.sumCtr + (Number(row.ctr) || 0),
            count: acc.count + 1
          }), { spend: 0, impressions: 0, clicks: 0, sumCtr: 0, count: 0 }) || {
            spend: 0,
            impressions: 0,
            clicks: 0,
            sumCtr: 0,
            count: 0
          };

          return {
            ...adSet,
            spend: totals.spend,
            impressions: totals.impressions,
            clicks: totals.clicks,
            ctr: totals.count > 0 ? totals.sumCtr / totals.count : 0
          };
        })
      );

      setAdSets(prev => ({
        ...prev,
        [campaignId]: adSetsWithMetrics.sort((a, b) => b.spend - a.spend)
      }));
    } catch (err) {
      console.error('Erro ao carregar adsets:', err);
    } finally {
      setLoadingAdSets(null);
    }
  };

  // Funcao para exportar dados em CSV
  const handleExport = () => {
    const headers = ['Campanha', 'Status', 'Objetivo', 'Investimento', 'Impressoes', 'Cliques', 'Alcance', 'CTR', 'CPC', 'CPM'];
    const rows = filteredCampaigns.map(c => [
      c.name,
      c.status,
      c.objective || '-',
      c.spend.toFixed(2),
      c.impressions,
      c.clicks,
      c.reach,
      c.ctr.toFixed(2),
      c.cpc.toFixed(2),
      c.cpm.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanhas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formata valores monetarios
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formata numeros grandes
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Retorna cor do badge de status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Retorna label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativa';
      case 'PAUSED':
        return 'Pausada';
      case 'ARCHIVED':
        return 'Arquivada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campanhas</h2>
          <p className="text-gray-600">
            {filteredCampaigns.length} campanha{filteredCampaigns.length !== 1 ? 's' : ''} encontrada{filteredCampaigns.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de periodo */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{periodOptions.find(p => p.value === periodDays)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showPeriodDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {periodOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPeriodDays(option.value);
                      setShowPeriodDropdown(false);
                      setAdSets({}); // Limpa cache de adsets
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      periodDays === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleExport} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro de status */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="PAUSED">Pausadas</option>
              <option value="ARCHIVED">Arquivadas</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de campanhas */}
      {filteredCampaigns.length > 0 ? (
        <div className="space-y-4">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="overflow-hidden">
              {/* Header da campanha */}
              <button
                onClick={() => handleExpandCampaign(campaign.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">
                      {campaign.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(campaign.status)}`}>
                        {getStatusLabel(campaign.status)}
                      </span>
                      {campaign.objective && (
                        <span className="text-xs text-gray-500">
                          {campaign.objective}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Metricas resumidas */}
                  <div className="hidden md:flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-gray-500">Investimento</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(campaign.spend)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Impressoes</p>
                      <p className="font-semibold text-gray-900">
                        {formatNumber(campaign.impressions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cliques</p>
                      <p className="font-semibold text-gray-900">
                        {formatNumber(campaign.clicks)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">CTR</p>
                      <p className="font-semibold text-gray-900">
                        {campaign.ctr.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {expandedCampaign === campaign.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Conteudo expandido - AdSets */}
              {expandedCampaign === campaign.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  {/* Metricas mobile */}
                  <div className="md:hidden grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Investimento</p>
                      <p className="font-semibold">{formatCurrency(campaign.spend)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Impressoes</p>
                      <p className="font-semibold">{formatNumber(campaign.impressions)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Cliques</p>
                      <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500">CTR</p>
                      <p className="font-semibold">{campaign.ctr.toFixed(2)}%</p>
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-700 mb-3">Conjuntos de Anuncios</h4>

                  {loadingAdSets === campaign.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : adSets[campaign.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {adSets[campaign.id].map(adSet => (
                        <div
                          key={adSet.id}
                          className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                              <Target className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{adSet.name}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(adSet.status)}`}>
                                {getStatusLabel(adSet.status)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Investimento</p>
                              <p className="font-medium">{formatCurrency(adSet.spend)}</p>
                            </div>
                            <div className="hidden sm:block">
                              <p className="text-xs text-gray-500">Impressoes</p>
                              <p className="font-medium">{formatNumber(adSet.impressions)}</p>
                            </div>
                            <div className="hidden sm:block">
                              <p className="text-xs text-gray-500">Cliques</p>
                              <p className="font-medium">{formatNumber(adSet.clicks)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">CTR</p>
                              <p className="font-medium">{adSet.ctr.toFixed(2)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Nenhum conjunto de anuncios encontrado
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Nao ha campanhas vinculadas a este cliente'}
          </p>
        </Card>
      )}
    </div>
  );
}
