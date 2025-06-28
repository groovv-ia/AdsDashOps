import React, { useState } from 'react';
import { Calendar, Filter, Download, RefreshCw, ChevronDown, X, Check } from 'lucide-react';
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
  const [selectedAdSet, setSelectedAdSet] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [showAdSetDropdown, setShowAdSetDropdown] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter ad sets based on selected platforms
  const availableAdSets = mockAdSets.filter(adSet => {
    if (selectedPlatforms.length === 0) return false;
    const campaign = mockCampaigns.find(c => c.id === adSet.campaign_id);
    return campaign && selectedPlatforms.includes(campaign.platform.toLowerCase());
  });

  // Filter campaigns based on selected platforms and ad sets
  const availableCampaigns = mockCampaigns.filter(campaign => {
    if (selectedPlatforms.length === 0) return false;
    if (!selectedAdSet) return selectedPlatforms.includes(campaign.platform.toLowerCase());
    return availableAdSets.some(adSet => adSet.campaign_id === campaign.id && adSet.id === selectedAdSet);
  });

  const handlePlatformToggle = (platformId: string) => {
    const newSelectedPlatforms = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter(id => id !== platformId)
      : [...selectedPlatforms, platformId];
    
    setSelectedPlatforms(newSelectedPlatforms);
    setSelectedAdSet('');
    setSelectedCampaign('');
    
    onFilterChange({
      platforms: newSelectedPlatforms,
      adSet: '',
      campaign: '',
      dateRange,
    });
  };

  const handleSelectAllPlatforms = () => {
    const allPlatformIds = platforms.map(p => p.id);
    setSelectedPlatforms(allPlatformIds);
    setSelectedAdSet('');
    setSelectedCampaign('');
    
    onFilterChange({
      platforms: allPlatformIds,
      adSet: '',
      campaign: '',
      dateRange,
    });
  };

  const handleClearAllPlatforms = () => {
    setSelectedPlatforms([]);
    setSelectedAdSet('');
    setSelectedCampaign('');
    
    onFilterChange({
      platforms: [],
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
      platforms: selectedPlatforms,
      adSet: adSetId,
      campaign: '',
      dateRange,
    });
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setShowCampaignDropdown(false);
    
    onFilterChange({
      platforms: selectedPlatforms,
      adSet: selectedAdSet,
      campaign: campaignId,
      dateRange,
    });
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    onFilterChange({
      platforms: selectedPlatforms,
      adSet: selectedAdSet,
      campaign: selectedCampaign,
      dateRange: update,
    });
  };

  const selectedAdSetData = mockAdSets.find(a => a.id === selectedAdSet);
  const selectedCampaignData = mockCampaigns.find(c => c.id === selectedCampaign);

  const getActivePlatformsText = () => {
    if (selectedPlatforms.length === 0) return 'Nenhuma plataforma selecionada';
    if (selectedPlatforms.length === platforms.length) return 'Todas as plataformas';
    if (selectedPlatforms.length === 1) {
      const platform = platforms.find(p => p.id === selectedPlatforms[0]);
      return platform?.name || 'Plataforma selecionada';
    }
    return `${selectedPlatforms.length} plataformas selecionadas`;
  };

  return (
    <Card className="mb-6">
      <div className="space-y-6">
        {/* Quick Platform Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Filtros de Análise</h3>
              <p className="text-sm text-gray-600">Selecione as plataformas e configure os filtros</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={Filter}
            >
              {showFilters ? 'Ocultar Filtros' : 'Mais Filtros'}
            </Button>
          </div>

          {/* Platform Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Plataformas de Publicidade
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAllPlatforms}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Selecionar Todas
                </button>
                <span className="text-xs text-gray-400">•</span>
                <button
                  onClick={handleClearAllPlatforms}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
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
                        <p className="text-xs text-gray-500">
                          {mockCampaigns.filter(c => c.platform.toLowerCase() === platform.id).length} campanhas
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Platforms Summary */}
            {selectedPlatforms.length > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    {getActivePlatformsText()}
                  </span>
                </div>
                <button
                  onClick={handleClearAllPlatforms}
                  className="text-blue-600 hover:text-blue-800"
                  title="Limpar seleção"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && selectedPlatforms.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Ad Set Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Grupo de Anúncios (Opcional)
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowAdSetDropdown(!showAdSetDropdown)}
                  className="w-full lg:w-80 flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {selectedAdSetData ? (
                    <div>
                      <div className="font-medium text-gray-900">{selectedAdSetData.name}</div>
                      <div className="text-sm text-gray-500">{selectedAdSetData.targeting}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Todos os grupos de anúncios</span>
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
                      <button
                        onClick={() => {
                          setSelectedAdSet('');
                          setShowAdSetDropdown(false);
                          onFilterChange({
                            platforms: selectedPlatforms,
                            adSet: '',
                            campaign: selectedCampaign,
                            dateRange,
                          });
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 font-medium text-gray-600"
                      >
                        Todos os grupos de anúncios
                      </button>
                      {availableAdSets.length > 0 ? (
                        availableAdSets.map((adSet) => (
                          <button
                            key={adSet.id}
                            onClick={() => handleAdSetSelect(adSet.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
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

            {/* Campaign Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Campanha Específica (Opcional)
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
                  className="w-full lg:w-80 flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {selectedCampaignData ? (
                    <div>
                      <div className="font-medium text-gray-900">{selectedCampaignData.name}</div>
                      <div className="text-sm text-gray-500">{selectedCampaignData.objective} • {selectedCampaignData.platform}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Todas as campanhas</span>
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
                      <button
                        onClick={() => {
                          setSelectedCampaign('');
                          setShowCampaignDropdown(false);
                          onFilterChange({
                            platforms: selectedPlatforms,
                            adSet: selectedAdSet,
                            campaign: '',
                            dateRange,
                          });
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 font-medium text-gray-600"
                      >
                        Todas as campanhas
                      </button>
                      {availableCampaigns.length > 0 ? (
                        availableCampaigns.map((campaign) => (
                          <button
                            key={campaign.id}
                            onClick={() => handleCampaignSelect(campaign.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{campaign.name}</div>
                            <div className="text-sm text-gray-500">{campaign.objective} • {campaign.platform} • {campaign.status}</div>
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