/**
 * GoogleCampaignDetailPage
 *
 * Pagina de detalhes de uma campanha do Google Ads.
 * Exibe grupos de anuncios, anuncios, keywords e graficos de evolucao.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  TrendingUp,
  Layers,
  FileText,
  Key,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Trash2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  GoogleInsightsDataService,
  GoogleCampaignWithMetrics,
  GoogleAdGroupWithMetrics,
  GoogleAdWithMetrics,
  GoogleKeywordWithMetrics,
  GoogleDailyMetric,
} from '../../lib/services/GoogleInsightsDataService';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface GoogleCampaignDetailPageProps {
  campaignId: string;
  onBack: () => void;
}

// Tabs disponiveis
type TabType = 'overview' | 'adgroups' | 'ads' | 'keywords';

// Periodos pre-definidos
const DATE_PRESETS = [
  { label: 'Ultimos 7 dias', value: 'last_7', days: 7 },
  { label: 'Ultimos 14 dias', value: 'last_14', days: 14 },
  { label: 'Ultimos 30 dias', value: 'last_30', days: 30 },
];

export const GoogleCampaignDetailPage: React.FC<GoogleCampaignDetailPageProps> = ({
  campaignId,
  onBack,
}) => {
  const { currentWorkspace } = useWorkspace();

  // Estado dos dados
  const [campaign, setCampaign] = useState<GoogleCampaignWithMetrics | null>(null);
  const [adGroups, setAdGroups] = useState<GoogleAdGroupWithMetrics[]>([]);
  const [ads, setAds] = useState<GoogleAdWithMetrics[]>([]);
  const [keywords, setKeywords] = useState<GoogleKeywordWithMetrics[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<GoogleDailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado da UI
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('last_30');
  const [expandedAdGroup, setExpandedAdGroup] = useState<string | null>(null);

  // Servico de dados
  const dataService = new GoogleInsightsDataService();

  /**
   * Calcula datas baseado no preset selecionado
   */
  const getDateRange = useCallback(() => {
    const today = new Date();
    const preset = DATE_PRESETS.find((p) => p.value === selectedPeriod);
    const days = preset?.days || 30;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  /**
   * Carrega dados da campanha
   */
  const loadData = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError('');

    try {
      dataService.setWorkspace(currentWorkspace.id);
      const { dateFrom, dateTo } = getDateRange();

      // Carrega campanha
      const campaigns = await dataService.getCampaignsWithMetrics(dateFrom, dateTo);
      const campaignData = campaigns.find((c) => c.campaign_id === campaignId);

      if (!campaignData) {
        setError('Campanha nao encontrada');
        setLoading(false);
        return;
      }

      setCampaign(campaignData);

      // Carrega ad groups
      const adGroupsData = await dataService.getAdGroupsWithMetrics(campaignId, dateFrom, dateTo);
      setAdGroups(adGroupsData);

      // Carrega metricas diarias para o grafico
      const metricsData = await dataService.getDailyMetrics(campaignId, dateFrom, dateTo);
      setDailyMetrics(metricsData);
    } catch (err) {
      console.error('[GoogleCampaignDetailPage] Erro ao carregar dados:', err);
      setError('Erro ao carregar dados da campanha');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, campaignId, selectedPeriod, getDateRange]);

  // Carrega dados ao montar
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Carrega anuncios de um ad group
   */
  const loadAdsForAdGroup = async (adGroupId: string) => {
    if (!currentWorkspace) return;

    const { dateFrom, dateTo } = getDateRange();
    dataService.setWorkspace(currentWorkspace.id);
    const adsData = await dataService.getAdsWithMetrics(adGroupId, dateFrom, dateTo);
    setAds(adsData);
  };

  /**
   * Carrega keywords de um ad group
   */
  const loadKeywordsForAdGroup = async (adGroupId: string) => {
    if (!currentWorkspace) return;

    const { dateFrom, dateTo } = getDateRange();
    dataService.setWorkspace(currentWorkspace.id);
    const keywordsData = await dataService.getKeywordsWithMetrics(adGroupId, dateFrom, dateTo);
    setKeywords(keywordsData);
  };

  /**
   * Toggle expansao de ad group
   */
  const toggleAdGroup = async (adGroupId: string) => {
    if (expandedAdGroup === adGroupId) {
      setExpandedAdGroup(null);
      setAds([]);
      setKeywords([]);
    } else {
      setExpandedAdGroup(adGroupId);
      await Promise.all([
        loadAdsForAdGroup(adGroupId),
        loadKeywordsForAdGroup(adGroupId),
      ]);
    }
  };

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

  /**
   * Retorna icone de status
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENABLED':
        return <Play className="w-3 h-3 text-emerald-600" />;
      case 'PAUSED':
        return <Pause className="w-3 h-3 text-amber-600" />;
      case 'REMOVED':
        return <Trash2 className="w-3 h-3 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Card className="p-8 text-center">
          <p className="text-red-500">{error || 'Campanha nao encontrada'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                campaign.status === 'ENABLED' ? 'bg-emerald-100 text-emerald-700' :
                campaign.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getStatusIcon(campaign.status)}
                {campaign.status}
              </span>
              <span className="text-sm text-slate-500">
                {campaign.advertising_channel_type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Impressoes</p>
              <p className="text-lg font-semibold">{formatNumber(campaign.impressions)}</p>
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
              <p className="text-lg font-semibold">{formatNumber(campaign.clicks)}</p>
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
              <p className="text-lg font-semibold">{formatCurrency(campaign.cost)}</p>
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
              <p className="text-lg font-semibold">{formatNumber(campaign.conversions)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">CTR</p>
              <p className="text-lg font-semibold">{campaign.ctr.toFixed(2)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">ROAS</p>
              <p className={`text-lg font-semibold ${campaign.roas >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                {campaign.roas.toFixed(2)}x
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Grafico de Evolucao */}
      {dailyMetrics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Evolucao de Metricas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'cost') return [formatCurrency(value), 'Investimento'];
                    if (name === 'clicks') return [formatNumber(value), 'Cliques'];
                    if (name === 'impressions') return [formatNumber(value), 'Impressoes'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="Impressoes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Cliques"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Investimento"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Grupos de Anuncios */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-500" />
            Grupos de Anuncios ({adGroups.length})
          </h3>
        </div>

        {adGroups.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Nenhum grupo de anuncios encontrado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {adGroups.map((adGroup) => (
              <div key={adGroup.id}>
                {/* Header do Ad Group */}
                <button
                  onClick={() => toggleAdGroup(adGroup.ad_group_id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedAdGroup === adGroup.ad_group_id ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{adGroup.name}</span>
                        {getStatusIcon(adGroup.status)}
                      </div>
                      <p className="text-xs text-slate-500">{adGroup.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Impressoes</p>
                      <p className="font-medium">{formatNumber(adGroup.impressions)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Cliques</p>
                      <p className="font-medium">{formatNumber(adGroup.clicks)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Custo</p>
                      <p className="font-medium">{formatCurrency(adGroup.cost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">CTR</p>
                      <p className="font-medium">{adGroup.ctr.toFixed(2)}%</p>
                    </div>
                  </div>
                </button>

                {/* Conteudo expandido */}
                {expandedAdGroup === adGroup.ad_group_id && (
                  <div className="bg-slate-50 p-4 space-y-4">
                    {/* Anuncios */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Anuncios ({ads.length})
                      </h4>
                      {ads.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum anuncio encontrado</p>
                      ) : (
                        <div className="space-y-2">
                          {ads.map((ad) => (
                            <div
                              key={ad.id}
                              className="bg-white p-3 rounded-lg border border-slate-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(ad.status)}
                                  <span className="font-medium text-slate-900">
                                    {ad.name || ad.ad_id}
                                  </span>
                                  <span className="text-xs text-slate-500">{ad.type}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>{formatNumber(ad.impressions)} imp</span>
                                  <span>{formatNumber(ad.clicks)} clicks</span>
                                  <span>{formatCurrency(ad.cost)}</span>
                                </div>
                              </div>
                              {ad.headlines && ad.headlines.length > 0 && (
                                <div className="mt-2 text-sm text-slate-600">
                                  <span className="text-slate-400">Titulos:</span>{' '}
                                  {ad.headlines.slice(0, 3).join(' | ')}
                                </div>
                              )}
                              {ad.final_urls && ad.final_urls.length > 0 && (
                                <div className="mt-1 text-sm">
                                  <a
                                    href={ad.final_urls[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {ad.final_urls[0]}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Keywords */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Palavras-chave ({keywords.length})
                      </h4>
                      {keywords.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhuma palavra-chave encontrada</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-500 border-b border-slate-200">
                                <th className="pb-2 font-medium">Keyword</th>
                                <th className="pb-2 font-medium">Tipo</th>
                                <th className="pb-2 font-medium text-right">QS</th>
                                <th className="pb-2 font-medium text-right">Imp.</th>
                                <th className="pb-2 font-medium text-right">Clicks</th>
                                <th className="pb-2 font-medium text-right">CTR</th>
                                <th className="pb-2 font-medium text-right">Custo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {keywords.map((keyword) => (
                                <tr key={keyword.id} className="hover:bg-white">
                                  <td className="py-2 flex items-center gap-2">
                                    {getStatusIcon(keyword.status)}
                                    <span>{keyword.text}</span>
                                  </td>
                                  <td className="py-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      keyword.match_type === 'EXACT' ? 'bg-blue-100 text-blue-700' :
                                      keyword.match_type === 'PHRASE' ? 'bg-green-100 text-green-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {keyword.match_type}
                                    </span>
                                  </td>
                                  <td className="py-2 text-right">
                                    {keyword.quality_score ? (
                                      <span className={`font-medium ${
                                        keyword.quality_score >= 7 ? 'text-emerald-600' :
                                        keyword.quality_score >= 5 ? 'text-amber-600' :
                                        'text-red-600'
                                      }`}>
                                        {keyword.quality_score}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 text-right">{formatNumber(keyword.impressions)}</td>
                                  <td className="py-2 text-right">{formatNumber(keyword.clicks)}</td>
                                  <td className="py-2 text-right">{keyword.ctr.toFixed(2)}%</td>
                                  <td className="py-2 text-right">{formatCurrency(keyword.cost)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
