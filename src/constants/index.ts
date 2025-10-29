/**
 * Constantes do Sistema
 *
 * Centraliza todas as constantes usadas na aplicação,
 * facilitando manutenção e evitando valores mágicos no código.
 */

/**
 * Informações da aplicação
 */
export const APP_INFO = {
  NAME: 'AdsOps Analytics',
  VERSION: '1.0.0',
  DESCRIPTION: 'Plataforma unificada de análise de campanhas publicitárias',
  AUTHOR: 'AdsOps Team',
} as const;

/**
 * URLs e endpoints da API
 */
export const API_ENDPOINTS = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // OAuth Redirect
  OAUTH_REDIRECT_URL: import.meta.env.VITE_OAUTH_REDIRECT_URL || 'http://localhost:5173/auth/callback',

  // Meta Ads API
  META_GRAPH_API: 'https://graph.facebook.com/v18.0',
  META_OAUTH_URL: 'https://www.facebook.com/v18.0/dialog/oauth',

  // Google Ads API
  GOOGLE_ADS_API: 'https://googleads.googleapis.com/v14',
  GOOGLE_OAUTH_URL: 'https://accounts.google.com/oauth/authorize',

  // TikTok Ads API
  TIKTOK_ADS_API: 'https://business-api.tiktok.com/open_api/v1.3',
  TIKTOK_OAUTH_URL: 'https://business-api.tiktok.com/portal/auth',

  // OpenAI API
  OPENAI_API: 'https://api.openai.com/v1',
} as const;

/**
 * Rotas da aplicação
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  AUTH_CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  CAMPAIGNS: '/campaigns',
  DATA_SOURCES: '/data-sources',
  AI_INSIGHTS: '/ai-insights',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  SUPPORT: '/support',
  NOT_FOUND: '/404',
} as const;

/**
 * Chaves do localStorage
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_STATE: 'sidebar_state',
  TABLE_SETTINGS: 'table_settings',
  FILTER_PREFERENCES: 'filter_preferences',
  DASHBOARD_LAYOUT: 'dashboard_layout',
  OPENAI_API_KEY: 'openai_api_key',
  DEMO_SESSION: 'demo-session',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

/**
 * Configurações de paginação
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Configurações de data e hora
 */
export const DATE_CONFIG = {
  DEFAULT_DATE_FORMAT: 'dd/MM/yyyy',
  DEFAULT_DATETIME_FORMAT: 'dd/MM/yyyy HH:mm',
  API_DATE_FORMAT: 'yyyy-MM-dd',
  DEFAULT_LOCALE: 'pt-BR',
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
} as const;

/**
 * Limites e restrições
 */
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UPLOAD_FILES: 5,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_USERNAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TITLE_LENGTH: 100,
  DEBOUNCE_DELAY: 500, // ms
  API_TIMEOUT: 30000, // 30 segundos
  AUTO_REFRESH_INTERVAL: 300000, // 5 minutos
} as const;

/**
 * Status de campanhas
 */
export const CAMPAIGN_STATUS = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
  DRAFT: 'Draft',
} as const;

/**
 * Tipos de plataformas de publicidade
 */
export const AD_PLATFORMS = {
  META: 'Meta',
  GOOGLE: 'Google',
  TIKTOK: 'TikTok',
} as const;

/**
 * Tipos de métricas
 */
export const METRIC_TYPES = {
  IMPRESSIONS: 'impressions',
  CLICKS: 'clicks',
  SPEND: 'spend',
  CONVERSIONS: 'conversions',
  CTR: 'ctr',
  CPC: 'cpc',
  ROAS: 'roas',
  REACH: 'reach',
  FREQUENCY: 'frequency',
  COST_PER_RESULT: 'cost_per_result',
} as const;

/**
 * Labels de métricas em português
 */
export const METRIC_LABELS = {
  impressions: 'Impressões',
  clicks: 'Cliques',
  spend: 'Gasto',
  conversions: 'Conversões',
  ctr: 'CTR',
  cpc: 'CPC',
  roas: 'ROAS',
  reach: 'Alcance',
  frequency: 'Frequência',
  cost_per_result: 'Custo por Resultado',
} as const;

/**
 * Tipos de insights de IA
 */
export const AI_INSIGHT_TYPES = {
  PERFORMANCE: 'performance',
  OPTIMIZATION: 'optimization',
  TREND: 'trend',
  RECOMMENDATION: 'recommendation',
  ALERT: 'alert',
} as const;

/**
 * Níveis de impacto
 */
export const IMPACT_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

/**
 * Tipos de notificação
 */
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/**
 * Categorias de notificação
 */
export const NOTIFICATION_CATEGORIES = {
  SYSTEM: 'system',
  CAMPAIGN: 'campaign',
  BUDGET: 'budget',
  PERFORMANCE: 'performance',
  INTEGRATION: 'integration',
  AI_INSIGHT: 'ai_insight',
} as const;

/**
 * Prioridades de notificação
 */
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

/**
 * Tipos de export
 */
export const EXPORT_FORMATS = {
  CSV: 'csv',
  PDF: 'pdf',
  EXCEL: 'xlsx',
  JSON: 'json',
} as const;

/**
 * Temas disponíveis
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

/**
 * Idiomas suportados
 */
export const LANGUAGES = {
  PT_BR: 'pt-BR',
  EN_US: 'en-US',
  ES_ES: 'es-ES',
} as const;

/**
 * Cores do sistema
 */
export const COLORS = {
  PRIMARY: '#3b82f6', // blue-600
  SECONDARY: '#8b5cf6', // purple-600
  SUCCESS: '#10b981', // green-600
  WARNING: '#f59e0b', // yellow-600
  DANGER: '#ef4444', // red-600
  INFO: '#06b6d4', // cyan-600
  GRAY: '#6b7280', // gray-600
} as const;

/**
 * Breakpoints do Tailwind
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/**
 * Duração de animações (ms)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Níveis de z-index
 */
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  NOTIFICATION: 1080,
} as const;

/**
 * Códigos HTTP comuns
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Períodos de tempo predefinidos
 */
export const TIME_PERIODS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom',
} as const;

/**
 * Labels dos períodos em português
 */
export const TIME_PERIOD_LABELS = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last_7_days: 'Últimos 7 dias',
  last_30_days: 'Últimos 30 dias',
  last_90_days: 'Últimos 90 dias',
  this_month: 'Este mês',
  last_month: 'Mês passado',
  this_year: 'Este ano',
  custom: 'Período customizado',
} as const;

/**
 * Regex patterns comuns
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\(?[1-9]{2}\)? ?(?:[2-8]|9[1-9])[0-9]{3}-?[0-9]{4}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CEP: /^\d{5}-?\d{3}$/,
  CREDIT_CARD: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

/**
 * Mensagens de erro padrão
 */
export const ERROR_MESSAGES = {
  REQUIRED: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_URL: 'URL inválida',
  INVALID_PHONE: 'Telefone inválido',
  PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 8 caracteres',
  PASSWORD_TOO_LONG: 'A senha não pode ter mais de 128 caracteres',
  PASSWORDS_DO_NOT_MATCH: 'As senhas não coincidem',
  GENERIC_ERROR: 'Ocorreu um erro. Tente novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  UNAUTHORIZED: 'Você não tem permissão para esta ação',
  NOT_FOUND: 'Recurso não encontrado',
  SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
} as const;

/**
 * Mensagens de sucesso padrão
 */
export const SUCCESS_MESSAGES = {
  SAVED: 'Salvo com sucesso!',
  UPDATED: 'Atualizado com sucesso!',
  DELETED: 'Excluído com sucesso!',
  CREATED: 'Criado com sucesso!',
  COPIED: 'Copiado para a área de transferência!',
  SENT: 'Enviado com sucesso!',
  CONNECTED: 'Conectado com sucesso!',
  SYNCED: 'Sincronizado com sucesso!',
} as const;

/**
 * Feature flags (habilitar/desabilitar funcionalidades)
 */
export const FEATURE_FLAGS = {
  ENABLE_AI_INSIGHTS: true,
  ENABLE_DATA_EXPORT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: false, // Desabilitado conforme requisito
  ENABLE_MULTI_LANGUAGE: false,
  ENABLE_SOCIAL_LOGIN: true,
  ENABLE_TWO_FACTOR_AUTH: false,
  ENABLE_AUTO_REFRESH: true,
} as const;
