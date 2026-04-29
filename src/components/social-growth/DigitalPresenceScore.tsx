/**
 * DigitalPresenceScore
 *
 * Exibe o score de presenca digital (0-100) como um gauge circular
 * usando RadialBarChart do Recharts, com historico simplificado.
 */

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { Zap } from 'lucide-react';

interface DigitalPresenceScoreProps {
  score: number;
  loading?: boolean;
}

// Retorna cor e rotulo baseados no score
function getScoreConfig(score: number): { color: string; label: string; textColor: string } {
  if (score >= 75) return { color: '#10b981', label: 'Excelente', textColor: 'text-green-600' };
  if (score >= 50) return { color: '#3b82f6', label: 'Bom', textColor: 'text-blue-600' };
  if (score >= 30) return { color: '#f59e0b', label: 'Regular', textColor: 'text-yellow-600' };
  return { color: '#ef4444', label: 'Em Desenvolvimento', textColor: 'text-red-500' };
}

export const DigitalPresenceScore: React.FC<DigitalPresenceScoreProps> = ({
  score,
  loading = false,
}) => {
  const config = getScoreConfig(score);

  // Dados para o RadialBarChart - precisa de fundo (100%) e valor
  const chartData = [
    { name: 'background', value: 100, fill: '#f3f4f6' },
    { name: 'score', value: score, fill: config.color },
  ];

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2 mb-1 self-start w-full">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Score de Presenca Digital</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3 self-start">
        Indice combinado de crescimento, engajamento e alcance
      </p>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="relative w-36 h-36 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              startAngle={220}
              endAngle={-40}
              data={chartData}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={6}
                background={false}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Score no centro */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${config.textColor}`}>{score}</span>
            <span className="text-xs text-gray-400 font-medium">/ 100</span>
          </div>
        </div>
      )}

      <div className="mt-2">
        <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
      </div>

      {/* Legenda das dimensoes do score */}
      <div className="mt-4 w-full grid grid-cols-2 gap-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          Seguidores 30%
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
          Engajamento 30%
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          Alcance 20%
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
          Perfil 20%
        </div>
      </div>
    </Card>
  );
};
