import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/electra-admin/' : '/'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nacos/media': path.resolve(__dirname, '../../packages/media/src/index.js'),
      '@nacos/supabase/auth': path.resolve(__dirname, '../../packages/supabase/src/auth.js'),
      '@nacos/supabase/adminAuth': path.resolve(__dirname, '../../packages/supabase/src/adminAuth.js'),
      '@nacos/supabase/electraService': path.resolve(__dirname, '../../packages/supabase/src/electraService.js'),
      '@nacos/supabase': path.resolve(__dirname, '../../packages/supabase/src/index.js'),
      '@nacos/config/academic': path.resolve(__dirname, '../../packages/config/academic.js'),
      '@nacos/config/idCardTemplate': path.resolve(__dirname, '../../packages/config/idCardTemplate.js'),
      '@nacos/config/urls': path.resolve(__dirname, '../../packages/config/urls.js'),
      '@nacos/config': path.resolve(__dirname, '../../packages/config/tailwind.preset.js')
    },
  },
  esbuild: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 5179,
  },
});
