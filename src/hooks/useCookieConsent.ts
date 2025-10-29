import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { supabase } from '../lib/supabase';
import {
  CookiePreferences,
  CookieConsentState,
  COOKIE_CONSENT_KEY,
  COOKIE_POLICY_VERSION,
  DEFAULT_COOKIE_PREFERENCES,
  ConsentAction,
} from '../types/consent';

/**
 * Hook useCookieConsent
 *
 * Gerencia o estado de consentimento de cookies do usuário.
 * Armazena preferências localmente e sincroniza com Supabase para usuários autenticados.
 *
 * @returns Estado e funções para gerenciar consentimento de cookies
 *
 * @example
 * const {
 *   hasConsented,
 *   preferences,
 *   showBanner,
 *   acceptAll,
 *   rejectOptional,
 *   updatePreferences
 * } = useCookieConsent();
 */
export const useCookieConsent = () => {
  // Estado local persistido no localStorage
  const [storedConsent, setStoredConsent, removeStoredConsent] = useLocalStorage<CookiePreferences | null>(
    COOKIE_CONSENT_KEY,
    null
  );

  // Estado do modal de preferências
  const [showPreferences, setShowPreferences] = useState(false);

  // Verifica se o usuário já deu consentimento
  const hasConsented = storedConsent !== null && storedConsent.version === COOKIE_POLICY_VERSION;

  // Estado atual de preferências (usa padrão se não houver consentimento)
  const preferences = storedConsent || DEFAULT_COOKIE_PREFERENCES;

  /**
   * Sincroniza preferências com Supabase (para usuários autenticados)
   */
  const syncWithDatabase = useCallback(async (prefs: CookiePreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Tenta fazer upsert das preferências no banco
        const { error } = await supabase
          .from('user_cookie_preferences')
          .upsert({
            user_id: user.id,
            necessary: prefs.necessary,
            functional: prefs.functional,
            marketing: prefs.marketing,
            consent_date: prefs.consentDate,
            consent_version: prefs.version,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) {
          console.warn('Erro ao sincronizar preferências de cookies com Supabase:', error);
        }
      }
    } catch (error) {
      console.warn('Erro ao sincronizar preferências de cookies:', error);
    }
  }, []);

  /**
   * Carrega preferências do Supabase (para usuários autenticados)
   */
  const loadFromDatabase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user && !hasConsented) {
        const { data, error } = await supabase
          .from('user_cookie_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          // Verifica se a versão é atual
          if (data.consent_version === COOKIE_POLICY_VERSION) {
            const loadedPreferences: CookiePreferences = {
              necessary: data.necessary,
              functional: data.functional,
              marketing: data.marketing,
              consentDate: data.consent_date,
              version: data.consent_version,
            };
            setStoredConsent(loadedPreferences);
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar preferências de cookies do Supabase:', error);
    }
  }, [hasConsented, setStoredConsent]);

  // Carrega preferências do banco quando o componente é montado
  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  /**
   * Aceita todos os cookies
   */
  const acceptAll = useCallback(() => {
    const newPreferences: CookiePreferences = {
      necessary: true,
      functional: true,
      marketing: true,
      consentDate: new Date().toISOString(),
      version: COOKIE_POLICY_VERSION,
    };

    setStoredConsent(newPreferences);
    syncWithDatabase(newPreferences);
    setShowPreferences(false);

    // Dispara evento customizado para analytics
    window.dispatchEvent(
      new CustomEvent('cookieConsent', {
        detail: { action: 'accept_all', preferences: newPreferences },
      })
    );
  }, [setStoredConsent, syncWithDatabase]);

  /**
   * Rejeita cookies opcionais (mantém apenas necessários)
   */
  const rejectOptional = useCallback(() => {
    const newPreferences: CookiePreferences = {
      necessary: true,
      functional: false,
      marketing: false,
      consentDate: new Date().toISOString(),
      version: COOKIE_POLICY_VERSION,
    };

    setStoredConsent(newPreferences);
    syncWithDatabase(newPreferences);
    setShowPreferences(false);

    // Dispara evento customizado para analytics
    window.dispatchEvent(
      new CustomEvent('cookieConsent', {
        detail: { action: 'reject_optional', preferences: newPreferences },
      })
    );
  }, [setStoredConsent, syncWithDatabase]);

  /**
   * Atualiza preferências customizadas do usuário
   */
  const updatePreferences = useCallback(
    (newPreferences: Partial<CookiePreferences>) => {
      const updatedPreferences: CookiePreferences = {
        ...preferences,
        ...newPreferences,
        necessary: true, // Sempre mantém cookies necessários
        consentDate: new Date().toISOString(),
        version: COOKIE_POLICY_VERSION,
      };

      setStoredConsent(updatedPreferences);
      syncWithDatabase(updatedPreferences);
      setShowPreferences(false);

      // Dispara evento customizado para analytics
      window.dispatchEvent(
        new CustomEvent('cookieConsent', {
          detail: { action: 'save_preferences', preferences: updatedPreferences },
        })
      );
    },
    [preferences, setStoredConsent, syncWithDatabase]
  );

  /**
   * Abre o modal de customização de preferências
   */
  const openPreferences = useCallback(() => {
    setShowPreferences(true);

    // Dispara evento customizado para analytics
    window.dispatchEvent(
      new CustomEvent('cookieConsent', {
        detail: { action: 'customize', preferences: null },
      })
    );
  }, []);

  /**
   * Fecha o modal de preferências
   */
  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  /**
   * Limpa consentimento (para testes ou re-consentimento forçado)
   */
  const resetConsent = useCallback(() => {
    removeStoredConsent();
    setShowPreferences(false);
  }, [removeStoredConsent]);

  /**
   * Verifica se deve mostrar o banner (não tem consentimento ou versão desatualizada)
   */
  const showBanner = !hasConsented;

  return {
    // Estado
    hasConsented,
    preferences,
    showBanner,
    showPreferences,

    // Ações
    acceptAll,
    rejectOptional,
    updatePreferences,
    openPreferences,
    closePreferences,
    resetConsent,
  };
};
