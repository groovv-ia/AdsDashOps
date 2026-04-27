/**
 * facebook-sdk.ts
 *
 * Modulo responsavel pelo fluxo de autorizacao do Facebook Login for Business (FLFB).
 *
 * O FLFB com config_id NAO suporta o popup via FB.login() do JavaScript SDK —
 * o Facebook retorna erro "response_type=token nao e compativel com esse fluxo".
 * Por isso, usamos redirecionamento direto para a URL de dialogo OAuth do Facebook,
 * passando o config_id como parametro. Esse e o unico metodo compativel com FLFB.
 *
 * Fluxo:
 * 1. redirectToFLFB()  - redireciona para o dialogo OAuth do Facebook com config_id
 * 2. Facebook autentica e redireciona de volta para /oauth-callback com ?code=XXX&state=flfb_...
 * 3. OAuthCallback.tsx detecta o prefixo "flfb_" no state e salva o code
 * 4. MetaAdminPage.tsx le o code do localStorage e chama meta-business-login
 */

// ============================================================
// Tipos exportados
// ============================================================

/** Resultado do processo de login FLFB */
export interface FLFBLoginResult {
  success: boolean;
  /** Authorization code para ser trocado pelo backend pelo BISUAT */
  code?: string;
  /** Descricao do erro caso success = false */
  error?: string;
  /** Se o usuario cancelou o fluxo voluntariamente */
  cancelled?: boolean;
}

// ============================================================
// Redirecionamento FLFB via URL direta
// ============================================================

/**
 * Inicia o fluxo FLFB redirecionando o usuario para o dialogo OAuth do Facebook.
 * Usa config_id para especificar a configuracao de permissoes FLFB.
 * O state com prefixo "flfb_" permite ao OAuthCallback identificar o fluxo.
 *
 * NAO usa FB.login() pois esse metodo e incompativel com config_id:
 * o SDK do Facebook injeta response_type=token internamente, causando erro 400.
 */
export function redirectToFLFB(): { success: boolean; error?: string } {
  const appId = import.meta.env.VITE_META_APP_ID;
  const configId = import.meta.env.VITE_META_LOGIN_CONFIG_ID;
  const redirectUri =
    import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

  if (!appId) {
    return {
      success: false,
      error: 'VITE_META_APP_ID nao configurado. Verifique o arquivo .env',
    };
  }

  if (!configId) {
    return {
      success: false,
      error: 'VITE_META_LOGIN_CONFIG_ID nao configurado. Verifique o arquivo .env',
    };
  }

  // Prefixo "flfb_" permite distinguir do fluxo OAuth classico no OAuthCallback
  const state = `flfb_${Date.now()}`;

  // Salva marcadores para o componente identificar o retorno
  localStorage.setItem('flfb_oauth_state', state);
  localStorage.setItem('flfb_oauth_flow', 'connecting');

  // Constroi URL de autorizacao FLFB com config_id e response_type=code
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('config_id', configId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  console.log('[FLFB] Redirecionando para autorizacao Facebook com config_id:', configId);
  console.log('[FLFB] Redirect URI:', redirectUri);
  console.log('[FLFB] State:', state);

  window.location.href = authUrl.toString();

  return { success: true };
}

// ============================================================
// Logout (limpa estado local)
// ============================================================

/**
 * Limpa o estado local do fluxo FLFB.
 * Nao apaga dados do banco -- apenas remove marcadores do localStorage.
 */
export function fbLogout(): Promise<void> {
  return Promise.resolve().then(() => {
    localStorage.removeItem('flfb_oauth_state');
    localStorage.removeItem('flfb_oauth_flow');
    localStorage.removeItem('flfb_oauth_code');
    localStorage.removeItem('flfb_oauth_error');
  });
}
