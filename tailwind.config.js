/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sakura-pink': '#FFB7C5',
        'neon-cyan': '#00FFF7',
        'electric-blue': '#3B82F6',
        'brand-dark': '#1A1A2E', // A deep, dark color for background
        'brand-surface': '#2A2A3E', // Slightly lighter for cards/surfaces
        'brand-text': '#E0E0E0', // Primary text color
        'brand-text-secondary': '#A0A0B0', // Secondary text color
      },
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'neumorphic-light': '5px 5px 10px #161625, -5px -5px 10px #2e2e47', // For dark theme
        'neumorphic-light-inset': 'inset 5px 5px 10px #161625, inset -5px -5px 10px #2e2e47',
      }
    },
  },
  plugins: [],
}
