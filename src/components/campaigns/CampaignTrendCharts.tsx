/**
 * CampaignTrendCharts - Graficos de Tendencia de Campanha
 *
 * Exibe graficos de evolucao temporal das metricas de uma campanha,
 * incluindo graficos de linha e pizza para distribuicao.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { campaignExtractedDataService, type TrendDataPoint, type AdSetData } from '../../lib/services/CampaignExtractedDataService';
import { Loading } from '../ui/Loading';

// ============================================
// Tipos e Interfaces
// ============================================

interface CampaignTrendChartsProps {
  campaignId: string;
  dataSetId: string;
  adSets?: AdSetData[];
}

type MetricType = 'impressions' | 'clicks' | 'spend' | 'conversions';
type ChartView = 'trend' | 'distribution' | 'comparison';

// ============================================
// Constantes
// ============================================

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#F97316',
];

const METRIC_LABELS: Record<MetricType, string> = {
  impressions: 'Impressoes',
  clicks: 'Cliques',
  spend: 'Gastos',
  conversions: 'Conversoes',
};

const METRIC_COLORS: Record<MetricType, string> = {
  impressions: '#3B82F6',
  clicks: '#10B981',
  spend: '#F59E0B',
  conversions: '#8B5CF6',
};

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Formata numero para exibicao compacta
 */
function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
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
 * Formata data para exibicao no grafico
 */
function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

// ============================================
// Componente de Tooltip Customizado
// ============================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: MetricType;
}

function CustomTooltip({ active, payload, label, metric }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0]?.value ?? 0;
  const formattedValue = metric === 'spend'
    ? formatCurrency(value)
    : value.toLocaleString('pt-BR');

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {formattedValue}
      </p>
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================

export function CampaignTrendCharts({
  campaignId,
  dataSetId,
  adSets = [],
}: CampaignTrendChartsProps) {
  // Estados
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
  const [chartView, setChartView] = useState<ChartView>('trend');

  // Carregar dados de tendencia
  useEffect(() => {
    loadTrendData();
  }, [campaignId, dataSetId]);

  /**
   * Carrega dados de tendencia temporal
   */
  async function loadTrendData() {
    setLoading(true);
    setError(null);

    const result = await campaignExtractedDataService.getTrendData(campaignId, dataSetId);

    if (result.success && result.trendData) {
      setTrendData(result.trendData);
    } else {
      setError(result.error || 'Erro ao carregar dados de tendencia');
    }

    setLoading(false);
  }

  // Dados formatados para o grafico de linha
  const formattedTrendData = useMemo(() => {
    return trendData.map(point => ({
      ...point,
      dateFormatted: formatChartDate(point.date),
    }));
  }, [trendData]);

  // Dados para o grafico de pizza (distribuicao por adset)
  const distributionData = useMemo(() => {
    if (!adSets.length) return [];

    return adSets
      .filter(as => as[selectedMetric] > 0)
      .sort((a, b) => b[selectedMetric] - a[selectedMetric])
      .slice(0, 8)
      .map(as => ({
        name: as.adset_name.length > 20
          ? as.adset_name.substring(0, 20) + '...'
          : as.adset_name,
        value: as[selectedMetric],
        fullName: as.adset_name,
      }));
  }, [adSets, selectedMetric]);

  // Dados para o grafico de barras (comparacao entre adsets)
  const comparisonData = useMemo(() => {
    if (!adSets.length) return [];

    return adSets
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6)
      .map(as => ({
        name: as.adset_name.length > 15
          ? as.adset_name.substring(0, 15) + '...'
          : as.adset_name,
        impressions: as.impressions,
        clicks: as.clicks,
        spend: as.spend,
        conversions: as.conversions,
      }));
  }, [adSets]);

  // Estado de carregamento
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loading size="md" />
          <span className="ml-2 text-gray-500">Carregando graficos...</span>
        </div>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Cabecalho com controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Analise Visual
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de metrica */}
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value as MetricType)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Seletor de visualizacao */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setChartView('trend')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                chartView === 'trend'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Tendencia
            </button>
            <button
              onClick={() => setChartView('distribution')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-300 ${
                chartView === 'distribution'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Distribuicao
            </button>
            <button
              onClick={() => setChartView('comparison')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-300 ${
                chartView === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Comparacao
            </button>
          </div>
        </div>
      </div>

      {/* Grafico de Tendencia */}
      {chartView === 'trend' && (
        <div className="h-[300px]">
          {formattedTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="dateFormatted"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={formatCompactNumber}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip content={<CustomTooltip metric={selectedMetric} />} />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={METRIC_COLORS[selectedMetric]}
                  strokeWidth={2}
                  dot={{ fill: METRIC_COLORS[selectedMetric], r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Dados de tendencia nao disponiveis para esta campanha.</p>
            </div>
          )}
        </div>
      )}

      {/* Grafico de Distribuicao (Pizza) */}
      {chartView === 'distribution' && (
        <div className="h-[300px]">
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {distributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    selectedMetric === 'spend'
                      ? formatCurrency(value)
                      : value.toLocaleString('pt-BR')
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Dados de distribuicao nao disponiveis.</p>
            </div>
          )}
        </div>
      )}

      {/* Grafico de Comparacao (Barras) */}
      {chartView === 'comparison' && (
        <div className="h-[300px]">
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={formatCompactNumber}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) =>
                    selectedMetric === 'spend'
                      ? formatCurrency(value)
                      : value.toLocaleString('pt-BR')
                  }
                />
                <Legend />
                <Bar
                  dataKey={selectedMetric}
                  fill={METRIC_COLORS[selectedMetric]}
                  name={METRIC_LABELS[selectedMetric]}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Dados de comparacao nao disponiveis.</p>
            </div>
          )}
        </div>
      )}

      {/* Legenda adicional */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {chartView === 'trend' && 'Evolucao temporal da metrica selecionada ao longo do periodo extraido.'}
          {chartView === 'distribution' && 'Distribuicao da metrica entre os conjuntos de anuncios.'}
          {chartView === 'comparison' && 'Comparacao da metrica entre os principais conjuntos de anuncios.'}
        </p>
      </div>
    </div>
  );
}
