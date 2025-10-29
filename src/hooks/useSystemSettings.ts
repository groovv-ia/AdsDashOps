import { useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { SystemSettings } from '../types/advertising';

// Configurações padrão do sistema
const defaultSettings: Omit<SystemSettings, 'id' | 'user_id' | 'updated_at'> = {
  theme: 'auto',
  auto_refresh: false,
  refresh_interval: 5, // 5 minutos
  email_notifications: true,
  push_notifications: false,
  currency: 'BRL',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
};

// Hook customizado para gerenciar configurações do sistema
export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar configurações do banco de dados
  const fetchSettings = async (userId: string) => {
    if (isDemoMode || !supabase) {
      // Em modo demo, usa configurações padrão
      const mockSettings: SystemSettings = {
        id: 'settings-demo',
        user_id: userId,
        ...defaultSettings,
        updated_at: new Date().toISOString(),
      };
      setSettings(mockSettings);
      setLoading(false);
      return;
    }

    try {
      // Busca configurações do usuário
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = nenhum registro encontrado (não é um erro)
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Se não existem configurações, cria com valores padrão
        const newSettings: SystemSettings = {
          id: `settings-${userId}`,
          user_id: userId,
          ...defaultSettings,
          updated_at: new Date().toISOString(),
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('system_settings')
          .insert([newSettings])
          .select()
          .single();

        if (insertError) throw insertError;

        setSettings(insertedData);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Em caso de erro, usa configurações padrão
      const fallbackSettings: SystemSettings = {
        id: `settings-${userId}`,
        user_id: userId,
        ...defaultSettings,
        updated_at: new Date().toISOString(),
      };
      setSettings(fallbackSettings);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar configurações
  const updateSettings = async (
    updates: Partial<Omit<SystemSettings, 'id' | 'user_id' | 'updated_at'>>
  ) => {
    if (!settings) return;

    const updatedSettings: SystemSettings = {
      ...settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Atualiza estado local imediatamente para melhor UX
    setSettings(updatedSettings);

    if (isDemoMode || !supabase) {
      console.log('Modo demo: configurações atualizadas localmente', updates);
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', settings.user_id);

      if (error) throw error;

      console.log('Configurações atualizadas com sucesso');

      // Se auto_refresh foi ativado, dispara evento personalizado
      if (updates.auto_refresh !== undefined && updates.auto_refresh) {
        window.dispatchEvent(
          new CustomEvent('autoRefresh', {
            detail: { source: 'system-settings' },
          })
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      // Reverte mudanças em caso de erro
      setSettings(settings);
      throw error;
    }
  };

  // Função para resetar configurações para os valores padrão
  const resetSettings = async () => {
    if (!settings) return;

    const resetedSettings: SystemSettings = {
      id: settings.id,
      user_id: settings.user_id,
      ...defaultSettings,
      updated_at: new Date().toISOString(),
    };

    setSettings(resetedSettings);

    if (isDemoMode || !supabase) {
      console.log('Modo demo: configurações resetadas');
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          ...defaultSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', settings.user_id);

      if (error) throw error;

      console.log('Configurações resetadas com sucesso');
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      throw error;
    }
  };

  // Função para alternar tema (light/dark/auto)
  const toggleTheme = () => {
    if (!settings) return;

    const themeOrder: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themeOrder.indexOf(settings.theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];

    updateSettings({ theme: nextTheme });
  };

  // Busca configurações quando o hook é montado
  useEffect(() => {
    const getUserAndFetch = async () => {
      if (isDemoMode || !supabase) {
        await fetchSettings('demo-user');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchSettings(user.id);
      } else {
        setLoading(false);
      }
    };

    getUserAndFetch();
  }, []);

  // Configura auto-refresh se estiver ativado
  useEffect(() => {
    if (!settings?.auto_refresh || !settings?.refresh_interval) return;

    const intervalMs = settings.refresh_interval * 60 * 1000; // Converte minutos para ms

    const intervalId = setInterval(() => {
      console.log('Auto-refresh disparado');
      window.dispatchEvent(
        new CustomEvent('autoRefresh', {
          detail: { source: 'system-settings' },
        })
      );
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [settings?.auto_refresh, settings?.refresh_interval]);

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
    toggleTheme,
    refresh: () => {
      if (isDemoMode || !supabase) {
        fetchSettings('demo-user');
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) fetchSettings(user.id);
        });
      }
    },
  };
};
