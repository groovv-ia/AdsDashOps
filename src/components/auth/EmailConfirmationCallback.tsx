import React, { useEffect, useState, useRef } from 'react';
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
 * Chave usada no sessionStorage para impedir que a confirmação seja processada
 * múltiplas vezes na mesma aba (o App re-renderiza em cada mudança de auth,
 * causando remontagens deste componente enquanto a URL ainda é /auth/callback).
 */
const CONFIRMATION_PROCESSED_KEY = 'email_confirmation_processed';

/**
 * Componente EmailConfirmationCallback
 *
 * Página de callback que processa a confirmação de email do usuário.
 * É exibida quando o usuário clica no link de confirmação enviado por email.
 *
 * Suporta 4 estratégias de detecção de sessão:
 * 1. PKCE com "code" (formato mais recente / padrão atual)
 * 2. PKCE com "token_hash" + "type" (formato alternativo)
 * 3. Hash fragment com "access_token" + "refresh_token" (formato legado)
 * 4. Fallback: escuta o evento SIGNED_IN do Supabase JS client, que processa
 *    automaticamente tokens do hash fragment quando o Supabase faz confirmação
 *    server-side (via {{ .ConfirmationURL }})
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
  // Ref para saber se o componente ainda está montado (evita setState em componente desmontado)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Se já processamos a confirmação nesta sessão do navegador (ex: remontagem),
    // redireciona direto sem reprocessar
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    /**
     * Inicia countdown de 5 segundos e redireciona ao dashboard
     */
    const startRedirectCountdown = () => {
      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft--;
        if (mountedRef.current) setCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.replace('/');
        }
      }, 1000);
      return timer;
    };

    /**
     * Marca a confirmação como bem-sucedida, salva no sessionStorage
     * para evitar reprocessamento em remontagens, e inicia o countdown
     */
    const handleSuccess = () => {
      sessionStorage.setItem(CONFIRMATION_PROCESSED_KEY, 'success');
      if (!mountedRef.current) return;
      setError('');
      setSuccess(true);
      setLoading(false);
      onSuccess?.();
      startRedirectCountdown();
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

      if (!mountedRef.current) return;
      setSuccess(false);
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    };

    /**
     * Aguarda o Supabase JS client estabelecer a sessão após confirmação server-side.
     *
     * Quando o Supabase confirma o email no servidor (via {{ .ConfirmationURL }}),
     * ele redireciona com tokens no hash fragment. O JS client consome esses tokens
     * automaticamente e emite o evento SIGNED_IN. Este método escuta esse evento
     * com um timeout de segurança de 4 segundos.
     *
     * @returns true se uma sessão ativa for detectada, false após timeout
     */
    const waitForSession = (): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;

        const finish = (value: boolean) => {
          if (resolved) return;
          resolved = true;
          resolve(value);
        };

        // Escuta eventos de auth — o SIGNED_IN é emitido quando o client processa tokens
        // e o INITIAL_SESSION quando já existe uma sessão armazenada
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            console.log('Session detected via auth listener:', event, session.user.email);
            subscription.unsubscribe();
            finish(true);
          }
        });

        // Timeout de 4 segundos — se nenhuma sessão for detectada, considera falha
        setTimeout(() => {
          subscription.unsubscribe();
          finish(false);
        }, 4000);
      });
    };

    /**
     * Função principal que processa a confirmação de email.
     * Detecta automaticamente o formato do callback e usa o método apropriado.
     * Se nenhum parâmetro for encontrado na URL, aguarda o Supabase client
     * processar os tokens automaticamente via auth state listener.
     */
    const confirmEmail = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        console.log('Callback params:', {
          search: window.location.search,
          hash: window.location.hash ? '(present)' : '(empty)',
          code: queryParams.get('code') ? 'yes' : 'no',
          token_hash: queryParams.get('token_hash') ? 'yes' : 'no',
          access_token: hashParams.get('access_token') ? 'yes' : 'no',
        });

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

          console.log('Email confirmed via PKCE code:', data.user.email);
          handleSuccess();
          return;
        }

        // --- Formato 2: PKCE com token_hash (formato alternativo) ---
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type) {
          console.log('Callback format: token_hash, type:', type);

          // Mapeia o type para o formato esperado pelo verifyOtp
          const otpType = type === 'signup' ? 'signup' : type === 'email' ? 'email' : type as any;

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) throw verifyError;
          if (!data.user) throw new Error('Usuário não encontrado após confirmação');

          console.log('Email confirmed via token_hash:', data.user.email);
          handleSuccess();
          return;
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

          console.log('Email confirmed via hash fragment:', data.user.email);
          handleSuccess();
          return;
        }

        // --- Formato 4: Fallback — aguarda o Supabase client processar tokens automaticamente ---
        // Quando o Supabase faz a confirmação server-side, ele pode redirecionar com tokens
        // no hash que são consumidos pelo JS client antes de nosso código executar.
        // Nesse caso, aguardamos o evento SIGNED_IN do auth listener.
        console.log('No explicit token params found, waiting for Supabase client to process session...');
        const sessionEstablished = await waitForSession();

        if (sessionEstablished) {
          handleSuccess();
          return;
        }

        // Nenhum formato reconhecido e sem sessão ativa após timeout
        handleError({
          message: 'Token de confirmação inválido ou ausente. Verifique se você copiou o link completo do email.',
        });
      } catch (err: any) {
        handleError(err);
      }
    };

    confirmEmail();

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Estado de carregamento — exibido enquanto processa a confirmação */}
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

        {/* Estado de sucesso — email confirmado com countdown para redirecionamento */}
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

        {/* Estado de erro — exibe mensagem de erro e opções de recuperação */}
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
                onClick={() => {
                  // Limpa o flag para permitir reprocessamento
                  sessionStorage.removeItem(CONFIRMATION_PROCESSED_KEY);
                  window.location.reload();
                }}
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
