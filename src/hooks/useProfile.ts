/**
 * useProfile
 *
 * Hook para buscar e gerenciar o perfil do usuario logado na tabela `profiles`.
 * Expoe o campo `onboarding_completed` para controlar o fluxo de onboarding,
 * e a funcao `markOnboardingCompleted` para marcar o onboarding como concluido.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  /** Marca onboarding_completed = true no banco e atualiza o estado local */
  markOnboardingCompleted: () => Promise<void>;
  /** Recarrega o perfil do servidor */
  refresh: () => Promise<void>;
}

export function useProfile(userId: string | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      // Sem usuario logado, nao ha perfil para buscar
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, onboarding_completed, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        setError('Erro ao carregar perfil do usuario.');
        console.error('useProfile fetch error:', fetchError);
        return;
      }

      setProfile(data);
    } catch (err) {
      setError('Erro inesperado ao carregar perfil.');
      console.error('useProfile exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Carrega o perfil sempre que o userId mudar
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Atualiza onboarding_completed para true no banco e localmente.
   * Chamado ao final do fluxo de onboarding.
   */
  const markOnboardingCompleted = useCallback(async () => {
    if (!userId) return;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.error('Erro ao marcar onboarding como concluido:', updateError);
        return;
      }

      // Atualiza estado local imediatamente para evitar re-exibicao do onboarding
      setProfile(prev => prev ? { ...prev, onboarding_completed: true } : prev);
    } catch (err) {
      console.error('Excecao ao marcar onboarding como concluido:', err);
    }
  }, [userId]);

  return {
    profile,
    isLoading,
    error,
    markOnboardingCompleted,
    refresh: fetchProfile,
  };
}
