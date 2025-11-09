/**
 * Componente exibido durante sincronização inicial de dados
 *
 * Mostra progresso e feedback visual enquanto dados são importados
 * da fonte de dados conectada (Meta Ads, Google Ads, etc.)
 */

import React from 'react';
import { Loader, CheckCircle, Database, TrendingUp } from 'lucide-react';

interface SyncingStateProps {
  // Nome da conexão sendo sincronizada
  connectionName: string;

  // Plataforma (Meta, Google, TikTok)
  platform: string;

  // Logo da plataforma
  logo?: string;

  // Progresso opcional (0-100)
  progress?: number;

  // Mensagem de status atual
  statusMessage?: string;
}

export const SyncingState: React.FC<SyncingStateProps> = ({
  connectionName,
  platform,
  logo,
  progress,
  statusMessage
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Header com logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-6">
              {logo ? (
                <img src={logo} alt={platform} className="w-12 h-12 object-contain" />
              ) : (
                <Database className="w-10 h-10 text-white" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sincronizando dados...
            </h1>
            <p className="text-lg text-gray-600">
              {connectionName}
            </p>
          </div>

          {/* Animação de loading */}
          <div className="flex justify-center mb-8">
            <Loader className="w-16 h-16 text-blue-600 animate-spin" />
          </div>

          {/* Barra de progresso */}
          {progress !== undefined && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso</span>
                <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Mensagem de status */}
          {statusMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                {statusMessage}
              </p>
            </div>
          )}

          {/* Etapas da sincronização */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Conexão estabelecida</p>
                <p className="text-sm text-gray-600">
                  Conectado com sucesso à API do {platform}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5 animate-pulse">
                <Loader className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Importando dados</p>
                <p className="text-sm text-gray-600">
                  Buscando campanhas, conjuntos de anúncios e métricas dos últimos 7 dias
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mt-0.5">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-400">Processando métricas</p>
                <p className="text-sm text-gray-500">
                  Aguardando conclusão da importação
                </p>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-2"></div>
              </div>
              <div>
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Este processo pode levar alguns minutos
                </p>
                <p className="text-xs text-gray-600">
                  Você receberá uma notificação quando a sincronização for concluída.
                  Não feche esta página até que o processo termine.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dica útil */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            💡 Dica: Após a primeira sincronização, os dados serão atualizados automaticamente a cada 24 horas
          </p>
        </div>
      </div>
    </div>
  );
};
