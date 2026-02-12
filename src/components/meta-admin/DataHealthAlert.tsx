/**
 * DataHealthAlert
 *
 * Componente que exibe alertas sobre a saude dos dados sincronizados.
 * Detecta automaticamente lacunas (gaps) nos dados e oferece
 * um botao para preencher as lacunas via backfill.
 *
 * Renderizado na pagina de detalhes da conta Meta Ads,
 * entre os filtros e os KPIs.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  detectGaps,
  getGapSummary,
  calculateBackfillDays,
  GapDetectionResult,
  DataGap,
} from '../../lib/services/MetaSyncGapDetector';

interface DataHealthAlertProps {
  /** ID do workspace atual */
  workspaceId: string;
  /** ID interno da conta de anuncios (UUID) */
  metaAdAccountId: string;
  /** Data inicio do periodo analisado */
  dateFrom: string;
  /** Data fim do periodo analisado */
  dateTo: string;
  /** Callback para disparar backfill com N dias */
  onBackfill: (daysBack: number) => void;
  /** Indica se uma sincronizacao esta em andamento */
  isSyncing: boolean;
}

export const DataHealthAlert: React.FC<DataHealthAlertProps> = ({
  workspaceId,
  metaAdAccountId,
  dateFrom,
  dateTo,
  onBackfill,
  isSyncing,
}) => {
  const [gapResult, setGapResult] = useState<GapDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Detecta gaps quando os parametros mudam
  useEffect(() => {
    if (!workspaceId || !metaAdAccountId || !dateFrom || !dateTo) return;

    let cancelled = false;

    const detect = async () => {
      setLoading(true);
      try {
        const result = await detectGaps(workspaceId, metaAdAccountId, dateFrom, dateTo);
        if (!cancelled) {
          setGapResult(result);
        }
      } catch {
        // Falha silenciosa - nao bloqueia a pagina
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    detect();

    return () => { cancelled = true; };
  }, [workspaceId, metaAdAccountId, dateFrom, dateTo]);

  // Nao exibe nada enquanto carrega ou se nao ha resultado
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-500">Verificando integridade dos dados...</span>
      </div>
    );
  }

  if (!gapResult) return null;

  // Se nao ha gaps, mostra indicador positivo
  if (gapResult.gaps.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-700">
          Dados completos para o periodo ({gapResult.coveragePercent}% de cobertura)
        </span>
      </div>
    );
  }

  // Calcula dias necessarios para backfill
  const backfillDays = calculateBackfillDays(gapResult.gaps);
  const summary = getGapSummary(gapResult.gaps);

  /**
   * Formata uma data YYYY-MM-DD para exibicao em pt-BR (ex: 23/Jan)
   */
  const formatGapDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00Z');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
      {/* Header do alerta */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 truncate">{summary}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Cobertura: {gapResult.coveragePercent}% ({gapResult.daysWithData} de {gapResult.totalDaysInPeriod} dias)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Botao de backfill */}
          <button
            onClick={() => onBackfill(backfillDays)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
              bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Preencher Lacunas
          </button>

          {/* Toggle para expandir detalhes */}
          {gapResult.gaps.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-100 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Detalhes expandidos dos gaps */}
      {expanded && gapResult.gaps.length > 0 && (
        <div className="px-4 pb-3 border-t border-amber-200">
          <p className="text-xs font-medium text-amber-700 mt-3 mb-2">Periodos sem dados:</p>
          <div className="space-y-1.5">
            {gapResult.gaps.map((gap: DataGap, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 rounded px-2.5 py-1.5"
              >
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {gap.days === 1
                    ? formatGapDate(gap.dateFrom)
                    : `${formatGapDate(gap.dateFrom)} a ${formatGapDate(gap.dateTo)}`}
                </span>
                <span className="text-amber-500">
                  ({gap.days} {gap.days === 1 ? 'dia' : 'dias'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
