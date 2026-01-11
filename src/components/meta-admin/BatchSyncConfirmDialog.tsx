/**
 * BatchSyncConfirmDialog
 *
 * Modal de confirmacao antes de iniciar sincronizacao em lote.
 * Permite configurar opcoes como pular contas recentes e numero de syncs paralelos.
 * Estilizado com o design system da plataforma AdsOPS.
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Clock,
  Layers,
  Image,
  AlertTriangle,
  X,
  Zap,
  CheckCircle2,
  Info,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop com blur */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200/50">
        {/* Header com gradiente */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500">
          {/* Pattern de fundo decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo pequeno */}
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Sincronizacao em Lote
                </h2>
                <p className="text-sm text-white/80">
                  Sincronize todas as contas de uma vez
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Card de resumo */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {totalAccounts} conta{totalAccounts !== 1 ? 's' : ''} encontrada{totalAccounts !== 1 ? 's' : ''}
                </p>
                {recentlySyncedCount > 0 && (
                  <p className="text-sm text-blue-700 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                    {recentlySyncedCount} ja sincronizada{recentlySyncedCount !== 1 ? 's' : ''} recentemente
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Opcao: Pular contas recentes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all duration-200 group">
              <input
                type="checkbox"
                checked={skipRecentlySync}
                onChange={(e) => setSkipRecentlySync(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-medium text-gray-800">
                    Pular contas sincronizadas recentemente
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Economiza tempo ignorando contas ja atualizadas
                </p>
              </div>
            </label>

            {/* Input de horas - animado */}
            <div className={`ml-8 overflow-hidden transition-all duration-300 ${skipRecentlySync ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">
                  Pular se sincronizada nas ultimas
                </span>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={skipHours}
                  onChange={(e) => handleSkipHoursChange(e.target.value)}
                  className="w-16 px-2.5 py-1.5 text-sm font-medium text-center border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="text-sm text-gray-600">
                  hora{skipHours !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Opcao: Sincronizar criativos */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer transition-all duration-200 group">
            <input
              type="checkbox"
              checked={syncCreatives}
              onChange={(e) => setSyncCreatives(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-500 group-hover:text-teal-500 transition-colors" />
                <span className="text-sm font-medium text-gray-800">
                  Sincronizar criativos (imagens/videos)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Baixa os criativos dos anuncios (aumenta o tempo de sync)
              </p>
            </div>
          </label>

          {/* Opcao: Syncs paralelos */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-cyan-100 rounded-lg">
                <Zap className="w-4 h-4 text-cyan-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">
                Velocidade de Sincronizacao
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 w-12">Lento</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={MIN_PARALLEL}
                    max={MAX_PARALLEL}
                    value={parallelLimit}
                    onChange={(e) => handleParallelChange(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                  {/* Marcadores */}
                  <div className="flex justify-between mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`w-1 h-1 rounded-full ${n <= parallelLimit ? 'bg-cyan-500' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">Rapido</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {parallelLimit} sincronizacao{parallelLimit !== 1 ? 'es' : ''} paralela{parallelLimit !== 1 ? 's' : ''}
                </span>
                <span className={`font-medium ${parallelLimit >= 4 ? 'text-amber-600' : 'text-cyan-600'}`}>
                  {parallelLimit === 1 && 'Conservador'}
                  {parallelLimit === 2 && 'Moderado'}
                  {parallelLimit === 3 && 'Balanceado'}
                  {parallelLimit === 4 && 'Agressivo'}
                  {parallelLimit === 5 && 'Maximo'}
                </span>
              </div>
            </div>
          </div>

          {/* Aviso se muitas contas */}
          {accountsToSync > 10 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Sincronizar <strong>{accountsToSync}</strong> contas pode levar varios minutos.
                Voce pode cancelar a qualquer momento.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${accountsToSync > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
            <p className="text-sm font-medium text-gray-700">
              {accountsToSync} conta{accountsToSync !== 1 ? 's' : ''} para sincronizar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <button
              onClick={handleConfirm}
              disabled={accountsToSync === 0}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                transition-all duration-200 shadow-lg shadow-blue-500/25
                ${accountsToSync === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95'
                }
              `}
            >
              <RefreshCw className="w-4 h-4" />
              Iniciar Sincronizacao
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSyncConfirmDialog;
