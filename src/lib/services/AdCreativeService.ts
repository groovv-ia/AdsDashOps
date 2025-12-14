/**
 * AdCreativeService
 *
 * Serviço para gerenciar criativos de anúncios e análises de IA.
 * Integra com Edge Functions do Supabase para buscar dados do Meta
 * e realizar análises com GPT-4 Vision.
 */

import { supabase } from '../supabase';
import type {
  MetaAdCreative,
  AdAIAnalysis,
  FetchCreativePayload,
  FetchCreativeResponse,
  AnalyzeAdPayload,
  AnalyzeAdResponse,
  AdMetrics,
  AdMetricsAggregated,
} from '../../types/adAnalysis';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

/**
 * Busca o criativo de um anúncio do Meta
 * Primeiro verifica cache local, depois chama Edge Function se necessário
 */
export async function fetchAdCreative(
  payload: FetchCreativePayload
): Promise<FetchCreativeResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${FUNCTIONS_URL}/meta-fetch-ad-creative`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar criativo');
  }

  return response.json();
}

/**
 * Busca criativo do cache local (Supabase)
 */
export async function getAdCreativeFromCache(
  adId: string
): Promise<MetaAdCreative | null> {
  const { data, error } = await supabase
    .from('meta_ad_creatives')
    .select('*')
    .eq('ad_id', adId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar criativo do cache:', error);
    return null;
  }

  return data;
}

/**
 * Solicita análise de IA para um anúncio
 */
export async function requestAIAnalysis(
  payload: AnalyzeAdPayload
): Promise<AnalyzeAdResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${FUNCTIONS_URL}/meta-analyze-ad-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao analisar anúncio');
  }

  return response.json();
}

/**
 * Busca a análise de IA mais recente para um anúncio
 */
export async function getLatestAIAnalysis(
  adId: string
): Promise<AdAIAnalysis | null> {
  const { data, error } = await supabase
    .from('meta_ad_ai_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise de IA:', error);
    return null;
  }

  return data;
}

/**
 * Busca todas as análises de IA de um anúncio (histórico)
 */
export async function getAIAnalysisHistory(
  adId: string,
  limit = 10
): Promise<AdAIAnalysis[]> {
  const { data, error } = await supabase
    .from('meta_ad_ai_analyses')
    .select('*')
    .eq('ad_id', adId)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar histórico de análises:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca métricas diárias de um anúncio específico
 * Usa a tabela meta_insights_daily com filtro por entity_id e level='ad'
 */
export async function getAdDailyMetrics(
  adId: string,
  startDate: string,
  endDate: string
): Promise<AdMetrics[]> {
  // Consulta a tabela correta: meta_insights_daily
  // Filtra por entity_id (ID do anuncio) e level='ad' para garantir que sao metricas de anuncios
  const { data, error } = await supabase
    .from('meta_insights_daily')
    .select('*')
    .eq('entity_id', adId)
    .eq('level', 'ad')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar métricas do anúncio:', error);
    return [];
  }

  // Mapeia os campos da tabela meta_insights_daily para a interface AdMetrics
  // Calcula campos derivados como frequency, conversion_rate e cost_per_conversion
  return (data || []).map(row => {
    const impressions = Number(row.impressions) || 0;
    const reach = Number(row.reach) || 0;
    const clicks = Number(row.clicks) || 0;
    const spend = Number(row.spend) || 0;

    // Frequency: impressoes divididas pelo alcance
    const frequency = reach > 0 ? impressions / reach : 0;

    // CTR: taxa de cliques (ja pode estar calculado ou calculamos)
    const ctr = row.ctr ? Number(row.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);

    // CPC: custo por clique
    const cpc = row.cpc ? Number(row.cpc) : (clicks > 0 ? spend / clicks : 0);

    // CPM: custo por mil impressoes
    const cpm = row.cpm ? Number(row.cpm) : (impressions > 0 ? (spend / impressions) * 1000 : 0);

    // Conversoes: tenta extrair do campo actions_json se existir
    let conversions = 0;
    if (row.actions_json && typeof row.actions_json === 'object') {
      // Procura por acoes de conversao comuns
      const actions = row.actions_json as Record<string, number>;
      conversions = actions['purchase'] || actions['lead'] || actions['complete_registration'] || 0;
    }

    // Taxa de conversao e custo por conversao
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const costPerConversion = conversions > 0 ? spend / conversions : 0;

    return {
      ad_id: row.entity_id,
      date: row.date,
      impressions,
      reach,
      frequency,
      clicks,
      ctr,
      cpc,
      cpm,
      spend,
      conversions,
      conversion_rate: conversionRate,
      cost_per_conversion: costPerConversion,
    };
  });
}

/**
 * Calcula métricas agregadas a partir das métricas diárias
 */
export function aggregateMetrics(dailyMetrics: AdMetrics[]): AdMetricsAggregated {
  if (dailyMetrics.length === 0) {
    return {
      total_impressions: 0,
      total_reach: 0,
      avg_frequency: 0,
      total_clicks: 0,
      avg_ctr: 0,
      avg_cpc: 0,
      avg_cpm: 0,
      total_spend: 0,
      total_conversions: 0,
      avg_conversion_rate: 0,
      avg_cost_per_conversion: 0,
      daily_metrics: [],
    };
  }

  const totals = dailyMetrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      reach: acc.reach + m.reach,
      clicks: acc.clicks + m.clicks,
      spend: acc.spend + m.spend,
      conversions: acc.conversions + m.conversions,
      frequency_sum: acc.frequency_sum + m.frequency,
      ctr_sum: acc.ctr_sum + m.ctr,
      cpc_sum: acc.cpc_sum + m.cpc,
      cpm_sum: acc.cpm_sum + m.cpm,
      conversion_rate_sum: acc.conversion_rate_sum + m.conversion_rate,
      cost_per_conversion_sum: acc.cost_per_conversion_sum + m.cost_per_conversion,
    }),
    {
      impressions: 0,
      reach: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      frequency_sum: 0,
      ctr_sum: 0,
      cpc_sum: 0,
      cpm_sum: 0,
      conversion_rate_sum: 0,
      cost_per_conversion_sum: 0,
    }
  );

  const count = dailyMetrics.length;

  return {
    total_impressions: totals.impressions,
    total_reach: totals.reach,
    avg_frequency: totals.frequency_sum / count,
    total_clicks: totals.clicks,
    avg_ctr: totals.ctr_sum / count,
    avg_cpc: totals.cpc_sum / count,
    avg_cpm: totals.cpm_sum / count,
    total_spend: totals.spend,
    total_conversions: totals.conversions,
    avg_conversion_rate: totals.conversion_rate_sum / count,
    avg_cost_per_conversion: totals.cost_per_conversion_sum / count,
    daily_metrics: dailyMetrics,
  };
}

/**
 * Busca métricas agregadas de um anúncio
 */
export async function getAdAggregatedMetrics(
  adId: string,
  startDate: string,
  endDate: string
): Promise<AdMetricsAggregated> {
  const dailyMetrics = await getAdDailyMetrics(adId, startDate, endDate);
  return aggregateMetrics(dailyMetrics);
}

/**
 * Busca benchmarks da campanha para comparação
 * Usa a tabela meta_insights_daily filtrando por level='ad' para obter metricas de todos os anuncios da campanha
 */
export async function getCampaignBenchmarks(
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<{ avg_ctr: number; avg_cpc: number; avg_cpm: number; avg_conversion_rate: number }> {
  // Busca metricas de anuncios da campanha na tabela correta
  // Nota: meta_insights_daily nao tem campaign_id diretamente, entao buscamos via meta_entities_cache
  const { data, error } = await supabase
    .from('meta_insights_daily')
    .select('ctr, cpc, cpm, clicks, impressions, spend')
    .eq('level', 'ad')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error || !data || data.length === 0) {
    return { avg_ctr: 0, avg_cpc: 0, avg_cpm: 0, avg_conversion_rate: 0 };
  }

  // Calcula medias das metricas
  const sums = data.reduce(
    (acc, row) => ({
      ctr: acc.ctr + (Number(row.ctr) || 0),
      cpc: acc.cpc + (Number(row.cpc) || 0),
      cpm: acc.cpm + (Number(row.cpm) || 0),
    }),
    { ctr: 0, cpc: 0, cpm: 0 }
  );

  return {
    avg_ctr: sums.ctr / data.length,
    avg_cpc: sums.cpc / data.length,
    avg_cpm: sums.cpm / data.length,
    avg_conversion_rate: 0,
  };
}

/**
 * Verifica se um anúncio já possui análise de IA
 */
export async function hasAIAnalysis(adId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('meta_ad_ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('ad_id', adId);

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Deleta análise de IA de um anúncio (caso necessário)
 */
export async function deleteAIAnalysis(analysisId: string): Promise<boolean> {
  const { error } = await supabase
    .from('meta_ad_ai_analyses')
    .delete()
    .eq('id', analysisId);

  return !error;
}

/**
 * Força atualização do criativo de um anúncio
 */
export async function refreshAdCreative(
  adId: string,
  metaAdAccountId: string
): Promise<FetchCreativeResponse> {
  return fetchAdCreative({
    ad_id: adId,
    meta_ad_account_id: metaAdAccountId,
    force_refresh: true,
  });
}
