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
  Monitor,
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

  // Extrai scores AIDA do objeto aida_analysis
  const aidaScores = {
    attention: analysis.aida_analysis?.attention?.score ?? 0,
    interest: analysis.aida_analysis?.interest?.score ?? 0,
    desire: analysis.aida_analysis?.desire?.score ?? 0,
    action: analysis.aida_analysis?.action?.score ?? 0,
  };

  // Score geral (pode ser null)
  const overallScore = analysis.overall_score ?? 0;

  // Custo estimado
  const estimatedCost = analysis.estimated_cost ?? 0;

  // Tokens usados
  const tokensUsed = analysis.tokens_used ?? 0;

  // Tempo de processamento
  const processingTime = analysis.processing_time_ms ?? 0;

  // Formata data relativa
  const timeAgo = analysis.created_at
    ? formatDistanceToNow(new Date(analysis.created_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : 'data desconhecida';

  // Formata custo
  const formattedCost = `$${estimatedCost.toFixed(4)}`;

  return (
    <div className="space-y-6">
      {/* Header com score geral e metadados */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Análise de IA</h2>
            </div>
            <p className="text-sm text-gray-600">
              Analisado {timeAgo} | Custo: {formattedCost} | Tokens: {tokensUsed}
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
          <ScoreCircle score={overallScore} size="lg" label="Score Geral" />
          <div className="flex-1">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${getScoreBadgeClass(
                overallScore
              )}`}
            >
              {overallScore >= 90 && 'Excelente'}
              {overallScore >= 70 && overallScore < 90 && 'Bom'}
              {overallScore >= 50 && overallScore < 70 && 'Regular'}
              {overallScore < 50 && 'Precisa melhorar'}
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
            score={aidaScores.attention}
            size="md"
            label="Atenção"
          />
          <ScoreCircle
            score={aidaScores.interest}
            size="md"
            label="Interesse"
          />
          <ScoreCircle
            score={aidaScores.desire}
            size="md"
            label="Desejo"
          />
          <ScoreCircle
            score={aidaScores.action}
            size="md"
            label="Ação"
          />
        </div>

        {/* Análises detalhadas AIDA */}
        <div className="mt-4 space-y-3">
          {analysis.aida_analysis?.attention?.analysis && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1">Atenção</p>
              <p className="text-sm text-gray-700">{analysis.aida_analysis.attention.analysis}</p>
            </div>
          )}
          {analysis.aida_analysis?.interest?.analysis && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs font-semibold text-green-700 mb-1">Interesse</p>
              <p className="text-sm text-gray-700">{analysis.aida_analysis.interest.analysis}</p>
            </div>
          )}
          {analysis.aida_analysis?.desire?.analysis && (
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 mb-1">Desejo</p>
              <p className="text-sm text-gray-700">{analysis.aida_analysis.desire.analysis}</p>
            </div>
          )}
          {analysis.aida_analysis?.action?.analysis && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Ação</p>
              <p className="text-sm text-gray-700">{analysis.aida_analysis.action.analysis}</p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
          <strong>AIDA</strong> (Attention, Interest, Desire, Action) é um framework clássico de
          marketing que mede a eficácia do criativo em cada etapa da jornada do cliente.
        </div>
      </AccordionSection>

      {/* Análise Visual */}
      {analysis.visual_analysis && Object.keys(analysis.visual_analysis).length > 0 && (
        <AccordionSection title="Análise Visual" icon={<Eye className="w-5 h-5" />}>
          <div className="space-y-3">
            {analysis.visual_analysis.composition_score !== undefined && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Score de Composição</span>
                <span className="font-semibold text-gray-900">{analysis.visual_analysis.composition_score}/100</span>
              </div>
            )}
            {analysis.visual_analysis.color_usage && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Uso de Cores</p>
                <p className="text-sm text-gray-700">{analysis.visual_analysis.color_usage}</p>
              </div>
            )}
            {analysis.visual_analysis.text_visibility && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Visibilidade do Texto</p>
                <p className="text-sm text-gray-700">{analysis.visual_analysis.text_visibility}</p>
              </div>
            )}
            {analysis.visual_analysis.visual_hierarchy && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Hierarquia Visual</p>
                <p className="text-sm text-gray-700">{analysis.visual_analysis.visual_hierarchy}</p>
              </div>
            )}
            {analysis.visual_analysis.contrast_level && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Nível de Contraste</p>
                <p className="text-sm text-gray-700">{analysis.visual_analysis.contrast_level}</p>
              </div>
            )}
            {analysis.visual_analysis.detected_objects && analysis.visual_analysis.detected_objects.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-2">Objetos Detectados</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.visual_analysis.detected_objects.map((obj, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Análise de Copy */}
      {analysis.copy_analysis && Object.keys(analysis.copy_analysis).length > 0 && (
        <AccordionSection title="Análise de Copy" icon={<FileText className="w-5 h-5" />}>
          <div className="space-y-3">
            {analysis.copy_analysis.headline_effectiveness && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Eficácia do Título</p>
                <p className="text-sm text-gray-700">{analysis.copy_analysis.headline_effectiveness}</p>
              </div>
            )}
            {analysis.copy_analysis.body_clarity && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Clareza do Corpo</p>
                <p className="text-sm text-gray-700">{analysis.copy_analysis.body_clarity}</p>
              </div>
            )}
            {analysis.copy_analysis.message_strength && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Força da Mensagem</p>
                <p className="text-sm text-gray-700">{analysis.copy_analysis.message_strength}</p>
              </div>
            )}
            {analysis.copy_analysis.value_proposition && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Proposta de Valor</p>
                <p className="text-sm text-gray-700">{analysis.copy_analysis.value_proposition}</p>
              </div>
            )}
            {analysis.copy_analysis.tone_of_voice && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Tom de Voz</p>
                <p className="text-sm text-gray-700">{analysis.copy_analysis.tone_of_voice}</p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Análise Psicológica */}
      {analysis.psychological_analysis && Object.keys(analysis.psychological_analysis).length > 0 && (
        <AccordionSection
          title="Análise Psicológica"
          icon={<Brain className="w-5 h-5" />}
        >
          <div className="space-y-3">
            {analysis.psychological_analysis.primary_emotion && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Emoção Primária</p>
                <p className="text-sm text-gray-700">{analysis.psychological_analysis.primary_emotion}</p>
              </div>
            )}
            {analysis.psychological_analysis.target_audience_fit && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Adequação ao Público</p>
                <p className="text-sm text-gray-700">{analysis.psychological_analysis.target_audience_fit}</p>
              </div>
            )}
            {analysis.psychological_analysis.cognitive_load && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Carga Cognitiva</p>
                <p className="text-sm text-gray-700">{analysis.psychological_analysis.cognitive_load}</p>
              </div>
            )}
            {analysis.psychological_analysis.emotional_triggers && analysis.psychological_analysis.emotional_triggers.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-2">Gatilhos Emocionais</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.psychological_analysis.emotional_triggers.map((trigger, i) => (
                    <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.psychological_analysis.persuasion_techniques && analysis.psychological_analysis.persuasion_techniques.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-2">Técnicas de Persuasão</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.psychological_analysis.persuasion_techniques.map((tech, i) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Primeira Impressão */}
      {analysis.first_impression && Object.keys(analysis.first_impression).length > 0 && (
        <AccordionSection
          title="Primeira Impressão"
          icon={<Zap className="w-5 h-5" />}
        >
          <div className="space-y-3">
            {analysis.first_impression.attention_score !== undefined && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Score de Atenção</span>
                <span className="font-semibold text-gray-900">{analysis.first_impression.attention_score}/100</span>
              </div>
            )}
            {analysis.first_impression.scrollstopper_potential && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Potencial de Scrollstopper</p>
                <p className="text-sm text-gray-700">{analysis.first_impression.scrollstopper_potential}</p>
              </div>
            )}
            {analysis.first_impression.three_second_message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Mensagem em 3 Segundos</p>
                <p className="text-sm text-gray-700">{analysis.first_impression.three_second_message}</p>
              </div>
            )}
            {analysis.first_impression.visual_clarity && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Clareza Visual</p>
                <p className="text-sm text-gray-700">{analysis.first_impression.visual_clarity}</p>
              </div>
            )}
            {analysis.first_impression.focal_point && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Ponto Focal</p>
                <p className="text-sm text-gray-700">{analysis.first_impression.focal_point}</p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Adequação por Placement */}
      {analysis.placement_suitability && Object.keys(analysis.placement_suitability).length > 0 && (
        <AccordionSection
          title="Adequação por Placement"
          icon={<Monitor className="w-5 h-5" />}
        >
          <div className="space-y-3">
            {analysis.placement_suitability.feed_suitability && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Feed</p>
                <p className="text-sm text-gray-700">{analysis.placement_suitability.feed_suitability}</p>
              </div>
            )}
            {analysis.placement_suitability.stories_suitability && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Stories</p>
                <p className="text-sm text-gray-700">{analysis.placement_suitability.stories_suitability}</p>
              </div>
            )}
            {analysis.placement_suitability.reels_suitability && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Reels</p>
                <p className="text-sm text-gray-700">{analysis.placement_suitability.reels_suitability}</p>
              </div>
            )}
            {analysis.placement_suitability.mobile_friendliness && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Mobile</p>
                <p className="text-sm text-gray-700">{analysis.placement_suitability.mobile_friendliness}</p>
              </div>
            )}
            {analysis.placement_suitability.desktop_friendliness && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">Desktop</p>
                <p className="text-sm text-gray-700">{analysis.placement_suitability.desktop_friendliness}</p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Pontos Fortes */}
      {analysis.strengths && analysis.strengths.length > 0 && (
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{strength.title}</p>
                  {strength.description && (
                    <p className="text-sm text-gray-600 mt-1">{strength.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Pontos Fracos */}
      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{weakness.title}</p>
                  {weakness.description && (
                    <p className="text-sm text-gray-600 mt-1">{weakness.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Recomendações */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <AccordionSection
          title={`Recomendações (${analysis.recommendations.length})`}
          icon={<Target className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} index={index} />
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Metadados de Processamento */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Tempo: {processingTime}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Custo: {formattedCost}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Tokens: {tokensUsed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Modelo: {analysis.model_used || 'Claude'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeAnalysisView;
