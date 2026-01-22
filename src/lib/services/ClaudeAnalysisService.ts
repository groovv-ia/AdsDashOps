/**
 * Serviço para análise de criativos usando Claude AI
 *
 * Este serviço gerencia a comunicação com a Edge Function que usa
 * Claude 3.5 Sonnet para analisar criativos de anúncios.
 *
 * Inclui:
 * - Verificacao de expiracao do token antes de requisicoes
 * - Refresh automatico do token quando necessario
 * - Retry automatico em caso de falha de autenticacao
 */

import { supabase } from '../supabase';
import type { MetaAdCreative } from '../../types/adAnalysis';

// Margem de seguranca para refresh do token (5 minutos antes de expirar)
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// Numero maximo de tentativas de retry
const MAX_RETRIES = 2;

/**
 * Verifica se o token da sessao esta expirado ou proximo de expirar
 */
function isTokenExpiredOrExpiring(expiresAt: number | undefined): boolean {
  if (!expiresAt) return true;
  const expiryTime = expiresAt * 1000;
  const now = Date.now();
  return now >= expiryTime - TOKEN_EXPIRY_MARGIN_MS;
}

/**
 * Obtem uma sessao valida, fazendo refresh se necessario
 */
async function getValidSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuario nao autenticado. Faca login novamente.');
  }

  // Verifica se o token esta expirado ou proximo de expirar
  if (isTokenExpiredOrExpiring(session.expires_at)) {
    console.log('[ClaudeAnalysis] Token expirado ou expirando, fazendo refresh...');

    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !newSession) {
      console.error('[ClaudeAnalysis] Erro ao fazer refresh do token:', refreshError);
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    console.log('[ClaudeAnalysis] Token renovado com sucesso');
    return newSession;
  }

  return session;
}

// Interface para análise completa do Claude
export interface ClaudeCreativeAnalysis {
  id: string;
  workspace_id: string;
  creative_id: string;
  ad_id: string;
  analysis_type: 'image' | 'video' | 'carousel';
  model_used: string;
  overall_score: number | null;
  visual_analysis: {
    composition_score?: number;
    detected_objects?: string[];
    color_palette?: string[];
    color_usage?: string;
    text_visibility?: string;
    visual_hierarchy?: string;
    contrast_level?: string;
    composition_type?: string;
  };
  copy_analysis: {
    headline_effectiveness?: string;
    body_clarity?: string;
    message_strength?: string;
    value_proposition?: string;
    tone_of_voice?: string;
  };
  psychological_analysis: {
    primary_emotion?: string;
    emotional_triggers?: string[];
    persuasion_techniques?: string[];
    target_audience_fit?: string;
    cognitive_load?: string;
    trust_signals?: string[];
  };
  first_impression: {
    attention_score?: number;
    scrollstopper_potential?: string;
    three_second_message?: string;
    visual_clarity?: string;
    focal_point?: string;
  };
  placement_suitability: {
    feed_suitability?: string;
    stories_suitability?: string;
    reels_suitability?: string;
    mobile_friendliness?: string;
    desktop_friendliness?: string;
  };
  aida_analysis: {
    attention?: { score: number; analysis: string };
    interest?: { score: number; analysis: string };
    desire?: { score: number; analysis: string };
    action?: { score: number; analysis: string };
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'visual' | 'copy' | 'cta' | 'targeting';
    title: string;
    description: string;
    expected_impact?: string;
  }>;
  strengths: Array<{
    title: string;
    description: string;
  }>;
  weaknesses: Array<{
    title: string;
    description: string;
  }>;
  video_frames_analyzed: unknown[];
  confidence_score: number | null;
  processing_time_ms: number | null;
  tokens_used: number | null;
  estimated_cost: number | null;
  raw_response: Record<string, unknown>;
  error_message: string | null;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
}

// Interface para resposta da Edge Function
interface AnalyzeCreativeResponse {
  success: boolean;
  analysis?: ClaudeCreativeAnalysis;
  cached?: boolean;
  error?: string;
  details?: string;
  saveError?: string;
}

/**
 * Faz a requisicao para a Edge Function com retry automatico
 */
async function makeAnalysisRequest(
  functionUrl: string,
  creativeId: string,
  forceReanalysis: boolean,
  retryCount: number = 0
): Promise<AnalyzeCreativeResponse> {
  // Obtem sessao valida (faz refresh se necessario)
  const session = await getValidSession();

  console.log(`[ClaudeAnalysis] Requisicao para ${creativeId} (tentativa ${retryCount + 1})`);

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      creativeId,
      forceReanalysis,
    }),
  });

  // Se receber 401, tenta refresh e retry
  if (response.status === 401 && retryCount < MAX_RETRIES) {
    console.warn(`[ClaudeAnalysis] Recebeu 401, tentando refresh do token...`);

    // Forca refresh do token
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !newSession) {
      console.error('[ClaudeAnalysis] Falha no refresh:', refreshError);
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    console.log('[ClaudeAnalysis] Token renovado, tentando novamente...');

    // Retry com novo token
    return makeAnalysisRequest(functionUrl, creativeId, forceReanalysis, retryCount + 1);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Mensagens de erro mais claras
    if (response.status === 401) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }
    if (response.status === 404) {
      throw new Error('Criativo nao encontrado. Sincronize os criativos primeiro.');
    }
    if (response.status === 500) {
      throw new Error(errorData.error || 'Erro interno do servidor. Tente novamente.');
    }

    throw new Error(
      errorData.error || `Erro ao analisar criativo: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Analisa um criativo usando Claude AI
 * Inclui verificacao de token e retry automatico
 */
export async function analyzeCreativeWithClaude(
  creativeId: string,
  options: { forceReanalysis?: boolean } = {}
): Promise<ClaudeCreativeAnalysis> {
  const { forceReanalysis = false } = options;

  console.log(`[ClaudeAnalysis] Analisando criativo ${creativeId}...`);

  // Obtem URL da API do Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL nao configurada');
  }

  // Monta URL da Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/analyze-creative-claude`;

  // Faz requisicao com retry automatico
  const data = await makeAnalysisRequest(functionUrl, creativeId, forceReanalysis);

  if (!data.success || !data.analysis) {
    throw new Error(data.error || 'Erro desconhecido ao analisar criativo');
  }

  console.log(`[ClaudeAnalysis] Analise completa. Score: ${data.analysis.overall_score}/100, Cached: ${data.cached}`);

  return data.analysis;
}

/**
 * Busca análise existente de um criativo
 */
export async function getCreativeAnalysis(
  creativeId: string
): Promise<ClaudeCreativeAnalysis | null> {
  const { data, error } = await supabase
    .from('claude_creative_analyses')
    .select('*')
    .eq('creative_id', creativeId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar análise:', error);
    throw new Error('Erro ao buscar análise do criativo');
  }

  return data;
}

/**
 * Busca análises de múltiplos criativos
 */
export async function getCreativeAnalysesBatch(
  creativeIds: string[]
): Promise<Record<string, ClaudeCreativeAnalysis>> {
  if (creativeIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('claude_creative_analyses')
    .select('*')
    .in('creative_id', creativeIds);

  if (error) {
    console.error('Erro ao buscar análises em lote:', error);
    throw new Error('Erro ao buscar análises dos criativos');
  }

  // Converte array para objeto indexado por creative_id
  const analysesMap: Record<string, ClaudeCreativeAnalysis> = {};
  data.forEach((analysis) => {
    analysesMap[analysis.creative_id] = analysis;
  });

  return analysesMap;
}

/**
 * Busca análises de um workspace com filtros e ordenação
 */
export async function getWorkspaceAnalyses(options: {
  workspaceId?: string;
  sortBy?: 'overall_score' | 'analyzed_at' | 'confidence_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  minScore?: number;
  maxScore?: number;
} = {}): Promise<{ analyses: ClaudeCreativeAnalysis[]; total: number }> {
  const {
    sortBy = 'analyzed_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
    minScore,
    maxScore,
  } = options;

  // Monta query
  let query = supabase
    .from('claude_creative_analyses')
    .select('*', { count: 'exact' });

  // Aplica filtros
  if (minScore !== undefined) {
    query = query.gte('overall_score', minScore);
  }
  if (maxScore !== undefined) {
    query = query.lte('overall_score', maxScore);
  }

  // Aplica ordenação
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Aplica paginação
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Erro ao buscar análises do workspace:', error);
    throw new Error('Erro ao buscar análises do workspace');
  }

  return {
    analyses: data || [],
    total: count || 0,
  };
}

/**
 * Deleta análise de um criativo
 */
export async function deleteCreativeAnalysis(creativeId: string): Promise<void> {
  const { error } = await supabase
    .from('claude_creative_analyses')
    .delete()
    .eq('creative_id', creativeId);

  if (error) {
    console.error('Erro ao deletar análise:', error);
    throw new Error('Erro ao deletar análise do criativo');
  }
}

/**
 * Calcula estatísticas de análises de um workspace
 */
export async function getAnalysisStats(workspaceId?: string): Promise<{
  totalAnalyses: number;
  averageScore: number;
  totalCost: number;
  totalTokens: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    average: number; // 50-69
    poor: number; // 0-49
  };
}> {
  let query = supabase
    .from('claude_creative_analyses')
    .select('overall_score, estimated_cost, tokens_used');

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw new Error('Erro ao buscar estatísticas de análises');
  }

  if (!data || data.length === 0) {
    return {
      totalAnalyses: 0,
      averageScore: 0,
      totalCost: 0,
      totalTokens: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
      },
    };
  }

  // Calcula estatísticas
  const totalAnalyses = data.length;
  const scores = data.map((a) => a.overall_score || 0);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalAnalyses;
  const totalCost = data.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
  const totalTokens = data.reduce((sum, a) => sum + (a.tokens_used || 0), 0);

  // Distribui scores por faixas
  const scoreDistribution = {
    excellent: scores.filter((s) => s >= 90).length,
    good: scores.filter((s) => s >= 70 && s < 90).length,
    average: scores.filter((s) => s >= 50 && s < 70).length,
    poor: scores.filter((s) => s < 50).length,
  };

  return {
    totalAnalyses,
    averageScore: Math.round(averageScore),
    totalCost,
    totalTokens,
    scoreDistribution,
  };
}

/**
 * Exporta análise para JSON
 */
export function exportAnalysisToJSON(analysis: ClaudeCreativeAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}

/**
 * Formata score para exibição com cor
 */
export function getScoreConfig(score: number | null): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
} {
  if (score === null) {
    return {
      label: 'N/A',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
    };
  }

  if (score >= 90) {
    return {
      label: 'Excelente',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
    };
  } else if (score >= 70) {
    return {
      label: 'Bom',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
    };
  } else if (score >= 50) {
    return {
      label: 'Regular',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
    };
  } else {
    return {
      label: 'Ruim',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
    };
  }
}

/**
 * Formata prioridade de recomendação
 */
export function getPriorityConfig(priority: 'high' | 'medium' | 'low'): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
} {
  switch (priority) {
    case 'high':
      return {
        label: 'Alta',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
      };
    case 'medium':
      return {
        label: 'Média',
        color: 'yellow',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
      };
    case 'low':
      return {
        label: 'Baixa',
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
      };
  }
}

/**
 * Formata categoria de recomendação
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    visual: 'Visual',
    copy: 'Copy',
    cta: 'Call-to-Action',
    targeting: 'Segmentação',
  };
  return labels[category] || category;
}
