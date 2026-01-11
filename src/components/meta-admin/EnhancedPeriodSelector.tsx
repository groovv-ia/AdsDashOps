/**
 * EnhancedPeriodSelector
 *
 * Seletor de período aprimorado com UI/UX melhorada.
 * Combina botões rápidos + dropdown organizado por categorias.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock, TrendingUp, CalendarDays } from 'lucide-react';
import { DEFAULT_PERIOD_PRESETS, PeriodPreset } from './PeriodSelector';

interface EnhancedPeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (periodId: string, dateRange: { dateFrom: string; dateTo: string }) => void;
  className?: string;
}

/**
 * Componente principal com botões rápidos + dropdown categorizado
 */
export const EnhancedPeriodSelector: React.FC<EnhancedPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Encontra o preset selecionado
  const currentPreset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === selectedPeriod) || DEFAULT_PERIOD_PRESETS[2];

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler de selecao
  const handleSelect = (preset: PeriodPreset) => {
    const dateRange = preset.getDateRange();
    onPeriodChange(preset.id, dateRange);
    setIsOpen(false);
  };

  // Periodos rapidos (os mais usados)
  const quickPeriods = ['last_7', 'last_30', 'this_month', 'last_90'];

  // Categorias de periodos
  const periodCategories = [
    {
      title: 'Rapido',
      icon: Clock,
      color: 'blue',
      periods: ['today', 'yesterday', 'last_7', 'last_14', 'last_30'],
    },
    {
      title: 'Longo Prazo',
      icon: TrendingUp,
      color: 'purple',
      periods: ['last_90', 'last_180', 'last_365'],
    },
    {
      title: 'Calendario',
      icon: CalendarDays,
      color: 'green',
      periods: ['this_month', 'last_month', 'this_quarter', 'this_semester', 'this_year'],
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Botoes rapidos */}
      <div className="flex flex-wrap gap-2">
        {quickPeriods.map((periodId) => {
          const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === periodId);
          if (!preset) return null;

          const isSelected = selectedPeriod === periodId;

          return (
            <button
              key={periodId}
              onClick={() => handleSelect(preset)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              {preset.shortLabel}
            </button>
          );
        })}

        {/* Botao "Mais opções" */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${
                !quickPeriods.includes(selectedPeriod)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {!quickPeriods.includes(selectedPeriod) ? currentPreset.shortLabel : 'Mais opções'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown categorizado */}
          {isOpen && (
            <div className="absolute z-50 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="p-2 max-h-[500px] overflow-y-auto">
                {periodCategories.map((category, catIndex) => {
                  const Icon = category.icon;

                  return (
                    <div key={category.title} className={catIndex > 0 ? 'mt-3' : ''}>
                      {/* Header da categoria */}
                      <div className="flex items-center space-x-2 px-3 py-2 mb-1">
                        <Icon className={`w-4 h-4 text-${category.color}-600`} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {category.title}
                        </span>
                      </div>

                      {/* Periodos da categoria */}
                      <div className="space-y-0.5">
                        {category.periods.map((periodId) => {
                          const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === periodId);
                          if (!preset) return null;

                          const isSelected = preset.id === selectedPeriod;
                          const dateRange = preset.getDateRange();

                          return (
                            <button
                              key={preset.id}
                              onClick={() => handleSelect(preset)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                                transition-colors text-left
                                ${
                                  isSelected
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-gray-50'
                                }
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
                                  {dateRange.dateFrom === dateRange.dateTo
                                    ? formatDate(dateRange.dateFrom)
                                    : `${formatDate(dateRange.dateFrom)} - ${formatDate(dateRange.dateTo)}`}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                              )}
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
      </div>

      {/* Indicador do periodo selecionado */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>
          Analisando: <span className="font-medium text-gray-900">{currentPreset.label}</span>
        </span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-500">
          {(() => {
            const dateRange = currentPreset.getDateRange();
            return dateRange.dateFrom === dateRange.dateTo
              ? formatDate(dateRange.dateFrom)
              : `${formatDate(dateRange.dateFrom)} até ${formatDate(dateRange.dateTo)}`;
          })()}
        </span>
      </div>
    </div>
  );
};

// Formata data para exibicao
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
