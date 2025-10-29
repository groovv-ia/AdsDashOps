import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from '../ui/Card';
import { AdMetrics } from '../../types/advertising';

interface PerformanceChartProps {
  data: AdMetrics[];
  metric: 'impressions' | 'clicks' | 'spend' | 'conversions' | 'ctr' | 'roas';
  title: string;
  chartType?: 'line' | 'bar';
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  metric,
  title,
  chartType = 'line'
}) => {
  // Aggregate data by date
  const aggregatedData = data.reduce((acc, item) => {
    const existingItem = acc.find(d => d.date === item.date);
    if (existingItem) {
      existingItem[metric] += item[metric];
    } else {
      acc.push({
        date: item.date,
        [metric]: item[metric],
        formattedDate: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
      });
    }
    return acc;
  }, [] as any[]);

  const formatValue = (value: number) => {
    if (metric === 'spend') {
      return `R$${value.toLocaleString('pt-BR')}`;
    }
    if (metric === 'ctr' || metric === 'roas') {
      return value.toFixed(2);
    }
    return value.toLocaleString('pt-BR');
  };

  const getColor = () => {
    switch (metric) {
      case 'impressions': return '#3B82F6';
      case 'clicks': return '#10B981';
      case 'spend': return '#F59E0B';
      case 'conversions': return '#8B5CF6';
      case 'ctr': return '#EF4444';
      case 'roas': return '#06B6D4';
      default: return '#3B82F6';
    }
  };

  const getMetricTitle = (metric: string) => {
    const titles = {
      impressions: 'Impressões',
      clicks: 'Cliques',
      spend: 'Gasto',
      conversions: 'Conversões',
      ctr: 'CTR',
      roas: 'ROAS'
    };
    return titles[metric as keyof typeof titles] || title;
  };

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{getMetricTitle(metric)}</h3>
        <p className="text-sm text-gray-600">Performance ao longo do tempo</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={aggregatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [formatValue(value), getMetricTitle(metric)]}
                labelStyle={{ color: '#374151' }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={getColor()}
                strokeWidth={3}
                dot={{ fill: getColor(), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: getColor(), strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <BarChart data={aggregatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [formatValue(value), getMetricTitle(metric)]}
                labelStyle={{ color: '#374151' }}
              />
              <Bar
                dataKey={metric}
                fill={getColor()}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};