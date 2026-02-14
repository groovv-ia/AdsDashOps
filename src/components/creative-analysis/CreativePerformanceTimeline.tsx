/**
 * CreativePerformanceTimeline
 *
 * Exibe graficos de performance dos criativos selecionados ao longo do tempo.
 * Suporta multiplos criativos sobrepostos com cores distintas.
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';

interface CreativePerformanceTimelineProps {
  creatives: EnrichedCreative[];
  onBack: () => void;
}

// Metricas disponiveis para visualizacao
const TIMELINE_METRICS = [
  { key: 'spend', label: 'Investimento', icon: DollarSign, format: 'currency' },
  { key: 'impressions', label: 'Impressoes', icon: Eye, format: 'number' },
  { key: 'clicks', label: 'Cliques', icon: MousePointer, format: 'number' },
  { key: 'ctr', label: 'CTR (%)', icon: TrendingUp, format: 'percent' },
  { key: 'conversions', label: 'Conversoes', icon: Target, format: 'number' },
];

// Cores distintas para cada criativo
const CREATIVE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

// Formata data para exibicao curta
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const CreativePerformanceTimeline: React.FC<CreativePerformanceTimelineProps> = ({
  creatives,
  onBack,
}) => {
  const [selectedMetric, setSelectedMetric] = useState('spend');

  // Monta dados para o grafico: unifica todas as datas
  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};

    for (const creative of creatives) {
      for (const dm of creative.dailyMetrics) {
        if (!dateMap[dm.date]) {
          dateMap[dm.date] = {};
        }
        dateMap[dm.date][creative.creative.ad_id] = dm[selectedMetric as keyof typeof dm] as number || 0;
      }
    }

    // Ordena por data
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        dateLabel: formatDate(date),
        ...values,
      }));
  }, [creatives, selectedMetric]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[180px]">
        <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, idx: number) => {
            const creative = creatives.find(c => c.creative.ad_id === entry.dataKey);
            const metricConfig = TIMELINE_METRICS.find(m => m.key === selectedMetric);
            let formattedValue = entry.value?.toFixed(2);

            if (metricConfig?.format === 'currency') {
              formattedValue = `R$ ${entry.value?.toFixed(2).replace('.', ',')}`;
            } else if (metricConfig?.format === 'percent') {
              formattedValue = `${entry.value?.toFixed(2)}%`;
            } else {
              formattedValue = Math.round(entry.value || 0).toLocaleString('pt-BR');
            }

            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">
                    {creative?.adName || entry.dataKey}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{formattedValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Timeline de Performance
            </h2>
            <p className="text-sm text-gray-500">
              Acompanhe a evolucao diaria dos criativos selecionados
            </p>
          </div>
        </div>
      </div>

      {/* Seletor de metrica */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIMELINE_METRICS.map(metric => {
          const Icon = metric.icon;
          const isActive = selectedMetric === metric.key;
          return (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* Legenda dos criativos */}
      <div className="flex flex-wrap items-center gap-4">
        {creatives.map((creative, idx) => (
          <div key={creative.creative.ad_id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CREATIVE_COLORS[idx % CREATIVE_COLORS.length] }}
            />
            <span className="text-sm text-gray-700 truncate max-w-[200px]" title={creative.adName}>
              {creative.adName}
            </span>
          </div>
        ))}
      </div>

      {/* Grafico */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                {creatives.map((creative, idx) => (
                  <linearGradient
                    key={creative.creative.ad_id}
                    id={`gradient-${idx}`}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={CREATIVE_COLORS[idx % CREATIVE_COLORS.length]}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor={CREATIVE_COLORS[idx % CREATIVE_COLORS.length]}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              {creatives.map((creative, idx) => (
                <Area
                  key={creative.creative.ad_id}
                  type="monotone"
                  dataKey={creative.creative.ad_id}
                  stroke={CREATIVE_COLORS[idx % CREATIVE_COLORS.length]}
                  fill={`url(#gradient-${idx})`}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CREATIVE_COLORS[idx % CREATIVE_COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-400 text-sm">
            Sem dados de metricas diarias para os criativos selecionados
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativePerformanceTimeline;
