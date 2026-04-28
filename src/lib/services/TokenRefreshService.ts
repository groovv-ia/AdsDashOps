/**
 * TokenRefreshService
 *
 * Servico responsavel por verificar o status dos tokens de System User
 * do Meta Ads e validar se ainda estao ativos.
 *
 * System User tokens sao permanentes (nao expiram por tempo).
 * A verificacao consiste em chamar a Edge Function que valida o token
 * via /me endpoint da Meta Graph API.
 *
 * Logica de status:
 * - 'valid': token ativo (token_expires_at > 365 dias ou status = connected)
 * - 'expired': conexao marcada como token_expired no banco (token revogado)
 * - 'unknown': sem conexao ou dados insuficientes
 */

import { supabase } from '../supabase';

// URL base das Edge Functions
const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export type TokenExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

export interface TokenStatusInfo {
  status: TokenExpiryStatus;
  daysRemaining: number | null;
  expiresAt: string | null;
  connectionId: string | null;
}

export interface RefreshResult {
  success: boolean;
  expiresAt?: string;
  error?: string;
  requiresReconnect?: boolean;
}

/**
 * Busca o status atual do token Meta do workspace do usuario.
 * Para System User tokens, verifica o campo status da conexao
 * e o token_expires_at armazenado no banco.
 */
export async function getTokenExpiryStatus(): Promise<TokenStatusInfo> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
    }

    // Busca o workspace do usuario
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!workspace) {
      return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
    }

    // Busca a conexao Meta com status e data de expiracao
    const { data: connection } = await supabase
      .from('meta_connections')
      .select('id, token_expires_at, status, updated_at')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!connection) {
      return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
    }

    // Se a conexao esta explicitamente marcada como token_expired, retorna expired
    if (connection.status === 'token_expired') {
      return {
        status: 'expired',
        daysRemaining: 0,
        expiresAt: connection.token_expires_at,
        connectionId: connection.id,
      };
    }

    // System User tokens sao permanentes. Se token_expires_at nao existe,
    // considera valido (nao estima mais baseado em updated_at + 60 dias)
    if (!connection.token_expires_at) {
      return { status: 'valid', daysRemaining: null, expiresAt: null, connectionId: connection.id };
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

    // Tokens com mais de 365 dias restantes sao System User tokens (permanentes)
    if (daysRemaining > 365) {
      return {
        status: 'valid',
        daysRemaining: null,
        expiresAt: connection.token_expires_at,
        connectionId: connection.id,
      };
    }

    // Para tokens com token_expires_at antigo (antes da correcao), verifica se ja passou
    let status: TokenExpiryStatus;
    if (msRemaining <= 0) {
      status = 'expired';
    } else if (daysRemaining <= 7) {
      status = 'expiring_soon';
    } else {
      status = 'valid';
    }

    return {
      status,
      daysRemaining,
      expiresAt: connection.token_expires_at,
      connectionId: connection.id,
    };
  } catch (error) {
    console.error('[TokenRefreshService] Erro ao verificar status do token:', error);
    return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
  }
}

/**
 * Valida o token de System User via Edge Function.
 * A Edge Function chama /me na Meta Graph API para confirmar que o token ainda esta ativo.
 * Se valido, atualiza token_expires_at no banco. Se invalido, marca como token_expired.
 */
export async function refreshMetaToken(connectionId?: string): Promise<RefreshResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Sessao nao encontrada. Faca login novamente.' };
    }

    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/meta-refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ connection_id: connectionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao validar token',
        requiresReconnect: data.requires_reconnect === true,
      };
    }

    return {
      success: true,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[TokenRefreshService] Erro ao validar token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se o token precisa de validacao e o valida automaticamente se necessario.
 * Para System User tokens, a "renovacao" consiste em verificar se o token ainda funciona.
 */
export async function checkAndAutoRefresh(): Promise<{
  tokenValid: boolean;
  wasRefreshed: boolean;
  requiresReconnect: boolean;
  status: TokenExpiryStatus;
  daysRemaining: number | null;
}> {
  const tokenStatus = await getTokenExpiryStatus();

  // Token valido, sem necessidade de acao
  if (tokenStatus.status === 'valid') {
    return {
      tokenValid: true,
      wasRefreshed: false,
      requiresReconnect: false,
      status: tokenStatus.status,
      daysRemaining: tokenStatus.daysRemaining,
    };
  }

  // Status desconhecido: considera valido para nao bloquear o usuario
  if (tokenStatus.status === 'unknown') {
    return {
      tokenValid: true,
      wasRefreshed: false,
      requiresReconnect: false,
      status: tokenStatus.status,
      daysRemaining: null,
    };
  }

  // Token com status expired ou expiring_soon: tenta validar via /me
  console.log(`[TokenRefreshService] Token com status "${tokenStatus.status}". Validando com Meta API...`);

  const refreshResult = await refreshMetaToken(tokenStatus.connectionId || undefined);

  if (refreshResult.success) {
    console.log('[TokenRefreshService] Token de System User validado com sucesso.');
    return {
      tokenValid: true,
      wasRefreshed: true,
      requiresReconnect: false,
      status: 'valid',
      daysRemaining: null,
    };
  }

  // Validacao falhou - token foi revogado
  console.warn('[TokenRefreshService] Token invalido:', refreshResult.error);
  return {
    tokenValid: false,
    wasRefreshed: false,
    requiresReconnect: refreshResult.requiresReconnect === true,
    status: 'expired',
    daysRemaining: 0,
  };
}
