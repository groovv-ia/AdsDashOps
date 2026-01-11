/**
 * ABTestSuggestionsView
 *
 * Visualiza sugestões de testes A/B geradas por IA e permite
 * gerenciar status e tracking dos testes.
 */

import React, { useState } from 'react';
import { FlaskConical, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { ABTestSuggestion } from '../../types/abTestTypes';
import {
  getABTestTypeLabel,
  getABTestPriorityColor,
  getABTestStatusLabel,
  getABTestStatusColor,
  getABTestDifficultyLabel,
  getABTestDifficultyColor,
} from '../../types/abTestTypes';

interface ABTestSuggestionsViewProps {
  suggestions: ABTestSuggestion[];
  onStatusChange?: (suggestionId: string, newStatus: string) => void;
}

export function ABTestSuggestionsView({
  suggestions,
  onStatusChange,
}: ABTestSuggestionsViewProps) {
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Filtra sugestões
  const filteredSuggestions = suggestions.filter((s) => {
    if (selectedPriority && s.priority !== selectedPriority) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  // Agrupa por prioridade
  const suggestionsByPriority = {
    high: filteredSuggestions.filter((s) => s.priority === 'high'),
    medium: filteredSuggestions.filter((s) => s.priority === 'medium'),
    low: filteredSuggestions.filter((s) => s.priority === 'low'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Testes A/B Inteligentes</h2>
            <p className="text-orange-100">
              Sugestões de testes geradas por IA com hipóteses claras e métricas definidas
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{suggestions.length}</div>
            <div className="text-orange-100">Sugestões</div>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Prioridade
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedPriority === null ? 'primary' : 'secondary'}
                onClick={() => setSelectedPriority(null)}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={selectedPriority === 'high' ? 'primary' : 'secondary'}
                onClick={() => setSelectedPriority('high')}
              >
                Alta
              </Button>
              <Button
                size="sm"
                variant={selectedPriority === 'medium' ? 'primary' : 'secondary'}
                onClick={() => setSelectedPriority('medium')}
              >
                Média
              </Button>
              <Button
                size="sm"
                variant={selectedPriority === 'low' ? 'primary' : 'secondary'}
                onClick={() => setSelectedPriority('low')}
              >
                Baixa
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedStatus === null ? 'primary' : 'secondary'}
                onClick={() => setSelectedStatus(null)}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={selectedStatus === 'suggested' ? 'primary' : 'secondary'}
                onClick={() => setSelectedStatus('suggested')}
              >
                Sugeridos
              </Button>
              <Button
                size="sm"
                variant={selectedStatus === 'implemented' ? 'primary' : 'secondary'}
                onClick={() => setSelectedStatus('implemented')}
              >
                Implementados
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Sugestões por prioridade */}
      {(['high', 'medium', 'low'] as const).map((priority) => {
        const prioritySuggestions = suggestionsByPriority[priority];
        if (prioritySuggestions.length === 0) return null;

        const priorityColors = getABTestPriorityColor(priority);

        return (
          <div key={priority}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle
                className={`h-5 w-5 ${priorityColors.text.replace('700', '500')}`}
              />
              Prioridade{' '}
              {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'} (
              {prioritySuggestions.length})
            </h3>

            <div className="space-y-4">
              {prioritySuggestions.map((suggestion) => {
                const statusColors = getABTestStatusColor(suggestion.status);
                const difficultyColors = getABTestDifficultyColor(
                  suggestion.implementation_difficulty
                );

                return (
                  <Card
                    key={suggestion.id}
                    className={`p-6 border-2 ${priorityColors.border}`}
                  >
                    {/* Header do card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1 ${priorityColors.bg} rounded-full`}>
                            <span className={`text-sm font-medium ${priorityColors.text}`}>
                              {getABTestTypeLabel(suggestion.test_type)}
                            </span>
                          </div>
                          <div className={`px-3 py-1 ${statusColors.bg} rounded-full`}>
                            <span className={`text-sm font-medium ${statusColors.text}`}>
                              {getABTestStatusLabel(suggestion.status)}
                            </span>
                          </div>
                          <div
                            className={`px-3 py-1 ${difficultyColors.bg} rounded-full`}
                          >
                            <span className={`text-sm font-medium ${difficultyColors.text}`}>
                              {getABTestDifficultyLabel(
                                suggestion.implementation_difficulty
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {suggestion.expected_impact_percentage && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {suggestion.expected_impact_percentage}
                          </div>
                          <div className="text-xs text-gray-600">Impacto Esperado</div>
                        </div>
                      )}
                    </div>

                    {/* Hipótese */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-orange-500" />
                        Hipótese
                      </h4>
                      <p className="text-gray-700">{suggestion.hypothesis}</p>
                    </div>

                    {/* O que mudar */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">O que Mudar</h4>
                      <p className="text-gray-600 text-sm">{suggestion.what_to_change}</p>
                    </div>

                    {/* Variante */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Descrição da Variante
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {suggestion.variant_description}
                      </p>
                    </div>

                    {/* Resultado esperado */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Resultado Esperado
                      </h4>
                      <p className="text-gray-600 text-sm">{suggestion.expected_outcome}</p>
                    </div>

                    {/* Métricas para acompanhar */}
                    {suggestion.metrics_to_track.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-700 mb-2">
                          Métricas para Acompanhar
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.metrics_to_track.map((metric, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      {suggestion.status === 'suggested' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              onStatusChange?.(suggestion.id, 'planned')
                            }
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Planejar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              onStatusChange?.(suggestion.id, 'discarded')
                            }
                          >
                            Descartar
                          </Button>
                        </>
                      )}
                      {suggestion.status === 'planned' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            onStatusChange?.(suggestion.id, 'implemented')
                          }
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Marcar como Implementado
                        </Button>
                      )}
                      {suggestion.status === 'implemented' && (
                        <Button size="sm" variant="secondary">
                          Ver Resultados
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredSuggestions.length === 0 && (
        <Card className="p-12 text-center">
          <FlaskConical className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma sugestão encontrada
          </h3>
          <p className="text-gray-600">
            Ajuste os filtros ou aguarde novas análises para receber sugestões de testes A/B
          </p>
        </Card>
      )}
    </div>
  );
}
