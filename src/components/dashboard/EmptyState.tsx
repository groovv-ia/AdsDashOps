import React from 'react';
import { Database, ArrowRight, CheckCircle, Zap, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface EmptyStateProps {
  onConnectClick: () => void;
}

/**
 * Componente EmptyState
 *
 * Exibido quando o usuário não possui fontes de dados conectadas.
 * Apresenta call-to-action claro para conectar a primeira fonte.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onConnectClick }) => {
  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <Card className="text-center p-12 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-100">
          {/* Ícone principal */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
              <Database className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Título e descrição */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Conecte Suas Campanhas de Publicidade
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Para começar a analisar o desempenho das suas campanhas, conecte suas contas de anúncios.
            O processo é rápido e seguro.
          </p>

          {/* Botão de ação principal */}
          <div className="mb-12">
            <Button
              onClick={onConnectClick}
              size="lg"
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
              icon={ArrowRight}
              iconPosition="right"
            >
              Conectar Primeira Fonte de Dados
            </Button>
          </div>

          {/* Benefícios em 3 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Rápido e Seguro</h3>
              <p className="text-sm text-gray-600">
                Conexão em menos de 2 minutos com autenticação OAuth segura
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-purple-100">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sincronização Automática</h3>
              <p className="text-sm text-gray-600">
                Seus dados são atualizados automaticamente todos os dias
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Análises Completas</h3>
              <p className="text-sm text-gray-600">
                Visualize todas as métricas importantes em um só lugar
              </p>
            </div>
          </div>

          {/* Plataformas suportadas */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Plataformas Suportadas:</p>
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <img src="/meta-icon.svg" alt="Meta" className="w-8 h-8" />
                <span className="text-sm font-medium text-gray-700">Meta Ads</span>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <img src="/google-ads-icon.svg" alt="Google" className="w-8 h-8 grayscale" />
                <span className="text-sm font-medium text-gray-700">Google Ads</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Em breve</span>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <img src="/tiktok-icon.svg" alt="TikTok" className="w-8 h-8 grayscale" />
                <span className="text-sm font-medium text-gray-700">TikTok Ads</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Em breve</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Dica adicional */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            💡 Dica: Você pode conectar múltiplas contas e plataformas para ter uma visão unificada
          </p>
        </div>
      </div>
    </div>
  );
};
