import React, { useEffect, useState, useRef } from 'react';
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
 * Login social nao tem `type` no hash/query — tem apenas access_token ou code.
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
 * Trata tres cenarios:
 *   1. Login social (Google, Facebook) — retorna ?code= via PKCE, ou #access_token= via implicit
 *   2. Confirmacao de email (type=signup) — token_hash nos query params
 *   3. Magic link (type=magiclink)
 *
 * IMPORTANTE: nao usar onAuthStateChange dentro de Promises async — causa
 * "message channel closed" no browser. Usamos apenas polling por getSession().
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

  useEffect(() => {
    mountedRef.current = true;

    // Ja processamos com sucesso nesta aba — redireciona direto
    if (sessionStorage.getItem(CONFIRMATION_PROCESSED_KEY) === 'success') {
      window.location.replace('/');
      return;
    }

    const startCountdown = () => {
      let t = 3;
      const timer = setInterval(() => {
        t--;
        if (mountedRef.current) setCountdown(t);
        if (t <= 0) { clearInterval(timer); window.location.replace('/'); }
      }, 1000);
    };

    const handleSuccess = () => {
      sessionStorage.setItem(CONFIRMATION_PROCESSED_KEY, 'success');
      if (!mountedRef.current) return;
      setError('');
      setSuccess(true);
      setLoading(false);
      onSuccess?.();
      startCountdown();
    };

    const handleError = (err: any) => {
      console.error('[AuthCallback] Error:', err);
      const msg = friendlyError(err);
      if (!mountedRef.current) return;
      setSuccess(false);
      setError(msg);
      setLoading(false);
      onError?.(msg);
    };

    /**
     * Polling simples: verifica getSession() a cada 500ms por ate 15s.
     * Evita usar onAuthStateChange dentro de Promise (causa "message channel closed").
     * O SDK processa o ?code= ou #access_token automaticamente em background;
     * basta aguardar a sessao aparecer.
     */
    const pollForSession = (): Promise<boolean> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const MAX = 30; // 30 x 500ms = 15s

        const check = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('[AuthCallback] Session found via polling:', session.user.email);
              resolve(true);
              return;
            }
          } catch {
            // ignora erro pontual de rede
          }
          attempts++;
          if (attempts >= MAX) { resolve(false); return; }
          setTimeout(check, 500);
        };

        check();
      });
    };

    const processAuth = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.substring(1));

        console.log('[AuthCallback] URL:', window.location.href);

        // Erros explicitados na URL pelo Supabase ou provedor
        const errCode = query.get('error_code') || hash.get('error_code');
        const errDesc = query.get('error_description') || hash.get('error_description');
        if (errCode || errDesc) {
          handleError({ message: decodeURIComponent(errDesc || errCode || 'Erro na autenticacao') });
          return;
        }

        // Sessao ja existente — SDK processou antes deste hook rodar
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing?.user) {
          console.log('[AuthCallback] Session already active:', existing.user.email);
          handleSuccess();
          return;
        }

        // token_hash flow (confirmacao de email via OTP)
        const tokenHash = query.get('token_hash');
        const type = query.get('type');
        if (tokenHash && type) {
          console.log('[AuthCallback] token_hash flow, type:', type);
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (verifyError) throw verifyError;
          if (data?.user) { handleSuccess(); return; }
        }

        // PKCE code flow — login social moderno e alguns emails de confirmacao
        const code = query.get('code');
        if (code) {
          console.log('[AuthCallback] PKCE code exchange...');
          try {
            const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) throw exchErr;
            if (data?.user) { handleSuccess(); return; }
          } catch (pkceErr: any) {
            // code_verifier ausente = PKCE state perdido, mas email pode estar confirmado
            if (pkceErr?.message?.includes('code verifier') || pkceErr?.message?.includes('flow state')) {
              handleError(pkceErr);
              return;
            }
            throw pkceErr;
          }
        }

        // Implicit flow — hash fragment com access_token
        // O SDK processa isso automaticamente; aguardamos via polling
        if (hash.get('access_token') || hash.get('refresh_token')) {
          console.log('[AuthCallback] Implicit hash tokens detected, polling for session...');
          const found = await pollForSession();
          if (found) { handleSuccess(); return; }
          handleError({ message: 'Sessao nao estabelecida. Tente fazer login novamente.' });
          return;
        }

        // Nenhum parametro reconhecido — pode ser redirect tardio do SDK
        console.log('[AuthCallback] No auth params found, polling briefly...');
        const found = await pollForSession();
        if (found) { handleSuccess(); return; }

        handleError({ message: 'Nenhum dado de autenticacao encontrado na URL.' });
      } catch (err: any) {
        handleError(err);
      }
    };

    processAuth();

    return () => { mountedRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
