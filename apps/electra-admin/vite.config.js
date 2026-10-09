import '../../packages/supabase/src/server/loadEnv.js';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import crypto from 'crypto';
import { handleStorageRequest } from '../../packages/supabase/src/server/b2StorageDispatcher.js';

function electraAdminDevPlugin() {
  return {
    name: 'electra-admin-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // --- BACKBLAZE B2 RESOURCE STORAGE DEV ENDPOINTS ---
        if (
          req.url?.startsWith('/api/resource-storage') || 
          req.url?.startsWith('/api/b2-download-token') ||
          req.url?.startsWith('/api/download') ||
          req.url?.startsWith('/api/preview')
        ) {
          try {
            const rootEnv = loadEnv('development', path.resolve(__dirname, '../../'), '');
            const localEnv = loadEnv('development', process.cwd(), '');
            const env = { ...process.env, ...rootEnv, ...localEnv };
            const handled = await handleStorageRequest(req, res, env);
            if (handled) return;
          } catch (storageErr) {
            console.error('[Electra Admin Dev Storage Error]:', storageErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: storageErr.message }));
            return;
          }
        }

        // --- CLOUDINARY SIGNING & DELETION DEV ENDPOINTS ---
        if (req.url === '/api/cloudinary/sign' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const rootEnv = loadEnv('development', path.resolve(__dirname, '../../'), '');
              const localEnv = loadEnv('development', process.cwd(), '');
              const env = { ...process.env, ...rootEnv, ...localEnv };

              const data = JSON.parse(body || '{}');
              const cloudName = env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME || 'nacos-futo';
              const apiKey = env.CLOUDINARY_API_KEY || 'dev_key';
              const apiSecret = env.CLOUDINARY_API_SECRET || 'dev_secret';
              const timestamp = Math.round(Date.now() / 1000);
              const paramsToSign = {};
              if (data.folder) paramsToSign.folder = data.folder;
              if (data.public_id) paramsToSign.public_id = data.public_id;
              if (data.tags) paramsToSign.tags = Array.isArray(data.tags) ? data.tags.join(',') : data.tags;
              paramsToSign.timestamp = timestamp;
              const sorted = Object.keys(paramsToSign).sort().map(k => `${k}=${paramsToSign[k]}`).join('&');
              const signature = crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                signature,
                timestamp,
                apiKey,
                cloudName,
                folder: paramsToSign.folder,
                public_id: paramsToSign.public_id
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        if (req.url === '/api/cloudinary/delete' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ result: 'ok' }));
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/electra-admin/' : '/'),
  plugins: [react(), tailwindcss(), electraAdminDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nacos/auth': path.resolve(__dirname, '../../packages/auth/src/index.js'),
      '@nacos/media': path.resolve(__dirname, '../../packages/media/src/index.js'),
      '@nacos/supabase/auth': path.resolve(__dirname, '../../packages/supabase/src/auth.js'),
      '@nacos/supabase/adminAuth': path.resolve(__dirname, '../../packages/supabase/src/adminAuth.js'),
      '@nacos/supabase/electraService': path.resolve(__dirname, '../../packages/supabase/src/electraService.js'),
      '@nacos/supabase/storageService': path.resolve(__dirname, '../../packages/supabase/src/storageService.js'),
      '@nacos/supabase/studentCsvEngine': path.resolve(__dirname, '../../packages/supabase/src/studentCsvEngine.js'),
      '@nacos/supabase/verifiedStudents': path.resolve(__dirname, '../../packages/supabase/src/verifiedStudents.js'),
      '@nacos/supabase': path.resolve(__dirname, '../../packages/supabase/src/index.js'),
      '@nacos/database': path.resolve(__dirname, '../../packages/database/src/index.js'),
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
