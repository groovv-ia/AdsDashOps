import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Campaign, AdSet, Ad } from '../../types/advertising';
import { mockCampaigns, mockAdSets, mockAds } from '../../data/mockData';

interface CampaignSelectorProps {
  onSelectionChange: (selection: {
    platform: string;
    campaigns: string[];
    adSets: string[];
    ads: string[];
  }) => void;
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

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  onSelectionChange
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  
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

  const updateSelection = (updates: any) => {
    const newSelection = {
      platform: selectedPlatform,
      campaigns: selectedCampaigns,
      adSets: selectedAdSets,
      ads: selectedAds,
      ...updates,
    };
    
    onSelectionChange(newSelection);
  };

  const handlePlatformSelect = (platformId: string) => {
    const newSelectedPlatform = selectedPlatform === platformId ? '' : platformId;
    
    setSelectedPlatform(newSelectedPlatform);
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
    
    updateSelection({
      platform: newSelectedPlatform,
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
    setShowCampaignDropdown(false);
    
    updateSelection({
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
    setShowAdSetDropdown(false);
    
    updateSelection({
      adSets: newSelectedAdSets,
      ads: [],
    });
  };

  const handleAdToggle = (adId: string) => {
    const newSelectedAds = selectedAds.includes(adId)
      ? selectedAds.filter(id => id !== adId)
      : [...selectedAds, adId];
    
    setSelectedAds(newSelectedAds);
    setShowAdDropdown(false);
    
    updateSelection({
      ads: newSelectedAds,
    });
  };

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
    <Card>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleção para Análise</h3>
          <p className="text-sm text-gray-600">
            Escolha os elementos específicos que deseja analisar com IA ou deixe em branco para analisar tudo
          </p>
        </div>

        {/* Platform Selection */}
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
                      <img 
                        src={platform.logo} 
                        alt={platform.name}
                        className="w-10 h-10 object-contain"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                      <p className="text-sm text-gray-500">{campaignCount} campanhas</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campaign Selection */}
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

        {/* Ad Set Selection */}
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

        {/* Ad Selection */}
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

        {/* Selection Summary */}
        {(selectedPlatform || selectedCampaigns.length > 0 || selectedAdSets.length > 0 || selectedAds.length > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Seleção Atual:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Plataforma: {selectedPlatform ? platforms.find(p => p.id === selectedPlatform)?.name : 'Todas'}</div>
              <div>Campanhas: {selectedCampaigns.length > 0 ? `${selectedCampaigns.length} selecionadas` : 'Todas'}</div>
              <div>Conjuntos: {selectedAdSets.length > 0 ? `${selectedAdSets.length} selecionados` : 'Todos'}</div>
              <div>Anúncios: {selectedAds.length > 0 ? `${selectedAds.length} selecionados` : 'Todos'}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};