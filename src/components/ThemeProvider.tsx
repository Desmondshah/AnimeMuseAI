// src/components/ThemeProvider.tsx
import React, { useEffect, useState, ReactNode } from 'react';
import { ThemeContext, ThemeType } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'dark' 
}) => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('animuse-theme') as ThemeType;
    if (stored && ['dark', 'glass'].includes(stored)) {
      return stored;
    }
    
    // Check system preference for light theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'glass';
    }
    
    return defaultTheme;
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'glass' : 'dark');
  };

  const isGlassTheme = theme === 'glass';
  const isDarkTheme = theme === 'dark';

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('animuse-theme', theme);
    
    // Apply theme to document
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.removeAttribute('data-theme');
    body.classList.remove('theme-glass', 'theme-dark');
    
    // Apply new theme
    if (theme === 'glass') {
      root.setAttribute('data-theme', 'glass');
      body.classList.add('theme-glass');
    } else {
      body.classList.add('theme-dark');
    }
    
    // Update meta theme color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'glass' ? '#F8FAFC' : '#000000');
    }
    
    // Update status bar style for iOS
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', theme === 'glass' ? 'default' : 'black-translucent');
    }
    
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const hasManualPreference = localStorage.getItem('animuse-theme');
      if (!hasManualPreference) {
        setTheme(e.matches ? 'glass' : 'dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      isGlassTheme,
      isDarkTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};