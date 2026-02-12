/**
 * MetaSyncGapDetector
 *
 * Servico responsavel por detectar lacunas (gaps) nos dados sincronizados
 * do Meta Ads. Compara as datas com dados existentes no banco contra
 * a sequencia esperada de datas no periodo, identificando dias sem dados.
 *
 * Utilizado pela pagina MetaAdsSyncPage para alertar o usuario sobre
 * periodos sem dados e oferecer backfill automatico.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';

/**
 * Representa um intervalo continuo de dias sem dados
 */
export interface DataGap {
  /** Primeiro dia sem dados (formato YYYY-MM-DD) */
  dateFrom: string;
  /** Ultimo dia sem dados (formato YYYY-MM-DD) */
  dateTo: string;
  /** Quantidade de dias no gap */
  days: number;
}

/**
 * Resumo completo dos gaps detectados para uma conta
 */
export interface GapDetectionResult {
  /** ID interno da conta de anuncios */
  metaAdAccountId: string;
  /** Periodo analisado: inicio */
  analyzedFrom: string;
  /** Periodo analisado: fim */
  analyzedTo: string;
  /** Total de dias no periodo analisado */
  totalDaysInPeriod: number;
  /** Total de dias com dados */
  daysWithData: number;
  /** Total de dias sem dados */
  daysMissing: number;
  /** Lista de gaps encontrados (intervalos continuos) */
  gaps: DataGap[];
  /** Porcentagem de cobertura (0-100) */
  coveragePercent: number;
}

/**
 * Gera todas as datas entre dateFrom e dateTo (inclusive) no formato YYYY-MM-DD
 */
function generateDateRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = [];
  const start = new Date(dateFrom + 'T12:00:00Z');
  const end = new Date(dateTo + 'T12:00:00Z');

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Agrupa datas consecutivas faltantes em intervalos (gaps)
 */
function groupConsecutiveDates(missingDates: string[]): DataGap[] {
  if (missingDates.length === 0) return [];

  const sorted = [...missingDates].sort();
  const gaps: DataGap[] = [];

  let gapStart = sorted[0];
  let gapEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(gapEnd + 'T12:00:00Z');
    const currentDate = new Date(sorted[i] + 'T12:00:00Z');
    const diffDays = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      // Data consecutiva: estende o gap atual
      gapEnd = sorted[i];
    } else {
      // Interrompeu a sequencia: salva o gap atual e inicia um novo
      const startDate = new Date(gapStart + 'T12:00:00Z');
      const endDate = new Date(gapEnd + 'T12:00:00Z');
      const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      gaps.push({ dateFrom: gapStart, dateTo: gapEnd, days });

      gapStart = sorted[i];
      gapEnd = sorted[i];
    }
  }

  // Adiciona o ultimo gap
  const startDate = new Date(gapStart + 'T12:00:00Z');
  const endDate = new Date(gapEnd + 'T12:00:00Z');
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  gaps.push({ dateFrom: gapStart, dateTo: gapEnd, days });

  return gaps;
}

/**
 * Detecta lacunas nos dados sincronizados para uma conta de anuncios especifica.
 *
 * Consulta meta_insights_daily para listar todas as datas que possuem pelo menos
 * um registro no nivel 'campaign', compara com a sequencia completa de datas
 * esperadas no periodo, e retorna os intervalos faltantes.
 */
export async function detectGaps(
  workspaceId: string,
  metaAdAccountId: string,
  dateFrom: string,
  dateTo: string
): Promise<GapDetectionResult> {
  try {
    logger.info('Detectando gaps de sincronizacao', { workspaceId, metaAdAccountId, dateFrom, dateTo });

    // Busca todas as datas distintas que possuem dados para a conta
    const { data: rows, error } = await supabase
      .from('meta_insights_daily')
      .select('date')
      .eq('workspace_id', workspaceId)
      .eq('meta_ad_account_id', metaAdAccountId)
      .eq('level', 'campaign')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (error) {
      logger.error('Erro ao buscar datas para deteccao de gaps', error);
      throw error;
    }

    // Extrai datas unicas dos resultados
    const datesWithData = new Set<string>(
      (rows || []).map((r: { date: string }) => r.date)
    );

    // Gera a sequencia completa de datas esperadas no periodo
    const allDates = generateDateRange(dateFrom, dateTo);
    const totalDaysInPeriod = allDates.length;

    // Identifica datas faltantes (excluindo o dia de hoje, que pode ser parcial)
    const today = new Date().toISOString().split('T')[0];
    const missingDates = allDates.filter(
      date => !datesWithData.has(date) && date !== today
    );

    // Agrupa datas faltantes em intervalos continuos
    const gaps = groupConsecutiveDates(missingDates);

    const result: GapDetectionResult = {
      metaAdAccountId,
      analyzedFrom: dateFrom,
      analyzedTo: dateTo,
      totalDaysInPeriod,
      daysWithData: datesWithData.size,
      daysMissing: missingDates.length,
      gaps,
      coveragePercent: totalDaysInPeriod > 0
        ? Math.round((datesWithData.size / totalDaysInPeriod) * 100)
        : 0,
    };

    logger.info('Gaps detectados', {
      account: metaAdAccountId,
      coverage: result.coveragePercent,
      gaps: gaps.length,
      daysMissing: result.daysMissing,
    });

    return result;

  } catch (err) {
    logger.error('Erro na deteccao de gaps', err);
    return {
      metaAdAccountId,
      analyzedFrom: dateFrom,
      analyzedTo: dateTo,
      totalDaysInPeriod: 0,
      daysWithData: 0,
      daysMissing: 0,
      gaps: [],
      coveragePercent: 0,
    };
  }
}

/**
 * Gera um resumo legivel dos gaps encontrados.
 * Ex: "13 dias sem dados entre 23/Jan e 04/Fev"
 */
export function getGapSummary(gaps: DataGap[]): string {
  if (gaps.length === 0) return 'Todos os dias possuem dados.';

  const totalMissing = gaps.reduce((sum, g) => sum + g.days, 0);

  const formatBR = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00Z');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (gaps.length === 1) {
    const gap = gaps[0];
    if (gap.days === 1) {
      return `1 dia sem dados em ${formatBR(gap.dateFrom)}`;
    }
    return `${gap.days} dias sem dados entre ${formatBR(gap.dateFrom)} e ${formatBR(gap.dateTo)}`;
  }

  // Multiplos gaps: resume o total e detalha o maior
  const largestGap = gaps.reduce((a, b) => (a.days > b.days ? a : b));

  return `${totalMissing} dias sem dados em ${gaps.length} periodos. Maior lacuna: ${largestGap.days} dias (${formatBR(largestGap.dateFrom)} a ${formatBR(largestGap.dateTo)})`;
}

/**
 * Calcula quantos dias de backfill sao necessarios para cobrir o gap mais antigo.
 * Retorna o numero de dias entre hoje e o inicio do gap mais antigo.
 */
export function calculateBackfillDays(gaps: DataGap[]): number {
  if (gaps.length === 0) return 0;

  // Encontra o gap mais antigo
  const oldestGap = gaps.reduce((a, b) => (a.dateFrom < b.dateFrom ? a : b));
  const gapStart = new Date(oldestGap.dateFrom + 'T12:00:00Z');
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const diffDays = Math.ceil((today.getTime() - gapStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays + 1, 1);
}
