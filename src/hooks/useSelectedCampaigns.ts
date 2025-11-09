/**
 * Hook para gerenciar campanhas selecionadas
 *
 * Responsabilidades:
 * - Buscar campanhas selecionadas de uma conta Meta
 * - Adicionar novas campanhas à seleção
 * - Remover campanhas da seleção
 * - Verificar se campanha está selecionada
 * - Sincronizar estado com Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Interface para campanha selecionada
 */
export interface SelectedCampaign {
  id: string;
  user_id: string;
  connection_id: string;
  meta_account_id: string;
  campaign_id: string;
  campaign_name: string;
  selected_at: string;
  created_at: string;
}

/**
 * Retorno do hook
 */
interface UseSelectedCampaignsReturn {
  // Lista de campanhas selecionadas
  selectedCampaigns: SelectedCampaign[];

  // IDs das campanhas selecionadas (para verificação rápida)
  selectedCampaignIds: Set<string>;

  // Estado de carregamento
  loading: boolean;

  // Erro se houver
  error: string | null;

  // Adiciona campanhas à seleção
  addCampaigns: (campaigns: Array<{ id: string; name: string }>) => Promise<void>;

  // Remove campanha da seleção
  removeCampaign: (campaignId: string) => Promise<void>;

  // Remove todas as campanhas da seleção
  clearSelection: () => Promise<void>;

  // Verifica se campanha está selecionada
  isCampaignSelected: (campaignId: string) => boolean;

  // Recarrega lista de campanhas selecionadas
  refresh: () => Promise<void>;

  // Total de campanhas selecionadas
  totalSelected: number;
}

/**
 * Hook para gerenciar campanhas selecionadas de uma conta Meta
 *
 * @param metaAccountId - ID da conta Meta no banco de dados
 * @param connectionId - ID da conexão Meta no banco de dados
 */
export const useSelectedCampaigns = (
  metaAccountId: string | undefined,
  connectionId: string | undefined
): UseSelectedCampaignsReturn => {
  // Estados do hook
  const [selectedCampaigns, setSelectedCampaigns] = useState<SelectedCampaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega campanhas selecionadas do banco de dados
   */
  const loadSelectedCampaigns = useCallback(async () => {
    if (!metaAccountId) {
      setSelectedCampaigns([]);
      setSelectedCampaignIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('selected_campaigns')
        .select('*')
        .eq('meta_account_id', metaAccountId)
        .order('selected_at', { ascending: false });

      if (fetchError) throw fetchError;

      const campaigns = (data || []) as SelectedCampaign[];
      setSelectedCampaigns(campaigns);

      // Cria Set de IDs para verificação rápida
      const ids = new Set(campaigns.map(c => c.campaign_id));
      setSelectedCampaignIds(ids);
    } catch (err: any) {
      console.error('Erro ao carregar campanhas selecionadas:', err);
      setError(err.message || 'Erro ao carregar campanhas selecionadas');
      setSelectedCampaigns([]);
      setSelectedCampaignIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [metaAccountId]);

  /**
   * Carrega campanhas ao montar ou quando metaAccountId mudar
   */
  useEffect(() => {
    loadSelectedCampaigns();
  }, [loadSelectedCampaigns]);

  /**
   * Adiciona múltiplas campanhas à seleção
   */
  const addCampaigns = async (campaigns: Array<{ id: string; name: string }>) => {
    if (!metaAccountId || !connectionId) {
      throw new Error('Meta account ID e connection ID são obrigatórios');
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      // Prepara dados para inserção
      const campaignsToInsert = campaigns.map(campaign => ({
        user_id: user.id,
        connection_id: connectionId,
        meta_account_id: metaAccountId,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        selected_at: new Date().toISOString()
      }));

      // Insere campanhas (ignora duplicatas devido ao UNIQUE constraint)
      const { error: insertError } = await supabase
        .from('selected_campaigns')
        .upsert(campaignsToInsert, {
          onConflict: 'meta_account_id,campaign_id',
          ignoreDuplicates: false
        });

      if (insertError) throw insertError;

      // Recarrega lista de campanhas selecionadas
      await loadSelectedCampaigns();
    } catch (err: any) {
      console.error('Erro ao adicionar campanhas:', err);
      setError(err.message || 'Erro ao adicionar campanhas');
      throw err;
    }
  };

  /**
   * Remove campanha da seleção
   */
  const removeCampaign = async (campaignId: string) => {
    if (!metaAccountId) {
      throw new Error('Meta account ID é obrigatório');
    }

    try {
      const { error: deleteError } = await supabase
        .from('selected_campaigns')
        .delete()
        .eq('meta_account_id', metaAccountId)
        .eq('campaign_id', campaignId);

      if (deleteError) throw deleteError;

      // Atualiza estado local
      setSelectedCampaigns(prev => prev.filter(c => c.campaign_id !== campaignId));
      setSelectedCampaignIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Erro ao remover campanha:', err);
      setError(err.message || 'Erro ao remover campanha');
      throw err;
    }
  };

  /**
   * Remove todas as campanhas da seleção
   */
  const clearSelection = async () => {
    if (!metaAccountId) {
      throw new Error('Meta account ID é obrigatório');
    }

    try {
      const { error: deleteError } = await supabase
        .from('selected_campaigns')
        .delete()
        .eq('meta_account_id', metaAccountId);

      if (deleteError) throw deleteError;

      // Limpa estado local
      setSelectedCampaigns([]);
      setSelectedCampaignIds(new Set());
    } catch (err: any) {
      console.error('Erro ao limpar seleção:', err);
      setError(err.message || 'Erro ao limpar seleção');
      throw err;
    }
  };

  /**
   * Verifica se campanha está selecionada
   */
  const isCampaignSelected = (campaignId: string): boolean => {
    return selectedCampaignIds.has(campaignId);
  };

  /**
   * Recarrega lista de campanhas selecionadas
   */
  const refresh = async () => {
    await loadSelectedCampaigns();
  };

  return {
    selectedCampaigns,
    selectedCampaignIds,
    loading,
    error,
    addCampaigns,
    removeCampaign,
    clearSelection,
    isCampaignSelected,
    refresh,
    totalSelected: selectedCampaigns.length
  };
};

/**
 * Hook simplificado que retorna apenas os IDs das campanhas selecionadas
 * Útil quando só precisa verificar se campanhas estão selecionadas
 *
 * @param metaAccountId - ID da conta Meta
 */
export const useSelectedCampaignIds = (metaAccountId: string | undefined): {
  selectedIds: Set<string>;
  loading: boolean;
} => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIds = async () => {
      if (!metaAccountId) {
        setSelectedIds(new Set());
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('selected_campaigns')
          .select('campaign_id')
          .eq('meta_account_id', metaAccountId);

        if (error) throw error;

        const ids = new Set((data || []).map(item => item.campaign_id));
        setSelectedIds(ids);
      } catch (err) {
        console.error('Erro ao carregar IDs de campanhas:', err);
        setSelectedIds(new Set());
      } finally {
        setLoading(false);
      }
    };

    loadIds();
  }, [metaAccountId]);

  return { selectedIds, loading };
};
