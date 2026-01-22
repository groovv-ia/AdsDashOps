import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/auth/AuthForm';
import { EmailConfirmationCallback } from './components/auth/EmailConfirmationCallback';
import { OAuthCallback } from './components/dashboard/OAuthCallback';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { Sidebar } from './components/dashboard/Sidebar';
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
import { ClientProvider } from './contexts/ClientContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { CampaignsPage } from './components/campaigns/CampaignsPage';
import { CampaignAnalysisPage } from './components/campaigns/CampaignAnalysisPage';
import { CampaignExtractedDataPage } from './components/campaigns/CampaignExtractedDataPage';
import { WorkspacesPage } from './components/workspaces/WorkspacesPage';
import { MetaAdminPage, MetaAdsSyncPage } from './components/meta-admin';
import { GoogleAdminPage, GoogleAdsSyncPage } from './components/google-admin';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useDashboardData } from './hooks/useDashboardData';
import { isDemoMode } from './lib/supabase';
import { exportToCSV, exportToPDF } from './utils/export';
import { MetricsSummary } from './types/advertising';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  // Todos os hooks devem vir ANTES de qualquer early return
  const { user, loading } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const { settings: systemSettings } = useSystemSettings();

  // Hook para gerenciar dados do dashboard (reais ou mocks)
  const {
    campaigns: mockCampaigns,
    metrics: mockMetrics,
    adSets: mockAdSets,
    ads: mockAds,
    isUsingRealData,
    loading: dataLoading,
    refresh: refreshData
  } = useDashboardData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('meta-admin');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    platforms: [] as string[],
    campaigns: [] as string[],
    adSets: [] as string[],
    ads: [] as string[],
    dateRange: [
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    ] as [Date | null, Date | null]
  });

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = () => {
      // Proteção contra SSR ou contextos onde window pode não estar disponível
      if (typeof window === 'undefined' || !window.location) {
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search || '');
        const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.substring(1) : '');

        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const error = urlParams.get('error') || hashParams.get('error');

        if (accessToken) {
          console.log('OAuth callback detected, cleaning URL...');
          window.history?.replaceState({}, document.title, window.location.pathname);
        }

        if (error) {
          console.error('OAuth error:', error);
        }
      } catch (err) {
        console.error('Erro ao processar callback OAuth:', err);
      }
    };

    handleOAuthCallback();
  }, []);

  // Listen for auto refresh events
  useEffect(() => {
    const handleAutoRefresh = (event: CustomEvent) => {
      if (event.detail.source === 'system-settings') {
        handleRefresh();
      }
    };

    window.addEventListener('autoRefresh', handleAutoRefresh as EventListener);
    return () => window.removeEventListener('autoRefresh', handleAutoRefresh as EventListener);
  }, []);

  // Listen for sync completion and redirect to campaigns page
  useEffect(() => {
    const handleSyncCompleted = (event: CustomEvent) => {
      console.log('Sincronização concluída, redirecionando para página de campanhas', event.detail);

      // Aguarda 2 segundos para que o usuário veja a mensagem de sucesso
      setTimeout(() => {
        setCurrentPage('campaigns');
      }, 2000);
    };

    window.addEventListener('syncCompleted', handleSyncCompleted as EventListener);
    return () => window.removeEventListener('syncCompleted', handleSyncCompleted as EventListener);
  }, []);

  // Listen for page change events from chat bot
  useEffect(() => {
    const handleChangePage = (event: CustomEvent) => {
      const { page } = event.detail;
      console.log('Mudando página via chat bot:', page);
      setCurrentPage(page);
    };

    window.addEventListener('changePage', handleChangePage as EventListener);
    return () => window.removeEventListener('changePage', handleChangePage as EventListener);
  }, []);

  // Filter data based on current filters
  const filteredCampaigns = mockCampaigns.filter(campaign => {
    if (filters.platforms.length > 0 && !filters.platforms.includes(campaign.platform.toLowerCase())) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    return true;
  });

  const filteredAdSets = mockAdSets.filter(adSet => {
    const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
    if (!campaign) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(campaign.platform.toLowerCase())) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.adSets.length > 0 && !filters.adSets.includes(adSet.id)) return false;
    return true;
  });

  const filteredAds = mockAds.filter(ad => {
    const adSet = mockAdSets.find(as => as.id === ad.ad_set_id);
    const campaign = mockCampaigns.find(c => c.id === ad.campaign_id);
    if (!adSet || !campaign) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(campaign.platform.toLowerCase())) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.adSets.length > 0 && !filters.adSets.includes(adSet.id)) return false;
    if (filters.ads.length > 0 && !filters.ads.includes(ad.id)) return false;
    return true;
  });

  const filteredMetrics = mockMetrics.filter(metric => {
    const campaign = mockCampaigns.find(c => c.id === metric.campaign_id);
    const metricDate = new Date(metric.date);
    
    if (!campaign) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(campaign.platform.toLowerCase())) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(campaign.id)) return false;
    if (filters.dateRange[0] && metricDate < filters.dateRange[0]) return false;
    if (filters.dateRange[1] && metricDate > filters.dateRange[1]) return false;
    
    return true;
  });

  // Calculate summary metrics
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

  // Average out rate-based metrics
  const metricsCount = filteredMetrics.length || 1;
  summaryMetrics.ctr = summaryMetrics.ctr / metricsCount;
  summaryMetrics.cpc = summaryMetrics.cpc / metricsCount;
  summaryMetrics.roas = summaryMetrics.roas / metricsCount;
  summaryMetrics.cost_per_result = summaryMetrics.cost_per_result / metricsCount;
  summaryMetrics.frequency = summaryMetrics.frequency / metricsCount;

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
      // Atualiza dados do dashboard (busca do Supabase ou usa mocks)
      await refreshData();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detecta rota atual para páginas públicas e callbacks
  const currentPath = window.location.pathname;
  const isPrivacyPolicyPage = currentPath === '/politica-de-privacidade';
  const isTermsOfServicePage = currentPath === '/termos-de-uso';
  const isDataDeletionPage = currentPath === '/exclusao-de-dados';
  const isAuthCallbackPage = currentPath === '/auth/callback';
  const isOAuthCallbackPage = currentPath === '/oauth-callback';

  // Renderiza página de callback OAuth (Meta, Google, TikTok)
  if (isOAuthCallbackPage) {
    return <OAuthCallback />;
  }

  // Renderiza página de callback de confirmação de email
  if (isAuthCallbackPage) {
    return (
      <EmailConfirmationCallback
        onSuccess={() => {
          console.log('Email confirmed successfully, redirecting to dashboard...');
        }}
        onError={(error) => {
          console.error('Email confirmation error:', error);
        }}
      />
    );
  }

  // Renderiza páginas públicas sem necessidade de autenticação
  if (isPrivacyPolicyPage) {
    return <PrivacyPolicy />;
  }

  if (isTermsOfServicePage) {
    return <TermsOfService />;
  }

  if (isDataDeletionPage) {
    return <DataDeletionPolicy />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isDemoMode ? 'Carregando modo demonstração...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {isDemoMode && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800 text-sm">
                  <strong>Modo Demonstração:</strong> Configure o Supabase para funcionalidade completa.
                  <a href="#" className="ml-2 underline hover:text-yellow-900">
                    Clique aqui para configurar
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
        <AuthForm onSuccess={() => window.location.reload()} />
      </>
    );
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case 'campaigns':
        return (
          <CampaignsPage
            onNavigateToAnalysis={(campaignId) => {
              setSelectedCampaignId(campaignId);
              setCurrentPage('campaign-analysis');
            }}
            onNavigateToExtractedData={() => {
              setCurrentPage('campaign-extracted-data');
            }}
          />
        );
      case 'campaign-extracted-data':
        return (
          <CampaignExtractedDataPage
            onNavigateBack={() => setCurrentPage('campaigns')}
          />
        );
      case 'campaign-analysis':
        if (!selectedCampaignId) {
          setCurrentPage('campaigns');
          return null;
        }
        return (
          <CampaignAnalysisPage
            campaignId={selectedCampaignId}
            onBack={() => {
              setSelectedCampaignId(null);
              setCurrentPage('campaigns');
            }}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'meta-admin':
        return <MetaAdminPage />;
      case 'meta-sync':
        return <MetaAdsSyncPage />;
      case 'google-admin':
        return <GoogleAdminPage />;
      case 'google-sync':
        return <GoogleAdsSyncPage />;
      case 'ai-insights':
        return (
          <AIInsightsPanel
            campaigns={filteredCampaigns}
            metrics={filteredMetrics}
          />
        );
      case 'support':
        return <SupportPage />;
      case 'workspaces':
        return <WorkspacesPage />;
      default:
        return <MetaAdminPage />;
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

      {/* Floating Help Button - Only show when user is logged in */}
      <FloatingHelpButton />

      {/* Cookie Settings Button and Modal - Available everywhere */}
      <CookieSettingsButton />
      <CookiePreferencesModal />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <WorkspaceProvider>
          <ClientProvider>
            <AppContent />
          </ClientProvider>
        </WorkspaceProvider>
      </CookieConsentProvider>
    </ThemeProvider>
  );
}

export default App;