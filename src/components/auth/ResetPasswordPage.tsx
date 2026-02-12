import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { supabase } from '../../lib/supabase';

/**
 * Avalia a força da senha e retorna um nível + cor para exibição visual
 *
 * Critérios:
 * - Forte: 8+ caracteres, com maiúscula, minúscula, número e símbolo
 * - Média: 8+ caracteres, com pelo menos 2 dos critérios acima
 * - Fraca: qualquer outro caso
 */
const getPasswordStrength = (password: string): { level: string; color: string; width: string } => {
  if (!password) return { level: '', color: '', width: '0%' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score >= 5) return { level: 'Forte', color: 'bg-green-500', width: '100%' };
  if (score >= 3) return { level: 'Média', color: 'bg-yellow-500', width: '66%' };
  return { level: 'Fraca', color: 'bg-red-500', width: '33%' };
};

/**
 * Componente ResetPasswordPage
 *
 * Página pública acessada quando o usuário clica no link de recuperação de senha
 * enviado por email. Permite definir uma nova senha.
 *
 * Fluxo:
 * 1. O Supabase redireciona para /reset-password com tokens na URL
 * 2. A página valida a sessão usando os tokens (PKCE code ou hash fragment)
 * 3. O usuário digita e confirma a nova senha
 * 4. A senha é atualizada via supabase.auth.updateUser()
 * 5. O usuário é redirecionado ao login
 */
export const ResetPasswordPage: React.FC = () => {
  // Estado da sessão/autenticação
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Campos do formulário
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Cálculo da força da senha
  const passwordStrength = getPasswordStrength(password);

  /**
   * Ao montar, verifica se a URL contém tokens válidos para reset de senha.
   * Suporta os formatos: PKCE code, token_hash e hash fragment.
   */
  useEffect(() => {
    const validateSession = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Verifica erros explícitos na URL
        const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

        if (errorCode || errorDescription) {
          setSessionError(decodeURIComponent(errorDescription || 'Link de recuperação inválido.'));
          setCheckingSession(false);
          return;
        }

        // Formato PKCE com authorization code
        const code = queryParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          setSessionReady(true);
          setCheckingSession(false);
          // Limpa a URL para não expor o code
          window.history.replaceState({}, document.title, '/reset-password');
          return;
        }

        // Formato com token_hash e type
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) throw verifyError;

          setSessionReady(true);
          setCheckingSession(false);
          window.history.replaceState({}, document.title, '/reset-password');
          return;
        }

        // Formato legado com hash fragment
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        if (accessToken && refreshToken && hashType === 'recovery') {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionErr) throw sessionErr;

          setSessionReady(true);
          setCheckingSession(false);
          window.history.replaceState({}, document.title, '/reset-password');
          return;
        }

        // Verifica se já existe uma sessão ativa (caso a URL tenha sido limpa)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }

        // Nenhum token válido encontrado
        setSessionError('Link de recuperação inválido ou expirado. Solicite um novo link na página de login.');
        setCheckingSession(false);
      } catch (err: any) {
        console.error('Error validating reset session:', err);

        const msg = err?.message || '';
        if (msg.includes('expired') || msg.includes('otp_expired')) {
          setSessionError('O link de recuperação expirou. Solicite um novo link na página de login.');
        } else if (msg.includes('invalid') || msg.includes('flow state')) {
          setSessionError('Link de recuperação inválido. Solicite um novo link na página de login.');
        } else {
          setSessionError('Erro ao validar o link. Tente solicitar um novo link na página de login.');
        }
        setCheckingSession(false);
      }
    };

    validateSession();
  }, []);

  /**
   * Atualiza a senha do usuário via Supabase Auth
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message?.includes('same_password')) {
          setError('A nova senha não pode ser igual à senha anterior.');
        } else {
          setError('Erro ao atualizar a senha. Tente novamente.');
        }
        return;
      }

      // Faz logout para forçar novo login com a senha atualizada
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      setError('Erro inesperado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logotipo-adsops.fw.png"
            alt="AdsOPS"
            className="h-16 mx-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Estado de verificação da sessão */}
          {checkingSession && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Validando Link
              </h2>
              <p className="text-gray-600 text-sm">
                Aguarde enquanto verificamos seu link de recuperação...
              </p>
            </div>
          )}

          {/* Erro na sessão (link inválido/expirado) */}
          {!checkingSession && sessionError && (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Link Inválido
              </h2>
              <p className="text-red-600 text-sm mb-6">
                {sessionError}
              </p>
              <Button
                onClick={() => window.location.replace('/')}
                variant="primary"
                className="w-full"
              >
                Voltar para o Login
              </Button>
            </div>
          )}

          {/* Formulário de nova senha */}
          {!checkingSession && sessionReady && !success && (
            <div>
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 mb-4">
                  <Lock className="h-7 w-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Redefinir Senha
                </h2>
                <p className="text-gray-600 text-sm">
                  Crie uma nova senha para sua conta.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Campo Nova Senha */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Indicador de força da senha */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Força da senha:</span>
                        <span className="text-xs font-medium text-gray-700">
                          {passwordStrength.level}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Campo Confirmar Senha */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-300 bg-red-50'
                          : confirmPassword && password === confirmPassword
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300'
                      }`}
                      placeholder="Repita a nova senha"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Feedback visual de correspondência */}
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="mt-1 text-xs text-green-600">As senhas coincidem</p>
                  )}
                </div>

                {/* Mensagem de erro */}
                {error && (
                  <Alert variant="error" dismissible onDismiss={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {/* Botão de enviar */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Atualizando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Redefinir Senha
                    </span>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Estado de sucesso */}
          {!checkingSession && success && (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Senha Alterada!
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Sua senha foi redefinida com sucesso. Faça login com sua nova senha.
              </p>
              <Button
                onClick={() => window.location.replace('/')}
                variant="primary"
                className="w-full"
              >
                Ir para o Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
