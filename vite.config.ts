import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        strictPort: true, // Don't try other ports if 5173 is busy
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL || 'http://localhost:3001'),
        'process.env.ENABLE_DYNAMIC_TOOLS': JSON.stringify(env.ENABLE_DYNAMIC_TOOLS || 'false')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          external: ['glob']
        }
      },
      optimizeDeps: {
        exclude: ['glob']
      }
    };
});
