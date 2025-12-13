/**
 * DynamicDashboard - Componente principal do dashboard dinâmico
 *
 * Renderiza um dashboard completo baseado em configuração de widgets,
 * com layout responsivo e suporte a diferentes tipos de visualização.
 */

import React, { useMemo } from 'react';
import { RefreshCw, Download, Calendar, Clock } from 'lucide-react';
import { DynamicKPICard } from './DynamicKPICard';
import { DynamicLineChart, DynamicBarChart, DynamicPieChart } from './DynamicCharts';
import { DynamicDataTable } from './DynamicDataTable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { WidgetConfig, LayoutConfig } from '../../lib/services/AutoDashboardService';
import type { ResultColumnMeta } from '../../types/extraction';

// ============================================
// Tipos
// ============================================

interface DynamicDashboardProps {
  name: string;
  description?: string;
  data: Record<string, any>[];
  columns: ResultColumnMeta[];
  widgets: WidgetConfig[];
  layoutConfig?: LayoutConfig;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  lastUpdated?: string;
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  isLoading?: boolean;
}

// ============================================
// Utilitários
// ============================================

/** Determina o tamanho CSS da grid para cada widget */
function getWidgetGridClass(size: WidgetConfig['size']): string {
  switch (size) {
    case 'small':
      return 'col-span-1';
    case 'medium':
      return 'col-span-1 lg:col-span-1';
    case 'large':
      return 'col-span-2 lg:col-span-1 xl:col-span-2';
    case 'full':
      return 'col-span-2';
    default:
      return 'col-span-1';
  }
}

/** Formata data para exibição */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ============================================
// Componente Principal
// ============================================

export function DynamicDashboard({
  name,
  description,
  data,
  columns,
  widgets,
  layoutConfig = { columns: 2, gap: 16, responsive: true },
  dateRangeStart,
  dateRangeEnd,
  lastUpdated,
  onRefresh,
  onExport,
  isLoading = false,
}: DynamicDashboardProps) {
  // Extrair lista de campos disponíveis
  const availableFields = useMemo(() => {
    return columns.map(col => col.field);
  }, [columns]);

  // Renderizar widget individual
  const renderWidget = (widget: WidgetConfig) => {
    const { type, config } = widget;

    switch (type) {
      case 'kpi':
        return (
          <DynamicKPICard
            title={widget.title}
            data={data}
            metric={config.metric || ''}
            format={config.format}
            aggregation={config.aggregation}
            color={config.chartColor}
            showTrend={config.showTrend}
          />
        );

      case 'line_chart':
        return (
          <DynamicLineChart
            title={widget.title}
            description={widget.description}
            data={data}
            metrics={config.metrics || []}
            dateField={config.dimension || 'date_start'}
          />
        );

      case 'bar_chart':
        return (
          <DynamicBarChart
            title={widget.title}
            description={widget.description}
            data={data}
            metrics={config.metrics || []}
            dimension={config.dimension}
          />
        );

      case 'pie_chart':
        return (
          <DynamicPieChart
            title={widget.title}
            description={widget.description}
            data={data}
            metric={config.metric || ''}
            dimension={config.dimension || ''}
            limit={config.limit}
          />
        );

      case 'data_table':
        return (
          <DynamicDataTable
            title={widget.title}
            description={widget.description}
            data={data}
            columns={config.metrics?.filter(m => availableFields.includes(m)) || availableFields.slice(0, 8)}
            initialSortBy={config.sortBy}
            initialSortOrder={config.sortOrder}
            pageSize={config.limit || 10}
          />
        );

      default:
        return (
          <Card>
            <p className="text-gray-500">Widget não suportado: {type}</p>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          {description && (
            <p className="text-gray-500 mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Info de período */}
          {(dateRangeStart || dateRangeEnd) && (
            <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
            </div>
          )}

          {/* Última atualização */}
          {lastUpdated && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              {new Date(lastUpdated).toLocaleString('pt-BR')}
            </div>
          )}

          {/* Botões de ação */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}

          {onExport && (
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport('csv')}
                  className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => onExport('pdf')}
                  className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Indicador de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Atualizando dados...</span>
        </div>
      )}

      {/* Grid de Widgets */}
      {!isLoading && (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${layoutConfig.columns}, minmax(0, 1fr))`,
            gap: `${layoutConfig.gap}px`,
          }}
        >
          {widgets.map(widget => (
            <div
              key={widget.id}
              className={getWidgetGridClass(widget.size)}
            >
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      )}

      {/* Mensagem se não houver widgets */}
      {!isLoading && widgets.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-gray-500">
            Nenhum widget configurado para este dashboard.
          </p>
        </Card>
      )}

      {/* Info de registros */}
      {!isLoading && data.length > 0 && (
        <div className="text-sm text-gray-400 text-center">
          {data.length.toLocaleString('pt-BR')} registros
        </div>
      )}
    </div>
  );
}
