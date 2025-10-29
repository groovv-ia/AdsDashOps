import React from 'react';
import { ArrowLeft, Shield, Mail, ExternalLink, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * Componente PrivacyPolicy
 *
 * Exibe a política de privacidade da AdsOps conforme LGPD.
 * Página acessível via /privacy-policy
 */
export const PrivacyPolicy: React.FC = () => {
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
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Política de Privacidade
          </h1>
          <p className="text-gray-600 text-lg">
            Válida a partir de outubro de 2025
          </p>
        </div>

        {/* Conteúdo */}
        <Card className="prose prose-blue max-w-none shadow-xl">
          <div className="space-y-6">
            {/* Introdução */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                POLÍTICA DE PRIVACIDADE — PRIME 2 B MARKETING DIGITAL LTDA
              </h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                A <strong>PRIME 2 B MARKETING DIGITAL LTDA</strong>, pessoa jurídica de direito privado, com sede na INDEPENDENCIA 3582 FIOREZE - VILA SAO JOSE DO RIO PRETO SP 15014400, inscrita no CNPJ/MF sob o nº 44443767000160 ("Lojista" ou "nós") leva a sua privacidade a sério e zela pela segurança e proteção de dados de todos os seus clientes, parceiros, fornecedores e usuários ("Usuários" ou "você") do site <a href="https://adsops.bolt.host" className="text-blue-600 hover:underline">https://adsops.bolt.host</a> e qualquer outro site, Loja, aplicativo operado pelo Lojista (aqui designados, simplesmente, "Loja").
              </p>

              <p className="text-gray-700 leading-relaxed mb-4">
                Esta Política de Privacidade ("Política de Privacidade") destina-se a informá-lo sobre o modo como nós utilizamos e divulgamos informações coletadas em suas visitas à nossa Loja e em mensagens que trocamos com você ("Comunicações").
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
                <p className="text-gray-800 font-medium">
                  AO ACESSAR A LOJA, ENVIAR COMUNICAÇÕES OU FORNECER QUALQUER TIPO DE DADO PESSOAL, VOCÊ DECLARA ESTAR CIENTE E DE ACORDO COM ESTA POLÍTICA DE PRIVACIDADE, A QUAL DESCREVE AS FINALIDADES E FORMAS DE TRATAMENTO DE SEUS DADOS PESSOAIS QUE VOCÊ DISPONIBILIZAR NA LOJA.
                </p>
              </div>

              <p className="text-gray-700 leading-relaxed mb-4">
                Esta Política de Privacidade fornece uma visão geral de nossas práticas de privacidade e das escolhas que você pode fazer, bem como direitos que você pode exercer em relação aos Dados Pessoais tratados por nós. Se você tiver alguma dúvida sobre o uso de Dados Pessoais, entre em contato com <a href="mailto:marketing@prime2b.digital" className="text-blue-600 hover:underline inline-flex items-center gap-1">marketing@prime2b.digital <Mail className="w-4 h-4" /></a>.
              </p>

              <p className="text-gray-700 leading-relaxed">
                Além disso, a Política de Privacidade não se aplica a quaisquer aplicativos, produtos, serviços, site ou recursos de mídia social de terceiros que possam ser oferecidos ou acessados por meio da Loja. O acesso a esses links fará com que você deixe a Loja e possa resultar na coleta ou compartilhamento de informações sobre você por terceiros. Nós não controlamos, endossamos ou fazemos quaisquer representações sobre esses sites de terceiros ou suas práticas de privacidade, que podem ser diferentes das nossas. Recomendamos que você revise a política de privacidade de qualquer site com o qual você interaja antes de permitir a coleta e o uso de seus Dados Pessoais.
              </p>
            </section>

            {/* Definições */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Definições</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Para os fins desta Política de Privacidade:
              </p>

              <ul className="space-y-3">
                <li className="text-gray-700">
                  <strong>"Dados Pessoais"</strong> significa qualquer informação que, direta ou indiretamente, identifique ou possa identificar uma pessoa natural, como por exemplo, nome, CPF, data de nascimento, endereço IP, dentre outros;
                </li>
                <li className="text-gray-700">
                  <strong>"Dados Pessoais Sensíveis"</strong> significa qualquer informação que revele, em relação a uma pessoa natural, origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico;
                </li>
                <li className="text-gray-700">
                  <strong>"Tratamento de Dados Pessoais"</strong> significa qualquer operação efetuada no âmbito dos Dados Pessoais, por meio de meios automáticos ou não, tal como a recolha, gravação, organização, estruturação, armazenamento, adaptação ou alteração, recuperação, consulta, utilização, divulgação por transmissão, disseminação ou, alternativamente, disponibilização, harmonização ou associação, restrição, eliminação ou destruição;
                </li>
                <li className="text-gray-700">
                  <strong>"Leis de Proteção de Dados"</strong> significa todas as disposições legais que regulem o Tratamento de Dados Pessoais, incluindo, porém sem se limitar, a Lei nº 13.709/18, Lei Geral de Proteção de Dados Pessoais ("LGPD").
                </li>
              </ul>
            </section>

            {/* Uso de Dados Pessoais */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Uso de Dados Pessoais</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Coletamos e usamos Dados Pessoais para gerenciar seu relacionamento conosco e melhor atendê-lo quando você estiver adquirindo produtos e/ou serviços na Loja, personalizando e melhorando sua experiência. Exemplos de como usamos os dados incluem:
              </p>

              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Viabilizar que você adquira produtos e/ou serviços na Loja;</li>
                <li>Para confirmar ou corrigir as informações que temos sobre você;</li>
                <li>Para enviar informações que acreditamos ser do seu interesse;</li>
                <li>Para personalizar sua experiência de uso da Loja;</li>
                <li>Para personalizar o envio de publicidades para você, baseada em seu interesse em nossa Loja; e</li>
                <li>Para entrarmos em contato por um número de telefone e/ou endereço de e-mail fornecido.</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 my-6">
                <p className="text-gray-800 font-medium">
                  A NOSSA LOJA NÃO SE DESTINA A PESSOAS COM MENOS DE 18 (DEZOITO) ANOS E PEDIMOS QUE TAIS PESSOAS NÃO NOS FORNEÇAM QUALQUER DADO PESSOAL
                </p>
              </div>
            </section>

            {/* Dados Coletados */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dados Coletados</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                O público em geral poderá navegar na Loja sem necessidade de qualquer cadastro e envio de Dados Pessoais. No entanto, algumas das funcionalidades da Loja poderão depender de cadastro e envio de Dados Pessoais.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">No contato à Loja, nós podemos coletar:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Dados de contato:</strong> Nome, sobrenome, número de telefone, cidade, Estado e endereço de e-mail;</li>
                <li><strong>Informações que você envia:</strong> Informações via formulário (dúvidas, reclamações, sugestões, críticas, elogios etc.).</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Na navegação geral na Loja:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Dados de localização:</strong> Dados de geolocalização quando você acessa a Loja;</li>
                <li><strong>Preferências:</strong> Informações sobre suas preferências e interesses;</li>
                <li><strong>Dados de navegação:</strong> Informações sobre suas visitas, incluindo conteúdo visualizado, navegador, dispositivo, endereço IP;</li>
                <li><strong>Dados anônimos ou agregados:</strong> Respostas anônimas para pesquisas.</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Uso de Cookies</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Quando você visita a Loja, ela pode armazenar ou recuperar informações em seu navegador, seja na forma de cookies e de outras tecnologias semelhantes.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Configurar cookies nos navegadores:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google Chrome
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <a href="https://support.mozilla.org/pt-BR/kb/cookies" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Mozilla Firefox
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <a href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Safari
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <a href="https://support.microsoft.com/pt-br/microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            {/* Direitos do Usuário */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Direitos do Usuário</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Você pode, a qualquer momento, requerer:
              </p>

              <ul className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Confirmação de que seus Dados Pessoais estão sendo tratados;</li>
                <li>Acesso aos seus Dados Pessoais;</li>
                <li>Correções a dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                <li>Portabilidade de Dados Pessoais a outro prestador de serviços;</li>
                <li>Eliminação de Dados Pessoais tratados com seu consentimento;</li>
                <li>Informações sobre as entidades às quais seus dados tenham sido compartilhados;</li>
                <li>Revogação do consentimento.</li>
              </ul>
            </section>

            {/* Segurança */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Segurança dos Dados Pessoais</h2>

              <p className="text-gray-700 leading-relaxed">
                Buscamos adotar as medidas técnicas e organizacionais previstas pelas Leis de Proteção de Dados adequadas para proteção dos Dados Pessoais na nossa organização. Infelizmente, nenhuma transmissão ou sistema de armazenamento de dados tem a garantia de serem 100% seguros. Caso tenha motivos para acreditar que sua interação conosco tenha deixado de ser segura, favor nos notificar imediatamente.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contato</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Caso pretenda exercer qualquer um dos direitos previstos nesta Política de Privacidade e/ou nas Leis de Proteção de Dados, ou resolver quaisquer dúvidas relacionadas ao Tratamento de seus Dados Pessoais, favor contatar-nos:
              </p>

              <div className="flex items-center gap-2 text-blue-600">
                <Mail className="w-5 h-5" />
                <a href="mailto:marketing@prime2b.digital" className="font-semibold hover:underline">
                  marketing@prime2b.digital
                </a>
              </div>
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
        </div>
      </div>
    </div>
  );
};
