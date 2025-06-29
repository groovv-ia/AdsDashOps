import React, { useState } from 'react';
import { Calendar, Download, RefreshCw, ChevronDown, X, Check, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mockCampaigns, mockAdSets, mockAds } from '../../data/mockData';
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
  logo: React.ReactNode;
  color: string;
}

const MetaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#1877F2"/>
    <path d="M15.5 8.5c-1.5 0-2.5 1-2.5 2.5v1h-1v2h1v5h2v-5h1.5l.5-2h-2v-1c0-.5.5-1 1-1h1V8.5h-1.5z" fill="white"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V7.56a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.01z" fill="#000"/>
  </svg>
);

const platforms: Platform[] = [
  {
    id: 'meta',
    name: 'Meta',
    logo: <MetaIcon />,
    color: 'bg-blue-500'
  },
  {
    id: 'google',
    name: 'Google Ads',
    logo: <GoogleIcon />,
    color: 'bg-green-500'
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    logo: <TikTokIcon />,
    color: 'bg-pink-500'
  }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  onExport,
  onRefresh
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(''); // Changed to single platform
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [showAdSetDropdown, setShowAdSetDropdown] = useState(false);
  const [showAdDropdown, setShowAdDropdown] = useState(false);

  // Filter available options based on selections
  const availableCampaigns = mockCampaigns.filter(campaign => 
    !selectedPlatform || campaign.platform.toLowerCase() === selectedPlatform
  );

  const availableAdSets = mockAdSets.filter(adSet => {
    const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
    if (!campaign) return false;
    if (selectedPlatform && campaign.platform.toLowerCase() !== selectedPlatform) return false;
    if (selectedCampaigns.length > 0 && !selectedCampaigns.includes(campaign.id)) return false;
    return true;
  });

  const availableAds = mockAds.filter(ad => {
    const adSet = mockAdSets.find(as => as.id === ad.ad_set_id);
    const campaign = mockCampaigns.find(c => c.id === ad.campaign_id);
    if (!adSet || !campaign) return false;
    if (selectedPlatform && campaign.platform.toLowerCase() !== selectedPlatform) return false;
    if (selectedCampaigns.length > 0 && !selectedCampaigns.includes(campaign.id)) return false;
    if (selectedAdSets.length > 0 && !selectedAdSets.includes(adSet.id)) return false;
    return true;
  });

  const updateFilters = (updates: any) => {
    onFilterChange({
      platforms: selectedPlatform ? [selectedPlatform] : [], // Convert to array for compatibility
      campaigns: selectedCampaigns,
      adSets: selectedAdSets,
      ads: selectedAds,
      dateRange,
      ...updates,
    });
  };

  const handlePlatformSelect = (platformId: string) => {
    // If clicking the same platform, deselect it
    const newSelectedPlatform = selectedPlatform === platformId ? '' : platformId;
    
    setSelectedPlatform(newSelectedPlatform);
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
    
    updateFilters({
      platforms: newSelectedPlatform ? [newSelectedPlatform] : [],
      campaigns: [],
      adSets: [],
      ads: [],
    });
  };

  const handleCampaignToggle = (campaignId: string) => {
    const newSelectedCampaigns = selectedCampaigns.includes(campaignId)
      ? selectedCampaigns.filter(id => id !== campaignId)
      : [...selectedCampaigns, campaignId];
    
    setSelectedCampaigns(newSelectedCampaigns);
    setSelectedAdSets([]);
    setSelectedAds([]);
    
    updateFilters({
      campaigns: newSelectedCampaigns,
      adSets: [],
      ads: [],
    });
  };

  const handleAdSetToggle = (adSetId: string) => {
    const newSelectedAdSets = selectedAdSets.includes(adSetId)
      ? selectedAdSets.filter(id => id !== adSetId)
      : [...selectedAdSets, adSetId];
    
    setSelectedAdSets(newSelectedAdSets);
    setSelectedAds([]);
    
    updateFilters({
      adSets: newSelectedAdSets,
      ads: [],
    });
  };

  const handleAdToggle = (adId: string) => {
    const newSelectedAds = selectedAds.includes(adId)
      ? selectedAds.filter(id => id !== adId)
      : [...selectedAds, adId];
    
    setSelectedAds(newSelectedAds);
    
    updateFilters({
      ads: newSelectedAds,
    });
  };

  const handleClearAll = () => {
    setSelectedPlatform('');
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
    updateFilters({ platforms: [], campaigns: [], adSets: [], ads: [] });
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    updateFilters({ dateRange: update });
  };

  const getSelectionSummary = () => {
    const parts = [];
    if (selectedPlatform) {
      const platform = platforms.find(p => p.id === selectedPlatform);
      parts.push(`${platform?.name}`);
    }
    if (selectedCampaigns.length > 0) {
      parts.push(`${selectedCampaigns.length} campanha${selectedCampaigns.length > 1 ? 's' : ''}`);
    }
    if (selectedAdSets.length > 0) {
      parts.push(`${selectedAdSets.length} conjunto${selectedAdSets.length > 1 ? 's' : ''}`);
    }
    if (selectedAds.length > 0) {
      parts.push(`${selectedAds.length} anúncio${selectedAds.length > 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Nenhum filtro aplicado';
  };

  const getAdTypeIcon = (adType: string) => {
    switch (adType) {
      case 'video': return '🎥';
      case 'single_image': return '🖼️';
      case 'carousel': return '🎠';
      case 'text': return '📝';
      case 'shopping': return '🛍️';
      case 'display': return '🖥️';
      default: return '📄';
    }
  };

  return (
    <Card className="mb-6 relative z-10">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Análise</h3>
            <p className="text-sm text-gray-600">{getSelectionSummary()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={!selectedPlatform}
            >
              Limpar Tudo
            </Button>
          </div>
        </div>

        {/* Platform Selection - Single Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">
              1. Plataforma de Publicidade
            </label>
            <span className="text-xs text-gray-500">Selecione apenas uma plataforma</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const isSelected = selectedPlatform === platform.id;
              const campaignCount = mockCampaigns.filter(c => c.platform.toLowerCase() === platform.id).length;
              
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {platform.logo}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{platform.name}</h4>
                      <p className="text-xs text-gray-500">{campaignCount} campanhas</p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campaign Selection - Only show when platform is selected */}
        {selectedPlatform && (
          <div className="relative z-50">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                2. Campanhas
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{availableCampaigns.length} disponíveis</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <span className="text-gray-700">
                  {selectedCampaigns.length > 0 
                    ? `${selectedCampaigns.length} campanha${selectedCampaigns.length > 1 ? 's' : ''} selecionada${selectedCampaigns.length > 1 ? 's' : ''}`
                    : 'Selecionar campanhas'
                  }
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCampaignDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCampaignDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setShowCampaignDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-[110] max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedCampaigns(availableCampaigns.map(c => c.id));
                          setSelectedAdSets([]);
                          setSelectedAds([]);
                          updateFilters({ campaigns: availableCampaigns.map(c => c.id), adSets: [], ads: [] });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Selecionar todas
                      </button>
                    </div>
                    {availableCampaigns.map((campaign) => {
                      const isSelected = selectedCampaigns.includes(campaign.id);
                      const platform = platforms.find(p => p.id === campaign.platform.toLowerCase());
                      
                      return (
                        <button
                          key={campaign.id}
                          onClick={() => handleCampaignToggle(campaign.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{campaign.name}</div>
                              <div className="text-xs text-gray-500 flex items-center space-x-2">
                                <span>{campaign.objective}</span>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <div className="w-3 h-3">{platform?.logo}</div>
                                  <span>{campaign.platform}</span>
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ad Set Selection - Only show when campaigns are selected */}
        {selectedCampaigns.length > 0 && (
          <div className="relative z-40">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                3. Conjuntos de Anúncios
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{availableAdSets.length} disponíveis</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAdSetDropdown(!showAdSetDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <span className="text-gray-700">
                  {selectedAdSets.length > 0 
                    ? `${selectedAdSets.length} conjunto${selectedAdSets.length > 1 ? 's' : ''} selecionado${selectedAdSets.length > 1 ? 's' : ''}`
                    : 'Selecionar conjuntos de anúncios'
                  }
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAdSetDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAdSetDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[90]" 
                    onClick={() => setShowAdSetDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedAdSets(availableAdSets.map(as => as.id));
                          setSelectedAds([]);
                          updateFilters({ adSets: availableAdSets.map(as => as.id), ads: [] });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Selecionar todos
                      </button>
                    </div>
                    {availableAdSets.map((adSet) => {
                      const isSelected = selectedAdSets.includes(adSet.id);
                      const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
                      
                      return (
                        <button
                          key={adSet.id}
                          onClick={() => handleAdSetToggle(adSet.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{adSet.name}</div>
                              <div className="text-xs text-gray-500">
                                <div>{adSet.targeting}</div>
                                <div className="mt-1">
                                  Campanha: {campaign?.name} • Orçamento: R${adSet.daily_budget}/dia
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ad Selection - Only show when ad sets are selected */}
        {selectedAdSets.length > 0 && (
          <div className="relative z-30">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                4. Anúncios
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{availableAds.length} disponíveis</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAdDropdown(!showAdDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <span className="text-gray-700">
                  {selectedAds.length > 0 
                    ? `${selectedAds.length} anúncio${selectedAds.length > 1 ? 's' : ''} selecionado${selectedAds.length > 1 ? 's' : ''}`
                    : 'Selecionar anúncios'
                  }
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAdDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAdDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[80]" 
                    onClick={() => setShowAdDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-[90] max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedAds(availableAds.map(a => a.id));
                          updateFilters({ ads: availableAds.map(a => a.id) });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Selecionar todos
                      </button>
                    </div>
                    {availableAds.map((ad) => {
                      const isSelected = selectedAds.includes(ad.id);
                      const adSet = mockAdSets.find(as => as.id === ad.ad_set_id);
                      
                      return (
                        <button
                          key={ad.id}
                          onClick={() => handleAdToggle(ad.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 flex items-center space-x-2">
                                <span>{getAdTypeIcon(ad.ad_type)}</span>
                                <span>{ad.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                <div>Tipo: {ad.ad_type} • Status: {ad.status}</div>
                                <div>Conjunto: {adSet?.name}</div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                        </button>
                      );
                    })}
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
              Período de Análise
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