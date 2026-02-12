import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { resetPassword } from '../../lib/supabase';

/**
 * Interface que define as propriedades do ForgotPasswordModal
 *
 * @property isOpen - Controla a visibilidade do modal
 * @property onClose - Callback ao fechar o modal
 * @property initialEmail - Email pré-preenchido vindo do formulário de login
 */
interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

/**
 * Componente ForgotPasswordModal
 *
 * Modal exibido quando o usuário clica em "Esqueceu a senha?" na tela de login.
 * Permite ao usuário solicitar um link de redefinição de senha por email.
 *
 * Funcionalidades:
 * - Campo de email pré-preenchido com o email do formulário de login
 * - Validação de email antes do envio
 * - Feedback visual de sucesso e erro
 * - Cooldown de 60 segundos entre envios para evitar spam
 * - Estados de loading durante o processamento
 */
export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  // Email digitado pelo usuário
  const [email, setEmail] = useState(initialEmail);

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Cooldown de 60 segundos entre reenvios
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Atualiza o email quando o modal é aberto com um novo initialEmail
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setSuccess(false);
      setError('');
    }
  }, [isOpen, initialEmail]);

  // Gerencia o timer de cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  /**
   * Envia o email de recuperação de senha via Supabase
   * e gerencia os estados de feedback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica do email
    if (!email.trim()) {
      setError('Por favor, informe seu email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, informe um email válido.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        // Tratamento de erros específicos
        const msg = (resetError as any)?.message || '';
        if (msg.includes('Email rate limit exceeded') || msg.includes('Too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
        } else if (msg.includes('User not found')) {
          // Por segurança, mostramos sucesso mesmo se o email não existe
          // para não expor informações sobre quais emails estão cadastrados
          setSuccess(true);
          setCooldownSeconds(60);
        } else {
          setError('Erro ao enviar email de recuperação. Tente novamente.');
        }
      } else {
        setSuccess(true);
        setCooldownSeconds(60);
      }
    } catch (err: any) {
      setError('Erro inesperado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recuperar Senha"
      size="md"
    >
      <div className="space-y-6">
        {/* Ícone e descrição */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 mb-4">
            <Mail className="h-7 w-7 text-blue-600" />
          </div>
          {!success ? (
            <p className="text-gray-600 text-sm">
              Informe o email da sua conta e enviaremos um link para redefinir sua senha.
            </p>
          ) : (
            <p className="text-gray-600 text-sm">
              Se este email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
          )}
        </div>

        {/* Formulário ou mensagem de sucesso */}
        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="seu@email.com"
                autoFocus
              />
            </div>

            {/* Mensagem de erro */}
            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Botão de enviar */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || cooldownSeconds > 0}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Enviando...
                </span>
              ) : cooldownSeconds > 0 ? (
                <span className="flex items-center justify-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Aguarde {cooldownSeconds}s
                </span>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Alerta de sucesso */}
            <Alert variant="success">
              <div className="space-y-2">
                <p className="font-medium">Email enviado!</p>
                <p className="text-sm">
                  Verifique sua caixa de entrada e a pasta de spam. O link de recuperação expira em 1 hora.
                </p>
              </div>
            </Alert>

            {/* Instruções */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>Abra o email do AdsOPS</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>Clique no link "Redefinir Minha Senha"</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>Crie uma nova senha segura</p>
              </div>
            </div>

            {/* Botão de reenviar */}
            <Button
              onClick={handleSubmit as any}
              variant="outline"
              className="w-full"
              disabled={loading || cooldownSeconds > 0}
            >
              {cooldownSeconds > 0 ? (
                <span className="flex items-center justify-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Reenviar em {cooldownSeconds}s
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Reenviar Email
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Botão voltar ao login */}
        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao Login
        </button>
      </div>
    </Modal>
  );
};
