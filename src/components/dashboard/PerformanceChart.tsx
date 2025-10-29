import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { Metric } from '../../types/advertising';
import { format } from 'date-fns';

interface PerformanceChartProps {
  data: Metric[];
  metric: keyof Pick<Metric, 'impressions' | 'clicks' | 'spend' | 'conversions' | 'roas'>;
  title: string;
  chartType?: 'line' | 'bar';
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  metric,
  title,
  chartType = 'line',
}) => {
  const aggregatedData = data.reduce((acc, item) => {
    const date = format(new Date(item.date), 'dd/MM');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing[metric] += item[metric] as number;
    } else {
      acc.push({ date, [metric]: item[metric] });
    }
    return acc;
  }, [] as any[]);

  const chartData = aggregatedData.slice(-14);

  return (
    <Card title={title} padding="medium">
      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey={metric} fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
};
