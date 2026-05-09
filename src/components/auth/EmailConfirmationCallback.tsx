import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface EmailConfirmationCallbackProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const CONFIRMATION_PROCESSED_KEY = 'email_confirmation_processed';

/**
 * Detecta o tipo de callback para exibir mensagem adequada.
 * Login social nao tem `type=signup` no hash/query.
 */
function detectCallbackType(): 'social' | 'email_confirmation' | 'magic_link' {
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get('type') || query.get('type') || '';
  if (type === 'signup') return 'email_confirmation';
  if (type === 'magiclink') return 'magic_link';
  return 'social';
}

function friendlyError(err: any): string {
  const msg: string = err?.message || String(err) || '';
  if (msg.includes('Token has expired') || msg.includes('otp_expired'))
    return 'O link expirou. Solicite um novo email de confirmacao e tente novamente.';
  if (msg.includes('Email already confirmed'))
    return 'Este email ja foi confirmado. Voce pode fazer login normalmente.';
  if (msg.includes('invalid flow state') || msg.includes('PKCE') || msg.includes('code verifier') || msg.includes('flow state'))
    return 'Seu email foi confirmado! Para acessar a plataforma, faca login normalmente.';
  if (msg.includes('Invalid token') || msg.includes('otp_disabled'))
    return 'Link invalido. Tente fazer login — sua conta pode ja estar confirmada.';
  if (msg.includes('provider_email_needs_verification'))
    return 'Verifique seu email antes de continuar.';
  if (msg)
    return `Nao foi possivel autenticar: ${msg}`;
  return 'Nao foi possivel autenticar automaticamente. Tente fazer login.';
}

/**
 * Processa callbacks de autenticacao Supabase em /auth/callback.
 *
 * Com flowType: 'implicit' configurado no cliente, o SDK processa tokens
 * do hash fragment automaticamente. O processamento e assincrono e emite
 * evento SIGNED_IN via onAuthStateChange quando concluido.
 *
 * Este componente usa onAuthStateChange como efeito (nao dentro de Promise)
 * para evitar o erro "message channel closed" que ocorre com listeners
 * async em Promises.
 */
export const EmailConfirmationCallback: React.FC<EmailConfirmationCallbackProps> = ({
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [callbackType] = useState<'social' | 'email_confirmation' | 'magic_link'>(detectCallbackType);
  const mountedRef = useRef(true);
  const processedRef = useRef(false);

  const handleSuccess = useCallback(() => {
    if (processedRef.current || !mountedRef.current) return;
    processedRef.current = true;
    sessionStorage.setItem(CONFIRMATION_PROCESSED_KEY, 'success');
    setError('');
    setSuccess(true);
    setLoading(false);
    onSuccess?.();
  }, [onSuccess]);

  const handleError = useCallback((err: any) => {
    if (processedRef.current || !mountedRef.current) return;
    processedRef.current = true;
    console.error('[AuthCallback] Error:', err);
    const msg = friendlyError(err);
    setSuccess(false);
    setError(msg);
    setLoading(false);
    onError?.(msg);
  }, [onError]);

  // Countdown para redirect apos sucesso
  useEffect(() => {
    if (!success) return;
    let t = 3;
    const timer = setInterval(() => {
      t--;
      if (mountedRef.current) setCountdown(t);
      if (t <= 0) { clearInterval(timer); window.location.replace('/'); }
    }, 1000);
    return () => clearInterval(timer);
  }, [success]);

  useEffect(() => {
    mountedRef.current = true;
    processedRef.current = false;

    // Ja processamos com sucesso nesta aba — redireciona direto
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    // Verifica erros na URL (retornados pelo Supabase/provedor)
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const errCode = query.get('error_code') || hash.get('error_code');
    const errDesc = query.get('error_description') || hash.get('error_description');
    if (errCode || errDesc) {
      handleError({ message: decodeURIComponent(errDesc || errCode || 'Erro na autenticacao') });
      return;
    }

    /**
     * Tentativa de processar OTP (token_hash) manualmente.
     * Usado para confirmacao de email com link direto.
     */
    const tryVerifyOtp = async () => {
      const tokenHash = query.get('token_hash');
      const type = query.get('type');
      if (!tokenHash || !type) return false;

      console.log('[AuthCallback] Verifying OTP, type:', type);
      try {
        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (verifyErr) { handleError(verifyErr); return true; }
        if (data?.user) { handleSuccess(); return true; }
      } catch (e: any) {
        handleError(e);
        return true;
      }
      return false;
    };

    /**
     * Tentativa de trocar code PKCE por sessao.
     * Usado quando flowType e PKCE (nao implicit).
     */
    const tryExchangeCode = async () => {
      const code = query.get('code');
      if (!code) return false;

      console.log('[AuthCallback] Exchanging PKCE code...');
      try {
        const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) { handleError(exchErr); return true; }
        if (data?.user) { handleSuccess(); return true; }
      } catch (e: any) {
        if (e?.message?.includes('code verifier') || e?.message?.includes('flow state')) {
          handleError(e);
          return true;
        }
        handleError(e);
        return true;
      }
      return false;
    };

    /**
     * Estrategia principal de processamento:
     *
     * 1. Checa se a sessao ja existe (SDK pode ter processado o hash antes do mount)
     * 2. Tenta OTP se token_hash presente
     * 3. Tenta PKCE se code presente
     * 4. Registra onAuthStateChange listener e timeout — o SDK vai processar
     *    o hash fragment em background e emitir SIGNED_IN quando pronto
     */
    const processAuth = async () => {
      console.log('[AuthCallback] Processing auth callback...');
      console.log('[AuthCallback] URL:', window.location.href);

      // Checa sessao existente — SDK pode ter processado hash antes do mount
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('[AuthCallback] Session already active:', session.user.email);
          handleSuccess();
          return;
        }
      } catch { /* continue */ }

      // Tenta OTP
      const otpHandled = await tryVerifyOtp();
      if (otpHandled) return;

      // Tenta PKCE code exchange
      const codeHandled = await tryExchangeCode();
      if (codeHandled) return;

      // Para implicit flow (hash fragment com access_token):
      // O SDK processa automaticamente via detectSessionInUrl.
      // Precisamos apenas ESPERAR o SDK terminar.
      // Nao usamos onAuthStateChange dentro de Promise — usamos timeout com polling.
      console.log('[AuthCallback] Waiting for SDK to process tokens (polling)...');
    };

    processAuth();

    return () => { mountedRef.current = false; };
  }, [handleSuccess, handleError]);

  /**
   * Listener separado de onAuthStateChange — roda como efeito do React,
   * NAO dentro de Promise. Isso evita o erro "message channel closed".
   *
   * Quando o SDK termina de processar o hash fragment, emite SIGNED_IN.
   * Este listener captura e marca sucesso.
   */
  useEffect(() => {
    // Se ja processamos, nao precisa do listener
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Auth event:', event, session?.user?.email);
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.user &&
        !processedRef.current
      ) {
        handleSuccess();
      }
    });

    // Timeout: se em 20s nenhuma sessao apareceu, mostra erro
    const timeout = setTimeout(() => {
      if (!processedRef.current && mountedRef.current) {
        handleError({ message: 'Sessao nao estabelecida. Tente fazer login novamente.' });
      }
    }, 20000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [handleSuccess, handleError]);

  // Textos por tipo de callback
  const loadingTitle = callbackType === 'social' ? 'Entrando com sua conta...' : 'Confirmando seu Email';
  const loadingSubtitle = callbackType === 'social' ? 'Autenticando com o provedor...' : 'Aguarde enquanto validamos sua conta...';
  const successTitle = callbackType === 'social' ? 'Login Realizado com Sucesso!' : 'Email Confirmado com Sucesso!';
  const successSubtitle = callbackType === 'social'
    ? `Bem-vindo! Redirecionando em ${countdown} segundos...`
    : `Sua conta foi ativada. Redirecionando em ${countdown} segundos...`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">

        {loading && !success && !error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{loadingTitle}</h2>
            <p className="text-gray-600">{loadingSubtitle}</p>
          </div>
        )}

        {!loading && success && !error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{successTitle}</h2>
            <p className="text-gray-600 mb-6">{successSubtitle}</p>
            <Button onClick={() => window.location.replace('/')} variant="primary" className="w-full">
              Ir para o Dashboard Agora
            </Button>
          </div>
        )}

        {!loading && !success && error && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
              <XCircle className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Acao Necessaria</h2>
            <p className="text-gray-700 mb-6 text-sm leading-relaxed">{error}</p>
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
