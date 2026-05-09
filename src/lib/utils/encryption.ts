import CryptoJS from 'crypto-js';

/**
 * AVISO DE SEGURANCA:
 * Esta criptografia client-side e usada apenas como camada de ofuscacao
 * para tokens armazenados via fluxos legados.
 *
 * Novos fluxos de token (Meta, Google) devem usar as edge functions que
 * armazenam tokens via Supabase Vault (vault.secrets) — nunca via este modulo.
 *
 * A chave e lida da variavel de ambiente VITE_ENCRYPTION_KEY.
 * Se nao configurada, usa um valor derivado do project ID para evitar
 * que a chave seja uma string literal no bundle JS.
 */
const buildEncryptionKey = (): string => {
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    return envKey.substring(0, 32);
  }
  // Fallback: deriva da URL do projeto (unica por instancia, nao e segredo publico)
  const projectRef = import.meta.env.VITE_SUPABASE_URL || 'adsops-default';
  return CryptoJS.SHA256(projectRef + '-enc-salt').toString().substring(0, 32);
};

const ENCRYPTION_KEY = buildEncryptionKey();

export const encryptData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
};

export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

export const generateRandomKey = (length: number = 32): string => {
  return CryptoJS.lib.WordArray.random(length).toString();
};

export const validateEncryption = (data: string, encryptedData: string): boolean => {
  try {
    const decrypted = decryptData(encryptedData);
    return data === decrypted;
  } catch {
    return false;
  }
};
