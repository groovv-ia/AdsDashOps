/**
 * GoalsPanel
 *
 * Painel de metas de crescimento com barra de progresso,
 * botao de sugestao por IA e acoes de gerenciamento.
 */

import React, { useState } from 'react';
import { Target, Sparkles, Trash2, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  type SocialGrowthGoal,
  type AIGoalSuggestion,
  METRIC_LABELS,
  updateGoalStatus,
  deleteGoal,
} from '../../lib/services/SocialGrowthService';

interface GoalsPanelProps {
  goals: SocialGrowthGoal[];
  onRequestAIGoals: () => void;
  onGoalsChange: () => void;
  aiLoading?: boolean;
  aiSuggestions?: AIGoalSuggestion[];
  overallAssessment?: string;
  growthPotential?: string;
}

// Calcula o progresso percentual em relacao a meta
function calcProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

// Cor da barra de progresso baseada no percentual
function progressColor(pct: number): string {
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 60) return 'bg-blue-500';
  if (pct >= 30) return 'bg-yellow-500';
  return 'bg-red-400';
}

// Dias restantes ate a meta
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Badge de dificuldade da meta sugerida pela IA
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    facil: 'success',
    moderada: 'info',
    dificil: 'warning',
    'muito dificil': 'danger',
  };
  const variant = map[difficulty.toLowerCase()] || 'default';
  return <Badge variant={variant} size="sm">{difficulty}</Badge>;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({
  goals,
  onRequestAIGoals,
  onGoalsChange,
  aiLoading = false,
  aiSuggestions,
  overallAssessment,
  growthPotential,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [achievingId, setAchievingId] = useState<string | null>(null);

  const handleAchieve = async (goalId: string) => {
    setAchievingId(goalId);
    await updateGoalStatus(goalId, 'achieved');
    setAchievingId(null);
    onGoalsChange();
  };

  const handleDelete = async (goalId: string) => {
    setDeletingId(goalId);
    await deleteGoal(goalId);
    setDeletingId(null);
    onGoalsChange();
  };

  const potentialColors: Record<string, string> = {
    alto: 'text-green-600',
    medio: 'text-blue-600',
    baixo: 'text-yellow-600',
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Metas de Crescimento</h3>
          {goals.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {goals.length} ativa{goals.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Sparkles}
          loading={aiLoading}
          onClick={onRequestAIGoals}
        >
          Sugerir com IA
        </Button>
      </div>

      {/* Avaliacao geral da IA */}
      {overallAssessment && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-700 font-medium mb-0.5">Avaliacao da IA</p>
          <p className="text-sm text-blue-900">{overallAssessment}</p>
          {growthPotential && (
            <p className="text-xs text-gray-500 mt-1">
              Potencial de crescimento:{' '}
              <span className={`font-semibold ${potentialColors[growthPotential.toLowerCase()] || 'text-gray-700'}`}>
                {growthPotential.charAt(0).toUpperCase() + growthPotential.slice(1)}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Lista de metas ativas */}
      {goals.length === 0 && !aiSuggestions && (
        <div className="py-8 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhuma meta ativa.</p>
          <p className="text-gray-400 text-xs mt-1">
            Clique em "Sugerir com IA" para gerar metas baseadas no historico.
          </p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = calcProgress(goal.current_value, goal.target_value);
            const days = daysUntil(goal.target_date);
            const label = METRIC_LABELS[goal.metric_name] || goal.metric_name;
            const isOverdue = days < 0;

            return (
              <div key={goal.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                      {goal.ai_suggested && (
                        <Badge variant="info" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Number(goal.current_value).toLocaleString('pt-BR')} /{' '}
                      <span className="font-medium text-gray-700">
                        {Number(goal.target_value).toLocaleString('pt-BR')}
                      </span>{' '}
                      &middot;{' '}
                      <span className={isOverdue ? 'text-red-500' : 'text-gray-500'}>
                        {isOverdue
                          ? `Vencida ha ${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''}`
                          : `${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleAchieve(goal.id)}
                      disabled={achievingId === goal.id}
                      title="Marcar como atingida"
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      disabled={deletingId === goal.id}
                      title="Remover meta"
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${progressColor(progress)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{progress}% concluido</span>
                  {goal.ai_reasoning && (
                    <span className="text-xs text-gray-400 truncate max-w-[60%] text-right" title={goal.ai_reasoning}>
                      {goal.ai_reasoning.slice(0, 60)}...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sugestoes da IA nao salvas ainda (exibidas apos nova chamada) */}
      {aiSuggestions && aiSuggestions.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">Novas sugestoes da IA</span>
            <Clock className="w-3 h-3 text-gray-400 ml-auto" />
            <span className="text-xs text-gray-400">Salvas automaticamente</span>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((s, i) => (
              <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-900">
                    {s.metric_label}: {Number(s.target_value).toLocaleString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-1">
                    <DifficultyBadge difficulty={s.difficulty} />
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {s.target_days}d
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-700">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
