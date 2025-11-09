/**
 * Componente principal da aplicação - Versão 2
 *
 * Nova arquitetura que exige conexão ativa antes de exibir métricas.
 * Remove completamente a lógica de dados mockados.
 */

import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/auth/AuthForm';
import { EmailConfirmationCallback } from './components/auth/EmailConfirmationCallback';
import { OAuthCallback } from './components/dashboard/OAuthCallback';
import { NoConnectionState } from './components/dashboard/NoConnectionState';
import { SyncingState } from './components/dashboard/SyncingState';
import { EmptyMetricsState } from './components/dashboard/EmptyMetricsState';
import { AccountSwitcher } from './components/dashboard/AccountSwitcher';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { Sidebar } from './components/dashboard/Sidebar';
import { FilterBarV2 } from './components/dashboard/FilterBarV2';
import { MetricsOverview } from './components/dashboard/MetricsOverview';
import { PerformanceChart } from './components/dashboard/PerformanceChart';
import { CampaignTable } from './components/dashboard/CampaignTable';
import { DataSources } from './components/dashboard/DataSources';
import { SettingsPage } from './components/settings/SettingsPage';
import { AIInsightsPanel } from './components/insights/AIInsightsPanel';
import { SupportPage } from './components/support/SupportPage';
import { FloatingHelpButton } from './components/help/FloatingHelpButton';
import { ThemeProvider } from './components/settings/ThemeProvider';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { DataDeletionPolicy } from './components/legal/DataDeletionPolicy';
import { CookiePreferencesModal } from './components/legal/CookiePreferencesModal';
import { CookieSettingsButton } from './components/legal/CookieSettingsButton';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useDataConnections } from './hooks/useDataConnections';
import { useDashboardDataV2 } from './hooks/useDashboardDataV2';
import { MetaSyncService } from './lib/services/MetaSyncService';
import { exportToCSV, exportToPDF } from './utils/export';
import { MetricsSummary } from './types/advertising';
import { Card } from './components/ui/Card';
import { BarChart3 } from 'lucide-react';

function AppContent() {
  // Hooks principais
  const { user, loading: authLoading } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const {
    connections,
    activeConnection,
    hasConnections,
    loading: connectionsLoading,
    setActiveConnection,
    refreshConnections
  } = useDataConnections();

  // Hook para dados do dashboard (apenas se houver conexão ativa)
  const {
    campaigns,
    metrics,
    adSets,
    ads,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
    isEmpty
  } = useDashboardDataV2({
    connectionId: activeConnection?.id || '',
    autoRefresh: !!activeConnection
  });

  // Estados locais
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('overview');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    campaigns: [] as string[],
    adSets: [] as string[],
    ads: [] as string[],
    dateRange: [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
      new Date()
    ] as [Date | null, Date | null]
  });

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const error = urlParams.get('error') || hashParams.get('error');

    if (accessToken) {
      console.log('OAuth callback detected, cleaning URL...');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      console.error('OAuth error:', error);
    }
  }, []);

  // Detecta rotas públicas e callbacks
  const currentPath = window.location.pathname;
  const isPrivacyPolicyPage = currentPath === '/politica-de-privacidade';
  const isTermsOfServicePage = currentPath === '/termos-de-uso';
  const isDataDeletionPage = currentPath === '/exclusao-de-dados';
  const isAuthCallbackPage = currentPath === '/auth/callback';
  const isOAuthCallbackPage = currentPath === '/oauth-callback';

  // Renderiza callbacks
  if (isOAuthCallbackPage) {
    return <OAuthCallback />;
  }

  if (isAuthCallbackPage) {
    return (
      <EmailConfirmationCallback
        onSuccess={() => console.log('Email confirmed')}
        onError={(error) => console.error('Email confirmation error:', error)}
      />
    );
  }

  // Renderiza páginas públicas
  if (isPrivacyPolicyPage) return <PrivacyPolicy />;
  if (isTermsOfServicePage) return <TermsOfService />;
  if (isDataDeletionPage) return <DataDeletionPolicy />;

  // Loading de autenticação
  if (authLoading || connectionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Requer autenticação
  if (!user) {
    return <AuthForm onSuccess={() => window.location.reload()} />;
  }

  // Guard: Sem conexões ativas - exibe tela de onboarding
  if (!hasConnections) {
    return (
      <NoConnectionState
        onConnectClick={() => setCurrentPage('data-sources')}
      />
    );
  }

  // Guard: Sincronização em andamento
  if (syncingConnectionId) {
    const syncingConnection = connections.find(c => c.id === syncingConnectionId);
    if (syncingConnection) {
      return (
        <SyncingState
          connectionName={syncingConnection.name}
          platform={syncingConnection.platform}
          logo={syncingConnection.logo}
          statusMessage="Importando campanhas e métricas dos últimos 7 dias..."
        />
      );
    }
  }

  // Filtra dados baseado nos filtros ativos
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    return true;
  });

  const filteredAdSets = adSets.filter(adSet => {
    const campaign = campaigns.find(c => c.id === adSet.campaign_id);
    if (!campaign) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.adSets.length > 0 && !filters.adSets.includes(adSet.id)) return false;
    return true;
  });

  const filteredAds = ads.filter(ad => {
    const campaign = campaigns.find(c => c.id === ad.campaign_id);
    if (!campaign) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.adSets.length > 0 && !filters.adSets.includes(ad.ad_set_id)) return false;
    if (filters.ads.length > 0 && !filters.ads.includes(ad.id)) return false;
    return true;
  });

  const filteredMetrics = metrics.filter(metric => {
    const campaign = campaigns.find(c => c.id === metric.campaign_id);
    const metricDate = new Date(metric.date);

    if (!campaign) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.dateRange[0] && metricDate < filters.dateRange[0]) return false;
    if (filters.dateRange[1] && metricDate > filters.dateRange[1]) return false;

    return true;
  });

  // Calcula métricas agregadas
  const summaryMetrics: MetricsSummary = filteredMetrics.reduce((acc, metric) => ({
    impressions: acc.impressions + metric.impressions,
    clicks: acc.clicks + metric.clicks,
    spend: acc.spend + metric.spend,
    conversions: acc.conversions + metric.conversions,
    reach: acc.reach + metric.reach,
    frequency: acc.frequency + metric.frequency,
    ctr: acc.ctr + metric.ctr,
    cpc: acc.cpc + metric.cpc,
    roas: acc.roas + metric.roas,
    cost_per_result: acc.cost_per_result + metric.cost_per_result,
  }), {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    reach: 0,
    frequency: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    cost_per_result: 0,
  });

  // Calcula médias para métricas baseadas em taxa
  const metricsCount = filteredMetrics.length || 1;
  summaryMetrics.ctr = summaryMetrics.ctr / metricsCount;
  summaryMetrics.cpc = summaryMetrics.cpc / metricsCount;
  summaryMetrics.roas = summaryMetrics.roas / metricsCount;
  summaryMetrics.cost_per_result = summaryMetrics.cost_per_result / metricsCount;
  summaryMetrics.frequency = summaryMetrics.frequency / metricsCount;

  // Handlers
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      exportToCSV(filteredMetrics, filteredCampaigns);
    } else {
      exportToPDF(filteredMetrics, filteredCampaigns);
    }
  };

  const handleRefresh = async () => {
    setDashboardLoading(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    try {
      setSyncingConnectionId(connectionId);
      const connection = connections.find(c => c.id === connectionId);

      if (connection) {
        const syncService = new MetaSyncService();
        await syncService.syncConnection(connectionId);
        await refreshConnections();
        await refreshData();
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    } finally {
      setSyncingConnectionId(null);
    }
  };

  // Renderiza conteúdo da página atual
  const renderPageContent = () => {
    switch (currentPage) {
      case 'data-sources':
        return <DataSources />;
      case 'settings':
        return <SettingsPage />;
      case 'ai-insights':
        return (
          <AIInsightsPanel
            campaigns={filteredCampaigns}
            metrics={filteredMetrics}
          />
        );
      case 'support':
        return <SupportPage />;
      case 'overview':
      default:
        // Se não há dados, mostra estado vazio
        if (isEmpty) {
          return (
            <EmptyMetricsState
              variant={activeConnection?.last_sync ? 'no-campaigns' : 'sync-pending'}
              connectionName={activeConnection?.name}
              onSync={() => activeConnection && handleSyncConnection(activeConnection.id)}
            />
          );
        }

        // Se filtros não retornam resultados
        if (filteredCampaigns.length === 0 && campaigns.length > 0) {
          return (
            <EmptyMetricsState
              variant="no-results"
              onClearFilters={() => setFilters({
                campaigns: [],
                adSets: [],
                ads: [],
                dateRange: [
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  new Date()
                ]
              })}
            />
          );
        }

        return (
          <>
            {/* Header do Dashboard */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                  <p className="text-gray-600">Análise de desempenho das campanhas</p>
                </div>
              </div>

              {/* Seletor de conta */}
              {activeConnection && (
                <AccountSwitcher
                  connections={connections}
                  activeConnection={activeConnection}
                  onSelectConnection={setActiveConnection}
                  onSyncConnection={handleSyncConnection}
                />
              )}
            </div>

            <FilterBarV2
              connectionId={activeConnection.id}
              onFilterChange={handleFilterChange}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />

            <MetricsOverview
              metrics={summaryMetrics}
              loading={dashboardLoading || dataLoading}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PerformanceChart
                data={filteredMetrics}
                metric="impressions"
                title="Impressões"
                chartType="line"
              />
              <PerformanceChart
                data={filteredMetrics}
                metric="spend"
                title="Gasto"
                chartType="bar"
              />
              <PerformanceChart
                data={filteredMetrics}
                metric="conversions"
                title="Conversões"
                chartType="line"
              />
              <PerformanceChart
                data={filteredMetrics}
                metric="roas"
                title="ROAS"
                chartType="line"
              />
            </div>

            <CampaignTable
              campaigns={filteredCampaigns}
              metrics={filteredMetrics}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <DashboardHeader
            user={user}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onPageChange={setCurrentPage}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {renderPageContent()}
            </div>
          </main>
        </div>
      </div>

      <FloatingHelpButton />
      <CookieSettingsButton />
      <CookiePreferencesModal />
    </div>
  );
}

function AppV2() {
  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <AppContent />
      </CookieConsentProvider>
    </ThemeProvider>
  );
}

export default AppV2;
