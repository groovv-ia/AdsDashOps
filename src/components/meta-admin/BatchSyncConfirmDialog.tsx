/**
 * BatchSyncConfirmDialog
 *
 * Modal de confirmacao antes de iniciar sincronizacao em lote.
 * Permite configurar opcoes como pular contas recentes e numero de syncs paralelos.
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Clock,
  Layers,
  Image,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';

// Configuracoes padrao para sincronizacao em lote
const DEFAULT_SKIP_HOURS = 6;
const DEFAULT_PARALLEL_LIMIT = 3;
const MIN_PARALLEL = 1;
const MAX_PARALLEL = 5;

// Interface para configuracoes de sincronizacao em lote
export interface BatchSyncConfig {
  skipRecentlySync: boolean;
  skipHours: number;
  syncCreatives: boolean;
  parallelLimit: number;
}

interface BatchSyncConfirmDialogProps {
  isOpen: boolean;
  totalAccounts: number;
  recentlySyncedCount: number;
  onConfirm: (config: BatchSyncConfig) => void;
  onCancel: () => void;
}

export const BatchSyncConfirmDialog: React.FC<BatchSyncConfirmDialogProps> = ({
  isOpen,
  totalAccounts,
  recentlySyncedCount,
  onConfirm,
  onCancel,
}) => {
  // Estado das configuracoes
  const [skipRecentlySync, setSkipRecentlySync] = useState(true);
  const [skipHours, setSkipHours] = useState(DEFAULT_SKIP_HOURS);
  const [syncCreatives, setSyncCreatives] = useState(false);
  const [parallelLimit, setParallelLimit] = useState(DEFAULT_PARALLEL_LIMIT);

  // Se nao estiver aberto, nao renderiza
  if (!isOpen) return null;

  // Calcula quantas contas serao sincronizadas
  const accountsToSync = skipRecentlySync
    ? totalAccounts - recentlySyncedCount
    : totalAccounts;

  // Handler para confirmar
  const handleConfirm = () => {
    onConfirm({
      skipRecentlySync,
      skipHours,
      syncCreatives,
      parallelLimit,
    });
  };

  // Handler para ajustar horas de skip
  const handleSkipHoursChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 72) {
      setSkipHours(num);
    }
  };

  // Handler para ajustar limite paralelo
  const handleParallelChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= MIN_PARALLEL && num <= MAX_PARALLEL) {
      setParallelLimit(num);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sincronizar Todas as Contas
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Info sobre contas */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{totalAccounts}</strong> conta{totalAccounts !== 1 ? 's' : ''} encontrada{totalAccounts !== 1 ? 's' : ''} no total.
              {recentlySyncedCount > 0 && (
                <span className="block mt-1">
                  <strong>{recentlySyncedCount}</strong> sincronizada{recentlySyncedCount !== 1 ? 's' : ''} recentemente.
                </span>
              )}
            </p>
          </div>

          {/* Opcao: Pular contas recentes */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={skipRecentlySync}
                onChange={(e) => setSkipRecentlySync(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pular contas sincronizadas recentemente
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ignora contas que ja foram sincronizadas nas ultimas horas
                </p>
              </div>
            </label>

            {/* Input de horas */}
            {skipRecentlySync && (
              <div className="ml-7 flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pular se sincronizada nas ultimas
                </span>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={skipHours}
                  onChange={(e) => handleSkipHoursChange(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  hora{skipHours !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Opcao: Sincronizar criativos */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={syncCreatives}
              onChange={(e) => setSyncCreatives(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sincronizar criativos (imagens/videos)
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Baixa os criativos dos anuncios (aumenta o tempo de sync)
              </p>
            </div>
          </label>

          {/* Opcao: Syncs paralelos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sincronizacoes paralelas
              </span>
            </div>
            <div className="flex items-center gap-3 ml-6">
              <input
                type="range"
                min={MIN_PARALLEL}
                max={MAX_PARALLEL}
                value={parallelLimit}
                onChange={(e) => handleParallelChange(e.target.value)}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="w-8 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                {parallelLimit}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Mais paralelas = mais rapido, porem maior uso de API
            </p>
          </div>

          {/* Aviso se muitas contas */}
          {accountsToSync > 10 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Sincronizar muitas contas pode levar varios minutos. Voce pode cancelar a qualquer momento.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{accountsToSync}</strong> conta{accountsToSync !== 1 ? 's' : ''} sera{accountsToSync !== 1 ? 'o' : ''} sincronizada{accountsToSync !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={accountsToSync === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Iniciar Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSyncConfirmDialog;
