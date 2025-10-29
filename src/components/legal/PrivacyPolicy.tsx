import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="medium"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={onBack}
      >
        Voltar
      </Button>

      <Card title="Política de Privacidade" padding="medium">
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">Última atualização: 29 de outubro de 2024</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">1. Introdução</h3>
          <p className="text-gray-600">
            Bem-vindo ao AdsOps. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações pessoais.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2. Informações que Coletamos</h3>
          <p className="text-gray-600">
            Coletamos informações que você nos fornece diretamente, como nome, email e dados de campanhas publicitárias.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">3. Como Usamos suas Informações</h3>
          <p className="text-gray-600">
            Utilizamos suas informações para fornecer e melhorar nossos serviços, processar transações e comunicar com você.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">4. Compartilhamento de Dados</h3>
          <p className="text-gray-600">
            Não vendemos seus dados pessoais. Compartilhamos informações apenas quando necessário para fornecer nossos serviços.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">5. Segurança</h3>
          <p className="text-gray-600">
            Implementamos medidas de segurança para proteger suas informações contra acesso não autorizado.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">6. Seus Direitos</h3>
          <p className="text-gray-600">
            Você tem direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">7. Contato</h3>
          <p className="text-gray-600">
            Para questões sobre esta política, entre em contato através da página de suporte.
          </p>
        </div>
      </Card>
    </div>
  );
};
