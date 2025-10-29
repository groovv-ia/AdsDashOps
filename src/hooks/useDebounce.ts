import { useState, useEffect } from 'react';

/**
 * Hook useDebounce
 *
 * Retarda a atualização de um valor até que um tempo especificado
 * tenha passado sem mudanças. Útil para otimizar chamadas de API
 * em campos de busca, evitando requisições excessivas.
 *
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Valor debounced
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // Só executa após 500ms sem mudanças
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
export const useDebounce = <T>(value: T, delay = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Cria um timer que atualiza o valor debounced após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timer se o valor mudar antes do delay
    // Isso garante que só atualizamos após o usuário parar de digitar
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook useDebouncedCallback
 *
 * Retorna uma versão debounced de uma função callback.
 * A função só é executada após o delay especificado sem novas chamadas.
 *
 * @param callback - Função a ser debounced
 * @param delay - Delay em milissegundos
 * @returns Função debounced
 *
 * @example
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   searchAPI(term);
 * }, 500);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export const useDebouncedCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay = 500
): ((...args: Parameters<T>) => void) => {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpa o timeout quando o componente desmonta
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Cancela a chamada anterior se existir
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Agenda nova chamada
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
};
