import React, { useState } from 'react';
import { Calendar, Download, BarChart3, ChevronDown, X, Check, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';
import { mockCampaigns, mockAdSets, mockAds } from '../../data/mockData';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  onRefresh: () => void;
  hasConnectedSources?: boolean;
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
    logo: '/meta-icon.svg',
    color: 'bg-blue-500'
  },
  {
    id: 'google',
    name: 'Google Ads',
    logo: '/google-ads-icon.svg',
    color: 'bg-green-500'
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    logo: '/tiktok-icon.svg',
    color: 'bg-pink-500'
  }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  onExport,
  onRefresh,
  hasConnectedSources = true
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
    
    // Close dropdown after selection
    setShowCampaignDropdown(false);
    
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
    
    // Close dropdown after selection
    setShowAdSetDropdown(false);
    
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
    
    // Close dropdown after selection
    setShowAdDropdown(false);
    
    updateFilters({
      ads: newSelectedAds,
    });
  };

  const handleSelectAllCampaigns = () => {
    setSelectedCampaigns(availableCampaigns.map(c => c.id));
    setSelectedAdSets([]);
    setSelectedAds([]);
    
    // Close dropdown after selection
    setShowCampaignDropdown(false);
    
    updateFilters({ 
      campaigns: availableCampaigns.map(c => c.id), 
      adSets: [], 
      ads: [] 
    });
  };

  const handleSelectAllAdSets = () => {
    setSelectedAdSets(availableAdSets.map(as => as.id));
    setSelectedAds([]);
    
    // Close dropdown after selection
    setShowAdSetDropdown(false);
    
    updateFilters({ 
      adSets: availableAdSets.map(as => as.id), 
      ads: [] 
    });
  };

  const handleSelectAllAds = () => {
    setSelectedAds(availableAds.map(a => a.id));
    
    // Close dropdown after selection
    setShowAdDropdown(false);
    
    updateFilters({ 
      ads: availableAds.map(a => a.id) 
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

  // Helper functions to get selected item names
  const getSelectedCampaignName = () => {
    if (selectedCampaigns.length === 0) return null;
    if (selectedCampaigns.length === 1) {
      const campaign = mockCampaigns.find(c => c.id === selectedCampaigns[0]);
      return campaign?.name;
    }
    return `${selectedCampaigns.length} campanhas selecionadas`;
  };

  const getSelectedAdSetName = () => {
    if (selectedAdSets.length === 0) return null;
    if (selectedAdSets.length === 1) {
      const adSet = mockAdSets.find(as => as.id === selectedAdSets[0]);
      return adSet?.name;
    }
    return `${selectedAdSets.length} conjuntos selecionados`;
  };

  const getSelectedAdName = () => {
    if (selectedAds.length === 0) return null;
    if (selectedAds.length === 1) {
      const ad = mockAds.find(a => a.id === selectedAds[0]);
      return ad?.name;
    }
    return `${selectedAds.length} anúncios selecionados`;
  };

  return (
    <Card className="mb-6 relative z-10">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              Filtros de Análise
              {!hasConnectedSources && (
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Dados de demonstração
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">{getSelectionSummary()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={!selectedPlatform && selectedCampaigns.length === 0 && selectedAdSets.length === 0 && selectedAds.length === 0}
            >
              Limpar Tudo
            </Button>
          </div>
        </div>

        {/* Platform Selection - Single Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                1. Plataforma de Publicidade
              </label>
              <InfoTooltip
                content="Selecione a plataforma que deseja analisar. Você pode filtrar apenas uma plataforma por vez para visualizar métricas específicas."
                position="right"
              />
            </div>
            <span className="text-xs text-gray-500">Selecione apenas uma plataforma</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const isSelected = selectedPlatform === platform.id;
              const campaignCount = mockCampaigns.filter(c => c.platform.toLowerCase() === platform.id).length;
              const isDisabled = platform.id === 'google' || platform.id === 'tiktok';

              return (
                <button
                  key={platform.id}
                  onClick={() => !isDisabled && handlePlatformSelect(platform.id)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${isDisabled
                      ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Badge "Em breve" para plataformas desabilitadas */}
                  {isDisabled && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                        Em breve
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={platform.logo}
                        alt={platform.name}
                        className={`w-12 h-12 object-contain ${isDisabled ? 'grayscale opacity-50' : ''}`}
                      />
                      {isSelected && !isDisabled && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{platform.name}</h4>
                      <p className="text-sm text-gray-500">{campaignCount} campanhas</p>
                    </div>
                  </div>

                  {isSelected && !isDisabled && (
                    <div className="absolute top-3 right-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
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
                <span className="text-gray-700 truncate">
                  {getSelectedCampaignName() || 'Selecionar campanhas'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showCampaignDropdown ? 'rotate-180' : ''}`} />
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
                        onClick={handleSelectAllCampaigns}
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
                <span className="text-gray-700 truncate">
                  {getSelectedAdSetName() || 'Selecionar conjuntos de anúncios'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showAdSetDropdown ? 'rotate-180' : ''}`} />
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
                        onClick={handleSelectAllAdSets}
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
                <span className="text-gray-700 truncate">
                  {getSelectedAdName() || 'Selecionar anúncios'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showAdDropdown ? 'rotate-180' : ''}`} />
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
                        onClick={handleSelectAllAds}
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={onRefresh}
              icon={BarChart3}
              size="lg"
              className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
            >
              Gerar Análise de Métricas
            </Button>

            <div className="relative">
              <Button 
                variant="outline" 
                size="lg"
                icon={Download}
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-6 py-3"
                title="Exportar dados"
              />
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