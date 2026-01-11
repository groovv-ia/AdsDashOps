/**
 * BatchSyncProgressModal
 *
 * Modal que exibe o progresso da sincronizacao em lote.
 * Mostra lista de contas com status individual e estatisticas em tempo real.
 * Estilizado com o design system da plataforma AdsOPS.
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
  Sparkles,
  TrendingUp,
  Database,
  Image,
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

// Componente auxiliar para renderizar o icone de status com animacoes
const StatusIcon: React.FC<{ status: BatchSyncStatus }> = ({ status }) => {
  switch (status) {
    case 'syncing':
      return (
        <div className="relative">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-blue-400 animate-ping opacity-30" />
        </div>
      );
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'skipped':
      return <SkipForward className="w-5 h-5 text-gray-400" />;
    default:
      return <Clock className="w-5 h-5 text-gray-300" />;
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

  // Determina o estado visual baseado no progresso
  const getHeaderGradient = () => {
    if (isComplete && stats.failed === 0) {
      return 'from-emerald-600 via-teal-600 to-cyan-600';
    }
    if (isComplete && stats.failed > 0) {
      return 'from-amber-500 via-orange-500 to-red-500';
    }
    if (isCancelled) {
      return 'from-gray-500 via-gray-600 to-gray-700';
    }
    return 'from-purple-600 via-purple-500 to-blue-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - nao fecha ao clicar se sync estiver em andamento */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={isComplete || isCancelled ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50">
        {/* Header com gradiente dinamico */}
        <div className={`relative px-6 py-5 bg-gradient-to-r ${getHeaderGradient()}`}>
          {/* Pattern de fundo decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl backdrop-blur-sm ${
                isComplete && stats.failed === 0
                  ? 'bg-white/30'
                  : isComplete && stats.failed > 0
                  ? 'bg-white/20'
                  : isCancelled
                  ? 'bg-white/15'
                  : 'bg-white/20'
              }`}>
                {isComplete && stats.failed === 0 ? (
                  <Sparkles className="w-6 h-6 text-white" />
                ) : isComplete && stats.failed > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-white" />
                ) : isCancelled ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isComplete
                    ? stats.failed === 0
                      ? 'Sincronizacao Concluida!'
                      : 'Sincronizacao com Erros'
                    : isCancelled
                    ? 'Sincronizacao Cancelada'
                    : 'Sincronizando Contas...'}
                </h2>
                <p className="text-sm text-white/80">
                  {stats.completed + stats.skipped} de {stats.total} contas processadas
                </p>
              </div>
            </div>
            {(isComplete || isCancelled) && (
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar com animacao */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                Progresso: {progressPercent}%
              </span>
            </div>
            {!isComplete && !isCancelled && (
              <span className="text-sm text-gray-500">
                Tempo restante: <span className="font-medium text-gray-700">{estimateTimeRemaining(stats, elapsedMs)}</span>
              </span>
            )}
          </div>
          <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out relative ${
                isComplete && stats.failed === 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : isComplete && stats.failed > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : isCancelled
                  ? 'bg-gray-400'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            >
              {/* Efeito de brilho animado */}
              {!isComplete && !isCancelled && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Design melhorado */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-200/50">
          {/* Sucesso */}
          <div className="relative overflow-hidden p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50">
            <CheckCircle2 className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-100" />
            <div className="relative">
              <div className="text-2xl font-bold text-emerald-600">
                {stats.success}
              </div>
              <div className="text-xs font-medium text-emerald-700">Sucesso</div>
            </div>
          </div>

          {/* Erros */}
          <div className="relative overflow-hidden p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200/50">
            <XCircle className="absolute -right-2 -bottom-2 w-12 h-12 text-red-100" />
            <div className="relative">
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <div className="text-xs font-medium text-red-700">Erros</div>
            </div>
          </div>

          {/* Puladas */}
          <div className="relative overflow-hidden p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200/50">
            <SkipForward className="absolute -right-2 -bottom-2 w-12 h-12 text-gray-100" />
            <div className="relative">
              <div className="text-2xl font-bold text-gray-600">
                {stats.skipped}
              </div>
              <div className="text-xs font-medium text-gray-700">Puladas</div>
            </div>
          </div>

          {/* Insights */}
          <div className="relative overflow-hidden p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200/50">
            <Database className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-100" />
            <div className="relative">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalInsights.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-blue-700">Insights</div>
            </div>
          </div>
        </div>

        {/* Account List - Design melhorado */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px] max-h-[300px] bg-gray-50/50">
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.accountId}
                className={`
                  flex items-center justify-between p-4 rounded-xl transition-all duration-300
                  ${result.status === 'syncing'
                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg shadow-blue-500/10'
                    : result.status === 'error'
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
                    : result.status === 'success'
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                    : result.status === 'skipped'
                    ? 'bg-gray-100 border border-gray-200'
                    : 'bg-white border border-gray-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={result.status} />
                  <div>
                    <p className={`text-sm font-medium ${
                      result.status === 'syncing' ? 'text-blue-900' :
                      result.status === 'success' ? 'text-emerald-900' :
                      result.status === 'error' ? 'text-red-900' :
                      'text-gray-900'
                    }`}>
                      {result.accountName}
                    </p>
                    {result.status === 'error' && result.error && (
                      <p className="text-xs text-red-600 mt-0.5 max-w-md truncate">
                        {result.error}
                      </p>
                    )}
                    {result.status === 'success' && (
                      <div className="flex items-center gap-3 mt-0.5">
                        {result.insightsSynced !== undefined && (
                          <span className="text-xs text-emerald-700 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {result.insightsSynced.toLocaleString()} insights
                          </span>
                        )}
                        {result.creativesSynced !== undefined && result.creativesSynced > 0 && (
                          <span className="text-xs text-teal-700 flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            {result.creativesSynced} criativos
                          </span>
                        )}
                      </div>
                    )}
                    {result.status === 'skipped' && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sincronizada recentemente
                      </p>
                    )}
                    {result.status === 'syncing' && (
                      <p className="text-xs text-blue-600 mt-0.5 animate-pulse">
                        Processando dados...
                      </p>
                    )}
                  </div>
                </div>
                {result.duration && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-lg">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">
                      {formatDuration(result.duration)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Summary (se houver erros) */}
        {isComplete && failedResults.length > 0 && (
          <div className="px-6 py-3 border-t border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-sm font-semibold text-red-800">
                {failedResults.length} conta{failedResults.length !== 1 ? 's' : ''} com erro
              </span>
              {showErrors ? (
                <ChevronUp className="w-4 h-4 text-red-600 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-600 ml-auto" />
              )}
            </button>
            {showErrors && (
              <ul className="mt-3 space-y-2">
                {failedResults.map((r) => (
                  <li key={r.accountId} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-red-800 block truncate">{r.accountName}</span>
                      <span className="text-xs text-red-600 block truncate">{r.error || 'Erro desconhecido'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200/50 flex items-center justify-between">
          {/* Tempo decorrido */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {formatDuration(elapsedMs)}
            </span>
          </div>

          {/* Botoes de acao */}
          <div className="flex items-center gap-3">
            {!isComplete && !isCancelled && (
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-medium text-sm transition-all duration-200"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
            {isComplete && stats.failed > 0 && (
              <button
                onClick={onRetryFailed}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente ({stats.failed})
              </button>
            )}
            {(isComplete || isCancelled) && (
              <button
                onClick={onClose}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                  transition-all duration-200 shadow-lg
                  ${isComplete && stats.failed === 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-xl hover:scale-105'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/25 hover:shadow-xl hover:scale-105'
                  }
                `}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isComplete && stats.failed === 0 ? 'Concluido' : 'Fechar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSyncProgressModal;
