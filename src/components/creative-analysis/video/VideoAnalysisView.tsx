/**
 * VideoAnalysisView
 *
 * Visualiza análise completa de vídeo incluindo gancho, retenção,
 * CTA e análise de frames-chave.
 */

import React from 'react';
import { Play, Zap, Eye, Target, Clock, Sparkles } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { VideoAnalysis, VideoFrameAnalysis } from '../../../types/videoAnalysis';
import { formatVideoDuration } from '../../../types/videoAnalysis';

interface VideoAnalysisViewProps {
  analysis: VideoAnalysis;
  frames: VideoFrameAnalysis[];
}

export function VideoAnalysisView({ analysis, frames }: VideoAnalysisViewProps) {
  return (
    <div className="space-y-6">
      {/* Header com scores principais */}
      <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Análise de Vídeo</h2>
            <p className="text-purple-100">
              Duração: {formatVideoDuration(analysis.video_duration_seconds)} |{' '}
              {frames.length} frames analisados
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
              <Zap className="h-5 w-5" />
              <span className="text-sm">Gancho (3s)</span>
            </div>
            <div className="text-3xl font-bold">{analysis.hook_score}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5" />
              <span className="text-sm">Retenção</span>
            </div>
            <div className="text-3xl font-bold">{analysis.retention_score}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm">CTA</span>
            </div>
            <div className="text-3xl font-bold">{analysis.cta_score}</div>
          </div>
        </div>
      </Card>

      {/* Análise do Gancho */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Análise do Gancho (Primeiros 3 Segundos)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Captura de Atenção</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.hook_analysis.attention_capture}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Potencial de Parar Scroll</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.hook_analysis.scroll_stop_potential}
            </p>
          </div>
        </div>
        {analysis.analysis_data.hook_analysis.visual_elements.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Elementos Visuais</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.analysis_data.hook_analysis.visual_elements.map((element, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full"
                >
                  {element}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Análise de Retenção */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-500" />
          Análise de Retenção
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Análise de Ritmo</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.retention_analysis.pacing_analysis}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Variedade Visual</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.retention_analysis.visual_variety}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Mudanças de Cena</h4>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.analysis_data.retention_analysis.scene_changes}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Duração Ideal?</h4>
              <p className="text-gray-600 text-sm">
                {analysis.analysis_data.retention_analysis.optimal_duration}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Análise de CTA */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-green-500" />
          Análise de CTA e Fechamento
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Clareza do CTA</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.cta_analysis.cta_clarity}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Força do CTA</h4>
            <p className="text-gray-600 text-sm">
              {analysis.analysis_data.cta_analysis.cta_strength}
            </p>
          </div>
        </div>
      </Card>

      {/* Frames-chave */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análise de Frames-Chave
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {frames
            .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
            .map((frame) => (
              <Card key={frame.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {frame.timestamp_seconds}s
                      </h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {frame.insights.role_in_video}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {frame.frame_score}
                    </div>
                    <div className="text-xs text-gray-600">Score</div>
                  </div>
                </div>
                <p className="text-gray-700 mb-2">
                  {frame.insights.visual_description}
                </p>
                {frame.insights.key_elements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {frame.insights.key_elements.map((element, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full"
                      >
                        {element}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
        </div>
      </div>

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
            <Play className="h-5 w-5 text-orange-500" />
            Sugestões de Edição
          </h3>
          <ul className="space-y-2">
            {analysis.analysis_data.editing_suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-orange-500 mt-1">→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
