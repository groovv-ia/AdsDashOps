/**
 * Helper compartilhado para extração de métricas da API Meta Ads
 *
 * Este módulo centraliza toda a lógica de extração de métricas da API Meta,
 * garantindo consistência entre MetaSyncService e DataSyncService.
 *
 * IMPORTANTE: Usa valores REAIS da API, nunca estima ou recalcula!
 */

import { logger } from './logger';

/**
 * Interface para dados brutos retornados pela API Meta Insights
 */
export interface MetaInsightsRaw {
  date_start: string;
  date_stop?: string;
  impressions?: string | number;
  clicks?: string | number;
  spend?: string | number;
  reach?: string | number;
  frequency?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  cpp?: string | number;
  inline_link_clicks?: string | number;
  cost_per_inline_link_click?: string | number;
  outbound_clicks?: string | number;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  video_views?: string | number;
  video_avg_time_watched_actions?: any;
  video_p25_watched_actions?: any;
  video_p50_watched_actions?: any;
  video_p75_watched_actions?: any;
  video_p100_watched_actions?: any;
}

/**
 * Interface para métricas extraídas e prontas para salvar no banco
 */
export interface ExtractedMetrics {
  // Métricas básicas
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;

  // Métricas de taxa (valores reais da API)
  ctr: number;
  cpc: number;
  cpm: number;
  cpp: number;

  // Conversões com valor real
  conversions: number;
  conversion_value: number;
  roas: number;
  cost_per_result: number;

  // Cliques detalhados
  inline_link_clicks: number;
  cost_per_inline_link_click: number;
  outbound_clicks: number;

  // Vídeo
  video_views: number;

  // JSONs brutos para auditoria
  actions_raw: Array<{ action_type: string; value: string }> | null;
  action_values_raw: Array<{ action_type: string; value: string }> | null;
}

/**
 * Tipos de ação para conversões
 * Lista em ordem de prioridade (da mais específica para mais genérica)
 */
const CONVERSION_ACTION_TYPES = [
  'offsite_conversion.fb_pixel_purchase',
  'purchase',
  'omni_purchase',
  'app_custom_event.fb_mobile_purchase',
];

/**
 * Tipos de ação para visualizações de vídeo
 */
const VIDEO_VIEW_ACTION_TYPES = ['video_view'];

/**
 * Extrai valor de uma ação específica do array actions ou action_values
 * Suporta múltiplos tipos de ação (ex: purchase, omni_purchase, etc)
 *
 * @param actionsArray - Array de actions ou action_values da API Meta
 * @param actionTypes - Array de tipos de ação para buscar (em ordem de prioridade)
 * @returns Valor numérico da ação encontrada, ou 0 se não encontrar
 */
export function extractActionValue(
  actionsArray: Array<{ action_type: string; value: string }> | undefined,
  actionTypes: string[]
): number {
  if (!actionsArray || actionsArray.length === 0) return 0;

  // Percorre tipos de ação em ordem de prioridade
  for (const actionType of actionTypes) {
    const action = actionsArray.find((a: any) => a.action_type === actionType);
    if (action && action.value) {
      return parseFloat(action.value);
    }
  }

  return 0;
}

/**
 * Extrai todas as métricas de um insight da API Meta
 * Esta é a função principal que deve ser usada por todos os serviços
 *
 * @param insight - Dados brutos do insight retornado pela API Meta
 * @returns Objeto com todas as métricas extraídas e formatadas
 */
export function extractMetricsFromInsight(insight: MetaInsightsRaw): ExtractedMetrics {
  // Extrai arrays de actions para uso posterior
  const actions = insight.actions || [];
  const actionValues = insight.action_values || [];

  // Extrai conversões - verifica múltiplos tipos de conversão
  const conversions = extractActionValue(actions, CONVERSION_ACTION_TYPES);

  // Extrai valor REAL das conversões (não estimar!)
  const conversionValue = extractActionValue(actionValues, CONVERSION_ACTION_TYPES);

  // Extrai visualizações de vídeo
  const videoViews = extractActionValue(actions, VIDEO_VIEW_ACTION_TYPES);

  // Extrai valores numéricos básicos
  const spend = parseFloat(String(insight.spend || '0'));
  const impressions = parseInt(String(insight.impressions || '0'));
  const clicks = parseInt(String(insight.clicks || '0'));
  const reach = parseInt(String(insight.reach || '0'));
  const frequency = parseFloat(String(insight.frequency || '0'));

  // Extrai cliques detalhados
  const inlineLinkClicks = parseInt(String(insight.inline_link_clicks || '0'));
  const costPerInlineLinkClick = parseFloat(String(insight.cost_per_inline_link_click || '0'));
  const outboundClicks = parseInt(String(insight.outbound_clicks || '0'));

  // Extrai métricas de taxa (já calculadas pela API)
  const ctr = parseFloat(String(insight.ctr || '0'));
  const cpc = parseFloat(String(insight.cpc || '0'));
  const cpm = parseFloat(String(insight.cpm || '0'));
  const cpp = parseFloat(String(insight.cpp || '0'));

  // Calcula ROAS usando valor REAL de conversão (não estimativa)
  const roas = conversionValue > 0 && spend > 0 ? conversionValue / spend : 0;

  // Calcula custo por resultado (conversão)
  const costPerResult = conversions > 0 ? spend / conversions : 0;

  // Log para debugging e auditoria
  logger.info('Métricas extraídas da API Meta', {
    date: insight.date_start,
    conversions,
    conversionValue,
    spend,
    roas,
    impressions,
    clicks,
    hasActions: actions.length > 0,
    hasActionValues: actionValues.length > 0,
  });

  return {
    // Métricas básicas
    impressions,
    clicks,
    spend,
    reach,
    frequency,

    // Métricas de taxa - USA VALORES DA API, NÃO RECALCULA
    ctr,
    cpc,
    cpm,
    cpp,

    // Conversões - USA VALOR REAL
    conversions: parseFloat(String(conversions)),
    conversion_value: parseFloat(String(conversionValue)),
    roas,
    cost_per_result: costPerResult,

    // Cliques detalhados
    inline_link_clicks: inlineLinkClicks,
    cost_per_inline_link_click: costPerInlineLinkClick,
    outbound_clicks: outboundClicks,

    // Vídeo
    video_views: videoViews,

    // JSONs brutos para auditoria
    actions_raw: actions.length > 0 ? actions : null,
    action_values_raw: actionValues.length > 0 ? actionValues : null,
  };
}

/**
 * Valida se as métricas extraídas estão completas e corretas
 * Útil para debugging e garantir qualidade dos dados
 *
 * @param metrics - Métricas extraídas
 * @returns Array de avisos (vazio se tudo estiver ok)
 */
export function validateExtractedMetrics(metrics: ExtractedMetrics): string[] {
  const warnings: string[] = [];

  // Valida consistência básica
  if (metrics.clicks > metrics.impressions) {
    warnings.push('Número de cliques maior que impressões - dados inconsistentes');
  }

  if (metrics.spend > 0 && metrics.impressions === 0) {
    warnings.push('Há gasto mas sem impressões - possível erro de sincronização');
  }

  // Valida se conversões têm valor quando existem
  if (metrics.conversions > 0 && metrics.conversion_value === 0) {
    warnings.push('Há conversões mas sem valor - verifique se pixel está configurado corretamente');
  }

  // Valida se actions_raw foi salvo quando há conversões
  if (metrics.conversions > 0 && !metrics.actions_raw) {
    warnings.push('Há conversões mas actions_raw está vazio - possível problema na extração');
  }

  // Valida se CTR está dentro de limites razoáveis (0-100%)
  if (metrics.ctr > 100) {
    warnings.push('CTR maior que 100% - dados inconsistentes da API');
  }

  return warnings;
}

/**
 * Formata métricas para exibição (com localização pt-BR)
 *
 * @param metrics - Métricas extraídas
 * @returns Objeto com valores formatados para exibição
 */
export function formatMetricsForDisplay(metrics: ExtractedMetrics): Record<string, string> {
  return {
    impressions: new Intl.NumberFormat('pt-BR').format(metrics.impressions),
    clicks: new Intl.NumberFormat('pt-BR').format(metrics.clicks),
    spend: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.spend),
    conversions: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(metrics.conversions),
    conversion_value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.conversion_value),
    ctr: `${metrics.ctr.toFixed(2)}%`,
    cpc: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.cpc),
    cpm: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.cpm),
    roas: `${metrics.roas.toFixed(2)}x`,
    cost_per_result: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.cost_per_result),
  };
}
