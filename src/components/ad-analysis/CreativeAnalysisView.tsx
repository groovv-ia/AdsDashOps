/**
 * CreativeAnalysisView Component
 *
 * Componente completo para exibir análise de criativo gerada pelo Claude AI.
 * Inclui scores AIDA, análises detalhadas, pontos fortes/fracos e recomendações.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Brain,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RotateCw,
  Download,
  Sparkles,
} from 'lucide-react';
import type { ClaudeCreativeAnalysis } from '../../hooks/useCreativeAnalysis';
import { ScoreCircle } from './ScoreCircle';
import { RecommendationCard } from './RecommendationCard';
import { Button } from '../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreativeAnalysisViewProps {
  analysis: ClaudeCreativeAnalysis;
  loading?: boolean;
  onReanalyze?: () => void;
  onExport?: () => void;
}

/**
 * Seção expansível genérica
 */
interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-600">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

/**
 * Componente principal de visualização da análise
 */
export const CreativeAnalysisView: React.FC<CreativeAnalysisViewProps> = ({
  analysis,
  loading = false,
  onReanalyze,
  onExport,
}) => {
  // Determina cor do badge baseado no score geral
  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Formata data relativa
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Formata custo
  const formattedCost = `$${analysis.cost_usd.toFixed(4)}`;

  // Filtra recomendações por prioridade
  const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high');
  const mediumPriorityRecs = analysis.recommendations.filter(r => r.priority === 'medium');
  const lowPriorityRecs = analysis.recommendations.filter(r => r.priority === 'low');

  return (
    <div className="space-y-6">
      {/* Header com score geral e metadados */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Análise de IA</h2>
            </div>
            <p className="text-sm text-gray-600">
              Analisado {timeAgo} | Custo: {formattedCost} | Tokens: {analysis.tokens_used}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onReanalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReanalyze}
                disabled={loading}
              >
                <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Re-analisar
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            )}
          </div>
        </div>

        {/* Score geral e badge de qualidade */}
        <div className="flex items-center gap-6">
          <ScoreCircle score={analysis.overall_score} size="lg" label="Score Geral" />
          <div className="flex-1">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${getScoreBadgeClass(
                analysis.overall_score
              )}`}
            >
              {analysis.overall_score >= 90 && '🏆 Excelente'}
              {analysis.overall_score >= 70 && analysis.overall_score < 90 && '👍 Bom'}
              {analysis.overall_score >= 50 && analysis.overall_score < 70 && '⚠️ Regular'}
              {analysis.overall_score < 50 && '❌ Precisa melhorar'}
            </span>
          </div>
        </div>
      </div>

      {/* Framework AIDA Scores */}
      <AccordionSection
        title="Framework AIDA"
        icon={<Target className="w-5 h-5" />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCircle
            score={analysis.aida_attention_score}
            size="md"
            label="Atenção"
          />
          <ScoreCircle
            score={analysis.aida_interest_score}
            size="md"
            label="Interesse"
          />
          <ScoreCircle
            score={analysis.aida_desire_score}
            size="md"
            label="Desejo"
          />
          <ScoreCircle
            score={analysis.aida_action_score}
            size="md"
            label="Ação"
          />
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
          <strong>AIDA</strong> (Attention, Interest, Desire, Action) é um framework clássico de
          marketing que mede a eficácia do criativo em cada etapa da jornada do cliente.
        </div>
      </AccordionSection>

      {/* Análise Visual */}
      {analysis.visual_analysis && (
        <AccordionSection title="Análise Visual" icon={<Eye className="w-5 h-5" />}>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {typeof analysis.visual_analysis === 'string'
                ? analysis.visual_analysis
                : JSON.stringify(analysis.visual_analysis, null, 2)}
            </pre>
          </div>
        </AccordionSection>
      )}

      {/* Análise de Copy */}
      {analysis.copy_analysis && (
        <AccordionSection title="Análise de Copy" icon={<FileText className="w-5 h-5" />}>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {typeof analysis.copy_analysis === 'string'
                ? analysis.copy_analysis
                : JSON.stringify(analysis.copy_analysis, null, 2)}
            </pre>
          </div>
        </AccordionSection>
      )}

      {/* Análise Psicológica */}
      {analysis.psychological_analysis && (
        <AccordionSection
          title="Análise Psicológica"
          icon={<Brain className="w-5 h-5" />}
        >
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {typeof analysis.psychological_analysis === 'string'
                ? analysis.psychological_analysis
                : JSON.stringify(analysis.psychological_analysis, null, 2)}
            </pre>
          </div>
        </AccordionSection>
      )}

      {/* Primeira Impressão */}
      {analysis.first_impression && (
        <AccordionSection
          title="Primeira Impressão"
          icon={<Zap className="w-5 h-5" />}
        >
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {typeof analysis.first_impression === 'string'
                ? analysis.first_impression
                : JSON.stringify(analysis.first_impression, null, 2)}
            </pre>
          </div>
        </AccordionSection>
      )}

      {/* Adequação por Placement */}
      {analysis.placement_suitability && (
        <AccordionSection
          title="Adequação por Placement"
          icon={<Target className="w-5 h-5" />}
        >
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {typeof analysis.placement_suitability === 'string'
                ? analysis.placement_suitability
                : JSON.stringify(analysis.placement_suitability, null, 2)}
            </pre>
          </div>
        </AccordionSection>
      )}

      {/* Pontos Fortes */}
      {analysis.strengths.length > 0 && (
        <AccordionSection
          title={`Pontos Fortes (${analysis.strengths.length})`}
          icon={<CheckCircle className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-2">
            {analysis.strengths.map((strength, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{strength}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Pontos Fracos */}
      {analysis.weaknesses.length > 0 && (
        <AccordionSection
          title={`Pontos Fracos (${analysis.weaknesses.length})`}
          icon={<XCircle className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-2">
            {analysis.weaknesses.map((weakness, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{weakness}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Recomendações - Alta Prioridade */}
      {highPriorityRecs.length > 0 && (
        <AccordionSection
          title={`Recomendações - Alta Prioridade (${highPriorityRecs.length})`}
          icon={<Target className="w-5 h-5 text-red-600" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {highPriorityRecs.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} index={index} />
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Recomendações - Média Prioridade */}
      {mediumPriorityRecs.length > 0 && (
        <AccordionSection
          title={`Recomendações - Média Prioridade (${mediumPriorityRecs.length})`}
          icon={<Target className="w-5 h-5 text-yellow-600" />}
        >
          <div className="space-y-3">
            {mediumPriorityRecs.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} index={index} />
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Recomendações - Baixa Prioridade */}
      {lowPriorityRecs.length > 0 && (
        <AccordionSection
          title={`Recomendações - Baixa Prioridade (${lowPriorityRecs.length})`}
          icon={<Target className="w-5 h-5 text-blue-600" />}
        >
          <div className="space-y-3">
            {lowPriorityRecs.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} index={index} />
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Metadados de Processamento */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Tempo: {analysis.processing_time_ms}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Custo: {formattedCost}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Tokens: {analysis.tokens_used}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeAnalysisView;
