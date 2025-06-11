// src/components/AdaptiveBackground.tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'framer-motion';

interface AdaptiveBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AdaptiveBackground: React.FC<AdaptiveBackgroundProps> = ({ 
  children, 
  className = '' 
}) => {
  const { isGlassTheme } = useTheme();

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Dark Theme Background */}
      <motion.div
        className="fixed inset-0 bg-black"
        initial={false}
        animate={{ opacity: isGlassTheme ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Glass Theme Background */}
      <motion.div
        className="fixed inset-0"
        initial={false}
        animate={{ opacity: isGlassTheme ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(118, 75, 162, 0.05) 0%, transparent 50%),
            linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)
          `
        }}
      />
      
      {/* Animated Orbs for Glass Theme */}
      {isGlassTheme && (
        <>
          <motion.div
            className="fixed w-96 h-96 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            initial={{ top: '10%', left: '10%' }}
          />
          
          <motion.div
            className="fixed w-80 h-80 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(240, 147, 251, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 5,
            }}
            initial={{ bottom: '20%', right: '15%' }}
          />
          
          <motion.div
            className="fixed w-64 h-64 rounded-full opacity-25"
            style={{
              background: 'radial-gradient(circle, rgba(118, 75, 162, 0.3) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
            animate={{
              x: [0, 60, 0],
              y: [0, -40, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            initial={{ top: '50%', right: '30%' }}
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};