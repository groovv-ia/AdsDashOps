/**
 * CreativeAnalysisHub
 *
 * Página hub central para todas as análises de criativos com IA.
 * Fornece acesso a análises de carrossel, vídeo, copy AIDA e testes A/B.
 */

import React, { useState } from 'react';
import { Sparkles, Image, Video, MessageSquare, FlaskConical, TrendingUp, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Tipos de análise disponíveis
type AnalysisType = 'carousel' | 'video' | 'aida' | 'ab-tests' | null;

export function CreativeAnalysisHub() {
  const [selectedType, setSelectedType] = useState<AnalysisType>(null);

  // Cards de opções de análise
  const analysisOptions = [
    {
      type: 'carousel' as const,
      icon: Image,
      title: 'Análise de Carrossel',
      description: 'Analise storytelling, coerência visual e performance de cada slide',
      features: ['Storytelling Score', 'Coerência Visual', 'Análise por Slide', 'Sugestões de Ordem'],
      color: 'bg-blue-500',
    },
    {
      type: 'video' as const,
      icon: Video,
      title: 'Análise de Vídeo',
      description: 'Analise gancho, retenção, frames-chave e CTA do vídeo',
      features: ['Hook Score (3s)', 'Análise de Retenção', 'Frames-Chave', 'Score de CTA'],
      color: 'bg-purple-500',
    },
    {
      type: 'aida' as const,
      icon: MessageSquare,
      title: 'Análise AIDA de Copy',
      description: 'Analise copy usando framework AIDA (Atenção, Interesse, Desejo, Ação)',
      features: ['4 Scores AIDA', 'Power Words', 'Gatilhos Emocionais', 'Sugestões de CTA'],
      color: 'bg-green-500',
    },
    {
      type: 'ab-tests' as const,
      icon: FlaskConical,
      title: 'Testes A/B Inteligentes',
      description: 'Sugestões de testes A/B geradas por IA e tracking de resultados',
      features: ['Sugestões com IA', 'Hipóteses', 'Tracking', 'Biblioteca de Testes'],
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Análise Avançada de Criativos com IA
              </h1>
              <p className="text-gray-600 mt-1">
                Insights profundos powered by GPT-4 Vision para otimizar suas campanhas
              </p>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Análises Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Testes A/B Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
                <FlaskConical className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Score Médio</p>
                  <p className="text-2xl font-bold text-gray-900">78</p>
                </div>
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
            <Card className="p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tempo Economizado</p>
                  <p className="text-2xl font-bold text-gray-900">12h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* Cards de opções de análise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {analysisOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.type}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                  selectedType === option.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedType(option.type)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 ${option.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {option.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{option.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Área de ação */}
        {selectedType && (
          <Card className="p-6 bg-white border border-gray-200">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pronto para começar?
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedType === 'carousel' &&
                  'Selecione um anúncio de carrossel para análise detalhada de storytelling'}
                {selectedType === 'video' &&
                  'Selecione um anúncio de vídeo para análise de gancho e retenção'}
                {selectedType === 'aida' &&
                  'Selecione um anúncio para análise AIDA completa da copy'}
                {selectedType === 'ab-tests' &&
                  'Veja sugestões de testes A/B geradas por IA para seus anúncios'}
              </p>
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500">
                <Sparkles className="h-5 w-5 mr-2" />
                Iniciar Análise
              </Button>
            </div>
          </Card>
        )}

        {/* Seção de recursos */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Análise Profunda</h4>
            </div>
            <p className="text-gray-600 text-sm">
              IA analisa múltiplos aspectos: visual, copy, estrutura e performance para
              fornecer insights acionáveis
            </p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Scores Detalhados</h4>
            </div>
            <p className="text-gray-600 text-sm">
              Cada análise fornece scores específicos por dimensão, facilitando
              identificar oportunidades de melhoria
            </p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FlaskConical className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Testes A/B Guiados</h4>
            </div>
            <p className="text-gray-600 text-sm">
              Sugestões automáticas de testes A/B com hipóteses claras e tracking de
              resultados integrado
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
