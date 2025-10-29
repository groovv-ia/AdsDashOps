import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithOAuth, resetPassword } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';

// Props do componente AuthForm
interface AuthFormProps {
  onSuccess?: () => void;
}

// Tipos de formulário (login ou registro)
type FormMode = 'login' | 'signup' | 'reset';

// Componente de formulário de autenticação com email/senha e OAuth
export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Valida o formulário
  const validateForm = (): boolean => {
    setError('');

    if (!email) {
      setError('Por favor, insira seu email');
      return false;
    }

    if (!email.includes('@')) {
      setError('Por favor, insira um email válido');
      return false;
    }

    if (mode !== 'reset' && !password) {
      setError('Por favor, insira sua senha');
      return false;
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return false;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  // Manipula o envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'reset') {
        // Resetar senha
        await resetPassword(email);
        setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setEmail('');
      } else if (mode === 'login') {
        // Login
        await signInWithEmail(email, password);
        setSuccess('Login realizado com sucesso!');
        onSuccess?.();
      } else {
        // Registro
        await signUpWithEmail(email, password);
        setSuccess('Conta criada com sucesso! Você já pode fazer login.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manipula login com OAuth (Google, Facebook, Apple)
  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setError('');

    try {
      await signInWithOAuth(provider);
      // O redirecionamento é automático
    } catch (err: any) {
      console.error(`Erro ao fazer login com ${provider}:`, err);
      setError(err.message || `Erro ao fazer login com ${provider}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo e título */}
        <div className="text-center">
          <img
            src="/logotipo-adsops.webp"
            alt="AdsOps Logo"
            className="mx-auto h-16 w-auto"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {mode === 'login' && 'Bem-vindo de volta'}
            {mode === 'signup' && 'Criar nova conta'}
            {mode === 'reset' && 'Recuperar senha'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'login' && 'Faça login para acessar seu dashboard'}
            {mode === 'signup' && 'Preencha os dados para criar sua conta'}
            {mode === 'reset' && 'Informe seu email para recuperar o acesso'}
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          {/* Mensagens de erro e sucesso */}
          {error && (
            <Alert
              type="error"
              message={error}
              dismissible
              onClose={() => setError('')}
              className="mb-4"
            />
          )}

          {success && (
            <Alert
              type="success"
              message={success}
              dismissible
              onClose={() => setSuccess('')}
              className="mb-4"
            />
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Campo de email */}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              icon={<Mail className="w-4 h-4" />}
              fullWidth
              disabled={loading}
            />

            {/* Campos de senha (não mostrados no modo reset) */}
            {mode !== 'reset' && (
              <>
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                    fullWidth
                    disabled={loading}
                  />
                  {/* Botão para mostrar/ocultar senha */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Campo de confirmação de senha (apenas no modo signup) */}
                {mode === 'signup' && (
                  <Input
                    label="Confirmar senha"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                    fullWidth
                    disabled={loading}
                  />
                )}
              </>
            )}

            {/* Link de recuperação de senha (apenas no modo login) */}
            {mode === 'login' && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            {/* Botão de submit */}
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              {mode === 'login' && 'Entrar'}
              {mode === 'signup' && 'Criar conta'}
              {mode === 'reset' && 'Enviar email de recuperação'}
            </Button>

            {/* Alternância entre login e signup */}
            <div className="text-center text-sm">
              {mode === 'login' && (
                <>
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Criar conta
                  </button>
                </>
              )}
              {(mode === 'signup' || mode === 'reset') && (
                <>
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Fazer login
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Divisor "ou" */}
          {mode !== 'reset' && (
            <>
              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Ou continue com
                  </span>
                </div>
              </div>

              {/* Botões de OAuth */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Login com Google</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('facebook')}
                  disabled={loading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Login com Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={loading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Login com Apple</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
