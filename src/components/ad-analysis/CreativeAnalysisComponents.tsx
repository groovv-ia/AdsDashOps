/**
 * CreativeAnalysisComponents
 *
 * Componentes reutilizáveis para a análise de criativos com IA.
 * Inclui ScoreDisplay, RecommendationCard, ABTestSuggestionCard, etc.
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Sparkles,
  Eye,
  Brain,
  Zap,
  TestTube,
} from 'lucide-react';
import type {
  AdRecommendation,
  ABTestSuggestion,
  RecommendationPriority,
} from '../../types/adAnalysis';
import {
  getScoreColor,
  getPriorityLabel,
  getPriorityColor,
  getCategoryLabel,
  getImplementationDifficultyLabel,
  getImplementationDifficultyColor,
} from '../../types/adAnalysis';

// ============================================
// ScoreDisplay - Exibição de score com circular gauge
// ============================================

interface ScoreDisplayProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  label,
  size = 'md',
  showLabel = true,
}) => {
  const { color, bg } = getScoreColor(score);

  // Define tamanhos baseado na prop size
  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-base' },
  };

  const sizes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizes.container} rounded-full ${bg} flex items-center justify-center border-4 ${color.replace('text-', 'border-')}`}
      >
        <span className={`${sizes.text} font-bold ${color}`}>{score}</span>
      </div>
      {showLabel && (
        <span className={`${sizes.label} font-medium text-gray-700 text-center`}>
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================
// ProgressBar - Barra de progresso para scores lineares
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
}) => {
  const percentage = (value / max) * 100;
  const { color, bg } = getScoreColor(value);

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showValue && (
            <span className={`text-sm font-semibold ${color}`}>
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// BadgeList - Lista de badges categorizadas
// ============================================

interface BadgeListProps {
  items: string[];
  title?: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';
  icon?: React.ReactNode;
}

export const BadgeList: React.FC<BadgeListProps> = ({
  items,
  title,
  color = 'blue',
  icon,
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={index}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[color]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ColorPaletteViewer - Visualizador de paleta de cores
// ============================================

interface ColorPaletteViewerProps {
  colors: string[];
  title?: string;
}

export const ColorPaletteViewer: React.FC<ColorPaletteViewerProps> = ({
  colors,
  title = 'Paleta de Cores',
}) => {
  if (colors.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <div className="flex flex-wrap gap-3">
        {colors.map((color, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
            <span className="text-xs text-gray-600 font-mono">{color}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ExpandableSection - Seção com expansão/collapse
// ============================================

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'highlight';
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  children,
  icon,
  defaultExpanded = false,
  variant = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const bgClass = variant === 'highlight' ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'bg-gray-50';

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${bgClass}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">{children}</div>
      )}
    </div>
  );
};

// ============================================
// RecommendationCard - Card de recomendação
// ============================================

interface RecommendationCardProps {
  recommendation: AdRecommendation;
  onCopy?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onCopy,
}) => {
  const priorityColor = getPriorityColor(recommendation.priority);
  const difficultyColor = recommendation.implementation_difficulty
    ? getImplementationDifficultyColor(recommendation.implementation_difficulty)
    : null;

  const handleCopy = () => {
    const text = `${recommendation.title}\n\n${recommendation.description}\n\nImpacto Esperado: ${recommendation.expected_impact}`;
    navigator.clipboard.writeText(text);
    if (onCopy) onCopy();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header com prioridade e categoria */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColor.bg} ${priorityColor.text}`}
            >
              {getPriorityLabel(recommendation.priority)}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {getCategoryLabel(recommendation.category)}
            </span>
            {difficultyColor && recommendation.implementation_difficulty && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColor.bg} ${difficultyColor.text}`}
              >
                {getImplementationDifficultyLabel(recommendation.implementation_difficulty)}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-800">{recommendation.title}</h4>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Copiar recomendação"
        >
          <Copy className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Descrição */}
      <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>

      {/* Impacto esperado */}
      <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg mb-3">
        <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-green-700">Impacto Esperado:</span>
          <p className="text-sm text-green-600">{recommendation.expected_impact}</p>
          {recommendation.estimated_impact_percentage && (
            <p className="text-xs text-green-600 mt-1">
              <strong>{recommendation.estimated_impact_percentage}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Sugestão de teste A/B se disponível */}
      {recommendation.ab_test_suggestion && (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">
              Sugestão de Teste A/B
            </span>
          </div>
          <p className="text-sm text-purple-600">
            {recommendation.ab_test_suggestion.hypothesis}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================
// ABTestSuggestionCard - Card de sugestão de teste A/B
// ============================================

interface ABTestSuggestionCardProps {
  suggestion: ABTestSuggestion;
  onSave?: (suggestion: ABTestSuggestion) => void;
  onCreateVariant?: (suggestion: ABTestSuggestion) => void;
  isSaved?: boolean;
}

export const ABTestSuggestionCard: React.FC<ABTestSuggestionCardProps> = ({
  suggestion,
  onSave,
  onCreateVariant,
  isSaved = false,
}) => {
  const priorityColor = getPriorityColor(suggestion.priority);

  // Ícones por tipo de teste
  const testTypeIcons = {
    visual: <Eye className="w-4 h-4" />,
    copy: <Lightbulb className="w-4 h-4" />,
    cta: <Target className="w-4 h-4" />,
    layout: <Sparkles className="w-4 h-4" />,
    color: <Zap className="w-4 h-4" />,
  };

  const testTypeLabels = {
    visual: 'Visual',
    copy: 'Copy',
    cta: 'CTA',
    layout: 'Layout',
    color: 'Cor',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            {testTypeIcons[suggestion.test_type]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700">
                Teste de {testTypeLabels[suggestion.test_type]}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColor.bg} ${priorityColor.text}`}
              >
                {getPriorityLabel(suggestion.priority)}
              </span>
            </div>
          </div>
        </div>
        {isSaved && (
          <CheckCircle className="w-5 h-5 text-green-600" title="Já salvo" />
        )}
      </div>

      {/* Hipótese */}
      <div className="mb-3">
        <h5 className="text-xs font-semibold text-gray-700 mb-1">Hipótese</h5>
        <p className="text-sm text-gray-800 font-medium">{suggestion.hypothesis}</p>
      </div>

      {/* O que mudar */}
      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-xs font-semibold text-blue-700 mb-1">O que mudar</h5>
        <p className="text-sm text-blue-600">{suggestion.what_to_change}</p>
      </div>

      {/* Resultado esperado */}
      <div className="mb-3 p-3 bg-green-50 rounded-lg">
        <h5 className="text-xs font-semibold text-green-700 mb-1">Resultado Esperado</h5>
        <p className="text-sm text-green-600">{suggestion.expected_outcome}</p>
      </div>

      {/* Métricas para rastrear */}
      {suggestion.metrics_to_track && suggestion.metrics_to_track.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">
            Métricas para rastrear
          </h5>
          <div className="flex flex-wrap gap-1">
            {suggestion.metrics_to_track.map((metric, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 mt-3">
        {!isSaved && onSave && (
          <button
            onClick={() => onSave(suggestion)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Salvar Sugestão
          </button>
        )}
        {onCreateVariant && (
          <button
            onClick={() => onCreateVariant(suggestion)}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Criar Variante
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// PlacementScoreCard - Card de score por placement
// ============================================

interface PlacementScoreCardProps {
  placement: string;
  suitability: string;
  icon: React.ReactNode;
}

export const PlacementScoreCard: React.FC<PlacementScoreCardProps> = ({
  placement,
  suitability,
  icon,
}) => {
  // Determina cor baseado na adequação
  let colorClass = 'border-gray-300 bg-gray-50';
  let textClass = 'text-gray-700';

  if (suitability.toLowerCase().includes('excelente') || suitability.toLowerCase().includes('ótim')) {
    colorClass = 'border-green-300 bg-green-50';
    textClass = 'text-green-700';
  } else if (suitability.toLowerCase().includes('bom') || suitability.toLowerCase().includes('adequad')) {
    colorClass = 'border-blue-300 bg-blue-50';
    textClass = 'text-blue-700';
  } else if (suitability.toLowerCase().includes('ruim') || suitability.toLowerCase().includes('inadequad')) {
    colorClass = 'border-red-300 bg-red-50';
    textClass = 'text-red-700';
  }

  return (
    <div className={`rounded-lg border-2 ${colorClass} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={textClass}>{icon}</div>
        <h4 className={`font-semibold ${textClass}`}>{placement}</h4>
      </div>
      <p className={`text-sm ${textClass}`}>{suitability}</p>
    </div>
  );
};

// ============================================
// EmptyState - Estado vazio com CTA
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {actionLabel}
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ============================================
// LoadingState - Estado de loading animado
// ============================================

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Analisando criativo com IA...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600" />
        <Brain className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
      <p className="text-sm text-gray-600 text-center max-w-md">
        Nossa IA está analisando profundamente seu criativo. Isso pode levar de 15 a 45 segundos.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

// ============================================
// ErrorState - Estado de erro com retry
// ============================================

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-4 bg-red-100 rounded-full">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Erro ao Analisar</h3>
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
};
