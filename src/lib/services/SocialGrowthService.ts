/**
 * SocialGrowthService
 *
 * Serviço de dados para a funcionalidade de Crescimento de Redes Sociais.
 * Centraliza todas as chamadas para as Edge Functions de social growth,
 * seguindo o padrão dos demais services do projeto.
 */

import { supabase } from '../supabase';

// URL base das edge functions (reutiliza o padrão do projeto)
function getEdgeFunctionUrl(fnName: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/functions/v1/${fnName}`;
}

// Headers de autenticação para chamadas às edge functions
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json',
  };
}

// -------------------------------------------------------
// Tipos exportados
// -------------------------------------------------------

export interface FacebookPageInfo {
  page_id: string;
  page_name: string;
  page_category: string;
  access_token: string;
}

export interface InstagramAccountInfo {
  instagram_account_id: string;
  instagram_username: string;
  instagram_name: string;
  profile_picture_url: string;
  followers_count: number;
}

// Representa uma Page listada pela API do Meta
export interface SocialPageOption {
  facebook: FacebookPageInfo;
  instagram: InstagramAccountInfo | null;
}

// Registro de conexão salvo no banco
export interface SocialPageConnection {
  id: string;
  workspace_id: string;
  client_id: string | null;
  platform: 'facebook' | 'instagram';
  page_id: string;
  page_name: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

// Registro diário de métricas
export interface SocialGrowthMetric {
  id: string;
  workspace_id: string;
  platform: 'facebook' | 'instagram';
  account_id: string;
  date: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  reach: number;
  impressions: number;
  profile_views: number;
  website_clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
}

// Resposta da edge function social-get-metrics
export interface SocialMetricsResponse {
  period: { days: number; start: string; end: string };
  totals: {
    followers_count: number;
    reach: number;
    impressions: number;
    profile_views: number;
    website_clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    avg_engagement_rate: number;
  };
  changes: {
    followers_count: number;
    reach: number;
    impressions: number;
    profile_views: number;
    website_clicks: number;
    likes: number;
    comments: number;
    engagement_rate: number;
  };
  digital_presence_score: number;
  score_history: Array<{ date: string; score: number }>;
  time_series: SocialGrowthMetric[];
  has_data: boolean;
}

// Meta de crescimento
export interface SocialGrowthGoal {
  id: string;
  workspace_id: string;
  platform: 'facebook' | 'instagram';
  account_id: string;
  metric_name: string;
  current_value: number;
  target_value: number;
  target_date: string;
  ai_suggested: boolean;
  ai_reasoning: string | null;
  status: 'active' | 'achieved' | 'missed';
  created_at: string;
}

// Resposta da IA com metas sugeridas
export interface AIGoalSuggestion {
  metric_name: string;
  metric_label: string;
  current_value: number;
  target_value: number;
  target_days: number;
  difficulty: string;
  reasoning: string;
  tips: string[];
}

export interface AIGoalsResponse {
  goals: {
    goals: AIGoalSuggestion[];
    overall_assessment: string;
    growth_potential: string;
    main_opportunity: string;
  };
  tokens_used: number;
  cached: boolean;
  cached_at?: string;
}

// -------------------------------------------------------
// Funções do serviço
// -------------------------------------------------------

/**
 * Lista as Pages do Facebook e contas Instagram disponíveis
 * para o workspace via token Meta já conectado.
 */
export async function listAvailablePages(workspaceId: string): Promise<{
  pages: SocialPageOption[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getEdgeFunctionUrl('social-list-pages'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
    const data = await res.json();
    if (data.error) return { pages: [], error: data.error };
    return { pages: data.pages || [] };
  } catch (err) {
    return { pages: [], error: String(err) };
  }
}

/**
 * Salva uma conexão de Page/Instagram no banco de dados.
 */
export async function savePageConnection(params: {
  workspace_id: string;
  client_id?: string;
  platform: 'facebook' | 'instagram';
  page_id: string;
  page_name: string;
  page_access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getEdgeFunctionUrl('social-save-page-connection'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Busca as conexões sociais ativas de um workspace diretamente do banco.
 */
export async function getActiveConnections(workspaceId: string): Promise<SocialPageConnection[]> {
  const { data, error } = await supabase
    .from('social_page_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as SocialPageConnection[];
}

/**
 * Remove uma conexão social (desativa).
 */
export async function deactivateConnection(connectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_page_connections')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', connectionId);
  return !error;
}

/**
 * Dispara a sincronização de métricas via edge function.
 */
export async function syncMetrics(params: {
  workspace_id: string;
  account_id?: string;
  days_back?: number;
}): Promise<{ success: boolean; total_synced: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getEdgeFunctionUrl('social-sync-metrics'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.error) return { success: false, total_synced: 0, error: data.error };
    return { success: true, total_synced: data.total_synced || 0 };
  } catch (err) {
    return { success: false, total_synced: 0, error: String(err) };
  }
}

/**
 * Busca métricas com variações e série temporal para uma conta.
 */
export async function getMetrics(params: {
  workspace_id: string;
  account_id: string;
  platform: string;
  days?: number;
}): Promise<SocialMetricsResponse | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getEdgeFunctionUrl('social-get-metrics'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.error) return null;
    return data as SocialMetricsResponse;
  } catch {
    return null;
  }
}

/**
 * Solicita sugestão de metas via IA para uma conta.
 */
export async function requestAIGoals(params: {
  workspace_id: string;
  account_id: string;
  platform: string;
  account_name?: string;
}): Promise<AIGoalsResponse | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getEdgeFunctionUrl('social-ai-goals'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.error) return null;
    return data as AIGoalsResponse;
  } catch {
    return null;
  }
}

/**
 * Busca as metas ativas de uma conta diretamente do banco.
 */
export async function getGoals(params: {
  workspace_id: string;
  account_id: string;
  platform: string;
}): Promise<SocialGrowthGoal[]> {
  const { data, error } = await supabase
    .from('social_growth_goals')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('account_id', params.account_id)
    .eq('platform', params.platform)
    .eq('status', 'active')
    .order('target_date', { ascending: true });

  if (error || !data) return [];
  return data as SocialGrowthGoal[];
}

/**
 * Atualiza o status de uma meta (achieved/missed).
 */
export async function updateGoalStatus(
  goalId: string,
  status: 'active' | 'achieved' | 'missed'
): Promise<boolean> {
  const { error } = await supabase
    .from('social_growth_goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', goalId);
  return !error;
}

/**
 * Remove uma meta.
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_growth_goals')
    .delete()
    .eq('id', goalId);
  return !error;
}

// Nomes legíveis para métricas
export const METRIC_LABELS: Record<string, string> = {
  followers_count: 'Seguidores',
  engagement_rate: 'Taxa de Engajamento (%)',
  reach: 'Alcance',
  impressions: 'Impressões',
  profile_views: 'Visitas ao Perfil',
  website_clicks: 'Cliques no Link',
  likes: 'Curtidas',
  comments: 'Comentários',
};
