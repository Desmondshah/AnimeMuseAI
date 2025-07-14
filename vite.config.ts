import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Define global variables to replace process.env in client code
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  plugins: [
    react(),
    // The code below enables dev tools like taking screenshots of your site
    // while it is being developed on chef.convex.dev.
    // Feel free to remove this code if you're no longer developing your app with Chef.
    mode === "development"
      ? {
          name: "inject-chef-dev",
          transform(code: string, id: string) {
            if (id.includes("main.tsx")) {
              return {
                code: `
window.addEventListener('message', async (message) => {
  if (message.source !== window.parent) return;
  if (message.data.type !== 'chefPreviewRequest') return;

  const worker = await import('https://chef.convex.dev/scripts/worker.bundled.mjs');
  await worker.respondToMessage(message);
});
              ${code}
            `,
                map: null,
              };
            }
            return null;
          },
        }
      : null,
    // End of code for taking screenshots on chef.convex.dev.
  ].filter(Boolean),
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    rollupOptions: {
      output: {
        // Optimize bundle names for caching
        entryFileNames: mode === 'production' ? 'assets/[name]-[hash].js' : '[name].js',
        chunkFileNames: mode === 'production' ? 'assets/[name]-[hash].js' : '[name].js',
        assetFileNames: mode === 'production' ? 'assets/[name]-[hash].[ext]' : '[name].[ext]',
        
        // Advanced manual chunking for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/convex') || id.includes('node_modules/@convex-dev')) {
            return 'convex-vendor';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/gsap')) {
            return 'animation-vendor';
          }
          if (id.includes('node_modules/openai') || id.includes('node_modules/@openai')) {
            return 'ai-vendor';
          }
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          
          // App chunks
          if (id.includes('src/components/admin/')) {
            return 'admin';
          }
          if (id.includes('src/components/auth/')) {
            return 'auth';
          }
          if (id.includes('src/components/animuse/') && 
              (id.includes('AnimeDetailPage') || id.includes('AIAssistantPage'))) {
            return 'pages';
          }
          if (id.includes('src/components/animuse/')) {
            return 'ui-components';
          }
          if (id.includes('src/hooks/')) {
            return 'hooks';
          }
        }
      },
      // Tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      }
    },
    cssCodeSplit: true,
    cssMinify: mode === 'production',
    minify: mode === 'production' ? 'esbuild' : false,
    
    // Enhanced esbuild options for production
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
        legalComments: 'none',
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        treeShaking: true,
        // Remove unused imports
        ignoreAnnotations: false,
        // Performance optimizations
        platform: 'browser',
        format: 'esm',
        splitting: true,
        // Security hardening
        banner: '/* AnimeMuseAI - Optimized Production Build */',
      }
    }),
    
    // Performance optimizations
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800, // Reduced for mobile
    assetsInlineLimit: 4096, // Inline small assets
    
    // Source maps for production debugging (optional)
    sourcemap: mode === 'production' ? 'hidden' : true,
    
    // Output directory cleanup
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'convex/react', 
      '@convex-dev/auth/react',
      'framer-motion',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: ['@vite/client', '@vite/env'],
    force: mode === 'development',
    // Prebundle dependencies for faster dev startup
    esbuildOptions: {
      target: 'es2020'
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: true,
    cors: {
      origin: ['http://localhost:5173', 'https://localhost:5173'],
      credentials: true
    },
    headers: {
      // Security headers for development
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    hmr: {
      port: 24678,
      overlay: true
    },
    fs: {
      strict: true,
      allow: ['..']
    },
    // Performance optimizations
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx']
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
}));
