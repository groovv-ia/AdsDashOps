import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabase';
import {
  CookiePreferences,
  COOKIE_CONSENT_KEY,
  COOKIE_POLICY_VERSION,
  DEFAULT_COOKIE_PREFERENCES,
} from '../types/consent';

/**
 * Interface para o contexto de Cookie Consent
 */
interface CookieConsentContextType {
  hasConsented: boolean;
  preferences: CookiePreferences;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  updatePreferences: (newPreferences: Partial<CookiePreferences>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  resetConsent: () => void;
}

/**
 * Contexto de Cookie Consent
 */
const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

/**
 * Provider de Cookie Consent
 *
 * Gerencia o estado global de consentimento de cookies.
 * Deve envolver toda a aplicação para que os componentes possam acessar o estado.
 */
export const CookieConsentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado local persistido no localStorage
  const [storedConsent, setStoredConsent, removeStoredConsent] = useLocalStorage<CookiePreferences | null>(
    COOKIE_CONSENT_KEY,
    null
  );

  // Estado do modal de preferências (compartilhado globalmente)
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
        necessary: true,
        consentDate: new Date().toISOString(),
        version: COOKIE_POLICY_VERSION,
      };

      setStoredConsent(updatedPreferences);
      syncWithDatabase(updatedPreferences);
      setShowPreferences(false);

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
   * Verifica se deve mostrar o banner
   */
  const showBanner = !hasConsented;

  const value: CookieConsentContextType = {
    hasConsented,
    preferences,
    showBanner,
    showPreferences,
    acceptAll,
    rejectOptional,
    updatePreferences,
    openPreferences,
    closePreferences,
    resetConsent,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

/**
 * Hook para usar o contexto de Cookie Consent
 *
 * @returns Contexto de Cookie Consent
 * @throws Error se usado fora do CookieConsentProvider
 */
export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);

  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }

  return context;
};
