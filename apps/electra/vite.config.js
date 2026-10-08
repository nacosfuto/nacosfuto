import '../../packages/supabase/src/server/loadEnv.js';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { handleStorageRequest } from '../../packages/supabase/src/server/b2StorageDispatcher.js';
import {
  handleElectoralAccreditation,
  handleSendElectoralCode,
  handleVerifyElectoralCode,
  handleGetSessionStatus,
  handleSubmitElectoralVote,
  handleGetAuthoritativeResults
} from '../../packages/supabase/src/server/electraAuthApi.js';

function electraDevApiPlugin() {
  return {
    name: 'electra-dev-api',
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
            console.error('[Electra Dev Storage Error]:', storageErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: storageErr.message }));
            return;
          }
        }

        const fullUrl = new URL(req.url, 'http://localhost');
        const pathname = fullUrl.pathname.replace(/\/+$/, '');

        if (!pathname.startsWith('/api/electra')) {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const parseBody = () => new Promise(resolve => {
          let b = '';
          req.on('data', chunk => { b += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve({}); }
          });
        });

        try {
          if (pathname === '/api/electra/accredit' && req.method === 'POST') {
            const body = await parseBody();
            const result = await handleElectoralAccreditation(body);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = result.success ? 200 : (result.alreadyVoted ? 409 : 400);
            return res.end(JSON.stringify(result));
          }

          if (pathname === '/api/electra/send-code' && req.method === 'POST') {
            const body = await parseBody();
            const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
            const result = await handleSendElectoralCode({ ...body, ipAddress: clientIp });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = result.success ? 200 : (result.cooldown ? 429 : 400);
            return res.end(JSON.stringify(result));
          }

          if (pathname === '/api/electra/verify-code' && req.method === 'POST') {
            const body = await parseBody();
            const result = await handleVerifyElectoralCode(body);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = result.success ? 200 : 401;
            return res.end(JSON.stringify(result));
          }

          if (pathname === '/api/electra/session-status' && req.method === 'GET') {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.replace(/^Bearer\s+/i, '') || fullUrl.searchParams.get('token');
            const result = await handleGetSessionStatus({ votingSessionToken: token });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = result.authenticated ? 200 : 401;
            return res.end(JSON.stringify(result));
          }

          if (pathname === '/api/electra/vote' && req.method === 'POST') {
            const body = await parseBody();
            const authHeader = req.headers.authorization || '';
            const token = body.votingSessionToken || authHeader.replace(/^Bearer\s+/i, '');
            const result = await handleSubmitElectoralVote({
              votingSessionToken: token,
              selections: body.selections
            });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = result.success ? 200 : 400;
            return res.end(JSON.stringify(result));
          }

          if (pathname === '/api/electra/results' && req.method === 'GET') {
            const electionId = fullUrl.searchParams.get('electionId') || fullUrl.searchParams.get('election_id');
            const result = await handleGetAuthoritativeResults({ electionId });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            return res.end(JSON.stringify(result));
          }

          next();
        } catch (err) {
          console.error('[Electra Dev API Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/electra/' : '/'),
  plugins: [react(), tailwindcss(), electraDevApiPlugin()],
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
    port: 5178,
  },
});
