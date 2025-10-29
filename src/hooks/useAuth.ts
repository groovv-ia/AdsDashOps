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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};