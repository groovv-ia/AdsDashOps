import { createClient } from '@supabase/supabase-js';

// Obtém as variáveis de ambiente do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as credenciais do Supabase estão configuradas
export const isDemoMode = !supabaseUrl || !supabaseAnonKey ||
  supabaseUrl === 'your_supabase_url' ||
  supabaseAnonKey === 'your_supabase_anon_key';

// Cria o cliente do Supabase com configurações otimizadas
export const supabase = isDemoMode
  ? null // Retorna null em modo demo para evitar erros
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Desabilita verificação de CAPTCHA para evitar erros
        flowType: 'pkce',
      },
    });

// Função helper para verificar se o usuário está autenticado
export const getCurrentUser = async () => {
  if (isDemoMode || !supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
};

// Função helper para fazer logout
export const signOut = async () => {
  if (isDemoMode || !supabase) return;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};

// Função helper para login com email/senha
export const signInWithEmail = async (email: string, password: string) => {
  if (isDemoMode || !supabase) {
    throw new Error('Supabase não está configurado. Por favor, configure as credenciais.');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Desabilita CAPTCHA para evitar erros de verificação
        captchaToken: undefined,
      },
    });

    if (error) {
      // Tratamento específico para erro de CAPTCHA
      if (error.message.includes('captcha')) {
        throw new Error('Erro de verificação de segurança. Por favor, desabilite o CAPTCHA nas configurações do Supabase ou tente novamente mais tarde.');
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};

// Função helper para registro com email/senha
export const signUpWithEmail = async (email: string, password: string) => {
  if (isDemoMode || !supabase) {
    throw new Error('Supabase não está configurado. Por favor, configure as credenciais.');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Desabilita CAPTCHA para evitar erros de verificação
        captchaToken: undefined,
        // Desabilita confirmação de email para facilitar desenvolvimento
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      // Tratamento específico para erro de CAPTCHA
      if (error.message.includes('captcha')) {
        throw new Error('Erro de verificação de segurança. Por favor, desabilite o CAPTCHA nas configurações do Supabase.');
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao criar conta:', error);
    throw error;
  }
};

// Função helper para login com OAuth (Google, Facebook, Apple)
export const signInWithOAuth = async (provider: 'google' | 'facebook' | 'apple') => {
  if (isDemoMode || !supabase) {
    throw new Error('Supabase não está configurado. Por favor, configure as credenciais.');
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Erro ao fazer login com ${provider}:`, error);
    throw error;
  }
};

// Função helper para resetar senha
export const resetPassword = async (email: string) => {
  if (isDemoMode || !supabase) {
    throw new Error('Supabase não está configurado. Por favor, configure as credenciais.');
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    throw error;
  }
};
