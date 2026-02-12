import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Flag para indicar se o Supabase esta configurado
const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig && import.meta.env.DEV) {
  console.warn('Supabase nao configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
}

// Client sempre criado (nunca null) para evitar null checks em toda a aplicacao
// Se nao configurado, chamadas de API falharao com erro claro
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Flag de modo demo (sem Supabase configurado)
export const isDemoMode = !hasSupabaseConfig;

export const signIn = async (email: string, password: string) => {
  try {
    console.log('Attempting sign in for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      
      // Handle specific Supabase errors
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
      }
      
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Email não confirmado. Verifique sua caixa de entrada ou desabilite a confirmação de email no Supabase.');
      }
      
      if (error.message?.includes('Too many requests')) {
        throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      }
      
      throw error;
    } else {
      console.log('Sign in successful:', data.user?.email);
    }
    
    return { data, error };
  } catch (error) {
    console.error('Sign in exception:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Erro inesperado durante o login') };
  }
};

export const signUp = async (email: string, password: string, fullName?: string) => {
  try {
    console.log('Attempting sign up for:', email);

    // URL de redirecionamento em produção
    const redirectUrl = 'https://adsops.bolt.host/auth/callback';

    console.log('Email redirect URL:', redirectUrl);

    // Habilita confirmação de email com redirecionamento para página de callback
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: redirectUrl,
      },
    });
    
    if (error) {
      console.error('Sign up error:', error);
      
      // Handle database errors by creating profile manually
      if (error.message?.includes('Database error saving new user')) {
        console.log('Database error detected, attempting manual profile creation...');
        
        // Try to sign up without profile creation first
        const { data: retryData, error: retryError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        
        if (retryError) {
          if (retryError.message?.includes('Database error saving new user')) {
            throw new Error('Erro interno do servidor ao salvar o usuário. Verifique a configuração do seu projeto Supabase (tabelas auth.users e public.profiles, triggers e RLS).');
          }
          if (retryError.message?.includes('Signups not allowed')) {
            throw new Error('Cadastros estão desabilitados. Habilite "Enable email signups" nas configurações de Authentication do Supabase.');
          }
          if (retryError.message?.includes('User already registered')) {
            throw new Error('Este email já está cadastrado. Tente fazer login ou use outro email.');
          }
          throw new Error('Erro durante o cadastro. Verifique suas credenciais e tente novamente.');
        }
        
        // If user was created successfully, try to create profile manually
        if (retryData.user) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: retryData.user.id,
                email: email,
                full_name: fullName || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (profileError) {
              console.warn('Could not create profile, but user was created:', profileError);
              // Don't throw error here, user was created successfully
            }
          } catch (profileError) {
            console.warn('Profile creation failed, but user was created:', profileError);
            // Don't throw error here, user was created successfully
          }
        }
        
        return { data: retryData, error: null };
      }
      
      // Handle other specific errors
      if (error.message?.includes('Signups not allowed')) {
        throw new Error('Cadastros estão desabilitados. Habilite "Enable email signups" nas configurações de Authentication do Supabase.');
      }
      
      if (error.message?.includes('User already registered')) {
        throw new Error('Este email já está cadastrado. Tente fazer login ou use outro email.');
      }
      
      throw error;
    } else {
      console.log('Sign up successful:', data.user?.email);
    }
    
    return { data, error };
  } catch (error) {
    console.error('Sign up exception:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Erro inesperado durante o cadastro') };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
    } else {
      console.log('Sign out successful');
    }
    
    return { error };
  } catch (error) {
    console.error('Sign out exception:', error);
    return { error };
  }
};

/**
 * Função para realizar login com provedores OAuth (Google, Facebook, Apple)
 *
 * Esta função inicia o fluxo OAuth com o provedor selecionado.
 * O Supabase gerencia automaticamente o redirecionamento e callback.
 *
 * Para Facebook, solicita os seguintes escopos:
 * - email: para obter o email do usuário
 * - public_profile: para obter nome e foto de perfil
 * - ads_read: para futura integração com Meta Ads API (opcional)
 *
 * @param provider - Provedor OAuth: 'google', 'facebook' ou 'apple'
 * @returns Objeto com data ou error do Supabase
 */
export const signInWithProvider = async (provider: 'google' | 'facebook' | 'apple') => {
  try {
    console.log(`Iniciando login OAuth com ${provider}...`);

    // Configurações específicas para cada provedor
    const providerOptions: Record<string, any> = {
      google: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
      facebook: {
        scopes: 'email,public_profile',
        queryParams: {
          auth_type: 'rerequest',
        },
      },
      apple: {
        queryParams: {
          prompt: 'consent',
        },
      },
    };

    // URL de redirecionamento após autenticação bem-sucedida
    // Em produção: https://adsops.bolt.host
    const redirectTo = 'https://adsops.bolt.host';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...providerOptions[provider],
      },
    });

    if (error) {
      console.error(`Erro no OAuth ${provider}:`, error);

      // Tratamento de erros específicos do Facebook
      if (provider === 'facebook') {
        if (error.message?.includes('access_denied')) {
          throw new Error('Você cancelou o login com Facebook. Tente novamente.');
        }
        if (error.message?.includes('temporarily blocked')) {
          throw new Error('Seu acesso ao Facebook está temporariamente bloqueado. Tente novamente mais tarde.');
        }
      }

      throw error;
    } else {
      console.log(`OAuth ${provider} iniciado com sucesso`);
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Exceção no OAuth ${provider}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(`Erro inesperado ao fazer login com ${provider}`)
    };
  }
};

export const resetPassword = async (email: string) => {
  try {
    // URL de redirecionamento em produção
    const redirectTo = 'https://adsops.bolt.host/reset-password';

    console.log('Reset password redirect URL:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('Reset password error:', error);
    } else {
      console.log('Reset password email sent to:', email);
    }

    return { error };
  } catch (error) {
    console.error('Reset password exception:', error);
    return { error };
  }
};

/**
 * Função para reenviar email de confirmação
 *
 * Esta função reenvia o email de confirmação para o usuário que ainda não confirmou seu email.
 * É útil quando o usuário não recebeu o email inicial ou ele expirou.
 *
 * @param email - Email do usuário que precisa confirmar a conta
 * @returns Objeto com data ou error
 */
export const resendConfirmationEmail = async (email: string) => {
  try {
    console.log('Resending confirmation email to:', email);

    // URL de redirecionamento em produção
    const redirectUrl = 'https://adsops.bolt.host/auth/callback';

    console.log('Resend confirmation redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('Resend confirmation email error:', error);

      // Tratamento de erros específicos
      if (error.message?.includes('Email rate limit exceeded')) {
        throw new Error('Você está enviando emails com muita frequência. Aguarde alguns minutos antes de tentar novamente.');
      }

      if (error.message?.includes('User not found')) {
        throw new Error('Usuário não encontrado. Verifique se o email está correto.');
      }

      if (error.message?.includes('Email already confirmed')) {
        throw new Error('Este email já foi confirmado. Você pode fazer login normalmente.');
      }

      throw error;
    } else {
      console.log('Confirmation email resent successfully to:', email);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Resend confirmation email exception:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Erro inesperado ao reenviar email de confirmação')
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Get current user error:', error);
    }
    
    return { user, error };
  } catch (error) {
    console.error('Get current user exception:', error);
    return { user: null, error };
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Check authentication error:', error);
    return false;
  }
};

// Helper function to get user profile
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
};