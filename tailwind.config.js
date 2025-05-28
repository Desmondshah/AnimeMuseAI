/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-background': '#321D0B', // Dark Brown
        'brand-surface': '#F7EBE1',    // Cream
        'brand-text-primary': '#321D0B',   // Dark Brown (on cream surface)
        'brand-text-on-dark': '#F7EBE1', // Cream (on dark background)
        'brand-accent-gold': '#B08968', // Muted Gold (adjusted from #80650 for better contrast/use)
        'brand-accent-peach': '#ECB091',// Soft Peach
        'brand-primary-action': '#FF6939',// Vibrant Coral
        'brand-highlight': '#FF6939',   // Vibrant Coral
        'brand-secondary-action': '#ECB091', // Soft Peach for secondary actions

        // giữ lại một số màu cũ nếu cần thiết cho các component chưa được migrate hoặc cho các sắc thái
        'sakura-pink': '#FFB7C5',
        'neon-cyan': '#00FFF7',
        'electric-blue': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Smart and readable
        heading: ['Poppins', 'sans-serif'], // Stylish but clear for headings
        orbitron: ['Orbitron', 'sans-serif'], // Keep if specifically used for a futuristic vibe
      },
      boxShadow: {
        // Adjusted shadows for the new theme - more subtle
        'custom-light': '4px 4px 8px #D3CBBF, -4px -4px 8px #FFFFFF', // For light surfaces like F7EBE1
        'custom-light-inset': 'inset 4px 4px 8px #D3CBBF, inset -4px -4px 8px #FFFFFF',
        'custom-dark': '4px 4px 8px #2A1707, -4px -4px 8px #3A230F', // For dark surfaces like 321D0B
        'custom-dark-inset': 'inset 4px 4px 8px #2A1707, inset -4px -4px 8px #3A230F',
      }
    },
  },
  plugins: [],
}