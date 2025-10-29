import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: LucideIcon;
  format?: 'number' | 'currency' | 'percentage';
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
  loading = false,
}) => {
  const formatValue = (val: string | number) => {
    if (loading) return '---';
    
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(numValue);
    }
  };
  
  const isPositiveChange = change && change.value > 0;
  const isNegativeChange = change && change.value < 0;
  
  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {formatValue(value)}
          </p>
          
          {change && (
            <div className={`flex items-center text-sm ${
              isPositiveChange ? 'text-green-600' : 
              isNegativeChange ? 'text-red-600' : 'text-gray-500'
            }`}>
              {isPositiveChange && <TrendingUp className="w-4 h-4 mr-1" />}
              {isNegativeChange && <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(change.value).toFixed(1)}% vs {change.period}</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${
          isPositiveChange ? 'bg-green-100 text-green-600' :
          isNegativeChange ? 'bg-red-100 text-red-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
        </div>
      )}
    </Card>
  );
};