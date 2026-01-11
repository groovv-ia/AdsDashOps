/**
 * CarouselAnalysisView
 *
 * Visualiza análise completa de carrossel incluindo storytelling,
 * coerência visual e análise individual de cada slide.
 */

import React from 'react';
import { ArrowRight, Sparkles, Eye, Palette, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { CarouselAnalysis, CarouselSlideAnalysis } from '../../../types/carouselAnalysis';

interface CarouselAnalysisViewProps {
  analysis: CarouselAnalysis;
  slides: CarouselSlideAnalysis[];
}

export function CarouselAnalysisView({ analysis, slides }: CarouselAnalysisViewProps) {
  // Calcula score médio dos slides
  const avgSlideScore =
    slides.length > 0
      ? Math.round(slides.reduce((sum, s) => sum + s.slide_score, 0) / slides.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header com scores principais */}
      <Card className="p-6 bg-gradient-to-br from-purple-500 to-blue-500 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Análise de Carrossel</h2>
            <p className="text-purple-100">
              {slides.length} slides analisados com IA
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{analysis.overall_score}</div>
            <div className="text-purple-100">Score Geral</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5" />
              <span className="text-sm">Storytelling</span>
            </div>
            <div className="text-3xl font-bold">{analysis.storytelling_score}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-5 w-5" />
              <span className="text-sm">Coerência</span>
            </div>
            <div className="text-3xl font-bold">{analysis.coherence_score}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Média Slides</span>
            </div>
            <div className="text-3xl font-bold">{avgSlideScore}</div>
          </div>
        </div>
      </Card>

      {/* Pontos Fortes e Melhorias */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Pontos Fortes
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.key_strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-500 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-orange-500" />
            Oportunidades
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.improvement_areas.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-orange-500 mt-1">→</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Análise de Storytelling */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análise de Storytelling
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Fluxo Narrativo</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.storytelling.narrative_flow}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Jornada Emocional</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.storytelling.emotional_journey}
            </p>
          </div>
        </div>
      </Card>

      {/* Slides individuais */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análise por Slide
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {slides
            .sort((a, b) => a.slide_number - b.slide_number)
            .map((slide) => (
              <Card key={slide.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                      {slide.slide_number}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Slide {slide.slide_number}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {slide.insights.role_in_story}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {slide.slide_score}
                    </div>
                    <div className="text-xs text-gray-600">Score</div>
                  </div>
                </div>

                {slide.insights.strengths.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slide.insights.strengths.map((strength, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full"
                      >
                        {strength}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
        </div>
      </div>

      {/* Sugestões de ordem */}
      {analysis.analysis_data.slide_order_suggestions.length > 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-500" />
            Sugestões de Reordenação
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.slide_order_suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-gray-700">
                {suggestion}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
