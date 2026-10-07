import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import crypto from 'crypto';
import { dispatchEmail } from '../../packages/supabase/src/server/emailDispatcher.js';

function cloudinaryDevPlugin() {
  return {
    name: 'cloudinary-dev-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/email/send' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const rootEnv = loadEnv('development', path.resolve(__dirname, '../../'), '');
              const localEnv = loadEnv('development', process.cwd(), '');
              const env = { ...process.env, ...rootEnv, ...localEnv };

              const data = JSON.parse(body || '{}');
              const result = await dispatchEmail(data, env);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[Portal Admin Dev Email Error]:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }
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

export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/portal-admin/' : '/'),
  plugins: [
    tailwindcss(),
    react(),
    cloudinaryDevPlugin()
  ],
  resolve: {
    alias: {
      '@nacos/auth': path.resolve(__dirname, '../../packages/auth/src/index.js'),
      '@nacos/database': path.resolve(__dirname, '../../packages/database/src/index.js'),
      '@nacos/validation': path.resolve(__dirname, '../../packages/validation/src/index.js'),
      '@nacos/media': path.resolve(__dirname, '../../packages/media/src/index.js'),
      '@nacos/supabase/adminAuth': path.resolve(__dirname, '../../packages/supabase/src/adminAuth.js'),
      '@nacos/supabase/auth': path.resolve(__dirname, '../../packages/supabase/src/auth.js'),
      '@nacos/supabase/idCard': path.resolve(__dirname, '../../packages/supabase/src/idCard.js'),
      '@nacos/supabase/media': path.resolve(__dirname, '../../packages/supabase/src/media.js'),
      '@nacos/supabase/verifiedStudents': path.resolve(__dirname, '../../packages/supabase/src/verifiedStudents.js'),
      '@nacos/supabase': path.resolve(__dirname, '../../packages/supabase/src/index.js'),
      '@nacos/ui': path.resolve(__dirname, '../../packages/ui/src/index.js'),
      '@nacos/types': path.resolve(__dirname, '../../packages/types/src/index.js'),
      '@nacos/config/academic': path.resolve(__dirname, '../../packages/config/academic.js'),
      '@nacos/config/idCardTemplate': path.resolve(__dirname, '../../packages/config/idCardTemplate.js'),
      '@nacos/config/urls': path.resolve(__dirname, '../../packages/config/urls.js'),
      '@nacos/config': path.resolve(__dirname, '../../packages/config/tailwind.preset.js')
    }
  },
  esbuild: {
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
  },
  server: {
    port: 5176,
    host: true
  }
});
