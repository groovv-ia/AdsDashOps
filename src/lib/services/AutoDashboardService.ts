/**
 * AutoDashboardService - Serviço de Geração Automática de Dashboards
 *
 * Analisa dados extraídos e gera configurações de dashboard automaticamente,
 * criando widgets inteligentes baseados nos tipos de dados disponíveis.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import type { SavedDataSet } from './DataSetService';
import type { ResultColumnMeta } from '../../types/extraction';

// ============================================
// Tipos e Interfaces
// ============================================

/** Tipos de widgets disponíveis */
export type WidgetType = 'kpi' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'data_table' | 'comparison';

/** Configuração de um widget */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { row: number; col: number };
  config: {
    metric?: string;
    metrics?: string[];
    dimension?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    format?: 'number' | 'currency' | 'percentage' | 'decimal';
    chartColor?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    showTrend?: boolean;
    compareWithPrevious?: boolean;
  };
}

/** Configuração de layout do dashboard */
export interface LayoutConfig {
  columns: number;
  gap: number;
  responsive: boolean;
}

/** Dashboard gerado */
export interface DashboardInstance {
  id: string;
  user_id: string;
  data_set_id: string;
  name: string;
  description: string | null;
  auto_generated: boolean;
  layout_config: LayoutConfig;
  widgets: WidgetConfig[];
  filters: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Resultado da análise de dados */
interface DataAnalysis {
  metrics: string[];
  dimensions: string[];
  dateFields: string[];
  hasTimeData: boolean;
  hasBreakdowns: boolean;
  breakdownTypes: string[];
  totalRecords: number;
  columnTypes: Map<string, 'metric' | 'dimension' | 'date' | 'text'>;
}

// ============================================
// Constantes de configuração
// ============================================

/** Campos reconhecidos como métricas */
const METRIC_FIELDS = [
  'spend', 'impressions', 'clicks', 'reach', 'frequency',
  'conversions', 'conversion_value', 'ctr', 'cpc', 'cpm',
  'cpp', 'roas', 'cost_per_result', 'video_views',
  'inline_link_clicks', 'outbound_clicks', 'engagement_rate',
];

/** Campos de breakdown conhecidos */
const BREAKDOWN_FIELDS = [
  'age', 'gender', 'country', 'region', 'device_platform',
  'publisher_platform', 'platform_position', 'impression_device',
];

/** Cores padrão para gráficos */
const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#F97316', // orange
  '#EC4899', // pink
];

// ============================================
// Classe Principal
// ============================================

export class AutoDashboardService {
  /**
   * Gera um dashboard automaticamente a partir de um data set
   */
  async generateFromDataSet(
    dataSet: SavedDataSet,
    customName?: string
  ): Promise<{ success: boolean; dashboard?: DashboardInstance; error?: string }> {
    try {
      // 1. Analisar os dados
      const analysis = this.analyzeData(dataSet.data, dataSet.columns_meta);

      // 2. Gerar widgets baseado na análise
      const widgets = this.generateWidgets(analysis);

      // 3. Criar configuração de layout
      const layoutConfig: LayoutConfig = {
        columns: 2,
        gap: 16,
        responsive: true,
      };

      // 4. Salvar dashboard no banco
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const dashboardName = customName || `Dashboard - ${dataSet.name}`;
      const dashboardDescription = `Dashboard gerado automaticamente a partir dos dados "${dataSet.name}" com ${dataSet.record_count} registros.`;

      const { data, error } = await supabase
        .from('dashboard_instances')
        .insert({
          user_id: user.id,
          data_set_id: dataSet.id,
          name: dashboardName,
          description: dashboardDescription,
          auto_generated: true,
          layout_config: layoutConfig,
          widgets: widgets,
          filters: {},
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar dashboard', { error });
        return { success: false, error: error.message };
      }

      logger.info('Dashboard gerado com sucesso', {
        id: data.id,
        name: data.name,
        widgetCount: widgets.length,
      });

      return { success: true, dashboard: data as DashboardInstance };
    } catch (error: any) {
      logger.error('Erro ao gerar dashboard', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Analisa os dados para identificar métricas, dimensões e tipos
   */
  private analyzeData(data: Record<string, any>[], columns: ResultColumnMeta[]): DataAnalysis {
    const metrics: string[] = [];
    const dimensions: string[] = [];
    const dateFields: string[] = [];
    const breakdownTypes: string[] = [];
    const columnTypes = new Map<string, 'metric' | 'dimension' | 'date' | 'text'>();

    // Analisar cada coluna
    for (const col of columns) {
      const fieldId = col.field;
      const fieldLower = fieldId.toLowerCase();

      // Verificar se é campo de data
      if (
        fieldLower.includes('date') ||
        fieldLower.includes('time') ||
        col.dataType === 'date'
      ) {
        dateFields.push(fieldId);
        columnTypes.set(fieldId, 'date');
        continue;
      }

      // Verificar se é métrica conhecida
      if (
        METRIC_FIELDS.some(m => fieldLower.includes(m)) ||
        col.dataType === 'number' ||
        col.dataType === 'currency' ||
        col.dataType === 'percentage'
      ) {
        metrics.push(fieldId);
        columnTypes.set(fieldId, 'metric');
        continue;
      }

      // Verificar se é breakdown conhecido
      if (BREAKDOWN_FIELDS.some(b => fieldLower.includes(b))) {
        dimensions.push(fieldId);
        breakdownTypes.push(fieldId);
        columnTypes.set(fieldId, 'dimension');
        continue;
      }

      // Default: texto/dimensão
      dimensions.push(fieldId);
      columnTypes.set(fieldId, 'text');
    }

    // Se não identificou métricas pelos nomes, tentar por valores numéricos
    if (metrics.length === 0 && data.length > 0) {
      const sample = data[0];
      for (const [key, value] of Object.entries(sample)) {
        if (typeof value === 'number' && !columnTypes.has(key)) {
          metrics.push(key);
          columnTypes.set(key, 'metric');
        }
      }
    }

    return {
      metrics,
      dimensions,
      dateFields,
      hasTimeData: dateFields.length > 0,
      hasBreakdowns: breakdownTypes.length > 0,
      breakdownTypes,
      totalRecords: data.length,
      columnTypes,
    };
  }

  /**
   * Gera widgets automaticamente baseado na análise dos dados
   */
  private generateWidgets(analysis: DataAnalysis): WidgetConfig[] {
    const widgets: WidgetConfig[] = [];
    let widgetId = 0;
    let currentRow = 0;

    // 1. KPIs para métricas principais (primeira linha)
    const primaryMetrics = this.selectPrimaryMetrics(analysis.metrics);
    const kpiWidgets = primaryMetrics.slice(0, 4).map((metric, index) => {
      widgetId++;
      return this.createKPIWidget(
        `widget-${widgetId}`,
        metric,
        { row: 0, col: index },
        CHART_COLORS[index % CHART_COLORS.length]
      );
    });
    widgets.push(...kpiWidgets);
    currentRow++;

    // 2. Gráfico temporal se tiver dados de data
    if (analysis.hasTimeData && analysis.metrics.length > 0) {
      widgetId++;
      widgets.push(this.createTimeSeriesChart(
        `widget-${widgetId}`,
        analysis.metrics.slice(0, 3),
        analysis.dateFields[0],
        { row: currentRow, col: 0 }
      ));
      currentRow++;
    }

    // 3. Gráfico de barras para comparação de métricas
    if (analysis.metrics.length >= 2) {
      widgetId++;
      widgets.push(this.createComparisonBarChart(
        `widget-${widgetId}`,
        analysis.metrics.slice(0, 5),
        { row: currentRow, col: 0 }
      ));
      currentRow++;
    }

    // 4. Gráficos de distribuição para breakdowns
    for (const breakdown of analysis.breakdownTypes.slice(0, 2)) {
      widgetId++;
      widgets.push(this.createDistributionChart(
        `widget-${widgetId}`,
        breakdown,
        analysis.metrics[0] || 'spend',
        { row: currentRow, col: widgets.length % 2 }
      ));
      if (widgets.length % 2 === 0) currentRow++;
    }

    // 5. Tabela de dados completa
    widgetId++;
    widgets.push(this.createDataTable(
      `widget-${widgetId}`,
      analysis.metrics.concat(analysis.dimensions).slice(0, 10),
      { row: currentRow + 1, col: 0 }
    ));

    return widgets;
  }

  /**
   * Seleciona métricas principais em ordem de prioridade
   */
  private selectPrimaryMetrics(metrics: string[]): string[] {
    const priority = ['spend', 'impressions', 'clicks', 'conversions', 'roas', 'ctr', 'cpc', 'reach'];
    const sorted: string[] = [];

    // Adicionar métricas prioritárias primeiro
    for (const p of priority) {
      const found = metrics.find(m => m.toLowerCase().includes(p));
      if (found && !sorted.includes(found)) {
        sorted.push(found);
      }
    }

    // Adicionar restantes
    for (const m of metrics) {
      if (!sorted.includes(m)) {
        sorted.push(m);
      }
    }

    return sorted;
  }

  /**
   * Cria widget de KPI
   */
  private createKPIWidget(
    id: string,
    metric: string,
    position: { row: number; col: number },
    color: string
  ): WidgetConfig {
    return {
      id,
      type: 'kpi',
      title: this.formatFieldName(metric),
      size: 'small',
      position,
      config: {
        metric,
        aggregation: 'sum',
        format: this.getMetricFormat(metric),
        chartColor: color,
        showTrend: true,
        compareWithPrevious: true,
      },
    };
  }

  /**
   * Cria gráfico de série temporal
   */
  private createTimeSeriesChart(
    id: string,
    metrics: string[],
    dateField: string,
    position: { row: number; col: number }
  ): WidgetConfig {
    return {
      id,
      type: 'line_chart',
      title: 'Evolução Temporal',
      description: `Variação de ${metrics.map(m => this.formatFieldName(m)).join(', ')} ao longo do tempo`,
      size: 'full',
      position,
      config: {
        metrics,
        dimension: dateField,
        aggregation: 'sum',
        chartColor: CHART_COLORS[0],
      },
    };
  }

  /**
   * Cria gráfico de barras comparativo
   */
  private createComparisonBarChart(
    id: string,
    metrics: string[],
    position: { row: number; col: number }
  ): WidgetConfig {
    return {
      id,
      type: 'bar_chart',
      title: 'Comparação de Métricas',
      description: 'Visão geral das principais métricas',
      size: 'large',
      position,
      config: {
        metrics,
        aggregation: 'sum',
        sortBy: metrics[0],
        sortOrder: 'desc',
      },
    };
  }

  /**
   * Cria gráfico de distribuição (pizza/donut)
   */
  private createDistributionChart(
    id: string,
    dimension: string,
    metric: string,
    position: { row: number; col: number }
  ): WidgetConfig {
    return {
      id,
      type: 'pie_chart',
      title: `Distribuição por ${this.formatFieldName(dimension)}`,
      size: 'medium',
      position,
      config: {
        metric,
        dimension,
        aggregation: 'sum',
        limit: 8,
      },
    };
  }

  /**
   * Cria tabela de dados
   */
  private createDataTable(
    id: string,
    columns: string[],
    position: { row: number; col: number }
  ): WidgetConfig {
    return {
      id,
      type: 'data_table',
      title: 'Dados Detalhados',
      description: 'Tabela com todos os dados extraídos',
      size: 'full',
      position,
      config: {
        metrics: columns,
        sortBy: columns[0],
        sortOrder: 'desc',
        limit: 100,
      },
    };
  }

  /**
   * Formata nome do campo para exibição
   */
  private formatFieldName(field: string): string {
    const translations: Record<string, string> = {
      spend: 'Gasto',
      impressions: 'Impressões',
      clicks: 'Cliques',
      reach: 'Alcance',
      frequency: 'Frequência',
      conversions: 'Conversões',
      conversion_value: 'Valor de Conversão',
      ctr: 'CTR',
      cpc: 'CPC',
      cpm: 'CPM',
      roas: 'ROAS',
      cost_per_result: 'Custo por Resultado',
      age: 'Idade',
      gender: 'Gênero',
      country: 'País',
      region: 'Região',
      device_platform: 'Dispositivo',
      date_start: 'Data',
    };

    return translations[field.toLowerCase()] ||
           field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Determina formato de exibição da métrica
   */
  private getMetricFormat(metric: string): 'number' | 'currency' | 'percentage' | 'decimal' {
    const metricLower = metric.toLowerCase();

    if (metricLower.includes('spend') || metricLower.includes('value') ||
        metricLower.includes('cpc') || metricLower.includes('cpm') ||
        metricLower.includes('cost')) {
      return 'currency';
    }

    if (metricLower.includes('ctr') || metricLower.includes('rate')) {
      return 'percentage';
    }

    if (metricLower.includes('roas') || metricLower.includes('frequency')) {
      return 'decimal';
    }

    return 'number';
  }

  /**
   * Lista dashboards do usuário
   */
  async list(dataSetId?: string): Promise<{ success: boolean; dashboards?: DashboardInstance[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      let query = supabase
        .from('dashboard_instances')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (dataSetId) {
        query = query.eq('data_set_id', dataSetId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar dashboards', { error });
        return { success: false, error: error.message };
      }

      return { success: true, dashboards: data as DashboardInstance[] };
    } catch (error: any) {
      logger.error('Erro ao listar dashboards', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca dashboard por ID
   */
  async getById(id: string): Promise<{ success: boolean; dashboard?: DashboardInstance; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase
        .from('dashboard_instances')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar dashboard', { error, id });
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Dashboard não encontrado' };
      }

      return { success: true, dashboard: data as DashboardInstance };
    } catch (error: any) {
      logger.error('Erro ao buscar dashboard', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza configuração de widgets do dashboard
   */
  async updateWidgets(id: string, widgets: WidgetConfig[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { error } = await supabase
        .from('dashboard_instances')
        .update({ widgets, auto_generated: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao atualizar widgets', { error, id });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao atualizar widgets', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }

  /**
   * Exclui um dashboard
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { error } = await supabase
        .from('dashboard_instances')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao excluir dashboard', { error, id });
        return { success: false, error: error.message };
      }

      logger.info('Dashboard excluído com sucesso', { id });

      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao excluir dashboard', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }
}

// Exporta instância singleton
export const autoDashboardService = new AutoDashboardService();
