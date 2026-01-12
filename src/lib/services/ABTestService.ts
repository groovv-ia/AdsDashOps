/**
 * ABTestService
 *
 * Serviço para gerenciar sugestões de testes A/B e tracking de implementações.
 * Permite salvar sugestões geradas pela IA, criar trackings de testes,
 * e gerenciar resultados de testes implementados.
 */

import { supabase } from '../supabase';
import type {
  ABTestSuggestionDB,
  ABTestTrackingDB,
  CreateABTestSuggestionPayload,
  CreateABTestTrackingPayload,
  UpdateABTestResultsPayload,
  ABTestStatus,
} from '../../types/adAnalysis';

/**
 * Salva uma sugestão de teste A/B no banco de dados
 * Retorna a sugestão criada com o ID gerado
 */
export async function saveABTestSuggestion(
  payload: CreateABTestSuggestionPayload
): Promise<ABTestSuggestionDB> {
  // Busca workspace do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!workspace) {
    throw new Error('Workspace não encontrado');
  }

  // Insere sugestão de teste A/B
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
      expected_impact_percentage: payload.expected_impact_percentage || null,
      metrics_to_track: payload.metrics_to_track,
      implementation_difficulty: payload.implementation_difficulty || 'medium',
      status: 'suggested',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar sugestão de teste A/B:', error);
    throw new Error('Erro ao salvar sugestão de teste A/B');
  }

  return data;
}

/**
 * Busca todas as sugestões de teste A/B de um anúncio
 * Ordenadas por prioridade e data de criação
 */
export async function getABTestSuggestions(
  adId: string,
  status?: ABTestStatus
): Promise<ABTestSuggestionDB[]> {
  let query = supabase
    .from('ab_test_suggestions')
    .select('*')
    .eq('ad_id', adId)
    .order('created_at', { ascending: false });

  // Filtra por status se fornecido
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar sugestões de teste A/B:', error);
    return [];
  }

  return data || [];
}

/**
 * Atualiza o status de uma sugestão de teste A/B
 */
export async function updateABTestStatus(
  suggestionId: string,
  status: ABTestStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('ab_test_suggestions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    console.error('Erro ao atualizar status do teste A/B:', error);
    return false;
  }

  return true;
}

/**
 * Deleta uma sugestão de teste A/B
 * Também deleta trackings relacionados devido ao CASCADE
 */
export async function deleteABTestSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ab_test_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) {
    console.error('Erro ao deletar sugestão de teste A/B:', error);
    return false;
  }

  return true;
}

/**
 * Cria um registro de tracking para um teste A/B
 * Usado quando o teste é implementado e iniciado
 */
export async function createABTestTracking(
  payload: CreateABTestTrackingPayload
): Promise<ABTestTrackingDB> {
  // Busca workspace do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!workspace) {
    throw new Error('Workspace não encontrado');
  }

  // Insere tracking de teste A/B
  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .insert({
      ab_suggestion_id: payload.ab_suggestion_id,
      workspace_id: workspace.id,
      implementation_date: payload.implementation_date || new Date().toISOString().split('T')[0],
      variant_ad_id: payload.variant_ad_id || null,
      test_start_date: payload.test_start_date || null,
      test_end_date: payload.test_end_date || null,
      control_metrics: {},
      variant_metrics: {},
      result_data: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar tracking de teste A/B:', error);
    throw new Error('Erro ao criar tracking de teste A/B');
  }

  // Atualiza status da sugestão para in_progress
  await updateABTestStatus(payload.ab_suggestion_id, 'in_progress');

  return data;
}

/**
 * Busca o tracking de um teste A/B específico
 */
export async function getABTestTracking(
  suggestionId: string
): Promise<ABTestTrackingDB | null> {
  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .select('*')
    .eq('ab_suggestion_id', suggestionId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar tracking de teste A/B:', error);
    return null;
  }

  return data;
}

/**
 * Atualiza os resultados de um teste A/B
 * Usado para salvar métricas coletadas durante o teste
 */
export async function updateABTestResults(
  payload: UpdateABTestResultsPayload
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    control_metrics: payload.control_metrics,
    variant_metrics: payload.variant_metrics,
    updated_at: new Date().toISOString(),
  };

  // Adiciona conclusão se fornecida
  if (payload.conclusion) {
    updateData.conclusion = payload.conclusion;
  }

  // Adiciona vencedor se fornecido
  if (payload.winner) {
    updateData.winner = payload.winner;
  }

  const { error } = await supabase
    .from('ab_tests_tracking')
    .update(updateData)
    .eq('id', payload.tracking_id);

  if (error) {
    console.error('Erro ao atualizar resultados do teste A/B:', error);
    return false;
  }

  // Se o teste foi concluído com um vencedor, atualiza status da sugestão
  if (payload.winner) {
    const { data: tracking } = await supabase
      .from('ab_tests_tracking')
      .select('ab_suggestion_id')
      .eq('id', payload.tracking_id)
      .single();

    if (tracking) {
      await updateABTestStatus(tracking.ab_suggestion_id, 'completed');
    }
  }

  return true;
}

/**
 * Busca todos os trackings de testes A/B do workspace
 * Útil para dashboard de testes em andamento
 */
export async function getAllABTestTrackings(): Promise<ABTestTrackingDB[]> {
  const { data, error } = await supabase
    .from('ab_tests_tracking')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar trackings de testes A/B:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca sugestões e trackings juntos para um anúncio
 * Útil para exibir status completo dos testes
 */
export async function getABTestsWithTracking(
  adId: string
): Promise<Array<ABTestSuggestionDB & { tracking?: ABTestTrackingDB }>> {
  const suggestions = await getABTestSuggestions(adId);

  // Busca trackings de cada sugestão
  const suggestionsWithTracking = await Promise.all(
    suggestions.map(async (suggestion) => {
      const tracking = await getABTestTracking(suggestion.id);
      return {
        ...suggestion,
        tracking: tracking || undefined,
      };
    })
  );

  return suggestionsWithTracking;
}

/**
 * Marca um teste como cancelado
 */
export async function cancelABTest(suggestionId: string): Promise<boolean> {
  return await updateABTestStatus(suggestionId, 'cancelled');
}

/**
 * Verifica se já existe uma sugestão similar para evitar duplicatas
 * Compara por ad_id, test_type e o que mudar
 */
export async function checkDuplicateSuggestion(
  adId: string,
  testType: string,
  whatToChange: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ab_test_suggestions')
    .select('id')
    .eq('ad_id', adId)
    .eq('test_type', testType)
    .ilike('what_to_change', `%${whatToChange}%`)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows returned"
    console.error('Erro ao verificar duplicata:', error);
    return false;
  }

  return !!data;
}
