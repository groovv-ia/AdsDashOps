import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Eye,
  MousePointer,
  Target,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para metricas agregadas
interface AggregatedMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
}

// Interface para dados do grafico
interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

// Interface para campanha ativa
interface ActiveCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
}

// Props do componente
interface ClientPortalDashboardProps {
  clientId: string;
}

// Opcoes de periodo
const periodOptions = [
  { value: 7, label: 'Ultimos 7 dias' },
  { value: 14, label: 'Ultimos 14 dias' },
  { value: 30, label: 'Ultimos 30 dias' },
  { value: 90, label: 'Ultimos 90 dias' },
];

// Componente do dashboard do portal do cliente
export function ClientPortalDashboard({ clientId }: ClientPortalDashboardProps) {
  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Dados
  const [metrics, setMetrics] = useState<AggregatedMetrics>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    avgCtr: 0,
    avgCpc: 0,
    avgCpm: 0
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);

  // Carrega dados ao montar e quando periodo muda
  useEffect(() => {
    loadDashboardData();
  }, [clientId, periodDays]);

  // Funcao para carregar dados do dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const startDate = format(subDays(new Date(), periodDays), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Busca insights diarios do cliente
      const { data: insightsData, error: insightsError } = await supabase
        .from('meta_insights_daily')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (insightsError) {
        console.error('Erro ao buscar insights:', insightsError);
        return;
      }

      // Processa metricas agregadas
      if (insightsData && insightsData.length > 0) {
        const aggregated = insightsData.reduce((acc, row) => ({
          totalSpend: acc.totalSpend + (Number(row.spend) || 0),
          totalImpressions: acc.totalImpressions + (Number(row.impressions) || 0),
          totalClicks: acc.totalClicks + (Number(row.clicks) || 0),
          totalReach: acc.totalReach + (Number(row.reach) || 0),
          sumCtr: acc.sumCtr + (Number(row.ctr) || 0),
          sumCpc: acc.sumCpc + (Number(row.cpc) || 0),
          sumCpm: acc.sumCpm + (Number(row.cpm) || 0),
          count: acc.count + 1
        }), {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalReach: 0,
          sumCtr: 0,
          sumCpc: 0,
          sumCpm: 0,
          count: 0
        });

        setMetrics({
          totalSpend: aggregated.totalSpend,
          totalImpressions: aggregated.totalImpressions,
          totalClicks: aggregated.totalClicks,
          totalReach: aggregated.totalReach,
          avgCtr: aggregated.count > 0 ? aggregated.sumCtr / aggregated.count : 0,
          avgCpc: aggregated.count > 0 ? aggregated.sumCpc / aggregated.count : 0,
          avgCpm: aggregated.count > 0 ? aggregated.sumCpm / aggregated.count : 0
        });

        // Agrupa dados por data para o grafico
        const dailyData: Record<string, ChartDataPoint> = {};
        insightsData.forEach(row => {
          const dateKey = row.date;
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              date: dateKey,
              dateFormatted: format(new Date(dateKey), 'dd/MM', { locale: ptBR }),
              spend: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0
            };
          }
          dailyData[dateKey].spend += Number(row.spend) || 0;
          dailyData[dateKey].impressions += Number(row.impressions) || 0;
          dailyData[dateKey].clicks += Number(row.clicks) || 0;
        });

        // Calcula CTR para cada dia
        Object.values(dailyData).forEach(day => {
          day.ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
        });

        setChartData(Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        setMetrics({
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalReach: 0,
          avgCtr: 0,
          avgCpc: 0,
          avgCpm: 0
        });
        setChartData([]);
      }

      // Busca campanhas ativas
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('client_id', clientId)
        .in('status', ['ACTIVE', 'PAUSED'])
        .limit(5);

      if (campaignsData) {
        // Busca metricas recentes de cada campanha
        const campaignsWithMetrics = await Promise.all(
          campaignsData.map(async (campaign) => {
            const { data: metricsData } = await supabase
              .from('meta_insights_daily')
              .select('spend, impressions, clicks')
              .eq('entity_id', campaign.id)
              .eq('level', 'campaign')
              .gte('date', startDate)
              .lte('date', endDate);

            const totals = metricsData?.reduce((acc, row) => ({
              spend: acc.spend + (Number(row.spend) || 0),
              impressions: acc.impressions + (Number(row.impressions) || 0),
              clicks: acc.clicks + (Number(row.clicks) || 0)
            }), { spend: 0, impressions: 0, clicks: 0 }) || { spend: 0, impressions: 0, clicks: 0 };

            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              ...totals
            };
          })
        );

        setActiveCampaigns(campaignsWithMetrics.sort((a, b) => b.spend - a.spend));
      }

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handler para atualizar dados
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Formata valores monetarios
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Formata numeros grandes
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
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
      {/* Header com periodo e refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Visao Geral</h2>
          <p className="text-gray-600">Resumo de performance das suas campanhas</p>
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

          <Button
            onClick={handleRefresh}
            variant="secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de metricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Investimento */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Investimento</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalSpend)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Impressoes */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Impressoes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(metrics.totalImpressions)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Cliques */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cliques</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(metrics.totalClicks)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* CTR */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">CTR Medio</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.avgCtr.toFixed(2)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico de Investimento */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Investimento Diario
          </h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Sem dados para o periodo selecionado
              </div>
            )}
          </div>
        </Card>

        {/* Grafico de Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Impressoes e Cliques
          </h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'impressions' ? 'Impressoes' : 'Cliques'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Sem dados para o periodo selecionado
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Campanhas ativas */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Campanhas Ativas
        </h3>
        {activeCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Campanha
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    Investimento
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    Impressoes
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    Cliques
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeCampaigns.map(campaign => (
                  <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {campaign.name}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatNumber(campaign.clicks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            Nenhuma campanha ativa encontrada
          </p>
        )}
      </Card>
    </div>
  );
}
