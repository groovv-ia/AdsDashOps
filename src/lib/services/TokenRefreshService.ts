/**
 * TokenRefreshService
 *
 * Servico responsavel por verificar o status de expiracao dos tokens
 * do Meta Ads e renovar automaticamente quando necessario.
 *
 * Logica de expiracao:
 * - 'valid': mais de 7 dias para expirar
 * - 'expiring_soon': menos de 7 dias para expirar
 * - 'expired': token ja expirou
 * - 'unknown': sem data de expiracao registrada
 */

import { supabase } from '../supabase';

// Numero de dias antes da expiracao para considerar "expirando em breve"
const EXPIRY_WARNING_DAYS = 7;

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
 * Busca o status atual do token Meta do workspace do usuario
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

    // Busca a conexao Meta com a data de expiracao do token
    const { data: connection } = await supabase
      .from('meta_connections')
      .select('id, token_expires_at, status, updated_at')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!connection) {
      return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
    }

    // Calcula a data de expiracao: usa token_expires_at se disponivel,
    // caso contrario estima baseado em updated_at + 60 dias
    const expiresAtStr = connection.token_expires_at ||
      (connection.updated_at
        ? new Date(new Date(connection.updated_at).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
        : null);

    if (!expiresAtStr) {
      return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: connection.id };
    }

    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

    let status: TokenExpiryStatus;
    if (msRemaining <= 0) {
      status = 'expired';
    } else if (daysRemaining <= EXPIRY_WARNING_DAYS) {
      status = 'expiring_soon';
    } else {
      status = 'valid';
    }

    return {
      status,
      daysRemaining,
      expiresAt: expiresAtStr,
      connectionId: connection.id,
    };
  } catch (error) {
    console.error('[TokenRefreshService] Erro ao verificar status do token:', error);
    return { status: 'unknown', daysRemaining: null, expiresAt: null, connectionId: null };
  }
}

/**
 * Solicita a renovacao automatica do token Meta via Edge Function
 * Retorna sucesso/falha com nova data de expiracao
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
        error: data.error || 'Erro ao renovar token',
        requiresReconnect: data.requires_reconnect === true,
      };
    }

    return {
      success: true,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[TokenRefreshService] Erro ao renovar token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se o token precisa ser renovado e o renova automaticamente se necessario.
 * Retorna true se o token esta valido (apos possivel renovacao), false se requer acao manual.
 */
export async function checkAndAutoRefresh(): Promise<{
  tokenValid: boolean;
  wasRefreshed: boolean;
  requiresReconnect: boolean;
  status: TokenExpiryStatus;
  daysRemaining: number | null;
}> {
  const tokenStatus = await getTokenExpiryStatus();

  // Token valido e nao precisa de renovacao agora
  if (tokenStatus.status === 'valid') {
    return {
      tokenValid: true,
      wasRefreshed: false,
      requiresReconnect: false,
      status: tokenStatus.status,
      daysRemaining: tokenStatus.daysRemaining,
    };
  }

  // Status desconhecido: considera valido para nao bloquear
  if (tokenStatus.status === 'unknown') {
    return {
      tokenValid: true,
      wasRefreshed: false,
      requiresReconnect: false,
      status: tokenStatus.status,
      daysRemaining: null,
    };
  }

  // Token expirando em breve ou ja expirado: tenta renovar automaticamente
  console.log(`[TokenRefreshService] Token com status "${tokenStatus.status}" (${tokenStatus.daysRemaining} dias restantes). Tentando renovar...`);

  const refreshResult = await refreshMetaToken(tokenStatus.connectionId || undefined);

  if (refreshResult.success) {
    console.log(`[TokenRefreshService] Token renovado automaticamente. Nova expiracao: ${refreshResult.expiresAt}`);
    return {
      tokenValid: true,
      wasRefreshed: true,
      requiresReconnect: false,
      status: 'valid',
      daysRemaining: 60,
    };
  }

  // Renovacao falhou
  console.warn('[TokenRefreshService] Falha ao renovar token automaticamente:', refreshResult.error);
  return {
    tokenValid: !refreshResult.requiresReconnect && tokenStatus.status === 'expiring_soon',
    wasRefreshed: false,
    requiresReconnect: refreshResult.requiresReconnect === true,
    status: tokenStatus.status,
    daysRemaining: tokenStatus.daysRemaining,
  };
}
