/**
 * ABTestSuggestionService
 *
 * Serviço para gerenciar sugestões e tracking de testes A/B.
 */

import { supabase } from '../supabase';
import type {
  ABTestSuggestion,
  ABTestTracking,
  CreateABTestSuggestionPayload,
  UpdateABTestStatusPayload,
  StartABTestTrackingPayload,
  CompleteABTestPayload,
  ABTestStatus,
  ABTestPriority,
  ABTestType,
} from '../../types/abTestTypes';

/**
 * Cria uma nova sugestão de teste A/B
 */
export async function createABTestSuggestion(
  payload: CreateABTestSuggestionPayload
): Promise<ABTestSuggestion | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Busca workspace do usuário
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) {
    throw new Error('Workspace não encontrado');
  }

  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .insert({
      workspace_id: workspace.id,
      ad_id: payload.ad_id,
      meta_ad_account_id: payload.meta_ad_account_id,
      test_type: payload.test_type,
      priority: payload.priority,
      hypothesis: payload.hypothesis,
      variant_description: payload.variant_description,
      what_to_change: payload.what_to_change,
      expected_outcome: payload.expected_outcome,
      expected_impact_percentage: payload.expected_impact_percentage,
      metrics_to_track: payload.metrics_to_track,
      implementation_difficulty: payload.implementation_difficulty,
      status: 'suggested',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar sugestão de teste A/B:', error);
    return null;
  }

  return data;
}

/**
 * Busca todas as sugestões de teste A/B de um anúncio
 */
export async function getABTestSuggestionsByAd(
  adId: string
): Promise<ABTestSuggestion[]> {
  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .select('*')
    .eq('ad_id', adId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar sugestões de teste A/B:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca sugestões de teste A/B por status
 */
export async function getABTestSuggestionsByStatus(
  status: ABTestStatus
): Promise<ABTestSuggestion[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  // Busca workspace do usuário
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) return [];

  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('status', status)
    .order('created_at', { ascending: false});

  if (error) {
    console.error('Erro ao buscar sugestões por status:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca sugestões de teste A/B por prioridade
 */
export async function getABTestSuggestionsByPriority(
  priority: ABTestPriority
): Promise<ABTestSuggestion[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) return [];

  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('priority', priority)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar sugestões por prioridade:', error);
    return [];
  }

  return data || [];
}

/**
 * Atualiza status de uma sugestão de teste A/B
 */
export async function updateABTestStatus(
  payload: UpdateABTestStatusPayload
): Promise<boolean> {
  const { error } = await supabase
    .from('ab_test_suggestions')
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.suggestion_id);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    return false;
  }

  return true;
}

/**
 * Inicia tracking de um teste A/B
 */
export async function startABTestTracking(
  payload: StartABTestTrackingPayload
): Promise<ABTestTracking | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) {
    throw new Error('Workspace não encontrado');
  }

  // Atualiza status da sugestão para 'implemented'
  await updateABTestStatus({
    suggestion_id: payload.ab_suggestion_id,
    status: 'implemented',
  });

  // Cria registro de tracking
  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .insert({
      ab_suggestion_id: payload.ab_suggestion_id,
      workspace_id: workspace.id,
      variant_ad_id: payload.variant_ad_id,
      test_start_date: payload.test_start_date,
      implementation_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao iniciar tracking:', error);
    return null;
  }

  return data;
}

/**
 * Completa um teste A/B com resultados
 */
export async function completeABTest(
  payload: CompleteABTestPayload
): Promise<boolean> {
  // Atualiza registro de tracking com resultados
  const { error: trackingError } = await supabase
    .from('ab_tests_tracking')
    .update({
      test_end_date: payload.test_end_date,
      control_metrics: payload.control_metrics,
      variant_metrics: payload.variant_metrics,
      result_data: {
        statistical_significance: payload.statistical_significance,
        confidence_level: payload.confidence_level,
        key_learnings: payload.key_learnings,
        unexpected_findings: payload.unexpected_findings,
        improvement_percentage: calculateImprovement(
          payload.control_metrics.ctr,
          payload.variant_metrics.ctr
        ),
      },
      conclusion: payload.conclusion,
      winner: payload.winner,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.tracking_id);

  if (trackingError) {
    console.error('Erro ao completar tracking:', trackingError);
    return false;
  }

  // Busca suggestion_id para atualizar status
  const { data: tracking } = await supabase
    .from('ab_tests_tracking')
    .select('ab_suggestion_id')
    .eq('id', payload.tracking_id)
    .single();

  if (tracking) {
    await updateABTestStatus({
      suggestion_id: tracking.ab_suggestion_id,
      status: 'completed',
    });
  }

  return true;
}

/**
 * Busca tracking de um teste A/B
 */
export async function getABTestTracking(
  suggestionId: string
): Promise<ABTestTracking | null> {
  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .select('*')
    .eq('ab_suggestion_id', suggestionId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar tracking:', error);
    return null;
  }

  return data;
}

/**
 * Busca todos os testes A/B completados
 */
export async function getCompletedABTests(): Promise<ABTestTracking[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) return [];

  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .select('*')
    .eq('workspace_id', workspace.id)
    .not('winner', 'is', null)
    .order('test_end_date', { ascending: false });

  if (error) {
    console.error('Erro ao buscar testes completados:', error);
    return [];
  }

  return data || [];
}

/**
 * Deleta uma sugestão de teste A/B
 */
export async function deleteABTestSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ab_test_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) {
    console.error('Erro ao deletar sugestão:', error);
    return false;
  }

  return true;
}

/**
 * Calcula melhoria percentual entre controle e variante
 */
function calculateImprovement(controlValue: number, variantValue: number): number {
  if (controlValue === 0) return 0;
  return ((variantValue - controlValue) / controlValue) * 100;
}

/**
 * Busca sugestões pendentes por tipo de teste
 */
export async function getSuggestedTestsByType(
  testType: ABTestType
): Promise<ABTestSuggestion[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!workspace) return [];

  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('test_type', testType)
    .eq('status', 'suggested')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false});

  if (error) {
    console.error('Erro ao buscar sugestões por tipo:', error);
    return [];
  }

  return data || [];
}
