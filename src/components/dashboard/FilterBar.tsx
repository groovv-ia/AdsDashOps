import React, { useState } from 'react';
import { Calendar, Filter, Download, RefreshCw, ChevronDown, X, Check, ChevronRight } from 'lucide-react';
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
  logo: string;
  color: string;
}

const platforms: Platform[] = [
  {
    id: 'meta',
    name: 'Meta',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
    color: 'bg-blue-500'
  },
  {
    id: 'google',
    name: 'Google Ads',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Ads_logo.svg',
    color: 'bg-green-500'
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    logo: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
    color: 'bg-pink-500'
  }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  onExport,
  onRefresh
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    campaigns: false,
    adSets: false,
    ads: false
  });

  // Filter available options based on selections
  const availableCampaigns = mockCampaigns.filter(campaign => 
    selectedPlatforms.length === 0 || selectedPlatforms.includes(campaign.platform.toLowerCase())
  );

  const availableAdSets = mockAdSets.filter(adSet => {
    const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
    if (!campaign) return false;
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(campaign.platform.toLowerCase())) return false;
    if (selectedCampaigns.length > 0 && !selectedCampaigns.includes(campaign.id)) return false;
    return true;
  });

  const availableAds = mockAds.filter(ad => {
    const adSet = mockAdSets.find(as => as.id === ad.ad_set_id);
    const campaign = mockCampaigns.find(c => c.id === ad.campaign_id);
    if (!adSet || !campaign) return false;
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(campaign.platform.toLowerCase())) return false;
    if (selectedCampaigns.length > 0 && !selectedCampaigns.includes(campaign.id)) return false;
    if (selectedAdSets.length > 0 && !selectedAdSets.includes(adSet.id)) return false;
    return true;
  });

  const updateFilters = (updates: any) => {
    onFilterChange({
      platforms: selectedPlatforms,
      campaigns: selectedCampaigns,
      adSets: selectedAdSets,
      ads: selectedAds,
      dateRange,
      ...updates,
    });
  };

  const handlePlatformToggle = (platformId: string) => {
    const newSelectedPlatforms = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter(id => id !== platformId)
      : [...selectedPlatforms, platformId];
    
    setSelectedPlatforms(newSelectedPlatforms);
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
    
    updateFilters({
      platforms: newSelectedPlatforms,
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

  const handleSelectAll = (type: 'platforms' | 'campaigns' | 'adSets' | 'ads') => {
    switch (type) {
      case 'platforms':
        const allPlatformIds = platforms.map(p => p.id);
        setSelectedPlatforms(allPlatformIds);
        setSelectedCampaigns([]);
        setSelectedAdSets([]);
        setSelectedAds([]);
        updateFilters({ platforms: allPlatformIds, campaigns: [], adSets: [], ads: [] });
        break;
      case 'campaigns':
        const allCampaignIds = availableCampaigns.map(c => c.id);
        setSelectedCampaigns(allCampaignIds);
        setSelectedAdSets([]);
        setSelectedAds([]);
        updateFilters({ campaigns: allCampaignIds, adSets: [], ads: [] });
        break;
      case 'adSets':
        const allAdSetIds = availableAdSets.map(as => as.id);
        setSelectedAdSets(allAdSetIds);
        setSelectedAds([]);
        updateFilters({ adSets: allAdSetIds, ads: [] });
        break;
      case 'ads':
        const allAdIds = availableAds.map(a => a.id);
        setSelectedAds(allAdIds);
        updateFilters({ ads: allAdIds });
        break;
    }
  };

  const handleClearAll = () => {
    setSelectedPlatforms([]);
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
    updateFilters({ platforms: [], campaigns: [], adSets: [], ads: [] });
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    updateFilters({ dateRange: update });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSelectionSummary = () => {
    const parts = [];
    if (selectedPlatforms.length > 0) {
      parts.push(`${selectedPlatforms.length} plataforma${selectedPlatforms.length > 1 ? 's' : ''}`);
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
    <Card className="mb-6">
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
              disabled={selectedPlatforms.length === 0}
            >
              Limpar Tudo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={Filter}
            >
              {showFilters ? 'Ocultar' : 'Expandir'}
            </Button>
          </div>
        </div>

        {/* Platform Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              1. Plataformas de Publicidade
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSelectAll('platforms')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Todas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const campaignCount = mockCampaigns.filter(c => c.platform.toLowerCase() === platform.id).length;
              
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={platform.logo} 
                        alt={platform.name}
                        className="w-8 h-8 object-contain"
                      />
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Hierarchical Filters */}
        {selectedPlatforms.length > 0 && (showFilters || selectedCampaigns.length > 0 || selectedAdSets.length > 0 || selectedAds.length > 0) && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            
            {/* Campaign Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => toggleSection('campaigns')}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.campaigns ? 'rotate-90' : ''}`} />
                  <span>2. Campanhas ({availableCampaigns.length} disponíveis)</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSelectAll('campaigns')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    disabled={availableCampaigns.length === 0}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCampaigns([]);
                      setSelectedAdSets([]);
                      setSelectedAds([]);
                      updateFilters({ campaigns: [], adSets: [], ads: [] });
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    disabled={selectedCampaigns.length === 0}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {expandedSections.campaigns && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                  {availableCampaigns.map((campaign) => {
                    const isSelected = selectedCampaigns.includes(campaign.id);
                    const platform = platforms.find(p => p.id === campaign.platform.toLowerCase());
                    
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => handleCampaignToggle(campaign.id)}
                        className={`
                          p-3 rounded-lg border text-left transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{campaign.name}</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              <span>{campaign.objective}</span>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <img src={platform?.logo} alt={campaign.platform} className="w-3 h-3" />
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
              )}
            </div>

            {/* Ad Set Selection */}
            {selectedCampaigns.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleSection('adSets')}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.adSets ? 'rotate-90' : ''}`} />
                    <span>3. Conjuntos de Anúncios ({availableAdSets.length} disponíveis)</span>
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSelectAll('adSets')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      disabled={availableAdSets.length === 0}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdSets([]);
                        setSelectedAds([]);
                        updateFilters({ adSets: [], ads: [] });
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      disabled={selectedAdSets.length === 0}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {expandedSections.adSets && (
                  <div className="grid grid-cols-1 gap-2 ml-6">
                    {availableAdSets.map((adSet) => {
                      const isSelected = selectedAdSets.includes(adSet.id);
                      const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
                      
                      return (
                        <button
                          key={adSet.id}
                          onClick={() => handleAdSetToggle(adSet.id)}
                          className={`
                            p-3 rounded-lg border text-left transition-all
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
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
                )}
              </div>
            )}

            {/* Ad Selection */}
            {selectedAdSets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleSection('ads')}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.ads ? 'rotate-90' : ''}`} />
                    <span>4. Anúncios ({availableAds.length} disponíveis)</span>
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSelectAll('ads')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      disabled={availableAds.length === 0}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAds([]);
                        updateFilters({ ads: [] });
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      disabled={selectedAds.length === 0}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {expandedSections.ads && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    {availableAds.map((ad) => {
                      const isSelected = selectedAds.includes(ad.id);
                      const adSet = mockAdSets.find(as => as.id === ad.ad_set_id);
                      
                      return (
                        <button
                          key={ad.id}
                          onClick={() => handleAdToggle(ad.id)}
                          className={`
                            p-3 rounded-lg border text-left transition-all
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
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
                )}
              </div>
            )}
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