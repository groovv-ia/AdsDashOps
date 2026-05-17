import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isDemoMode } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo mode handling
    if (isDemoMode) {
      const demoSession = localStorage.getItem('demo-session');
      if (demoSession) {
        try {
          const mockUser = JSON.parse(demoSession);
          setUser(mockUser as User);
        } catch (error) {
          console.error('Erro ao carregar sessão demo:', error);
        }
      }
      setLoading(false);
      return;
    }
    
    // Get initial user
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
          console.error('Error getting user:', error);
        }
        setUser(user);
      } catch (error) {
        console.error('Error in getInitialUser:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // Escuta mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Evita re-render desnecessario se o usuario nao mudou
        // (ex: TOKEN_REFRESHED ao voltar para a aba)
        const newUser = session?.user ?? null;
        setUser(prev => {
          if (prev?.id === newUser?.id) return prev;
          return newUser;
        });
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};