/**
 * useWorkspacePeriod
 *
 * Hook para gerenciar e persistir o período de análise selecionado por workspace.
 * Lê/escreve na tabela `workspace_period_preferences` no Supabase.
 * Quando o workspace muda, recarrega automaticamente a preferência salva.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentWorkspace } from '../contexts/WorkspaceContext';
import { DEFAULT_PERIOD_PRESETS } from '../components/meta-admin/PeriodSelector';

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface DateRange {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export interface WorkspacePeriodState {
  /** ID do preset (ex: "last_7", "this_month") ou "custom" para período livre */
  selectedPeriod: string;
  /** Intervalo de datas efetivo */
  dateRange: DateRange;
  /** true enquanto carrega a preferência do Supabase */
  isLoading: boolean;
  /** Atualiza o período e salva no Supabase */
  setPeriod: (periodId: string, range: DateRange) => Promise<void>;
}

// ─── Valores padrão ───────────────────────────────────────────────────────────

const DEFAULT_PERIOD_ID = 'last_7';

function getDefaultRange(): DateRange {
  const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === DEFAULT_PERIOD_ID);
  return preset ? preset.getDateRange() : (() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo: to.toISOString().split('T')[0],
    };
  })();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkspacePeriod(): WorkspacePeriodState {
  const { currentWorkspace } = useCurrentWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;

  const [selectedPeriod, setSelectedPeriod] = useState<string>(DEFAULT_PERIOD_ID);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
  const [isLoading, setIsLoading] = useState(true);

  // Evita sobrescrever uma salva que ainda está em andamento
  const saveInProgress = useRef(false);

  /** Carrega a preferência do Supabase para o workspace atual */
  const loadPreference = useCallback(async (wsId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_period_preferences')
        .select('period_id, date_from, date_to')
        .eq('workspace_id', wsId)
        .maybeSingle();

      if (error) {
        // Tabela pode ainda não ter um registro — usa padrão silenciosamente
        return;
      }

      if (data) {
        setSelectedPeriod(data.period_id);
        setDateRange({ dateFrom: data.date_from, dateTo: data.date_to });
      } else {
        // Sem registro salvo: usa padrão
        setSelectedPeriod(DEFAULT_PERIOD_ID);
        setDateRange(getDefaultRange());
      }
    } catch {
      // Falha silenciosa: mantém padrão
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega sempre que o workspace mudar
  useEffect(() => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }
    loadPreference(workspaceId);
  }, [workspaceId, loadPreference]);

  /** Atualiza o período localmente e persiste no Supabase */
  const setPeriod = useCallback(
    async (periodId: string, range: DateRange) => {
      // Atualiza estado local imediatamente para UX responsiva
      setSelectedPeriod(periodId);
      setDateRange(range);

      if (!workspaceId || saveInProgress.current) return;

      saveInProgress.current = true;
      try {
        await supabase
          .from('workspace_period_preferences')
          .upsert(
            {
              workspace_id: workspaceId,
              period_id: periodId,
              date_from: range.dateFrom,
              date_to: range.dateTo,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'workspace_id' }
          );
      } catch {
        // Falha silenciosa: o estado local já foi atualizado
      } finally {
        saveInProgress.current = false;
      }
    },
    [workspaceId]
  );

  return { selectedPeriod, dateRange, isLoading, setPeriod };
}
