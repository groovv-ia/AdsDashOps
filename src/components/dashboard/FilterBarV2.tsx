/**
 * Barra de filtros hierárquicos - Versão 2
 *
 * Carrega opções dinamicamente baseadas na conexão ativa.
 * Hierarquia: Campanha → Ad Set → Anúncio
 * (Plataforma já está definida pela conexão selecionada)
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Download, BarChart3, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useCampaignsForConnection, useAdSetsForCampaign, useAdsForAdSet } from '../../hooks/useDashboardDataV2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface FilterBarV2Props {
  // ID da conexão ativa
  connectionId: string;

  // Callback quando filtros mudarem
  onFilterChange: (filters: any) => void;

  // Callback para exportar dados
  onExport: (format: 'csv' | 'pdf') => void;

  // Callback para atualizar dados
  onRefresh: () => void;
}

export const FilterBarV2: React.FC<FilterBarV2Props> = ({
  connectionId,
  onFilterChange,
  onExport,
  onRefresh
}) => {
  // Estados de seleção
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
    new Date()
  ]);

  // Estados de UI
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [showAdSetDropdown, setShowAdSetDropdown] = useState(false);
  const [showAdDropdown, setShowAdDropdown] = useState(false);

  // Carrega campanhas da conexão ativa
  const { campaigns, loading: campaignsLoading } = useCampaignsForConnection(connectionId);

  // Carrega ad sets das campanhas selecionadas
  const firstSelectedCampaign = selectedCampaigns[0] || '';
  const { adSets, loading: adSetsLoading } = useAdSetsForCampaign(firstSelectedCampaign);

  // Carrega anúncios do ad set selecionado
  const firstSelectedAdSet = selectedAdSets[0] || '';
  const { ads, loading: adsLoading } = useAdsForAdSet(firstSelectedAdSet);

  // Atualiza filtros quando seleções mudarem
  useEffect(() => {
    updateFilters({
      campaigns: selectedCampaigns,
      adSets: selectedAdSets,
      ads: selectedAds,
      dateRange
    });
  }, [selectedCampaigns, selectedAdSets, selectedAds, dateRange]);

  // Reseta filtros quando conexão mudar
  useEffect(() => {
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
  }, [connectionId]);

  const updateFilters = (updates: any) => {
    onFilterChange(updates);
  };

  // Handlers de seleção
  const handleCampaignToggle = (campaignId: string) => {
    const newSelected = selectedCampaigns.includes(campaignId)
      ? selectedCampaigns.filter(id => id !== campaignId)
      : [...selectedCampaigns, campaignId];

    setSelectedCampaigns(newSelected);
    setSelectedAdSets([]); // Reseta ad sets ao mudar campanha
    setSelectedAds([]); // Reseta anúncios ao mudar campanha
    setShowCampaignDropdown(false);
  };

  const handleAdSetToggle = (adSetId: string) => {
    const newSelected = selectedAdSets.includes(adSetId)
      ? selectedAdSets.filter(id => id !== adSetId)
      : [...selectedAdSets, adSetId];

    setSelectedAdSets(newSelected);
    setSelectedAds([]); // Reseta anúncios ao mudar ad set
    setShowAdSetDropdown(false);
  };

  const handleAdToggle = (adId: string) => {
    const newSelected = selectedAds.includes(adId)
      ? selectedAds.filter(id => id !== adId)
      : [...selectedAds, adId];

    setSelectedAds(newSelected);
    setShowAdDropdown(false);
  };

  const handleSelectAllCampaigns = () => {
    setSelectedCampaigns(campaigns.map(c => c.id));
    setSelectedAdSets([]);
    setSelectedAds([]);
    setShowCampaignDropdown(false);
  };

  const handleClearAll = () => {
    setSelectedCampaigns([]);
    setSelectedAdSets([]);
    setSelectedAds([]);
  };

  const handleDateRangeChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
  };

  // Funções auxiliares para exibição
  const getSelectedCampaignName = () => {
    if (selectedCampaigns.length === 0) return null;
    if (selectedCampaigns.length === 1) {
      const campaign = campaigns.find(c => c.id === selectedCampaigns[0]);
      return campaign?.name;
    }
    return `${selectedCampaigns.length} campanhas selecionadas`;
  };

  const getSelectedAdSetName = () => {
    if (selectedAdSets.length === 0) return null;
    if (selectedAdSets.length === 1) {
      const adSet = adSets.find(as => as.id === selectedAdSets[0]);
      return adSet?.name;
    }
    return `${selectedAdSets.length} conjuntos selecionados`;
  };

  const getSelectedAdName = () => {
    if (selectedAds.length === 0) return null;
    if (selectedAds.length === 1) {
      const ad = ads.find(a => a.id === selectedAds[0]);
      return ad?.name;
    }
    return `${selectedAds.length} anúncios selecionados`;
  };

  const getSelectionSummary = () => {
    const parts = [];
    if (selectedCampaigns.length > 0) {
      parts.push(`${selectedCampaigns.length} campanha${selectedCampaigns.length > 1 ? 's' : ''}`);
    }
    if (selectedAdSets.length > 0) {
      parts.push(`${selectedAdSets.length} conjunto${selectedAdSets.length > 1 ? 's' : ''}`);
    }
    if (selectedAds.length > 0) {
      parts.push(`${selectedAds.length} anúncio${selectedAds.length > 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Todos os dados da conta';
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
              disabled={selectedCampaigns.length === 0 && selectedAdSets.length === 0 && selectedAds.length === 0}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Seletor de Campanhas */}
        <div className="relative z-50">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">
              1. Campanhas
            </label>
            <span className="text-xs text-gray-500">
              {campaignsLoading ? 'Carregando...' : `${campaigns.length} disponíveis`}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
              disabled={campaignsLoading || campaigns.length === 0}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-gray-700 truncate">
                {getSelectedCampaignName() || 'Selecionar campanhas'}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showCampaignDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCampaignDropdown && campaigns.length > 0 && (
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
                      Selecionar todas ({campaigns.length})
                    </button>
                  </div>
                  {campaigns.map((campaign) => {
                    const isSelected = selectedCampaigns.includes(campaign.id);

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
                              <span>{campaign.status}</span>
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

        {/* Seletor de Ad Sets - Só aparece se campanhas selecionadas */}
        {selectedCampaigns.length > 0 && (
          <div className="relative z-40">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                2. Conjuntos de Anúncios
              </label>
              <span className="text-xs text-gray-500">
                {adSetsLoading ? 'Carregando...' : `${adSets.length} disponíveis`}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAdSetDropdown(!showAdSetDropdown)}
                disabled={adSetsLoading || adSets.length === 0}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-gray-700 truncate">
                  {getSelectedAdSetName() || 'Selecionar conjuntos de anúncios'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showAdSetDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAdSetDropdown && adSets.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-[90]"
                    onClick={() => setShowAdSetDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto">
                    {adSets.map((adSet) => {
                      const isSelected = selectedAdSets.includes(adSet.id);

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
                                Orçamento: R${adSet.daily_budget || adSet.lifetime_budget}/dia
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

        {/* Seletor de Anúncios - Só aparece se ad sets selecionados */}
        {selectedAdSets.length > 0 && (
          <div className="relative z-30">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                3. Anúncios
              </label>
              <span className="text-xs text-gray-500">
                {adsLoading ? 'Carregando...' : `${ads.length} disponíveis`}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAdDropdown(!showAdDropdown)}
                disabled={adsLoading || ads.length === 0}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-gray-700 truncate">
                  {getSelectedAdName() || 'Selecionar anúncios'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showAdDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAdDropdown && ads.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-[80]"
                    onClick={() => setShowAdDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-[90] max-h-60 overflow-y-auto">
                    {ads.map((ad) => {
                      const isSelected = selectedAds.includes(ad.id);

                      return (
                        <button
                          key={ad.id}
                          onClick={() => handleAdToggle(ad.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{ad.name}</div>
                              <div className="text-xs text-gray-500">
                                Tipo: {ad.ad_type} • Status: {ad.status}
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

        {/* Período e Ações */}
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
              className="px-6 py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl"
            >
              Atualizar Métricas
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
