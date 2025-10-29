/**
 * Utilitários de Tratamento de Erros
 *
 * Funções para padronizar o tratamento de erros na aplicação,
 * incluindo parsing de erros, formatação de mensagens e logging.
 */

/**
 * Interface para erro padronizado da aplicação
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
}

/**
 * Códigos de erro comuns da aplicação
 */
export const ErrorCodes = {
  // Erros de autenticação
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_EMAIL_IN_USE: 'auth/email-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_TOKEN_EXPIRED: 'auth/token-expired',
  AUTH_UNAUTHORIZED: 'auth/unauthorized',

  // Erros de validação
  VALIDATION_REQUIRED_FIELD: 'validation/required-field',
  VALIDATION_INVALID_EMAIL: 'validation/invalid-email',
  VALIDATION_INVALID_FORMAT: 'validation/invalid-format',
  VALIDATION_MIN_LENGTH: 'validation/min-length',
  VALIDATION_MAX_LENGTH: 'validation/max-length',

  // Erros de rede/API
  NETWORK_ERROR: 'network/error',
  API_ERROR: 'api/error',
  API_TIMEOUT: 'api/timeout',
  API_NOT_FOUND: 'api/not-found',
  API_SERVER_ERROR: 'api/server-error',

  // Erros de banco de dados
  DB_CONNECTION_ERROR: 'db/connection-error',
  DB_QUERY_ERROR: 'db/query-error',
  DB_CONSTRAINT_ERROR: 'db/constraint-error',
  DB_NOT_FOUND: 'db/not-found',

  // Erros de integração
  INTEGRATION_META_ERROR: 'integration/meta-error',
  INTEGRATION_GOOGLE_ERROR: 'integration/google-error',
  INTEGRATION_TIKTOK_ERROR: 'integration/tiktok-error',
  INTEGRATION_OAUTH_ERROR: 'integration/oauth-error',

  // Erros genéricos
  UNKNOWN_ERROR: 'unknown/error',
  INTERNAL_ERROR: 'internal/error',
  PERMISSION_DENIED: 'permission/denied',
  RESOURCE_NOT_FOUND: 'resource/not-found',
} as const;

/**
 * Mensagens amigáveis para usuários
 */
const ErrorMessages: Record<string, string> = {
  // Autenticação
  'auth/invalid-credentials': 'Email ou senha incorretos.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/email-in-use': 'Este email já está em uso.',
  'auth/weak-password': 'A senha deve ter pelo menos 8 caracteres.',
  'auth/token-expired': 'Sua sessão expirou. Faça login novamente.',
  'auth/unauthorized': 'Você não tem permissão para acessar este recurso.',

  // Validação
  'validation/required-field': 'Este campo é obrigatório.',
  'validation/invalid-email': 'Email inválido.',
  'validation/invalid-format': 'Formato inválido.',
  'validation/min-length': 'O valor é muito curto.',
  'validation/max-length': 'O valor é muito longo.',

  // Rede/API
  'network/error': 'Erro de conexão. Verifique sua internet.',
  'api/error': 'Erro ao processar sua solicitação.',
  'api/timeout': 'A solicitação demorou muito para responder.',
  'api/not-found': 'Recurso não encontrado.',
  'api/server-error': 'Erro interno do servidor.',

  // Banco de dados
  'db/connection-error': 'Erro ao conectar ao banco de dados.',
  'db/query-error': 'Erro ao executar consulta no banco.',
  'db/constraint-error': 'Erro de validação de dados.',
  'db/not-found': 'Registro não encontrado no banco.',

  // Integração
  'integration/meta-error': 'Erro ao conectar com Meta Ads.',
  'integration/google-error': 'Erro ao conectar com Google Ads.',
  'integration/tiktok-error': 'Erro ao conectar com TikTok Ads.',
  'integration/oauth-error': 'Erro na autenticação OAuth.',

  // Genéricos
  'unknown/error': 'Ocorreu um erro inesperado.',
  'internal/error': 'Erro interno da aplicação.',
  'permission/denied': 'Você não tem permissão para esta ação.',
  'resource/not-found': 'Recurso não encontrado.',
};

/**
 * Cria um objeto de erro padronizado
 *
 * @param code - Código do erro
 * @param message - Mensagem customizada (opcional)
 * @param details - Detalhes adicionais do erro
 * @returns Objeto AppError
 */
export const createError = (
  code: string,
  message?: string,
  details?: any
): AppError => {
  return {
    code,
    message: message || ErrorMessages[code] || ErrorMessages['unknown/error'],
    details,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Parseia um erro para o formato AppError
 *
 * @param error - Erro a ser parseado (pode ser Error, string, objeto)
 * @returns Objeto AppError
 */
export const parseError = (error: unknown): AppError => {
  // Se já é um AppError, retorna
  if (isAppError(error)) {
    return error;
  }

  // Se é um Error padrão
  if (error instanceof Error) {
    return createError(
      ErrorCodes.INTERNAL_ERROR,
      error.message,
      { stack: error.stack }
    );
  }

  // Se é uma string
  if (typeof error === 'string') {
    return createError(ErrorCodes.UNKNOWN_ERROR, error);
  }

  // Se é um objeto com propriedades específicas
  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    // Erro de rede/fetch
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return createError(ErrorCodes.NETWORK_ERROR);
    }

    // Erro do Supabase
    if (err.code && err.message) {
      return createError(
        `db/${err.code}`,
        err.message,
        err
      );
    }

    // Erro HTTP com status
    if (err.status || err.statusCode) {
      const status = err.status || err.statusCode;
      if (status === 401 || status === 403) {
        return createError(ErrorCodes.AUTH_UNAUTHORIZED);
      } else if (status === 404) {
        return createError(ErrorCodes.API_NOT_FOUND);
      } else if (status >= 500) {
        return createError(ErrorCodes.API_SERVER_ERROR);
      }
    }

    // Tenta extrair mensagem do objeto
    const message = err.message || err.error || err.msg || JSON.stringify(err);
    return createError(ErrorCodes.UNKNOWN_ERROR, message, err);
  }

  // Fallback para erro desconhecido
  return createError(ErrorCodes.UNKNOWN_ERROR);
};

/**
 * Verifica se um objeto é um AppError
 *
 * @param error - Objeto a ser verificado
 * @returns true se for AppError
 */
export const isAppError = (error: any): error is AppError => {
  return (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
};

/**
 * Obtém mensagem amigável para exibir ao usuário
 *
 * @param error - Erro a ser formatado
 * @returns Mensagem amigável
 */
export const getErrorMessage = (error: unknown): string => {
  const appError = parseError(error);
  return appError.message;
};

/**
 * Loga um erro no console (em desenvolvimento) ou serviço de logging
 *
 * @param error - Erro a ser logado
 * @param context - Contexto adicional (componente, função, etc)
 */
export const logError = (error: unknown, context?: string): void => {
  const appError = parseError(error);

  // Em desenvolvimento, loga no console
  if (import.meta.env.DEV) {
    console.group(`❌ Error${context ? ` in ${context}` : ''}`);
    console.error('Code:', appError.code);
    console.error('Message:', appError.message);
    console.error('Timestamp:', appError.timestamp);
    if (appError.details) {
      console.error('Details:', appError.details);
    }
    console.groupEnd();
  }

  // Em produção, poderia enviar para serviço de logging (Sentry, LogRocket, etc)
  // if (import.meta.env.PROD) {
  //   sentryService.captureException(appError);
  // }
};

/**
 * Trata erro de forma assíncrona com retry
 *
 * @param fn - Função assíncrona a ser executada
 * @param maxRetries - Número máximo de tentativas
 * @param delay - Delay entre tentativas (ms)
 * @returns Resultado da função ou erro
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logError(error, `Attempt ${attempt}/${maxRetries}`);

      if (attempt < maxRetries) {
        // Aguarda antes da próxima tentativa (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw parseError(lastError);
};

/**
 * Wrapper para try-catch que retorna resultado ou erro
 *
 * @param fn - Função a ser executada
 * @returns Tupla [data, error]
 *
 * @example
 * const [data, error] = await tryCatch(() => fetchData());
 * if (error) {
 *   console.error(error);
 *   return;
 * }
 * console.log(data);
 */
export const tryCatch = async <T>(
  fn: () => Promise<T>
): Promise<[T | null, AppError | null]> => {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    return [null, parseError(error)];
  }
};

/**
 * Wrapper síncrono para try-catch
 *
 * @param fn - Função síncrona a ser executada
 * @returns Tupla [data, error]
 */
export const tryCatchSync = <T>(
  fn: () => T
): [T | null, AppError | null] => {
  try {
    const data = fn();
    return [data, null];
  } catch (error) {
    return [null, parseError(error)];
  }
};

/**
 * ErrorBoundary helper para capturar erros React
 *
 * @param error - Erro capturado
 * @param errorInfo - Informações adicionais do React
 */
export const handleReactError = (
  error: Error,
  errorInfo: React.ErrorInfo
): void => {
  const appError = createError(
    ErrorCodes.INTERNAL_ERROR,
    error.message,
    {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    }
  );

  logError(appError, 'React ErrorBoundary');
};

/**
 * Valida resposta de API e lança erro se necessário
 *
 * @param response - Resposta da API
 * @returns Resposta se válida
 * @throws AppError se resposta inválida
 */
export const validateApiResponse = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Se não conseguir parsear JSON, usa mensagem padrão
    }

    const errorCode = response.status === 401
      ? ErrorCodes.AUTH_UNAUTHORIZED
      : response.status === 404
      ? ErrorCodes.API_NOT_FOUND
      : response.status >= 500
      ? ErrorCodes.API_SERVER_ERROR
      : ErrorCodes.API_ERROR;

    throw createError(errorCode, errorMessage, {
      status: response.status,
      url: response.url,
    });
  }

  return response;
};
