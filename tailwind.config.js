/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'heading': ['Poppins', 'system-ui', 'sans-serif'],
        'orbitron': ['Orbitron', 'monospace'],
      },
      colors: {
        // Dark theme colors
        'brand-background': '#0F0F0F',        // Very dark black for main background
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
        'neumorphic-inset': 'inset 8px 8px 16px #0a0a0a, inset -8px -8px 16px #242424',
        'neumorphic-light': '6px 6px 12px #0a0a0a, -6px -6px 12px #242424',
        'neumorphic-light-inset': 'inset 4px 4px 8px #0a0a0a, inset -4px -4px 8px #242424',
        'top-md': '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}