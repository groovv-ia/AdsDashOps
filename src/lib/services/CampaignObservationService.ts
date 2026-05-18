/**
 * CampaignObservationService
 *
 * Gerencia persistencia e analise qualitativa de campanhas:
 * - Anotacoes livres do gestor (salvas diretamente no Supabase)
 * - Analise de IA gerada via Edge Function (salva junto ao registro)
 *
 * Cada campanha tem no maximo 1 registro por workspace (unique constraint).
 * O servico usa UPSERT para criar ou atualizar automaticamente.
 */

import { supabase } from '../supabase';

// ── Tipos ──────────────────────────────────────────────────

export interface CampaignObservation {
  id: string;
  campaign_id: string;
  meta_ad_account_id: string;
  user_id: string;
  workspace_id: string;
  manager_notes: string;
  ai_analysis: AIAnalysisResult | null;
  ai_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysisResult {
  executive_summary: string;
  highlights: {
    type: 'positive' | 'attention' | 'critical';
    text: string;
  }[];
  suggestions: {
    priority: 'high' | 'medium' | 'low';
    text: string;
  }[];
  manager_notes_feedback: string;
  generated_at: string;
}

// Metricas passadas para a IA — subconjunto dos KPIs ja calculados
export interface CampaignMetricsForAI {
  impressions:    number;
  clicks:         number;
  spend:          number;
  conversions:    number;
  reach:          number;
  ctr:            number;
  cpc:            number;
  cpm:            number;
  roas?:          number;
  leads?:         number;
  cost_per_lead?: number;
  messaging_conversations?: number;
  cost_per_messaging_conversation?: number;
  frequency?:     number;
}

// ── Servico ────────────────────────────────────────────────

export class CampaignObservationService {
  private static instance: CampaignObservationService;

  static getInstance(): CampaignObservationService {
    if (!CampaignObservationService.instance) {
      CampaignObservationService.instance = new CampaignObservationService();
    }
    return CampaignObservationService.instance;
  }

  /**
   * Busca a observacao de uma campanha no workspace ativo do usuario.
   * Retorna null se ainda nao houver registro.
   */
  async getObservation(
    campaignId: string,
    workspaceId: string
  ): Promise<CampaignObservation | null> {
    const { data, error } = await supabase
      .from('campaign_observations')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[CampaignObservationService] getObservation error:', error);
      throw error;
    }

    return data as CampaignObservation | null;
  }

  /**
   * Salva (cria ou atualiza) as anotacoes do gestor sem envolver a IA.
   */
  async saveManagerNotes(params: {
    campaignId:        string;
    metaAdAccountId:   string;
    workspaceId:       string;
    managerNotes:      string;
  }): Promise<CampaignObservation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario nao autenticado');

    const { data, error } = await supabase
      .from('campaign_observations')
      .upsert(
        {
          campaign_id:        params.campaignId,
          meta_ad_account_id: params.metaAdAccountId,
          workspace_id:       params.workspaceId,
          user_id:            user.id,
          manager_notes:      params.managerNotes,
          updated_at:         new Date().toISOString(),
        },
        {
          // Unique constraint em (campaign_id, workspace_id)
          onConflict: 'campaign_id,workspace_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[CampaignObservationService] saveManagerNotes error:', error);
      throw error;
    }

    return data as CampaignObservation;
  }

  /**
   * Chama a Edge Function para gerar analise de IA e persiste o resultado.
   * Retorna o resultado da IA para renderizacao imediata.
   */
  async requestAiAnalysis(params: {
    campaignId:          string;
    campaignName:        string;
    campaignObjective?:  string;
    metaAdAccountId:     string;
    workspaceId:         string;
    managerNotes:        string;
    metrics:             CampaignMetricsForAI;
    period:              { start: string; end: string };
  }): Promise<AIAnalysisResult> {
    // 1. Chama a Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? supabaseAnonKey;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/campaign-observation-ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaign_id:         params.campaignId,
          campaign_name:       params.campaignName,
          campaign_objective:  params.campaignObjective,
          manager_notes:       params.managerNotes,
          metrics:             params.metrics,
          period:              params.period,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[CampaignObservationService] Edge Function error:', errText);
      throw new Error('Falha ao gerar analise de IA. Tente novamente.');
    }

    const aiResult: AIAnalysisResult = await response.json();

    // 2. Persiste o resultado junto ao registro existente (ou cria um novo)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario nao autenticado');

    const { error } = await supabase
      .from('campaign_observations')
      .upsert(
        {
          campaign_id:        params.campaignId,
          meta_ad_account_id: params.metaAdAccountId,
          workspace_id:       params.workspaceId,
          user_id:            user.id,
          manager_notes:      params.managerNotes,
          ai_analysis:        aiResult,
          ai_generated_at:    aiResult.generated_at,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'campaign_id,workspace_id', ignoreDuplicates: false }
      );

    if (error) {
      console.error('[CampaignObservationService] persist ai_analysis error:', error);
      // Nao lanca — o resultado da IA ja esta disponivel para o usuario
    }

    return aiResult;
  }

  /**
   * Remove completamente o registro de observacao de uma campanha.
   */
  async deleteObservation(campaignId: string, workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_observations')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('[CampaignObservationService] deleteObservation error:', error);
      throw error;
    }
  }
}
