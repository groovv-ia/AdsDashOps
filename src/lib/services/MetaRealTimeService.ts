/**
 * MetaRealTimeService
 *
 * Servico que busca metricas em tempo real da Meta Ads API via edge function.
 * Retorna dados identicos ao Gerenciador de Anuncios do Meta.
 *
 * Utiliza a edge function meta-insights-fetch que faz duas chamadas paralelas:
 * - Totais consolidados do periodo (reach exato, spend total, etc.)
 * - Breakdown diario para graficos de tendencia
 *
 * Implementa cache em memoria (5 min) para evitar chamadas redundantes.
 */

import { supabase } from '../supabase';

// ============================================================
// TIPOS
// ============================================================

/** Linha bruta retornada pela Meta API */
export interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  frequency?: string;
  unique_clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

/** Resposta da edge function meta-insights-fetch */
export interface RealTimeInsightsResponse {
  totals: MetaInsightRow[];
  daily: MetaInsightRow[];
  meta: {
    account_id: string;
    level: string;
    date_from: string;
    date_to: string;
    mode: string;
    totals_count: number;
    daily_count: number;
    fetched_at: string;
  };
  from_cache: boolean;
  cached_at?: string;
}

/** Metricas agregadas de uma entidade (campanha, adset ou ad) para o periodo */
export interface PeriodMetrics {
  entity_id: string;
  entity_name: string;
  level: 'campaign' | 'adset' | 'ad';
  // Metricas vindas diretamente da Meta (totais do periodo)
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  unique_clicks: number;
  // Metricas derivadas de actions
  leads: number;
  conversions: number;
  conversion_value: number;
  purchase_value: number;
  messaging_conversations_started: number;
  page_likes: number;
  // Metricas calculadas
  roas: number;
  cost_per_result: number;
  cost_per_lead: number;
  cost_per_messaging_conversation: number;
}

/** KPIs totais para exibicao em cards */
export interface PeriodKPIs {
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgFrequency: number;
  totalLeads: number;
  totalConversions: number;
  totalConversionValue: number;
  totalPurchaseValue: number;
  totalMessagingConversations: number;
  totalPageLikes: number;
  roas: number | null;
  costPerResult: number;
  costPerLead: number;
  costPerConversation: number;
}

/** Linha diaria para tabelas e graficos */
export interface DailyInsightRow {
  id: string;
  level: string;
  entity_id: string;
  entity_name: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number;
  conversions: number;
  conversion_value: number;
  purchase_value: number;
  messaging_conversations_started: number;
  page_likes: number;
}

// ============================================================
// CACHE EM MEMORIA
// ============================================================

interface CacheEntry {
  data: RealTimeInsightsResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCacheKey(accountId: string, level: string, dateFrom: string, dateTo: string, mode: string): string {
  return `${accountId}:${level}:${dateFrom}:${dateTo}:${mode}`;
}

function getFromMemoryCache(key: string): RealTimeInsightsResponse | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MEMORY_CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMemoryCache(key: string, data: RealTimeInsightsResponse): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// EXTRACAO DE METRICAS DO ACTIONS[]
// ============================================================

/**
 * Extrai leads do array de actions.
 * Prioriza onsite_conversion.lead_grouped (valor oficial do Gerenciador).
 */
function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || actions.length === 0) return 0;
  const leadGrouped = actions.find(a => a.action_type === 'onsite_conversion.lead_grouped');
  if (leadGrouped) return parseInt(leadGrouped.value || '0', 10);
  const pixelLead = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_lead');
  if (pixelLead) return parseInt(pixelLead.value || '0', 10);
  const genericLead = actions.find(a => a.action_type === 'lead');
  if (genericLead) return parseInt(genericLead.value || '0', 10);
  return 0;
}

/** Extrai total de conversoes (leads + purchases) */
function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || actions.length === 0) return 0;
  const leadValue = extractLeads(actions);
  const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase'];
  const purchaseValue = actions
    .filter(a => purchaseTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);
  return leadValue + purchaseValue;
}

/** Extrai valor monetario das conversoes de compra */
function extractConversionValue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues || actionValues.length === 0) return 0;
  const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase'];
  return actionValues
    .filter(a => purchaseTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

/** Extrai conversas de mensagem iniciadas */
function extractMessagingConversations(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || actions.length === 0) return 0;
  const onsite = actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
  if (onsite) return parseInt(onsite.value || '0', 10);
  const generic = actions.find(a => a.action_type === 'messaging_conversation_started');
  if (generic) return parseInt(generic.value || '0', 10);
  return 0;
}

/** Extrai seguidores/reacoes da pagina via anuncio
 *  Ordem de prioridade alinhada com o Gerenciador de Anuncios:
 *  1. page_fan_add  — seguidores diretos (campanhas objetivo Seguidores)
 *  2. post_reaction — reacoes em posts impulsionados (coluna "Seguidores Novos" do Gerenciador)
 *  3. like          — fallback legado
 */
function extractPageLikes(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || actions.length === 0) return 0;
  const fanAdd = actions.find(a => a.action_type === 'page_fan_add');
  if (fanAdd) return parseInt(fanAdd.value || '0', 10);
  const reaction = actions.find(a => a.action_type === 'post_reaction');
  if (reaction) return parseInt(reaction.value || '0', 10);
  const like = actions.find(a => a.action_type === 'like');
  return like ? parseInt(like.value || '0', 10) : 0;
}

// ============================================================
// HELPERS
// ============================================================

/** Obtem URL da edge function */
function getEdgeFunctionUrl(functionName: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/** Obtem headers de autenticacao */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Usuario nao autenticado');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/** Extrai entity_id e entity_name de uma row conforme o level */
function getEntityInfo(row: MetaInsightRow, level: string): { id: string; name: string } {
  if (level === 'campaign') return { id: row.campaign_id || '', name: row.campaign_name || row.campaign_id || '' };
  if (level === 'adset') return { id: row.adset_id || '', name: row.adset_name || row.adset_id || '' };
  return { id: row.ad_id || '', name: row.ad_name || row.ad_id || '' };
}

// ============================================================
// FUNCOES PRINCIPAIS
// ============================================================

/**
 * Busca insights em tempo real da Meta API.
 * Retorna totais consolidados do periodo E breakdown diario.
 */
export async function fetchRealTimeInsights(params: {
  meta_ad_account_id: string;
  level: 'campaign' | 'adset' | 'ad';
  date_from: string;
  date_to: string;
  mode?: 'dual' | 'totals' | 'daily';
  force_refresh?: boolean;
}): Promise<RealTimeInsightsResponse> {
  const mode = params.mode || 'dual';
  const cacheKey = getCacheKey(params.meta_ad_account_id, params.level, params.date_from, params.date_to, mode);

  // Verifica cache em memoria (mais rapido que o cache do edge function)
  if (!params.force_refresh) {
    const cached = getFromMemoryCache(cacheKey);
    if (cached) return cached;
  }

  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl('meta-insights-fetch');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      meta_ad_account_id: params.meta_ad_account_id,
      level: params.level,
      date_from: params.date_from,
      date_to: params.date_to,
      mode,
      force_refresh: params.force_refresh || false,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Erro ao buscar insights em tempo real (${response.status})`);
  }

  const data: RealTimeInsightsResponse = await response.json();

  // Salva no cache em memoria
  setMemoryCache(cacheKey, data);

  return data;
}

/**
 * Processa os totais da Meta API e retorna PeriodMetrics por entidade.
 * Cada row nos totals ja contem os valores consolidados exatos do periodo.
 */
export function processToTotalsByEntity(
  totals: MetaInsightRow[],
  level: 'campaign' | 'adset' | 'ad'
): PeriodMetrics[] {
  return totals
    .map(row => {
      const { id, name } = getEntityInfo(row, level);
      if (!id) return null;

      const spend = parseFloat(row.spend || '0');
      const leads = extractLeads(row.actions);
      const conversions = extractConversions(row.actions);
      const conversionValue = extractConversionValue(row.action_values);
      const purchaseValue = conversionValue;
      const messagingConv = extractMessagingConversations(row.actions);
      const pageLikes = extractPageLikes(row.actions);

      return {
        entity_id: id,
        entity_name: name,
        level,
        spend,
        impressions: parseInt(row.impressions || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        ctr: parseFloat(row.ctr || '0'),
        cpc: parseFloat(row.cpc || '0'),
        cpm: parseFloat(row.cpm || '0'),
        frequency: parseFloat(row.frequency || '0'),
        unique_clicks: parseInt(row.unique_clicks || '0', 10),
        leads,
        conversions,
        conversion_value: conversionValue,
        purchase_value: purchaseValue,
        messaging_conversations_started: messagingConv,
        page_likes: pageLikes,
        // Metricas calculadas
        roas: spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0,
        cost_per_result: conversions > 0 ? spend / conversions : 0,
        cost_per_lead: leads > 0 ? spend / leads : 0,
        cost_per_messaging_conversation: messagingConv > 0 ? spend / messagingConv : 0,
      } as PeriodMetrics;
    })
    .filter((m): m is PeriodMetrics => m !== null);
}

/**
 * Calcula KPIs agregados a partir dos totais por entidade.
 * Soma spend/impressions/clicks (metricas aditivas) e usa
 * os totais da Meta para reach (nao soma, pois reach nao e aditivo entre entidades).
 *
 * IMPORTANTE: Para uma unica conta, o reach de nivel "campaign" ja e consolidado
 * por entidade pela Meta. O reach total da conta precisa de uma chamada separada
 * com level=account, mas como geralmente exibimos por campanha, usamos SUM aqui
 * pois cada campanha tem seu reach independente.
 */
export function calculatePeriodKPIs(entities: PeriodMetrics[]): PeriodKPIs {
  if (entities.length === 0) {
    return {
      totalSpend: 0, totalImpressions: 0, totalReach: 0, totalClicks: 0,
      avgCtr: 0, avgCpc: 0, avgCpm: 0, avgFrequency: 0,
      totalLeads: 0, totalConversions: 0, totalConversionValue: 0,
      totalPurchaseValue: 0, totalMessagingConversations: 0, totalPageLikes: 0,
      roas: null, costPerResult: 0, costPerLead: 0, costPerConversation: 0,
    };
  }

  const totalSpend = entities.reduce((s, e) => s + e.spend, 0);
  const totalImpressions = entities.reduce((s, e) => s + e.impressions, 0);
  const totalClicks = entities.reduce((s, e) => s + e.clicks, 0);
  // Reach: soma dos reaches por entidade (cada entidade ja tem reach consolidado do periodo)
  const totalReach = entities.reduce((s, e) => s + e.reach, 0);
  const totalLeads = entities.reduce((s, e) => s + e.leads, 0);
  const totalConversions = entities.reduce((s, e) => s + e.conversions, 0);
  const totalConversionValue = entities.reduce((s, e) => s + e.conversion_value, 0);
  const totalPurchaseValue = entities.reduce((s, e) => s + e.purchase_value, 0);
  const totalMessagingConversations = entities.reduce((s, e) => s + e.messaging_conversations_started, 0);
  const totalPageLikes = entities.reduce((s, e) => s + e.page_likes, 0);

  // Metricas derivadas recalculadas a partir dos totais
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
  const roas = totalSpend > 0 && totalPurchaseValue > 0 ? totalPurchaseValue / totalSpend : null;
  const costPerResult = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const costPerConversation = totalMessagingConversations > 0 ? totalSpend / totalMessagingConversations : 0;

  return {
    totalSpend, totalImpressions, totalReach, totalClicks,
    avgCtr, avgCpc, avgCpm, avgFrequency,
    totalLeads, totalConversions, totalConversionValue, totalPurchaseValue,
    totalMessagingConversations, totalPageLikes,
    roas, costPerResult, costPerLead, costPerConversation,
  };
}

/**
 * Processa dados diarios para tabelas e graficos.
 * Cada row representa um dia com metricas daquele dia especifico.
 */
export function processDailyData(
  daily: MetaInsightRow[],
  level: 'campaign' | 'adset' | 'ad'
): DailyInsightRow[] {
  return daily
    .map(row => {
      const { id, name } = getEntityInfo(row, level);
      if (!id) return null;

      return {
        id: `${id}_${row.date_start}`,
        level,
        entity_id: id,
        entity_name: name,
        date: row.date_start,
        spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        ctr: parseFloat(row.ctr || '0'),
        cpc: parseFloat(row.cpc || '0'),
        cpm: parseFloat(row.cpm || '0'),
        frequency: parseFloat(row.frequency || '0'),
        leads: extractLeads(row.actions),
        conversions: extractConversions(row.actions),
        conversion_value: extractConversionValue(row.action_values),
        purchase_value: extractConversionValue(row.action_values),
        messaging_conversations_started: extractMessagingConversations(row.actions),
        page_likes: extractPageLikes(row.actions),
      } as DailyInsightRow;
    })
    .filter((r): r is DailyInsightRow => r !== null);
}

/**
 * Limpa o cache em memoria (util quando usuario troca de conta ou workspace)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Limpa cache de um periodo/conta especifica
 */
export function invalidateCache(accountId: string, level: string, dateFrom: string, dateTo: string): void {
  const modes = ['dual', 'totals', 'daily'];
  for (const mode of modes) {
    const key = getCacheKey(accountId, level, dateFrom, dateTo, mode);
    memoryCache.delete(key);
  }
}
