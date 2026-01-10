/**
 * ClientNameSuggestions
 *
 * Utilitário para gerar sugestões inteligentes de nomes de clientes
 * baseados nos nomes das contas Meta Ads.
 */

import { supabase } from '../supabase';

/**
 * Remove prefixos e sufixos comuns de nomes de contas de anúncios
 */
function cleanAccountName(name: string): string {
  // Lista de prefixos e sufixos comuns a remover
  const prefixesToRemove = [
    'Ad Account',
    'AdAccount',
    'Ads Account',
    'AdsAccount',
    'Meta Ads',
    'Facebook Ads',
    'FB Ads',
    'Ads -',
    'Ads:',
    'Account:',
    'Account -',
  ];

  const suffixesToRemove = [
    '- Ads',
    'Ads',
    '(Ads)',
    '- Ad Account',
    '(Ad Account)',
  ];

  let cleaned = name.trim();

  // Remove prefixos (case insensitive)
  for (const prefix of prefixesToRemove) {
    const regex = new RegExp(`^${prefix}\\s*[-:]?\\s*`, 'i');
    cleaned = cleaned.replace(regex, '');
  }

  // Remove sufixos (case insensitive)
  for (const suffix of suffixesToRemove) {
    const regex = new RegExp(`\\s*[-:]?\\s*${suffix}$`, 'i');
    cleaned = cleaned.replace(regex, '');
  }

  // Remove parênteses vazios ou com apenas espaços
  cleaned = cleaned.replace(/\(\s*\)/g, '');

  // Remove múltiplos espaços
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove espaços no início e fim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Capitaliza corretamente um nome
 * Mantém siglas em maiúsculas, capitaliza primeira letra de cada palavra
 */
function capitalizeClientName(name: string): string {
  // Lista de palavras que devem permanecer em minúsculas (exceto no início)
  const lowercaseWords = ['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os'];

  const words = name.split(' ');

  const capitalized = words.map((word, index) => {
    // Se a palavra estiver toda em maiúsculas com 2+ letras, assume que é sigla
    if (word.length >= 2 && word === word.toUpperCase()) {
      return word;
    }

    // Se é uma palavra que deve ficar em minúscula e não é a primeira
    if (index > 0 && lowercaseWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }

    // Capitaliza primeira letra, resto minúsculo
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return capitalized.join(' ');
}

/**
 * Gera uma sugestão de nome de cliente baseado no nome da conta Meta
 */
export function suggestClientName(metaAccountName: string): string {
  // Limpa o nome
  const cleaned = cleanAccountName(metaAccountName);

  // Se após limpar ficou vazio, usa um nome padrão
  if (!cleaned) {
    return 'Novo Cliente';
  }

  // Capitaliza corretamente
  const capitalized = capitalizeClientName(cleaned);

  return capitalized;
}

/**
 * Verifica se um nome de cliente já existe no workspace
 */
async function clientNameExists(
  name: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking if client name exists:', error);
    return false;
  }
}

/**
 * Gera um nome único de cliente, adicionando numeração se necessário
 */
export async function generateUniqueClientName(
  baseName: string,
  workspaceId: string
): Promise<string> {
  // Limpa e capitaliza o nome base
  const cleanName = suggestClientName(baseName);

  // Verifica se o nome já existe
  const exists = await clientNameExists(cleanName, workspaceId);

  if (!exists) {
    return cleanName;
  }

  // Se existe, tenta adicionar números até encontrar um único
  let counter = 2;
  let uniqueName = `${cleanName} (${counter})`;

  while (await clientNameExists(uniqueName, workspaceId)) {
    counter++;
    uniqueName = `${cleanName} (${counter})`;

    // Limite de segurança para evitar loop infinito
    if (counter > 100) {
      // Adiciona timestamp para garantir unicidade
      uniqueName = `${cleanName} (${Date.now()})`;
      break;
    }
  }

  return uniqueName;
}

/**
 * Gera sugestões de nomes para múltiplas contas
 */
export async function generateClientNameSuggestions(
  metaAccounts: Array<{ id: string; name: string }>,
  workspaceId: string
): Promise<Array<{ accountId: string; accountName: string; suggestedName: string }>> {
  const suggestions = [];

  for (const account of metaAccounts) {
    const suggestedName = await generateUniqueClientName(
      account.name,
      workspaceId
    );

    suggestions.push({
      accountId: account.id,
      accountName: account.name,
      suggestedName,
    });
  }

  return suggestions;
}

/**
 * Gera um nome padrão para quando o usuário escolhe agrupar tudo em um cliente
 */
export async function generateGroupedClientName(
  workspaceId: string,
  userEmail?: string
): Promise<string> {
  // Tenta usar o nome do workspace
  const { data: workspaceData } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceData?.name) {
    // Remove "Workspace" do nome se existir
    const baseName = workspaceData.name.replace(/\s*workspace\s*/i, '').trim();
    if (baseName) {
      return generateUniqueClientName(baseName, workspaceId);
    }
  }

  // Se não tem workspace name, usa o email do usuário
  if (userEmail) {
    const baseName = userEmail.split('@')[0];
    return generateUniqueClientName(
      capitalizeClientName(baseName),
      workspaceId
    );
  }

  // Fallback
  return generateUniqueClientName('Minha Empresa', workspaceId);
}

/**
 * Valida se um nome de cliente é válido
 */
export function validateClientName(name: string): {
  valid: boolean;
  error?: string;
} {
  // Remove espaços no início e fim
  const trimmed = name.trim();

  // Nome não pode ser vazio
  if (!trimmed) {
    return {
      valid: false,
      error: 'O nome do cliente não pode ser vazio',
    };
  }

  // Nome deve ter pelo menos 2 caracteres
  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'O nome do cliente deve ter pelo menos 2 caracteres',
    };
  }

  // Nome não pode ter mais de 100 caracteres
  if (trimmed.length > 100) {
    return {
      valid: false,
      error: 'O nome do cliente não pode ter mais de 100 caracteres',
    };
  }

  // Nome não pode conter apenas números
  if (/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'O nome do cliente não pode conter apenas números',
    };
  }

  return { valid: true };
}
