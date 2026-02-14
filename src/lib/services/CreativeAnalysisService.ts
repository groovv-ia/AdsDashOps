/**
 * CreativeAnalysisService
 *
 * Servico responsavel por buscar, filtrar e comparar criativos de anuncios.
 * Integra dados de meta_ad_creatives, meta_insights_daily e meta_ad_ai_analyses
 * para fornecer uma visao completa para o modulo de analise de criativos.
 */

import { supabase } from '../supabase';
import type { MetaAdCreative } from '../../types/adAnalysis';

/**
 * Filtros disponiveis para busca de criativos
 */
export interface CreativeSearchFilters {
  platform: 'meta' | 'google';
  campaignIds?: string[];
  adsetIds?: string[];
  creativeType?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  minCtr?: number;
  maxCtr?: number;
  minSpend?: number;
  maxSpend?: number;
  minImpressions?: number;
  sortBy?: 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'conversions' | 'date';
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Criativo enriquecido com metricas agregadas
 */
export interface EnrichedCreative {
  creative: MetaAdCreative;
  adName: string;
  campaignName: string;
  adsetName: string;
  campaignId: string;
  adsetId: string;
  metaAdAccountId: string;
  status: string;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    reach: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
    conversionValue: number;
    roas: number;
    leads: number;
    messagingConversations: number;
  };
  dailyMetrics: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    conversions: number;
  }>;
  aiScore?: number;
  tags: string[];
}

/**
 * Resultado da busca de criativos com paginacao
 */
export interface CreativeSearchResult {
  creatives: EnrichedCreative[];
  total: number;
  hasMore: boolean;
}

/**
 * Opcoes de campanha para os filtros dropdown
 */
export interface CampaignOption {
  entityId: string;
  name: string;
  status: string;
  adCount: number;
}

/**
 * Opcoes de adset para os filtros dropdown
 */
export interface AdsetOption {
  entityId: string;
  name: string;
  campaignId: string;
}

// Helper para obter workspace_id do usuario atual
async function getUserWorkspaceId(): Promise<string | null> {
  const { data } = await supabase.rpc('get_user_workspace_id');
  if (data) return data;

  // Fallback: busca direto na tabela de workspaces
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  return ws?.id || null;
}

/**
 * Busca campanhas disponíveis para os filtros
 */
export async function fetchCampaignOptions(platform: 'meta' | 'google'): Promise<CampaignOption[]> {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return [];

  // Busca entidades de campanha no cache
  const { data: entities, error } = await supabase
    .from('meta_entities_cache')
    .select('entity_id, name, effective_status')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', 'campaign')
    .order('name');

  if (error || !entities) return [];

  // Conta ads por campanha usando insights
  const { data: adCounts } = await supabase
    .from('meta_insights_daily')
    .select('campaign_id, entity_id')
    .eq('workspace_id', workspaceId)
    .eq('level', 'ad');

  const countMap: Record<string, Set<string>> = {};
  if (adCounts) {
    for (const row of adCounts) {
      const cid = row.campaign_id || '';
      if (!countMap[cid]) countMap[cid] = new Set();
      countMap[cid].add(row.entity_id);
    }
  }

  return entities.map(e => ({
    entityId: e.entity_id,
    name: e.name || e.entity_id,
    status: e.effective_status || 'unknown',
    adCount: countMap[e.entity_id]?.size || 0,
  }));
}

/**
 * Busca adsets de uma campanha para os filtros
 */
export async function fetchAdsetOptions(campaignId: string): Promise<AdsetOption[]> {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('meta_entities_cache')
    .select('entity_id, name, campaign_id')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', 'adset')
    .eq('campaign_id', campaignId)
    .order('name');

  if (error || !data) return [];

  return data.map(e => ({
    entityId: e.entity_id,
    name: e.name || e.entity_id,
    campaignId: e.campaign_id || campaignId,
  }));
}

/**
 * Busca criativos com filtros avancados e metricas agregadas.
 * Faz JOIN entre meta_ad_creatives, meta_insights_daily e meta_entities_cache.
 */
export async function searchCreatives(filters: CreativeSearchFilters): Promise<CreativeSearchResult> {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return { creatives: [], total: 0, hasMore: false };

  const limit = filters.limit || 24;
  const offset = filters.offset || 0;

  // Passo 1: Busca ads no meta_insights_daily (nivel 'ad') com filtros de periodo
  let insightsQuery = supabase
    .from('meta_insights_daily')
    .select('entity_id, entity_name, campaign_id, adset_id, meta_ad_account_id, date, impressions, clicks, spend, reach, ctr, cpc, cpm, actions_json, action_values_json')
    .eq('workspace_id', workspaceId)
    .eq('level', 'ad');

  if (filters.dateFrom) {
    insightsQuery = insightsQuery.gte('date', filters.dateFrom);
  }
  if (filters.dateTo) {
    insightsQuery = insightsQuery.lte('date', filters.dateTo);
  }
  if (filters.campaignIds && filters.campaignIds.length > 0) {
    insightsQuery = insightsQuery.in('campaign_id', filters.campaignIds);
  }
  if (filters.adsetIds && filters.adsetIds.length > 0) {
    insightsQuery = insightsQuery.in('adset_id', filters.adsetIds);
  }

  const { data: insights, error: insightsError } = await insightsQuery;
  if (insightsError || !insights) return { creatives: [], total: 0, hasMore: false };

  // Passo 2: Agrega metricas por ad_id
  const adMetricsMap: Record<string, {
    adName: string;
    campaignId: string;
    adsetId: string;
    metaAdAccountId: string;
    impressions: number;
    clicks: number;
    spend: number;
    reach: number;
    conversions: number;
    conversionValue: number;
    leads: number;
    messagingConversations: number;
    dailyMetrics: Array<{
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      ctr: number;
      cpc: number;
      conversions: number;
    }>;
  }> = {};

  for (const row of insights) {
    const adId = row.entity_id;
    if (!adMetricsMap[adId]) {
      adMetricsMap[adId] = {
        adName: row.entity_name || adId,
        campaignId: row.campaign_id || '',
        adsetId: row.adset_id || '',
        metaAdAccountId: row.meta_ad_account_id || '',
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        conversions: 0,
        conversionValue: 0,
        leads: 0,
        messagingConversations: 0,
        dailyMetrics: [],
      };
    }

    const m = adMetricsMap[adId];
    m.impressions += row.impressions || 0;
    m.clicks += row.clicks || 0;
    m.spend += row.spend || 0;
    m.reach += row.reach || 0;

    // Extrai conversoes do actions_json
    const conversions = extractConversions(row.actions_json);
    const convValue = extractConversionValue(row.action_values_json);
    const leads = extractLeads(row.actions_json);
    const messaging = extractMessaging(row.actions_json);

    m.conversions += conversions;
    m.conversionValue += convValue;
    m.leads += leads;
    m.messagingConversations += messaging;

    m.dailyMetrics.push({
      date: row.date,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      spend: row.spend || 0,
      ctr: row.ctr || 0,
      cpc: row.cpc || 0,
      conversions,
    });
  }

  // Aplica filtros de performance
  let filteredAdIds = Object.keys(adMetricsMap);

  if (filters.minSpend !== undefined) {
    filteredAdIds = filteredAdIds.filter(id => adMetricsMap[id].spend >= (filters.minSpend || 0));
  }
  if (filters.maxSpend !== undefined) {
    filteredAdIds = filteredAdIds.filter(id => adMetricsMap[id].spend <= (filters.maxSpend || Infinity));
  }
  if (filters.minImpressions !== undefined) {
    filteredAdIds = filteredAdIds.filter(id => adMetricsMap[id].impressions >= (filters.minImpressions || 0));
  }
  if (filters.minCtr !== undefined) {
    filteredAdIds = filteredAdIds.filter(id => {
      const m = adMetricsMap[id];
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      return ctr >= (filters.minCtr || 0);
    });
  }
  if (filters.maxCtr !== undefined) {
    filteredAdIds = filteredAdIds.filter(id => {
      const m = adMetricsMap[id];
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      return ctr <= (filters.maxCtr || Infinity);
    });
  }

  if (filteredAdIds.length === 0) return { creatives: [], total: 0, hasMore: false };

  // Passo 3: Busca criativos correspondentes
  let creativesQuery = supabase
    .from('meta_ad_creatives')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('ad_id', filteredAdIds);

  if (filters.creativeType && filters.creativeType !== 'all') {
    creativesQuery = creativesQuery.eq('creative_type', filters.creativeType);
  }
  if (filters.searchQuery) {
    creativesQuery = creativesQuery.or(
      `title.ilike.%${filters.searchQuery}%,body.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
    );
  }

  const { data: creatives, error: creativesError } = await creativesQuery;
  if (creativesError) return { creatives: [], total: 0, hasMore: false };

  // Passo 4: Busca nomes de campanhas e adsets do cache de entidades
  const campaignIds = [...new Set(Object.values(adMetricsMap).map(m => m.campaignId))].filter(Boolean);
  const adsetIds = [...new Set(Object.values(adMetricsMap).map(m => m.adsetId))].filter(Boolean);

  const entityIds = [...campaignIds, ...adsetIds];
  const entityNameMap: Record<string, string> = {};

  if (entityIds.length > 0) {
    const { data: entities } = await supabase
      .from('meta_entities_cache')
      .select('entity_id, name')
      .eq('workspace_id', workspaceId)
      .in('entity_id', entityIds);

    if (entities) {
      for (const e of entities) {
        entityNameMap[e.entity_id] = e.name || e.entity_id;
      }
    }
  }

  // Passo 5: Busca status dos ads
  const { data: adEntities } = await supabase
    .from('meta_entities_cache')
    .select('entity_id, effective_status')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', 'ad')
    .in('entity_id', filteredAdIds);

  const statusMap: Record<string, string> = {};
  if (adEntities) {
    for (const e of adEntities) {
      statusMap[e.entity_id] = e.effective_status || 'unknown';
    }
  }

  // Passo 6: Busca AI scores
  const { data: analyses } = await supabase
    .from('meta_ad_ai_analyses')
    .select('ad_id, overall_score')
    .eq('workspace_id', workspaceId)
    .in('ad_id', filteredAdIds);

  const aiScoreMap: Record<string, number> = {};
  if (analyses) {
    for (const a of analyses) {
      aiScoreMap[a.ad_id] = a.overall_score;
    }
  }

  // Passo 7: Busca tags
  const { data: tags } = await supabase
    .from('creative_tags')
    .select('ad_id, tag')
    .eq('workspace_id', workspaceId)
    .in('ad_id', filteredAdIds);

  const tagMap: Record<string, string[]> = {};
  if (tags) {
    for (const t of tags) {
      if (!tagMap[t.ad_id]) tagMap[t.ad_id] = [];
      tagMap[t.ad_id].push(t.tag);
    }
  }

  // Filtra por tags se especificado
  if (filters.tags && filters.tags.length > 0) {
    filteredAdIds = filteredAdIds.filter(id => {
      const adTags = tagMap[id] || [];
      return filters.tags!.some(t => adTags.includes(t));
    });
  }

  // Passo 8: Monta resultado enriquecido
  const creativeMap: Record<string, MetaAdCreative> = {};
  if (creatives) {
    for (const c of creatives) {
      creativeMap[c.ad_id] = c as MetaAdCreative;
    }
  }

  // Inclui ads que nao tem criativo ainda (mostra placeholder)
  let enriched: EnrichedCreative[] = filteredAdIds.map(adId => {
    const m = adMetricsMap[adId];
    const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
    const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
    const cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
    const roas = m.spend > 0 ? m.conversionValue / m.spend : 0;

    // Ordena metricas diarias por data
    m.dailyMetrics.sort((a, b) => a.date.localeCompare(b.date));

    return {
      creative: creativeMap[adId] || createPlaceholderCreative(adId, workspaceId),
      adName: m.adName,
      campaignName: entityNameMap[m.campaignId] || m.campaignId || 'Campanha desconhecida',
      adsetName: entityNameMap[m.adsetId] || m.adsetId || 'Adset desconhecido',
      campaignId: m.campaignId,
      adsetId: m.adsetId,
      metaAdAccountId: creativeMap[adId]?.meta_ad_account_id || m.metaAdAccountId || '',
      status: statusMap[adId] || 'unknown',
      metrics: {
        impressions: m.impressions,
        clicks: m.clicks,
        spend: m.spend,
        reach: m.reach,
        ctr,
        cpc,
        cpm,
        conversions: m.conversions,
        conversionValue: m.conversionValue,
        roas,
        leads: m.leads,
        messagingConversations: m.messagingConversations,
      },
      dailyMetrics: m.dailyMetrics,
      aiScore: aiScoreMap[adId],
      tags: tagMap[adId] || [],
    };
  });

  // Aplica ordenacao
  const sortBy = filters.sortBy || 'spend';
  const sortOrder = filters.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  enriched.sort((a, b) => {
    let valA: number, valB: number;
    switch (sortBy) {
      case 'impressions': valA = a.metrics.impressions; valB = b.metrics.impressions; break;
      case 'clicks': valA = a.metrics.clicks; valB = b.metrics.clicks; break;
      case 'ctr': valA = a.metrics.ctr; valB = b.metrics.ctr; break;
      case 'cpc': valA = a.metrics.cpc; valB = b.metrics.cpc; break;
      case 'conversions': valA = a.metrics.conversions; valB = b.metrics.conversions; break;
      case 'date':
        valA = a.dailyMetrics.length > 0 ? new Date(a.dailyMetrics[a.dailyMetrics.length - 1].date).getTime() : 0;
        valB = b.dailyMetrics.length > 0 ? new Date(b.dailyMetrics[b.dailyMetrics.length - 1].date).getTime() : 0;
        break;
      default: valA = a.metrics.spend; valB = b.metrics.spend; break;
    }
    return (valA - valB) * multiplier;
  });

  const total = enriched.length;
  const paginated = enriched.slice(offset, offset + limit);

  return {
    creatives: paginated,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Salva uma comparacao de criativos
 */
export async function saveComparison(
  name: string,
  adIds: string[],
  platform: 'meta' | 'google',
  dateFrom?: string,
  dateTo?: string,
  filtersSnapshot?: Record<string, unknown>
): Promise<string | null> {
  const workspaceId = await getUserWorkspaceId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!workspaceId || !user) return null;

  const { data, error } = await supabase
    .from('creative_comparisons')
    .insert({
      workspace_id: workspaceId,
      name,
      ad_ids: adIds,
      platform,
      date_from: dateFrom,
      date_to: dateTo,
      filters_snapshot: filtersSnapshot || {},
      created_by: user.id,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Erro ao salvar comparacao:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Lista comparacoes salvas
 */
export async function listComparisons(platform: 'meta' | 'google') {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('creative_comparisons')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];
  return data || [];
}

/**
 * Remove uma comparacao salva
 */
export async function deleteComparison(comparisonId: string): Promise<boolean> {
  const { error } = await supabase
    .from('creative_comparisons')
    .delete()
    .eq('id', comparisonId);

  return !error;
}

/**
 * Adiciona tag a um criativo
 */
export async function addCreativeTag(adId: string, tag: string): Promise<boolean> {
  const workspaceId = await getUserWorkspaceId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!workspaceId || !user) return false;

  const { error } = await supabase
    .from('creative_tags')
    .insert({
      workspace_id: workspaceId,
      ad_id: adId,
      tag,
      created_by: user.id,
    });

  return !error;
}

/**
 * Remove tag de um criativo
 */
export async function removeCreativeTag(adId: string, tag: string): Promise<boolean> {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase
    .from('creative_tags')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('ad_id', adId)
    .eq('tag', tag);

  return !error;
}

/**
 * Busca todas as tags usadas no workspace
 */
export async function getAllTags(): Promise<string[]> {
  const workspaceId = await getUserWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('creative_tags')
    .select('tag')
    .eq('workspace_id', workspaceId);

  if (error || !data) return [];

  // Deduplica
  return [...new Set(data.map(t => t.tag))].sort();
}

// ==========================================
// Helpers para extrair dados do actions_json
// ==========================================

function extractConversions(actionsJson: unknown): number {
  const actions = parseActions(actionsJson);
  let total = 0;
  for (const action of actions) {
    const type = action?.action_type || '';
    if (
      type.includes('purchase') || type.includes('lead')
      || type.includes('complete_registration') || type.includes('add_to_cart')
      || type === 'offsite_conversion.fb_pixel_purchase' || type === 'omni_purchase'
    ) {
      total += parseFloat(action?.value || '0');
    }
  }
  return total;
}

function extractConversionValue(actionValuesJson: unknown): number {
  const actions = parseActions(actionValuesJson);
  let total = 0;
  for (const action of actions) {
    const type = action?.action_type || '';
    if (type.includes('purchase') || type === 'omni_purchase') {
      total += parseFloat(action?.value || '0');
    }
  }
  return total;
}

function extractLeads(actionsJson: unknown): number {
  const actions = parseActions(actionsJson);
  let total = 0;
  for (const action of actions) {
    const type = action?.action_type || '';
    if (type === 'lead' || type === 'onsite_conversion.lead_grouped') {
      total += parseFloat(action?.value || '0');
    }
  }
  return total;
}

function extractMessaging(actionsJson: unknown): number {
  const actions = parseActions(actionsJson);
  let total = 0;
  for (const action of actions) {
    const type = action?.action_type || '';
    if (
      type === 'onsite_conversion.messaging_conversation_started_7d'
      || type === 'onsite_conversion.messaging_first_reply'
    ) {
      total += parseFloat(action?.value || '0');
    }
  }
  return total;
}

function parseActions(json: unknown): Array<{ action_type: string; value: string }> {
  if (!json) return [];
  let parsed = json;
  if (typeof json === 'string') {
    try { parsed = JSON.parse(json); } catch { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  return [];
}

/**
 * Cria um placeholder de criativo para ads sem dados de criativo ainda
 */
function createPlaceholderCreative(adId: string, workspaceId: string): MetaAdCreative {
  return {
    id: '',
    workspace_id: workspaceId,
    ad_id: adId,
    meta_ad_account_id: '',
    meta_creative_id: null,
    creative_type: 'unknown',
    image_url: null,
    image_url_hd: null,
    thumbnail_url: null,
    thumbnail_quality: 'unknown',
    image_width: null,
    image_height: null,
    video_url: null,
    video_id: null,
    preview_url: null,
    title: null,
    body: null,
    description: null,
    call_to_action: null,
    link_url: null,
    is_complete: false,
    fetch_status: 'pending',
    fetch_attempts: 0,
    last_validated_at: null,
    error_message: null,
    extra_data: {},
    fetched_at: '',
    created_at: '',
    cached_image_url: null,
    cached_thumbnail_url: null,
    cached_video_url: null,
    cache_expires_at: null,
    video_source_url: null,
    video_duration: null,
    video_format: null,
    file_size: null,
  };
}
