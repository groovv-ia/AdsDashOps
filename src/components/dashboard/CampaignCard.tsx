import React from 'react';
import { CheckSquare, Square, Target, Calendar, DollarSign, TrendingUp } from 'lucide-react';

/**
 * Interface para informações da campanha
 */
interface CampaignInfo {
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
 * Props do componente CampaignCard
 */
interface CampaignCardProps {
  campaign: CampaignInfo;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  disabled?: boolean;
  showCheckbox?: boolean;
}

/**
 * Componente para exibir informações de uma campanha em formato de card
 *
 * Exibe:
 * - Nome da campanha
 * - Status (badge colorido)
 * - Objetivo da campanha
 * - Datas de início e fim
 * - Informações de orçamento
 * - Checkbox para seleção (opcional)
 *
 * @param campaign - Dados da campanha
 * @param isSelected - Se a campanha está selecionada
 * @param onToggleSelect - Callback ao selecionar/desselecionar
 * @param disabled - Se o card está desabilitado
 * @param showCheckbox - Se deve mostrar checkbox de seleção
 */
export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  isSelected = false,
  onToggleSelect,
  disabled = false,
  showCheckbox = true
}) => {
  /**
   * Retorna cor do badge baseado no status da campanha
   */
  const getStatusColor = (status: string): string => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE') return 'bg-green-100 text-green-800 border-green-300';
    if (statusUpper === 'PAUSED') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (statusUpper === 'ARCHIVED' || statusUpper === 'DELETED') return 'bg-red-100 text-red-800 border-red-300';
    if (statusUpper === 'IN_PROCESS') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  /**
   * Retorna texto legível do status
   */
  const getStatusText = (status: string): string => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE') return 'Ativa';
    if (statusUpper === 'PAUSED') return 'Pausada';
    if (statusUpper === 'ARCHIVED') return 'Arquivada';
    if (statusUpper === 'DELETED') return 'Deletada';
    if (statusUpper === 'IN_PROCESS') return 'Em Processamento';
    return status || 'Desconhecido';
  };

  /**
   * Retorna texto legível do objetivo
   */
  const getObjectiveText = (objective: string): string => {
    const objectiveMap: { [key: string]: string } = {
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_APP_PROMOTION': 'Promoção de App',
      'OUTCOME_AWARENESS': 'Reconhecimento',
      'LINK_CLICKS': 'Cliques no Link',
      'CONVERSIONS': 'Conversões',
      'BRAND_AWARENESS': 'Reconhecimento de Marca',
      'REACH': 'Alcance',
      'POST_ENGAGEMENT': 'Engajamento',
      'VIDEO_VIEWS': 'Visualizações de Vídeo'
    };

    return objectiveMap[objective] || objective;
  };

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number | undefined): string => {
    if (!value) return 'Não definido';
    // Meta retorna valores em centavos
    const valueInReais = value / 100;
    return `R$ ${valueInReais.toFixed(2)}`;
  };

  /**
   * Formata data
   */
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Não definida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Data inválida';
    }
  };

  /**
   * Determina qual orçamento mostrar (diário ou vitalício)
   */
  const getBudgetInfo = () => {
    if (campaign.daily_budget) {
      return {
        type: 'Orçamento Diário',
        value: formatCurrency(campaign.daily_budget)
      };
    }
    if (campaign.lifetime_budget) {
      return {
        type: 'Orçamento Vitalício',
        value: formatCurrency(campaign.lifetime_budget)
      };
    }
    return {
      type: 'Orçamento',
      value: 'Não definido'
    };
  };

  const budgetInfo = getBudgetInfo();

  return (
    <div
      onClick={onToggleSelect}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Checkbox de seleção */}
      {showCheckbox && (
        <div className="absolute top-3 right-3">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>
      )}

      {/* Nome da campanha */}
      <h3 className="font-semibold text-gray-900 mb-2 pr-8 line-clamp-2">
        {campaign.name}
      </h3>

      {/* Status e Objetivo */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
          {getStatusText(campaign.status)}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
          <Target className="w-3 h-3 mr-1" />
          {getObjectiveText(campaign.objective)}
        </span>
      </div>

      {/* Informações de datas */}
      <div className="space-y-2 text-sm mb-3">
        {campaign.start_time && (
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-xs">Início: {formatDate(campaign.start_time)}</span>
          </div>
        )}
        {campaign.stop_time && (
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-xs">Fim: {formatDate(campaign.stop_time)}</span>
          </div>
        )}
      </div>

      {/* Informações de orçamento */}
      <div className="border-t border-gray-200 pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 flex items-center">
            <DollarSign className="w-3 h-3 mr-1" />
            {budgetInfo.type}:
          </span>
          <span className="font-semibold text-gray-900">
            {budgetInfo.value}
          </span>
        </div>
        {campaign.budget_remaining !== undefined && campaign.budget_remaining > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Restante:
            </span>
            <span className="font-semibold text-green-700">
              {formatCurrency(campaign.budget_remaining)}
            </span>
          </div>
        )}
      </div>

      {/* Borda inferior destacada quando selecionado */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-lg" />
      )}
    </div>
  );
};
