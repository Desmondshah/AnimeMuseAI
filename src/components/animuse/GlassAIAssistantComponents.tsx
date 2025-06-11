// src/components/animuse/GlassAIAssistantComponents.tsx
import React, { memo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";

// Enhanced Loading Spinner for Glass Theme
export const GlassLoadingSpinner: React.FC<{ 
  size?: string; 
  message?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}> = memo(({ 
  size = "h-12 w-12", 
  message = "AniMuse is thinking...",
  variant = 'primary'
}) => {
  const { isGlassTheme } = useTheme();

  const getVariantColors = () => {
    if (isGlassTheme) {
      switch (variant) {
        case 'primary':
          return {
            primary: '#667EEA',
            secondary: '#764BA2',
            accent: '#F093FB',
          };
        case 'secondary':
          return {
            primary: '#764BA2',
            secondary: '#F093FB',
            accent: '#667EEA',
          };
        case 'accent':
          return {
            primary: '#F093FB',
            secondary: '#667EEA',
            accent: '#764BA2',
          };
      }
    } else {
      return {
        primary: '#FF6B35',
        secondary: '#B08968',
        accent: '#F4A261',
      };
    }
  };

  const colors = getVariantColors();

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        {/* Main Spinner Ring */}
        <motion.div 
          className={`${size} rounded-full border-4 border-transparent`}
          style={{
            borderTopColor: colors.primary,
            borderRightColor: colors.secondary,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner Counter-rotating Ring */}
        <motion.div 
          className="absolute top-1 left-1 h-10 w-10 rounded-full border-4 border-transparent"
          style={{
            borderBottomColor: colors.accent,
            borderLeftColor: isGlassTheme ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Pulsing Core */}
        <motion.div 
          className="absolute top-3 left-3 h-6 w-6 rounded-full"
          style={{
            background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Glass Theme: Additional Glow Effect */}
        {isGlassTheme && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
              filter: 'blur(10px)',
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Orbiting Particles */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div 
            className="absolute top-0 left-1/2 w-1 h-1 -ml-0.5 rounded-full"
            style={{ backgroundColor: colors.secondary }}
          />
          <div 
            className="absolute bottom-0 left-1/2 w-1 h-1 -ml-0.5 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        </motion.div>
        
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div 
            className="absolute top-1/2 left-0 w-1 h-1 -mt-0.5 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
          <div 
            className="absolute top-1/2 right-0 w-1 h-1 -mt-0.5 rounded-full"
            style={{ backgroundColor: isGlassTheme ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)' }}
          />
        </motion.div>
      </div>
      
      {message && (
        <div className="mt-4 text-center">
          <motion.p 
            className={`text-sm font-medium ${
              isGlassTheme ? 'text-gray-700' : 'text-white/90'
            }`}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {message}
          </motion.p>
          
          <div className="flex justify-center mt-2 space-x-1">
            {[0, 0.1, 0.2].map((delay, index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.primary }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Enhanced Mode Card for Glass Theme
export const GlassModeCard: React.FC<{
  mode: { id: string; label: string; desc: string; icon: string; gradient: string };
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = memo(({ mode, isActive, onClick, className }) => {
  const { isGlassTheme } = useTheme();

  const getCardStyles = () => {
    if (isGlassTheme) {
      if (isActive) {
        return {
          background: 'rgba(102, 126, 234, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: `
            0 8px 32px rgba(102, 126, 234, 0.2),
            0 4px 16px rgba(102, 126, 234, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        };
      } else {
        return {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        };
      }
    } else {
      // Dark theme styles (existing)
      if (isActive) {
        return {
          background: `linear-gradient(135deg, ${mode.gradient.replace('from-', '').replace('to-', '').replace('-500/50', '').replace('-400/50', '')})`,
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        };
      } else {
        return {
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        };
      }
    }
  };

  return (
    <div className={`group relative ${className || ''}`}>
      {/* Glow effect - adapted for theme */}
      <motion.div
        className="absolute -inset-2 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
        style={{
          background: isGlassTheme 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))'
            : `linear-gradient(135deg, ${mode.gradient.replace('from-', '').replace('to-', '').replace('/50', '/30')})`,
        }}
        animate={{
          opacity: isActive ? (isGlassTheme ? 0.4 : 0.6) : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.button
        onClick={onClick}
        className={`relative w-full p-4 rounded-2xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isGlassTheme ? 'focus:ring-blue-500' : 'focus:ring-orange-500'
        }`}
        style={getCardStyles()}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
        </div>
        
        {/* Glass theme: Additional shimmer effect */}
        {isGlassTheme && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 5,
              ease: 'easeInOut'
            }}
          />
        )}
        
        <div className="relative z-10 text-center space-y-2">
          <motion.div
            className="mode-icon text-3xl transition-transform duration-300"
            animate={{
              scale: isActive ? 1.1 : 1,
              rotateY: isActive ? 360 : 0,
            }}
            transition={{
              scale: { duration: 0.3 },
              rotateY: { duration: 2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }
            }}
          >
            {mode.icon}
          </motion.div>
          
          <div 
            className={`mode-label text-sm font-medium transition-all duration-300 ${
              isGlassTheme 
                ? isActive ? 'text-blue-700' : 'text-gray-700'
                : isActive ? 'text-white' : 'text-white/90'
            }`}
          >
            {mode.label}
          </div>
          
          <div 
            className={`mode-desc text-xs leading-relaxed transition-all duration-300 ${
              isGlassTheme 
                ? isActive ? 'text-blue-600' : 'text-gray-600'
                : isActive ? 'text-white/80' : 'text-white/60'
            }`}
          >
            {mode.desc}
          </div>
        </div>
        
        {/* Selection indicator */}
        {isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
            style={{
              backgroundColor: isGlassTheme ? '#667EEA' : '#FF6B35',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: isGlassTheme ? '#667EEA' : '#FF6B35',
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
});

// Glass Theme Chat Message Bubble
export const GlassChatBubble: React.FC<{
  type: "user" | "ai" | "error";
  children: React.ReactNode;
  className?: string;
}> = memo(({ type, children, className }) => {
  const { isGlassTheme } = useTheme();

  const getBubbleStyles = () => {
    if (isGlassTheme) {
      switch (type) {
        case "user":
          return {
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            color: '#1A202C',
            borderRadius: '24px 24px 8px 24px',
          };
        case "ai":
          return {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#1A202C',
            borderRadius: '24px 24px 24px 8px',
          };
        case "error":
          return {
            background: 'rgba(244, 67, 54, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: '#C53030',
            borderRadius: '24px 24px 24px 8px',
          };
      }
    } else {
      // Dark theme styles (existing)
      switch (type) {
        case "user":
          return {
            background: 'linear-gradient(135deg, #FF6B35, #B08968)',
            color: '#FFFFFF',
            borderRadius: '24px 24px 8px 24px',
          };
        case "ai":
          return {
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            borderRadius: '24px 24px 24px 8px',
          };
        case "error":
          return {
            background: 'rgba(244, 67, 54, 0.2)',
            border: '1px solid rgba(244, 67, 54, 0.5)',
            color: '#FF6B6B',
            borderRadius: '24px 24px 24px 8px',
          };
      }
    }
  };

  return (
    <motion.div
      className={`relative p-4 shadow-lg max-w-[85%] ${className || ''}`}
      style={getBubbleStyles()}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3 
      }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Glass theme: Top highlight */}
      {isGlassTheme && (
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Glass theme: Subtle noise texture */}
      {isGlassTheme && (
        <div 
          className="absolute inset-0 opacity-5 rounded-[inherit]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </motion.div>
  );
});

// Glass Theme Input Component
export const GlassInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
}> = memo(({ 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  multiline = false, 
  rows = 1,
  className 
}) => {
  const { isGlassTheme } = useTheme();

  const getInputStyles = () => {
    if (isGlassTheme) {
      return {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: '#1A202C',
      };
    } else {
      return {
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#FFFFFF',
      };
    }
  };

  const Component = multiline ? 'textarea' : 'input';

  return (
    <motion.div
      className="relative"
      whileFocus={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Component
        type={multiline ? undefined : "text"}
        rows={multiline ? rows : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-2xl
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-0
          placeholder:opacity-60 resize-none
          ${isGlassTheme 
            ? 'focus:ring-blue-500 placeholder:text-gray-500' 
            : 'focus:ring-orange-500 placeholder:text-white/60'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className || ''}
        `}
        style={{
          ...getInputStyles(),
          fontSize: '16px', // Prevent iOS zoom
        }}
      />
      
      {/* Glass theme: Top highlight */}
      {isGlassTheme && (
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
});

// Usage Example Component
export const GlassAIAssistantDemo: React.FC = () => {
  const { isGlassTheme, toggleTheme } = useTheme();

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h2 className={`text-2xl font-bold mb-4 ${
          isGlassTheme ? 'text-gray-800' : 'text-white'
        }`}>
          Glass Theme Components Demo
        </h2>
        
        <button
          onClick={toggleTheme}
          className="mb-6 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Switch to {isGlassTheme ? 'Dark' : 'Glass'} Theme
        </button>
      </div>

      {/* Loading Spinner Demo */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className={`text-lg font-semibold mb-4 ${
          isGlassTheme ? 'text-gray-700' : 'text-white'
        }`}>
          Enhanced Loading Spinner
        </h3>
        <GlassLoadingSpinner variant="primary" />
      </div>

      {/* Mode Cards Demo */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className={`text-lg font-semibold mb-4 ${
          isGlassTheme ? 'text-gray-700' : 'text-white'
        }`}>
          Mode Selection Cards
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <GlassModeCard
            mode={{
              id: "general",
              label: "General",
              desc: "Personalized recommendations",
              icon: "🎯",
              gradient: "from-blue-500/50 to-cyan-400/50"
            }}
            isActive={true}
            onClick={() => {}}
          />
          <GlassModeCard
            mode={{
              id: "character",
              label: "Character",
              desc: "Character-focused finds",
              icon: "👤",
              gradient: "from-purple-500/50 to-pink-400/50"
            }}
            isActive={false}
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Chat Bubbles Demo */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className={`text-lg font-semibold mb-4 ${
          isGlassTheme ? 'text-gray-700' : 'text-white'
        }`}>
          Chat Message Bubbles
        </h3>
        <div className="space-y-4">
          <div className="flex justify-end">
            <GlassChatBubble type="user">
              This is a user message with the new glass theme!
            </GlassChatBubble>
          </div>
          <div className="flex justify-start">
            <GlassChatBubble type="ai">
              This is an AI response with beautiful glassmorphism effects.
            </GlassChatBubble>
          </div>
        </div>
      </div>

      {/* Input Demo */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className={`text-lg font-semibold mb-4 ${
          isGlassTheme ? 'text-gray-700' : 'text-white'
        }`}>
          Glass Input Components
        </h3>
        <div className="space-y-4">
          <GlassInput
            value=""
            onChange={() => {}}
            placeholder="Type your message here..."
          />
          <GlassInput
            value=""
            onChange={() => {}}
            placeholder="Multiline input..."
            multiline
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};