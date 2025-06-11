/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        'heading': [
          '-apple-system',
          'BlinkMacSystemFont',
          'Poppins',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        'orbitron': ['Orbitron', 'monospace'],
      },
      colors: {
        // Dark theme colors (existing)
        'brand-background': '#000000',
        'brand-surface': '#1A1A1A',
        'brand-text-on-dark': '#FFFFFF',
        'brand-text-primary': '#FFFFFF',
        'brand-text-secondary': '#B0B0B0',
        'brand-primary-action': '#FF6B35',
        'brand-accent-gold': '#B08968',
        'brand-accent-peach': '#F4A261',
        
        // Liquid Glass Light Theme
        'glass': {
          'background': '#F8FAFC',      // Very light blue-gray
          'surface': '#FFFFFF',         // Pure white
          'surface-elevated': '#FEFEFE', // Slightly off-white
          'overlay': 'rgba(255, 255, 255, 0.8)',
          'border': 'rgba(255, 255, 255, 0.2)',
          'shadow': 'rgba(0, 0, 0, 0.1)',
        },
        
        // Light theme text colors
        'glass-text': {
          'primary': '#1A202C',         // Dark gray
          'secondary': '#4A5568',       // Medium gray
          'tertiary': '#718096',        // Light gray
          'inverse': '#FFFFFF',         // White for dark backgrounds
        },
        
        // Enhanced accent colors for light theme
        'glass-accent': {
          'primary': '#667EEA',         // Soft blue
          'secondary': '#764BA2',       // Purple
          'tertiary': '#F093FB',        // Pink
          'success': '#48BB78',         // Green
          'warning': '#ED8936',         // Orange
          'error': '#F56565',           // Red
        },
        
        // Gradient colors
        'gradient': {
          'blue': 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          'purple': 'linear-gradient(135deg, #764BA2 0%, #F093FB 100%)',
          'pink': 'linear-gradient(135deg, #F093FB 0%, #F59E0B 100%)',
          'ocean': 'linear-gradient(135deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)',
          'sunset': 'linear-gradient(135deg, #F59E0B 0%, #F56565 50%, #F093FB 100%)',
        },
        
        // Existing colors
        'electric-blue': '#00D9FF',
        'neon-cyan': '#39D0D8',
        'sakura-pink': '#FF8FA3',
      },
      
      backdropBlur: {
        'xs': '2px',
        'glass': '20px',
        'glass-heavy': '40px',
        'glass-ultra': '60px',
      },
      
      boxShadow: {
        // Existing shadows
        'neumorphic': '12px 12px 24px #0a0a0a, -12px -12px 24px #242424',
        'glow-primary': '0 0 15px 5px rgba(255, 107, 53, 0.2)',
        'glow-accent': '0 0 12px 3px rgba(176, 137, 104, 0.15)',
        
        // Liquid Glass shadows
        'glass-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'glass-md': '0 4px 16px 0 rgba(0, 0, 0, 0.08), 0 2px 6px 0 rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 8px 32px 0 rgba(0, 0, 0, 0.12), 0 4px 12px 0 rgba(0, 0, 0, 0.16)',
        'glass-xl': '0 16px 64px 0 rgba(0, 0, 0, 0.16), 0 8px 24px 0 rgba(0, 0, 0, 0.20)',
        
        // Colored glass shadows
        'glass-blue': '0 8px 32px 0 rgba(102, 126, 234, 0.2), 0 4px 12px 0 rgba(102, 126, 234, 0.15)',
        'glass-purple': '0 8px 32px 0 rgba(118, 75, 162, 0.2), 0 4px 12px 0 rgba(118, 75, 162, 0.15)',
        'glass-pink': '0 8px 32px 0 rgba(240, 147, 251, 0.2), 0 4px 12px 0 rgba(240, 147, 251, 0.15)',
        
        // Inner shadows for inset effects
        'glass-inset': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'glass-inset-lg': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.1)',
        
        // iOS-style shadows
        'ios-sm': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'ios-md': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
        'ios-lg': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
        'ios-xl': '0 15px 35px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.07)',
      },
      
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
        'glass-gradient-blue': 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.6) 100%)',
        'glass-gradient-purple': 'linear-gradient(135deg, rgba(118, 75, 162, 0.9) 0%, rgba(240, 147, 251, 0.6) 100%)',
        'glass-gradient-pink': 'linear-gradient(135deg, rgba(240, 147, 251, 0.9) 0%, rgba(245, 158, 11, 0.6) 100%)',
        'glass-noise': 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.02"/%3E%3C/svg%3E")',
        
        // Mesh gradients for backgrounds
        'mesh-1': 'radial-gradient(at 40% 20%, hsla(28,100%,74%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,1) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(340,100%,76%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,100%,77%,1) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(242,100%,70%,1) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(343,100%,76%,1) 0px, transparent 50%)',
        'mesh-2': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0px, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(225,39%,25%,1) 0px, transparent 50%), radial-gradient(at 50% 100%, hsla(225,39%,25%,1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(225,39%,25%,1) 0px, transparent 50%)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // Glass theme animations
        'glass-fade': 'glassFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'glass-scale': 'glassScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'glass-slide': 'glassSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'glass-blur': 'glassBlur 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        
        // Glass theme keyframes
        glassFade: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px) scale(0.98)',
            backdropFilter: 'blur(0px)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)',
            backdropFilter: 'blur(20px)'
          },
        },
        glassScale: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glassSlide: {
          '0%': { 
            transform: 'translateX(-20px)', 
            opacity: '0',
            backdropFilter: 'blur(0px)'
          },
          '100%': { 
            transform: 'translateX(0)', 
            opacity: '1',
            backdropFilter: 'blur(20px)'
          },
        },
        glassBlur: {
          '0%': { 
            backdropFilter: 'blur(0px)',
            opacity: '0'
          },
          '100%': { 
            backdropFilter: 'blur(20px)',
            opacity: '1'
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%': { 
            boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
            transform: 'scale(1)'
          },
          '100%': { 
            boxShadow: '0 0 40px rgba(102, 126, 234, 0.6)',
            transform: 'scale(1.02)'
          },
        },
      },
      
      screens: {
        'xs': '375px',
        'sm': '414px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
      },
      
      borderRadius: {
        'glass': '16px',
        'glass-lg': '24px',
        'glass-xl': '32px',
        'glass-2xl': '40px',
        'ios': '12px',
        'ios-lg': '20px',
      },
      
      transitionTimingFunction: {
        'glass': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'bounce-smooth': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      scale: {
        '102': '1.02',
        '98': '0.98',
      },
    },
  },
  plugins: [],
}