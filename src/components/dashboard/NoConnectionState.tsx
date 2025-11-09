/**
 * Componente exibido quando usuário não possui conexões de fontes de dados
 *
 * Este é o estado inicial que guia o usuário a conectar sua primeira fonte
 * de dados antes de poder acessar o dashboard e visualizar métricas.
 */

import React from 'react';
import { Database, TrendingUp, BarChart3, Zap, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface NoConnectionStateProps {
  // Callback quando usuário clicar para conectar primeira fonte
  onConnectClick: () => void;
}

export const NoConnectionState: React.FC<NoConnectionStateProps> = ({ onConnectClick }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header com ícone animado */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-6 animate-bounce">
            <Database className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao AdsOps Analytics!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Para começar a visualizar suas métricas de publicidade, você precisa conectar suas fontes de dados.
          </p>
        </div>

        {/* Cards de benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Métricas em Tempo Real</h3>
            <p className="text-sm text-gray-600">
              Visualize o desempenho das suas campanhas com dados atualizados automaticamente.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Análises Detalhadas</h3>
            <p className="text-sm text-gray-600">
              Filtre e analise campanhas, conjuntos de anúncios e anúncios individuais.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Insights com IA</h3>
            <p className="text-sm text-gray-600">
              Receba recomendações inteligentes para otimizar suas campanhas.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Conecte sua primeira fonte de dados
            </h2>
            <p className="text-gray-600">
              Atualmente suportamos Meta Ads (Facebook e Instagram). Mais plataformas em breve!
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4">
              <img src="/meta-icon.svg" alt="Meta Ads" className="w-12 h-12" />
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <img src="/google-ads-icon.svg" alt="Google Ads" className="w-12 h-12 grayscale opacity-30" />
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <img src="/tiktok-icon.svg" alt="TikTok Ads" className="w-12 h-12 grayscale opacity-30" />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={onConnectClick}
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              Conectar Meta Ads
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              🔒 Suas credenciais são armazenadas de forma segura e criptografada
            </p>
          </div>
        </div>

        {/* Rodapé com informações adicionais */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Precisa de ajuda?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 underline">
              Consulte nosso guia de configuração
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
