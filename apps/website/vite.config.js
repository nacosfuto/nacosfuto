import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
              console.error('[Website Dev Server Email Error]:', e);
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
        if (req.url === '/api/cloudinary/folders') {
          const rootEnv = loadEnv('development', path.resolve(__dirname, '../../'), '');
          const localEnv = loadEnv('development', process.cwd(), '');
          const env = { ...process.env, ...rootEnv, ...localEnv };
          const cloudName = env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME || 'nacos-futo';
          const apiKey = env.CLOUDINARY_API_KEY;
          const apiSecret = env.CLOUDINARY_API_SECRET;

          const canonicalFolders = [
            { path: 'nacos', name: 'Root Organization', surface: 'shared', description: 'Root NACOS media storage container' },
            { path: 'nacos/students', name: 'Student Passports & Photos', surface: 'portal', description: 'Student passport photographs for clearance and profiles' },
            { path: 'nacos/ids', name: 'Student ID Cards', surface: 'portal', description: 'Generated digital student ID card assets and archives' },
            { path: 'nacos/certificates', name: 'Certificates & Awards', surface: 'shared', description: 'Digital certificates, hackathon badges, and honors' },
            { path: 'nacos/executives', name: 'Executive Council & Staff', surface: 'website', description: 'Official portraits of executive council and department staff' },
            { path: 'nacos/yellow_pages', name: 'Yellow Pages Businesses', surface: 'website', description: 'Indigenous student business flyers, cover cards, and brand logos' },
            { path: 'nacos/events', name: 'Events & Flyers', surface: 'website', description: 'Departmental tech conferences, social mixers, and event flyers' },
            { path: 'nacos/gallery', name: 'Campus Gallery', surface: 'website', description: 'Campus life, labs, TETFUND complex, and culture gallery photos' },
            { path: 'nacos/alumni', name: 'Alumni Network', surface: 'website', description: 'Notable alumni spotlight, hall of fame, and inductee portraits' },
            { path: 'nacos/news', name: 'News & Journal', surface: 'website', description: 'Press releases, blog covers, and journal articles' },
            { path: 'nacos/homepage', name: 'Homepage & Hero', surface: 'website', description: 'Main public website hero banners and announcement imagery' },
            { path: 'nacos/general', name: 'General Branding', surface: 'shared', description: 'Departmental logos, icons, and graphic assets' }
          ];

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              configured: Boolean(apiKey && apiSecret && cloudName !== 'nacos-futo'),
              cloudName,
              totalFolders: canonicalFolders.length,
              folders: canonicalFolders
            }));
            return;
          }

          if (req.method === 'POST') {
            if (!apiKey || !apiSecret || cloudName === 'nacos-futo') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                mode: 'simulated_local',
                message: 'Cloudinary server secrets not yet configured; folder structure cataloged locally.',
                results: canonicalFolders.map(f => ({ folder: f.path, status: 'ready', surface: f.surface, name: f.name }))
              }));
              return;
            }

            const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
            (async () => {
              const results = [];
              for (const folder of canonicalFolders) {
                try {
                  const createRes = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodeURIComponent(folder.path)}`,
                    {
                      method: 'POST',
                      headers: {
                        Authorization: authHeader,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                  if (createRes.ok) {
                    results.push({ folder: folder.path, status: 'created', name: folder.name });
                  } else if (createRes.status === 409) {
                    results.push({ folder: folder.path, status: 'already_exists', name: folder.name });
                  } else {
                    results.push({ folder: folder.path, status: 'auto_managed', name: folder.name });
                  }
                } catch (err) {
                  results.push({ folder: folder.path, status: 'auto_managed', error: err.message });
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                mode: 'live_cloudinary',
                cloudName,
                totalFolders: canonicalFolders.length,
                results
              }));
            })().catch(e => {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            });
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  plugins: [
    tailwindcss(),
    react(),
    cloudinaryDevPlugin()
  ],
  resolve: {
    alias: {
      '@nacos/media': path.resolve(__dirname, '../../packages/media/src/index.js'),
      '@nacos/supabase/adminAuth': path.resolve(__dirname, '../../packages/supabase/src/adminAuth.js'),
      '@nacos/supabase/idCard': path.resolve(__dirname, '../../packages/supabase/src/idCard.js'),
      '@nacos/supabase/auth': path.resolve(__dirname, '../../packages/supabase/src/auth.js'),
      '@nacos/supabase/media': path.resolve(__dirname, '../../packages/supabase/src/media.js'),
      '@nacos/supabase': path.resolve(__dirname, '../../packages/supabase/src/index.js'),
      '@nacos/ui': path.resolve(__dirname, '../../packages/ui/src/index.js'),
      '@nacos/types': path.resolve(__dirname, '../../packages/types/src/index.js'),
      '@nacos/config/academic': path.resolve(__dirname, '../../packages/config/academic.js'),
      '@nacos/config/idCardTemplate': path.resolve(__dirname, '../../packages/config/idCardTemplate.js'),
      '@nacos/config/urls': path.resolve(__dirname, '../../packages/config/urls.js'),
      '@nacos/config': path.resolve(__dirname, '../../packages/config/tailwind.preset.js')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Your backend server
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    },
    // Explicitly exclude backend modules
    exclude: [
      'bcrypt',
      'jsonwebtoken',
      'crypto',
      'fs',       // Node.js file system
      'path',     // Node.js path module
      'express',  // Backend framework
      'mysql',   // Database (if used)
      'mysql2/promise',
      'dotenv'
    ],
  },
  build: {
    target: 'esnext',
    // Ensure Vite doesn't try to bundle backend files
    rollupOptions: {
      external: [
        /^backend\/.*/, // Ignores everything in /backend
      ],
    },
  },
});