/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Use Apple's system fonts first for a more native look
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
        // Dark theme colors
        'brand-background': '#000000',        // Very dark black for main background
        'brand-surface': '#1A1A1A',          // Dark black for containers (was cream)
        
        // Text colors
        'brand-text-on-dark': '#FFFFFF',      // White text for dark backgrounds
        'brand-text-primary': '#FFFFFF',     // White text (was brown)
        'brand-text-secondary': '#B0B0B0',   // Light gray for secondary text
        
        // Keep all orange/gold accent colors
        'brand-primary-action': '#FF6B35',   // Orange for primary actions
        'brand-accent-gold': '#B08968',      // Gold accent
        'brand-accent-peach': '#F4A261',     // Peach accent
        
        // Additional colors for theming
        'electric-blue': '#00D9FF',
        'neon-cyan': '#39D0D8',
        'sakura-pink': '#FF8FA3',
      },
      boxShadow: {
        'neumorphic': '12px 12px 24px #0a0a0a, -12px -12px 24px #242424',
        'glow-primary': '0 0 15px 5px rgba(255, 107, 53, 0.2)', // brand-primary-action
        'glow-accent': '0 0 12px 3px rgba(176, 137, 104, 0.15)',
        'neumorphic-inset': 'inset 8px 8px 16px #0a0a0a, inset -8px -8px 16px #242424',
        'neumorphic-light': '6px 6px 12px #0a0a0a, -6px -6px 12px #242424',
        'neumorphic-light-inset': 'inset 4px 4px 8px #0a0a0a, inset -4px -4px 8px #242424',
        'top-md': '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        pulse: { // Overwrite default pulse for a more subtle effect
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.9' },
      },
      screens: {
        'xs': '375px',     // iPhone SE and up
        'sm': '414px',     // iPhone 6/7/8 Plus
        'md': '768px',     // iPad portrait
        'lg': '1024px',    // iPad landscape
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Add mobile-first typography
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
      },
    },
  },
},
  plugins: [],
}