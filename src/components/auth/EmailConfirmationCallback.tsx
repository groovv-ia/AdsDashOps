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
 * Suporta 3 formatos de callback do Supabase:
 * 1. PKCE com "code" (formato mais recente / padrão atual)
 * 2. PKCE com "token_hash" + "type" (formato alternativo)
 * 3. Hash fragment com "access_token" + "refresh_token" (formato legado)
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
     * Inicia countdown e redireciona ao dashboard após confirmação bem-sucedida
     */
    const startRedirectCountdown = () => {
      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(timer);
          // Usa replace para não voltar ao callback pelo botão "voltar" do navegador
          window.location.replace('/');
        }
      }, 1000);

      return timer;
    };

    /**
     * Marca a confirmação como bem-sucedida e inicia o countdown
     */
    const handleSuccess = () => {
      setError('');
      setSuccess(true);
      setLoading(false);
      onSuccess?.();
      return startRedirectCountdown();
    };

    /**
     * Trata erro na confirmação com mensagens descritivas em português
     */
    const handleError = (err: any) => {
      console.error('Error confirming email:', err);

      let errorMessage = 'Erro ao confirmar email. ';

      const msg = err?.message || '';
      if (msg.includes('Token has expired') || msg.includes('otp_expired')) {
        errorMessage += 'O link de confirmação expirou. Por favor, solicite um novo email de confirmação.';
      } else if (msg.includes('Invalid token') || msg.includes('otp_disabled')) {
        errorMessage += 'Link de confirmação inválido. Por favor, verifique se o link está correto.';
      } else if (msg.includes('Email already confirmed')) {
        errorMessage += 'Este email já foi confirmado. Você pode fazer login normalmente.';
      } else if (msg.includes('invalid flow state') || msg.includes('PKCE')) {
        errorMessage += 'Sessão de autenticação expirada. Tente solicitar um novo email de confirmação.';
      } else {
        errorMessage += msg || 'Tente novamente mais tarde.';
      }

      setSuccess(false);
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    };

    /**
     * Função principal que processa a confirmação de email.
     * Detecta automaticamente o formato do callback e usa o método apropriado.
     */
    const confirmEmail = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Verifica se há erro explícito nos parâmetros
        const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

        if (errorCode || errorDescription) {
          const errorMsg = decodeURIComponent(errorDescription || 'Erro ao confirmar email');
          handleError({ message: errorMsg });
          return;
        }

        // --- Formato 1: PKCE com authorization code (formato padrão mais recente) ---
        const code = queryParams.get('code');
        if (code) {
          console.log('Callback format: PKCE authorization code');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;
          if (!data.user) throw new Error('Usuário não encontrado após confirmação');

          console.log('Email confirmed successfully for user:', data.user.email);
          const timer = handleSuccess();
          return () => clearInterval(timer);
        }

        // --- Formato 2: PKCE com token_hash (formato alternativo) ---
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type) {
          console.log('Callback format: PKCE token_hash, type:', type);

          // Mapeia o type para o formato esperado pelo verifyOtp
          const otpType = type === 'signup' ? 'signup' : type === 'email' ? 'email' : type as any;

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) throw verifyError;
          if (!data.user) throw new Error('Usuário não encontrado após confirmação');

          console.log('Email confirmed successfully for user:', data.user.email);
          const timer = handleSuccess();
          return () => clearInterval(timer);
        }

        // --- Formato 3: Hash fragment com access_token (formato legado) ---
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          console.log('Callback format: legacy hash fragment');

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          if (!data.user) throw new Error('Usuário não encontrado após confirmação');

          console.log('Email confirmed successfully for user:', data.user.email);
          const timer = handleSuccess();
          return () => clearInterval(timer);
        }

        // Nenhum formato reconhecido -- token ausente
        handleError({ message: 'Token de confirmação inválido ou ausente. Verifique se você copiou o link completo do email.' });
      } catch (err: any) {
        handleError(err);
      }
    };

    confirmEmail();
  }, [onSuccess, onError]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Estado de carregamento */}
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

        {/* Estado de sucesso */}
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
              onClick={() => window.location.replace('/')}
              variant="primary"
              className="w-full"
            >
              Ir para o Dashboard Agora
            </Button>
          </div>
        )}

        {/* Estado de erro */}
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
                onClick={() => window.location.replace('/')}
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
