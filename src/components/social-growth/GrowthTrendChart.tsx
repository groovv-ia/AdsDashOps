/**
 * GrowthTrendChart
 *
 * Grafico de area para evolucao temporal de uma metrica social.
 * Exibe linha de meta tracejada quando disponivel.
 * Usa Recharts AreaChart seguindo o padrao do projeto.
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
}

interface GrowthTrendChartProps {
  title: string;
  data: DataPoint[];
  metricLabel: string;
  goalValue?: number;
  color?: string;
  loading?: boolean;
  formatValue?: (val: number) => string;
}

// Tooltip personalizado mantendo o estilo do projeto
const CustomTooltip = ({
  active,
  payload,
  label,
  metricLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  metricLabel: string;
  formatValue: (val: number) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">
        {metricLabel}: {formatValue(payload[0].value)}
      </p>
    </div>
  );
};

// Formata datas curtas para o eixo X
function formatAxisDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export const GrowthTrendChart: React.FC<GrowthTrendChartProps> = ({
  title,
  data,
  metricLabel,
  goalValue,
  color = '#3B82F6',
  loading = false,
  formatValue = (v) => v.toLocaleString('pt-BR'),
}) => {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Sem dados para exibir. Sincronize as métricas primeiro.
        </div>
      </Card>
    );
  }

  const gradientId = `gradient-${title.replace(/\s/g, '')}`;
  const maxVal = Math.max(...data.map((d) => d.value), goalValue || 0);
  const minVal = Math.min(...data.map((d) => d.value));
  const domainMin = Math.max(0, minVal - (maxVal - minVal) * 0.1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        {goalValue && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="inline-block w-6 border-t-2 border-dashed border-orange-400" />
            Meta: {formatValue(goalValue)}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[domainMin, 'auto']}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            width={40}
          />
          <Tooltip
            content={
              <CustomTooltip
                metricLabel={metricLabel}
                formatValue={formatValue}
              />
            }
          />
          {/* Linha de meta tracejada */}
          {goalValue && (
            <ReferenceLine
              y={goalValue}
              stroke="#f97316"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
