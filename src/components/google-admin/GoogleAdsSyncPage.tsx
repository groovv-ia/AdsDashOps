/**
 * GoogleAdsSyncPage
 *
 * Pagina para gerenciar sincronizacao de dados do Google Ads.
 * Permite executar sincronizacao manual, ver progresso em tempo real
 * e consultar historico de sincronizacoes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  getGoogleSyncStatus,
  listGoogleAdAccounts,
} from '../../lib/services/GoogleSystemUserService';
import {
  createGoogleSyncService,
  runQuickSync,
} from '../../lib/services/GoogleSyncService';
import type {
  GoogleAdAccount,
  GoogleSyncJob,
  GoogleSyncStatusResponse,
  SyncProgressCallback,
} from '../../lib/connectors/google/types';
import { supabase } from '../../lib/supabase';

// Componente para renderizar o icone do Google Ads
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/google-ads-icon.svg" alt="Google Ads" className={className} />
);

// Interface para estado de progresso
interface SyncProgress {
  phase: string;
  percentage: number;
  itemsProcessed: number;
  itemsTotal: number;
  message: string;
}

export const GoogleAdsSyncPage: React.FC = () => {
  // Estado principal
  const [syncStatus, setSyncStatus] = useState<GoogleSyncStatusResponse | null>(null);
  const [accounts, setAccounts] = useState<GoogleAdAccount[]>([]);
  const [recentJobs, setRecentJobs] = useState<GoogleSyncJob[]>([]);

  // Estado de sincronizacao
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Estado do periodo
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showJobDetails, setShowJobDetails] = useState<string | null>(null);

  // Carrega dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Carrega status e contas
   */
  const loadData = async () => {
    setLoading(true);
    try {
      const [statusResult, accountsResult] = await Promise.all([
        getGoogleSyncStatus(),
        listGoogleAdAccounts(),
      ]);

      setSyncStatus(statusResult);
      setAccounts(accountsResult.accounts);
      setRecentJobs(statusResult.recent_jobs || []);

      // Seleciona contas marcadas como is_selected
      const selected = accountsResult.accounts
        .filter((acc) => acc.is_selected)
        .map((acc) => acc.id);
      setSelectedAccountIds(selected);
    } catch (err) {
      console.error('[GoogleSyncPage] Erro ao carregar dados:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Callback de progresso da sincronizacao
   */
  const handleProgress: SyncProgressCallback = useCallback((progressData) => {
    setProgress(progressData);
  }, []);

  /**
   * Inicia sincronizacao
   */
  const handleStartSync = async () => {
    if (selectedAccountIds.length === 0) {
      setError('Selecione pelo menos uma conta para sincronizar');
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);
    setProgress({
      phase: 'Iniciando sincronizacao...',
      percentage: 0,
      itemsProcessed: 0,
      itemsTotal: selectedAccountIds.length,
      message: 'Preparando...',
    });

    try {
      const service = await createGoogleSyncService();
      if (!service) {
        throw new Error('Servico de sincronizacao nao disponivel. Verifique a conexao.');
      }

      // Filtra contas selecionadas
      const selectedAccounts = accounts.filter((acc) =>
        selectedAccountIds.includes(acc.id)
      );

      // Executa sincronizacao
      const result = await service.syncAccounts(
        selectedAccounts,
        dateFrom,
        dateTo,
        handleProgress
      );

      if (result.success) {
        setSuccess(
          `Sincronizacao concluida! ${result.accounts_synced} conta(s), ` +
            `${result.campaigns_synced} campanha(s), ${result.metrics_synced} metrica(s). ` +
            `Duracao: ${Math.round(result.duration_ms / 1000)}s`
        );
      } else if (result.errors.length > 0) {
        setError(`Sincronizacao parcial: ${result.errors.join('; ')}`);
      }

      // Recarrega dados
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na sincronizacao');
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  /**
   * Sincronizacao rapida (ultimos 7 dias)
   */
  const handleQuickSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    setProgress({
      phase: 'Sincronizacao rapida...',
      percentage: 0,
      itemsProcessed: 0,
      itemsTotal: 1,
      message: 'Iniciando...',
    });

    try {
      const result = await runQuickSync(
        selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
        handleProgress
      );

      if (result.success) {
        setSuccess(
          `Sincronizacao rapida concluida! ${result.metrics_synced} metricas sincronizadas.`
        );
      } else if (result.errors.length > 0) {
        setError(`Erro: ${result.errors.join('; ')}`);
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na sincronizacao');
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  /**
   * Toggle selecao de conta
   */
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  /**
   * Seleciona/deseleciona todas as contas
   */
  const toggleSelectAll = () => {
    if (selectedAccountIds.length === accounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(accounts.map((acc) => acc.id));
    }
  };

  /**
   * Retorna estilo do badge de status do job
   */
  const getJobStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  /**
   * Retorna icone do status do job
   */
  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  /**
   * Retorna label do status
   */
  const getJobStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluido';
      case 'running':
        return 'Em execucao';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Loading inicial
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Verifica se tem conexao
  if (!syncStatus?.connection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg">
            <GoogleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Google Ads Sync</h2>
            <p className="text-gray-600">Sincronize dados do Google Ads</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Conexao nao configurada</h3>
              <p className="text-amber-700 mt-1">
                Configure a conexao com o Google Ads antes de sincronizar dados.
              </p>
              <p className="text-sm text-amber-600 mt-2">
                Acesse "Conexao Google" no menu lateral para configurar.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg">
            <GoogleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Google Ads Sync</h2>
            <p className="text-gray-600">Sincronize metricas das suas campanhas</p>
          </div>
        </div>

        <Button variant="outline" onClick={loadData} disabled={loading || syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status resumido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Contas</p>
              <p className="text-xl font-bold text-gray-900">
                {syncStatus.totals.ad_accounts}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Metricas</p>
              <p className="text-xl font-bold text-gray-900">
                {syncStatus.totals.total_insights_rows.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Jobs Pendentes</p>
              <p className="text-xl font-bold text-gray-900">
                {recentJobs.filter((j) => j.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Erros</p>
              <p className="text-xl font-bold text-gray-900">
                {syncStatus.totals.jobs_with_errors}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Painel de sincronizacao */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Sincronizacao</h3>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleQuickSync}
              disabled={syncing}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Rapido (7 dias)
            </Button>
          </div>
        </div>

        {/* Selecao de periodo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={syncing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={syncing}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleStartSync}
              disabled={syncing || selectedAccountIds.length === 0}
              className="w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Sincronizacao
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Barra de progresso */}
        {progress && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">{progress.phase}</span>
              <span className="text-sm text-blue-700">{progress.percentage}%</span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {progress.message} ({progress.itemsProcessed}/{progress.itemsTotal})
            </p>
          </div>
        )}

        {/* Mensagens */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Lista de contas para selecao */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Contas para sincronizar ({selectedAccountIds.length}/{accounts.length})
            </h4>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
              disabled={syncing}
            >
              {selectedAccountIds.length === accounts.length
                ? 'Desmarcar todas'
                : 'Selecionar todas'}
            </button>
          </div>

          <div className="space-y-2">
            {accounts.map((account) => (
              <label
                key={account.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAccountIds.includes(account.id)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                } ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedAccountIds.includes(account.id)}
                  onChange={() => toggleAccountSelection(account.id)}
                  disabled={syncing}
                  className="rounded border-gray-300 mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-500">
                    ID: {account.customer_id} | {account.currency_code}
                  </p>
                </div>
                {account.last_sync_at && (
                  <span className="text-xs text-gray-400">
                    Ultima sync: {new Date(account.last_sync_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Historico de Jobs */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Historico de Sincronizacoes</h3>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma sincronizacao realizada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setShowJobDetails(showJobDetails === job.id ? null : job.id)
                  }
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getJobStatusStyle(job.status)}`}
                    >
                      {getJobStatusIcon(job.status)}
                      <span className="ml-1">{getJobStatusLabel(job.status)}</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      {job.sync_type === 'full' ? 'Completa' : 'Incremental'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString('pt-BR')
                        : '-'}
                    </span>
                    {showJobDetails === job.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {showJobDetails === job.id && (
                  <div className="px-3 pb-3 pt-0 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Campanhas</p>
                        <p className="text-sm font-medium">{job.campaigns_synced}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ad Groups</p>
                        <p className="text-sm font-medium">{job.ad_groups_synced}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Anuncios</p>
                        <p className="text-sm font-medium">{job.ads_synced}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Metricas</p>
                        <p className="text-sm font-medium">{job.metrics_synced}</p>
                      </div>
                    </div>

                    {job.date_range_start && job.date_range_end && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">Periodo</p>
                        <p className="text-sm">
                          {new Date(job.date_range_start).toLocaleDateString('pt-BR')} -{' '}
                          {new Date(job.date_range_end).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    {job.error_message && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {job.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Sobre a sincronizacao</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>A sincronizacao busca metricas diarias (impressoes, cliques, custo, conversoes)</li>
              <li>Dados sao atualizados no nivel de campanha e grupo de anuncios</li>
              <li>Limite de 15.000 requisicoes por dia a API do Google Ads</li>
              <li>Recomendado sincronizar no maximo 30 dias por vez</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
