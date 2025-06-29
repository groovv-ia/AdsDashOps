import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface SystemSettings {
  theme: 'light';
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
        // Force theme to always be light
        parsed.theme = 'light';
        setSystemSettings(prev => ({ ...prev, ...parsed }));
        applyTheme('light');
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
    // Force theme to always be light
    if (updates.theme) {
      updates.theme = 'light';
    }
    
    const newSettings = { ...systemSettings, ...updates };
    setSystemSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
    
    applyTheme('light');
  };

  const applyTheme = (theme: string) => {
    // Always apply light theme
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      console.log('Iniciando upload do avatar...', { fileName: file.name, fileSize: file.size, fileType: file.type });

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Por favor, selecione um arquivo de imagem.' };
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'A imagem deve ter no máximo 5MB.' };
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = fileName;

      console.log('Fazendo upload para:', filePath);

      // First, try to remove existing file
      try {
        await supabase.storage
          .from('avatars')
          .remove([filePath]);
        console.log('Arquivo anterior removido (se existia)');
      } catch (removeError) {
        console.log('Nenhum arquivo anterior para remover ou erro ao remover:', removeError);
      }

      // Upload new file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return { success: false, error: `Erro no upload: ${uploadError.message}` };
      }

      console.log('Upload realizado com sucesso:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('URL pública gerada:', publicUrl);

      // Add timestamp to force cache refresh
      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const result = await updateProfile({ avatar_url: timestampedUrl });

      if (result.success) {
        console.log('Perfil atualizado com sucesso');
        return { success: true, url: timestampedUrl };
      } else {
        console.error('Erro ao atualizar perfil:', result.error);
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