// Utilitario para combinar classes CSS condicionalmente
// Usa clsx para combinar classes e tailwind-merge para resolver conflitos do Tailwind

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Funcao cn - combina classes CSS de forma inteligente
// Resolve conflitos de classes Tailwind automaticamente
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
