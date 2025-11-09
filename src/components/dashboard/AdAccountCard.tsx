import React from 'react';
import { CheckCircle, Building2, TrendingUp, Activity } from 'lucide-react';

/**
 * Interface para informações da conta de anúncios
 */
interface AdAccountInfo {
  id: string;
  account_id: string;
  account_name: string;
  account_status: string;
  total_campaigns: number;
  active_campaigns: number;
  account_type: 'PERSONAL' | 'CLIENT' | 'TEST';
  currency: string;
}

/**
 * Props do componente AdAccountCard
 */
interface AdAccountCardProps {
  account: AdAccountInfo;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Componente para exibir informações de uma conta de anúncios em formato de card
 *
 * Exibe:
 * - Nome da conta
 * - ID da conta
 * - Status da conta (badge colorido)
 * - Número de campanhas ativas
 * - Tipo de conta
 *
 * @param account - Dados da conta de anúncios
 * @param isSelected - Se o card está selecionado
 * @param onClick - Callback ao clicar no card
 * @param disabled - Se o card está desabilitado
 */
export const AdAccountCard: React.FC<AdAccountCardProps> = ({
  account,
  isSelected = false,
  onClick,
  disabled = false
}) => {
  /**
   * Retorna cor do badge baseado no status da conta
   */
  const getStatusColor = (status: string): string => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === '1') return 'bg-green-100 text-green-800 border-green-300';
    if (statusUpper === 'DISABLED' || statusUpper === '2') return 'bg-red-100 text-red-800 border-red-300';
    if (statusUpper === 'UNSETTLED' || statusUpper === '3') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  /**
   * Retorna texto legível do status da conta
   */
  const getStatusText = (status: string): string => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper === '1') return 'Ativa';
    if (statusUpper === 'DISABLED' || statusUpper === '2') return 'Desativada';
    if (statusUpper === 'UNSETTLED' || statusUpper === '3') return 'Pendente';
    return status || 'Desconhecido';
  };

  /**
   * Retorna cor e ícone baseado no tipo de conta
   */
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'CLIENT':
        return { color: 'text-blue-600 bg-blue-50', label: 'Cliente' };
      case 'TEST':
        return { color: 'text-purple-600 bg-purple-50', label: 'Teste' };
      case 'PERSONAL':
      default:
        return { color: 'text-gray-600 bg-gray-50', label: 'Pessoal' };
    }
  };

  const typeStyle = getTypeStyle(account.account_type);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full p-5 rounded-xl border-2 transition-all duration-200 text-left
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Indicador de seleção no canto superior direito */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-6 h-6 text-blue-600" />
        </div>
      )}

      {/* Cabeçalho do card com ícone e nome da conta */}
      <div className="flex items-start space-x-3 mb-4">
        <div className={`p-2 rounded-lg ${typeStyle.color}`}>
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg truncate">
            {account.account_name}
          </h3>
          <p className="text-sm text-gray-500 font-mono">
            ID: {account.account_id}
          </p>
        </div>
      </div>

      {/* Badges de status e tipo */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.account_status)}`}>
          <Activity className="w-3 h-3 mr-1" />
          {getStatusText(account.account_status)}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeStyle.color}`}>
          {typeStyle.label}
        </span>
      </div>

      {/* Informações de campanhas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Campanhas Ativas:</span>
          <span className="font-semibold text-gray-900 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            {account.active_campaigns}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total de Campanhas:</span>
          <span className="font-semibold text-gray-900">
            {account.total_campaigns}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Moeda:</span>
          <span className="font-semibold text-gray-900">
            {account.currency}
          </span>
        </div>
      </div>

      {/* Borda inferior destacada quando selecionado */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-xl" />
      )}
    </button>
  );
};
