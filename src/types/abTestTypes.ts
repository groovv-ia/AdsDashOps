/**
 * Tipos TypeScript para sugestões e tracking de testes A/B
 *
 * Define interfaces para gerenciar o ciclo completo de testes A/B:
 * - Sugestões geradas pela IA
 * - Tracking de implementação
 * - Resultados e conclusões
 */

// Tipos de teste A/B
export type ABTestType = 'visual' | 'copy' | 'cta' | 'layout' | 'color' | 'carousel_order' | 'video_length';

// Prioridade do teste
export type ABTestPriority = 'high' | 'medium' | 'low';

// Dificuldade de implementação
export type ABTestDifficulty = 'easy' | 'medium' | 'hard';

// Status da sugestão de teste
export type ABTestStatus = 'suggested' | 'planned' | 'implemented' | 'completed' | 'discarded';

// Resultado do teste (vencedor)
export type ABTestWinner = 'control' | 'variant' | 'inconclusive';

// Interface para métricas de controle vs variante
export interface ABTestMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
  conversion_rate: number;
  cost_per_conversion: number;
  roas?: number;
}

// Interface para sugestão de teste A/B
export interface ABTestSuggestion {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  test_type: ABTestType;
  priority: ABTestPriority;
  hypothesis: string; // Hipótese do teste (ex: "Trocar cor do botão de verde para vermelho aumentará CTR")
  variant_description: string; // Descrição detalhada da variante
  what_to_change: string; // O que mudar especificamente
  expected_outcome: string; // Resultado esperado
  expected_impact_percentage: string | null; // Impacto esperado (ex: "+15-25% no CTR")
  metrics_to_track: string[]; // Métricas para acompanhar (ex: ["CTR", "Conversion Rate"])
  implementation_difficulty: ABTestDifficulty;
  status: ABTestStatus;
  created_at: string;
  updated_at: string;
}

// Interface para tracking de teste A/B implementado
export interface ABTestTracking {
  id: string;
  ab_suggestion_id: string;
  workspace_id: string;
  implementation_date: string | null; // Data que o teste foi implementado
  variant_ad_id: string | null; // ID do anúncio variante criado
  test_start_date: string | null; // Início oficial do teste
  test_end_date: string | null; // Fim do teste
  control_metrics: ABTestMetrics | null; // Métricas do anúncio de controle
  variant_metrics: ABTestMetrics | null; // Métricas da variante
  result_data: {
    statistical_significance: boolean; // Se o resultado é estatisticamente significativo
    confidence_level: number; // Nível de confiança (ex: 95)
    improvement_percentage: number; // Percentual de melhoria (positivo ou negativo)
    key_learnings: string[]; // Aprendizados-chave do teste
    unexpected_findings: string[]; // Descobertas inesperadas
  } | null;
  conclusion: string | null; // Conclusão final do teste
  winner: ABTestWinner | null; // Vencedor do teste
  created_at: string;
  updated_at: string;
}

// Interface para payload de criação de sugestão de teste A/B
export interface CreateABTestSuggestionPayload {
  ad_id: string;
  meta_ad_account_id: string;
  test_type: ABTestType;
  priority: ABTestPriority;
  hypothesis: string;
  variant_description: string;
  what_to_change: string;
  expected_outcome: string;
  expected_impact_percentage?: string;
  metrics_to_track: string[];
  implementation_difficulty: ABTestDifficulty;
}

// Interface para atualização de status de sugestão
export interface UpdateABTestStatusPayload {
  suggestion_id: string;
  status: ABTestStatus;
}

// Interface para iniciar tracking de teste
export interface StartABTestTrackingPayload {
  ab_suggestion_id: string;
  variant_ad_id: string;
  test_start_date: string;
}

// Interface para finalizar teste com resultados
export interface CompleteABTestPayload {
  tracking_id: string;
  test_end_date: string;
  control_metrics: ABTestMetrics;
  variant_metrics: ABTestMetrics;
  statistical_significance: boolean;
  confidence_level: number;
  key_learnings: string[];
  unexpected_findings: string[];
  conclusion: string;
  winner: ABTestWinner;
}

// Interface para análise comparativa de testes A/B
export interface ABTestComparison {
  control: {
    ad_id: string;
    ad_name: string;
    metrics: ABTestMetrics;
  };
  variant: {
    ad_id: string;
    ad_name: string;
    metrics: ABTestMetrics;
  };
  differences: {
    ctr_difference: number; // Diferença percentual no CTR
    conversion_rate_difference: number;
    cpc_difference: number;
    roas_difference: number;
    winner_metric: string; // Métrica que definiu o vencedor
  };
}

// Função helper para obter label do tipo de teste
export function getABTestTypeLabel(type: ABTestType): string {
  const labels: Record<ABTestType, string> = {
    visual: 'Visual',
    copy: 'Texto/Copy',
    cta: 'Call-to-Action',
    layout: 'Layout',
    color: 'Cores',
    carousel_order: 'Ordem do Carrossel',
    video_length: 'Duração do Vídeo',
  };
  return labels[type];
}

// Função helper para obter cor da prioridade
export function getABTestPriorityColor(priority: ABTestPriority): { text: string; bg: string; border: string } {
  const colors: Record<ABTestPriority, { text: string; bg: string; border: string }> = {
    high: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
    medium: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
    low: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  };
  return colors[priority];
}

// Função helper para obter label de status
export function getABTestStatusLabel(status: ABTestStatus): string {
  const labels: Record<ABTestStatus, string> = {
    suggested: 'Sugerido',
    planned: 'Planejado',
    implemented: 'Implementado',
    completed: 'Concluído',
    discarded: 'Descartado',
  };
  return labels[status];
}

// Função helper para obter cor de status
export function getABTestStatusColor(status: ABTestStatus): { text: string; bg: string } {
  const colors: Record<ABTestStatus, { text: string; bg: string }> = {
    suggested: { text: 'text-gray-700', bg: 'bg-gray-100' },
    planned: { text: 'text-blue-700', bg: 'bg-blue-100' },
    implemented: { text: 'text-purple-700', bg: 'bg-purple-100' },
    completed: { text: 'text-green-700', bg: 'bg-green-100' },
    discarded: { text: 'text-red-700', bg: 'bg-red-100' },
  };
  return colors[status];
}

// Função helper para obter label de dificuldade
export function getABTestDifficultyLabel(difficulty: ABTestDifficulty): string {
  const labels: Record<ABTestDifficulty, string> = {
    easy: 'Fácil',
    medium: 'Média',
    hard: 'Difícil',
  };
  return labels[difficulty];
}

// Função helper para obter cor de dificuldade
export function getABTestDifficultyColor(difficulty: ABTestDifficulty): { text: string; bg: string } {
  const colors: Record<ABTestDifficulty, { text: string; bg: string }> = {
    easy: { text: 'text-green-700', bg: 'bg-green-100' },
    medium: { text: 'text-yellow-700', bg: 'bg-yellow-100' },
    hard: { text: 'text-red-700', bg: 'bg-red-100' },
  };
  return colors[difficulty];
}

// Função helper para obter label do vencedor
export function getABTestWinnerLabel(winner: ABTestWinner): string {
  const labels: Record<ABTestWinner, string> = {
    control: 'Controle (Original)',
    variant: 'Variante (Teste)',
    inconclusive: 'Inconclusivo',
  };
  return labels[winner];
}

// Função helper para calcular diferença percentual entre métricas
export function calculateMetricDifference(controlValue: number, variantValue: number): number {
  if (controlValue === 0) return 0;
  return ((variantValue - controlValue) / controlValue) * 100;
}

// Função helper para determinar se diferença é significativa
export function isSignificantImprovement(difference: number, threshold = 10): boolean {
  return Math.abs(difference) >= threshold;
}

// Função helper para formatar diferença percentual
export function formatPercentageDifference(difference: number): string {
  const sign = difference >= 0 ? '+' : '';
  return `${sign}${difference.toFixed(1)}%`;
}
