/**
 * RecommendationCard Component
 *
 * Exibe uma recomendação de melhoria para o anúncio com
 * indicadores de prioridade, categoria e impacto esperado.
 */

import React from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Image,
  FileText,
  MousePointer,
  Users,
  Lightbulb,
  ArrowUpRight,
} from 'lucide-react';
import type {
  AdRecommendation,
  RecommendationPriority,
  RecommendationCategory,
} from '../../types/adAnalysis';
import { getPriorityLabel, getPriorityColor, getCategoryLabel } from '../../types/adAnalysis';

interface RecommendationCardProps {
  recommendation: AdRecommendation;
  index?: number;
}

// Ícones por categoria
const categoryIcons: Record<RecommendationCategory, React.ReactNode> = {
  visual: <Image className="w-5 h-5" />,
  copy: <FileText className="w-5 h-5" />,
  cta: <MousePointer className="w-5 h-5" />,
  targeting: <Users className="w-5 h-5" />,
  general: <Lightbulb className="w-5 h-5" />,
};

// Ícone de prioridade
const priorityIcons: Record<RecommendationPriority, React.ReactNode> = {
  high: <AlertTriangle className="w-4 h-4" />,
  medium: <TrendingUp className="w-4 h-4" />,
  low: <ArrowUpRight className="w-4 h-4" />,
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  index,
}) => {
  const { priority, category, title, description, expected_impact } = recommendation;
  const priorityColor = getPriorityColor(priority);
  const priorityLabel = getPriorityLabel(priority);
  const categoryLabel = getCategoryLabel(category);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header com número, categoria e prioridade */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Número da recomendação */}
          {typeof index === 'number' && (
            <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
              {index + 1}
            </span>
          )}
          {/* Ícone e label da categoria */}
          <div className="flex items-center gap-2 text-gray-600">
            {categoryIcons[category]}
            <span className="text-sm font-medium">{categoryLabel}</span>
          </div>
        </div>
        {/* Badge de prioridade */}
        <span
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}
        >
          {priorityIcons[priority]}
          {priorityLabel}
        </span>
      </div>

      {/* Título da recomendação */}
      <h4 className="text-base font-semibold text-gray-900 mb-2">{title}</h4>

      {/* Descrição */}
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{description}</p>

      {/* Impacto esperado */}
      {expected_impact && (
        <div className="flex items-start gap-2 p-2 bg-green-50 rounded-md">
          <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs font-medium text-green-700">Impacto esperado:</span>
            <p className="text-sm text-green-700">{expected_impact}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
