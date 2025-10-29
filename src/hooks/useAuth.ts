import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isDemoMode } from '../lib/supabase';

// Hook customizado para gerenciar autenticação do usuário
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Em modo demo, não há autenticação real
    if (isDemoMode) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Verifica se há um usuário autenticado ao montar o componente
    const checkUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Escuta mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        // Atualiza o estado do usuário baseado no evento
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }

        // Eventos específicos
        if (event === 'SIGNED_IN') {
          console.log('Usuário fez login');
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuário fez logout');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token renovado');
        } else if (event === 'USER_UPDATED') {
          console.log('Usuário atualizado');
        }
      }
    );

    // Cleanup: cancela a inscrição ao desmontar
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isDemoMode,
  };
};
