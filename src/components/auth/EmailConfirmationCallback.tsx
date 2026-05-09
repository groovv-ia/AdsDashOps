import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

/**
 * Props do componente AuthCallback
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
 * Detecta o tipo de callback pela URL para exibir mensagem adequada.
 *
 * O Supabase sinaliza o tipo via parametro `type` no hash ou query:
 *   - signup    → confirmacao de email apos cadastro
 *   - recovery  → redefinicao de senha (vai para /reset-password, nao aqui)
 *   - magiclink → login por magic link
 *   - (ausente) → login social (Google, Facebook) — access_token direto no hash
 */
function detectCallbackType(): 'social' | 'email_confirmation' | 'magic_link' {
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get('type') || query.get('type') || '';

  if (type === 'signup') return 'email_confirmation';
  if (type === 'magiclink') return 'magic_link';
  // Login social: tem access_token no hash mas nao tem type, ou provider != email
  return 'social';
}

/**
 * Processa callbacks de autenticacao Supabase em /auth/callback.
 *
 * Trata tres cenarios usando a mesma rota:
 *
 * 1. Login social (Google, Facebook) — signInWithOAuth() redireciona aqui
 *    com #access_token=...&refresh_token=...&provider_token=...
 *
 * 2. Confirmacao de email apos cadastro — link do email redireciona aqui
 *    com #access_token=...&type=signup
 *
 * 3. Magic link — com #access_token=...&type=magiclink
 *
 * Com flowType: 'implicit' no cliente, o SDK processa o hash automaticamente
 * no createClient(). O componente aguarda a sessao e redireciona ao dashboard.
 */
export const EmailConfirmationCallback: React.FC<EmailConfirmationCallbackProps> = ({
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [callbackType, setCallbackType] = useState<'social' | 'email_confirmation' | 'magic_link'>('social');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Ja processamos com sucesso antes nesta aba — redireciona direto
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    setCallbackType(detectCallbackType());

    /** Inicia countdown e redireciona ao dashboard */
    const startRedirectCountdown = () => {
      let timeLeft = 3;
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
      console.error('[AuthCallback] Error:', err);
      const msg: string = err?.message || String(err) || '';

      let errorMessage = '';
      if (msg.includes('Token has expired') || msg.includes('otp_expired')) {
        errorMessage = 'O link de confirmacao expirou. Faca login e solicite um novo email de confirmacao.';
      } else if (msg.includes('Email already confirmed')) {
        errorMessage = 'Este email ja foi confirmado. Voce pode fazer login normalmente.';
      } else if (msg.includes('invalid flow state') || msg.includes('PKCE') || msg.includes('code verifier')) {
        errorMessage = 'Seu email foi confirmado! Para acessar a plataforma, faca login normalmente.';
      } else if (msg.includes('Invalid token') || msg.includes('otp_disabled')) {
        errorMessage = 'Link invalido. Tente fazer login — sua conta pode ja estar confirmada.';
      } else if (msg.includes('provider_email_needs_verification')) {
        errorMessage = 'Verifique seu email antes de continuar.';
      } else if (msg) {
        errorMessage = `Nao foi possivel autenticar: ${msg}. Tente fazer login novamente.`;
      } else {
        errorMessage = 'Nao foi possivel autenticar automaticamente. Tente fazer login.';
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
     * Com flowType: 'implicit', createClient() inicia o processamento do hash
     * de forma assincrona. Combinamos listener de auth com polling para capturar
     * a sessao assim que ficar disponivel.
     */
    const waitForSession = (): Promise<{ session: any } | null> => {
      return new Promise((resolve) => {
        let resolved = false;

        const finish = (result: { session: any } | null) => {
          if (resolved) return;
          resolved = true;
          subRef?.data?.subscription?.unsubscribe?.();
          clearInterval(pollInterval);
          clearTimeout(timeout);
          resolve(result);
        };

        // Listener de eventos — captura SIGNED_IN emitido pelo SDK apos processar hash
        const subRef = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[AuthCallback] Auth event:', event, session?.user?.email);
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
              console.log('[AuthCallback] Session via polling:', session.user.email);
              finish({ session });
            }
          } catch {
            // ignora erros de polling
          }
        }, 600);

        // Timeout de seguranca: 12 segundos
        const timeout = setTimeout(() => finish(null), 12000);
      });
    };

    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Verifica erros explicitados na URL pelo Supabase/provedor OAuth
        const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
        if (errorCode || errorDescription) {
          handleError({ message: decodeURIComponent(errorDescription || errorCode || 'Erro na autenticacao') });
          return;
        }

        // --- ESTRATEGIA 0: Sessao ja existente ---
        // Com flowType: 'implicit', createClient() processa o hash automaticamente.
        // Para login social, a sessao frequentemente ja existe quando este hook roda.
        console.log('[AuthCallback] Checking existing session...');
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log('[AuthCallback] Session already exists:', existingSession.user.email);
          handleSuccess();
          return;
        }

        // --- ESTRATEGIA 1: token_hash + type (OTP / confirmacao de email) ---
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type) {
          console.log('[AuthCallback] token_hash flow, type:', type);
          const otpType = (type === 'signup' ? 'signup' : type === 'email' ? 'email' : type) as any;
          const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          if (verifyError) throw verifyError;
          if (data?.user) { handleSuccess(); return; }
        }

        // --- ESTRATEGIA 2: Codigo PKCE ---
        const code = queryParams.get('code');
        if (code) {
          console.log('[AuthCallback] PKCE code flow');
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (data?.user) { handleSuccess(); return; }
          } catch (pkceErr: any) {
            if (pkceErr?.message?.includes('code verifier') || pkceErr?.message?.includes('flow state')) {
              handleError({ message: 'invalid flow state — email confirmed' });
              return;
            }
            throw pkceErr;
          }
        }

        // --- ESTRATEGIA 3: Aguarda SDK processar hash fragment ---
        // Cobre login social e confirmacao de email no formato implicit.
        console.log('[AuthCallback] Waiting for SDK to process hash fragment...');
        const result = await waitForSession();

        if (result?.session) {
          handleSuccess();
          return;
        }

        handleError({ message: 'Nao foi possivel autenticar automaticamente.' });
      } catch (err: any) {
        handleError(err);
      }
    };

    processAuth();

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Textos dinamicos por tipo de callback
  const loadingTitle = callbackType === 'social' ? 'Entrando com sua conta...' : 'Confirmando seu Email';
  const loadingSubtitle = callbackType === 'social' ? 'Autenticando com o provedor...' : 'Aguarde enquanto validamos sua conta...';
  const successTitle = callbackType === 'social' ? 'Login Realizado com Sucesso!' : 'Email Confirmado com Sucesso!';
  const successSubtitle = callbackType === 'social'
    ? `Bem-vindo! Redirecionando em ${countdown} segundos...`
    : `Sua conta foi ativada. Redirecionando em ${countdown} segundos...`;

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
              {loadingTitle}
            </h2>
            <p className="text-gray-600">
              {loadingSubtitle}
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
              {successTitle}
            </h2>
            <p className="text-gray-600 mb-6">
              {successSubtitle}
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
