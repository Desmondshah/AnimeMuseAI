import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Simple chunking strategy to avoid circular dependencies
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'convex-vendor': ['convex/react', '@convex-dev/auth/react'],
        }
      }
    },
    sourcemap: mode === 'production' ? false : true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'convex/react', 
      '@convex-dev/auth/react'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
}));
