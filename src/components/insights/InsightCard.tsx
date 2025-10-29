import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AIInsight } from '../../lib/aiInsights';

interface InsightCardProps {
  insight: AIInsight;
  onAction?: (insight: AIInsight) => void;
  compact?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onAction,
  compact = false
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return BarChart3;
      case 'optimization': return Target;
      case 'trend': return TrendingUp;
      case 'recommendation': return Lightbulb;
      case 'alert': return AlertTriangle;
      default: return Sparkles;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'performance': return 'Performance';
      case 'optimization': return 'Otimização';
      case 'trend': return 'Tendência';
      case 'recommendation': return 'Recomendação';
      case 'alert': return 'Alerta';
      default: return 'Insight';
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high': return 'Alto Impacto';
      case 'medium': return 'Médio Impacto';
      case 'low': return 'Baixo Impacto';
      default: return 'Impacto';
    }
  };

  const IconComponent = getInsightIcon(insight.type);
  const colorClasses = getInsightColor(insight.impact);

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClasses}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{insight.title}</h4>
            <p className="text-sm text-gray-600 truncate">{insight.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
              {insight.impact.toUpperCase()}
            </span>
            {onAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(insight)}
              >
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-3 rounded-lg ${colorClasses}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {getTypeLabel(insight.type)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {insight.confidence}% confiança
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
              {getImpactLabel(insight.impact)}
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(insight.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-gray-700 leading-relaxed">{insight.description}</p>
        </div>

        {/* Metrics Analyzed */}
        {insight.metrics_analyzed.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Métricas Analisadas:</h4>
            <div className="flex flex-wrap gap-2">
              {insight.metrics_analyzed.map((metric, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {metric}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insight.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Recomendações:</h4>
            <div className="space-y-2">
              {insight.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {insight.actionable && onAction && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => onAction(insight)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Implementar Recomendação
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};