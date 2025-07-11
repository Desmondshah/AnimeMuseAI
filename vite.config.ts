import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'convex-vendor': ['convex/react'],
          'ui-components': [
            './src/components/animuse/AnimeCard.tsx',
            './src/components/animuse/shared/StyledButton.tsx',
            './src/components/animuse/BottomNavigationBar.tsx'
          ],
          'pages': [
            './src/components/animuse/AIAssistantPage.tsx',
            './src/components/animuse/AnimeDetailPage.tsx'
          ]
        }
      }
    },
    cssCodeSplit: true,
    // Use esbuild (default and faster than terser)
    minify: mode === 'production' ? 'esbuild' : false,
    // esbuild options for better mobile optimization
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
        legalComments: 'none',
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
      }
    }),
    // Optimize chunk size for mobile
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'convex/react', '@convex-dev/auth/react'],
    force: mode === 'development'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false, // Allow fallback to other ports
    open: true,
    force: true, // Force dependency pre-bundling
    cors: true,
    hmr: {
      port: 24678,
    },
    fs: {
      strict: false
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
}));
