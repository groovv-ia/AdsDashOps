/**
 * DynamicKPICard - Widget de KPI dinâmico
 *
 * Exibe uma métrica principal com valor total, formatação adequada,
 * e indicador de tendência comparando com período anterior.
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/Card';

// ============================================
// Tipos
// ============================================

interface DynamicKPICardProps {
  title: string;
  data: Record<string, any>[];
  metric: string;
  format?: 'number' | 'currency' | 'percentage' | 'decimal';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  color?: string;
  showTrend?: boolean;
  compareData?: Record<string, any>[];
}

// ============================================
// Funções auxiliares
// ============================================

/** Calcula valor agregado dos dados */
function calculateAggregation(
  data: Record<string, any>[],
  metric: string,
  aggregation: string
): number {
  const values = data
    .map(row => {
      const val = row[metric];
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    })
    .filter(v => !isNaN(v));

  if (values.length === 0) return 0;

  switch (aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

/** Formata valor para exibição */
function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percentage' | 'decimal'
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case 'percentage':
      return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value / 100);

    case 'decimal':
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 0,
      }).format(value);
  }
}

// ============================================
// Componente
// ============================================

export function DynamicKPICard({
  title,
  data,
  metric,
  format = 'number',
  aggregation = 'sum',
  color = '#3B82F6',
  showTrend = true,
  compareData,
}: DynamicKPICardProps) {
  // Calcular valor atual
  const currentValue = useMemo(() => {
    return calculateAggregation(data, metric, aggregation);
  }, [data, metric, aggregation]);

  // Calcular valor de comparação e variação
  const { previousValue, percentChange, trend } = useMemo(() => {
    if (!showTrend || !compareData || compareData.length === 0) {
      return { previousValue: 0, percentChange: 0, trend: 'neutral' as const };
    }

    const prev = calculateAggregation(compareData, metric, aggregation);

    if (prev === 0) {
      return {
        previousValue: 0,
        percentChange: currentValue > 0 ? 100 : 0,
        trend: currentValue > 0 ? 'up' as const : 'neutral' as const,
      };
    }

    const change = ((currentValue - prev) / prev) * 100;

    return {
      previousValue: prev,
      percentChange: change,
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  }, [currentValue, compareData, metric, aggregation, showTrend]);

  // Determinar cor do trend
  const getTrendColor = () => {
    if (metric.toLowerCase().includes('cost') || metric.toLowerCase().includes('cpc') || metric.toLowerCase().includes('cpm')) {
      return trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400';
    }
    return trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
  };

  // Ícone de tendência
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className="relative overflow-hidden">
      {/* Barra de cor no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />

      <div className="pt-4">
        {/* Título */}
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>

        {/* Valor principal */}
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(currentValue, format)}
          </p>

          {/* Indicador de tendência */}
          {showTrend && compareData && compareData.length > 0 && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {Math.abs(percentChange).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Valor anterior (se houver) */}
        {showTrend && compareData && compareData.length > 0 && previousValue > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            vs. {formatValue(previousValue, format)} anterior
          </p>
        )}
      </div>
    </Card>
  );
}
