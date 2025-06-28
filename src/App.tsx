import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/auth/AuthForm';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { Sidebar } from './components/dashboard/Sidebar';
import { FilterBar } from './components/dashboard/FilterBar';
import { MetricsOverview } from './components/dashboard/MetricsOverview';
import { PerformanceChart } from './components/dashboard/PerformanceChart';
import { CampaignTable } from './components/dashboard/CampaignTable';
import { DataSources } from './components/dashboard/DataSources';
import { useAuth } from './hooks/useAuth';
import { mockCampaigns, mockMetrics } from './data/mockData';
import { exportToCSV, exportToPDF } from './utils/export';
import { MetricsSummary } from './types/advertising';
import { Card } from './components/ui/Card';

function App() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('overview');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [filters, setFilters] = useState({
    platform: '',
    adSet: '',
    campaign: '',
    dateRange: [
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    ] as [Date | null, Date | null]
  });

  // Filter data based on current filters
  const filteredCampaigns = mockCampaigns.filter(campaign => {
    if (filters.platform && campaign.platform.toLowerCase() !== filters.platform) return false;
    if (filters.campaign && campaign.id !== filters.campaign) return false;
    return true;
  });

  const filteredMetrics = mockMetrics.filter(metric => {
    const campaign = mockCampaigns.find(c => c.id === metric.campaign_id);
    const metricDate = new Date(metric.date);
    
    if (!campaign) return false;
    if (filters.platform && campaign.platform.toLowerCase() !== filters.platform) return false;
    if (filters.campaign && campaign.id !== filters.campaign) return false;
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
      case 'overview':
      default:
        return (
          <>
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
          />
          
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {renderPageContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;