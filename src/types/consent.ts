/**
 * Tipos para o sistema de consentimento de cookies
 * Gerencia preferências de cookies do usuário conforme LGPD
 */

/**
 * Interface para as preferências de cookies do usuário
 */
export interface CookiePreferences {
  // Cookies necessários para funcionamento básico (sempre true)
  necessary: boolean;

  // Cookies para melhorar a experiência do usuário
  functional: boolean;

  // Cookies para marketing e analytics
  marketing: boolean;

  // Data/hora do consentimento
  consentDate: string;

  // Versão da política de cookies (para forçar re-consentimento)
  version: string;
}

/**
 * Interface para o estado do hook de cookie consent
 */
export interface CookieConsentState {
  // Se o usuário já deu consentimento
  hasConsented: boolean;

  // Preferências atuais do usuário
  preferences: CookiePreferences;

  // Se o modal de preferências está aberto
  showPreferences: boolean;
}

/**
 * Tipos de categorias de cookies disponíveis
 */
export type CookieCategory = 'necessary' | 'functional' | 'marketing';

/**
 * Interface para informações sobre uma categoria de cookie
 */
export interface CookieCategoryInfo {
  id: CookieCategory;
  title: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

/**
 * Ações possíveis do usuário no banner de cookies
 */
export type ConsentAction = 'accept_all' | 'reject_optional' | 'customize' | 'save_preferences';

/**
 * Interface para callbacks de eventos de consentimento
 */
export interface ConsentCallbacks {
  onAcceptAll?: () => void;
  onRejectOptional?: () => void;
  onCustomize?: () => void;
  onSavePreferences?: (preferences: CookiePreferences) => void;
}

/**
 * Versão atual da política de cookies
 * Altere este valor quando a política for atualizada para forçar re-consentimento
 */
export const COOKIE_POLICY_VERSION = '1.0.0';

/**
 * Chave do localStorage para armazenar preferências
 */
export const COOKIE_CONSENT_KEY = 'adsops_cookie_consent';

/**
 * Preferências padrão (apenas cookies necessários)
 */
export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  marketing: false,
  consentDate: new Date().toISOString(),
  version: COOKIE_POLICY_VERSION,
};
