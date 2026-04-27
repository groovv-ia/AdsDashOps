/**
 * facebook-sdk.ts
 *
 * Modulo que encapsula toda a interacao com o Facebook JavaScript SDK.
 * Usado pelo fluxo do Facebook Login for Business (FLFB), que gera tokens
 * de System User permanentes (BISUAT - Business Integration System User Access Token).
 *
 * Fluxo FLFB:
 * 1. initFacebookSDK() - inicializa o SDK com o App ID
 * 2. loginWithFLFB()   - abre o popup de autorizacao com o config_id da configuracao
 * 3. O SDK retorna um `code` (authorization code) que deve ser enviado para o backend
 * 4. O backend (edge function) troca o code pelo BISUAT permanente
 */

// ============================================================
// Tipagem do objeto global window.FB
// ============================================================

/** Resposta do metodo FB.getLoginStatus e dos callbacks de login */
export interface FBAuthResponse {
  accessToken?: string;
  code?: string;
  expiresIn?: number;
  grantedScopes?: string;
  reauthorize_required_in?: number;
  signedRequest?: string;
  userID?: string;
}

/** Objeto de status da sessao Facebook */
export interface FBStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse: FBAuthResponse | null;
}

/** Parametros para o metodo FB.login() */
export interface FBLoginOptions {
  /** ID da configuracao do Facebook Login for Business */
  config_id?: string;
  /** Tipo de resposta: 'code' para authorization code flow */
  response_type?: 'code' | 'token';
  /** Escopos adicionais (geralmente nao necessario com config_id) */
  scope?: string;
  /** Permissoes extras */
  auth_type?: string;
  /** Retorna access_token com as permissoes extras */
  return_scopes?: boolean;
}

/** Interface do objeto global FB */
interface FacebookSDK {
  init(params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }): void;
  login(callback: (response: FBStatusResponse) => void, options?: FBLoginOptions): void;
  logout(callback: (response: FBStatusResponse) => void): void;
  getLoginStatus(callback: (response: FBStatusResponse) => void, force?: boolean): void;
  api(path: string, callback: (response: Record<string, unknown>) => void): void;
  api(
    path: string,
    method: string,
    params: Record<string, unknown>,
    callback: (response: Record<string, unknown>) => void
  ): void;
}

// Declara window.FB como optional para evitar erros quando o SDK ainda nao carregou
declare global {
  interface Window {
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
  }
}

// ============================================================
// Inicializacao do SDK
// ============================================================

/**
 * Inicializa o Facebook SDK com o App ID configurado.
 * Aguarda o SDK ser carregado caso ainda nao esteja disponivel.
 *
 * @returns Promise resolvida quando o SDK estiver pronto
 */
export function initFacebookSDK(): Promise<FacebookSDK> {
  return new Promise((resolve, reject) => {
    const appId = import.meta.env.VITE_META_APP_ID;

    if (!appId) {
      reject(new Error('VITE_META_APP_ID nao configurado. Verifique o arquivo .env'));
      return;
    }

    // Se o SDK ja esta carregado, inicializa imediatamente
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: false, version: 'v21.0' });
      resolve(window.FB);
      return;
    }

    // Aguarda o SDK ser carregado (fbAsyncInit e chamado quando o script do SDK carrega)
    const originalInit = window.fbAsyncInit;
    const timeout = setTimeout(() => {
      reject(new Error('Timeout ao carregar o Facebook SDK. Verifique sua conexao de internet.'));
    }, 10000);

    window.fbAsyncInit = function () {
      clearTimeout(timeout);

      // Chama o init original se existia (definido no index.html)
      if (originalInit) originalInit();

      if (!window.FB) {
        reject(new Error('Facebook SDK falhou ao inicializar'));
        return;
      }

      window.FB.init({ appId, cookie: true, xfbml: false, version: 'v21.0' });
      resolve(window.FB);
    };
  });
}

// ============================================================
// Verificacao de status
// ============================================================

/**
 * Verifica o status atual de login do Facebook.
 * Retorna 'connected' se o usuario ja autorizou o app, 'not_authorized' caso contrario.
 */
export function getFBLoginStatus(): Promise<FBStatusResponse> {
  return new Promise(async (resolve, reject) => {
    try {
      const fb = await initFacebookSDK();
      // true forca verificacao com o servidor (ignora cache)
      fb.getLoginStatus((response) => resolve(response), true);
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================
// Login com Facebook Login for Business
// ============================================================

/** Resultado do processo de login FLFB */
export interface FLFBLoginResult {
  success: boolean;
  /** Authorization code para ser trocado pelo backend pelo BISUAT */
  code?: string;
  /** Descricao do erro caso success = false */
  error?: string;
  /** Se o usuario cancelou o popup voluntariamente */
  cancelled?: boolean;
}

/**
 * Abre o popup do Facebook Login for Business e retorna o authorization code.
 *
 * O config_id especifica qual configuracao usar (permissoes, tipo de token, ativos).
 * Com response_type: 'code', o SDK retorna um authorization code que deve ser
 * enviado para o backend para ser trocado pelo BISUAT permanente.
 *
 * @returns FLFBLoginResult com o code ou mensagem de erro
 */
export async function loginWithFLFB(): Promise<FLFBLoginResult> {
  const configId = import.meta.env.VITE_META_LOGIN_CONFIG_ID;

  if (!configId) {
    return {
      success: false,
      error: 'VITE_META_LOGIN_CONFIG_ID nao configurado. Verifique o arquivo .env',
    };
  }

  let fb: FacebookSDK;
  try {
    fb = await initFacebookSDK();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar o Facebook SDK',
    };
  }

  return new Promise((resolve) => {
    fb.login(
      (response: FBStatusResponse) => {
        console.log('[FLFB] Resposta do login:', response.status);

        if (response.status === 'connected' && response.authResponse) {
          const { code, accessToken } = response.authResponse;

          // FLFB com response_type:'code' retorna um authorization code
          if (code) {
            console.log('[FLFB] Authorization code recebido com sucesso');
            resolve({ success: true, code });
            return;
          }

          // Fallback: se por algum motivo retornou accessToken diretamente
          if (accessToken) {
            console.warn('[FLFB] AccessToken retornado diretamente (esperava code)');
            resolve({ success: true, code: accessToken });
            return;
          }

          resolve({
            success: false,
            error: 'Resposta de autorizacao incompleta: nenhum code ou token recebido',
          });
        } else if (response.status === 'not_authorized') {
          // Usuario autorizou o Facebook mas nao autorizou o app
          resolve({
            success: false,
            cancelled: true,
            error: 'Autorizacao negada. Voce precisa permitir o acesso para continuar.',
          });
        } else {
          // 'unknown' - popup fechado sem autorizacao
          resolve({
            success: false,
            cancelled: true,
            error: 'Login cancelado. Tente novamente.',
          });
        }
      },
      {
        config_id: configId,
        response_type: 'code',
      }
    );
  });
}

// ============================================================
// Logout
// ============================================================

/**
 * Desconecta o usuario do Facebook no contexto deste app.
 * Nao apaga os dados do banco -- apenas limpa a sessao local do SDK.
 */
export function fbLogout(): Promise<void> {
  return new Promise(async (resolve) => {
    if (!window.FB) {
      resolve();
      return;
    }
    try {
      const fb = await initFacebookSDK();
      fb.logout(() => resolve());
    } catch {
      resolve();
    }
  });
}
