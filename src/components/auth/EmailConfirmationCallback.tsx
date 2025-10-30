import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

/**
 * Interface que define as propriedades do componente EmailConfirmationCallback
 *
 * @property onSuccess - Callback executado quando confirmação é bem-sucedida
 * @property onError - Callback executado quando há erro na confirmação
 */
interface EmailConfirmationCallbackProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Componente EmailConfirmationCallback
 *
 * Página de callback que processa a confirmação de email do usuário.
 * É exibida quando o usuário clica no link de confirmação enviado por email.
 *
 * Funcionalidades:
 * - Extrai e valida o token de confirmação da URL
 * - Processa a confirmação de email via Supabase
 * - Exibe mensagem de sucesso ou erro
 * - Redireciona automaticamente para o dashboard após sucesso
 * - Trata erros de token inválido ou expirado
 */
export const EmailConfirmationCallback: React.FC<EmailConfirmationCallbackProps> = ({
  onSuccess,
  onError,
}) => {
  // Estados para controle do fluxo de confirmação
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    /**
     * Função que processa a confirmação de email
     * Extrai os parâmetros da URL e valida o token
     */
    const confirmEmail = async () => {
      try {
        // Extrai os parâmetros da URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Tenta obter o token de diferentes formas (hash ou query params)
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        // Verifica se há erro nos parâmetros
        if (errorCode || errorDescription) {
          const errorMsg = decodeURIComponent(errorDescription || 'Erro ao confirmar email');
          setSuccess(false);
          setError(errorMsg);
          setLoading(false);
          onError?.(errorMsg);
          return;
        }

        // Log dos parâmetros recebidos para debug
        console.log('Callback params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

        // Verifica se é um callback de confirmação de email
        // O Supabase pode enviar type como 'signup', 'email', 'recovery', ou até mesmo vazio em alguns casos
        // Se temos tokens válidos, podemos prosseguir independentemente do type
        if (type && type !== 'signup' && type !== 'email' && type !== 'recovery') {
          setSuccess(false);
          setError('Tipo de confirmação inválido');
          setLoading(false);
          onError?.('Tipo de confirmação inválido');
          return;
        }

        // Verifica se os tokens estão presentes
        if (!accessToken || !refreshToken) {
          setSuccess(false);
          setError('Token de confirmação inválido ou ausente');
          setLoading(false);
          onError?.('Token de confirmação inválido ou ausente');
          return;
        }

        // Define a sessão do usuário com os tokens recebidos
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        if (!data.user) {
          throw new Error('Usuário não encontrado após confirmação');
        }

        // Confirmação bem-sucedida
        console.log('Email confirmed successfully for user:', data.user.email);
        setError('');
        setSuccess(true);
        setLoading(false);

        // Chama callback de sucesso
        onSuccess?.();

        // Inicia countdown para redirecionamento automático
        let timeLeft = 5;
        const timer = setInterval(() => {
          timeLeft--;
          setCountdown(timeLeft);

          if (timeLeft <= 0) {
            clearInterval(timer);
            // Redireciona para o dashboard
            window.location.href = '/';
          }
        }, 1000);

        return () => clearInterval(timer);
      } catch (err: any) {
        console.error('Error confirming email:', err);

        let errorMessage = 'Erro ao confirmar email. ';

        // Trata erros específicos
        if (err.message?.includes('Token has expired')) {
          errorMessage += 'O link de confirmação expirou. Por favor, solicite um novo email de confirmação.';
        } else if (err.message?.includes('Invalid token')) {
          errorMessage += 'Link de confirmação inválido. Por favor, verifique se o link está correto.';
        } else if (err.message?.includes('Email already confirmed')) {
          errorMessage += 'Este email já foi confirmado. Você pode fazer login normalmente.';
        } else {
          errorMessage += err.message || 'Tente novamente mais tarde.';
        }

        setSuccess(false);
        setError(errorMessage);
        setLoading(false);
        onError?.(errorMessage);
      }
    };

    confirmEmail();
  }, [onSuccess, onError]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {loading && !success && !error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Confirmando seu Email
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto validamos sua conta...
            </p>
          </div>
        )}

        {!loading && success && !error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Email Confirmado com Sucesso!
            </h2>
            <p className="text-gray-600 mb-6">
              Sua conta foi ativada. Você será redirecionado para o dashboard em {countdown} segundos...
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              variant="primary"
              className="w-full"
            >
              Ir para o Dashboard Agora
            </Button>
          </div>
        )}

        {!loading && !success && error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Erro na Confirmação
            </h2>
            <p className="text-red-600 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = '/'}
                variant="primary"
                className="w-full"
              >
                Voltar para o Login
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
