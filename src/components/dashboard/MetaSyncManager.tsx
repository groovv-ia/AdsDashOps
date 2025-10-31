import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Check, AlertCircle, Loader, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { MetaAdsDataService } from '../../lib/services/MetaAdsDataService';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/utils/logger';
import { format, subDays } from 'date-fns';

/**
 * Interface para o status da sincronização
 */
interface SyncStatus {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  hasError: boolean;
  error?: string;
}

/**
 * Interface para estatísticas da sincronização
 */
interface SyncStats {
  accountsFound: number;
  campaignsFound: number;
  metricsImported: number;
  dateRange: string;
}

/**
 * Componente para sincronização manual de dados da Meta Ads
 * Permite ao usuário extrair e salvar dados no banco
 */
export const MetaSyncManager: React.FC = () => {
  // Estados
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [hasActiveConnection, setHasActiveConnection] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [dateRange, setDateRange] = useState(30); // Padrão: últimos 30 dias

  // Instância do serviço
  const metaService = new MetaAdsDataService();

  /**
   * Verifica se há conexão ativa ao carregar o componente
   */
  useEffect(() => {
    checkActiveConnection();
  }, []);

  /**
   * Verifica se o usuário tem token Meta ativo
   */
  const checkActiveConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const hasToken = await metaService.hasActiveToken(userData.user.id);
      setHasActiveConnection(hasToken);
    } catch (error) {
      logger.error('Error checking connection', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  /**
   * Atualiza o status da sincronização
   */
  const updateStatus = (
    step: string,
    progress: number,
    message: string,
    hasError: boolean = false,
    error?: string
  ) => {
    setSyncStatus({
      step,
      progress,
      message,
      isComplete: progress === 100,
      hasError,
      error,
    });
  };

  /**
   * Executa a sincronização completa
   */
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStats(null);

    try {
      // Busca usuário autenticado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const userId = userData.user.id;

      // Calcula range de datas
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      const dateStart = format(startDate, 'yyyy-MM-dd');
      const dateEnd = format(endDate, 'yyyy-MM-dd');

      logger.info('Starting Meta sync', { userId, dateStart, dateEnd });

      // Passo 1: Buscar contas publicitárias
      updateStatus('accounts', 20, 'Buscando contas publicitárias...');
      const accounts = await metaService.getAdAccounts(userId);

      if (accounts.length === 0) {
        throw new Error('Nenhuma conta publicitária encontrada');
      }

      logger.info('Accounts found', { count: accounts.length });

      let totalCampaigns = 0;
      let totalMetrics = 0;

      // Para cada conta, busca campanhas e métricas
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const accountProgress = 20 + ((i + 1) / accounts.length) * 30;

        // Passo 2: Buscar campanhas da conta
        updateStatus(
          'campaigns',
          accountProgress,
          `Buscando campanhas da conta ${account.name}...`
        );

        const campaigns = await metaService.getCampaigns(userId, account.id);
        totalCampaigns += campaigns.length;

        logger.info('Campaigns found', {
          accountId: account.id,
          count: campaigns.length,
        });

        // Salvar campanhas no banco
        if (campaigns.length > 0) {
          const campaignsToInsert = campaigns.map((campaign) => ({
            id: campaign.id,
            user_id: userId,
            name: campaign.name,
            platform: 'Meta',
            account_id: account.id,
            status: campaign.status,
            objective: campaign.objective,
            created_date: campaign.createdTime,
            start_date: campaign.startTime,
            end_date: campaign.stopTime,
            daily_budget: campaign.dailyBudget,
            lifetime_budget: campaign.lifetimeBudget,
            budget_remaining: campaign.budgetRemaining,
          }));

          await supabase.from('campaigns').upsert(campaignsToInsert, {
            onConflict: 'id',
          });
        }

        // Passo 3: Buscar métricas da conta
        updateStatus(
          'metrics',
          50 + ((i + 1) / accounts.length) * 40,
          `Buscando métricas da conta ${account.name}...`
        );

        const insights = await metaService.getAccountInsights(
          userId,
          account.id,
          dateStart,
          dateEnd
        );

        totalMetrics += insights.length;

        logger.info('Metrics found', {
          accountId: account.id,
          count: insights.length,
        });

        // Salvar métricas no banco
        if (insights.length > 0) {
          const metricsToInsert = insights.map((insight) => ({
            campaign_id: insight.campaignId,
            user_id: userId,
            date: insight.date,
            impressions: insight.impressions,
            clicks: insight.clicks,
            spend: insight.spend,
            reach: insight.reach,
            ctr: insight.ctr,
            cpc: insight.cpc,
            conversions: insight.conversions,
            cost_per_result: insight.conversions > 0 ? insight.spend / insight.conversions : 0,
            roas: insight.roas,
          }));

          await supabase.from('ad_metrics').upsert(metricsToInsert, {
            onConflict: 'campaign_id,date',
          });
        }
      }

      // Passo 4: Finalizado
      updateStatus('complete', 100, 'Sincronização concluída com sucesso!');

      setSyncStats({
        accountsFound: accounts.length,
        campaignsFound: totalCampaigns,
        metricsImported: totalMetrics,
        dateRange: `${dateStart} a ${dateEnd}`,
      });

      logger.info('Meta sync completed successfully', {
        accountsFound: accounts.length,
        campaignsFound: totalCampaigns,
        metricsImported: totalMetrics,
      });
    } catch (error: any) {
      logger.error('Meta sync failed', error);
      updateStatus(
        'error',
        0,
        'Erro na sincronização',
        true,
        error.message || 'Erro desconhecido'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Loading inicial
  if (isCheckingConnection) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Verificando conexão...</span>
        </div>
      </Card>
    );
  }

  // Sem conexão ativa
  if (!hasActiveConnection) {
    return (
      <Card className="p-6">
        <Alert variant="warning" icon={<AlertCircle className="w-5 h-5" />}>
          Você precisa conectar sua conta Meta Ads antes de sincronizar dados.
          Use o formulário acima para adicionar seu access token.
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sincronizar Dados da Meta
              </h3>
              <p className="text-sm text-gray-600">
                Importe campanhas e métricas das suas contas publicitárias
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de período */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 inline mr-2" />
            Período de dados
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            disabled={isSyncing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        {/* Botão de sincronização */}
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          variant="primary"
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Iniciar Sincronização
            </>
          )}
        </Button>

        {/* Status da sincronização */}
        {syncStatus && (
          <div className="space-y-3">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{syncStatus.message}</span>
                <span className="text-gray-500">{syncStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    syncStatus.hasError
                      ? 'bg-red-600'
                      : syncStatus.isComplete
                      ? 'bg-green-600'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${syncStatus.progress}%` }}
                />
              </div>
            </div>

            {/* Mensagem de erro */}
            {syncStatus.hasError && (
              <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
                {syncStatus.error}
              </Alert>
            )}

            {/* Mensagem de sucesso */}
            {syncStatus.isComplete && !syncStatus.hasError && (
              <Alert variant="success" icon={<Check className="w-5 h-5" />}>
                {syncStatus.message}
              </Alert>
            )}
          </div>
        )}

        {/* Estatísticas da sincronização */}
        {syncStats && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="text-sm text-gray-600">Contas</p>
              <p className="text-2xl font-bold text-green-700">{syncStats.accountsFound}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Campanhas</p>
              <p className="text-2xl font-bold text-green-700">{syncStats.campaignsFound}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Métricas importadas</p>
              <p className="text-2xl font-bold text-green-700">{syncStats.metricsImported}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Período: {syncStats.dateRange}</p>
            </div>
          </div>
        )}

        {/* Informações */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Dica:</strong> Execute a sincronização regularmente para manter seus dados
            atualizados. Recomendamos sincronizar diariamente para acompanhar o desempenho
            das suas campanhas.
          </p>
        </div>
      </div>
    </Card>
  );
};
