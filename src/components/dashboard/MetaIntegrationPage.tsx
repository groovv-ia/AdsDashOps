import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { MetaTokenManager } from './MetaTokenManager';
import { MetaSyncManager } from './MetaSyncManager';

/**
 * Página dedicada para gerenciar a integração com Meta Ads
 * Combina o gerenciamento de tokens e sincronização de dados
 */
export const MetaIntegrationPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integração Meta Ads</h2>
          <p className="text-gray-600">
            Configure e sincronize seus dados do Facebook e Instagram Ads
          </p>
        </div>
      </div>

      {/* Seção 1: Gerenciamento de Token */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Passo 1: Conectar Conta
        </h3>
        <MetaTokenManager />
      </div>

      {/* Seção 2: Sincronização de Dados */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Passo 2: Sincronizar Dados
        </h3>
        <MetaSyncManager />
      </div>

      {/* Informações adicionais */}
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">
          📖 Sobre a Integração Meta Ads
        </h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>O que é sincronizado:</strong> A integração importa todas as suas campanhas ativas
            e inativas, juntamente com métricas de desempenho como impressões, cliques, gastos,
            conversões e ROAS.
          </p>
          <p>
            <strong>Segurança:</strong> Seu access token é armazenado de forma criptografada no banco
            de dados e nunca é exposto no frontend.
          </p>
          <p>
            <strong>Frequência recomendada:</strong> Execute a sincronização diariamente para manter
            seus dados atualizados. Você pode fazer isso manualmente ou configurar sincronização
            automática.
          </p>
          <p>
            <strong>Múltiplas contas:</strong> Você pode conectar múltiplas contas publicitárias. Cada
            conta precisa ser adicionada separadamente usando seu próprio access token.
          </p>
        </div>
      </div>

      {/* Links úteis */}
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">
          🔗 Links Úteis
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              → Graph API Explorer (obter access token)
            </a>
          </li>
          <li>
            <a
              href="https://developers.facebook.com/docs/marketing-api"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              → Documentação Meta Marketing API
            </a>
          </li>
          <li>
            <a
              href="https://business.facebook.com/settings/ad-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              → Gerenciar Contas Publicitárias
            </a>
          </li>
          <li>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              → Meus Apps da Meta
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
