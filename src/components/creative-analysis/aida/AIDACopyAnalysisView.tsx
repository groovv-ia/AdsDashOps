/**
 * AIDACopyAnalysisView
 *
 * Visualiza análise de copy usando framework AIDA
 * (Attention, Interest, Desire, Action)
 */

import React from 'react';
import { Eye, BookOpen, Heart, Zap, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { AIDACopyAnalysis } from '../../../types/aidaAnalysis';
import {
  getAIDAStageLabel,
  getAIDAStageDescription,
  getAIDAScoreColor,
} from '../../../types/aidaAnalysis';

interface AIDACopyAnalysisViewProps {
  analysis: AIDACopyAnalysis;
}

export function AIDACopyAnalysisView({ analysis }: AIDACopyAnalysisViewProps) {
  const stages = [
    { key: 'attention' as const, icon: Eye, score: analysis.attention_score },
    { key: 'interest' as const, icon: BookOpen, score: analysis.interest_score },
    { key: 'desire' as const, icon: Heart, score: analysis.desire_score },
    { key: 'action' as const, icon: Zap, score: analysis.action_score },
  ];

  return (
    <div className="space-y-6">
      {/* Header com score geral */}
      <Card className="p-6 bg-gradient-to-br from-green-500 to-teal-500 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Análise AIDA de Copy</h2>
            <p className="text-green-100">
              Framework completo de Atenção, Interesse, Desejo e Ação
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{analysis.overall_score}</div>
            <div className="text-green-100">Score Geral</div>
          </div>
        </div>

        {/* Scores AIDA */}
        <div className="grid grid-cols-4 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.key}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{getAIDAStageLabel(stage.key)}</span>
                </div>
                <div className="text-3xl font-bold">{stage.score}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cards individuais para cada etapa AIDA */}
      {stages.map((stage) => {
        const Icon = stage.icon;
        const colors = getAIDAScoreColor(stage.score);
        const stageData = analysis.analysis_data[`${stage.key}_analysis`];

        return (
          <Card key={stage.key} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${colors.bg} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getAIDAStageLabel(stage.key)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getAIDAStageDescription(stage.key)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{stage.score}</div>
                <div className="text-xs text-gray-600">Score</div>
              </div>
            </div>

            {/* Conteúdo específico por etapa */}
            {stage.key === 'attention' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">
                    Efetividade do Headline
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {stageData.headline_effectiveness}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Gatilho de Curiosidade</h4>
                  <p className="text-gray-600 text-sm">{stageData.curiosity_trigger}</p>
                </div>
              </div>
            )}

            {stage.key === 'interest' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">
                    Relevância para Audiência
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {stageData.relevance_to_audience}
                  </p>
                </div>
                {stageData.engagement_factors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Fatores de Engajamento</h4>
                    <div className="flex flex-wrap gap-2">
                      {stageData.engagement_factors.map((factor: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage.key === 'desire' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Foco em Benefícios</h4>
                  <p className="text-gray-600 text-sm">{stageData.benefit_focus}</p>
                </div>
                {stageData.emotional_triggers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Gatilhos Emocionais</h4>
                    <div className="flex flex-wrap gap-2">
                      {stageData.emotional_triggers.map((trigger: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-pink-50 text-pink-700 text-sm rounded-full"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage.key === 'action' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Clareza do CTA</h4>
                  <p className="text-gray-600 text-sm">{stageData.cta_clarity}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Força do CTA</h4>
                  <p className="text-gray-600 text-sm">{stageData.cta_strength}</p>
                </div>
              </div>
            )}

            {/* Melhorias */}
            {stageData.improvements && stageData.improvements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Sugestões de Melhoria</h4>
                <ul className="space-y-1">
                  {stageData.improvements.map((improvement: string, idx: number) => (
                    <li key={idx} className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="text-orange-500 mt-1">→</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}

      {/* Power Words Analysis */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Análise de Power Words
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {analysis.analysis_data.power_words_analysis.power_words_score}
            </div>
            <div className="text-sm text-gray-600">Score de Power Words</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analysis.analysis_data.power_words_analysis.power_words_found.length}
            </div>
            <div className="text-sm text-gray-600">Power Words Encontradas</div>
          </div>
        </div>

        {analysis.analysis_data.power_words_analysis.power_words_found.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Palavras Identificadas</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.analysis_data.power_words_analysis.power_words_found.map(
                (word, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-700 font-medium text-sm rounded-full"
                  >
                    {word}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Pontos Fortes Gerais
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.overall_strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-500 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Melhorias Gerais
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.overall_improvements.map((improvement, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-orange-500 mt-1">→</span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Métricas adicionais */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Legibilidade</h4>
            <div className="text-3xl font-bold text-gray-900">
              {analysis.analysis_data.readability_score}
            </div>
            <p className="text-sm text-gray-600 mt-1">Score de legibilidade</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Contagem de Palavras</h4>
            <div className="text-3xl font-bold text-gray-900">
              {analysis.analysis_data.word_count}
            </div>
            <p className="text-sm text-gray-600 mt-1">Palavras no total</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Consistência de Tom</h4>
            <p className="text-gray-700 mt-2">
              {analysis.analysis_data.tone_consistency}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
