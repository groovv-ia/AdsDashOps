/**
 * CampaignExtractedDataService - Servico de Visualizacao de Dados de Campanhas
 *
 * Gerencia a visualizacao de dados de campanhas sincronizados,
 * permitindo ver conjuntos de anuncios, anuncios individuais e metricas.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';

// ============================================
// Tipos e Interfaces
// ============================================

/** Representa uma campanha com informacoes basicas */
export interface ExtractedCampaign {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  status: string;
  objective: string | null;
  created_date: string | null;
  ad_sets_count: number;
  ads_count: number;
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
  // Novas metricas de conversas e leads
  messaging_conversations_started: number;
  cost_per_messaging_conversation_started: number;
  leads: number;
  cost_per_lead: number;
}

/** Dados de um conjunto de anuncios (adset) */
export interface AdSetData {
  adset_id: string;
  adset_name: string;
  status: string;
  campaign_id: string;
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
  ads_count: number;
  // Novas metricas de conversas e leads
  messaging_conversations_started: number;
  cost_per_messaging_conversation_started: number;
  leads: number;
  cost_per_lead: number;
}

/** Dados de um anuncio individual */
export interface AdData {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
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
  // Novas metricas de conversas e leads
  messaging_conversations_started: number;
  cost_per_messaging_conversation_started: number;
  leads: number;
  cost_per_lead: number;
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
   * Lista todas as campanhas sincronizadas do usuario
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

      // Buscar campanhas do usuario
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          platform,
          status,
          objective,
          created_date,
          ad_sets!ad_sets_campaign_id_fkey(id),
          ads!ads_campaign_id_fkey(id)
        `)
        .eq('user_id', user.id)
        .order('created_date', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar campanhas', { error });
        return { success: false, error: error.message };
      }

      // Mapear para o formato de saida
      const mappedCampaigns: ExtractedCampaign[] = (campaigns || []).map((c: any) => ({
        campaign_id: c.id,
        campaign_name: c.name,
        platform: c.platform,
        status: c.status || 'UNKNOWN',
        objective: c.objective,
        created_date: c.created_date,
        ad_sets_count: Array.isArray(c.ad_sets) ? c.ad_sets.length : 0,
        ads_count: Array.isArray(c.ads) ? c.ads.length : 0,
      }));

      logger.info('Campanhas listadas', { count: mappedCampaigns.length });

      return { success: true, campaigns: mappedCampaigns };
    } catch (error: any) {
      logger.error('Erro ao listar campanhas', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca os conjuntos de anuncios (adsets) de uma campanha
   */
  async getAdSetsFromExtractedData(
    campaignId: string,
    _dataSetId?: string
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

      // Buscar adsets da campanha
      const { data: adSets, error } = await supabase
        .from('ad_sets')
        .select(`
          id,
          name,
          status,
          campaign_id,
          daily_budget,
          lifetime_budget,
          ads!ads_ad_set_id_fkey(id)
        `)
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao buscar ad sets', { error, campaignId });
        return { success: false, error: error.message };
      }

      // Buscar metricas agregadas por adset
      const { data: metrics, error: metricsError } = await supabase
        .from('ad_metrics')
        .select('ad_set_id, impressions, clicks, spend, conversions, reach')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      // Agregar metricas por adset
      const metricsMap = new Map<string, { impressions: number; clicks: number; spend: number; conversions: number; reach: number }>();

      if (metrics && !metricsError) {
        for (const m of metrics) {
          if (!m.ad_set_id) continue;

          const existing = metricsMap.get(m.ad_set_id) || {
            impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0
          };

          existing.impressions += Number(m.impressions) || 0;
          existing.clicks += Number(m.clicks) || 0;
          existing.spend += Number(m.spend) || 0;
          existing.conversions += Number(m.conversions) || 0;
          existing.reach += Number(m.reach) || 0;

          metricsMap.set(m.ad_set_id, existing);
        }
      }

      // Mapear para o formato de saida
      const mappedAdSets: AdSetData[] = (adSets || []).map((as: any) => {
        const asMetrics = metricsMap.get(as.id) || {
          impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0
        };

        const derived = calculateDerivedMetrics(asMetrics);

        return {
          adset_id: as.id,
          adset_name: as.name,
          status: as.status || 'UNKNOWN',
          campaign_id: as.campaign_id,
          ads_count: Array.isArray(as.ads) ? as.ads.length : 0,
          ...derived,
        };
      });

      // Ordenar por gastos (maior primeiro)
      mappedAdSets.sort((a, b) => b.spend - a.spend);

      logger.info('AdSets carregados', { campaignId, count: mappedAdSets.length });

      return { success: true, adSets: mappedAdSets };
    } catch (error: any) {
      logger.error('Erro ao buscar adsets', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca os anuncios individuais de uma campanha
   */
  async getAdsFromExtractedData(
    campaignId: string,
    _dataSetId?: string,
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

      // Query base para anuncios
      let query = supabase
        .from('ads')
        .select(`
          id,
          name,
          status,
          campaign_id,
          ad_set_id,
          thumbnail_url,
          ad_sets!ads_ad_set_id_fkey(name)
        `)
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      // Filtrar por adset se especificado
      if (adSetId) {
        query = query.eq('ad_set_id', adSetId);
      }

      const { data: ads, error } = await query;

      if (error) {
        logger.error('Erro ao buscar anuncios', { error, campaignId });
        return { success: false, error: error.message };
      }

      // Buscar metricas agregadas por anuncio
      let metricsQuery = supabase
        .from('ad_metrics')
        .select('ad_id, impressions, clicks, spend, conversions, reach')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      if (adSetId) {
        metricsQuery = metricsQuery.eq('ad_set_id', adSetId);
      }

      const { data: metrics, error: metricsError } = await metricsQuery;

      // Agregar metricas por anuncio
      const metricsMap = new Map<string, { impressions: number; clicks: number; spend: number; conversions: number; reach: number }>();

      if (metrics && !metricsError) {
        for (const m of metrics) {
          if (!m.ad_id) continue;

          const existing = metricsMap.get(m.ad_id) || {
            impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0
          };

          existing.impressions += Number(m.impressions) || 0;
          existing.clicks += Number(m.clicks) || 0;
          existing.spend += Number(m.spend) || 0;
          existing.conversions += Number(m.conversions) || 0;
          existing.reach += Number(m.reach) || 0;

          metricsMap.set(m.ad_id, existing);
        }
      }

      // Mapear para o formato de saida
      const mappedAds: AdData[] = (ads || []).map((ad: any) => {
        const adMetrics = metricsMap.get(ad.id) || {
          impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0
        };

        const derived = calculateDerivedMetrics(adMetrics);

        return {
          ad_id: ad.id,
          ad_name: ad.name,
          adset_id: ad.ad_set_id || '',
          adset_name: ad.ad_sets?.name || '',
          campaign_id: ad.campaign_id,
          status: ad.status || 'UNKNOWN',
          thumbnail_url: ad.thumbnail_url,
          ...derived,
        };
      });

      // Ordenar por gastos (maior primeiro)
      mappedAds.sort((a, b) => b.spend - a.spend);

      logger.info('Anuncios carregados', { campaignId, count: mappedAds.length });

      return { success: true, ads: mappedAds };
    } catch (error: any) {
      logger.error('Erro ao buscar anuncios', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calcula metricas agregadas de uma campanha
   */
  async getCampaignMetrics(
    campaignId: string,
    _dataSetId?: string
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

      // Buscar metricas da campanha
      const { data: metrics, error } = await supabase
        .from('ad_metrics')
        .select('impressions, clicks, spend, conversions, reach')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao buscar metricas', { error, campaignId });
        return { success: false, error: error.message };
      }

      // Agregar metricas
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;
      let totalReach = 0;

      for (const m of metrics || []) {
        totalImpressions += Number(m.impressions) || 0;
        totalClicks += Number(m.clicks) || 0;
        totalSpend += Number(m.spend) || 0;
        totalConversions += Number(m.conversions) || 0;
        totalReach += Number(m.reach) || 0;
      }

      const calculatedMetrics = calculateDerivedMetrics({
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions,
        reach: totalReach,
      });

      return { success: true, metrics: calculatedMetrics };
    } catch (error: any) {
      logger.error('Erro ao calcular metricas', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Compara metricas de uma campanha entre dois periodos
   */
  async comparePeriods(
    campaignId: string,
    dateFrom1: string,
    dateTo1: string,
    dateFrom2: string,
    dateTo2: string
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

      // Buscar metricas do periodo 1
      const { data: metrics1, error: error1 } = await supabase
        .from('ad_metrics')
        .select('impressions, clicks, spend, conversions, reach')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .gte('date', dateFrom1)
        .lte('date', dateTo1);

      // Buscar metricas do periodo 2
      const { data: metrics2, error: error2 } = await supabase
        .from('ad_metrics')
        .select('impressions, clicks, spend, conversions, reach')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .gte('date', dateFrom2)
        .lte('date', dateTo2);

      if (error1 || error2) {
        return { success: false, error: 'Erro ao buscar metricas para comparacao' };
      }

      // Agregar metricas de cada periodo
      const aggregate = (data: any[]) => {
        let imp = 0, cli = 0, spe = 0, con = 0, rea = 0;
        for (const m of data || []) {
          imp += Number(m.impressions) || 0;
          cli += Number(m.clicks) || 0;
          spe += Number(m.spend) || 0;
          con += Number(m.conversions) || 0;
          rea += Number(m.reach) || 0;
        }
        return calculateDerivedMetrics({ impressions: imp, clicks: cli, spend: spe, conversions: con, reach: rea });
      };

      const m1 = aggregate(metrics1 || []);
      const m2 = aggregate(metrics2 || []);

      const comparison: PeriodComparison = {
        period1: {
          name: `${dateFrom1} - ${dateTo1}`,
          start: dateFrom1,
          end: dateTo1,
          metrics: m1,
        },
        period2: {
          name: `${dateFrom2} - ${dateTo2}`,
          start: dateFrom2,
          end: dateTo2,
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
    _dataSetId?: string
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

      // Buscar metricas agrupadas por data
      const { data: metrics, error } = await supabase
        .from('ad_metrics')
        .select('date, impressions, clicks, spend, conversions')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) {
        logger.error('Erro ao buscar tendencia', { error, campaignId });
        return { success: false, error: error.message };
      }

      // Agrupar por data
      const dateMap = new Map<string, TrendDataPoint>();

      for (const m of metrics || []) {
        const dateKey = String(m.date);

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
        point.impressions += Number(m.impressions) || 0;
        point.clicks += Number(m.clicks) || 0;
        point.spend += Number(m.spend) || 0;
        point.conversions += Number(m.conversions) || 0;
      }

      const trendData = Array.from(dateMap.values());

      return { success: true, trendData };
    } catch (error: any) {
      logger.error('Erro ao buscar tendencia', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

// Exporta instancia singleton para uso direto
export const campaignExtractedDataService = new CampaignExtractedDataService();
