import React, { useState } from 'react';
import { Calendar, Filter, Download, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mockCampaigns, mockAdSets } from '../../data/mockData';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  onRefresh: () => void;
}

interface Platform {
  id: string;
  name: string;
  logo: string;
}

const platforms: Platform[] = [
  {
    id: 'meta',
    name: 'Meta',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg'
  },
  {
    id: 'google',
    name: 'Google Ads',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Ads_logo.svg'
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    logo: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg'
  }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  onExport,
  onRefresh
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedAdSet, setSelectedAdSet] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showAdSetDropdown, setShowAdSetDropdown] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filter ad sets based on selected platform
  const availableAdSets = mockAdSets.filter(adSet => {
    if (!selectedPlatform) return false;
    const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
    return campaign?.platform.toLowerCase() === selectedPlatform;
  });

  // Filter campaigns based on selected ad set
  const availableCampaigns = mockCampaigns.filter(campaign => {
    if (!selectedPlatform) return false;
    if (!selectedAdSet) return campaign.platform.toLowerCase() === selectedPlatform;
    return availableAdSets.some(adSet => adSet.campaign_id === campaign.id && adSet.id === selectedAdSet);
  });

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
    setSelectedAdSet('');
    setSelectedCampaign('');
    setShowPlatformDropdown(false);
    
    onFilterChange({
      platform: platformId,
      adSet: '',
      campaign: '',
      dateRange,
    });
  };

  const handleAdSetSelect = (adSetId: string) => {
    setSelectedAdSet(adSetId);
    setSelectedCampaign('');
    setShowAdSetDropdown(false);
    
    onFilterChange({
      platform: selectedPlatform,
      adSet: adSetId,
      campaign: '',
      dateRange,
    });
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setShowCampaignDropdown(false);
    
    onFilterChange({
      platform: selectedPlatform,
      adSet: selectedAdSet,
      campaign: campaignId,
      dateRange,
    });
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    onFilterChange({
      platform: selectedPlatform,
      adSet: selectedAdSet,
      campaign: selectedCampaign,
      dateRange: update,
    });
  };

  const selectedPlatformData = platforms.find(p => p.id === selectedPlatform);
  const selectedAdSetData = mockAdSets.find(a => a.id === selectedAdSet);
  const selectedCampaignData = mockCampaigns.find(c => c.id === selectedCampaign);

  return (
    <Card className="mb-6">
      <div className="space-y-6">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecionar Plataforma de Anúncios
          </label>
          <div className="relative">
            <button
              onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
              className="w-full lg:w-80 flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {selectedPlatformData ? (
                <div className="flex items-center space-x-3">
                  <img 
                    src={selectedPlatformData.logo} 
                    alt={selectedPlatformData.name}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="font-medium text-gray-900">{selectedPlatformData.name}</span>
                </div>
              ) : (
                <span className="text-gray-500">Escolha uma plataforma</span>
              )}
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {showPlatformDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowPlatformDropdown(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-80">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformSelect(platform.id)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    >
                      <img 
                        src={platform.logo} 
                        alt={platform.name}
                        className="w-6 h-6 object-contain"
                      />
                      <span className="font-medium text-gray-900">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ad Set Selection */}
        {selectedPlatform && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecionar Grupo de Anúncios
            </label>
            <div className="relative">
              <button
                onClick={() => setShowAdSetDropdown(!showAdSetDropdown)}
                className="w-full lg:w-80 flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {selectedAdSetData ? (
                  <span className="font-medium text-gray-900">{selectedAdSetData.name}</span>
                ) : (
                  <span className="text-gray-500">Escolha um grupo de anúncios</span>
                )}
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {showAdSetDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAdSetDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-80 max-h-60 overflow-y-auto">
                    {availableAdSets.length > 0 ? (
                      availableAdSets.map((adSet) => (
                        <button
                          key={adSet.id}
                          onClick={() => handleAdSetSelect(adSet.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          <div className="font-medium text-gray-900">{adSet.name}</div>
                          <div className="text-sm text-gray-500">{adSet.targeting}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        Nenhum grupo de anúncios disponível
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Campaign Selection */}
        {selectedPlatform && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecionar Campanha
            </label>
            <div className="relative">
              <button
                onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
                className="w-full lg:w-80 flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {selectedCampaignData ? (
                  <div>
                    <div className="font-medium text-gray-900">{selectedCampaignData.name}</div>
                    <div className="text-sm text-gray-500">{selectedCampaignData.objective}</div>
                  </div>
                ) : (
                  <span className="text-gray-500">Escolha uma campanha</span>
                )}
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {showCampaignDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCampaignDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-80 max-h-60 overflow-y-auto">
                    {availableCampaigns.length > 0 ? (
                      availableCampaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          onClick={() => handleCampaignSelect(campaign.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          <div className="font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">{campaign.objective} • {campaign.status}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        Nenhuma campanha disponível
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Date Range and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between space-y-4 lg:space-y-0 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Período
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <DatePicker
                selectsRange
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                onChange={handleDateRangeChange}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
                placeholderText="Selecionar período"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={onRefresh}
            >
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                icon={Download}
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        onExport('csv');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => {
                        onExport('pdf');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};