import React from 'react';
import { RefreshCw, Clock, Database, Wifi } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Componente que exibe informações sobre a origem e atualização das métricas
 * Mostra se os dados vem da API em tempo real ou do banco de dados
 * Permite forçar atualização manual das métricas
 */
interface MetricsUpdateInfoProps {
  isUsingRealtimeMetrics: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
  onClearCache: () => void;
  loading?: boolean;
}

export const MetricsUpdateInfo: React.FC<MetricsUpdateInfoProps> = ({
  isUsingRealtimeMetrics,
  lastUpdate,
  onRefresh,
  onClearCache,
  loading = false
}) => {
  /**
   * Formata o tempo decorrido desde a última atualização
   */
  const getTimeSinceUpdate = (): string => {
    if (!lastUpdate) return 'Nunca';

    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffMinutes < 1) {
      return `há ${diffSeconds} segundos`;
    } else if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Indicador de fonte de dados */}
          <div className="flex items-center space-x-2">
            {isUsingRealtimeMetrics ? (
              <>
                <Wifi className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Dados em Tempo Real
                  </p>
                  <p className="text-xs text-gray-500">
                    Métricas direto da API Meta
                  </p>
                </div>
              </>
            ) : (
              <>
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Dados Demonstração
                  </p>
                  <p className="text-xs text-gray-500">
                    Conecte uma conta para ver dados reais
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Timestamp da última atualização */}
          {isUsingRealtimeMetrics && lastUpdate && (
            <div className="flex items-center space-x-2 border-l border-gray-300 pl-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Atualizado</p>
                <p className="text-sm font-medium text-gray-900">
                  {getTimeSinceUpdate()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controles de atualização */}
        <div className="flex items-center space-x-2">
          {isUsingRealtimeMetrics && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCache}
                disabled={loading}
                title="Limpar cache e forçar atualização"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar Cache
              </Button>
            </>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Atualizar métricas agora"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Badge de cache */}
      {isUsingRealtimeMetrics && (
        <div className="mt-3 flex items-center space-x-2">
          <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Cache ativo (5 minutos)
          </div>
          <p className="text-xs text-gray-500">
            As métricas são cacheadas por 5 minutos para otimizar o desempenho
          </p>
        </div>
      )}
    </div>
  );
};
