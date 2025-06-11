import React from 'react';
import useTheme from '../../../hooks/useTheme';

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md border border-brand-accent-gold text-brand-text-primary bg-brand-surface/60 backdrop-blur-md"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '🌞'}
    </button>
  );
}