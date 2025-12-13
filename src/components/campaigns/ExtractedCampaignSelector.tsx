/**
 * ExtractedCampaignSelector - Seletor de Campanhas dos Dados Extraidos
 *
 * Componente que lista todas as campanhas encontradas nos data sets salvos,
 * permitindo ao usuario selecionar uma campanha para visualizar seus dados.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Database, Calendar, ChevronRight, Layers } from 'lucide-react';
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
   * Carrega lista de campanhas dos data sets
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

  /**
   * Formata o periodo de datas para exibicao
   */
  function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) return 'Sem periodo definido';
    if (!start) return `Ate ${formatDate(end!)}`;
    if (!end) return `A partir de ${formatDate(start)}`;
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  /**
   * Formata uma data individual
   */
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

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
        <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma campanha encontrada
        </h3>
        <p className="text-gray-500">
          Extraia dados das suas campanhas para visualiza-los aqui.
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
                      ${campaign.platform === 'meta'
                        ? 'bg-blue-100 text-blue-700'
                        : campaign.platform === 'google'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}>
                      {campaign.platform === 'meta' ? 'Meta Ads' : campaign.platform}
                    </span>

                    {/* Total de registros */}
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      {campaign.total_records.toLocaleString('pt-BR')} registros
                    </span>

                    {/* Numero de extracoes */}
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <Database className="w-3.5 h-3.5 mr-1" />
                      {campaign.data_set_ids.length} extracao(oes)
                    </span>
                  </div>

                  {/* Periodos disponiveis */}
                  {campaign.date_ranges.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {campaign.date_ranges.slice(0, 2).map(range => (
                        <div
                          key={range.data_set_id}
                          className="flex items-center text-xs text-gray-500"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                          <span className="truncate">
                            {range.data_set_name}: {formatDateRange(range.start, range.end)}
                          </span>
                        </div>
                      ))}
                      {campaign.date_ranges.length > 2 && (
                        <p className="text-xs text-gray-400 italic">
                          +{campaign.date_ranges.length - 2} periodo(s) adicional(is)
                        </p>
                      )}
                    </div>
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
