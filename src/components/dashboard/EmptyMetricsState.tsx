/**
 * Componente exibido quando conexão está ativa mas não há dados/métricas
 *
 * Pode ocorrer quando: conta não tem campanhas ativas, filtros não retornam resultados,
 * ou sincronização ainda não foi concluída.
 */

import React from 'react';
import { BarChart3, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyMetricsStateProps {
  // Tipo de estado vazio
  variant?: 'no-campaigns' | 'no-results' | 'sync-pending';

  // Nome da conta/conexão
  connectionName?: string;

  // Callback para sincronizar manualmente
  onSync?: () => void;

  // Callback para limpar filtros
  onClearFilters?: () => void;
}

export const EmptyMetricsState: React.FC<EmptyMetricsStateProps> = ({
  variant = 'no-campaigns',
  connectionName,
  onSync,
  onClearFilters
}) => {
  // Configurações baseadas no variant
  const config = {
    'no-campaigns': {
      icon: BarChart3,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-100',
      title: 'Nenhuma campanha encontrada',
      description: 'Esta conta não possui campanhas ativas no momento.',
      suggestions: [
        'Verifique se sua conta possui campanhas criadas',
        'Certifique-se de que as campanhas estão ativas',
        'Tente sincronizar novamente para atualizar os dados'
      ],
      action: onSync ? {
        label: 'Sincronizar Agora',
        icon: RefreshCw,
        onClick: onSync
      } : undefined
    },
    'no-results': {
      icon: Filter,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-100',
      title: 'Nenhum resultado encontrado',
      description: 'Os filtros aplicados não retornaram nenhuma métrica.',
      suggestions: [
        'Tente ajustar os filtros aplicados',
        'Selecione um período de datas diferente',
        'Verifique se as campanhas selecionadas possuem dados'
      ],
      action: onClearFilters ? {
        label: 'Limpar Filtros',
        icon: Filter,
        onClick: onClearFilters
      } : undefined
    },
    'sync-pending': {
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      title: 'Sincronização pendente',
      description: 'Os dados desta conta ainda não foram sincronizados.',
      suggestions: [
        'Inicie a sincronização para importar seus dados',
        'A primeira sincronização pode levar alguns minutos',
        'Você será notificado quando a sincronização for concluída'
      ],
      action: onSync ? {
        label: 'Iniciar Sincronização',
        icon: RefreshCw,
        onClick: onSync
      } : undefined
    }
  };

  const currentConfig = config[variant];
  const IconComponent = currentConfig.icon;

  return (
    <div className="flex items-center justify-center min-h-[500px] p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Ícone */}
        <div className={`inline-flex items-center justify-center w-20 h-20 ${currentConfig.bgColor} rounded-2xl mb-6`}>
          <IconComponent className={`w-10 h-10 ${currentConfig.iconColor}`} />
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {currentConfig.title}
        </h2>

        {/* Descrição */}
        <p className="text-lg text-gray-600 mb-6">
          {currentConfig.description}
        </p>

        {/* Nome da conexão se fornecido */}
        {connectionName && (
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg mb-6">
            <span className="text-sm font-medium text-gray-700">
              Conta: {connectionName}
            </span>
          </div>
        )}

        {/* Sugestões */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">O que você pode fazer:</h3>
          <ul className="space-y-3">
            {currentConfig.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                </div>
                <span className="text-sm text-gray-600 flex-1">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Botão de ação */}
        {currentConfig.action && (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={currentConfig.action.onClick}
              icon={currentConfig.action.icon}
              className="px-8 py-3"
            >
              {currentConfig.action.label}
            </Button>
          </div>
        )}

        {/* Link de ajuda */}
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Precisa de ajuda?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 underline">
              Consulte nossa documentação
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
