import '../../packages/supabase/src/server/loadEnv.js';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import { dispatchEmail } from '../../packages/supabase/src/server/emailDispatcher.js';
import {
  createPaymentCheckout,
  createIdCardCheckout,
  createDuesCheckout,
  getPaymentStatus,
  verifyBachsWebhookSignature,
  processBachsWebhook,
  getBachsConfig
} from '../../packages/supabase/src/server/bachs.js';
import {
  handleSignupStep1,
  handleSignupStep2,
  handleSendOtp,
  handleVerifyOtp,
  handleCompleteSignup,
  handleForgotPasswordStep1,
  handleForgotPasswordStep2,
  handleCompleteResetPassword,
  handleSensitiveActionRequest,
  handleSensitiveActionVerify,
  handleSensitiveActionVerifyPassword
} from '../../packages/supabase/src/server/studentAuthApi.js';
import { handleStorageRequest } from '../../packages/supabase/src/server/b2StorageDispatcher.js';

function cloudinaryDevPlugin() {
  return {
    name: 'cloudinary-dev-server',
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
            console.error('[Portal Dev Storage Error]:', storageErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: storageErr.message }));
            return;
          }
        }

        // --- UNIVERSAL BACHS PAYMENT GATEWAY DEV ENDPOINTS ---
        if (req.url?.startsWith('/api/payments/create-checkout') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const origin = req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
              const result = await createPaymentCheckout({
                paymentType: data.paymentType,
                title: data.title,
                student: data.student,
                customer: data.customer,
                metadata: data.metadata,
                returnBaseUrl: origin,
                redirectPath: data.redirectPath,
                cancelPath: data.cancelPath,
                amountOverride: data.amountOverride
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[Dev Universal Bachs Checkout Error]:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/payments/dues/create-checkout') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const origin = req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
              const result = await createDuesCheckout({
                student: data.student,
                returnBaseUrl: origin,
                academicSession: data.academicSession,
                level: data.level
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[Dev Dues Bachs Checkout Error]:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/payments/id-card/create-checkout') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const origin = req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
              const result = await createIdCardCheckout({ student: data.student, returnBaseUrl: origin });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[Dev Bachs Create Checkout Error]:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        if ((req.url?.startsWith('/api/payments/status') || req.url?.startsWith('/api/payments/id-card/status') || req.url?.startsWith('/api/payments/dues/status')) && req.method === 'GET') {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5174'}`);
          const reference = urlObj.searchParams.get('reference');
          const checkoutId = urlObj.searchParams.get('checkoutId') || urlObj.searchParams.get('checkout_id');
          let paymentType = urlObj.searchParams.get('paymentType');
          if (req.url.startsWith('/api/payments/dues/status')) paymentType = 'DEPARTMENTAL_DUES';
          if (req.url.startsWith('/api/payments/id-card/status')) paymentType = 'ID_CARD';
          const registrationNumber = urlObj.searchParams.get('registrationNumber') || urlObj.searchParams.get('regNo');
          const studentId = urlObj.searchParams.get('studentId');

          (async () => {
            try {
              const result = await getPaymentStatus({ reference, checkoutId, paymentType, registrationNumber, studentId });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          })();
          return;
        }

        if (req.url?.startsWith('/api/payments/fees')) {
          (async () => {
            try {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5174'}`);
              const feeKey = urlObj.searchParams.get('feeKey') || urlObj.searchParams.get('paymentType');
              if (req.method === 'GET') {
                const { resolveDynamicFee } = await import('../../packages/supabase/src/server/bachs.js');
                const amount = await resolveDynamicFee({ paymentType: feeKey || 'id_card' });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ feeKey: feeKey || 'id_card', amount }));
                return;
              }
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          })();
          return;
        }

        if ((req.url?.startsWith('/api/payments/id-card/simulate-success') || req.url?.startsWith('/api/payments/simulate-success')) && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const reference = data.reference;
              if (!reference) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing reference' }));
                return;
              }
              const simEvent = {
                event_type: 'payment.successful',
                id: `sim_evt_${Date.now()}`,
                data: {
                  reference,
                  amount: data.amount || 5000,
                  currency: 'NGN',
                  status: 'successful',
                  payment_id: `bachs_tx_${Date.now()}`
                }
              };
              const result = await processBachsWebhook(simEvent);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/webhooks/bachs') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const signature = req.headers['x-bachs-signature'] || req.headers['bachs-signature'] || '';
              const isValid = verifyBachsWebhookSignature(body, signature);
              if (!isValid) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid Bachs signature' }));
                return;
              }
              const event = JSON.parse(body || '{}');
              const result = await processBachsWebhook(event);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.error ? 400 : 200);
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }
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
              console.error('[Dev Server Email Error]:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }
        if (req.url === '/api/sms/send' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const rootEnv = loadEnv('development', path.resolve(__dirname, '../../'), '');
              const localEnv = loadEnv('development', process.cwd(), '');
              const env = { ...process.env, ...rootEnv, ...localEnv };

              const data = JSON.parse(body || '{}');
              const termiiApiKey = env.TERMII_API_KEY;
              const senderId = env.TERMII_SENDER_ID || 'N-Alert';
              const channel = env.TERMII_CHANNEL || 'dnd';

              // Normalize phone for Termii: 234...
              let termiiTo = String(data.to || '').replace(/\D/g, '');
              if (termiiTo.startsWith('0') && termiiTo.length === 11) {
                termiiTo = '234' + termiiTo.slice(1);
              } else if (termiiTo.length === 10) {
                termiiTo = '234' + termiiTo;
              }

              console.log('\x1b[35m[NACOS SMS (Termii)]\x1b[0m Sending verification SMS to:', termiiTo);
              console.log('\x1b[35m[NACOS SMS (Termii)]\x1b[0m Message:', data.message);

              if (termiiApiKey) {
                const termiiRes = await fetch('https://api.termii.com/api/sms/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify({
                    api_key: termiiApiKey,
                    to: termiiTo,
                    from: senderId,
                    sms: data.message,
                    type: 'plain',
                    channel
                  })
                });

                const termiiData = await termiiRes.json().catch(() => ({}));
                if (!termiiRes.ok || (termiiData.code && termiiData.code !== 'ok' && !termiiData.message_id)) {
                  console.error('\x1b[31m[Termii API Error]\x1b[0m', termiiData);
                  res.statusCode = termiiRes.status || 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: termiiData.message || 'Termii error', details: termiiData }));
                  return;
                }

                console.log('\x1b[32m[Termii Success]\x1b[0m Message ID:', termiiData.message_id || 'ok');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, provider: 'termii', messageId: termiiData.message_id }));
                return;
              }

              // Fallback / simulated console mode
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                provider: 'simulated_termii',
                message: 'TERMII_API_KEY not configured. SMS code logged to console.'
              }));
            } catch (e) {
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

        // --- STUDENT AUTHENTICATION & IDENTITY VERIFICATION DEV ENDPOINTS ---
        if (req.url?.startsWith('/api/auth/student/') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const url = new URL(req.url, 'http://localhost');
              const pathname = url.pathname.replace(/\/+$/, '');
              const data = JSON.parse(body || '{}');
              let result = null;

              if (pathname === '/api/auth/student/signup-step1') {
                result = await handleSignupStep1(data);
              } else if (pathname === '/api/auth/student/signup-step2') {
                result = await handleSignupStep2(data);
              } else if (pathname === '/api/auth/student/send-otp') {
                result = await handleSendOtp({ ...data, ipAddress: req.socket?.remoteAddress });
              } else if (pathname === '/api/auth/student/verify-otp') {
                result = await handleVerifyOtp(data);
              } else if (pathname === '/api/auth/student/complete-signup') {
                result = await handleCompleteSignup(data);
              } else if (pathname === '/api/auth/student/forgot-password-step1') {
                result = await handleForgotPasswordStep1(data);
              } else if (pathname === '/api/auth/student/forgot-password-step2') {
                result = await handleForgotPasswordStep2(data);
              } else if (pathname === '/api/auth/student/complete-reset-password') {
                result = await handleCompleteResetPassword(data);
              } else if (pathname === '/api/auth/student/sensitive-action/request') {
                result = await handleSensitiveActionRequest(data);
              } else if (pathname === '/api/auth/student/sensitive-action/verify') {
                result = await handleSensitiveActionVerify(data);
              } else if (pathname === '/api/auth/student/sensitive-action/verify-password') {
                result = await handleSensitiveActionVerifyPassword(data);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Not found: ${pathname}` }));
                return;
              }

              let statusCode = 200;
              if (result.success) {
                statusCode = (pathname.endsWith('complete-signup') || pathname.endsWith('send-otp')) ? 201 : 200;
              } else if (result.registered) {
                statusCode = 409;
              } else if (result.noVerifiedContact || result.invalidName) {
                statusCode = 422;
              } else if (result.invalidCredentials || result.invalidOtp) {
                statusCode = 401;
              } else {
                statusCode = result.statusCode || 400;
              }

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
              res.setHeader('X-Content-Type-Options', 'nosniff');
              res.statusCode = statusCode;
              res.end(JSON.stringify(result));
            } catch (err) {
              console.error('[Dev Student Auth Error]:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/portal/' : '/'),
  plugins: [react(), cloudinaryDevPlugin()],
  resolve: {
    alias: {
      '@nacos/media': path.resolve(__dirname, '../../packages/media/src/index.js'),
      '@nacos/supabase/auth': path.resolve(__dirname, '../../packages/supabase/src/auth.js'),
      '@nacos/supabase/idCard': path.resolve(__dirname, '../../packages/supabase/src/idCard.js'),
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
    port: 5174,
    host: true
  }
});
