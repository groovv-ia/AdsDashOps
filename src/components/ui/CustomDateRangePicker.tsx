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
  initialRange?: DateRange;
  onApply: (range: DateRange) => void;
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
    getRange: () => { const t = toISO(new Date()); return { dateFrom: t, dateTo: t }; },
  },
  {
    label: 'Ontem',
    getRange: () => {
      const d = new Date(); d.setDate(d.getDate() - 1); const s = toISO(d);
      return { dateFrom: s, dateTo: s };
    },
  },
  {
    label: 'Últimos 7 dias',
    getRange: () => {
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Últimos 14 dias',
    getRange: () => {
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 13);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
  {
    label: 'Últimos 30 dias',
    getRange: () => {
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29);
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
      const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 89);
      return { dateFrom: toISO(from), dateTo: toISO(to) };
    },
  },
];

// ─── Helpers de calendário ───────────────────────────────────────────────────

// Inicial maiúscula de cada dia da semana (Dom → D, Seg → S …)
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const WEEK_DAYS_FULL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Retorna todos os dias a exibir no grid do mês incluindo dias de preenchimento */
function buildMonthGrid(year: number, month: number): Array<{ date: Date; currentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: Array<{ date: Date; currentMonth: boolean }> = [];

  // Preenche o início da semana com dias do mês anterior
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, 1 - firstDay.getDay() + i);
    cells.push({ date: d, currentMonth: false });
  }

  // Dias do mês atual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  }

  // Preenche o fim com dias do próximo mês para completar a última semana
  const remaining = cells.length % 7;
  if (remaining > 0) {
    for (let d = 1; d <= 7 - remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), currentMonth: false });
    }
  }

  return cells;
}

// ─── Sub-componente: um mês do calendário ────────────────────────────────────

interface MonthCalendarProps {
  year: number;
  month: number;
  hoverDate: string | null;
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
  hoverDate,
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

  /**
   * Classifica o estado de um dia em relação ao intervalo selecionado.
   * Leva em conta o hover (segundo clique ainda não feito).
   */
  const getState = (iso: string): 'start' | 'end' | 'in-range' | 'single' | 'none' => {
    // Intervalo definitivo (dois cliques feitos)
    if (rangeFrom && rangeTo) {
      const [a, b] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
      if (a === b && iso === a) return 'single';
      if (iso === a) return 'start';
      if (iso === b) return 'end';
      if (iso > a && iso < b) return 'in-range';
    }

    // Intervalo em hover (primeiro clique feito, segundo ainda não)
    if (rangeFrom && !rangeTo && hoverDate) {
      const [a, b] = rangeFrom <= hoverDate ? [rangeFrom, hoverDate] : [hoverDate, rangeFrom];
      if (iso === a && a === b) return 'single';
      if (iso === a) return 'start';
      if (iso === b) return 'end';
      if (iso > a && iso < b) return 'in-range';
    }

    // Apenas o primeiro clique
    if (rangeFrom && !rangeTo && !hoverDate && iso === rangeFrom) return 'single';

    return 'none';
  };

  return (
    <div className="select-none" style={{ width: 252 }}>
      {/* Cabeçalho: setas + nome do mês */}
      <div className="flex items-center justify-between mb-3 h-8">
        <button
          onClick={onPrevMonth}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors
            ${showPrev ? 'hover:bg-gray-100 text-gray-600 cursor-pointer' : 'invisible'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          {MONTH_NAMES[month]} {year}
        </span>

        <button
          onClick={onNextMonth}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors
            ${showNext ? 'hover:bg-gray-100 text-gray-600 cursor-pointer' : 'invisible'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Linha dos dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS_FULL.map((label, i) => (
          <div
            key={i}
            className="flex items-center justify-center h-8"
            style={{ width: 36 }}
            title={label}
          >
            <span className="text-xs font-medium text-gray-400">{WEEK_DAYS[i]}</span>
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {grid.map(({ date, currentMonth }, idx) => {
          const iso = toISO(date);
          const state = getState(iso);
          const isFuture = iso > today;
          const isDisabled = isFuture;
          const isOutsideMonth = !currentMonth;

          // ── Faixa de fundo azul claro para os dias intermediários ──
          // A faixa cobre a célula inteira; nas bordas do intervalo é meia-faixa
          let bgStripClass = '';
          if (state === 'in-range') bgStripClass = 'bg-blue-100';
          else if (state === 'start') bgStripClass = 'bg-gradient-to-r from-transparent to-blue-100';
          else if (state === 'end') bgStripClass = 'bg-gradient-to-l from-transparent to-blue-100';

          // ── Círculo / destaque do dia ──
          let circleClass = '';
          let textClass = '';

          if (state === 'start' || state === 'end' || state === 'single') {
            circleClass = 'bg-blue-600 text-white';
            textClass = 'text-white font-semibold';
          } else if (state === 'in-range') {
            textClass = 'text-blue-800 font-medium';
          } else if (iso === today) {
            circleClass = 'ring-2 ring-blue-500';
            textClass = 'text-blue-600 font-semibold';
          } else if (isOutsideMonth) {
            textClass = 'text-gray-300';
          } else if (isDisabled) {
            textClass = 'text-gray-300';
          } else {
            textClass = 'text-gray-800';
          }

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-center ${bgStripClass}`}
              style={{ width: 36, height: 36 }}
            >
              <button
                disabled={isDisabled || isOutsideMonth}
                onClick={() => !isDisabled && !isOutsideMonth && onDayClick(iso)}
                onMouseEnter={() => !isDisabled && !isOutsideMonth && onDayHover(iso)}
                className={`
                  relative z-10 w-8 h-8 flex items-center justify-center rounded-full
                  text-xs transition-all duration-100
                  ${isDisabled || isOutsideMonth ? 'cursor-default' : 'cursor-pointer'}
                  ${!isDisabled && !isOutsideMonth && state === 'none' && iso !== today
                    ? 'hover:bg-gray-100' : ''}
                  ${circleClass}
                  ${textClass}
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
  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  if (!from) return 'Selecione a data de início';
  if (!to) return `${fmt(from)} → selecione a data final`;
  const [a, b] = from <= to ? [from, to] : [to, from];
  if (a === b) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

// ─── Componente principal ────────────────────────────────────────────────────

export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  initialRange,
  onApply,
  onCancel,
}) => {
  const today = new Date();

  // Mês exibido no calendário da esquerda
  const [leftYear, setLeftYear] = useState(() => {
    if (initialRange) return new Date(initialRange.dateFrom + 'T00:00:00').getFullYear();
    return today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  });
  const [leftMonth, setLeftMonth] = useState(() => {
    if (initialRange) {
      const m = new Date(initialRange.dateFrom + 'T00:00:00').getMonth();
      return m === 0 ? 11 : m - 1;
    }
    return today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  });

  // O calendário da direita sempre é o mês seguinte ao da esquerda
  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear;
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;

  // Estado da seleção
  const [step, setStep]         = useState<'first' | 'second'>('first');
  const [rangeFrom, setRangeFrom] = useState<string | null>(initialRange?.dateFrom ?? null);
  const [rangeTo, setRangeTo]     = useState<string | null>(initialRange?.dateTo ?? null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  const handlePrevMonth = useCallback(() => {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear(y => y - 1); }
    else setLeftMonth(m => m - 1);
  }, [leftMonth]);

  const handleNextMonth = useCallback(() => {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear(y => y + 1); }
    else setLeftMonth(m => m + 1);
  }, [leftMonth]);

  const handleDayClick = useCallback((iso: string) => {
    setActiveQuick(null);
    if (step === 'first') {
      setRangeFrom(iso);
      setRangeTo(null);
      setStep('second');
    } else {
      if (rangeFrom && iso < rangeFrom) {
        setRangeTo(rangeFrom);
        setRangeFrom(iso);
      } else {
        setRangeTo(iso);
      }
      setStep('first');
    }
  }, [step, rangeFrom]);

  const handleDayHover = useCallback((iso: string) => {
    setHoverDate(iso);
  }, []);

  const handleQuickOption = useCallback((opt: QuickOption) => {
    const range = opt.getRange();
    setRangeFrom(range.dateFrom);
    setRangeTo(range.dateTo);
    setStep('first');
    setHoverDate(null);
    setActiveQuick(opt.label);

    // Navega o calendário para mostrar o mês da data início
    const d = new Date(range.dateFrom + 'T00:00:00');
    const m = d.getMonth();
    if (m === 0) {
      setLeftMonth(11);
      setLeftYear(d.getFullYear() - 1);
    } else {
      setLeftMonth(m - 1);
      setLeftYear(d.getFullYear());
    }
  }, []);

  const handleApply = () => {
    if (!rangeFrom || !rangeTo) return;
    const [a, b] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
    onApply({ dateFrom: a, dateTo: b });
  };

  const canApply = rangeFrom !== null && rangeTo !== null;

  // Hoverdate para o estado "second" (segundo clique ainda não feito)
  const activeHover = step === 'second' ? hoverDate : null;

  return (
    <div
      className="flex bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      onMouseLeave={() => setHoverDate(null)}
    >
      {/* ── Painel de atalhos ── */}
      <div className="border-r border-gray-100 py-4 px-3 flex flex-col gap-0.5" style={{ width: 160 }}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
          Atalhos
        </p>
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleQuickOption(opt)}
            className={`
              text-left text-sm px-3 py-2 rounded-lg transition-colors w-full whitespace-nowrap
              ${activeQuick === opt.label
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Área dos calendários ── */}
      <div className="flex flex-col">
        {/* Indicador do intervalo selecionado */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 min-h-[52px]">
          <p className="text-sm text-gray-700 font-medium">
            {step === 'second' ? (
              <span>
                <span className="text-blue-600">
                  {rangeFrom ? new Date(rangeFrom + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  }) : '—'}
                </span>
                <span className="text-gray-400 font-normal"> → selecione a data final</span>
              </span>
            ) : (
              <span className={canApply ? 'text-gray-800' : 'text-gray-400 font-normal'}>
                {formatRangeLabel(rangeFrom, rangeTo)}
              </span>
            )}
          </p>
        </div>

        {/* Dois calendários lado a lado */}
        <div className="flex gap-4 px-6 py-4">
          <MonthCalendar
            year={leftYear}
            month={leftMonth}
            hoverDate={activeHover}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            onPrevMonth={handlePrevMonth}
            onNextMonth={() => {}}
            showPrev
            showNext={false}
          />

          {/* Divisória vertical */}
          <div className="w-px bg-gray-100 self-stretch" />

          <MonthCalendar
            year={rightYear}
            month={rightMonth}
            hoverDate={activeHover}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            onPrevMonth={() => {}}
            onNextMonth={handleNextMonth}
            showPrev={false}
            showNext
          />
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-400">
            {step === 'second' ? 'Clique na data final para concluir' : ''}
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
                px-5 py-2 text-sm font-semibold rounded-lg transition-colors
                ${canApply
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
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
