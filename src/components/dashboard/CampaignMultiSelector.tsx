import React, { useState, useEffect } from 'react';
import { Search, Loader, AlertCircle, CheckSquare, Square, Filter, Target } from 'lucide-react';
import { CampaignCard } from './CampaignCard';
import { Button } from '../ui/Button';

/**
 * Interface para informações da campanha
 */
interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time?: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_remaining?: number;
}

/**
 * Props do componente CampaignMultiSelector
 */
interface CampaignMultiSelectorProps {
  accountId: string;
  accessToken: string;
  onConfirmSelection: (campaigns: Campaign[]) => void;
  onBack?: () => void;
  loading?: boolean;
}

/**
 * Componente para seleção múltipla de campanhas
 *
 * Fluxo:
 * 1. Busca todas as campanhas da conta via Meta Graph API
 * 2. Exibe campanhas em grid de cards com checkbox
 * 3. Permite seleção múltipla de campanhas
 * 4. Oferece filtros por status e busca por nome
 * 5. Callback é chamado com lista de campanhas selecionadas
 *
 * @param accountId - ID da conta Meta
 * @param accessToken - Token de acesso OAuth
 * @param onConfirmSelection - Callback com campanhas selecionadas
 * @param onBack - Callback para voltar
 * @param loading - Estado de loading externo
 */
export const CampaignMultiSelector: React.FC<CampaignMultiSelectorProps> = ({
  accountId,
  accessToken,
  onConfirmSelection,
  onBack,
  loading: externalLoading = false
}) => {
  // Estados do componente
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca todas as campanhas da conta
   */
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // Busca campanhas com todos os campos relevantes
        const fields = 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining';
        const url = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Erro ao buscar campanhas');
        }

        const campaignsList = data.data || [];

        if (campaignsList.length === 0) {
          setError('Nenhuma campanha encontrada nesta conta. Crie campanhas no Meta Ads Manager antes de continuar.');
          setCampaigns([]);
          setFilteredCampaigns([]);
        } else {
          setCampaigns(campaignsList);
          setFilteredCampaigns(campaignsList);

          // Pré-seleciona campanhas ativas por padrão
          const activeCampaignIds = campaignsList
            .filter((c: Campaign) => c.status === 'ACTIVE')
            .map((c: Campaign) => c.id);
          setSelectedCampaignIds(new Set(activeCampaignIds));
        }
      } catch (err: any) {
        console.error('Erro ao buscar campanhas:', err);
        setError(err.message || 'Erro ao buscar campanhas');
        setCampaigns([]);
        setFilteredCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    if (accountId && accessToken) {
      fetchCampaigns();
    }
  }, [accountId, accessToken]);

  /**
   * Aplica filtros de busca e status
   */
  useEffect(() => {
    let filtered = [...campaigns];

    // Filtro por texto de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(term) ||
        campaign.id.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  }, [searchTerm, statusFilter, campaigns]);

  /**
   * Handler para toggle de seleção individual
   */
  const handleToggleSelect = (campaignId: string) => {
    setSelectedCampaignIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  /**
   * Handler para selecionar todas as campanhas filtradas
   */
  const handleSelectAll = () => {
    const allFilteredIds = filteredCampaigns.map(c => c.id);
    setSelectedCampaignIds(new Set(allFilteredIds));
  };

  /**
   * Handler para limpar seleção
   */
  const handleClearSelection = () => {
    setSelectedCampaignIds(new Set());
  };

  /**
   * Handler para confirmar seleção
   */
  const handleConfirm = () => {
    if (selectedCampaignIds.size === 0) {
      setError('Selecione pelo menos uma campanha para continuar');
      return;
    }

    const selectedCampaigns = campaigns.filter(c => selectedCampaignIds.has(c.id));
    onConfirmSelection(selectedCampaigns);
  };

  /**
   * Calcula estatísticas de seleção
   */
  const selectionStats = {
    total: campaigns.length,
    selected: selectedCampaignIds.size,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    paused: campaigns.filter(c => c.status === 'PAUSED').length
  };

  /**
   * Renderiza estado de loading
   */
  if (loading || externalLoading) {
    return (
      <div className="text-center py-12">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Buscando campanhas da conta...</p>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  /**
   * Renderiza estado de erro
   */
  if (error && campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-red-800 mb-2 font-medium">Erro ao carregar campanhas</p>
        <p className="text-gray-600 mb-4">{error}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Target className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Selecione as Campanhas
        </h2>
        <p className="text-gray-600 mb-1">
          Escolha quais campanhas você deseja monitorar
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-3">
          <span>{selectionStats.selected} de {selectionStats.total} selecionadas</span>
          <span className="text-gray-300">•</span>
          <span className="text-green-600">{selectionStats.active} ativas</span>
          <span className="text-gray-300">•</span>
          <span className="text-yellow-600">{selectionStats.paused} pausadas</span>
        </div>
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar campanhas por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="PAUSED">Pausadas</option>
            <option value="ARCHIVED">Arquivadas</option>
          </select>
        </div>
      </div>

      {/* Controles de seleção */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
        <span className="text-sm font-medium text-gray-700">
          {selectedCampaignIds.size} {selectedCampaignIds.size === 1 ? 'campanha selecionada' : 'campanhas selecionadas'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <CheckSquare className="w-4 h-4" />
            Selecionar Todas ({filteredCampaigns.length})
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearSelection}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <Square className="w-4 h-4" />
            Limpar Seleção
          </button>
        </div>
      </div>

      {/* Grid de campanhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            isSelected={selectedCampaignIds.has(campaign.id)}
            onToggleSelect={() => handleToggleSelect(campaign.id)}
            disabled={loading}
            showCheckbox={true}
          />
        ))}
      </div>

      {/* Mensagem quando busca não retorna resultados */}
      {filteredCampaigns.length === 0 && (searchTerm || statusFilter !== 'ALL') && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Nenhuma campanha encontrada com os filtros aplicados
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm mt-2"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Mensagem de erro inline */}
      {error && campaigns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex items-center justify-between pt-4 border-t">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Voltar
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleConfirm}
          disabled={selectedCampaignIds.size === 0 || loading}
          loading={loading}
        >
          Confirmar Seleção ({selectedCampaignIds.size})
        </Button>
      </div>
    </div>
  );
};
