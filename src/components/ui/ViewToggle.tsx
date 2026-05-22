/**
 * ViewToggle
 *
 * Botao de alternancia entre dois modos de visualizacao:
 * - "cards": exibe cards de KPI + tabela (visualizacao classica)
 * - "chart": exibe grafico de linhas estilo Google Ads
 *
 * A preferencia e persistida no localStorage com uma chave unica por contexto,
 * para que o usuario nao precise reconfigurar ao voltar para a pagina.
 */

import React, { useEffect } from 'react';
import { LayoutDashboard, LineChart } from 'lucide-react';

export type ViewMode = 'cards' | 'chart';

interface ViewToggleProps {
  /** Modo atual */
  mode: ViewMode;
  /** Callback chamado ao trocar de modo */
  onChange: (mode: ViewMode) => void;
  /** Tamanho opcional — padrao 'md' */
  size?: 'sm' | 'md';
}

/**
 * Hook auxiliar que inicializa e persiste o modo de visualizacao no localStorage.
 *
 * @param storageKey - Chave unica por contexto (ex: 'view_mode_campaign')
 * @param defaultMode - Modo padrao se nao houver valor salvo
 */
export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'cards'
): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setModeState] = React.useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return (saved === 'cards' || saved === 'chart') ? saved : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const setMode = React.useCallback((newMode: ViewMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch {
      // localStorage pode estar indisponivel em alguns contextos
    }
  }, [storageKey]);

  return [mode, setMode];
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange, size = 'md' }) => {
  const isSmall = size === 'sm';

  const btnBase = `
    flex items-center gap-1.5 font-medium transition-all duration-150
    ${isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}
  `.trim();

  const activeClass = 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200';
  const inactiveClass = 'text-gray-500 hover:text-gray-700';

  return (
    <div
      className={`
        inline-flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5
        ${isSmall ? 'h-8' : 'h-9'}
      `}
      role="group"
      aria-label="Alternar visualizacao"
    >
      {/* Modo: Cards + Tabela */}
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`${btnBase} rounded-md ${mode === 'cards' ? activeClass : inactiveClass}`}
        aria-pressed={mode === 'cards'}
        title="Visualizacao em cards e tabela"
      >
        <LayoutDashboard className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span className={isSmall ? 'hidden sm:inline' : ''}>Cards</span>
      </button>

      {/* Modo: Grafico */}
      <button
        type="button"
        onClick={() => onChange('chart')}
        className={`${btnBase} rounded-md ${mode === 'chart' ? activeClass : inactiveClass}`}
        aria-pressed={mode === 'chart'}
        title="Visualizacao em grafico de linhas"
      >
        <LineChart className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span className={isSmall ? 'hidden sm:inline' : ''}>Grafico</span>
      </button>
    </div>
  );
};
