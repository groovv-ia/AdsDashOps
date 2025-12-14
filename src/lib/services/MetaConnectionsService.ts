/**
 * MetaConnectionsService
 *
 * Servico para gerenciar multiplas conexoes Meta (System User tokens)
 * e catalogo de Ad Accounts do workspace.
 */

import { supabase } from '../supabase';

// URL base das Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// ============================================
// Tipos
// ============================================

/** Dados de uma conexao Meta */
export interface MetaConnection {
  id: string;
  name: string;
  business_manager_id: string;
  granted_scopes: string[];
  status: 'connected' | 'invalid' | 'revoked';
  is_default: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
  adaccounts_count?: number;
}

/** Conexao disponivel para uma conta */
export interface AvailableConnection {
  id: string;
  name: string;
}

/** Dados de uma Ad Account no catalogo */
export interface AdAccountCatalogItem {
  id: string;
  workspace_id: string;
  meta_ad_account_id: string;
  name: string;
  currency: string | null;
  timezone_name: string | null;
  account_status: string | null;
  primary_connection_id: string | null;
  primary_connection_name: string | null;
  last_synced_at: string | null;
  client_bound: boolean;
  bound_client_id: string | null;
  bound_client_name: string | null;
  binding_status: string | null;
  binding_connection_id: string | null;
  available_connections: AvailableConnection[];
}

/** Payload para criar nova conexao */
export interface CreateConnectionPayload {
  name: string;
  business_manager_id: string;
  system_user_token: string;
  set_as_default?: boolean;
}

/** Payload para vincular ad account a cliente */
export interface BindToClientPayload {
  client_id: string;
  meta_ad_account_id: string;
  connection_id?: string;
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Obtem headers de autorizacao para chamadas as Edge Functions
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Usuario nao autenticado');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

// ============================================
// Conexoes Meta
// ============================================

/**
 * Lista todas as conexoes Meta do workspace
 */
export async function listConnections(): Promise<MetaConnection[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-connections-manage/list`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar conexoes');
  }

  const data = await response.json();
  return data.connections;
}

/**
 * Valida e salva nova conexao Meta
 */
export async function createConnection(
  payload: CreateConnectionPayload
): Promise<{ connection_id: string; adaccounts_count: number; granted_scopes: string[] }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-connections-manage/validate-and-save`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Erro ao criar conexao');
  }

  return response.json();
}

/**
 * Define uma conexao como padrao
 */
export async function setDefaultConnection(connectionId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-connections-manage/set-default`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao definir conexao padrao');
  }
}

/**
 * Remove uma conexao
 */
export async function removeConnection(connectionId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-connections-manage/remove`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Erro ao remover conexao');
  }
}

// ============================================
// Catalogo de Ad Accounts
// ============================================

/**
 * Lista catalogo de ad accounts do workspace
 */
export async function listAdAccounts(): Promise<AdAccountCatalogItem[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-adaccounts-manage/list`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar ad accounts');
  }

  const data = await response.json();
  return data.accounts;
}

/**
 * Sincroniza ad accounts de uma conexao especifica
 */
export async function syncAdAccounts(
  connectionId: string
): Promise<{ total_accounts: number; updated_accounts: number }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-adaccounts-manage/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Erro ao sincronizar ad accounts');
  }

  return response.json();
}

/**
 * Vincula ad account a um cliente
 */
export async function bindAdAccountToClient(
  payload: BindToClientPayload
): Promise<{ client_name: string; connection_id: string }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-adaccounts-manage/bind-to-client`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Erro ao vincular ad account');
  }

  return response.json();
}

/**
 * Remove vinculo de ad account com cliente
 */
export async function unbindAdAccount(metaAdAccountId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${FUNCTIONS_URL}/meta-adaccounts-manage/unbind`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ meta_ad_account_id: metaAdAccountId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao desvincular ad account');
  }
}

// ============================================
// Clientes (auxiliar)
// ============================================

/** Dados basicos de um cliente */
export interface ClientBasic {
  id: string;
  name: string;
}

/**
 * Lista clientes do workspace para selecao
 */
export async function listClientsForBinding(): Promise<ClientBasic[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error('Erro ao listar clientes');
  }

  return data || [];
}
