import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

/**
 * Props do componente EmailConfirmationCallback
 */
interface EmailConfirmationCallbackProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Chave no sessionStorage para evitar reprocessamento em remontagens
 */
const CONFIRMATION_PROCESSED_KEY = 'email_confirmation_processed';

/**
 * Processa o callback de confirmacao de email.
 *
 * O Supabase redireciona para /auth/callback com tokens no hash fragment:
 *   https://site.com/auth/callback#access_token=...&refresh_token=...&type=signup
 *
 * Com flowType: 'implicit' configurado no cliente, o SDK detecta e processa
 * esses tokens automaticamente no createClient(). O componente apenas
 * aguarda a sessao ficar disponivel e redireciona para o dashboard.
 *
 * Para recuperacao de senha (type=recovery), o redirect vai para /reset-password,
 * nao para este componente.
 */
export const EmailConfirmationCallback: React.FC<EmailConfirmationCallbackProps> = ({
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Ja processamos com sucesso antes nesta aba — redireciona direto
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    /** Inicia countdown de 5s e redireciona ao dashboard */
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

    /** Marca sucesso, salva flag e inicia countdown */
    const handleSuccess = () => {
      sessionStorage.setItem(CONFIRMATION_PROCESSED_KEY, 'success');
      if (!mountedRef.current) return;
      setError('');
      setSuccess(true);
      setLoading(false);
      onSuccess?.();
      startRedirectCountdown();
    };

    /** Trata erros com mensagens amigaveis */
    const handleError = (err: any) => {
      console.error('[EmailConfirmation] Error:', err);
      const msg: string = err?.message || String(err) || '';

      let errorMessage = '';
      if (msg.includes('Token has expired') || msg.includes('otp_expired')) {
        errorMessage = 'O link de confirmacao expirou. Faca login e solicite um novo email de confirmacao.';
      } else if (msg.includes('Email already confirmed')) {
        errorMessage = 'Este email ja foi confirmado. Voce pode fazer login normalmente.';
      } else if (msg.includes('invalid flow state') || msg.includes('PKCE') || msg.includes('code verifier')) {
        // Email foi confirmado server-side mas sessao nao pode ser criada no navegador atual
        errorMessage = 'Seu email foi confirmado! Para acessar a plataforma, faca login normalmente.';
      } else if (msg.includes('Invalid token') || msg.includes('otp_disabled')) {
        errorMessage = 'Link de confirmacao invalido. Tente fazer login — seu email pode ja estar confirmado.';
      } else if (msg) {
        errorMessage = `Nao foi possivel confirmar automaticamente: ${msg}. Tente fazer login.`;
      } else {
        errorMessage = 'Nao foi possivel confirmar automaticamente. Tente fazer login — seu email pode ja ter sido confirmado.';
      }

      if (!mountedRef.current) return;
      setSuccess(false);
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    };

    /**
     * Aguarda o SDK estabelecer sessao apos processar o hash fragment.
     *
     * Com flowType: 'implicit', o createClient() inicia o processamento
     * do hash de forma assincrona. Combinamos listener de auth com polling
     * para capturar a sessao assim que ficar disponivel.
     *
     * Timeout: 12 segundos (suficiente para qualquer conexao lenta).
     */
    const waitForSession = (): Promise<{ session: any } | null> => {
      return new Promise((resolve) => {
        let resolved = false;

        const finish = (result: { session: any } | null) => {
          if (resolved) return;
          resolved = true;
          subscription?.data?.subscription?.unsubscribe?.();
          clearInterval(pollInterval);
          clearTimeout(timeout);
          resolve(result);
        };

        // Listener de eventos de auth — captura SIGNED_IN emitido pelo SDK
        const subscription = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[EmailConfirmation] Auth event:', event, session?.user?.email);
          if (
            (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
            session?.user
          ) {
            finish({ session });
          }
        });

        // Polling a cada 600ms — cobre race conditions
        const pollInterval = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('[EmailConfirmation] Session via polling:', session.user.email);
              finish({ session });
            }
          } catch {
            // ignora erros de polling
          }
        }, 600);

        // Timeout de seguranca
        const timeout = setTimeout(() => finish(null), 12000);
      });
    };

    const confirmEmail = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Verifica erros explicitados na URL pelo Supabase
        const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
        if (errorCode || errorDescription) {
          handleError({ message: decodeURIComponent(errorDescription || errorCode || 'Erro ao confirmar email') });
          return;
        }

        // --- ESTRATEGIA 0: Sessao ja existente ---
        // Com flowType: 'implicit', o createClient() processa o hash automaticamente.
        // Na maioria dos casos a sessao ja existe quando este useEffect roda.
        console.log('[EmailConfirmation] Checking existing session...');
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log('[EmailConfirmation] Session already exists:', existingSession.user.email);
          handleSuccess();
          return;
        }

        // --- ESTRATEGIA 1: token_hash + type (OTP direto) ---
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type) {
          console.log('[EmailConfirmation] token_hash flow, type:', type);
          const otpType = (type === 'signup' ? 'signup' : type === 'email' ? 'email' : type) as any;
          const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          if (verifyError) throw verifyError;
          if (data?.user) { handleSuccess(); return; }
        }

        // --- ESTRATEGIA 2: Codigo PKCE ---
        const code = queryParams.get('code');
        if (code) {
          console.log('[EmailConfirmation] PKCE code flow');
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (data?.user) { handleSuccess(); return; }
          } catch (pkceErr: any) {
            // Se falhou por code_verifier ausente, o email FOI confirmado server-side
            if (pkceErr?.message?.includes('code verifier') || pkceErr?.message?.includes('flow state')) {
              handleError({ message: 'invalid flow state — email confirmed' });
              return;
            }
            throw pkceErr;
          }
        }

        // --- ESTRATEGIA 3: Hash fragment (implicit flow) —
        // O SDK pode nao ter terminado de processar — aguarda com listener + polling
        console.log('[EmailConfirmation] Waiting for SDK to process hash fragment...');
        const result = await waitForSession();

        if (result?.session) {
          handleSuccess();
          return;
        }

        // Nenhuma estrategia funcionou
        handleError({ message: 'Nao foi possivel confirmar automaticamente.' });
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
              Sua conta foi ativada. Redirecionando em {countdown} segundos...
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
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
              <XCircle className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Acao Necessaria
            </h2>
            <p className="text-gray-700 mb-6 text-sm leading-relaxed">
              {error}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.replace('/')}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Ir para o Login
              </Button>
              <Button
                onClick={() => {
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
