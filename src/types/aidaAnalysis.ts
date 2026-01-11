/**
 * Tipos TypeScript para análise de copy usando framework AIDA
 *
 * AIDA (Attention, Interest, Desire, Action) é um framework clássico
 * de copywriting que estrutura a mensagem em 4 etapas:
 * - Attention (Atenção): Captura a atenção do leitor
 * - Interest (Interesse): Mantém o interesse com informação relevante
 * - Desire (Desejo): Cria desejo pelo produto/serviço
 * - Action (Ação): Leva à ação através de CTA claro
 */

// Interface para análise da etapa de Atenção
export interface AttentionAnalysis {
  attention_score: number; // Score de captura de atenção (0-100)
  headline_effectiveness: string; // Efetividade do headline
  opening_hook: string; // Análise do gancho de abertura
  visual_text_synergy: string; // Sinergia entre visual e texto
  pattern_interrupt: string; // Capacidade de interromper padrões
  curiosity_trigger: string; // Gatilhos de curiosidade
  first_impression: string; // Primeira impressão geral
  improvements: string[]; // Sugestões de melhoria para atenção
}

// Interface para análise da etapa de Interesse
export interface InterestAnalysis {
  interest_score: number; // Score de manutenção de interesse (0-100)
  relevance_to_audience: string; // Relevância para o público-alvo
  information_quality: string; // Qualidade da informação apresentada
  storytelling_elements: string; // Elementos de storytelling presentes
  engagement_factors: string[]; // Fatores que mantêm engajamento
  credibility_signals: string[]; // Sinais de credibilidade
  flow_quality: string; // Qualidade do fluxo da mensagem
  improvements: string[]; // Sugestões de melhoria para interesse
}

// Interface para análise da etapa de Desejo
export interface DesireAnalysis {
  desire_score: number; // Score de criação de desejo (0-100)
  benefit_focus: string; // Foco em benefícios vs características
  emotional_triggers: string[]; // Gatilhos emocionais utilizados
  value_proposition_clarity: string; // Clareza da proposta de valor
  urgency_elements: string[]; // Elementos de urgência
  scarcity_elements: string[]; // Elementos de escassez
  social_proof: string; // Prova social presente
  pain_point_addressing: string; // Como aborda pontos de dor
  improvements: string[]; // Sugestões de melhoria para desejo
}

// Interface para análise da etapa de Ação
export interface ActionAnalysis {
  action_score: number; // Score de impulso à ação (0-100)
  cta_clarity: string; // Clareza do call-to-action
  cta_strength: string; // Força do CTA
  cta_placement: string; // Posicionamento do CTA
  cta_urgency: string; // Urgência no CTA
  friction_points: string[]; // Pontos de fricção que impedem ação
  action_simplicity: string; // Simplicidade da ação solicitada
  next_steps_clarity: string; // Clareza dos próximos passos
  improvements: string[]; // Sugestões de melhoria para ação
}

// Interface para análise detalhada de power words
export interface PowerWordsAnalysis {
  power_words_found: string[]; // Power words identificadas
  emotional_words: string[]; // Palavras emocionais
  action_words: string[]; // Palavras de ação
  sensory_words: string[]; // Palavras sensoriais
  power_words_score: number; // Score de uso de power words (0-100)
  suggestions: string[]; // Sugestões de power words adicionais
}

// Interface para análise completa usando framework AIDA
export interface AIDACopyAnalysis {
  id: string;
  workspace_id: string;
  ad_id: string;
  meta_ad_account_id: string;
  overall_score: number; // Score geral da copy (0-100)
  attention_score: number; // Score da etapa Attention
  interest_score: number; // Score da etapa Interest
  desire_score: number; // Score da etapa Desire
  action_score: number; // Score da etapa Action
  analysis_data: {
    attention_analysis: AttentionAnalysis;
    interest_analysis: InterestAnalysis;
    desire_analysis: DesireAnalysis;
    action_analysis: ActionAnalysis;
    power_words_analysis: PowerWordsAnalysis;
    overall_strengths: string[]; // Pontos fortes gerais
    overall_improvements: string[]; // Melhorias gerais sugeridas
    aida_flow_quality: string; // Qualidade do fluxo AIDA geral
    target_audience_alignment: string; // Alinhamento com público-alvo
    tone_consistency: string; // Consistência de tom
    readability_score: number; // Score de legibilidade (0-100)
    word_count: number; // Contagem de palavras
  };
  model_used: string;
  tokens_used: number;
  analyzed_at: string;
  created_at: string;
}

// Interface para payload de requisição de análise AIDA
export interface AnalyzeAIDAPayload {
  ad_id: string;
  meta_ad_account_id: string;
  copy_data: {
    headline?: string; // Título principal
    body?: string; // Corpo do texto
    description?: string; // Descrição
    cta?: string; // Call-to-action
  };
  image_url?: string; // URL da imagem (para analisar sinergia visual-textual)
  performance_context?: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    conversions: number;
    conversion_rate: number;
  };
}

// Interface para resposta de análise AIDA
export interface AnalyzeAIDAResponse {
  aida_analysis: AIDACopyAnalysis;
  tokens_used: number;
  saved: boolean;
  save_error?: string;
}

// Função helper para obter label da etapa AIDA
export function getAIDAStageLabel(stage: 'attention' | 'interest' | 'desire' | 'action'): string {
  const labels = {
    attention: 'Atenção',
    interest: 'Interesse',
    desire: 'Desejo',
    action: 'Ação',
  };
  return labels[stage];
}

// Função helper para obter descrição da etapa AIDA
export function getAIDAStageDescription(stage: 'attention' | 'interest' | 'desire' | 'action'): string {
  const descriptions = {
    attention: 'Captura a atenção do público com headline e gancho impactantes',
    interest: 'Mantém o interesse apresentando informações relevantes e envolventes',
    desire: 'Cria desejo mostrando benefícios e gatilhos emocionais',
    action: 'Leva à ação através de CTA claro e urgente',
  };
  return descriptions[stage];
}

// Função helper para obter cor do score AIDA
export function getAIDAScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-green-700', bg: 'bg-green-100' };
  if (score >= 60) return { text: 'text-blue-700', bg: 'bg-blue-100' };
  if (score >= 40) return { text: 'text-yellow-700', bg: 'bg-yellow-100' };
  return { text: 'text-red-700', bg: 'bg-red-100' };
}

// Função helper para obter ícone da etapa AIDA
export function getAIDAStageIcon(stage: 'attention' | 'interest' | 'desire' | 'action'): string {
  const icons = {
    attention: 'Eye', // Lucide icon name
    interest: 'BookOpen',
    desire: 'Heart',
    action: 'Zap',
  };
  return icons[stage];
}

// Função helper para calcular score médio AIDA
export function calculateAIDAOverallScore(
  attentionScore: number,
  interestScore: number,
  desireScore: number,
  actionScore: number
): number {
  // Atenção e Ação têm peso maior pois são críticos
  const weightedScore = (
    attentionScore * 0.3 +
    interestScore * 0.2 +
    desireScore * 0.2 +
    actionScore * 0.3
  );
  return Math.round(weightedScore);
}
