/**
 * PeriodSelector
 *
 * Componente compacto para selecao de periodo de datas.
 * Oferece presets rapidos e opcao de datas customizadas.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

// Presets de periodo disponiveis
export interface PeriodPreset {
  id: string;
  label: string;
  shortLabel: string;
  days: number;
  getDateRange: () => { dateFrom: string; dateTo: string };
}

// Presets padrao
export const DEFAULT_PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'today',
    label: 'Hoje',
    shortLabel: 'Hoje',
    days: 0,
    getDateRange: () => {
      const today = new Date().toISOString().split('T')[0];
      return { dateFrom: today, dateTo: today };
    },
  },
  {
    id: 'yesterday',
    label: 'Ontem',
    shortLabel: 'Ontem',
    days: 1,
    getDateRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      return { dateFrom: date, dateTo: date };
    },
  },
  {
    id: 'last_7',
    label: 'Ultimos 7 dias',
    shortLabel: '7 dias',
    days: 7,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 6);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_14',
    label: 'Ultimos 14 dias',
    shortLabel: '14 dias',
    days: 14,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 13);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_30',
    label: 'Ultimos 30 dias',
    shortLabel: '30 dias',
    days: 30,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 29);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_90',
    label: 'Ultimos 90 dias',
    shortLabel: '90 dias',
    days: 90,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 89);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_180',
    label: 'Ultimos 180 dias',
    shortLabel: '180 dias',
    days: 180,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 179);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_365',
    label: 'Ultimos 365 dias',
    shortLabel: '365 dias',
    days: 365,
    getDateRange: () => {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 364);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'this_month',
    label: 'Este mes',
    shortLabel: 'Este mes',
    days: -1,
    getDateRange: () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_month',
    label: 'Mes passado',
    shortLabel: 'Mes passado',
    days: -2,
    getDateRange: () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: to.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'this_quarter',
    label: 'Este trimestre',
    shortLabel: 'Trimestre',
    days: -3,
    getDateRange: () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);
      const firstMonthOfQuarter = currentQuarter * 3;
      const from = new Date(today.getFullYear(), firstMonthOfQuarter, 1);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'this_semester',
    label: 'Este semestre',
    shortLabel: 'Semestre',
    days: -4,
    getDateRange: () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const firstMonthOfSemester = currentMonth < 6 ? 0 : 6;
      const from = new Date(today.getFullYear(), firstMonthOfSemester, 1);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'this_year',
    label: 'Este ano',
    shortLabel: 'Este ano',
    days: -5,
    getDateRange: () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), 0, 1);
      return {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      };
    },
  },
];

interface PeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (periodId: string, dateRange: { dateFrom: string; dateTo: string }) => void;
  presets?: PeriodPreset[];
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Tamanhos do componente
const SIZE_CONFIG = {
  sm: {
    button: 'px-2.5 py-1.5 text-xs',
    dropdown: 'text-xs',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    button: 'px-3 py-2 text-sm',
    dropdown: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    button: 'px-4 py-2.5 text-base',
    dropdown: 'text-base',
    icon: 'w-5 h-5',
  },
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  presets = DEFAULT_PERIOD_PRESETS,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sizeConfig = SIZE_CONFIG[size];

  // Encontra o preset selecionado
  const currentPreset = presets.find((p) => p.id === selectedPeriod) || presets[2];

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

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''} ${className}`} ref={dropdownRef}>
      {/* Botao principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 ${sizeConfig.button}
          bg-white border border-gray-300 rounded-lg
          hover:border-gray-400 hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors
        `}
      >
        {showIcon && (
          <Calendar className={`${sizeConfig.icon} text-gray-500`} />
        )}
        <span className="font-medium text-gray-700">
          {currentPreset.label}
        </span>
        <ChevronDown
          className={`${sizeConfig.icon} text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1 w-56 py-1
            bg-white rounded-lg shadow-lg border border-gray-200
            ${sizeConfig.dropdown}
          `}
        >
          {/* Lista de presets agrupada */}
          <div className="py-1">
            {presets.map((preset, index) => {
              const isSelected = preset.id === selectedPeriod;
              const dateRange = preset.getDateRange();

              // Adiciona separador visual entre grupos de periodos
              // Grupo 1: Hoje, Ontem (indices 0-1)
              // Grupo 2: Ultimos dias (indices 2-7)
              // Grupo 3: Calendario (indices 8+)
              const showSeparatorBefore = index === 2 || index === 8;

              return (
                <React.Fragment key={preset.id}>
                  {showSeparatorBefore && (
                    <div className="my-1 border-t border-gray-200" />
                  )}
                  <button
                    onClick={() => handleSelect(preset)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2
                      hover:bg-gray-50 transition-colors
                      ${isSelected ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex flex-col items-start">
                      <span
                        className={`font-medium ${
                          isSelected ? 'text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {preset.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dateRange.dateFrom === dateRange.dateTo
                          ? formatDate(dateRange.dateFrom)
                          : `${formatDate(dateRange.dateFrom)} - ${formatDate(dateRange.dateTo)}`}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Formata data para exibicao
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
};

/**
 * Versao compacta com botoes inline (sem dropdown)
 */
interface PeriodButtonsProps {
  selectedPeriod: string;
  onPeriodChange: (periodId: string, dateRange: { dateFrom: string; dateTo: string }) => void;
  presets?: PeriodPreset[];
  className?: string;
}

export const PeriodButtons: React.FC<PeriodButtonsProps> = ({
  selectedPeriod,
  onPeriodChange,
  presets = DEFAULT_PERIOD_PRESETS.slice(0, 5),
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {presets.map((preset) => {
        const isSelected = preset.id === selectedPeriod;

        return (
          <button
            key={preset.id}
            onClick={() => onPeriodChange(preset.id, preset.getDateRange())}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {preset.shortLabel}
          </button>
        );
      })}
    </div>
  );
};
