import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we're in development and show helpful error
const isDevelopment = import.meta.env.DEV;
const hasSupabaseConfig = supabaseUrl && supabaseAnonKey;

if (!hasSupabaseConfig && isDevelopment) {
  console.warn('⚠️ Supabase não configurado. Usando modo demo.');
}

// Create client with fallback for demo mode
export const supabase = hasSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Demo mode flag
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: undefined, // Disable email confirmation
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
            emailRedirectTo: undefined,
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

export const signInWithProvider = async (provider: 'google' | 'facebook' | 'apple') => {
  try {
    console.log(`Attempting ${provider} OAuth login...`);
    
    // Get the current URL to determine the correct redirect
    const currentUrl = window.location.origin;
    const redirectTo = `${currentUrl}/auth/callback`;
    
    console.log('Redirect URL:', redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error(`${provider} OAuth error:`, error);
    } else {
      console.log(`${provider} OAuth initiated successfully`);
    }
    
    return { data, error };
  } catch (error) {
    console.error(`${provider} OAuth exception:`, error);
    return { data: null, error };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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