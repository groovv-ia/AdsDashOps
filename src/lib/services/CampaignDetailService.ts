/**
 * CampaignDetailService
 *
 * Servico que busca a hierarquia completa de uma campanha em tempo real:
 * Campanha > Conjuntos de Anuncios > Anuncios
 *
 * Utiliza a mesma edge function meta-insights-fetch, filtrando client-side
 * pelo campaign_id ou adset_id para exibir somente as entidades desejadas.
 *
 * Fallback para MetaInsightsDataService (banco) quando API falha.
 */

import {
  fetchRealTimeInsights,
  processToTotalsByEntity,
  processDailyData,
  type MetaInsightRow,
  type PeriodMetrics,
  type DailyInsightRow,
  type RealTimeInsightsResponse,
} from './MetaRealTimeService';
import { MetaInsightsDataService } from './MetaInsightsDataService';
import { logger } from '../utils/logger';

// ============================================
// Tipos
// ============================================

/** Metrica de entidade com campos de hierarquia preservados */
export interface HierarchyMetrics extends PeriodMetrics {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
}

/** Parametros para buscar hierarquia de uma campanha */
export interface CampaignHierarchyParams {
  meta_ad_account_id: string;
  campaign_entity_id: string;
  campaign_name?: string;
  date_from: string;
  date_to: string;
}

/** Resultado da hierarquia completa da campanha */
export interface CampaignHierarchyResult {
  adSets: HierarchyMetrics[];
  ads: HierarchyMetrics[];
  dailyCampaign: DailyInsightRow[];
  source: 'realtime' | 'database';
}

/** Parametros para buscar ads de um AdSet */
export interface AdSetDetailParams {
  meta_ad_account_id: string;
  adset_entity_id: string;
  campaign_entity_id: string;
  date_from: string;
  date_to: string;
}

/** Resultado dos ads de um AdSet */
export interface AdSetDetailResult {
  ads: HierarchyMetrics[];
  dailyAdSet: DailyInsightRow[];
  source: 'realtime' | 'database';
}

// ============================================
// Funcoes de Processamento
// ============================================

/**
 * Processa totais preservando campos de hierarquia (campaign_id, adset_id).
 * Similar ao processToTotalsByEntity mas mantém informacoes de parentesco.
 */
function processWithHierarchy(
  rows: MetaInsightRow[],
  level: 'adset' | 'ad'
): HierarchyMetrics[] {
  // Primeiro processa as metricas normalmente
  const processed = processToTotalsByEntity(rows, level);

  // Enriquece com campos de hierarquia a partir das rows originais
  return processed.map(metric => {
    // Encontra a row original correspondente
    const matchingRow = rows.find(row => {
      if (level === 'adset') return row.adset_id === metric.entity_id;
      return row.ad_id === metric.entity_id;
    });

    return {
      ...metric,
      campaign_id: matchingRow?.campaign_id,
      campaign_name: matchingRow?.campaign_name,
      adset_id: level === 'ad' ? matchingRow?.adset_id : undefined,
      adset_name: level === 'ad' ? matchingRow?.adset_name : undefined,
    };
  });
}

/**
 * Filtra rows brutas por campaign_id
 */
function filterByCampaign(rows: MetaInsightRow[], campaignId: string): MetaInsightRow[] {
  return rows.filter(row => row.campaign_id === campaignId);
}

/**
 * Filtra rows brutas por adset_id
 */
function filterByAdSet(rows: MetaInsightRow[], adsetId: string): MetaInsightRow[] {
  return rows.filter(row => row.adset_id === adsetId);
}

// ============================================
// Funcoes Principais
// ============================================

/**
 * Busca a hierarquia completa de uma campanha (adsets + ads) em tempo real.
 * Filtra client-side pelo campaign_id a partir dos dados da conta inteira.
 */
export async function fetchCampaignHierarchy(
  params: CampaignHierarchyParams
): Promise<CampaignHierarchyResult> {
  const { meta_ad_account_id, campaign_entity_id, date_from, date_to } = params;

  try {
    logger.info('Buscando hierarquia da campanha em tempo real', {
      campaign: campaign_entity_id,
      period: `${date_from} a ${date_to}`,
    });

    // Busca dados em paralelo: adsets (com daily) e ads (apenas totais)
    const [adSetsResponse, adsResponse, campaignDailyResponse] = await Promise.all([
      fetchRealTimeInsights({
        meta_ad_account_id,
        level: 'adset',
        date_from,
        date_to,
        mode: 'totals',
      }),
      fetchRealTimeInsights({
        meta_ad_account_id,
        level: 'ad',
        date_from,
        date_to,
        mode: 'totals',
      }),
      fetchRealTimeInsights({
        meta_ad_account_id,
        level: 'campaign',
        date_from,
        date_to,
        mode: 'daily',
      }),
    ]);

    // Filtra somente as entidades desta campanha
    const campaignAdSetRows = filterByCampaign(adSetsResponse.totals, campaign_entity_id);
    const campaignAdRows = filterByCampaign(adsResponse.totals, campaign_entity_id);
    const campaignDailyRows = campaignDailyResponse.daily.filter(
      row => row.campaign_id === campaign_entity_id
    );

    // Processa mantendo hierarquia
    const adSets = processWithHierarchy(campaignAdSetRows, 'adset');
    const ads = processWithHierarchy(campaignAdRows, 'ad');
    const dailyCampaign = processDailyData(campaignDailyRows, 'campaign');

    logger.info('Hierarquia carregada com sucesso', {
      adSets: adSets.length,
      ads: ads.length,
      dailyPoints: dailyCampaign.length,
    });

    return { adSets, ads, dailyCampaign, source: 'realtime' };
  } catch (error) {
    logger.warn('Falha no real-time, tentando fallback para banco', { error });
    return fetchCampaignHierarchyFromDB(params);
  }
}

/**
 * Busca detalhes de um AdSet especifico (ads filhos) em tempo real.
 */
export async function fetchAdSetDetail(
  params: AdSetDetailParams
): Promise<AdSetDetailResult> {
  const { meta_ad_account_id, adset_entity_id, campaign_entity_id, date_from, date_to } = params;

  try {
    logger.info('Buscando ads do adset em tempo real', {
      adset: adset_entity_id,
      campaign: campaign_entity_id,
    });

    // Busca todos os ads da conta (com daily para o adset)
    const [adsResponse, adsetDailyResponse] = await Promise.all([
      fetchRealTimeInsights({
        meta_ad_account_id,
        level: 'ad',
        date_from,
        date_to,
        mode: 'totals',
      }),
      fetchRealTimeInsights({
        meta_ad_account_id,
        level: 'adset',
        date_from,
        date_to,
        mode: 'daily',
      }),
    ]);

    // Filtra ads pelo adset_id
    const adsetAdRows = filterByAdSet(adsResponse.totals, adset_entity_id);
    const ads = processWithHierarchy(adsetAdRows, 'ad');

    // Filtra daily pelo adset_id
    const adsetDailyRows = adsetDailyResponse.daily.filter(
      row => row.adset_id === adset_entity_id
    );
    const dailyAdSet = processDailyData(adsetDailyRows, 'adset');

    logger.info('Detalhe do AdSet carregado', {
      ads: ads.length,
      dailyPoints: dailyAdSet.length,
    });

    return { ads, dailyAdSet, source: 'realtime' };
  } catch (error) {
    logger.warn('Falha no real-time para adset, tentando fallback', { error });
    return fetchAdSetDetailFromDB(params);
  }
}

// ============================================
// Fallbacks para Banco de Dados
// ============================================

/**
 * Fallback: busca hierarquia da campanha a partir do meta_insights_daily
 */
async function fetchCampaignHierarchyFromDB(
  params: CampaignHierarchyParams
): Promise<CampaignHierarchyResult> {
  const service = new MetaInsightsDataService();
  const { campaign_entity_id, date_from, date_to } = params;

  try {
    const [adSetsData, adsData, dailyData] = await Promise.all([
      service.fetchCampaignAdSets(campaign_entity_id, { dateFrom: date_from, dateTo: date_to }),
      service.fetchCampaignAds(campaign_entity_id, { dateFrom: date_from, dateTo: date_to }),
      service.fetchDailyMetrics(campaign_entity_id, { dateFrom: date_from, dateTo: date_to }),
    ]);

    // Converte MetaCampaignData para HierarchyMetrics
    const adSets: HierarchyMetrics[] = adSetsData.map(as => ({
      entity_id: as.entity_id,
      entity_name: as.entity_name,
      level: 'adset' as const,
      spend: as.metrics.spend,
      impressions: as.metrics.impressions,
      reach: as.metrics.reach,
      clicks: as.metrics.clicks,
      ctr: as.metrics.ctr,
      cpc: as.metrics.cpc,
      cpm: as.metrics.cpm,
      frequency: as.metrics.frequency,
      unique_clicks: 0,
      leads: as.metrics.leads,
      conversions: as.metrics.conversions,
      conversion_value: as.metrics.conversion_value,
      purchase_value: as.metrics.conversion_value,
      messaging_conversations_started: as.metrics.messaging_conversations_started,
      page_likes: 0,
      roas: as.metrics.roas,
      cost_per_result: as.metrics.cost_per_result,
      cost_per_lead: as.metrics.cost_per_lead,
      cost_per_messaging_conversation: as.metrics.cost_per_messaging_conversation_started,
      campaign_id: campaign_entity_id,
      campaign_name: params.campaign_name,
    }));

    const ads: HierarchyMetrics[] = adsData.map(ad => ({
      entity_id: ad.entity_id,
      entity_name: ad.entity_name,
      level: 'ad' as const,
      spend: ad.metrics.spend,
      impressions: ad.metrics.impressions,
      reach: ad.metrics.reach,
      clicks: ad.metrics.clicks,
      ctr: ad.metrics.ctr,
      cpc: ad.metrics.cpc,
      cpm: ad.metrics.cpm,
      frequency: ad.metrics.frequency,
      unique_clicks: 0,
      leads: ad.metrics.leads,
      conversions: ad.metrics.conversions,
      conversion_value: ad.metrics.conversion_value,
      purchase_value: ad.metrics.conversion_value,
      messaging_conversations_started: ad.metrics.messaging_conversations_started,
      page_likes: 0,
      roas: ad.metrics.roas,
      cost_per_result: ad.metrics.cost_per_result,
      cost_per_lead: ad.metrics.cost_per_lead,
      cost_per_messaging_conversation: ad.metrics.cost_per_messaging_conversation_started,
      campaign_id: campaign_entity_id,
      adset_id: ad.adset_id,
      adset_name: ad.adset_name,
    }));

    // Converte daily para DailyInsightRow
    const dailyCampaign: DailyInsightRow[] = dailyData.map(d => ({
      id: `${d.entity_id}_${d.date}`,
      level: 'campaign',
      entity_id: d.entity_id,
      entity_name: d.entity_name,
      date: d.date,
      spend: d.spend,
      impressions: d.impressions,
      reach: d.reach,
      clicks: d.clicks,
      ctr: d.ctr,
      cpc: d.cpc,
      cpm: d.cpm,
      frequency: d.frequency,
      leads: d.leads,
      conversions: d.conversions,
      conversion_value: d.conversion_value,
      purchase_value: d.conversion_value,
      messaging_conversations_started: d.messaging_conversations_started,
      page_likes: 0,
    }));

    return { adSets, ads, dailyCampaign, source: 'database' };
  } catch (error) {
    logger.error('Falha ao buscar hierarquia do banco', error);
    return { adSets: [], ads: [], dailyCampaign: [], source: 'database' };
  }
}

/**
 * Fallback: busca ads do adset a partir do banco
 */
async function fetchAdSetDetailFromDB(
  params: AdSetDetailParams
): Promise<AdSetDetailResult> {
  const service = new MetaInsightsDataService();
  const { campaign_entity_id, adset_entity_id, date_from, date_to } = params;

  try {
    const adsData = await service.fetchCampaignAds(campaign_entity_id, {
      dateFrom: date_from,
      dateTo: date_to,
    });

    // Filtra apenas ads deste adset
    const filteredAds = adsData.filter(ad => ad.adset_id === adset_entity_id);

    const ads: HierarchyMetrics[] = filteredAds.map(ad => ({
      entity_id: ad.entity_id,
      entity_name: ad.entity_name,
      level: 'ad' as const,
      spend: ad.metrics.spend,
      impressions: ad.metrics.impressions,
      reach: ad.metrics.reach,
      clicks: ad.metrics.clicks,
      ctr: ad.metrics.ctr,
      cpc: ad.metrics.cpc,
      cpm: ad.metrics.cpm,
      frequency: ad.metrics.frequency,
      unique_clicks: 0,
      leads: ad.metrics.leads,
      conversions: ad.metrics.conversions,
      conversion_value: ad.metrics.conversion_value,
      purchase_value: ad.metrics.conversion_value,
      messaging_conversations_started: ad.metrics.messaging_conversations_started,
      page_likes: 0,
      roas: ad.metrics.roas,
      cost_per_result: ad.metrics.cost_per_result,
      cost_per_lead: ad.metrics.cost_per_lead,
      cost_per_messaging_conversation: ad.metrics.cost_per_messaging_conversation_started,
      campaign_id: campaign_entity_id,
      adset_id: adset_entity_id,
    }));

    return { ads, dailyAdSet: [], source: 'database' };
  } catch (error) {
    logger.error('Falha ao buscar detalhe do adset no banco', error);
    return { ads: [], dailyAdSet: [], source: 'database' };
  }
}
