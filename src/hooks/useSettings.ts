import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface SystemSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  auto_refresh: boolean;
  refresh_interval: number;
  compact_mode: boolean;
  show_tooltips: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  company?: string;
  position?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export const useSettings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    auto_refresh: true,
    refresh_interval: 300,
    compact_mode: false,
    show_tooltips: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load or create profile
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile = {
          id: user?.id,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || '',
          timezone: 'America/Sao_Paulo',
          language: 'pt-BR'
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar perfil:', createError);
        } else {
          profileData = createdProfile;
        }
      } else if (error) {
        console.error('Erro ao carregar perfil:', error);
      }

      if (profileData) {
        setProfile(profileData);
      }

      // Load system settings from localStorage
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSystemSettings(prev => ({ ...prev, ...parsed }));
        applyTheme(parsed.theme || 'light');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Ensure required fields are present
      const profileData = {
        id: user.id,
        email: user.email || updates.email || '',
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return { success: false, error: error.message };
      }

      setProfile(data);

      // Update user metadata in auth if avatar_url is being updated
      if (updates.avatar_url) {
        await supabase.auth.updateUser({
          data: { 
            avatar_url: updates.avatar_url,
            full_name: data.full_name
          }
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  };

  const updateSystemSettings = (updates: Partial<SystemSettings>) => {
    const newSettings = { ...systemSettings, ...updates };
    setSystemSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
    
    if (updates.theme) {
      applyTheme(updates.theme);
    }
  };

  const applyTheme = (theme: string) => {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const result = await updateProfile({ avatar_url: publicUrl });

      if (result.success) {
        return { success: true, url: publicUrl };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Erro no upload do avatar:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido no upload' 
      };
    }
  };

  const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: systemSettings.currency
    });
    return formatter.format(value);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    if (systemSettings.time_format === '12h') {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    } else {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }

    return new Intl.DateTimeFormat(systemSettings.language, options).format(dateObj);
  };

  return {
    profile,
    systemSettings,
    loading,
    updateProfile,
    updateSystemSettings,
    uploadAvatar,
    formatCurrency,
    formatDate,
    loadSettings
  };
};