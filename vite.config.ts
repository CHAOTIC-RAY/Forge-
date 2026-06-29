import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    worker: {
      format: 'es', // ES workers for dynamic imports
    },
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'logo192x192.png', 'logo512x512.png'],
      devOptions: {
        enabled: true
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallbackDenylist: [/^\/api/, /firestore\.googleapis\.com/, /\/__\/auth\//]
      },
      manifest: {
        name: 'Forge App',
        short_name: 'Forge',
        description: 'Multi-tenant content calendar platform',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        icons: [
          {
            src: 'logo192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Use prebuilt font bundle so Vite does not break tegaki's import attributes
        'tegaki/fonts/caveat': path.resolve(
          __dirname,
          'node_modules/tegaki/dist/fonts/caveat/bundle.mjs'
        ),
      },
    },
    optimizeDeps: {
      include: ['tegaki/react', 'tegaki/fonts/caveat'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@litert-lm/core')) return 'vendor-litert';
            if (id.includes('@mlc-ai/web-llm')) return 'vendor-webllm';
          },
        },
      },
    },
    server: {
      hmr: false,
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
