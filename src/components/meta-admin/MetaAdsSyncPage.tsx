/**
 * MetaAdsSyncPage
 *
 * Pagina principal de sincronizacao Meta Ads redesenhada.
 * Layout com cards de contas, navegacao drill-down e visualizacao de metricas.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  ArrowLeft,
  Download,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdAccountCard, AdAccountData } from './AdAccountCard';
import { BreadcrumbNav, BreadcrumbItem, NavigationState, createBreadcrumbItems } from './BreadcrumbNav';
import { PeriodSelector, PeriodButtons, DEFAULT_PERIOD_PRESETS } from './PeriodSelector';
import { SyncStatusBadge, SyncStatus } from './SyncStatusBadge';
import {
  runMetaSync,
  getMetaSyncStatus,
  getInsightsFromDatabase,
  getAdInsightsByAdset,
  SyncStatusResponse,
  SyncResult,
} from '../../lib/services/MetaSystemUserService';
import { useClient } from '../../contexts/ClientContext';
import { AdDetailModal } from '../ad-analysis';
import type { AdDetailModalState } from '../../types/adAnalysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ============================================================
// TIPOS
// ============================================================

interface InsightRow {
  id: string;
  level: string;
  entity_id: string;
  entity_name: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  // Campos de conversao para ROAS
  leads?: number;
  conversions?: number;
  conversion_value?: number;
  purchase_value?: number;
}

interface KPIs {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  // Metricas de conversao
  totalLeads: number;
  totalConversions: number;
  totalConversionValue: number;
  roas: number;
}

// Niveis de entidade disponiveis
const LEVELS = [
  { label: 'Campanhas', value: 'campaign' },
  { label: 'Conjuntos', value: 'adset' },
  { label: 'Anuncios', value: 'ad' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const MetaAdsSyncPage: React.FC = () => {
  const { selectedClient } = useClient();

  // Estado de navegacao (suporta drill-down: Contas > Conta > Adset > Anuncios)
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentView: 'accounts',
    selectedAccountId: null,
    selectedAccountName: null,
    selectedCampaignId: null,
    selectedCampaignName: null,
    selectedAdsetId: null,
    selectedAdsetName: null,
  });

  // Estado de sincronizacao
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);

  // Estado de dados
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    avgCtr: 0,
    avgCpc: 0,
    avgCpm: 0,
    totalLeads: 0,
    totalConversions: 0,
    totalConversionValue: 0,
    roas: 0,
  });

  // Filtros
  const [selectedLevel, setSelectedLevel] = useState<string>('campaign');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_7');
  const [dateRange, setDateRange] = useState<{ dateFrom: string; dateTo: string }>(() => {
    const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === 'last_7');
    return preset ? preset.getDateRange() : { dateFrom: '', dateTo: '' };
  });

  // Mensagens
  const [error, setError] = useState<string | null>(null);

  // Estado do modal de detalhes do anuncio
  const [adDetailModal, setAdDetailModal] = useState<AdDetailModalState>({
    isOpen: false,
    adData: null,
  });

  // ============================================================
  // EFEITOS
  // ============================================================

  // Carrega status inicial
  useEffect(() => {
    loadStatus();
  }, [selectedClient]);

  // Carrega dados quando filtros mudam e ha conta selecionada
  useEffect(() => {
    if (
      syncStatus?.connection?.status === 'connected' &&
      navigationState.selectedAccountId &&
      (navigationState.currentView === 'account-detail' || navigationState.currentView === 'adset-detail')
    ) {
      loadInsights();
    }
  }, [selectedLevel, selectedPeriod, navigationState.selectedAccountId, navigationState.currentView, navigationState.selectedAdsetId]);

  // Simula progresso da sincronizacao de forma realista
  useEffect(() => {
    if (!syncingAccountId) {
      setSyncProgress(0);
      return;
    }

    // Inicia progresso
    setSyncProgress(5);
    let currentProgress = 5;

    // Simula progresso com velocidade variavel
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15; // Incremento aleatorio entre 0-15%

      // Nao ultrapassa 95% antes de concluir
      if (currentProgress > 95) {
        currentProgress = 95;
      }

      setSyncProgress(Math.floor(currentProgress));
    }, 800); // Atualiza a cada 800ms

    return () => clearInterval(interval);
  }, [syncingAccountId]);

  // ============================================================
  // FUNCOES DE CARREGAMENTO
  // ============================================================

  const loadStatus = async () => {
    setLoading(true);
    try {
      const status = await getMetaSyncStatus(selectedClient?.id);
      setSyncStatus(status);
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Encontra os dados da conta pelo UUID interno
  const getAccountById = useCallback(
    (accountId: string) => {
      return syncStatus?.ad_accounts.find((acc) => acc.id === accountId);
    },
    [syncStatus]
  );

  // Carrega insights do banco de dados
  // Se estiver na view adset-detail, busca apenas anuncios do adset selecionado
  const loadInsights = async () => {
    if (!navigationState.selectedAccountId) return;

    try {
      let result;

      // Se estiver visualizando anuncios de um adset especifico
      if (navigationState.currentView === 'adset-detail' && navigationState.selectedAdsetId) {
        result = await getAdInsightsByAdset({
          clientId: selectedClient?.id,
          metaAdAccountId: navigationState.selectedAccountId,
          adsetId: navigationState.selectedAdsetId,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
          limit: 1000,
        });
      } else {
        // Busca normal por nivel
        result = await getInsightsFromDatabase({
          clientId: selectedClient?.id,
          metaAdAccountId: navigationState.selectedAccountId,
          level: selectedLevel,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
          limit: 1000,
        });
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      setInsights(result.data);
      calculateKPIs(result.data);
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    }
  };

  // Calcula KPIs a partir dos dados
  const calculateKPIs = (data: InsightRow[]) => {
    if (data.length === 0) {
      setKpis({
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalReach: 0,
        avgCtr: 0,
        avgCpc: 0,
        avgCpm: 0,
        totalLeads: 0,
        totalConversions: 0,
        totalConversionValue: 0,
        roas: 0,
      });
      return;
    }

    const totals = data.reduce(
      (acc, row) => ({
        spend: acc.spend + (row.spend || 0),
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
        reach: acc.reach + (row.reach || 0),
        leads: acc.leads + (row.leads || 0),
        conversions: acc.conversions + (row.conversions || 0),
        conversionValue: acc.conversionValue + (row.conversion_value || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, conversions: 0, conversionValue: 0 }
    );

    // Calcula ROAS: receita / gasto
    const roas = totals.spend > 0 ? totals.conversionValue / totals.spend : 0;

    setKpis({
      totalSpend: totals.spend,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalReach: totals.reach,
      avgCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      avgCpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
      totalLeads: totals.leads,
      totalConversions: totals.conversions,
      totalConversionValue: totals.conversionValue,
      roas: roas,
    });
  };

  // ============================================================
  // FUNCOES DE SINCRONIZACAO
  // ============================================================

  // Sincroniza uma conta especifica
  const handleSyncAccount = async (accountId: string) => {
    const account = getAccountById(accountId);
    if (!account) return;

    setSyncingAccountId(accountId);
    setError(null);
    setSyncResult(null);

    let syncSuccessful = false;

    try {
      const preset = DEFAULT_PERIOD_PRESETS.find((p) => p.id === selectedPeriod);
      const daysBack = preset?.days === -1 || preset?.days === -2 ? 30 : Math.max(preset?.days || 7, 1);

      const result = await runMetaSync({
        mode: selectedPeriod === 'today' ? 'intraday' : 'backfill',
        clientId: selectedClient?.id,
        metaAdAccountId: account.meta_id,
        daysBack,
        levels: ['campaign', 'adset', 'ad'],
      });

      // Completa o progresso ao finalizar
      setSyncProgress(100);

      setSyncResult(result);

      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
      } else {
        // Marca sincronização como bem-sucedida se não houver erros
        syncSuccessful = true;
      }

      // Recarrega dados
      await loadStatus();
      if (navigationState.selectedAccountId === accountId) {
        await loadInsights();
      }

      // Se sincronização foi bem-sucedida, aguarda 2 segundos e navega automaticamente
      if (syncSuccessful) {
        setTimeout(() => {
          // Navega para os detalhes da conta
          handleSelectAccount(accountId);
          // Limpa estado de sincronização
          setSyncingAccountId(null);
          setSyncProgress(0);
        }, 2000);
      } else {
        // Se houve erro, apenas limpa o estado após 1 segundo
        setTimeout(() => {
          setSyncingAccountId(null);
          setSyncProgress(0);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
      // Em caso de erro, limpa estado após 1 segundo
      setTimeout(() => {
        setSyncingAccountId(null);
        setSyncProgress(0);
      }, 1000);
    }
  };

  // Sincroniza todas as contas
  const handleSyncAll = async () => {
    if (!syncStatus?.ad_accounts.length) return;

    setSyncing(true);
    setError(null);

    try {
      for (const account of syncStatus.ad_accounts) {
        setSyncingAccountId(account.id);
        await handleSyncAccount(account.id);
      }
    } finally {
      setSyncing(false);
      setSyncingAccountId(null);
    }
  };

  // ============================================================
  // FUNCOES DE NAVEGACAO
  // ============================================================

  // Seleciona uma conta e navega para detalhes
  const handleSelectAccount = (accountId: string) => {
    const account = getAccountById(accountId);
    if (!account) return;

    setNavigationState({
      currentView: 'account-detail',
      selectedAccountId: accountId,
      selectedAccountName: account.name,
      selectedCampaignId: null,
      selectedCampaignName: null,
      selectedAdsetId: null,
      selectedAdsetName: null,
    });
  };

  // Seleciona um adset e navega para ver os anuncios dentro dele
  const handleSelectAdset = (adsetId: string, adsetName: string) => {
    setNavigationState((prev) => ({
      ...prev,
      currentView: 'adset-detail',
      selectedAdsetId: adsetId,
      selectedAdsetName: adsetName,
    }));
  };

  // Navega via breadcrumb
  const handleBreadcrumbNavigate = (item: BreadcrumbItem) => {
    if (item.type === 'home') {
      // Volta para lista de contas
      setNavigationState({
        currentView: 'accounts',
        selectedAccountId: null,
        selectedAccountName: null,
        selectedCampaignId: null,
        selectedCampaignName: null,
        selectedAdsetId: null,
        selectedAdsetName: null,
      });
      setInsights([]);
    } else if (item.type === 'account') {
      // Volta para detalhes da conta (sai da visualizacao de adset)
      setNavigationState((prev) => ({
        ...prev,
        currentView: 'account-detail',
        selectedAdsetId: null,
        selectedAdsetName: null,
      }));
      setSelectedLevel('adset');
    }
  };

  // Volta para lista de contas
  const handleBackToAccounts = () => {
    setNavigationState({
      currentView: 'accounts',
      selectedAccountId: null,
      selectedAccountName: null,
      selectedCampaignId: null,
      selectedCampaignName: null,
      selectedAdsetId: null,
      selectedAdsetName: null,
    });
    setInsights([]);
    setSyncResult(null);
    setError(null);
  };

  // Volta para visualizacao de adsets (sai da visualizacao de anuncios do adset)
  const handleBackToAdsets = () => {
    setNavigationState((prev) => ({
      ...prev,
      currentView: 'account-detail',
      selectedAdsetId: null,
      selectedAdsetName: null,
    }));
    setSelectedLevel('adset');
  };

  // Handler de mudanca de periodo
  const handlePeriodChange = (periodId: string, newDateRange: { dateFrom: string; dateTo: string }) => {
    setSelectedPeriod(periodId);
    setDateRange(newDateRange);
  };

  // ============================================================
  // FUNCOES DO MODAL DE DETALHES DO ANUNCIO
  // ============================================================

  // Abre o modal de detalhes do anuncio
  // Passa o meta_id (formato act_XXXXX) para as Edge Functions e o ID interno para consultas no banco
  // Funciona tanto na visualizacao geral de ads quanto dentro de um adset especifico
  const handleOpenAdDetail = (row: { entity_id: string; entity_name: string }) => {
    // Permite abrir detalhes quando estiver em nivel de ads OU dentro de um adset (adset-detail)
    const isAdLevel = selectedLevel === 'ad';
    const isAdsetDetail = navigationState.currentView === 'adset-detail';

    if (!isAdLevel && !isAdsetDetail) return;

    // Busca a conta selecionada para obter o meta_id correto
    const account = getAccountById(navigationState.selectedAccountId || '');

    setAdDetailModal({
      isOpen: true,
      adData: {
        ad_id: row.entity_id,
        entity_name: row.entity_name,
        // Usa o meta_id (formato act_XXXXX) para chamadas a Edge Functions do Meta
        meta_ad_account_id: account?.meta_id || '',
        // Guarda o ID interno para consultas no banco de dados local
        meta_ad_account_internal_id: navigationState.selectedAccountId || undefined,
        campaign_name: navigationState.selectedCampaignName || undefined,
      },
    });
  };

  // Fecha o modal de detalhes do anuncio
  const handleCloseAdDetail = () => {
    setAdDetailModal({
      isOpen: false,
      adData: null,
    });
  };

  // ============================================================
  // DADOS DERIVADOS
  // ============================================================

  // Transforma contas em formato para os cards
  const accountCards: AdAccountData[] = useMemo(() => {
    if (!syncStatus?.ad_accounts) return [];

    return syncStatus.ad_accounts.map((acc) => {
      // Determina status de sincronizacao
      let syncStatusValue: SyncStatus = 'never';
      if (acc.last_sync_at) {
        const lastSync = new Date(acc.last_sync_at);
        const hoursSince = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        syncStatusValue = hoursSince < 24 ? 'synced' : 'stale';
      }

      // Usa duracao real da ultima sincronizacao do banco de dados
      const lastSyncDuration = acc.last_sync_duration || undefined;

      // Progresso da sincronizacao (0-100) - apenas quando esta sincronizando
      const accountSyncProgress = syncingAccountId === acc.id ? syncProgress : undefined;

      return {
        id: acc.id,
        metaId: acc.meta_id,
        name: acc.name,
        currency: acc.currency,
        timezone: acc.timezone,
        status: acc.status,
        lastSyncAt: acc.last_sync_at,
        lastSyncDuration,
        syncStatus: syncingAccountId === acc.id ? 'syncing' : syncStatusValue,
        syncProgress: accountSyncProgress,
        metrics: acc.metrics || undefined,
      };
    });
  }, [syncStatus, syncingAccountId, syncProgress]);

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => createBreadcrumbItems(navigationState), [navigationState]);

  // Dados para graficos
  const chartData = useMemo(() => {
    const grouped = insights.reduce(
      (acc, row) => {
        const date = row.date;
        if (!acc[date]) {
          acc[date] = { date, spend: 0, impressions: 0, clicks: 0 };
        }
        acc[date].spend += row.spend || 0;
        acc[date].impressions += row.impressions || 0;
        acc[date].clicks += row.clicks || 0;
        return acc;
      },
      {} as Record<string, { date: string; spend: number; impressions: number; clicks: number }>
    );

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [insights]);

  // Dados agrupados para tabela
  const tableData = useMemo(() => {
    const grouped = insights.reduce(
      (acc, row) => {
        const key = row.entity_id;
        if (!acc[key]) {
          acc[key] = {
            entity_id: row.entity_id,
            entity_name: row.entity_name || row.entity_id,
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
          };
        }
        acc[key].spend += row.spend || 0;
        acc[key].impressions += row.impressions || 0;
        acc[key].clicks += row.clicks || 0;
        acc[key].reach += row.reach || 0;
        return acc;
      },
      {} as Record<string, { entity_id: string; entity_name: string; spend: number; impressions: number; clicks: number; reach: number }>
    );

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
        cpm: item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [insights]);

  // ============================================================
  // FUNCOES DE FORMATACAO
  // ============================================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return formatNumber(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // ============================================================
  // RENDERIZACAO - ESTADOS DE LOADING/ERRO
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!syncStatus?.connection || syncStatus.connection.status !== 'connected') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Conexao Necessaria</h3>
          <p className="text-gray-600 mb-4">
            Configure a conexao com o Meta Ads antes de sincronizar dados.
          </p>
          <Button onClick={() => (window.location.href = '#meta-admin')}>
            <Settings className="w-4 h-4 mr-2" />
            Configurar Conexao
          </Button>
        </Card>
      </div>
    );
  }

  // ============================================================
  // RENDERIZACAO - VISTA DE CONTAS (GRID DE CARDS)
  // ============================================================

  if (navigationState.currentView === 'accounts') {
    return (
      <div className="space-y-6">
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meta Ads Sync</h2>
              <p className="text-gray-600">
                {accountCards.length} conta{accountCards.length !== 1 ? 's' : ''} conectada{accountCards.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status global */}
            <SyncStatusBadge
              status={
                syncStatus.health_status === 'healthy'
                  ? 'synced'
                  : syncStatus.health_status === 'stale'
                  ? 'stale'
                  : 'error'
              }
              showLabel
              size="md"
            />

            {/* Botao sincronizar todas */}
            <Button onClick={handleSyncAll} disabled={syncing || accountCards.length === 0}>
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Todas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Seletor de Periodo */}
        <Card className="bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-900">Periodo de Analise</h3>
              <p className="text-sm text-gray-500">
                Selecione o periodo para extrair metricas
              </p>
            </div>
            <PeriodButtons
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
            />
          </div>
        </Card>

        {/* Mensagem de resultado de sincronizacao */}
        {syncResult && (
          <div
            className={`p-4 rounded-xl border ${
              syncResult.errors.length > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              {syncResult.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium">
                {syncResult.insights_synced} registros sincronizados de {syncResult.accounts_synced} conta(s)
              </span>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Grid de Cards de Contas */}
        {accountCards.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma conta encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              Verifique a configuracao da conexao com o Meta Ads.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = '#meta-admin')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurar Conexao
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountCards.map((account) => (
              <AdAccountCard
                key={account.id}
                account={account}
                isSelected={false}
                isSyncing={syncingAccountId === account.id}
                onSelect={handleSelectAccount}
                onSync={handleSyncAccount}
              />
            ))}
          </div>
        )}

        {/* Resumo Geral */}
        {syncStatus.totals.total_insights_rows > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-white border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Dados Armazenados</h3>
                <p className="text-sm text-blue-700">
                  {formatNumber(syncStatus.totals.total_insights_rows)} registros de metricas no banco de dados
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">
                  Ultima atualizacao:{' '}
                  {syncStatus.ad_accounts[0]?.last_sync_at
                    ? new Date(syncStatus.ad_accounts[0].last_sync_at).toLocaleString('pt-BR')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDERIZACAO - VISTA DE DETALHES DA CONTA
  // ============================================================

  const selectedAccount = getAccountById(navigationState.selectedAccountId || '');

  return (
    <div className="space-y-6">
      {/* Header com Breadcrumb */}
      <div className="flex flex-col gap-4">
        {/* Botao Voltar e Breadcrumb */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToAccounts}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          <BreadcrumbNav items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        </div>

        {/* Info da Conta Selecionada */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedAccount?.name || 'Conta'}
              </h2>
              <p className="text-gray-600 font-mono text-sm">
                {selectedAccount?.meta_id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <SyncStatusBadge
              status={syncingAccountId === navigationState.selectedAccountId ? 'syncing' : 'synced'}
              lastSyncAt={selectedAccount?.last_sync_at}
              showLabel
              size="md"
            />

            <Button
              onClick={() => navigationState.selectedAccountId && handleSyncAccount(navigationState.selectedAccountId)}
              disabled={syncingAccountId === navigationState.selectedAccountId}
            >
              {syncingAccountId === navigationState.selectedAccountId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="relative z-20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Periodo */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              size="md"
            />
          </div>

          {/* Nivel - esconde quando estiver visualizando anuncios de um adset especifico */}
          {navigationState.currentView !== 'adset-detail' && (
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nivel</label>
              <div className="flex space-x-1">
                {LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSelectedLevel(level.value)}
                    className={`
                      flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        selectedLevel === level.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Indicador quando estiver dentro de um adset */}
          {navigationState.currentView === 'adset-detail' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Visualizando anuncios do conjunto
              </span>
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gasto Total */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Gasto Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(kpis.totalSpend)}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Impressoes */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Impressoes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCompact(kpis.totalImpressions)}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Cliques */}
        <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-600">Cliques</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCompact(kpis.totalClicks)}
              </p>
            </div>
            <div className="p-2 bg-cyan-100 rounded-lg">
              <MousePointer className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
        </Card>

        {/* ROAS */}
        <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">ROAS Medio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {kpis.roas.toFixed(2)}x
              </p>
              {kpis.totalConversionValue > 0 && (
                <p className="text-xs text-teal-500 mt-1">
                  Receita: {formatCurrency(kpis.totalConversionValue)}
                </p>
              )}
            </div>
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Graficos */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafico de Gasto */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Gasto por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(v) => `R$${v}`} stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Grafico de Impressoes e Cliques */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Impressoes e Cliques por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'impressions' ? 'Impressoes' : 'Cliques',
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Tabela de Entidades */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            {/* Mostra titulo diferente se estiver dentro de um adset */}
            {navigationState.currentView === 'adset-detail' ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-500">Anuncios do conjunto:</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  {navigationState.selectedAdsetName} ({tableData.length})
                </h3>
              </>
            ) : (
              <h3 className="font-semibold text-gray-900">
                {LEVELS.find((l) => l.value === selectedLevel)?.label} ({tableData.length})
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botao para voltar para lista de adsets quando estiver em adset-detail */}
            {navigationState.currentView === 'adset-detail' && (
              <Button variant="outline" size="sm" onClick={handleBackToAdsets}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Conjuntos
              </Button>
            )}

            {tableData.length > 0 && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nome</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Gasto</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Impressoes</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Cliques</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CTR</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CPC</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CPM</th>
                {/* Mostra coluna de acoes para ads ou adsets */}
                {(selectedLevel === 'ad' || selectedLevel === 'adset' || navigationState.currentView === 'adset-detail') && (
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Acoes</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center">
                      <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="font-medium">Nenhum dado encontrado</p>
                      <p className="text-sm mt-1">
                        {navigationState.currentView === 'adset-detail'
                          ? 'Nenhum anuncio encontrado neste conjunto'
                          : 'Clique em "Sincronizar" para extrair metricas do Meta Ads'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.map((row) => {
                  // Determina se a linha e clicavel (ads ou adsets)
                  const isAdRow = selectedLevel === 'ad' || navigationState.currentView === 'adset-detail';
                  const isAdsetRow = selectedLevel === 'adset' && navigationState.currentView !== 'adset-detail';

                  return (
                    <tr
                      key={row.entity_id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        isAdRow || isAdsetRow ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (isAdRow) {
                          handleOpenAdDetail(row);
                        } else if (isAdsetRow) {
                          handleSelectAdset(row.entity_id, row.entity_name);
                        }
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Icone indicando que e um adset clicavel */}
                          {isAdsetRow && (
                            <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-gray-900">{row.entity_name}</span>
                            <span className="block text-xs text-gray-500 font-mono">{row.entity_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(row.spend)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {formatNumber(row.impressions)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {formatNumber(row.clicks)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {formatPercent(row.ctr)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {formatCurrency(row.cpc)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {formatCurrency(row.cpm)}
                      </td>

                      {/* Coluna de acoes para adsets - botao para ver anuncios */}
                      {isAdsetRow && (
                        <td className="text-center py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAdset(row.entity_id, row.entity_name);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver anuncios deste conjunto"
                          >
                            Ver Anuncios
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}

                      {/* Coluna de acoes para ads - botao de detalhes */}
                      {isAdRow && (
                        <td className="text-center py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdDetail(row);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes e analisar com IA"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Detalhes
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalhes do Anuncio */}
      {/* Passa os insights pre-carregados filtrados pelo ad_id do anuncio selecionado */}
      <AdDetailModal
        isOpen={adDetailModal.isOpen}
        onClose={handleCloseAdDetail}
        adData={adDetailModal.adData}
        dateRange={{ start: dateRange.dateFrom, end: dateRange.dateTo }}
        preloadedMetrics={
          adDetailModal.adData
            ? insights.filter((row) => row.entity_id === adDetailModal.adData?.ad_id)
            : []
        }
      />
    </div>
  );
};
