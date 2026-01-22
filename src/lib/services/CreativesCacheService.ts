/**
 * CreativesCacheService
 *
 * Servico para gerenciar cache local (localStorage) de criativos.
 * Usado como fallback quando a API falha ou para melhorar performance.
 *
 * Funcionalidades:
 * - Cache de criativos em localStorage
 * - TTL configuravel (24 horas por padrao)
 * - Limpeza automatica de cache expirado
 * - Limite de tamanho para evitar exceder quota do localStorage
 */

import type { MetaAdCreative } from '../../types/adAnalysis';

// Chave do localStorage para o cache
const CACHE_KEY = 'creatives_cache';

// Chave para metadados do cache
const CACHE_META_KEY = 'creatives_cache_meta';

// TTL padrao em milissegundos (24 horas)
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// Limite maximo de criativos no cache (para evitar exceder quota)
const MAX_CACHE_SIZE = 500;

// Interface para item do cache
interface CacheItem {
  creative: MetaAdCreative;
  cachedAt: number;
  expiresAt: number;
}

// Interface para estrutura do cache
interface CreativesCache {
  items: Record<string, CacheItem>;
  lastCleanup: number;
}

// Interface para metadados do cache
interface CacheMeta {
  totalItems: number;
  lastUpdated: number;
  version: number;
}

/**
 * Obtem o cache do localStorage
 */
function getCache(): CreativesCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[CreativesCacheService] Erro ao ler cache:', error);
  }

  return { items: {}, lastCleanup: Date.now() };
}

/**
 * Salva o cache no localStorage
 */
function saveCache(cache: CreativesCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    // Atualiza metadados
    const meta: CacheMeta = {
      totalItems: Object.keys(cache.items).length,
      lastUpdated: Date.now(),
      version: 1,
    };
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.warn('[CreativesCacheService] Erro ao salvar cache:', error);

    // Se falhou por quota, tenta limpar e salvar novamente
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('[CreativesCacheService] Quota excedida, limpando cache antigo...');
      cleanupExpiredItems(cache, true);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (retryError) {
        console.error('[CreativesCacheService] Falha ao salvar mesmo apos limpeza:', retryError);
      }
    }
  }
}

/**
 * Remove itens expirados do cache
 */
function cleanupExpiredItems(cache: CreativesCache, aggressive: boolean = false): void {
  const now = Date.now();
  const items = cache.items;
  const itemCount = Object.keys(items).length;

  // Remove itens expirados
  for (const key of Object.keys(items)) {
    if (items[key].expiresAt < now) {
      delete items[key];
    }
  }

  // Se ainda tiver muitos itens e for limpeza agressiva, remove os mais antigos
  if (aggressive && Object.keys(items).length > MAX_CACHE_SIZE / 2) {
    const sortedKeys = Object.keys(items)
      .sort((a, b) => items[a].cachedAt - items[b].cachedAt)
      .slice(0, Object.keys(items).length - MAX_CACHE_SIZE / 2);

    for (const key of sortedKeys) {
      delete items[key];
    }
  }

  cache.lastCleanup = now;

  const removedCount = itemCount - Object.keys(items).length;
  if (removedCount > 0) {
    console.log(`[CreativesCacheService] Removidos ${removedCount} itens expirados do cache`);
  }
}

/**
 * Salva um criativo no cache local
 */
export function cacheCreative(adId: string, creative: MetaAdCreative, ttlMs: number = DEFAULT_TTL_MS): void {
  const cache = getCache();
  const now = Date.now();

  // Limpa cache a cada hora se necessario
  if (now - cache.lastCleanup > 60 * 60 * 1000) {
    cleanupExpiredItems(cache);
  }

  // Verifica limite de tamanho
  if (Object.keys(cache.items).length >= MAX_CACHE_SIZE) {
    cleanupExpiredItems(cache, true);
  }

  cache.items[adId] = {
    creative,
    cachedAt: now,
    expiresAt: now + ttlMs,
  };

  saveCache(cache);
}

/**
 * Salva multiplos criativos no cache local
 */
export function cacheCreativesBatch(creatives: Record<string, MetaAdCreative>, ttlMs: number = DEFAULT_TTL_MS): void {
  const cache = getCache();
  const now = Date.now();

  // Limpa cache se necessario
  if (now - cache.lastCleanup > 60 * 60 * 1000) {
    cleanupExpiredItems(cache);
  }

  // Verifica se vai exceder limite
  const newItemsCount = Object.keys(creatives).length;
  const currentCount = Object.keys(cache.items).length;

  if (currentCount + newItemsCount > MAX_CACHE_SIZE) {
    cleanupExpiredItems(cache, true);
  }

  // Adiciona os criativos
  for (const [adId, creative] of Object.entries(creatives)) {
    cache.items[adId] = {
      creative,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };
  }

  saveCache(cache);

  console.log(`[CreativesCacheService] ${newItemsCount} criativos salvos no cache local`);
}

/**
 * Busca um criativo do cache local
 */
export function getCachedCreative(adId: string): MetaAdCreative | null {
  const cache = getCache();
  const item = cache.items[adId];

  if (!item) {
    return null;
  }

  // Verifica se expirou
  if (item.expiresAt < Date.now()) {
    delete cache.items[adId];
    saveCache(cache);
    return null;
  }

  return item.creative;
}

/**
 * Busca multiplos criativos do cache local
 */
export function getCachedCreativesBatch(adIds: string[]): Record<string, MetaAdCreative> {
  const cache = getCache();
  const now = Date.now();
  const result: Record<string, MetaAdCreative> = {};
  let hasExpired = false;

  for (const adId of adIds) {
    const item = cache.items[adId];

    if (item && item.expiresAt >= now) {
      result[adId] = item.creative;
    } else if (item) {
      delete cache.items[adId];
      hasExpired = true;
    }
  }

  // Salva se removeu itens expirados
  if (hasExpired) {
    saveCache(cache);
  }

  return result;
}

/**
 * Verifica se um criativo esta no cache
 */
export function isCreativeCached(adId: string): boolean {
  return getCachedCreative(adId) !== null;
}

/**
 * Remove um criativo do cache
 */
export function removeCachedCreative(adId: string): void {
  const cache = getCache();

  if (cache.items[adId]) {
    delete cache.items[adId];
    saveCache(cache);
  }
}

/**
 * Limpa todo o cache
 */
export function clearCreativesCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_META_KEY);
    console.log('[CreativesCacheService] Cache limpo com sucesso');
  } catch (error) {
    console.warn('[CreativesCacheService] Erro ao limpar cache:', error);
  }
}

/**
 * Obtem estatisticas do cache
 */
export function getCacheStats(): { totalItems: number; validItems: number; expiredItems: number; sizeKB: number } {
  const cache = getCache();
  const now = Date.now();

  let validItems = 0;
  let expiredItems = 0;

  for (const item of Object.values(cache.items)) {
    if (item.expiresAt >= now) {
      validItems++;
    } else {
      expiredItems++;
    }
  }

  // Estima tamanho em KB
  let sizeKB = 0;
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (cacheStr) {
      sizeKB = Math.round(cacheStr.length / 1024);
    }
  } catch {
    sizeKB = 0;
  }

  return {
    totalItems: Object.keys(cache.items).length,
    validItems,
    expiredItems,
    sizeKB,
  };
}

/**
 * Executa limpeza manual do cache
 */
export function runCacheCleanup(): void {
  const cache = getCache();
  cleanupExpiredItems(cache, false);
  saveCache(cache);
}
