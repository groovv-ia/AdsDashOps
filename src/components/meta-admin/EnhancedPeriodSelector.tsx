/**
 * EnhancedPeriodSelector
 *
 * Seletor de período aprimorado.
 * - Botões rápidos para os presets mais usados
 * - Botão "Mais opções" abre dropdown categorizado
 * - Botão "Personalizado" abre o CustomDateRangePicker (calendário duplo)
 * - Indicador do período ativo com datas formatadas
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock, TrendingUp, CalendarDays, CalendarRange } from 'lucide-react';
import { DEFAULT_PERIOD_PRESETS, PeriodPreset } from './PeriodSelector';
import { CustomDateRangePicker } from '../ui/CustomDateRangePicker';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EnhancedPeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (periodId: string, dateRange: { dateFrom: string; dateTo: string }) => void;
  /** Intervalo atual (necessário para exibir datas de períodos personalizados) */
  dateRange?: { dateFrom: string; dateTo: string };
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Retorna true se o periodId é um período personalizado */
const isCustomPeriod = (id: string) => id === 'custom' || id.startsWith('custom_');

// ─── Componente ───────────────────────────────────────────────────────────────

export const EnhancedPeriodSelector: React.FC<EnhancedPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  dateRange,
  className = '',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Encontra o preset selecionado (pode não existir se for personalizado)
  const currentPreset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === selectedPeriod) ?? null;

  // Intervalo efetivo: vem do preset ou da prop dateRange
  const effectiveDateRange =
    dateRange ?? (currentPreset ? currentPreset.getDateRange() : null);

  // Fecha dropdown e picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler para presets do dropdown
  const handlePresetSelect = (preset: PeriodPreset) => {
    onPeriodChange(preset.id, preset.getDateRange());
    setIsDropdownOpen(false);
  };

  // Handler para o CustomDateRangePicker
  const handleCustomApply = (range: { dateFrom: string; dateTo: string }) => {
    const id = `custom_${range.dateFrom.replace(/-/g, '')}_${range.dateTo.replace(/-/g, '')}`;
    onPeriodChange(id, range);
    setIsPickerOpen(false);
    setIsDropdownOpen(false);
  };

  // Botões de acesso rápido (mais usados)
  const quickPeriods = ['last_7', 'last_30', 'this_month', 'last_90'];

  // Categorias do dropdown
  const periodCategories = [
    {
      title: 'Rápido',
      icon: Clock,
      periods: ['today', 'yesterday', 'last_7', 'last_14', 'last_30'],
    },
    {
      title: 'Longo Prazo',
      icon: TrendingUp,
      periods: ['last_90', 'last_180', 'last_365'],
    },
    {
      title: 'Calendário',
      icon: CalendarDays,
      periods: ['this_month', 'last_month', 'this_quarter', 'this_semester', 'this_year'],
    },
  ];

  const isCustomActive = isCustomPeriod(selectedPeriod);
  const isMoreOptionsActive = !quickPeriods.includes(selectedPeriod);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Linha de botões ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Botões de preset rápido */}
        {quickPeriods.map((periodId) => {
          const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === periodId);
          if (!preset) return null;
          const isSelected = selectedPeriod === periodId;
          return (
            <button
              key={periodId}
              onClick={() => handlePresetSelect(preset)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              {preset.shortLabel}
            </button>
          );
        })}

        {/* Botão "Mais opções" → dropdown categorizado */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsDropdownOpen((o) => !o);
              setIsPickerOpen(false);
            }}
            className={`
              flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${
                isMoreOptionsActive && !isCustomActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {isMoreOptionsActive && !isCustomActive && currentPreset
                ? currentPreset.shortLabel
                : 'Mais opções'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown de categorias */}
          {isDropdownOpen && (
            <div className="absolute z-50 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="p-2 max-h-[420px] overflow-y-auto">
                {periodCategories.map((category, catIdx) => {
                  const Icon = category.icon;
                  return (
                    <div key={category.title} className={catIdx > 0 ? 'mt-3' : ''}>
                      <div className="flex items-center space-x-2 px-3 py-2 mb-1">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {category.title}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {category.periods.map((periodId) => {
                          const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === periodId);
                          if (!preset) return null;
                          const isSelected = preset.id === selectedPeriod;
                          const dr = preset.getDateRange();
                          return (
                            <button
                              key={preset.id}
                              onClick={() => handlePresetSelect(preset)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                                transition-colors text-left
                                ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
                              `}
                            >
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? 'text-blue-700' : 'text-gray-900'
                                  }`}
                                >
                                  {preset.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {dr.dateFrom === dr.dateTo
                                    ? formatDateShort(dr.dateFrom)
                                    : `${formatDateShort(dr.dateFrom)} – ${formatDateShort(dr.dateTo)}`}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão "Personalizado" → abre o calendário duplo */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => {
              setIsPickerOpen((o) => !o);
              setIsDropdownOpen(false);
            }}
            className={`
              flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${
                isCustomActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            <CalendarRange className="w-4 h-4" />
            <span>{isCustomActive ? 'Personalizado' : 'Personalizado'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Calendário duplo flutuante */}
          {isPickerOpen && (
            <div className="absolute z-50 mt-2 left-0">
              <CustomDateRangePicker
                initialRange={
                  effectiveDateRange
                    ? { dateFrom: effectiveDateRange.dateFrom, dateTo: effectiveDateRange.dateTo }
                    : undefined
                }
                onApply={handleCustomApply}
                onCancel={() => setIsPickerOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Indicador do período ativo ── */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>
          Analisando:{' '}
          <span className="font-medium text-gray-900">
            {isCustomActive
              ? 'Período personalizado'
              : currentPreset?.label ?? 'Período selecionado'}
          </span>
        </span>
        {effectiveDateRange && (
          <>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">
              {effectiveDateRange.dateFrom === effectiveDateRange.dateTo
                ? formatDateShort(effectiveDateRange.dateFrom)
                : `${formatDateShort(effectiveDateRange.dateFrom)} até ${formatDateShort(
                    effectiveDateRange.dateTo
                  )}`}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
