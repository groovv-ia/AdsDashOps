import React from 'react';
import { Card } from '../ui/Card';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { Campaign, Metric } from '../../types/advertising';

interface AIInsightsPanelProps {
  campaigns: Campaign[];
  metrics: Metric[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ campaigns, metrics }) => {
  const insights = [
    {
      type: 'recommendation',
      title: 'Aumente o orçamento da campanha "Black Friday 2024"',
      description: 'Esta campanha está performando 35% acima da média. Considere aumentar o orçamento em 20% para maximizar resultados.',
      icon: Lightbulb,
      color: 'bg-blue-500',
      impact: 'high',
    },
    {
      type: 'warning',
      title: 'CTR abaixo da média na campanha "Awareness"',
      description: 'O CTR desta campanha está 15% abaixo do benchmark. Recomendamos testar novos criativos.',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      impact: 'medium',
    },
    {
      type: 'opportunity',
      title: 'Horário de pico identificado',
      description: 'Suas conversões aumentam 45% entre 19h-22h. Ajuste os lances para este período.',
      icon: TrendingUp,
      color: 'bg-green-500',
      impact: 'high',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">Insights com IA</h2>
      </div>
      <p className="text-gray-600">Recomendações personalizadas baseadas no desempenho das suas campanhas</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <Card key={index} padding="medium">
              <div className="flex items-start space-x-4">
                <div className={'p-3 rounded-lg ' + insight.color}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <span className={'text-xs font-semibold px-2 py-1 rounded-full ' + (insight.impact === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>
                    Impacto {insight.impact === 'high' ? 'Alto' : 'Médio'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
