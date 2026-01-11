/**
 * BatchSyncProgressModal
 *
 * Modal que exibe o progresso da sincronizacao em lote.
 * Mostra lista de contas com status individual e estatisticas em tempo real.
 */

import React, { useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  X,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/Button';

// Status possiveis para cada conta na sincronizacao em lote
export type BatchSyncStatus = 'pending' | 'syncing' | 'success' | 'error' | 'skipped';

// Resultado de sincronizacao de uma conta
export interface BatchSyncResult {
  accountId: string;
  accountName: string;
  status: BatchSyncStatus;
  error?: string;
  duration?: number;
  insightsSynced?: number;
  creativesSynced?: number;
}

// Estatisticas agregadas do batch sync
export interface BatchSyncStats {
  total: number;
  completed: number;
  success: number;
  failed: number;
  skipped: number;
  totalInsights: number;
  totalCreatives: number;
  startTime: number;
}

interface BatchSyncProgressModalProps {
  isOpen: boolean;
  results: BatchSyncResult[];
  stats: BatchSyncStats;
  isComplete: boolean;
  isCancelled: boolean;
  onCancel: () => void;
  onClose: () => void;
  onRetryFailed: () => void;
}

// Componente auxiliar para renderizar o icone de status
const StatusIcon: React.FC<{ status: BatchSyncStatus }> = ({ status }) => {
  switch (status) {
    case 'syncing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-gray-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

// Componente auxiliar para formatar duracao
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// Componente auxiliar para estimar tempo restante
const estimateTimeRemaining = (stats: BatchSyncStats, elapsedMs: number): string => {
  const { total, completed, skipped } = stats;
  const remaining = total - completed - skipped;

  if (remaining <= 0 || completed === 0) return '--';

  const avgTimePerAccount = elapsedMs / completed;
  const estimatedRemaining = avgTimePerAccount * remaining;

  return formatDuration(estimatedRemaining);
};

export const BatchSyncProgressModal: React.FC<BatchSyncProgressModalProps> = ({
  isOpen,
  results,
  stats,
  isComplete,
  isCancelled,
  onCancel,
  onClose,
  onRetryFailed,
}) => {
  // Estado para expandir/recolher erros
  const [showErrors, setShowErrors] = React.useState(true);

  // Calcula tempo decorrido
  const elapsedMs = useMemo(() => {
    return Date.now() - stats.startTime;
  }, [stats.startTime, stats.completed]);

  // Filtra resultados com erro
  const failedResults = useMemo(() => {
    return results.filter(r => r.status === 'error');
  }, [results]);

  // Calcula porcentagem de progresso
  const progressPercent = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.completed + stats.skipped) / stats.total) * 100);
  }, [stats]);

  // Se nao estiver aberto, nao renderiza
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - nao fecha ao clicar se sync estiver em andamento */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isComplete || isCancelled ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isComplete && stats.failed === 0
                ? 'bg-green-100 dark:bg-green-900/30'
                : isComplete && stats.failed > 0
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : isCancelled
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {isComplete && stats.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : isComplete && stats.failed > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : isCancelled ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isComplete
                  ? stats.failed === 0
                    ? 'Sincronizacao Concluida'
                    : 'Sincronizacao Concluida com Erros'
                  : isCancelled
                  ? 'Sincronizacao Cancelada'
                  : 'Sincronizando Contas...'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.completed + stats.skipped} de {stats.total} contas processadas
              </p>
            </div>
          </div>
          {(isComplete || isCancelled) && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progresso: {progressPercent}%
            </span>
            {!isComplete && !isCancelled && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Tempo restante: {estimateTimeRemaining(stats, elapsedMs)}
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete && stats.failed === 0
                  ? 'bg-green-500'
                  : isComplete && stats.failed > 0
                  ? 'bg-amber-500'
                  : isCancelled
                  ? 'bg-gray-400'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.success}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sucesso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.failed}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Erros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.skipped}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Puladas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalInsights.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Insights</div>
          </div>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[200px] max-h-[300px]">
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.accountId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.status === 'syncing'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : result.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : result.status === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={result.status} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {result.accountName}
                    </p>
                    {result.status === 'error' && result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 max-w-md truncate">
                        {result.error}
                      </p>
                    )}
                    {result.status === 'success' && result.insightsSynced !== undefined && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {result.insightsSynced.toLocaleString()} insights sincronizados
                      </p>
                    )}
                    {result.status === 'skipped' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Sincronizada recentemente
                      </p>
                    )}
                  </div>
                </div>
                {result.duration && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(result.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Summary (se houver erros) */}
        {isComplete && failedResults.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="flex items-center gap-2 w-full text-left"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {failedResults.length} conta{failedResults.length !== 1 ? 's' : ''} com erro
              </span>
              {showErrors ? (
                <ChevronUp className="w-4 h-4 text-red-600 dark:text-red-400 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-600 dark:text-red-400 ml-auto" />
              )}
            </button>
            {showErrors && (
              <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
                {failedResults.map((r) => (
                  <li key={r.accountId} className="truncate">
                    <strong>{r.accountName}:</strong> {r.error || 'Erro desconhecido'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {/* Tempo decorrido */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Tempo: {formatDuration(elapsedMs)}</span>
          </div>

          {/* Botoes de acao */}
          <div className="flex items-center gap-3">
            {!isComplete && !isCancelled && (
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
            {isComplete && stats.failed > 0 && (
              <Button
                variant="secondary"
                onClick={onRetryFailed}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Tentar Novamente ({stats.failed})
              </Button>
            )}
            {(isComplete || isCancelled) && (
              <Button
                variant="primary"
                onClick={onClose}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSyncProgressModal;
