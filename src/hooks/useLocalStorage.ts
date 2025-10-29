import { useState, useEffect, useCallback } from 'react';

/**
 * Hook useLocalStorage
 *
 * Sincroniza um estado do React com localStorage.
 * Permite persistir dados entre sessões do navegador.
 *
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial se não existir no localStorage
 * @returns [value, setValue, removeValue]
 *
 * @example
 * const [user, setUser, removeUser] = useLocalStorage('user', null);
 *
 * // Salva no localStorage
 * setUser({ name: 'João', email: 'joao@example.com' });
 *
 * // Remove do localStorage
 * removeUser();
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  // Função para ler o valor do localStorage
  const readValue = useCallback((): T => {
    // Previne erros em ambiente SSR
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // Estado sincronizado com localStorage
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Função para atualizar o valor
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      // Previne erros em ambiente SSR
      if (typeof window === 'undefined') {
        console.warn('localStorage is not available in this environment');
        return;
      }

      try {
        // Permite passar uma função para atualização baseada no valor anterior
        const newValue = value instanceof Function ? value(storedValue) : value;

        // Salva no localStorage
        window.localStorage.setItem(key, JSON.stringify(newValue));

        // Atualiza o estado
        setStoredValue(newValue);

        // Dispara evento customizado para sincronizar entre abas
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, newValue },
          })
        );
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Função para remover o valor
  const removeValue = useCallback(() => {
    // Previne erros em ambiente SSR
    if (typeof window === 'undefined') {
      console.warn('localStorage is not available in this environment');
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);

      // Dispara evento customizado
      window.dispatchEvent(
        new CustomEvent('local-storage', {
          detail: { key, newValue: null },
        })
      );
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sincroniza mudanças de outras abas/janelas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key === key) {
        // StorageEvent nativo
        setStoredValue(readValue());
      } else if ('detail' in e && e.detail?.key === key) {
        // CustomEvent da própria aplicação
        setStoredValue(e.detail.newValue ?? initialValue);
      }
    };

    // Listener para mudanças em outras abas
    window.addEventListener('storage', handleStorageChange as EventListener);

    // Listener para mudanças na mesma aba
    window.addEventListener('local-storage', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('local-storage', handleStorageChange as EventListener);
    };
  }, [key, initialValue, readValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook useSessionStorage
 *
 * Similar ao useLocalStorage, mas usa sessionStorage
 * (dados são perdidos ao fechar a aba/navegador)
 *
 * @param key - Chave do sessionStorage
 * @param initialValue - Valor inicial
 * @returns [value, setValue, removeValue]
 */
export const useSessionStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  // Função para ler o valor do sessionStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn('sessionStorage is not available in this environment');
        return;
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.sessionStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      console.warn('sessionStorage is not available in this environment');
      return;
    }

    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};
