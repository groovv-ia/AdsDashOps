/**
 * Helpers de timezone para compatibilidade com Meta Ads
 *
 * A Meta Ads API agrega dados no fuso horario configurado na conta de anuncios.
 * Para garantir que as datas exibidas no AdsOPS correspondam exatamente ao
 * Gerenciador de Anuncios, todas as datas devem ser interpretadas nesse fuso.
 */

import { format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Formata uma data YYYY-MM-DD no fuso da conta de anuncios
 */
export function formatDateInAccountTimezone(
  dateStr: string,
  accountTimezone: string,
  formatStr: string = 'dd/MM/yyyy'
): string {
  const date = parseISO(dateStr);
  return formatInTimeZone(date, accountTimezone, formatStr);
}

/**
 * Retorna a data "hoje" no fuso da conta (pode diferir do UTC)
 */
export function getTodayInTimezone(accountTimezone: string): string {
  const now = new Date();
  const zonedNow = toZonedTime(now, accountTimezone);
  return format(zonedNow, 'yyyy-MM-dd');
}

/**
 * Converte um range de datas para o formato que a Meta espera
 * (YYYY-MM-DD puro, no fuso da conta — a API assume o fuso automaticamente)
 */
export function buildMetaTimeRange(dateFrom: string, dateTo: string): { since: string; until: string } {
  return { since: dateFrom, until: dateTo };
}

/**
 * Formata label do fuso para exibicao ao usuario
 * Ex: "America/Sao_Paulo" -> "America/Sao_Paulo (UTC-3)"
 */
export function formatTimezoneLabel(timezone: string): string {
  try {
    const now = new Date();
    const offsetStr = formatInTimeZone(now, timezone, 'xxx');
    return `${timezone} (UTC${offsetStr})`;
  } catch {
    return timezone;
  }
}

/**
 * Retorna apenas o offset formatado: "UTC-3", "UTC+1"
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const offsetStr = formatInTimeZone(now, timezone, 'xxx');
    return `UTC${offsetStr}`;
  } catch {
    return '';
  }
}
