import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/auth/AuthForm';
import { AuthCallback } from './components/auth/AuthCallback';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { Sidebar } from './components/dashboard/Sidebar';
import { FilterBar } from './components/dashboard/FilterBar';
import { MetricsOverview } from './components/dashboard/MetricsOverview';
import { PerformanceChart } from './components/dashboard/PerformanceChart';
import { CampaignTable } from './components/dashboard/CampaignTable';
import { DataSources } from './components/dashboard/DataSources';
import { SettingsPage } from './components/settings/SettingsPage';
import { AIInsightsPanel } from './components/insights/AIInsightsPanel';
import { SupportPage } from './components/support/SupportPage';
import { FloatingHelpButton } from './components/help/FloatingHelpButton';
import { ThemeProvider } from './components/settings/ThemeProvider';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useSystemSettings } from './hooks/useSystemSettings';
import { mockCampaigns, mockMetrics, mockAdSets, mockAds } from './data/mockData';
import { exportToCSV, exportToPDF } from './utils/export';
import { MetricsSummary } from './types/advertising';
import { Card } from './components/ui/Card';
import { BarChart3 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const { settings: systemSettings } = useSystemSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('overview');
  const [dashboardLoading, setDashboardLoading] = useState(false);
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

  const handleRefresh = () => {
    setDashboardLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDashboardLoading(false);
    }, 1000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => window.location.reload()} />;
  }

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
        return (
          <>
            {/* Header with Icon */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600">Visão geral das suas campanhas de publicidade</p>
              </div>
            </div>
            
            <FilterBar
              onFilterChange={handleFilterChange}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
            
            <MetricsOverview
              metrics={summaryMetrics}
              loading={dashboardLoading}
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

            {/* Debug Info */}
            {(filters.platforms.length > 0 || filters.campaigns.length > 0 || filters.adSets.length > 0 || filters.ads.length > 0) && (
              <Card className="bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Filtros Aplicados:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Plataformas: {filters.platforms.length > 0 ? filters.platforms.join(', ') : 'Todas'}</div>
                  <div>Campanhas: {filters.campaigns.length > 0 ? `${filters.campaigns.length} selecionadas` : 'Todas'}</div>
                  <div>Conjuntos: {filters.adSets.length > 0 ? `${filters.adSets.length} selecionados` : 'Todos'}</div>
                  <div>Anúncios: {filters.ads.length > 0 ? `${filters.ads.length} selecionados` : 'Todos'}</div>
                  <div>Resultados: {filteredCampaigns.length} campanhas, {filteredMetrics.length} métricas</div>
                </div>
              </Card>
            )}
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

      {/* Floating Help Button - Only show when user is logged in */}
      <FloatingHelpButton />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;