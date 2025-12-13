/**
 * BreakdownPicker - Componente para selecionar breakdowns (segmentações)
 *
 * Permite selecionar como os dados serão segmentados:
 * - Demográficos (Age, Gender)
 * - Geográficos (Country, Region)
 * - Dispositivo (Device, Impression Device)
 * - Posicionamento (Platform, Placement)
 */

import React from 'react';
import { Check, AlertTriangle, Users, MapPin, Smartphone, Layout } from 'lucide-react';
import { AVAILABLE_BREAKDOWNS, getBreakdownById } from '../../constants/fieldCatalog';
import type { BreakdownDefinition } from '../../types/extraction';

// ============================================
// Props do componente
// ============================================

interface BreakdownPickerProps {
  selectedBreakdowns: string[];
  onChange: (breakdowns: string[]) => void;
  maxBreakdowns?: number;
}

// ============================================
// Agrupamento de breakdowns
// ============================================

interface BreakdownGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  breakdowns: BreakdownDefinition[];
}

const BREAKDOWN_GROUPS: BreakdownGroup[] = [
  {
    id: 'demographic',
    label: 'Demográficos',
    icon: Users,
    breakdowns: AVAILABLE_BREAKDOWNS.filter(b =>
      ['age', 'gender'].includes(b.id)
    ),
  },
  {
    id: 'geographic',
    label: 'Geográficos',
    icon: MapPin,
    breakdowns: AVAILABLE_BREAKDOWNS.filter(b =>
      ['country', 'region', 'dma'].includes(b.id)
    ),
  },
  {
    id: 'device',
    label: 'Dispositivo',
    icon: Smartphone,
    breakdowns: AVAILABLE_BREAKDOWNS.filter(b =>
      ['device_platform', 'impression_device'].includes(b.id)
    ),
  },
  {
    id: 'placement',
    label: 'Posicionamento',
    icon: Layout,
    breakdowns: AVAILABLE_BREAKDOWNS.filter(b =>
      ['publisher_platform', 'platform_position', 'product_id'].includes(b.id)
    ),
  },
];

// ============================================
// Componente de Chip de Breakdown
// ============================================

interface BreakdownChipProps {
  breakdown: BreakdownDefinition;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  disabledReason?: string;
}

const BreakdownChip: React.FC<BreakdownChipProps> = ({
  breakdown,
  isSelected,
  isDisabled,
  onClick,
  disabledReason,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-150 ease-in-out border-2
        ${isSelected
          ? 'bg-blue-100 border-blue-400 text-blue-700'
          : isDisabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
        }
      `}
      title={isDisabled ? disabledReason : breakdown.description}
    >
      {isSelected && <Check className="w-4 h-4" />}
      <span>{breakdown.displayName}</span>
      {isDisabled && !isSelected && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      )}
    </button>
  );
};

// ============================================
// Componente Principal
// ============================================

export const BreakdownPicker: React.FC<BreakdownPickerProps> = ({
  selectedBreakdowns,
  onChange,
  maxBreakdowns = 2,
}) => {
  // Verificar quais breakdowns estão desabilitados por incompatibilidade
  const getDisabledStatus = (breakdownId: string): { disabled: boolean; reason?: string } => {
    // Se já está selecionado, não desabilita
    if (selectedBreakdowns.includes(breakdownId)) {
      return { disabled: false };
    }

    // Se atingiu o limite
    if (selectedBreakdowns.length >= maxBreakdowns) {
      return {
        disabled: true,
        reason: `Limite de ${maxBreakdowns} breakdowns atingido`,
      };
    }

    // Verificar incompatibilidades
    const breakdown = getBreakdownById(breakdownId);
    if (breakdown?.incompatibleWith) {
      for (const selectedId of selectedBreakdowns) {
        if (breakdown.incompatibleWith.includes(selectedId)) {
          const incompatible = getBreakdownById(selectedId);
          return {
            disabled: true,
            reason: `Incompatível com "${incompatible?.displayName}"`,
          };
        }
      }
    }

    // Verificar se algum breakdown selecionado é incompatível com este
    for (const selectedId of selectedBreakdowns) {
      const selected = getBreakdownById(selectedId);
      if (selected?.incompatibleWith?.includes(breakdownId)) {
        return {
          disabled: true,
          reason: `Incompatível com "${selected.displayName}"`,
        };
      }
    }

    return { disabled: false };
  };

  // Toggle de seleção
  const toggleBreakdown = (breakdownId: string) => {
    if (selectedBreakdowns.includes(breakdownId)) {
      onChange(selectedBreakdowns.filter(b => b !== breakdownId));
    } else {
      const status = getDisabledStatus(breakdownId);
      if (!status.disabled) {
        onChange([...selectedBreakdowns, breakdownId]);
      }
    }
  };

  // Limpar todos
  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Breakdowns selecionados: {selectedBreakdowns.length} / {maxBreakdowns}
          </span>
        </div>
        {selectedBreakdowns.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Breakdowns selecionados */}
      {selectedBreakdowns.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          {selectedBreakdowns.map(breakdownId => {
            const breakdown = getBreakdownById(breakdownId);
            if (!breakdown) return null;

            return (
              <span
                key={breakdownId}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium"
              >
                {breakdown.displayName}
                <button
                  type="button"
                  onClick={() => toggleBreakdown(breakdownId)}
                  className="ml-1 hover:text-blue-900"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Grupos de breakdowns */}
      <div className="space-y-4">
        {BREAKDOWN_GROUPS.map(group => {
          if (group.breakdowns.length === 0) return null;

          const Icon = group.icon;

          return (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Icon className="w-4 h-4" />
                <span>{group.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.breakdowns.map(breakdown => {
                  const status = getDisabledStatus(breakdown.id);

                  return (
                    <BreakdownChip
                      key={breakdown.id}
                      breakdown={breakdown}
                      isSelected={selectedBreakdowns.includes(breakdown.id)}
                      isDisabled={status.disabled}
                      disabledReason={status.reason}
                      onClick={() => toggleBreakdown(breakdown.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso sobre breakdowns */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Sobre Breakdowns:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Breakdowns dividem os dados em segmentos menores</li>
          <li>Alguns breakdowns não podem ser combinados (ex: Age + hourly)</li>
          <li>Mais breakdowns = mais linhas de dados</li>
          <li>Limite recomendado: {maxBreakdowns} breakdowns por extração</li>
        </ul>
      </div>
    </div>
  );
};

export default BreakdownPicker;
