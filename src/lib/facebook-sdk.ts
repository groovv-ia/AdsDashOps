/**
 * facebook-sdk.ts
 *
 * Modulo responsavel pelo fluxo de autorizacao OAuth do Facebook/Meta.
 *
 * Usa o fluxo padrao OAuth 2.0 (sem config_id) para obter um User Access Token
 * que permite acessar diretamente as contas de anuncios do usuario via /me/adaccounts.
 *
 * Fluxo:
 * 1. redirectToMetaOAuth() - redireciona para o dialogo OAuth do Facebook com scope
 * 2. Facebook autentica e redireciona de volta para /oauth-callback com ?code=XXX&state=meta_user_...
 * 3. OAuthCallback.tsx detecta o prefixo "meta_user_" no state e salva o code
 * 4. MetaAdminPage.tsx le o code do localStorage e chama meta-user-login
 */

// ============================================================
// Tipos exportados
// ============================================================

/** Resultado do processo de redirecionamento OAuth */
export interface MetaOAuthResult {
  success: boolean;
  error?: string;
}

// ============================================================
// Redirecionamento OAuth padrao
// ============================================================

/**
 * Inicia o fluxo OAuth padrao redirecionando o usuario para o dialogo do Facebook.
 * Solicita permissoes ads_read, business_management e read_insights via parametro scope.
 * O state com prefixo "meta_user_" permite ao OAuthCallback identificar o fluxo.
 */
export function redirectToMetaOAuth(): MetaOAuthResult {
  const appId = import.meta.env.VITE_META_APP_ID;
  const redirectUri =
    import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

  if (!appId) {
    return {
      success: false,
      error: 'VITE_META_APP_ID nao configurado. Verifique o arquivo .env',
    };
  }

  // Prefixo "meta_user_" distingue do fluxo manual e do antigo FLFB
  const state = `meta_user_${Date.now()}`;

  // Salva marcadores para o componente identificar o retorno
  localStorage.setItem('meta_user_oauth_state', state);
  localStorage.setItem('meta_user_oauth_flow', 'connecting');

  // Constroi URL de autorizacao OAuth padrao (sem config_id)
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  // Solicita permissoes necessarias para leitura de anuncios e gerenciamento
  authUrl.searchParams.set('scope', 'ads_read,business_management,read_insights');

  console.log('[MetaOAuth] Redirecionando para autorizacao Facebook...');
  console.log('[MetaOAuth] Redirect URI:', redirectUri);

  window.location.href = authUrl.toString();

  return { success: true };
}

// ============================================================
// Logout (limpa estado local)
// ============================================================

/**
 * Limpa o estado local do fluxo OAuth Meta.
 * Nao apaga dados do banco -- apenas remove marcadores do localStorage.
 */
export function metaLogout(): Promise<void> {
  return Promise.resolve().then(() => {
    // Limpa chaves do novo fluxo OAuth
    localStorage.removeItem('meta_user_oauth_state');
    localStorage.removeItem('meta_user_oauth_flow');
    localStorage.removeItem('meta_user_oauth_code');
    localStorage.removeItem('meta_user_oauth_error');
    // Limpa chaves legadas do antigo fluxo FLFB
    localStorage.removeItem('flfb_oauth_state');
    localStorage.removeItem('flfb_oauth_flow');
    localStorage.removeItem('flfb_oauth_code');
    localStorage.removeItem('flfb_oauth_error');
  });
}
