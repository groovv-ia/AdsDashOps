import React, { useState } from 'react';
import { ArrowLeft, Trash2, Home, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

/**
 * Componente DataDeletionPolicy
 *
 * Exibe a política de exclusão de dados e formulário para solicitar exclusão.
 * Página acessível via /exclusao-de-dados
 */
export const DataDeletionPolicy: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    metaAccountId: '',
    reason: '',
    confirmDelete: false
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.confirmDelete) {
      setErrorMessage('Por favor, confirme que deseja excluir seus dados.');
      return;
    }

    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      // Obtem o usuario autenticado (pode ser null se nao estiver logado)
      const { data: { user } } = await supabase.auth.getUser();

      // Insere a solicitacao de exclusao no banco de dados
      const { error: insertError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: user?.id || null,
          full_name: formData.fullName,
          email: formData.email,
          meta_account_id: formData.metaAccountId,
          reason: formData.reason || null
        });

      if (insertError) throw insertError;

      setSubmitStatus('success');
      setFormData({
        fullName: '',
        email: '',
        metaAccountId: '',
        reason: '',
        confirmDelete: false
      });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Erro ao enviar solicitação. Tente novamente ou entre em contato por email.');
    }
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
            <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg">
              <Trash2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Política de Exclusão de Dados
          </h1>
          <p className="text-gray-600 text-lg">
            Válida a partir de outubro de 2025
          </p>
        </div>

        {/* Conteúdo */}
        <Card className="prose prose-blue max-w-none shadow-xl mb-8">
          <div className="space-y-6">
            {/* Introdução */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introdução</h2>

              <p className="text-gray-700 leading-relaxed">
                Esta Política de Exclusão de Dados descreve como o aplicativo <strong>AdsOPS</strong>, de propriedade da <strong>Prime2B Marketing Digital LTDA</strong>, trata e exclui os dados pessoais dos usuários coletados através de integrações com as plataformas Meta (Facebook e Instagram).
              </p>

              <p className="text-gray-700 leading-relaxed mt-4">
                O AdsOPS utiliza dados exclusivamente para fins de análise, otimização e automação de campanhas publicitárias. Nenhum dado é compartilhado com terceiros fora desse contexto.
              </p>
            </section>

            {/* Dados Coletados */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Dados Coletados</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Durante o uso do aplicativo AdsOPS, podemos coletar e processar os seguintes dados:
              </p>

              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Nome e ID de conta Meta (Facebook ou Instagram) vinculados ao gerenciador de anúncios.</li>
                <li>E-mail comercial do usuário (quando fornecido).</li>
                <li>Informações de campanhas, anúncios e contas de anúncios vinculadas.</li>
                <li>Dados de desempenho de campanhas, métricas e públicos-alvo.</li>
              </ul>

              <p className="text-gray-700 leading-relaxed mt-4">
                Esses dados são usados exclusivamente para geração de relatórios, análises e automações de mídia no contexto do AdsOPS.
              </p>
            </section>

            {/* Solicitação de Exclusão */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Solicitação de Exclusão de Dados</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                O usuário pode solicitar a exclusão de seus dados de duas formas:
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">a) Via formulário online</h3>
              <p className="text-gray-700 leading-relaxed mb-2">
                Acesse o formulário de solicitação de exclusão de dados:
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
                <p className="text-blue-800 font-medium">
                  👉 <a href="https://adsops.bolt.host/exclusao-de-dados" className="underline hover:text-blue-900">https://adsops.bolt.host/exclusao-de-dados</a>
                </p>
              </div>

              <p className="text-gray-700 leading-relaxed mb-2">No formulário, o usuário deverá informar:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Nome completo</li>
                <li>E-mail de registro</li>
                <li>ID da conta Meta ou identificador do aplicativo</li>
              </ul>

              <p className="text-gray-700 leading-relaxed mb-6">
                A solicitação será processada em até <strong>30 dias úteis</strong>.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">b) Via e-mail</h3>
              <p className="text-gray-700 leading-relaxed mb-2">
                Envie uma solicitação para:
              </p>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 my-4">
                <p className="text-green-800 font-medium">
                  📧 <a href="mailto:privacidade@prime2b.digital" className="underline hover:text-green-900">privacidade@prime2b.digital</a>
                </p>
              </div>

              <p className="text-gray-700 leading-relaxed mb-2">
                com o assunto <strong>"Exclusão de dados - AdsOPS"</strong> e as seguintes informações:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Nome completo</li>
                <li>Conta Meta vinculada</li>
                <li>E-mail utilizado no aplicativo</li>
              </ul>
            </section>

            {/* Processo de Exclusão */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Processo de Exclusão</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Após o recebimento da solicitação:
              </p>

              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>O sistema remove o vínculo do usuário no banco de dados do AdsOPS.</li>
                <li>Todos os registros associados são apagados de forma permanente em até 30 dias úteis.</li>
                <li>Nenhum dado será mantido em backups após a conclusão da exclusão.</li>
              </ul>
            </section>

            {/* Retenção e Segurança */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Retenção e Segurança</h2>

              <p className="text-gray-700 leading-relaxed">
                Os dados coletados são armazenados em ambiente seguro, com acesso restrito à equipe técnica da Prime2B.
                Não compartilhamos informações com terceiros fora do escopo de operação do AdsOPS.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contato</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Para dúvidas ou solicitações relacionadas à privacidade e exclusão de dados, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
              </p>

              <div className="space-y-2 text-gray-700">
                <p><strong>Prime2B Marketing Digital LTDA</strong></p>
                <p>CNPJ: 44.443.767/0001-60</p>
                <p>Rua Independência, 3582 – São José do Rio Preto/SP</p>
                <div className="flex items-center gap-2 text-blue-600 mt-3">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:privacidade@prime2b.digital" className="font-semibold hover:underline">
                    privacidade@prime2b.digital
                  </a>
                </div>
              </div>
            </section>

            {/* Observação */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Observação</h2>

              <p className="text-gray-700 leading-relaxed mb-4">
                Esta política pode ser atualizada periodicamente para refletir ajustes técnicos, legais ou operacionais.
                A versão mais recente estará sempre disponível em:
              </p>

              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                <p className="text-purple-800 font-medium">
                  👉 <a href="https://adsops.bolt.host/exclusao-de-dados" className="underline hover:text-purple-900">https://adsops.bolt.host/exclusao-de-dados</a>
                </p>
              </div>
            </section>
          </div>
        </Card>

        {/* Formulário de Solicitação */}
        <Card className="shadow-xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Solicitar Exclusão de Dados</h3>
            <p className="text-gray-600">
              Preencha o formulário abaixo para solicitar a exclusão permanente de seus dados pessoais.
            </p>
          </div>

          {submitStatus === 'success' ? (
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-lg font-semibold text-green-900 mb-2">
                    Solicitação Enviada com Sucesso!
                  </h4>
                  <p className="text-green-800 leading-relaxed">
                    Sua solicitação de exclusão de dados foi recebida e será processada em até 30 dias úteis.
                    Você receberá uma confirmação por e-mail quando o processo for concluído.
                  </p>
                  <Button
                    onClick={() => setSubmitStatus('idle')}
                    variant="outline"
                    className="mt-4"
                  >
                    Enviar Nova Solicitação
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail de Registro <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu.email@exemplo.com"
                />
              </div>

              <div>
                <label htmlFor="metaAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                  ID da Conta Meta <span className="text-red-500">*</span>
                </label>
                <input
                  id="metaAccountId"
                  type="text"
                  required
                  value={formData.metaAccountId}
                  onChange={(e) => setFormData({ ...formData, metaAccountId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ID da conta Facebook/Instagram vinculada"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe o ID da sua conta Meta (Facebook ou Instagram) vinculada ao AdsOPS
                </p>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da Solicitação (opcional)
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descreva brevemente o motivo da sua solicitação (opcional)"
                />
              </div>

              <div className="flex items-start">
                <input
                  id="confirmDelete"
                  type="checkbox"
                  checked={formData.confirmDelete}
                  onChange={(e) => setFormData({ ...formData, confirmDelete: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="confirmDelete" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Confirmo que desejo excluir permanentemente meus dados</span>
                  <p className="text-gray-500 mt-1">
                    Compreendo que esta ação é irreversível e todos os meus dados serão removidos do sistema em até 30 dias úteis.
                  </p>
                </label>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Importante:</strong> Após a exclusão dos dados, você não terá mais acesso às análises e relatórios
                  históricos associados à sua conta. Certifique-se de fazer backup de qualquer informação importante antes de prosseguir.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitStatus === 'loading'}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {submitStatus === 'loading' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Solicitação de Exclusão
                  </>
                )}
              </Button>
            </form>
          )}
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
            {' • '}
            <a href="/exclusao-de-dados" className="text-red-600 hover:underline font-medium">
              Exclusão de Dados
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
