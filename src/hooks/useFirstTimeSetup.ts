/**
 * useFirstTimeSetup Hook
 *
 * Detecta automaticamente se é o primeiro acesso do usuário
 * e se ele precisa completar o setup inicial.
 */

import { useState, useEffect } from 'react';
import {
  checkIfNeedsSetup,
  getSetupProgress,
  type SetupStatus,
} from '../lib/services/SetupService';

interface UseFirstTimeSetupResult {
  // Estado de carregamento
  loading: boolean;

  // Se precisa mostrar o wizard de setup
  needsSetup: boolean;

  // Status detalhado do setup
  setupStatus: SetupStatus | null;

  // Função para recarregar o status
  refetchStatus: () => Promise<void>;

  // Função para marcar que o usuário viu e dispensou o setup (temporário)
  dismissSetup: () => void;

  // Se o usuário dispensou o setup temporariamente
  isDismissed: boolean;
}

/**
 * Hook para detectar e gerenciar o setup de primeiro acesso
 */
export function useFirstTimeSetup(userId: string | null): UseFirstTimeSetupResult {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Chave para localStorage
  const DISMISS_KEY = 'setup_dismissed_until';
  const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 horas em ms

  // Verifica se o setup foi dispensado recentemente
  const checkIfDismissed = (): boolean => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (!dismissedUntil) return false;

      const dismissedTime = parseInt(dismissedUntil, 10);
      const now = Date.now();

      // Se o tempo de dispensa expirou, remove do localStorage
      if (now > dismissedTime) {
        localStorage.removeItem(DISMISS_KEY);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking if setup is dismissed:', error);
      return false;
    }
  };

  // Função para buscar o status do setup
  const fetchSetupStatus = async () => {
    if (!userId) {
      setLoading(false);
      setNeedsSetup(false);
      setSetupStatus(null);
      return;
    }

    try {
      setLoading(true);

      // Verifica se foi dispensado
      if (checkIfDismissed()) {
        setIsDismissed(true);
        setNeedsSetup(false);
        setLoading(false);
        return;
      }

      // Busca status detalhado
      const status = await getSetupProgress(userId);
      setSetupStatus(status);
      setNeedsSetup(status.needsSetup);
    } catch (error) {
      console.error('Error fetching setup status:', error);
      setNeedsSetup(false);
      setSetupStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para dispensar o setup temporariamente
  const dismissSetup = () => {
    try {
      const dismissUntil = Date.now() + DISMISS_DURATION;
      localStorage.setItem(DISMISS_KEY, dismissUntil.toString());
      setIsDismissed(true);
      setNeedsSetup(false);
    } catch (error) {
      console.error('Error dismissing setup:', error);
    }
  };

  // Efeito para buscar status quando o userId muda
  useEffect(() => {
    fetchSetupStatus();
  }, [userId]);

  return {
    loading,
    needsSetup,
    setupStatus,
    refetchStatus: fetchSetupStatus,
    dismissSetup,
    isDismissed,
  };
}

/**
 * Hook simples para verificar apenas se precisa de setup (sem detalhes)
 */
export function useNeedsSetup(userId: string | null): {
  loading: boolean;
  needsSetup: boolean;
  refetch: () => Promise<void>;
} {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetch = async () => {
    if (!userId) {
      setLoading(false);
      setNeedsSetup(false);
      return;
    }

    try {
      setLoading(true);
      const needs = await checkIfNeedsSetup(userId);
      setNeedsSetup(needs);
    } catch (error) {
      console.error('Error checking if needs setup:', error);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [userId]);

  return {
    loading,
    needsSetup,
    refetch: fetch,
  };
}
