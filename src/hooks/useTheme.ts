
// src/hooks/useTheme.ts
import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'dark' | 'glass';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  isGlassTheme: boolean;
  isDarkTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};