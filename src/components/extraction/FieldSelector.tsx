/**
 * FieldSelector - Componente de seleção de campos estilo Adveronix
 *
 * Exibe campos como chips/tags clicáveis organizados por categoria.
 * Campos selecionados ficam destacados com fundo colorido.
 */

import React, { useState, useMemo } from 'react';
import { Check, X, ChevronDown, ChevronUp, Sparkles, Trash2 } from 'lucide-react';
import {
  ALL_FIELDS,
  FIELDS_BY_CATEGORY,
  CATEGORY_LABELS,
  getPopularFields,
  getFieldsForLevel,
} from '../../constants/fieldCatalog';
import type { FieldDefinition, FieldCategory, ReportLevel } from '../../types/extraction';

// ============================================
// Props do componente
// ============================================

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  level: ReportLevel;
  maxFields?: number;
  showCategories?: boolean;
  compact?: boolean;
}

// ============================================
// Cores por categoria
// ============================================

const CATEGORY_COLORS: Record<FieldCategory, { bg: string; border: string; text: string }> = {
  dimension: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  delivery: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  performance: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  cost: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  conversion: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700' },
  engagement: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  video: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-700' },
  attribution: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
};

// ============================================
// Componente de Chip de Campo
// ============================================

interface FieldChipProps {
  field: FieldDefinition;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}

const FieldChip: React.FC<FieldChipProps> = ({ field, isSelected, onClick, compact }) => {
  const colors = CATEGORY_COLORS[field.category];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-150 ease-in-out border
        ${isSelected
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }
        ${compact ? 'px-2 py-1 text-xs' : ''}
      `}
      title={field.description}
    >
      {isSelected && <Check className="w-3.5 h-3.5" />}
      <span>{field.displayName}</span>
      {field.isPopular && !isSelected && (
        <Sparkles className="w-3 h-3 text-amber-500" />
      )}
    </button>
  );
};

// ============================================
// Componente Principal
// ============================================

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  selectedFields,
  onChange,
  level,
  maxFields,
  showCategories = true,
  compact = false,
}) => {
  // Estado para controlar categorias expandidas
  const [expandedCategories, setExpandedCategories] = useState<Set<FieldCategory>>(
    new Set(['dimension', 'delivery', 'performance', 'cost'])
  );

  // Filtrar campos disponíveis para o nível selecionado
  const availableFields = useMemo(() => {
    return getFieldsForLevel(level);
  }, [level]);

  // Agrupar campos por categoria
  const fieldsByCategory = useMemo(() => {
    const grouped: Partial<Record<FieldCategory, FieldDefinition[]>> = {};

    for (const field of availableFields) {
      if (!grouped[field.category]) {
        grouped[field.category] = [];
      }
      grouped[field.category]!.push(field);
    }

    return grouped;
  }, [availableFields]);

  // Campos populares
  const popularFields = useMemo(() => {
    return availableFields.filter(f => f.isPopular);
  }, [availableFields]);

  // Toggle de seleção de campo
  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      onChange(selectedFields.filter(f => f !== fieldId));
    } else {
      if (maxFields && selectedFields.length >= maxFields) {
        return;
      }
      onChange([...selectedFields, fieldId]);
    }
  };

  // Toggle de categoria expandida
  const toggleCategory = (category: FieldCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Selecionar todos os campos de uma categoria
  const selectAllInCategory = (category: FieldCategory) => {
    const categoryFields = fieldsByCategory[category] || [];
    const categoryFieldIds = categoryFields.map(f => f.id);
    const newSelected = new Set([...selectedFields, ...categoryFieldIds]);

    if (maxFields) {
      const limited = Array.from(newSelected).slice(0, maxFields);
      onChange(limited);
    } else {
      onChange(Array.from(newSelected));
    }
  };

  // Desselecionar todos os campos de uma categoria
  const deselectAllInCategory = (category: FieldCategory) => {
    const categoryFields = fieldsByCategory[category] || [];
    const categoryFieldIds = new Set(categoryFields.map(f => f.id));
    onChange(selectedFields.filter(f => !categoryFieldIds.has(f)));
  };

  // Selecionar campos populares
  const selectPopular = () => {
    const popularIds = popularFields.map(f => f.id);
    const newSelected = new Set([...selectedFields, ...popularIds]);

    if (maxFields) {
      onChange(Array.from(newSelected).slice(0, maxFields));
    } else {
      onChange(Array.from(newSelected));
    }
  };

  // Limpar todos os campos
  const clearAll = () => {
    onChange([]);
  };

  // Ordenar categorias para exibição
  const orderedCategories: FieldCategory[] = [
    'dimension',
    'delivery',
    'performance',
    'cost',
    'conversion',
    'engagement',
    'video',
  ];

  return (
    <div className="space-y-4">
      {/* Header com ações rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Campos selecionados: {selectedFields.length}
            {maxFields && ` / ${maxFields}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectPopular}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Populares
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={selectedFields.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>

      {/* Campos selecionados (preview) */}
      {selectedFields.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-2">Campos selecionados:</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedFields.map(fieldId => {
              const field = availableFields.find(f => f.id === fieldId);
              if (!field) return null;

              const colors = CATEGORY_COLORS[field.category];

              return (
                <span
                  key={fieldId}
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                    ${colors.bg} ${colors.text}
                  `}
                >
                  {field.displayName}
                  <button
                    type="button"
                    onClick={() => toggleField(fieldId)}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Campos organizados por categoria */}
      {showCategories ? (
        <div className="space-y-3">
          {orderedCategories.map(category => {
            const categoryFields = fieldsByCategory[category];
            if (!categoryFields || categoryFields.length === 0) return null;

            const isExpanded = expandedCategories.has(category);
            const selectedInCategory = categoryFields.filter(f =>
              selectedFields.includes(f.id)
            ).length;
            const colors = CATEGORY_COLORS[category];

            return (
              <div
                key={category}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header da categoria */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5
                    ${colors.bg} hover:brightness-95 transition-all
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${colors.text}`}>
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({selectedInCategory}/{categoryFields.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInCategory(category);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-0.5 bg-white/50 rounded"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deselectAllInCategory(category);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-0.5 bg-white/50 rounded"
                        >
                          Nenhum
                        </button>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Campos da categoria */}
                {isExpanded && (
                  <div className="p-3 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {categoryFields.map(field => (
                        <FieldChip
                          key={field.id}
                          field={field}
                          isSelected={selectedFields.includes(field.id)}
                          onClick={() => toggleField(field.id)}
                          compact={compact}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Exibição simples (sem categorias)
        <div className="flex flex-wrap gap-2">
          {availableFields.map(field => (
            <FieldChip
              key={field.id}
              field={field}
              isSelected={selectedFields.includes(field.id)}
              onClick={() => toggleField(field.id)}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Aviso de limite */}
      {maxFields && selectedFields.length >= maxFields && (
        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
          Limite de {maxFields} campos atingido. Remova campos para adicionar outros.
        </div>
      )}
    </div>
  );
};

export default FieldSelector;
