/**
 * Utilitário para forçar refresh de sessão quando RLS está bloqueando
 *
 * Quando as políticas RLS são atualizadas, o JWT antigo não terá as novas
 * permissões. Este utilitário força um refresh silencioso da sessão.
 */

import { supabase } from '../lib/supabase';

/**
 * Força refresh da sessão do Supabase
 * Isso renova o JWT com as políticas RLS atualizadas
 */
export async function forceSessionRefresh(): Promise<boolean> {
  try {
    console.log('[SessionRefresh] Forçando refresh do token JWT...');

    // Força o Supabase a renovar o token
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('[SessionRefresh] Erro ao renovar sessão:', error);
      return false;
    }

    if (data.session) {
      console.log('[SessionRefresh] ✓ Token JWT renovado com sucesso');
      console.log('[SessionRefresh] Novo token expira em:', new Date(data.session.expires_at! * 1000).toLocaleString());
      return true;
    }

    console.warn('[SessionRefresh] ⚠️ Sessão renovada mas sem dados');
    return false;
  } catch (err) {
    console.error('[SessionRefresh] ❌ Exceção ao renovar sessão:', err);
    return false;
  }
}

/**
 * Detecta se um erro é causado por RLS
 */
export function isRLSError(error: any): boolean {
  if (!error) return false;

  // Códigos de erro do PostgREST relacionados a RLS
  const rlsErrorCodes = ['PGRST116', '42501'];

  // Mensagens comuns de erro RLS
  const rlsMessages = [
    'policy',
    'row-level security',
    'permission denied',
    'insufficient privilege'
  ];

  // Verifica código do erro
  if (error.code && rlsErrorCodes.includes(error.code)) {
    return true;
  }

  // Verifica mensagem do erro
  const errorMessage = error.message?.toLowerCase() || '';
  return rlsMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Tenta executar uma operação, renovando sessão se houver erro RLS
 */
export async function retryWithSessionRefresh<T>(
  operation: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Se for erro RLS e ainda temos tentativas
    if (isRLSError(error) && maxRetries > 0) {
      console.log('[SessionRefresh] Detectado erro RLS, tentando renovar sessão...');

      const refreshed = await forceSessionRefresh();

      if (refreshed) {
        console.log('[SessionRefresh] Tentando operação novamente após refresh...');
        // Aguarda 500ms para garantir que o novo token foi propagado
        await new Promise(resolve => setTimeout(resolve, 500));
        return await retryWithSessionRefresh(operation, maxRetries - 1);
      }
    }

    throw error;
  }
}
