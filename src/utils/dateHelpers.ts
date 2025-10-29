/**
 * Utilitários de Data e Hora
 *
 * Funções auxiliares para manipulação e formatação de datas.
 * Usa a biblioteca nativa Date e Intl para operações de data.
 */

/**
 * Formata uma data no padrão brasileiro (dd/mm/yyyy)
 *
 * @param date - Data a ser formatada (Date, string ou timestamp)
 * @param includeTime - Se true, inclui hora no formato
 * @returns String formatada
 *
 * @example
 * formatDate(new Date()) // "29/10/2025"
 * formatDate(new Date(), true) // "29/10/2025 14:30"
 */
export const formatDate = (
  date: Date | string | number,
  includeTime = false
): string => {
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('pt-BR', options).format(dateObj);
};

/**
 * Formata uma data de forma extensa
 *
 * @param date - Data a ser formatada
 * @returns String formatada de forma extensa
 *
 * @example
 * formatDateLong(new Date()) // "29 de outubro de 2025"
 */
export const formatDateLong = (date: Date | string | number): string => {
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Formata uma data de forma relativa (há 2 dias, ontem, etc)
 *
 * @param date - Data a ser formatada
 * @returns String com tempo relativo
 *
 * @example
 * formatRelativeTime(Date.now() - 3600000) // "há 1 hora"
 * formatRelativeTime(Date.now() - 86400000) // "ontem"
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'agora há pouco';
  } else if (diffInMinutes < 60) {
    return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffInHours < 24) {
    return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffInDays === 1) {
    return 'ontem';
  } else if (diffInDays < 7) {
    return `há ${diffInDays} dias`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
};

/**
 * Verifica se uma data é hoje
 *
 * @param date - Data a ser verificada
 * @returns true se for hoje
 */
export const isToday = (date: Date | string | number): boolean => {
  const dateObj = new Date(date);
  const today = new Date();

  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Verifica se uma data é ontem
 *
 * @param date - Data a ser verificada
 * @returns true se foi ontem
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const dateObj = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Adiciona dias a uma data
 *
 * @param date - Data base
 * @param days - Número de dias a adicionar (pode ser negativo)
 * @returns Nova data
 *
 * @example
 * addDays(new Date(), 7) // Data 7 dias no futuro
 * addDays(new Date(), -7) // Data 7 dias no passado
 */
export const addDays = (date: Date | string | number, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Adiciona meses a uma data
 *
 * @param date - Data base
 * @param months - Número de meses a adicionar (pode ser negativo)
 * @returns Nova data
 */
export const addMonths = (date: Date | string | number, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Calcula diferença entre duas datas em dias
 *
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns Diferença em dias
 *
 * @example
 * diffInDays(new Date('2025-10-29'), new Date('2025-10-22')) // 7
 */
export const diffInDays = (
  date1: Date | string | number,
  date2: Date | string | number
): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Retorna o início do dia (00:00:00)
 *
 * @param date - Data base
 * @returns Data no início do dia
 */
export const startOfDay = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Retorna o fim do dia (23:59:59)
 *
 * @param date - Data base
 * @returns Data no fim do dia
 */
export const endOfDay = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Retorna o início do mês
 *
 * @param date - Data base
 * @returns Primeiro dia do mês às 00:00:00
 */
export const startOfMonth = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Retorna o fim do mês
 *
 * @param date - Data base
 * @returns Último dia do mês às 23:59:59
 */
export const endOfMonth = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Retorna o início da semana (domingo)
 *
 * @param date - Data base
 * @returns Domingo da semana às 00:00:00
 */
export const startOfWeek = (date: Date | string | number): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Retorna o fim da semana (sábado)
 *
 * @param date - Data base
 * @returns Sábado da semana às 23:59:59
 */
export const endOfWeek = (date: Date | string | number): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() + (6 - day);
  result.setDate(diff);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Formata duração em segundos para formato legível
 *
 * @param seconds - Duração em segundos
 * @returns String formatada (ex: "1h 30m", "45s")
 *
 * @example
 * formatDuration(90) // "1m 30s"
 * formatDuration(3665) // "1h 1m 5s"
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Obtém array de datas entre duas datas
 *
 * @param startDate - Data inicial
 * @param endDate - Data final
 * @returns Array de datas
 *
 * @example
 * getDateRange(new Date('2025-10-01'), new Date('2025-10-03'))
 * // [Date(2025-10-01), Date(2025-10-02), Date(2025-10-03)]
 */
export const getDateRange = (
  startDate: Date | string | number,
  endDate: Date | string | number
): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Obtém nome do mês
 *
 * @param monthIndex - Índice do mês (0-11)
 * @param short - Se true, retorna nome abreviado
 * @returns Nome do mês
 *
 * @example
 * getMonthName(0) // "Janeiro"
 * getMonthName(0, true) // "Jan"
 */
export const getMonthName = (monthIndex: number, short = false): string => {
  const date = new Date(2000, monthIndex, 1);
  return new Intl.DateTimeFormat('pt-BR', {
    month: short ? 'short' : 'long',
  }).format(date);
};

/**
 * Obtém nome do dia da semana
 *
 * @param dayIndex - Índice do dia (0-6, sendo 0 = domingo)
 * @param short - Se true, retorna nome abreviado
 * @returns Nome do dia da semana
 *
 * @example
 * getDayName(0) // "Domingo"
 * getDayName(0, true) // "Dom"
 */
export const getDayName = (dayIndex: number, short = false): string => {
  const date = new Date(2000, 0, dayIndex + 2); // +2 porque 01/01/2000 era sábado
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: short ? 'short' : 'long',
  }).format(date);
};

/**
 * Valida se uma string é uma data válida
 *
 * @param dateString - String da data
 * @returns true se for válida
 *
 * @example
 * isValidDate("2025-10-29") // true
 * isValidDate("invalid") // false
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Formata data para ISO string (formato API)
 *
 * @param date - Data a ser formatada
 * @returns String no formato ISO (YYYY-MM-DD)
 *
 * @example
 * toISODateString(new Date('2025-10-29')) // "2025-10-29"
 */
export const toISODateString = (date: Date | string | number): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
