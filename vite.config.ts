import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      filename: 'manifest.json',
      includeAssets: ['logo.svg', 'logo192x192.png', 'logo512x512.png'],
      devOptions: {
        enabled: false
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
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
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'tegaki/fonts/caveat': path.resolve(
          __dirname,
          'node_modules/tegaki/dist/fonts/caveat/bundle.mjs'
        ),
      },
    },
    optimizeDeps: {
      include: [
        'tegaki/react',
        'tegaki/fonts/caveat',
        'lucide-react',
        'sonner',
        'axios',
        'xlsx',
        'exceljs',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'react-firebase-hooks/auth',
        'react-firebase-hooks/firestore',
        'motion/react',
        'date-fns',
        'uuid',
        'canvas-confetti'
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@mlc-ai/web-llm')) return 'webllm';
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
