/**
 * DynamicCharts - Componentes de gráficos dinâmicos
 *
 * Inclui gráficos de linha, barras e pizza que se adaptam
 * automaticamente aos dados fornecidos.
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';

// ============================================
// Cores padrão
// ============================================

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
];

// ============================================
// Tipos compartilhados
// ============================================

interface ChartBaseProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
}

// ============================================
// Utilitários
// ============================================

/** Formata número para tooltip */
function formatTooltipValue(value: number, metric: string): string {
  const metricLower = metric.toLowerCase();

  if (metricLower.includes('spend') || metricLower.includes('cost') || metricLower.includes('value')) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  if (metricLower.includes('ctr') || metricLower.includes('rate')) {
    return `${value.toFixed(2)}%`;
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Formata nome de campo para exibição */
function formatFieldName(field: string): string {
  const translations: Record<string, string> = {
    spend: 'Gasto',
    impressions: 'Impressões',
    clicks: 'Cliques',
    reach: 'Alcance',
    conversions: 'Conversões',
    ctr: 'CTR',
    cpc: 'CPC',
    cpm: 'CPM',
    roas: 'ROAS',
    date_start: 'Data',
  };

  return translations[field.toLowerCase()] ||
         field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// DynamicLineChart - Gráfico de Linha
// ============================================

interface DynamicLineChartProps extends ChartBaseProps {
  metrics: string[];
  dateField: string;
}

export function DynamicLineChart({
  title,
  description,
  data,
  metrics,
  dateField,
}: DynamicLineChartProps) {
  // Agregar dados por data
  const chartData = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>();

    for (const row of data) {
      const date = row[dateField];
      if (!date) continue;

      if (!grouped.has(date)) {
        grouped.set(date, { date });
      }

      const entry = grouped.get(date)!;
      for (const metric of metrics) {
        const val = typeof row[metric] === 'number' ? row[metric] : parseFloat(row[metric]) || 0;
        entry[metric] = (entry[metric] || 0) + val;
      }
    }

    return Array.from(grouped.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data, metrics, dateField]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {new Date(label).toLocaleDateString('pt-BR')}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {formatFieldName(entry.dataKey)}: {formatTooltipValue(entry.value, entry.dataKey)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatTooltipValue(value, metrics[0])} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => formatFieldName(value)}
              wrapperStyle={{ fontSize: '12px' }}
            />
            {metrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================
// DynamicBarChart - Gráfico de Barras
// ============================================

interface DynamicBarChartProps extends ChartBaseProps {
  metrics: string[];
  dimension?: string;
  horizontal?: boolean;
}

export function DynamicBarChart({
  title,
  description,
  data,
  metrics,
  dimension,
  horizontal = false,
}: DynamicBarChartProps) {
  // Preparar dados
  const chartData = useMemo(() => {
    if (dimension) {
      // Agrupar por dimensão
      const grouped = new Map<string, Record<string, number>>();

      for (const row of data) {
        const dimValue = row[dimension] || 'Outros';

        if (!grouped.has(dimValue)) {
          grouped.set(dimValue, { name: dimValue });
        }

        const entry = grouped.get(dimValue)!;
        for (const metric of metrics) {
          const val = typeof row[metric] === 'number' ? row[metric] : parseFloat(row[metric]) || 0;
          entry[metric] = (entry[metric] || 0) + val;
        }
      }

      return Array.from(grouped.values())
        .sort((a, b) => (b[metrics[0]] || 0) - (a[metrics[0]] || 0))
        .slice(0, 10);
    }

    // Mostrar métricas como barras
    return metrics.map(metric => {
      const total = data.reduce((sum, row) => {
        const val = typeof row[metric] === 'number' ? row[metric] : parseFloat(row[metric]) || 0;
        return sum + val;
      }, 0);

      return { name: formatFieldName(metric), value: total, metric };
    });
  }, [data, metrics, dimension]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-600 mb-1">
          {payload[0].payload.name}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {dimension ? formatFieldName(entry.dataKey) : ''} {formatTooltipValue(entry.value, entry.dataKey || entry.payload.metric || '')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={horizontal ? 'vertical' : 'horizontal'}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            {dimension ? (
              metrics.map((metric, index) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================
// DynamicPieChart - Gráfico de Pizza
// ============================================

interface DynamicPieChartProps extends ChartBaseProps {
  metric: string;
  dimension: string;
  limit?: number;
}

export function DynamicPieChart({
  title,
  description,
  data,
  metric,
  dimension,
  limit = 8,
}: DynamicPieChartProps) {
  // Preparar dados agrupados
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const row of data) {
      const dimValue = row[dimension] || 'Outros';
      const val = typeof row[metric] === 'number' ? row[metric] : parseFloat(row[metric]) || 0;
      grouped.set(dimValue, (grouped.get(dimValue) || 0) + val);
    }

    // Ordenar e limitar
    const sorted = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Calcular total para percentuais
    const total = sorted.reduce((sum, [, val]) => sum + val, 0);

    return sorted.map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }));
  }, [data, metric, dimension, limit]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const entry = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-600">{entry.name}</p>
        <p className="text-sm text-gray-900">
          {formatTooltipValue(entry.value, metric)} ({entry.percentage}%)
        </p>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="h-64 flex">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda lateral */}
        <div className="w-32 flex flex-col justify-center space-y-1">
          {chartData.slice(0, 5).map((entry, index) => (
            <div key={entry.name} className="flex items-center text-xs">
              <div
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-gray-600" title={entry.name}>
                {entry.name}
              </span>
            </div>
          ))}
          {chartData.length > 5 && (
            <span className="text-xs text-gray-400">
              +{chartData.length - 5} mais
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
