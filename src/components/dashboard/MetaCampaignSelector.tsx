import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  Search,
  Filter,
  X,
  AlertCircle,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/utils/logger';

/**
 * Interface para campanha vinda da Meta API
 */
interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startDate?: string;
  endDate?: string;
  platform: string;
}

interface MetaCampaignSelectorProps {
  /** ID da conexão Meta no banco */
  connectionId: string;
  /** ID da conta Meta */
  accountId: string;
  /** Nome da conta para exibição */
  accountName: string;
  /** Lista de campanhas disponíveis vindas da sincronização */
  campaigns: MetaCampaign[];
  /** Callback quando seleção for concluída */
  onSelectionComplete: () => void;
  /** Callback para cancelar seleção */
  onCancel?: () => void;
}

/**
 * Componente de seleção de campanhas Meta após sincronização
 *
 * Permite ao usuário escolher quais campanhas deseja monitorar no dashboard.
 * Exibe lista completa de campanhas com filtros e busca.
 * Salva seleção na tabela selected_campaigns do banco.
 *
 * Funcionalidades:
 * - Filtro por status (Todas, Ativas, Pausadas, Arquivadas)
 * - Busca por nome da campanha
 * - Seleção múltipla com checkboxes
 * - Botões "Selecionar Todas" e "Limpar Seleção"
 * - Validação: pelo menos uma campanha deve ser selecionada
 * - Persistência das seleções no banco de dados
 */
export const MetaCampaignSelector: React.FC<MetaCampaignSelectorProps> = ({
  connectionId,
  accountId,
  accountName,
  campaigns,
  onSelectionComplete,
  onCancel
}) => {
  // Estado para campanhas selecionadas (Set de IDs)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de controle
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /**
   * Filtra campanhas baseado em status e termo de busca
   */
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Filtro por status
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

      // Filtro por busca (case insensitive)
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [campaigns, statusFilter, searchTerm]);

  /**
   * Alterna seleção de uma campanha individual
   */
  const toggleCampaignSelection = (campaignId: string) => {
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
   * Seleciona todas as campanhas filtradas
   */
  const selectAll = () => {
    const allIds = new Set(filteredCampaigns.map(c => c.id));
    setSelectedCampaignIds(allIds);
  };

  /**
   * Limpa todas as seleções
   */
  const clearAll = () => {
    setSelectedCampaignIds(new Set());
  };

  /**
   * Formata valor monetário para exibição
   */
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Retorna badge de status com cores apropriadas
   */
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
      ACTIVE: { label: 'Ativo', variant: 'success' },
      PAUSED: { label: 'Pausado', variant: 'warning' },
      ARCHIVED: { label: 'Arquivado', variant: 'error' },
      DELETED: { label: 'Deletado', variant: 'error' },
    };

    const config = statusMap[status] || { label: status, variant: 'info' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Salva campanhas selecionadas no banco de dados
   */
  const handleSaveSelection = async () => {
    // Validação: pelo menos uma campanha deve ser selecionada
    if (selectedCampaignIds.size === 0) {
      setError('Selecione pelo menos uma campanha para continuar');
      return;
    }

    setSaving(true);
    setError('');

    try {
      logger.info('Salvando seleção de campanhas', {
        connectionId,
        accountId,
        selectedCount: selectedCampaignIds.size
      });

      // Busca informações do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Busca ou cria meta_account
      let metaAccountId: string;

      const { data: existingAccount } = await supabase
        .from('meta_accounts')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('account_id', accountId)
        .maybeSingle();

      if (existingAccount) {
        metaAccountId = existingAccount.id;
      } else {
        // Cria novo registro de meta_account
        const { data: newAccount, error: createError } = await supabase
          .from('meta_accounts')
          .insert({
            user_id: user.id,
            connection_id: connectionId,
            account_id: accountId,
            account_name: accountName,
            total_campaigns: campaigns.length,
            active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        metaAccountId = newAccount.id;
      }

      // Remove seleções antigas desta conta
      const { error: deleteError } = await supabase
        .from('selected_campaigns')
        .delete()
        .eq('meta_account_id', metaAccountId);

      if (deleteError) throw deleteError;

      // Insere novas seleções
      const selectedCampaignsData = Array.from(selectedCampaignIds).map(campaignId => {
        const campaign = campaigns.find(c => c.id === campaignId);
        return {
          user_id: user.id,
          connection_id: connectionId,
          meta_account_id: metaAccountId,
          campaign_id: campaignId,
          campaign_name: campaign?.name || 'Unknown Campaign'
        };
      });

      const { error: insertError } = await supabase
        .from('selected_campaigns')
        .insert(selectedCampaignsData);

      if (insertError) throw insertError;

      // Atualiza status da conexão para indicar seleção completa
      const { error: updateError } = await supabase
        .from('data_connections')
        .update({
          campaign_selection_completed: true,
          status: 'connected'
        })
        .eq('id', connectionId);

      if (updateError) throw updateError;

      logger.info('Seleção de campanhas salva com sucesso', {
        connectionId,
        metaAccountId,
        selectedCount: selectedCampaignIds.size
      });

      // Notifica conclusão
      onSelectionComplete();

    } catch (err: any) {
      logger.error('Erro ao salvar seleção de campanhas', err);
      setError(err.message || 'Erro ao salvar seleção de campanhas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Sincronização Concluída!
              </h2>
            </div>
            <p className="text-gray-700 mb-2">
              Encontramos <strong>{campaigns.length} campanhas</strong> na conta <strong>{accountName}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Selecione as campanhas que você deseja monitorar no dashboard. Você pode alterar essa seleção posteriormente.
            </p>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Filtros e Busca */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar campanhas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="ACTIVE">Somente Ativos</option>
              <option value="PAUSED">Pausados</option>
              <option value="ARCHIVED">Arquivados</option>
            </select>
          </div>

          {/* Botões de ação rápida */}
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={selectAll}
              disabled={filteredCampaigns.length === 0}
            >
              Selecionar Todas
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAll}
              disabled={selectedCampaignIds.size === 0}
            >
              Limpar Seleção
            </Button>
          </div>
        </div>

        {/* Contador de seleção */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-gray-600">
            Exibindo <strong>{filteredCampaigns.length}</strong> de <strong>{campaigns.length}</strong> campanhas
          </p>
          <p className="text-blue-600 font-semibold">
            {selectedCampaignIds.size} {selectedCampaignIds.size === 1 ? 'campanha selecionada' : 'campanhas selecionadas'}
          </p>
        </div>
      </Card>

      {/* Lista de Campanhas */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredCampaigns.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Nenhuma campanha encontrada com os filtros aplicados
            </p>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => {
            const isSelected = selectedCampaignIds.has(campaign.id);

            return (
              <Card
                key={campaign.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => toggleCampaignSelection(campaign.id)}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    {isSelected ? (
                      <CheckSquare className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Square className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  {/* Informações da Campanha */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          {getStatusBadge(campaign.status)}
                          <Badge variant="info">{campaign.objective}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Métricas da Campanha */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Orçamento Diário</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(campaign.dailyBudget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Orçamento Total</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(campaign.lifetimeBudget)}
                        </p>
                      </div>
                      {campaign.startDate && (
                        <div>
                          <p className="text-gray-500">Data de Início</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(campaign.startDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Botões de Ação */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedCampaignIds.size > 0 ? (
              <>
                Você selecionou <strong>{selectedCampaignIds.size}</strong>{' '}
                {selectedCampaignIds.size === 1 ? 'campanha' : 'campanhas'}
              </>
            ) : (
              'Selecione pelo menos uma campanha para continuar'
            )}
          </p>

          <div className="flex space-x-3">
            {onCancel && (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSaveSelection}
              disabled={saving || selectedCampaignIds.size === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Seleção
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
