import React from 'react';
import { Eye, MousePointerClick, DollarSign, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { MetricsSummary } from '../../types/advertising';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/export';

interface MetricsOverviewProps {
  metrics: MetricsSummary;
  loading?: boolean;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics, loading }) => {
  const metricCards = [
    {
      label: 'Impressões',
      value: formatNumber(metrics.impressions),
      icon: Eye,
      color: 'bg-blue-500',
      change: '+12.5%',
      positive: true,
    },
    {
      label: 'Cliques',
      value: formatNumber(metrics.clicks),
      icon: MousePointerClick,
      color: 'bg-green-500',
      change: '+8.3%',
      positive: true,
    },
    {
      label: 'Gasto Total',
      value: formatCurrency(metrics.spend),
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+5.2%',
      positive: false,
    },
    {
      label: 'Conversões',
      value: formatNumber(metrics.conversions),
      icon: Target,
      color: 'bg-purple-500',
      change: '+15.7%',
      positive: true,
    },
    {
      label: 'CTR Médio',
      value: formatPercentage(metrics.ctr),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      change: '+2.1%',
      positive: true,
    },
    {
      label: 'ROAS',
      value: metrics.roas.toFixed(2),
      icon: TrendingUp,
      color: 'bg-pink-500',
      change: '+18.9%',
      positive: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} padding="medium">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        const ChangeIcon = metric.positive ? TrendingUp : TrendingDown;
        return (
          <Card key={index} padding="medium">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <div className={'flex items-center mt-1 text-xs ' + (metric.positive ? 'text-green-600' : 'text-red-600')}>
                  <ChangeIcon className="w-3 h-3 mr-1" />
                  <span>{metric.change}</span>
                </div>
              </div>
              <div className={'p-2 rounded-lg ' + metric.color}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
