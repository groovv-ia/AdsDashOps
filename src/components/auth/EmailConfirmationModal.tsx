import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

/**
 * Interface que define as propriedades do componente EmailConfirmationModal
 *
 * @property isOpen - Controla se o modal está visível
 * @property onClose - Callback executado ao fechar o modal
 * @property email - Email do usuário que acabou de se cadastrar
 * @property onResendEmail - Função para reenviar email de confirmação
 */
interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onResendEmail: () => Promise<void>;
}

/**
 * Componente EmailConfirmationModal
 *
 * Modal exibido após cadastro bem-sucedido, informando ao usuário
 * que precisa confirmar seu email para acessar a plataforma.
 *
 * Funcionalidades:
 * - Exibe mensagem de sucesso do cadastro
 * - Instrui o usuário a verificar o email
 * - Permite reenviar email de confirmação
 * - Implementa cooldown de 60 segundos entre reenvios
 * - Fornece feedback visual de todas as ações
 */
export const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  onClose,
  email,
  onResendEmail,
}) => {
  // Estado para controlar se o email foi reenviado com sucesso
  const [resendSuccess, setResendSuccess] = useState(false);

  // Estado para controlar erros no reenvio
  const [resendError, setResendError] = useState('');

  // Estado para controlar o loading do botão de reenvio
  const [isResending, setIsResending] = useState(false);

  // Estado para controlar o cooldown (60 segundos)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Limpa os estados quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      setResendSuccess(false);
      setResendError('');
      setCooldownSeconds(0);
    }
  }, [isOpen]);

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
   * Função que trata o reenvio de email de confirmação
   * Implementa cooldown de 60 segundos e feedback visual
   */
  const handleResendEmail = async () => {
    // Previne reenvio durante cooldown
    if (cooldownSeconds > 0) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      // Chama a função de reenvio passada por props
      await onResendEmail();

      // Marca como sucesso e inicia cooldown
      setResendSuccess(true);
      setCooldownSeconds(60);

      // Remove mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error: any) {
      // Trata erros no reenvio
      setResendError(
        error?.message ||
        'Erro ao reenviar email. Tente novamente mais tarde.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirme seu Email"
      size="md"
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <div className="space-y-6">
        {/* Ícone e mensagem de sucesso */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Conta Criada com Sucesso!
          </h3>
          <p className="text-gray-600">
            Enviamos um email de confirmação para:
          </p>
          <p className="text-blue-600 font-medium mt-1">
            {email}
          </p>
        </div>

        {/* Instruções para o usuário */}
        <Alert variant="info" className="text-left">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Mail className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Próximos passos:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Verifique sua caixa de entrada</li>
                  <li>Abra o email de confirmação do AdsOPS</li>
                  <li>Clique no link de confirmação</li>
                  <li>Faça login na plataforma</li>
                </ol>
              </div>
            </div>
          </div>
        </Alert>

        {/* Alerta de sucesso no reenvio */}
        {resendSuccess && (
          <Alert variant="success" dismissible onDismiss={() => setResendSuccess(false)}>
            Email reenviado com sucesso! Verifique sua caixa de entrada.
          </Alert>
        )}

        {/* Alerta de erro no reenvio */}
        {resendError && (
          <Alert variant="error" dismissible onDismiss={() => setResendError('')}>
            {resendError}
          </Alert>
        )}

        {/* Informações adicionais */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Não recebeu o email?</strong> Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>

          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              O link de confirmação expira em 24 horas.
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleResendEmail}
            disabled={isResending || cooldownSeconds > 0}
            variant="outline"
            className="flex-1"
          >
            {isResending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                Reenviando...
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Aguarde {cooldownSeconds}s
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Reenviar Email
              </>
            )}
          </Button>

          <Button
            onClick={onClose}
            variant="primary"
            className="flex-1"
          >
            Entendi
          </Button>
        </div>

        {/* Link para suporte */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Precisa de ajuda?{' '}
            <a
              href="/suporte"
              className="text-blue-600 hover:text-blue-500 hover:underline font-medium"
            >
              Entre em contato com o suporte
            </a>
          </p>
        </div>
      </div>
    </Modal>
  );
};
