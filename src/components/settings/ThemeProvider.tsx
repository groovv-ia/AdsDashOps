import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  effectiveTheme: 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme] = useState<Theme>('light');
  const [isDark] = useState(false);
  const [effectiveTheme] = useState<'light'>('light');

  useEffect(() => {
    // Always apply light theme
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    
    // Update body background for full coverage
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#111827';
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#3B82F6');
    }
  }, []);

  const handleSetTheme = () => {
    // Do nothing - theme is always light
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDark, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};