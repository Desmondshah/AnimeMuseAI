// src/components/ThemeToggle.tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { theme, toggleTheme, isGlassTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300
        ${isGlassTheme 
          ? 'bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30' 
          : 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20'
        }
        ${className}
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {/* Animated Background */}
      <motion.div
        className={`
          absolute inset-0 rounded-2xl
          ${isGlassTheme 
            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' 
            : 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20'
          }
        `}
        initial={false}
        animate={{ opacity: isGlassTheme ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Icon Container */}
      <div className="relative z-10 flex items-center justify-center w-8 h-8">
        {/* Dark Theme Icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ 
            scale: theme === 'dark' ? 1 : 0,
            opacity: theme === 'dark' ? 1 : 0,
            rotate: theme === 'dark' ? 0 : 180
          }}
          transition={{ duration: 0.3 }}
        >
          <svg 
            className="w-5 h-5 text-orange-400" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
        </motion.div>
        
        {/* Glass Theme Icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ 
            scale: theme === 'glass' ? 1 : 0,
            opacity: theme === 'glass' ? 1 : 0,
            rotate: theme === 'glass' ? 0 : -180
          }}
          transition={{ duration: 0.3 }}
        >
          <svg 
            className="w-5 h-5 text-blue-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" 
            />
          </svg>
        </motion.div>
      </div>
      
      {/* Label */}
      {showLabel && (
        <motion.span
          className={`
            relative z-10 text-sm font-medium
            ${isGlassTheme ? 'text-gray-700' : 'text-white/80'}
          `}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isGlassTheme ? 'Glass Mode' : 'Dark Mode'}
        </motion.span>
      )}
      
      {/* Shimmer Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-2xl"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut'
        }}
      />
    </button>
  );
};