/**
 * ExtractedCampaignSelector - Seletor de Campanhas Sincronizadas
 *
 * Componente que lista todas as campanhas sincronizadas do usuario,
 * permitindo selecionar uma campanha para visualizar seus dados.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Target, ChevronRight, Layers, Image } from 'lucide-react';
import { campaignExtractedDataService, type ExtractedCampaign } from '../../lib/services/CampaignExtractedDataService';
import { Loading } from '../ui/Loading';

// ============================================
// Tipos e Interfaces
// ============================================

interface ExtractedCampaignSelectorProps {
  onSelectCampaign: (campaign: ExtractedCampaign) => void;
  selectedCampaignId?: string;
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Retorna cor e label do status
 */
function getStatusInfo(status: string): { color: string; label: string } {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'ACTIVE':
      return { color: 'bg-green-100 text-green-700', label: 'Ativa' };
    case 'PAUSED':
      return { color: 'bg-yellow-100 text-yellow-700', label: 'Pausada' };
    case 'DELETED':
    case 'ARCHIVED':
      return { color: 'bg-red-100 text-red-700', label: 'Arquivada' };
    default:
      return { color: 'bg-gray-100 text-gray-700', label: status };
  }
}

// ============================================
// Componente Principal
// ============================================

export function ExtractedCampaignSelector({
  onSelectCampaign,
  selectedCampaignId,
}: ExtractedCampaignSelectorProps) {
  // Estado local
  const [campaigns, setCampaigns] = useState<ExtractedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar campanhas ao montar
  useEffect(() => {
    loadCampaigns();
  }, []);

  /**
   * Carrega lista de campanhas
   */
  async function loadCampaigns() {
    setLoading(true);
    setError(null);

    const result = await campaignExtractedDataService.getCampaignsFromDataSets();

    if (result.success && result.campaigns) {
      setCampaigns(result.campaigns);
    } else {
      setError(result.error || 'Erro ao carregar campanhas');
    }

    setLoading(false);
  }

  // Filtrar campanhas pela busca
  const filteredCampaigns = useMemo(() => {
    if (!searchTerm.trim()) return campaigns;

    const term = searchTerm.toLowerCase();
    return campaigns.filter(
      c =>
        c.campaign_name.toLowerCase().includes(term) ||
        c.campaign_id.toLowerCase().includes(term)
    );
  }, [campaigns, searchTerm]);

  // Renderizar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
        <span className="ml-3 text-gray-500">Carregando campanhas...</span>
      </div>
    );
  }

  // Renderizar erro
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadCampaigns}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Renderizar estado vazio
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma campanha encontrada
        </h3>
        <p className="text-gray-500">
          Sincronize suas campanhas do Meta Ads para visualiza-las aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar campanhas..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      {/* Contador */}
      <div className="text-sm text-gray-500">
        {filteredCampaigns.length} de {campaigns.length} campanhas
      </div>

      {/* Lista de campanhas */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {filteredCampaigns.map(campaign => {
          const isSelected = selectedCampaignId === campaign.campaign_id;
          const statusInfo = getStatusInfo(campaign.status);

          return (
            <button
              key={campaign.campaign_id}
              onClick={() => onSelectCampaign(campaign)}
              className={`
                w-full text-left p-4 rounded-lg border transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Nome da campanha */}
                  <h4 className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {campaign.campaign_name}
                  </h4>

                  {/* ID da campanha */}
                  <p className="text-xs text-gray-500 mt-0.5">
                    ID: {campaign.campaign_id}
                  </p>

                  {/* Informacoes adicionais */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Plataforma */}
                    <span className={`
                      inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium
                      ${campaign.platform.toLowerCase() === 'meta'
                        ? 'bg-blue-100 text-blue-700'
                        : campaign.platform.toLowerCase() === 'google'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}>
                      {campaign.platform === 'Meta' ? 'Meta Ads' : campaign.platform}
                    </span>

                    {/* Status */}
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>

                    {/* Conjuntos de anuncios */}
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      {campaign.ad_sets_count} conjunto(s)
                    </span>

                    {/* Anuncios */}
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <Image className="w-3.5 h-3.5 mr-1" />
                      {campaign.ads_count} anuncio(s)
                    </span>
                  </div>

                  {/* Objetivo */}
                  {campaign.objective && (
                    <p className="text-xs text-gray-500 mt-2">
                      Objetivo: {campaign.objective}
                    </p>
                  )}
                </div>

                {/* Icone de selecao */}
                <ChevronRight className={`
                  w-5 h-5 flex-shrink-0 ml-2 transition-transform
                  ${isSelected ? 'text-blue-600 rotate-90' : 'text-gray-400'}
                `} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Mensagem se nenhum resultado na busca */}
      {filteredCampaigns.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nenhuma campanha encontrada para "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
