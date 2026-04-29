/**
 * CustomDateRangePicker
 *
 * Calendário duplo para seleção de intervalo de datas personalizado.
 * Inspirado no gerenciador de anúncios do Meta: dois meses lado a lado,
 * atalhos rápidos na lateral esquerda e botões Cancelar / Aplicar no rodapé.
 */

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface DateRange {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

interface CustomDateRangePickerProps {
  /** Intervalo inicial exibido ao abrir o picker */
  initialRange?: DateRange;
  /** Chamado quando o usuário clica em "Aplicar" */
  onApply: (range: DateRange) => void;
  /** Chamado quando o usuário clica em "Cancelar" */
  onCancel: () => void;
}

// ─── Atalhos rápidos ─────────────────────────────────────────────────────────

interface QuickOption {
  label: string;
  getRange: () => DateRange;
}

const toISO = (d: Date): string => d.toISOString().split('T')[0];

const QUICK_OPTIONS: QuickOption[] = [
  {
    label: 'Hoje',
    getRange: () => {
      const today = toISO(new Date());
      return { dateFrom: today, dateTo: today };
    },
  },
  {
    label: 'Ontem',
    getRange: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const s = toISO(d);
      return { dateFrom: s, dateTo: s };
    },
  },
  {
    label: 'Últimos 7 dias',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Últimos 14 dias',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 13);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Últimos 30 dias',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Este mês',
    getRange: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toISO(from), dateTo: toISO(now) };
    },
  },
  {
    label: 'Mês passado',
    getRange: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Últimos 90 dias',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 89);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
];

// ─── Helpers de calendário ───────────────────────────────────────────────────

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Retorna todos os dias a exibir no grid do mês (incluindo dias do mês anterior/próximo para completar as semanas) */
function buildMonthGrid(year: number, month: number): Array<{ date: Date; currentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Array<{ date: Date; currentMonth: boolean }> = [];

  // Dias do mês anterior para completar a primeira semana
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, -firstDay.getDay() + 1 + i);
    cells.push({ date: d, currentMonth: false });
  }

  // Dias do mês atual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  }

  // Dias do próximo mês para completar a última semana
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), currentMonth: false });
    }
  }

  return cells;
}

// ─── Sub-componente: um mês do calendário ────────────────────────────────────

interface MonthCalendarProps {
  year: number;
  month: number;
  selecting: string | null;   // data em hover durante seleção (ISO)
  rangeFrom: string | null;
  rangeTo: string | null;
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  showPrev: boolean;
  showNext: boolean;
}

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  selecting,
  rangeFrom,
  rangeTo,
  onDayClick,
  onDayHover,
  onPrevMonth,
  onNextMonth,
  showPrev,
  showNext,
}) => {
  const today = toISO(new Date());
  const grid = buildMonthGrid(year, month);

  /** Dado um dia, diz se ele está no intervalo selecionado/hover */
  const getState = (iso: string) => {
    // intervalo final definido
    if (rangeFrom && rangeTo) {
      const [a, b] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
      if (iso === a) return 'start';
      if (iso === b) return 'end';
      if (iso > a && iso < b) return 'in-range';
    }

    // intervalo em hover (primeiro clique feito, segundo ainda não)
    if (rangeFrom && !rangeTo && selecting) {
      const [a, b] = rangeFrom <= selecting ? [rangeFrom, selecting] : [selecting, rangeFrom];
      if (iso === a) return 'start';
      if (iso === b) return 'end';
      if (iso > a && iso < b) return 'in-range';
    }

    // apenas primeiro clique
    if (rangeFrom && iso === rangeFrom) return 'start';

    return 'none';
  };

  return (
    <div className="flex flex-col select-none">
      {/* Header do mês */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevMonth}
          className={`p-1.5 rounded-lg transition-colors ${showPrev ? 'hover:bg-gray-100 text-gray-700' : 'invisible'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </span>

        <button
          onClick={onNextMonth}
          className={`p-1.5 rounded-lg transition-colors ${showNext ? 'hover:bg-gray-100 text-gray-700' : 'invisible'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {grid.map(({ date, currentMonth }, idx) => {
          const iso = toISO(date);
          const state = getState(iso);
          const isFuture = iso > today;
          const isDisabled = isFuture || !currentMonth;

          // Estilos do círculo do dia
          const circleClass =
            state === 'start' || state === 'end'
              ? 'bg-blue-600 text-white rounded-full'
              : state === 'in-range'
              ? 'text-blue-900'
              : iso === today
              ? 'border border-blue-400 text-blue-600 rounded-full'
              : '';

          // Faixa de fundo para o intervalo
          const bgClass =
            state === 'in-range'
              ? 'bg-blue-100'
              : state === 'start'
              ? 'bg-blue-100 rounded-l-full'
              : state === 'end'
              ? 'bg-blue-100 rounded-r-full'
              : '';

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-center h-8 ${bgClass}`}
            >
              <button
                disabled={isDisabled}
                onClick={() => !isDisabled && onDayClick(iso)}
                onMouseEnter={() => !isDisabled && onDayHover(iso)}
                className={`
                  w-7 h-7 text-xs font-medium flex items-center justify-center
                  transition-colors z-10 relative
                  ${isDisabled ? 'text-gray-300 cursor-default' : 'cursor-pointer'}
                  ${!isDisabled && state === 'none' ? 'hover:bg-blue-50 hover:rounded-full' : ''}
                  ${circleClass}
                `}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Formata o intervalo selecionado para exibição ───────────────────────────

function formatRangeLabel(from: string | null, to: string | null): string {
  if (!from) return 'Selecione o período de início';
  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  if (!to) return `${fmt(from)} → selecione a data final`;
  const [a, b] = from <= to ? [from, to] : [to, from];
  return `${fmt(a)} – ${fmt(b)}`;
}

// ─── Componente principal ────────────────────────────────────────────────────

export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  initialRange,
  onApply,
  onCancel,
}) => {
  const today = new Date();

  // Mês exibido no calendário da esquerda (o da direita é +1)
  const [leftYear, setLeftYear] = useState(
    initialRange ? new Date(initialRange.dateFrom + 'T00:00:00').getFullYear() : today.getFullYear()
  );
  const [leftMonth, setLeftMonth] = useState(
    initialRange
      ? new Date(initialRange.dateFrom + 'T00:00:00').getMonth()
      : today.getMonth() === 0
      ? 11
      : today.getMonth() - 1
  );

  // Mês da direita = leftMonth + 1
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;

  // Seleção em andamento
  const [step, setStep] = useState<'first' | 'second'>('first');
  const [rangeFrom, setRangeFrom] = useState<string | null>(initialRange?.dateFrom ?? null);
  const [rangeTo, setRangeTo] = useState<string | null>(initialRange?.dateTo ?? null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Atalho rápido ativo (para destaque visual)
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  /** Navega o mês esquerdo para trás */
  const handlePrevMonth = useCallback(() => {
    if (leftMonth === 0) {
      setLeftMonth(11);
      setLeftYear((y) => y - 1);
    } else {
      setLeftMonth((m) => m - 1);
    }
  }, [leftMonth]);

  /** Navega o mês esquerdo para frente (direito acompanha automaticamente) */
  const handleNextMonth = useCallback(() => {
    if (leftMonth === 11) {
      setLeftMonth(0);
      setLeftYear((y) => y + 1);
    } else {
      setLeftMonth((m) => m + 1);
    }
  }, [leftMonth]);

  /** Clique em um dia do calendário */
  const handleDayClick = useCallback(
    (iso: string) => {
      setActiveQuick(null);
      if (step === 'first') {
        setRangeFrom(iso);
        setRangeTo(null);
        setStep('second');
      } else {
        // Garante que from <= to
        if (rangeFrom && iso < rangeFrom) {
          setRangeFrom(iso);
          setRangeTo(rangeFrom);
        } else {
          setRangeTo(iso);
        }
        setStep('first');
      }
    },
    [step, rangeFrom]
  );

  /** Hover para mostrar preview do intervalo */
  const handleDayHover = useCallback((iso: string) => {
    setHoverDate(iso);
  }, []);

  /** Atalho rápido selecionado */
  const handleQuickOption = useCallback((opt: QuickOption) => {
    const range = opt.getRange();
    setRangeFrom(range.dateFrom);
    setRangeTo(range.dateTo);
    setStep('first');
    setActiveQuick(opt.label);

    // Navega o calendário esquerdo para o mês da data início
    const d = new Date(range.dateFrom + 'T00:00:00');
    setLeftYear(d.getFullYear());
    // Mantém o mês anterior visível no calendário esquerdo se possível
    const m = d.getMonth();
    setLeftMonth(m === 0 ? 11 : m - 1);
    if (m === 0) setLeftYear(d.getFullYear() - 1);
  }, []);

  /** Confirma o intervalo selecionado */
  const handleApply = () => {
    if (!rangeFrom || !rangeTo) return;
    const [a, b] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
    onApply({ dateFrom: a, dateTo: b });
  };

  const canApply = rangeFrom !== null && rangeTo !== null;

  return (
    <div className="flex bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-fit">
      {/* ── Atalhos rápidos ── */}
      <div className="w-44 border-r border-gray-100 py-4 px-3 flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
          Atalhos
        </p>
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleQuickOption(opt)}
            className={`
              text-left text-sm px-3 py-2 rounded-lg transition-colors w-full
              ${
                activeQuick === opt.label
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Calendários + rodapé ── */}
      <div className="flex flex-col">
        {/* Indicador do intervalo selecionado */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100">
          <p className="text-sm text-gray-600">
            {step === 'second' ? (
              <span>
                <span className="font-medium text-blue-600">
                  {rangeFrom
                    ? new Date(rangeFrom + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
                {' → '}
                <span className="text-gray-400 italic">selecione a data final</span>
              </span>
            ) : (
              formatRangeLabel(rangeFrom, rangeTo)
            )}
          </p>
        </div>

        {/* Dois calendários lado a lado */}
        <div className="flex gap-6 px-6 py-4">
          <MonthCalendar
            year={leftYear}
            month={leftMonth}
            selecting={hoverDate}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            onPrevMonth={handlePrevMonth}
            onNextMonth={() => {}} // seta direita no calendário esquerdo não é exibida
            showPrev
            showNext={false}
          />
          <div className="w-px bg-gray-100" />
          <MonthCalendar
            year={rightYear}
            month={rightMonth}
            selecting={hoverDate}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            onPrevMonth={() => {}} // seta esquerda no calendário direito não é exibida
            onNextMonth={handleNextMonth}
            showPrev={false}
            showNext
          />
        </div>

        {/* Rodapé com botões */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            {step === 'second' ? 'Clique na data final para completar o período' : ''}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className={`
                px-5 py-2 text-sm font-medium rounded-lg transition-colors
                ${
                  canApply
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
