import CryptoJS from 'crypto-js';

// Chave de criptografia derivada internamente (nao exposta via env vars do browser)
const ENCRYPTION_KEY = CryptoJS.SHA256('adsops-client-encryption-2024').toString().substring(0, 32);

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
