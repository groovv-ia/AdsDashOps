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
 * Chave no sessionStorage para impedir reprocessamento em remontagens
 * (o App re-renderiza a cada mudança de auth, causando remontagens)
 */
const CONFIRMATION_PROCESSED_KEY = 'email_confirmation_processed';

/**
 * Componente que processa o callback de confirmacao de email.
 *
 * Quando o usuario clica no link de confirmacao do email, o Supabase
 * verifica o token server-side e redireciona para esta pagina.
 *
 * O fluxo de deteccao segue 5 estrategias em ordem:
 *
 * 1. Sessao ja existente — o Supabase JS client pode ter processado
 *    os tokens da URL automaticamente durante a inicializacao do modulo
 *    (createClient detecta ?code ou #access_token na URL).
 *
 * 2. PKCE com "code" — formato padrao do Supabase v2+.
 *    Requer code_verifier no localStorage (mesmo navegador do cadastro).
 *
 * 3. token_hash + type — formato alternativo para verificacao OTP.
 *
 * 4. Hash fragment com access_token + refresh_token — formato legado/implicit.
 *
 * 5. Fallback: escuta eventos do auth + polling periodico de getSession().
 *    Cobre o cenario em que os tokens ja foram consumidos pelo JS client
 *    mas a sessao ainda nao estava pronta quando as estrategias anteriores
 *    rodaram.
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

    // Se ja processamos com sucesso nesta aba, redireciona direto
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    /**
     * Inicia countdown de 5s e redireciona ao dashboard
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
     * Marca confirmacao como sucesso, salva flag e inicia countdown
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
     * Trata erro na confirmacao com mensagens descritivas
     */
    const handleError = (err: any) => {
      console.error('[EmailConfirmation] Error:', err);

      let errorMessage = 'Erro ao confirmar email. ';
      const msg = err?.message || '';

      if (msg.includes('Token has expired') || msg.includes('otp_expired')) {
        errorMessage += 'O link de confirmacao expirou. Faca login e solicite um novo email.';
      } else if (msg.includes('Invalid token') || msg.includes('otp_disabled')) {
        errorMessage += 'Link de confirmacao invalido. Tente fazer login — seu email pode ja estar confirmado.';
      } else if (msg.includes('Email already confirmed')) {
        errorMessage += 'Este email ja foi confirmado. Voce pode fazer login normalmente.';
      } else if (msg.includes('invalid flow state') || msg.includes('PKCE') || msg.includes('code verifier')) {
        errorMessage = 'Seu email foi confirmado, mas a sessao nao pode ser criada automaticamente (navegador diferente do cadastro). Faca login normalmente.';
      } else if (msg.includes('both auth code and code verifier')) {
        errorMessage = 'Seu email foi confirmado com sucesso! Faca login para acessar a plataforma.';
      } else {
        errorMessage += msg || 'Tente fazer login normalmente — seu email pode ja ter sido confirmado.';
      }

      if (!mountedRef.current) return;
      setSuccess(false);
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    };

    /**
     * Aguarda o Supabase JS client estabelecer a sessao.
     *
     * Combina duas estrategias simultaneas:
     * - Listener de auth state (captura SIGNED_IN, INITIAL_SESSION)
     * - Polling periodico de getSession() a cada 800ms
     *
     * Timeout de seguranca: 10 segundos.
     */
    const waitForSession = (): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;

        const finish = (value: boolean) => {
          if (resolved) return;
          resolved = true;
          resolve(value);
        };

        // Listener de eventos de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
            session?.user
          ) {
            console.log('[EmailConfirmation] Session via auth listener:', event, session.user.email);
            subscription.unsubscribe();
            clearInterval(pollInterval);
            finish(true);
          }
        });

        // Polling de sessao a cada 800ms (cobre race conditions)
        const pollInterval = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('[EmailConfirmation] Session via polling:', session.user.email);
              clearInterval(pollInterval);
              subscription.unsubscribe();
              finish(true);
            }
          } catch {
            // Ignora erros de polling
          }
        }, 800);

        // Timeout de 10 segundos
        setTimeout(() => {
          clearInterval(pollInterval);
          subscription.unsubscribe();
          finish(false);
        }, 10000);
      });
    };

    /**
     * Funcao principal que processa a confirmacao de email.
     *
     * Tenta 5 estrategias em sequencia para detectar/estabelecer sessao.
     * Cada estrategia cobre um cenario diferente de como o Supabase
     * pode ter redirecionado o usuario.
     */
    const confirmEmail = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        console.log('[EmailConfirmation] URL params:', {
          search: window.location.search,
          hash: window.location.hash ? '(present)' : '(empty)',
          code: queryParams.get('code') ? 'yes' : 'no',
          token_hash: queryParams.get('token_hash') ? 'yes' : 'no',
          access_token: hashParams.get('access_token') ? 'yes' : 'no',
        });

        // Verifica erros explicitos nos parametros da URL
        const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

        if (errorCode || errorDescription) {
          const errorMsg = decodeURIComponent(errorDescription || 'Erro ao confirmar email');
          handleError({ message: errorMsg });
          return;
        }

        // --- ESTRATEGIA 0: Sessao ja existente ---
        // O Supabase JS client detecta ?code ou #access_token na URL durante
        // createClient() e processa automaticamente. Se ja terminou, a sessao
        // existe antes mesmo do useEffect rodar.
        console.log('[EmailConfirmation] Strategy 0: checking existing session...');
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log('[EmailConfirmation] Session already exists:', existingSession.user.email);
          handleSuccess();
          return;
        }

        // --- ESTRATEGIA 1: PKCE com authorization code ---
        const code = queryParams.get('code');
        if (code) {
          console.log('[EmailConfirmation] Strategy 1: PKCE code found');
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (data?.user) {
              console.log('[EmailConfirmation] PKCE exchange OK:', data.user.email);
              handleSuccess();
              return;
            }
          } catch (pkceErr: any) {
            // PKCE falhou (ex: navegador diferente, code_verifier ausente)
            // O email JA foi confirmado server-side pelo Supabase.
            // Informamos o usuario que pode fazer login.
            console.warn('[EmailConfirmation] PKCE exchange failed:', pkceErr?.message);
            handleError({
              message: pkceErr?.message?.includes('code verifier')
                ? 'both auth code and code verifier'
                : (pkceErr?.message || 'PKCE exchange failed'),
            });
            return;
          }
        }

        // --- ESTRATEGIA 2: token_hash + type (verificacao OTP) ---
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type) {
          console.log('[EmailConfirmation] Strategy 2: token_hash, type:', type);
          const otpType = type === 'signup' ? 'signup' : type === 'email' ? 'email' : type as any;

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) throw verifyError;
          if (!data.user) throw new Error('Usuario nao encontrado apos confirmacao');

          console.log('[EmailConfirmation] OTP verify OK:', data.user.email);
          handleSuccess();
          return;
        }

        // --- ESTRATEGIA 3: Hash fragment com tokens (formato legado/implicit) ---
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          console.log('[EmailConfirmation] Strategy 3: legacy hash fragment');

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          if (!data.user) throw new Error('Usuario nao encontrado apos confirmacao');

          console.log('[EmailConfirmation] Hash fragment OK:', data.user.email);
          handleSuccess();
          return;
        }

        // --- ESTRATEGIA 4: Aguardar Supabase client (listener + polling) ---
        // Quando nenhum parametro e encontrado na URL, o Supabase JS client
        // pode ter consumido os tokens durante a inicializacao e esta
        // finalizando o processamento async.
        console.log('[EmailConfirmation] Strategy 4: waiting for session (listener + polling)...');
        const sessionEstablished = await waitForSession();

        if (sessionEstablished) {
          handleSuccess();
          return;
        }

        // Nenhuma estrategia funcionou
        handleError({
          message: 'Nao foi possivel confirmar automaticamente. Seu email pode ja ter sido confirmado — tente fazer login.',
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
              {/* Botao principal: ir para login */}
              <Button
                onClick={() => window.location.replace('/')}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Ir para o Login
              </Button>
              {/* Botao secundario: tentar novamente */}
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
