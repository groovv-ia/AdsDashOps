import React from 'react';
import { ArrowLeft, FileText, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * Componente TermsOfService
 *
 * Exibe os termos de uso da AdsOps.
 * Página acessível via /terms-of-service
 */
export const TermsOfService: React.FC = () => {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header com Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={handleGoBack}
              icon={ArrowLeft}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Voltar
            </Button>
            <Button
              onClick={handleGoHome}
              icon={Home}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Ir para Home
            </Button>
          </div>

          {/* Logo AdsOps */}
          <div className="flex justify-center mb-8">
            <img
              src="/logotipo-adsops.fw.png"
              alt="AdsOps"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Termos de Uso
          </h1>
          <p className="text-gray-600 text-lg">
            Leia atentamente antes de utilizar nossos serviços
          </p>
        </div>

        {/* Conteúdo */}
        <Card className="prose prose-blue max-w-none shadow-xl">
          <div className="space-y-6">
            {/* Seção 1: Termos */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Termos</h2>

              <p className="text-gray-700 leading-relaxed">
                Ao acessar ao site <a href="https://adsops.bolt.host" className="text-blue-600 hover:underline font-medium">AdsOps</a>, concorda em cumprir estes termos de uso, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
              </p>
            </section>

            {/* Seção 2: Uso de Licença */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Uso de Licença</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site AdsOps, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
              </p>

              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>modificar ou copiar os materiais;</li>
                <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
                <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site AdsOps;</li>
                <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
                <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
              </ol>

              <p className="text-gray-700 leading-relaxed mt-4">
                Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por AdsOps a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.
              </p>
            </section>

            {/* Seção 3: Isenção de responsabilidade */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Isenção de Responsabilidade</h2>

              <ol className="list-decimal pl-6 space-y-4 text-gray-700">
                <li>
                  Os materiais no site da AdsOps são fornecidos 'como estão'. AdsOps não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.
                </li>
                <li>
                  Além disso, o AdsOps não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.
                </li>
              </ol>
            </section>

            {/* Seção 4: Limitações */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Limitações</h2>

              <p className="text-gray-700 leading-relaxed">
                Em nenhum caso o AdsOps ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em AdsOps, mesmo que AdsOps ou um representante autorizado da AdsOps tenha sido notificado oralmente ou por escrito da possibilidade de tais danos. Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos conseqüentes ou incidentais, essas limitações podem não se aplicar a você.
              </p>
            </section>

            {/* Seção 5: Precisão dos materiais */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Precisão dos Materiais</h2>

              <p className="text-gray-700 leading-relaxed">
                Os materiais exibidos no site da AdsOps podem incluir erros técnicos, tipográficos ou fotográficos. AdsOps não garante que qualquer material em seu site seja preciso, completo ou atual. AdsOps pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, AdsOps não se compromete a atualizar os materiais.
              </p>
            </section>

            {/* Seção 6: Links */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Links</h2>

              <p className="text-gray-700 leading-relaxed">
                O AdsOps não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por AdsOps do site. O uso de qualquer site vinculado é por conta e risco do usuário.
              </p>
            </section>

            {/* Modificações */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Modificações</h2>

              <p className="text-gray-700 leading-relaxed">
                O AdsOps pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
              </p>
            </section>

            {/* Lei aplicável */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Lei Aplicável</h2>

              <p className="text-gray-700 leading-relaxed">
                Estes termos e condições são regidos e interpretados de acordo com as leis do AdsOps e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
              </p>
            </section>

            {/* Nota importante */}
            <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Importante</h3>

              <p className="text-gray-700 leading-relaxed">
                Ao utilizar os serviços da AdsOps, você reconhece que leu, compreendeu e concorda em estar vinculado a estes Termos de Uso e à nossa <a href="/politica-de-privacidade" className="text-blue-600 hover:underline font-semibold">Política de Privacidade</a>.
              </p>
            </section>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logotipo-adsops.fw.png"
              alt="AdsOps"
              className="h-10 w-auto object-contain opacity-60"
            />
          </div>
          <p className="text-sm text-gray-500">© 2025 AdsOps - Todos os direitos reservados</p>
          <p className="text-xs text-gray-400 mt-2">PRIME 2 B MARKETING DIGITAL LTDA - CNPJ: 44.443.767/0001-60</p>
          <p className="mt-4 text-sm">
            <a href="/politica-de-privacidade" className="text-blue-600 hover:underline font-medium">
              Política de Privacidade
            </a>
            {' • '}
            <a href="/termos-de-uso" className="text-blue-600 hover:underline font-medium">
              Termos de Uso
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
