/**
 * CreativeAIAnalysisTab
 *
 * Componente principal para exibir análise detalhada de criativo com IA.
 * Inclui análise visual, psicológica, de copy, sugestões de melhorias e testes A/B.
 */

import React, { useState, useCallback } from 'react';
import {
  Eye,
  Brain,
  Type,
  Target,
  Smartphone,
  Monitor,
  TrendingUp,
  Zap,
  Lightbulb,
  Sparkles,
  Instagram,
  Film,
  Palette,
  AlertCircle,
  CheckCircle2,
  Copy as CopyIcon,
} from 'lucide-react';
import type {
  AdAIAnalysis,
  MetaAdCreative,
  AdMetricsAggregated,
  ABTestSuggestion,
} from '../../types/adAnalysis';
import {
  ScoreDisplay,
  ProgressBar,
  BadgeList,
  ColorPaletteViewer,
  ExpandableSection,
  RecommendationCard,
  ABTestSuggestionCard,
  PlacementScoreCard,
  EmptyState,
  LoadingState,
  ErrorState,
} from './CreativeAnalysisComponents';
import { saveABTestSuggestion, checkDuplicateSuggestion } from '../../lib/services/ABTestService';

// ============================================
// Props do Componente
// ============================================

interface CreativeAIAnalysisTabProps {
  analysis: AdAIAnalysis | null;
  creative: MetaAdCreative | null;
  metrics: AdMetricsAggregated | null;
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: () => Promise<void>;
}

// ============================================
// Componente Principal
// ============================================

export const CreativeAIAnalysisTab: React.FC<CreativeAIAnalysisTabProps> = ({
  analysis,
  creative,
  metrics,
  isAnalyzing,
  error,
  onAnalyze,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [savingTest, setSavingTest] = useState<string | null>(null);
  const [savedTests, setSavedTests] = useState<Set<string>>(new Set());

  // ============================================
  // Handlers
  // ============================================

  /**
   * Handler para copiar texto
   */
  const handleCopy = useCallback(() => {
    setCopiedText('Recomendação copiada!');
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  /**
   * Handler para salvar sugestão de teste A/B
   */
  const handleSaveABTest = useCallback(async (suggestion: ABTestSuggestion) => {
    if (!creative) return;

    // Identifica teste pelo hash de hipótese
    const testId = `${suggestion.test_type}-${suggestion.hypothesis.substring(0, 30)}`;
    setSavingTest(testId);

    try {
      // Verifica se já existe sugestão similar
      const isDuplicate = await checkDuplicateSuggestion(
        creative.ad_id,
        suggestion.test_type,
        suggestion.what_to_change
      );

      if (isDuplicate) {
        alert('Já existe uma sugestão similar salva para este anúncio.');
        setSavingTest(null);
        return;
      }

      // Salva sugestão
      await saveABTestSuggestion({
        ad_id: creative.ad_id,
        meta_ad_account_id: creative.meta_ad_account_id,
        test_type: suggestion.test_type,
        priority: suggestion.priority,
        hypothesis: suggestion.hypothesis,
        variant_description: suggestion.variant_description,
        what_to_change: suggestion.what_to_change,
        expected_outcome: suggestion.expected_outcome,
        expected_impact_percentage: undefined,
        metrics_to_track: suggestion.metrics_to_track,
      });

      // Marca como salvo
      setSavedTests(prev => new Set([...prev, testId]));
      alert('Sugestão de teste A/B salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar teste A/B:', err);
      alert('Erro ao salvar sugestão. Tente novamente.');
    } finally {
      setSavingTest(null);
    }
  }, [creative]);

  /**
   * Handler para criar variante (futura implementação)
   */
  const handleCreateVariant = useCallback((suggestion: ABTestSuggestion) => {
    // TODO: Implementar modal de criação de variante
    alert('Funcionalidade de criação de variante será implementada em breve!');
  }, []);

  // ============================================
  // Estados de UI
  // ============================================

  // Estado de loading
  if (isAnalyzing) {
    return <LoadingState message="Analisando criativo com IA..." />;
  }

  // Estado de erro
  if (error) {
    return <ErrorState message={error} onRetry={onAnalyze} />;
  }

  // Estado vazio - sem análise ainda
  if (!analysis) {
    // Verifica se criativo tem dados suficientes para análise
    const hasImageOrVideo = creative?.image_url || creative?.video_url;
    const hasTexts = creative?.title || creative?.body || creative?.description;

    if (!hasImageOrVideo && !hasTexts) {
      return (
        <EmptyState
          icon={<AlertCircle className="w-16 h-16" />}
          title="Criativo Incompleto"
          description="Este criativo não possui imagem ou textos disponíveis para análise. Verifique se o criativo foi carregado corretamente."
        />
      );
    }

    return (
      <EmptyState
        icon={<Sparkles className="w-16 h-16" />}
        title="Análise de Criativo com IA"
        description="Utilize nossa IA avançada para analisar profundamente seu criativo. Receba insights sobre elementos visuais, copy, gatilhos psicológicos, adequação a placements e sugestões de testes A/B."
        actionLabel="Analisar Criativo com IA"
        onAction={onAnalyze}
      />
    );
  }

  // ============================================
  // Renderização da Análise Completa
  // ============================================

  const { visual_analysis, copy_analysis, recommendations, performance_correlation, ab_test_suggestions } = analysis;

  return (
    <div className="space-y-6">
      {/* Notificação de cópia */}
      {copiedText && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {copiedText}
        </div>
      )}

      {/* ==================== Seção de Scores ==================== */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Resumo da Análise
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScoreDisplay
            score={analysis.creative_score}
            label="Score Visual"
            size="lg"
          />
          <ScoreDisplay
            score={analysis.copy_score}
            label="Score de Copy"
            size="lg"
          />
          <ScoreDisplay
            score={analysis.overall_score}
            label="Score Geral"
            size="lg"
          />
        </div>
        <div className="mt-4 text-xs text-gray-600 text-center">
          Analisado em {new Date(analysis.analyzed_at).toLocaleString('pt-BR')} usando {analysis.model_used}
        </div>
      </div>

      {/* ==================== Análise Visual Expandida ==================== */}
      <ExpandableSection
        title="Análise Visual Detalhada"
        icon={<Eye className="w-5 h-5 text-blue-600" />}
        defaultExpanded={true}
        variant="highlight"
      >
        <div className="space-y-4">
          {/* Score de Composição */}
          <ProgressBar
            value={visual_analysis.composition_score}
            label="Score de Composição"
          />

          {/* Paleta de Cores */}
          {visual_analysis.visual_elements?.color_palette && (
            <ColorPaletteViewer colors={visual_analysis.visual_elements.color_palette} />
          )}

          {/* Objetos Detectados */}
          {visual_analysis.visual_elements?.detected_objects && (
            <BadgeList
              items={visual_analysis.visual_elements.detected_objects}
              title="Elementos Visuais Detectados"
              color="purple"
              icon={<Palette className="w-4 h-4" />}
            />
          )}

          {/* Análises textuais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-800 text-sm mb-2">Uso de Cores</h5>
              <p className="text-sm text-blue-700">{visual_analysis.color_usage}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h5 className="font-semibold text-green-800 text-sm mb-2">Visibilidade de Texto</h5>
              <p className="text-sm text-green-700">{visual_analysis.text_visibility}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h5 className="font-semibold text-purple-800 text-sm mb-2">Consistência de Marca</h5>
              <p className="text-sm text-purple-700">{visual_analysis.brand_consistency}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <h5 className="font-semibold text-amber-800 text-sm mb-2">Captura de Atenção</h5>
              <p className="text-sm text-amber-700">{visual_analysis.attention_grabbing}</p>
            </div>
          </div>

          {/* Pontos Fortes e Melhorias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BadgeList
              items={visual_analysis.key_strengths}
              title="Pontos Fortes"
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <BadgeList
              items={visual_analysis.improvement_areas}
              title="Áreas de Melhoria"
              color="amber"
              icon={<AlertCircle className="w-4 h-4" />}
            />
          </div>
        </div>
      </ExpandableSection>

      {/* ==================== Análise Psicológica ==================== */}
      {visual_analysis.psychological_analysis && (
        <ExpandableSection
          title="Análise Psicológica e Emocional"
          icon={<Brain className="w-5 h-5 text-purple-600" />}
          defaultExpanded={true}
        >
          <div className="space-y-4">
            {/* Emoção Primária */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <h5 className="font-semibold text-purple-800 text-sm mb-2">Emoção Primária Evocada</h5>
              <p className="text-lg font-bold text-purple-900">
                {visual_analysis.psychological_analysis.primary_emotion}
              </p>
            </div>

            {/* Gatilhos e Técnicas */}
            <BadgeList
              items={visual_analysis.psychological_analysis.emotional_triggers}
              title="Gatilhos Emocionais"
              color="purple"
              icon={<Zap className="w-4 h-4" />}
            />
            <BadgeList
              items={visual_analysis.psychological_analysis.persuasion_techniques}
              title="Técnicas de Persuasão"
              color="blue"
              icon={<Target className="w-4 h-4" />}
            />
            <BadgeList
              items={visual_analysis.psychological_analysis.trust_signals}
              title="Sinais de Confiança"
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />

            {/* Informações adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-semibold text-blue-800 text-sm mb-2">Público-Alvo Ideal</h5>
                <p className="text-sm text-blue-700">
                  {visual_analysis.psychological_analysis.target_audience_fit}
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h5 className="font-semibold text-amber-800 text-sm mb-2">Carga Cognitiva</h5>
                <p className="text-sm text-amber-700">
                  {visual_analysis.psychological_analysis.cognitive_load}
                </p>
              </div>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ==================== Análise de Primeiro Impacto ==================== */}
      {visual_analysis.first_impression && (
        <ExpandableSection
          title="Análise de Primeiro Impacto (3 segundos)"
          icon={<Zap className="w-5 h-5 text-amber-600" />}
          defaultExpanded={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <ScoreDisplay
                score={visual_analysis.first_impression.attention_score}
                label="Score de Atenção"
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <h5 className="font-semibold text-amber-800 text-sm mb-2">Potencial Scrollstopper</h5>
                <p className="text-sm text-amber-700">
                  {visual_analysis.first_impression.scrollstopper_potential}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h5 className="font-semibold text-purple-800 text-sm mb-2">Ponto Focal</h5>
                <p className="text-sm text-purple-700">
                  {visual_analysis.first_impression.focal_point}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-800 text-sm mb-2">Mensagem Captada em 3 Segundos</h5>
              <p className="text-base font-medium text-blue-900">
                {visual_analysis.first_impression.three_second_message}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h5 className="font-semibold text-green-800 text-sm mb-2">Claridade Visual</h5>
              <p className="text-sm text-green-700">
                {visual_analysis.first_impression.visual_clarity}
              </p>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ==================== Análise de Copy ==================== */}
      <ExpandableSection
        title="Análise de Copy e Mensagem"
        icon={<Type className="w-5 h-5 text-green-600" />}
        defaultExpanded={true}
        variant="highlight"
      >
        <div className="space-y-4">
          {/* Scores de Copy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProgressBar
              value={copy_analysis.clarity_score}
              label="Claridade da Mensagem"
            />
            {copy_analysis.message_analysis && (
              <ProgressBar
                value={copy_analysis.message_analysis.readability_score}
                label="Legibilidade"
              />
            )}
          </div>

          {/* Nível de Persuasão e Urgência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-800 text-sm mb-2">Nível de Persuasão</h5>
              <p className="text-lg font-bold text-blue-900 capitalize">
                {copy_analysis.persuasion_level}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${copy_analysis.urgency_present ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <h5 className="font-semibold text-sm mb-2" style={{ color: copy_analysis.urgency_present ? '#92400e' : '#374151' }}>
                Urgência Presente
              </h5>
              <p className="text-lg font-bold" style={{ color: copy_analysis.urgency_present ? '#78350f' : '#1f2937' }}>
                {copy_analysis.urgency_present ? 'Sim' : 'Não'}
              </p>
            </div>
          </div>

          {/* Análise de CTA */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-semibold text-green-800 text-sm mb-2">Efetividade do CTA</h5>
            <p className="text-sm text-green-700">{copy_analysis.cta_effectiveness}</p>
          </div>

          {/* Power Words */}
          {copy_analysis.message_analysis?.power_words_used && (
            <BadgeList
              items={copy_analysis.message_analysis.power_words_used}
              title="Palavras Poderosas Utilizadas"
              color="purple"
              icon={<Lightbulb className="w-4 h-4" />}
            />
          )}

          {/* Pontos Fortes e Melhorias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BadgeList
              items={copy_analysis.key_strengths}
              title="Pontos Fortes"
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <BadgeList
              items={copy_analysis.improvement_areas}
              title="Áreas de Melhoria"
              color="amber"
              icon={<AlertCircle className="w-4 h-4" />}
            />
          </div>
        </div>
      </ExpandableSection>

      {/* ==================== Análise de Placements ==================== */}
      {visual_analysis.placement_analysis && (
        <ExpandableSection
          title="Adequação por Placement"
          icon={<Smartphone className="w-5 h-5 text-blue-600" />}
          defaultExpanded={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PlacementScoreCard
              placement="Feed"
              suitability={visual_analysis.placement_analysis.feed_suitability}
              icon={<Instagram className="w-5 h-5" />}
            />
            <PlacementScoreCard
              placement="Stories"
              suitability={visual_analysis.placement_analysis.stories_suitability}
              icon={<Smartphone className="w-5 h-5" />}
            />
            <PlacementScoreCard
              placement="Reels"
              suitability={visual_analysis.placement_analysis.reels_suitability}
              icon={<Film className="w-5 h-5" />}
            />
            <PlacementScoreCard
              placement="Mobile"
              suitability={visual_analysis.placement_analysis.mobile_friendliness}
              icon={<Smartphone className="w-5 h-5" />}
            />
            <PlacementScoreCard
              placement="Desktop"
              suitability={visual_analysis.placement_analysis.desktop_friendliness}
              icon={<Monitor className="w-5 h-5" />}
            />
          </div>
        </ExpandableSection>
      )}

      {/* ==================== Correlação com Performance ==================== */}
      {performance_correlation && (
        <ExpandableSection
          title="Impacto na Performance"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          defaultExpanded={true}
          variant="highlight"
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-800 text-sm mb-2">Resumo de Performance</h5>
              <p className="text-sm text-blue-700">{performance_correlation.performance_summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h5 className="font-semibold text-purple-800 text-sm mb-2">Link Visual-Performance</h5>
                <p className="text-sm text-purple-700">{performance_correlation.visual_performance_link}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-semibold text-green-800 text-sm mb-2">Link Copy-Performance</h5>
                <p className="text-sm text-green-700">{performance_correlation.copy_performance_link}</p>
              </div>
            </div>

            <BadgeList
              items={performance_correlation.underperforming_areas}
              title="Áreas com Baixa Performance"
              color="red"
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <BadgeList
              items={performance_correlation.high_performing_elements}
              title="Elementos de Alta Performance"
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h5 className="font-semibold text-amber-800 text-sm mb-2">Prioridade de Otimização</h5>
              <p className="text-sm text-amber-700">{performance_correlation.optimization_priority}</p>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ==================== Recomendações ==================== */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Recomendações de Melhoria
        </h3>
        {recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {recommendations
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((rec, index) => (
                <RecommendationCard
                  key={index}
                  recommendation={rec}
                  onCopy={handleCopy}
                />
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhuma recomendação disponível.</p>
        )}
      </div>

      {/* ==================== Sugestões de Testes A/B ==================== */}
      {ab_test_suggestions && ab_test_suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Sugestões de Testes A/B
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ab_test_suggestions
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((suggestion, index) => {
                const testId = `${suggestion.test_type}-${suggestion.hypothesis.substring(0, 30)}`;
                const isSaved = savedTests.has(testId);
                const isSaving = savingTest === testId;

                return (
                  <ABTestSuggestionCard
                    key={index}
                    suggestion={suggestion}
                    onSave={!isSaving && !isSaved ? handleSaveABTest : undefined}
                    onCreateVariant={handleCreateVariant}
                    isSaved={isSaved}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Botão de Re-análise */}
      <div className="flex justify-center pt-6 border-t border-gray-200">
        <button
          onClick={onAnalyze}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Gerar Nova Análise
        </button>
      </div>
    </div>
  );
};

export default CreativeAIAnalysisTab;
