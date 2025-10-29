import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { signIn, signUp, signInWithProvider, isDemoMode } from '../../lib/supabase';

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [error, setError] = useState('');

  const getErrorMessage = (error: any) => {
    // Return the error message as-is since we're handling it in supabase.ts
    return error?.message || 'Ocorreu um erro inesperado. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await signIn(formData.email, formData.password);
        if (error) throw error;
      } else {
        const { data, error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setSocialLoading(provider);
    setError('');
    
    try {
      const { error } = await signInWithProvider(provider);
      if (error) throw error;
      // Success will be handled by the auth state change listener
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const FacebookIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
    </svg>
  );

  const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const AppleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#000000"/>
    </svg>
  );

  useEffect(() => {
    // Verifica se já existe o script para evitar duplicatas
    const existingScript = document.querySelector('.adopt-injector');
    const existingMeta = document.querySelector('meta[name="adopt-website-id"]');

    if (existingScript || existingMeta) {
      return;
    }

    // Adiciona a meta tag
    const meta = document.createElement('meta');
    meta.name = 'adopt-website-id';
    meta.content = '2ed84cee-255f-443f-89c9-7aca3a53fe59';
    document.head.appendChild(meta);

    // Adiciona o script
    const script = document.createElement('script');
    script.src = 'https://tag.goadopt.io/injector.js?website_code=2ed84cee-255f-443f-89c9-7aca3a53fe59';
    script.className = 'adopt-injector';
    script.async = true;

    // Log para debug
    script.onload = () => {
      console.log('Adopt script loaded successfully');
    };

    script.onerror = (error) => {
      console.error('Error loading Adopt script:', error);
    };

    document.head.appendChild(script);

    // Cleanup function para remover os elementos quando o componente for desmontado
    return () => {
      const metaToRemove = document.querySelector('meta[name="adopt-website-id"]');
      const scriptToRemove = document.querySelector('.adopt-injector');

      if (metaToRemove && metaToRemove.parentNode) {
        metaToRemove.parentNode.removeChild(metaToRemove);
      }

      if (scriptToRemove && scriptToRemove.parentNode) {
        scriptToRemove.parentNode.removeChild(scriptToRemove);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Logo and Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex justify-start">
              <img 
                src="/logotipo-adsops.fw.png" 
                alt="AdsOPS" 
                className="w-auto object-contain"
                style={{ height: '80px' }}
              />
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Login' : 'Criar Conta'}
            </h1>
            <p className="text-gray-600">
              {isLogin 
                ? 'Faça login para acessar sua conta do AdsOPS' 
                : 'Crie sua conta para começar'
              }
            </p>
          </div>

          {/* Social Login */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-center mb-4">
              {isLogin ? 'Faça login com' : 'Cadastre-se com'}
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                disabled={loading || socialLoading !== null}
                className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === 'facebook' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <FacebookIcon />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loading || socialLoading !== null}
                className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === 'google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <GoogleIcon />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading || socialLoading !== null}
                className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === 'apple' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <AppleIcon />
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Ou continue com email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Digite seu nome completo"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="john.doe@gmail.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••••••••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Lembrar de mim
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || socialLoading !== null}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Carregando...
                </div>
              ) : (
                isLogin ? 'Login' : 'Criar Conta'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-medium"
            >
              {isLogin ? (
                <>
                  Não tem uma conta? <span className="text-blue-600 hover:text-blue-500">Cadastre-se</span>
                </>
              ) : (
                <>
                  Já tem uma conta? <span className="text-blue-600 hover:text-blue-500">Faça login</span>
                </>
              )}
            </button>

            {/* Links Legais */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>Ao continuar, você concorda com nossos</p>
              <div className="mt-2 space-x-2">
                <a
                  href="/termos-de-uso"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Termos de Uso
                </a>
                <span>e</span>
                <a
                  href="/politica-de-privacidade"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Política de Privacidade
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <img 
          src="/onboarding-1.jpg" 
          alt="Analytics Dashboard" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
};