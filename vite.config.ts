import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});