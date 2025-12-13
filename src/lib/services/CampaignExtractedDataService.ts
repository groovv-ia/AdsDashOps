/**
 * CampaignExtractedDataService - Servico de Integracao de Campanhas Extraidas
 *
 * Gerencia a visualizacao de dados extraidos organizados por campanha,
 * permitindo ver conjuntos de anuncios e anuncios individuais, alem de
 * comparar performance entre diferentes periodos.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import type { SavedDataSet } from './DataSetService';

// ============================================
// Tipos e Interfaces
// ============================================

/** Representa uma campanha encontrada nos dados extraidos */
export interface ExtractedCampaign {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  data_set_ids: string[];
  total_records: number;
  date_ranges: Array<{
    data_set_id: string;
    data_set_name: string;
    start: string | null;
    end: string | null;
    record_count: number;
  }>;
}

/** Metricas agregadas de uma campanha */
export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
}

/** Dados de um conjunto de anuncios (adset) */
export interface AdSetData {
  adset_id: string;
  adset_name: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
}

/** Dados de um anuncio individual */
export interface AdData {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
  thumbnail_url?: string;
}

/** Resultado da comparacao entre dois periodos */
export interface PeriodComparison {
  period1: {
    name: string;
    start: string | null;
    end: string | null;
    metrics: CampaignMetrics;
  };
  period2: {
    name: string;
    start: string | null;
    end: string | null;
    metrics: CampaignMetrics;
  };
  variations: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
  };
}

/** Dados de tendencia temporal */
export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Extrai valor numerico de um campo, tratando diferentes formatos
 */
function extractNumericValue(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

/**
 * Calcula metricas derivadas a partir de metricas basicas
 */
function calculateDerivedMetrics(metrics: Partial<CampaignMetrics>): CampaignMetrics {
  const impressions = metrics.impressions || 0;
  const clicks = metrics.clicks || 0;
  const spend = metrics.spend || 0;
  const conversions = metrics.conversions || 0;
  const reach = metrics.reach || 0;

  return {
    impressions,
    clicks,
    spend,
    conversions,
    reach,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    roas: spend > 0 ? (conversions * 100) / spend : 0,
    frequency: reach > 0 ? impressions / reach : 0,
  };
}

/**
 * Calcula variacao percentual entre dois valores
 */
function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ============================================
// Classe Principal
// ============================================

export class CampaignExtractedDataService {
  /**
   * Lista todas as campanhas encontradas nos dados extraidos do usuario
   */
  async getCampaignsFromDataSets(): Promise<{
    success: boolean;
    campaigns?: ExtractedCampaign[];
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar todos os data sets do usuario
      const { data: dataSets, error } = await supabase
        .from('saved_data_sets')
        .select('id, name, platform, data, date_range_start, date_range_end, record_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar data sets', { error });
        return { success: false, error: error.message };
      }

      // Mapa para agregar campanhas
      const campaignsMap = new Map<string, ExtractedCampaign>();

      // Iterar pelos data sets e extrair campanhas
      for (const ds of dataSets || []) {
        const records = ds.data as Record<string, any>[];
        if (!Array.isArray(records)) continue;

        // Identificar campanhas unicas neste data set
        const campaignsInDataSet = new Set<string>();

        for (const record of records) {
          // Tentar encontrar ID e nome da campanha
          const campaignId = record.campaign_id || record.campaignId || record.campaign;
          const campaignName = record.campaign_name || record.campaignName || record.campaign_name || `Campanha ${campaignId}`;

          if (!campaignId) continue;

          const key = String(campaignId);

          if (!campaignsMap.has(key)) {
            campaignsMap.set(key, {
              campaign_id: key,
              campaign_name: campaignName,
              platform: ds.platform,
              data_set_ids: [],
              total_records: 0,
              date_ranges: [],
            });
          }

          campaignsInDataSet.add(key);
        }

        // Adicionar info do data set as campanhas encontradas
        for (const campaignId of campaignsInDataSet) {
          const campaign = campaignsMap.get(campaignId)!;

          if (!campaign.data_set_ids.includes(ds.id)) {
            campaign.data_set_ids.push(ds.id);
            campaign.date_ranges.push({
              data_set_id: ds.id,
              data_set_name: ds.name,
              start: ds.date_range_start,
              end: ds.date_range_end,
              record_count: records.filter(r =>
                (r.campaign_id || r.campaignId || r.campaign) === campaignId
              ).length,
            });
          }

          campaign.total_records = campaign.date_ranges.reduce(
            (sum, dr) => sum + dr.record_count,
            0
          );
        }
      }

      const campaigns = Array.from(campaignsMap.values());

      logger.info('Campanhas extraidas listadas', { count: campaigns.length });

      return { success: true, campaigns };
    } catch (error: any) {
      logger.error('Erro ao listar campanhas extraidas', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca os conjuntos de anuncios (adsets) de uma campanha em um data set
   */
  async getAdSetsFromExtractedData(
    campaignId: string,
    dataSetId: string
  ): Promise<{
    success: boolean;
    adSets?: AdSetData[];
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar data set
      const { data: dataSet, error } = await supabase
        .from('saved_data_sets')
        .select('data')
        .eq('id', dataSetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, dataSetId });
        return { success: false, error: error.message };
      }

      if (!dataSet) {
        return { success: false, error: 'Conjunto de dados nao encontrado' };
      }

      const records = dataSet.data as Record<string, any>[];
      if (!Array.isArray(records)) {
        return { success: true, adSets: [] };
      }

      // Filtrar registros da campanha e agrupar por adset
      const adSetMap = new Map<string, AdSetData>();

      for (const record of records) {
        const recordCampaignId = record.campaign_id || record.campaignId || record.campaign;
        if (String(recordCampaignId) !== campaignId) continue;

        const adSetId = record.adset_id || record.adsetId || record.ad_set_id;
        if (!adSetId) continue;

        const key = String(adSetId);

        if (!adSetMap.has(key)) {
          adSetMap.set(key, {
            adset_id: key,
            adset_name: record.adset_name || record.adsetName || record.ad_set_name || `Conjunto ${adSetId}`,
            status: record.adset_status || record.status || 'UNKNOWN',
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0,
            cpm: 0,
            roas: 0,
            reach: 0,
            frequency: 0,
          });
        }

        const adSet = adSetMap.get(key)!;

        // Acumular metricas
        adSet.impressions += extractNumericValue(record.impressions);
        adSet.clicks += extractNumericValue(record.clicks);
        adSet.spend += extractNumericValue(record.spend || record.amount_spent);
        adSet.conversions += extractNumericValue(record.conversions || record.results);
        adSet.reach += extractNumericValue(record.reach);
      }

      // Calcular metricas derivadas
      const adSets = Array.from(adSetMap.values()).map(adSet =>
        calculateDerivedMetrics(adSet) as AdSetData
      ).map((metrics, index) => ({
        ...Array.from(adSetMap.values())[index],
        ...metrics,
      }));

      // Ordenar por gastos (maior primeiro)
      adSets.sort((a, b) => b.spend - a.spend);

      logger.info('AdSets extraidos', { campaignId, count: adSets.length });

      return { success: true, adSets };
    } catch (error: any) {
      logger.error('Erro ao buscar adsets extraidos', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca os anuncios individuais de uma campanha em um data set
   */
  async getAdsFromExtractedData(
    campaignId: string,
    dataSetId: string,
    adSetId?: string
  ): Promise<{
    success: boolean;
    ads?: AdData[];
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar data set
      const { data: dataSet, error } = await supabase
        .from('saved_data_sets')
        .select('data')
        .eq('id', dataSetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, dataSetId });
        return { success: false, error: error.message };
      }

      if (!dataSet) {
        return { success: false, error: 'Conjunto de dados nao encontrado' };
      }

      const records = dataSet.data as Record<string, any>[];
      if (!Array.isArray(records)) {
        return { success: true, ads: [] };
      }

      // Filtrar registros da campanha e agrupar por anuncio
      const adMap = new Map<string, AdData>();

      for (const record of records) {
        const recordCampaignId = record.campaign_id || record.campaignId || record.campaign;
        if (String(recordCampaignId) !== campaignId) continue;

        // Filtrar por adset se especificado
        if (adSetId) {
          const recordAdSetId = record.adset_id || record.adsetId || record.ad_set_id;
          if (String(recordAdSetId) !== adSetId) continue;
        }

        const adId = record.ad_id || record.adId;
        if (!adId) continue;

        const key = String(adId);

        if (!adMap.has(key)) {
          adMap.set(key, {
            ad_id: key,
            ad_name: record.ad_name || record.adName || `Anuncio ${adId}`,
            adset_id: record.adset_id || record.adsetId || record.ad_set_id || '',
            adset_name: record.adset_name || record.adsetName || record.ad_set_name || '',
            status: record.ad_status || record.status || 'UNKNOWN',
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0,
            cpm: 0,
            roas: 0,
            reach: 0,
            frequency: 0,
            thumbnail_url: record.thumbnail_url || record.image_url,
          });
        }

        const ad = adMap.get(key)!;

        // Acumular metricas
        ad.impressions += extractNumericValue(record.impressions);
        ad.clicks += extractNumericValue(record.clicks);
        ad.spend += extractNumericValue(record.spend || record.amount_spent);
        ad.conversions += extractNumericValue(record.conversions || record.results);
        ad.reach += extractNumericValue(record.reach);
      }

      // Calcular metricas derivadas
      const ads = Array.from(adMap.values()).map(ad => {
        const metrics = calculateDerivedMetrics(ad);
        return {
          ...ad,
          ...metrics,
        };
      });

      // Ordenar por gastos (maior primeiro)
      ads.sort((a, b) => b.spend - a.spend);

      logger.info('Ads extraidos', { campaignId, count: ads.length });

      return { success: true, ads };
    } catch (error: any) {
      logger.error('Erro ao buscar ads extraidos', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calcula metricas agregadas de uma campanha em um data set
   */
  async getCampaignMetrics(
    campaignId: string,
    dataSetId: string
  ): Promise<{
    success: boolean;
    metrics?: CampaignMetrics;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar data set
      const { data: dataSet, error } = await supabase
        .from('saved_data_sets')
        .select('data')
        .eq('id', dataSetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, dataSetId });
        return { success: false, error: error.message };
      }

      if (!dataSet) {
        return { success: false, error: 'Conjunto de dados nao encontrado' };
      }

      const records = dataSet.data as Record<string, any>[];
      if (!Array.isArray(records)) {
        return { success: true, metrics: calculateDerivedMetrics({}) };
      }

      // Acumular metricas da campanha
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;
      let totalReach = 0;

      for (const record of records) {
        const recordCampaignId = record.campaign_id || record.campaignId || record.campaign;
        if (String(recordCampaignId) !== campaignId) continue;

        totalImpressions += extractNumericValue(record.impressions);
        totalClicks += extractNumericValue(record.clicks);
        totalSpend += extractNumericValue(record.spend || record.amount_spent);
        totalConversions += extractNumericValue(record.conversions || record.results);
        totalReach += extractNumericValue(record.reach);
      }

      const metrics = calculateDerivedMetrics({
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions,
        reach: totalReach,
      });

      return { success: true, metrics };
    } catch (error: any) {
      logger.error('Erro ao calcular metricas', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Compara metricas de uma campanha entre dois periodos/data sets
   */
  async comparePeriods(
    campaignId: string,
    dataSetId1: string,
    dataSetId2: string
  ): Promise<{
    success: boolean;
    comparison?: PeriodComparison;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar ambos os data sets
      const { data: dataSets, error } = await supabase
        .from('saved_data_sets')
        .select('id, name, date_range_start, date_range_end, data')
        .in('id', [dataSetId1, dataSetId2])
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao buscar data sets para comparacao', { error });
        return { success: false, error: error.message };
      }

      if (!dataSets || dataSets.length < 2) {
        return { success: false, error: 'Data sets nao encontrados' };
      }

      const ds1 = dataSets.find(ds => ds.id === dataSetId1)!;
      const ds2 = dataSets.find(ds => ds.id === dataSetId2)!;

      // Calcular metricas de cada periodo
      const metrics1Result = await this.getCampaignMetrics(campaignId, dataSetId1);
      const metrics2Result = await this.getCampaignMetrics(campaignId, dataSetId2);

      if (!metrics1Result.success || !metrics2Result.success) {
        return { success: false, error: 'Erro ao calcular metricas' };
      }

      const m1 = metrics1Result.metrics!;
      const m2 = metrics2Result.metrics!;

      // Calcular variacoes (periodo 2 comparado ao periodo 1)
      const comparison: PeriodComparison = {
        period1: {
          name: ds1.name,
          start: ds1.date_range_start,
          end: ds1.date_range_end,
          metrics: m1,
        },
        period2: {
          name: ds2.name,
          start: ds2.date_range_start,
          end: ds2.date_range_end,
          metrics: m2,
        },
        variations: {
          impressions: calculateVariation(m2.impressions, m1.impressions),
          clicks: calculateVariation(m2.clicks, m1.clicks),
          spend: calculateVariation(m2.spend, m1.spend),
          conversions: calculateVariation(m2.conversions, m1.conversions),
          ctr: calculateVariation(m2.ctr, m1.ctr),
          cpc: calculateVariation(m2.cpc, m1.cpc),
          cpm: calculateVariation(m2.cpm, m1.cpm),
          roas: calculateVariation(m2.roas, m1.roas),
        },
      };

      logger.info('Comparacao de periodos calculada', { campaignId });

      return { success: true, comparison };
    } catch (error: any) {
      logger.error('Erro ao comparar periodos', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca dados de tendencia temporal de uma campanha
   */
  async getTrendData(
    campaignId: string,
    dataSetId: string
  ): Promise<{
    success: boolean;
    trendData?: TrendDataPoint[];
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      // Buscar data set
      const { data: dataSet, error } = await supabase
        .from('saved_data_sets')
        .select('data')
        .eq('id', dataSetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, dataSetId });
        return { success: false, error: error.message };
      }

      if (!dataSet) {
        return { success: false, error: 'Conjunto de dados nao encontrado' };
      }

      const records = dataSet.data as Record<string, any>[];
      if (!Array.isArray(records)) {
        return { success: true, trendData: [] };
      }

      // Agrupar por data
      const dateMap = new Map<string, TrendDataPoint>();

      for (const record of records) {
        const recordCampaignId = record.campaign_id || record.campaignId || record.campaign;
        if (String(recordCampaignId) !== campaignId) continue;

        const date = record.date || record.date_start || record.day;
        if (!date) continue;

        const dateKey = String(date).substring(0, 10);

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
          });
        }

        const point = dateMap.get(dateKey)!;
        point.impressions += extractNumericValue(record.impressions);
        point.clicks += extractNumericValue(record.clicks);
        point.spend += extractNumericValue(record.spend || record.amount_spent);
        point.conversions += extractNumericValue(record.conversions || record.results);
      }

      // Ordenar por data
      const trendData = Array.from(dateMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date)
      );

      return { success: true, trendData };
    } catch (error: any) {
      logger.error('Erro ao buscar dados de tendencia', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca detalhes de um data set especifico
   */
  async getDataSetDetails(dataSetId: string): Promise<{
    success: boolean;
    dataSet?: SavedDataSet;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuario nao autenticado' };
      }

      const { data, error } = await supabase
        .from('saved_data_sets')
        .select('*')
        .eq('id', dataSetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, dataSetId });
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Conjunto de dados nao encontrado' };
      }

      return { success: true, dataSet: data as SavedDataSet };
    } catch (error: any) {
      logger.error('Erro ao buscar data set', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

// Exporta instancia singleton para uso direto
export const campaignExtractedDataService = new CampaignExtractedDataService();
