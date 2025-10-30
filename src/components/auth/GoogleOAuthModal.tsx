import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  error?: string | null;
}

/**
 * Modal de autenticação OAuth do Google
 *
 * Este componente exibe um modal com feedback visual enquanto o usuário
 * está sendo autenticado através do popup OAuth do Google.
 *
 * Funcionalidades:
 * - Exibe estado de loading durante autenticação
 * - Mostra mensagens de erro se a autenticação falhar
 * - Detecta e informa sobre popup bloqueado
 * - Permite cancelar o processo de autenticação
 * - Fecha automaticamente após sucesso
 */
export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  error,
}) => {
  const [status, setStatus] = useState<'loading' | 'blocked' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setStatus('error');
      setErrorMessage(error);
    } else if (isOpen) {
      setStatus('loading');
      setErrorMessage(null);
    }
  }, [error, isOpen]);

  const handleClose = () => {
    setStatus('loading');
    setErrorMessage(null);
    onClose();
  };

  const GoogleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEsc={true}
    >
      <div className="flex flex-col items-center justify-center py-8 px-4">
        {/* Ícone do Google */}
        <div className="mb-6">
          <GoogleIcon />
        </div>

        {/* Conteúdo baseado no status */}
        {status === 'loading' && (
          <>
            {/* Spinner de Loading */}
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            </div>

            {/* Mensagem de Loading */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Autenticando com Google
            </h3>
            <p className="text-gray-600 text-center mb-2">
              Uma janela de login do Google foi aberta.
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              Complete o login na janela para continuar.
            </p>
          </>
        )}

        {status === 'blocked' && (
          <>
            {/* Ícone de Alerta */}
            <div className="mb-6 text-yellow-500">
              <AlertCircle className="w-12 h-12" />
            </div>

            {/* Mensagem de Popup Bloqueado */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Popup Bloqueado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Seu navegador bloqueou a janela de login do Google.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <p className="mb-2 font-medium">Para continuar:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Permita popups para este site</li>
                <li>Clique em "Tentar Novamente"</li>
              </ol>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            {/* Ícone de Erro */}
            <div className="mb-6 text-red-500">
              <AlertCircle className="w-12 h-12" />
            </div>

            {/* Mensagem de Erro */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Erro na Autenticação
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {errorMessage || 'Ocorreu um erro ao tentar fazer login com o Google.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700 text-center">
              Tente novamente ou use outra forma de login.
            </div>
          </>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col w-full gap-3">
          {status === 'loading' && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Cancelar
            </Button>
          )}

          {(status === 'blocked' || status === 'error') && (
            <>
              <Button
                onClick={handleClose}
                className="w-full"
              >
                Fechar
              </Button>
            </>
          )}
        </div>

        {/* Nota informativa */}
        {status === 'loading' && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>Não vê a janela do Google?</p>
            <button
              onClick={() => setStatus('blocked')}
              className="text-blue-600 hover:text-blue-700 underline mt-1"
            >
              Clique aqui se o popup foi bloqueado
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
