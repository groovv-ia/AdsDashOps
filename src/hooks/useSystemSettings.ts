import { useState, useEffect } from 'react';

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
  animations_enabled: boolean;
  high_contrast: boolean;
  reduce_motion: boolean;
}

const defaultSettings: SystemSettings = {
  theme: 'light',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  auto_refresh: true,
  refresh_interval: 300,
  compact_mode: false,
  show_tooltips: true,
  animations_enabled: true,
  high_contrast: false,
  reduce_motion: false
};

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Apply settings to document
    applySettings(settings);
    
    // Setup auto refresh
    setupAutoRefresh();
    
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [settings]);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Force theme to always be light
        parsed.theme = 'light';
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    }
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    // Force theme to always be light
    if (updates.theme) {
      updates.theme = 'light';
    }
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
  };

  const applySettings = (currentSettings: SystemSettings) => {
    const root = document.documentElement;
    
    // Always apply light theme
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    
    // Apply compact mode
    root.classList.toggle('compact-mode', currentSettings.compact_mode);
    
    // Apply animations
    root.classList.toggle('no-animations', !currentSettings.animations_enabled);
    
    // Apply high contrast
    root.classList.toggle('high-contrast', currentSettings.high_contrast);
    
    // Apply reduced motion
    root.classList.toggle('reduce-motion', currentSettings.reduce_motion);
    
    // Apply CSS custom properties
    root.style.setProperty('--animation-duration', currentSettings.animations_enabled ? '0.3s' : '0s');
    root.style.setProperty('--transition-duration', currentSettings.animations_enabled ? '0.2s' : '0s');
    
    // Apply spacing for compact mode
    if (currentSettings.compact_mode) {
      root.style.setProperty('--spacing-unit', '0.75rem');
      root.style.setProperty('--card-padding', '1rem');
      root.style.setProperty('--button-padding-y', '0.375rem');
      root.style.setProperty('--button-padding-x', '0.75rem');
    } else {
      root.style.setProperty('--spacing-unit', '1rem');
      root.style.setProperty('--card-padding', '1.5rem');
      root.style.setProperty('--button-padding-y', '0.5rem');
      root.style.setProperty('--button-padding-x', '1rem');
    }
  };

  const setupAutoRefresh = () => {
    // Clear existing interval
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      setAutoRefreshInterval(null);
    }

    // Setup new interval if auto refresh is enabled
    if (settings.auto_refresh && settings.refresh_interval > 0) {
      const interval = setInterval(() => {
        // Dispatch custom event for auto refresh
        window.dispatchEvent(new CustomEvent('autoRefresh', {
          detail: { source: 'system-settings' }
        }));
      }, settings.refresh_interval * 1000);
      
      setAutoRefreshInterval(interval);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('systemSettings');
  };

  return {
    settings,
    updateSettings,
    resetToDefaults,
    loadSettings
  };
};