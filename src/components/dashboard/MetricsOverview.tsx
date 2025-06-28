import React from 'react';
import { Eye, MousePointer, DollarSign, Target, Users, Repeat } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { MetricsSummary } from '../../types/advertising';

interface MetricsOverviewProps {
  metrics: MetricsSummary;
  loading?: boolean;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  loading = false
}) => {
  const metricCards = [
    {
      title: 'Impressões',
      value: metrics.impressions,
      icon: Eye,
      format: 'number' as const,
      change: { value: 12.5, period: 'mês passado' }
    },
    {
      title: 'Cliques',
      value: metrics.clicks,
      icon: MousePointer,
      format: 'number' as const,
      change: { value: 8.2, period: 'mês passado' }
    },
    {
      title: 'Gasto Total',
      value: metrics.spend,
      icon: DollarSign,
      format: 'currency' as const,
      change: { value: -3.1, period: 'mês passado' }
    },
    {
      title: 'Conversões',
      value: metrics.conversions,
      icon: Target,
      format: 'number' as const,
      change: { value: 15.7, period: 'mês passado' }
    },
    {
      title: 'CTR',
      value: metrics.ctr,
      icon: MousePointer,
      format: 'percentage' as const,
      change: { value: 2.4, period: 'mês passado' }
    },
    {
      title: 'ROAS',
      value: metrics.roas,
      icon: Repeat,
      format: 'number' as const,
      change: { value: 18.9, period: 'mês passado' }
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          format={metric.format}
          change={metric.change}
          loading={loading}
        />
      ))}
    </div>
  );
};