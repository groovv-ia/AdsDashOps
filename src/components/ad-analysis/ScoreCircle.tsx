/**
 * ScoreCircle Component
 *
 * Exibe um score circular visual (0-100) com cores dinâmicas
 * baseadas no valor do score.
 */

import React from 'react';
import { getScoreColor } from '../../types/adAnalysis';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

// Configurações de tamanho
const sizeConfig = {
  sm: { width: 60, height: 60, strokeWidth: 6, fontSize: 'text-sm', labelSize: 'text-xs' },
  md: { width: 100, height: 100, strokeWidth: 8, fontSize: 'text-xl', labelSize: 'text-sm' },
  lg: { width: 140, height: 140, strokeWidth: 10, fontSize: 'text-3xl', labelSize: 'text-base' },
};

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 'md',
  label,
  showLabel = true,
}) => {
  const config = sizeConfig[size];
  const { color } = getScoreColor(score);

  // Calcula valores do SVG
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = config.width / 2;

  // Mapeia cor do Tailwind para cor SVG
  const getStrokeColor = () => {
    if (color.includes('green')) return '#16a34a';
    if (color.includes('blue')) return '#2563eb';
    if (color.includes('yellow')) return '#ca8a04';
    if (color.includes('red')) return '#dc2626';
    return '#6b7280';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        {/* Círculo de fundo */}
        <svg className="transform -rotate-90" width={config.width} height={config.height}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
            fill="none"
          />
          {/* Círculo de progresso */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Valor central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${config.fontSize} ${color}`}>
            {score}
          </span>
        </div>
      </div>
      {/* Label opcional */}
      {showLabel && label && (
        <span className={`${config.labelSize} text-gray-600 font-medium text-center`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default ScoreCircle;
