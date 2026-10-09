/**
 * @file api/index.js
 * Consolidated Universal Serverless Function for NACOS FUTO
 * 
 * Packs ALL API endpoints into a single, high-performance Serverless Function using web standards:
 * 1. ID Card Payments (/api/payments/id-card/*)
 * 2. Departmental Dues Payments (/api/payments/dues/*)
 * 3. Universal Bachs Payments Engine & Webhooks (/api/payments/*, /api/webhooks/*)
 * 4. Backblaze B2 Secure Resource Storage (/api/download, /api/preview, /api/resource-storage)
 * 
 * Result: Total Serverless Functions deployed to Vercel = 1 (Vastly below Hobby plan limit of 12).
 */

import '../packages/supabase/src/server/loadEnv.js';
import crypto from 'crypto';
import { supabase } from '../packages/supabase/src/client.js';
import {
  createPaymentCheckout,
  createIdCardCheckout,
  createDuesCheckout,
  getPaymentStatus,
  verifyBachsWebhookSignature,
  processBachsWebhook,
  resolveDynamicFee,
  getBachsConfig,
  getDynamicAcademicSession
} from '../packages/supabase/src/server/bachs.js';
import {
  dispatchEmail,
  getEmailConfig,
  checkServerEmailRateLimit,
  recordServerEmailRequest
} from '../packages/supabase/src/server/emailDispatcher.js';
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
  handleSensitiveActionVerifyPassword,
  handleAdminDeleteStudent
} from '../packages/supabase/src/server/studentAuthApi.js';
import {
  handleElectoralAccreditation,
  handleSendElectoralCode,
  handleVerifyElectoralCode,
  handleGetSessionStatus,
  handleSubmitElectoralVote,
  handleGetAuthoritativeResults
} from '../packages/supabase/src/server/electraAuthApi.js';

// --- Backblaze B2 Helper State ---
let cachedB2Auth = null;

async function getB2AuthTokens(forceRefresh = false) {
  if (!forceRefresh && cachedB2Auth && cachedB2Auth.expiresAt > Date.now() + 300000) {
    return cachedB2Auth;
  }

  const keyId = process.env.VITE_B2_KEY_ID || process.env.B2_KEY_ID || '00504e4d4912f750000000001';
  const appKey = process.env.VITE_B2_APPLICATION_KEY || process.env.B2_APPLICATION_KEY || 'K005IgcedfJWsbGIXMn6tQlFhUchfNo';
  const bucketId = process.env.VITE_B2_BUCKET_ID || process.env.B2_BUCKET_ID || '50149e04ad14c911a20f0715';
  const bucketName = process.env.VITE_B2_BUCKET_NAME || process.env.B2_BUCKET_NAME || 'nacos-resources';

  const creds = Buffer.from(`${keyId}:${appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to authorize with B2: ${res.status}`);
  }

  const data = await res.json();
  cachedB2Auth = {
    apiUrl: data.apiInfo?.storageApi?.apiUrl || 'https://api005.backblazeb2.com',
    downloadUrl: data.apiInfo?.storageApi?.downloadUrl || 'https://f005.backblazeb2.com',
    bucketName: data.apiInfo?.storageApi?.bucketName || bucketName,
    bucketId: bucketId,
    authorizationToken: data.authorizationToken,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000
  };

  return cachedB2Auth;
}

// --- Body Parser Helper ---
async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  // 1. Standard Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bachs-Signature, x-student-session');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Resolve Incoming Path
  const fullUrl = new URL(req.url, 'http://localhost');
  let pathname = fullUrl.pathname;
  
  // If rewritten via ?_apiPath= or ?route=
  const rewritePath = fullUrl.searchParams.get('_apiPath') || fullUrl.searchParams.get('route');
  if (rewritePath) {
    pathname = rewritePath.startsWith('/') ? rewritePath : `/${rewritePath}`;
    if (!pathname.startsWith('/api')) {
      pathname = `/api${pathname}`;
    }
  }

  // Clean trailing slash
  const route = pathname.replace(/\/+$/, '');
  const method = req.method;

  try {
    // =========================================================================
    // 3. BACHS UNIVERSAL PAYMENTS ENGINE (ID Card, Departmental Dues, Custom)
    // =========================================================================

    // Dues Checkout
    if (route === '/api/payments/dues/create-checkout' && method === 'POST') {
      const body = await parseRequestBody(req);
      const origin = body.returnBaseUrl || req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
      const result = await createDuesCheckout({
        student: body.student,
        returnBaseUrl: origin,
        academicSession: body.academicSession,
        level: body.level
      });
      return res.status(result.statusCode || (result.error ? 400 : 200)).json(result);
    }

    // ID Card Checkout
    if (route === '/api/payments/id-card/create-checkout' && method === 'POST') {
      const body = await parseRequestBody(req);
      const origin = body.returnBaseUrl || req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
      const result = await createIdCardCheckout({
        student: body.student,
        returnBaseUrl: origin
      });
      return res.status(result.statusCode || (result.error ? 400 : 200)).json(result);
    }

    // Universal Checkout
    if (route === '/api/payments/create-checkout' && method === 'POST') {
      const body = await parseRequestBody(req);
      const origin = body.returnBaseUrl || req.headers.origin || `http://${req.headers.host || 'localhost:5174'}`;
      const result = await createPaymentCheckout({
        paymentType: body.paymentType,
        title: body.title,
        student: body.student,
        customer: body.customer,
        metadata: body.metadata,
        returnBaseUrl: origin,
        redirectPath: body.redirectPath,
        cancelPath: body.cancelPath,
        amountOverride: body.amountOverride
      });
      return res.status(result.statusCode || (result.error ? 400 : 200)).json(result);
    }

    // Payment Status Checks (Dues, ID Card, Universal)
    if (
      (route === '/api/payments/status' ||
       route === '/api/payments/dues/status' ||
       route === '/api/payments/id-card/status') &&
      method === 'GET'
    ) {
      const reference = fullUrl.searchParams.get('reference');
      const checkoutId = fullUrl.searchParams.get('checkoutId') || fullUrl.searchParams.get('checkout_id');
      let paymentType = fullUrl.searchParams.get('paymentType');
      if (route.includes('/dues/')) paymentType = 'DEPARTMENTAL_DUES';
      if (route.includes('/id-card/')) paymentType = 'ID_CARD';
      const registrationNumber = fullUrl.searchParams.get('registrationNumber') || fullUrl.searchParams.get('matricNumber');
      const studentId = fullUrl.searchParams.get('studentId');

      const result = await getPaymentStatus({ reference, checkoutId, paymentType, registrationNumber, studentId });
      return res.status(result.statusCode || 200).json(result);
    }

    // Dynamic Fees Getter & Setter
    if (route === '/api/payments/fees') {
      if (method === 'GET') {
        const feeKey = fullUrl.searchParams.get('feeKey') || fullUrl.searchParams.get('paymentType');
        if (feeKey) {
          const key = feeKey.toLowerCase();
          const amount = await resolveDynamicFee({ paymentType: key });
          return res.status(200).json({ feeKey: key, amount, currency: 'NGN' });
        }
        // Fetch all active fees from Supabase id_card_settings
        let fees = [];
        if (supabase) {
          const { data } = await supabase.from('id_card_settings').select('*');
          if (data) {
            fees = data.map(r => ({
              fee_key: r.id === 'default' ? 'id_card' : r.id,
              amount: r.id_card_fee,
              academic_session: r.academic_session,
              is_active: r.is_application_open
            }));
          }
        }
        return res.status(200).json({ fees });
      }

      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const key = String(body.feeKey || '').trim().toLowerCase();
        const num = Number(body.amount);
        if (!key || isNaN(num) || num <= 0) {
          return res.status(400).json({ error: 'Valid feeKey and positive amount required.' });
        }
        const rowId = key === 'id_card' ? 'default' : key;
        const now = new Date().toISOString();
        if (supabase) {
          await supabase.from('id_card_settings').upsert({
            id: rowId,
            id_card_fee: num,
            academic_session: body.academicSession || getDynamicAcademicSession(),
            updated_at: now
          });
        }
        return res.status(200).json({ success: true, feeKey: key, amount: num });
      }
    }

    // Bachs Authoritative Webhooks
    if ((route === '/api/payments/webhook' || route === '/api/webhooks/bachs') && method === 'POST') {
      let rawBody = '';
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (req.body && typeof req.body === 'object') {
        rawBody = JSON.stringify(req.body);
      } else {
        rawBody = await new Promise((resolve) => {
          let b = '';
          req.on('data', c => { b += c; });
          req.on('end', () => resolve(b));
        });
      }

      const signature = req.headers['x-bachs-signature'] || req.headers['x-signature'];
      const signatureValid = verifyBachsWebhookSignature(rawBody, signature);
      if (!signatureValid) {
        return res.status(401).json({ error: 'Invalid HMAC signature.' });
      }

      let payload = {};
      try { payload = JSON.parse(rawBody); } catch (_) {}
      const result = await processBachsWebhook(payload);
      return res.status(result.statusCode || 200).json(result);
    }

    // Sandbox / Local Simulation Endpoint
    if (route === '/api/payments/simulate-success' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { reference, paymentType = 'ID_CARD' } = body;
      if (!reference) {
        return res.status(400).json({ error: 'Missing payment reference.' });
      }
      let simAmount = body.amount ? Number(body.amount) : null;
      if (!simAmount && supabase) {
        const { data: pRec } = await supabase.from('payments').select('amount').eq('reference', reference).maybeSingle();
        if (pRec?.amount) simAmount = Number(pRec.amount);
      }
      if (!simAmount) {
        simAmount = await resolveDynamicFee({ paymentType });
      }
      const simEvent = {
        event_type: 'payment.successful',
        id: `sim_evt_${Date.now()}`,
        data: {
          reference,
          amount: simAmount,
          currency: 'NGN',
          status: 'successful',
          payment_id: `bachs_tx_${Date.now()}`
        }
      };
      const result = await processBachsWebhook(simEvent);
      return res.status(result.statusCode || 200).json(result);
    }

    // =========================================================================
    // 4. RESOURCE HUB BACKBLAZE B2 STORAGE (Token & Secure File Proxy)
    // =========================================================================

    if ((route === '/api/b2-download-token' || route === '/api/resource-storage') && method === 'GET') {
      const auth = await getB2AuthTokens();
      const dlRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_download_authorization`, {
        method: 'POST',
        headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId: auth.bucketId, fileNamePrefix: '', validDurationInSeconds: 86400 })
      });
      const dlData = await dlRes.json();
      return res.status(200).json({
        authorizationToken: dlData.authorizationToken,
        downloadUrl: auth.downloadUrl,
        bucketName: auth.bucketName,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000
      });
    }

    if (route === '/api/download' && method === 'GET') {
      const storageKey = fullUrl.searchParams.get('key') || fullUrl.searchParams.get('storageKey');
      const fileName = fullUrl.searchParams.get('name') || fullUrl.searchParams.get('fileName') || 'document.pdf';
      if (!storageKey) return res.status(400).json({ error: 'Missing storage key' });

      const cleanKey = String(storageKey).replace(/^\/+/, '');
      let auth = await getB2AuthTokens();
      const b2FileUrl = `${auth.downloadUrl}/file/${auth.bucketName}/${cleanKey}`;
      let b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      if (!b2Res.ok && b2Res.status === 401) {
        auth = await getB2AuthTokens(true);
        b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      }
      if (!b2Res.ok) return res.status(b2Res.status).json({ error: `Storage provider status ${b2Res.status}` });

      const contentType = b2Res.headers.get('content-type') || 'application/octet-stream';
      const contentLength = b2Res.headers.get('content-length');
      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const arrayBuffer = await b2Res.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    if (route === '/api/preview' && method === 'GET') {
      const storageKey = fullUrl.searchParams.get('key') || fullUrl.searchParams.get('storageKey');
      if (!storageKey) return res.status(400).json({ error: 'Missing storage key' });

      const cleanKey = String(storageKey).replace(/^\/+/, '');
      let auth = await getB2AuthTokens();
      const b2FileUrl = `${auth.downloadUrl}/file/${auth.bucketName}/${cleanKey}`;
      let b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      if (!b2Res.ok && b2Res.status === 401) {
        auth = await getB2AuthTokens(true);
        b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      }
      if (!b2Res.ok) return res.status(b2Res.status).json({ error: `Storage provider status ${b2Res.status}` });

      const contentType = b2Res.headers.get('content-type') || 'application/pdf';
      const contentLength = b2Res.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const arrayBuffer = await b2Res.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    // Backblaze B2 Upload Target Generation & Management
    if (route === '/api/resource-storage' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { action, storageKey } = body;
      const auth = await getB2AuthTokens();

      if (action === 'get-upload-url' || action === 'presign-upload') {
        const upRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bucketId: auth.bucketId })
        });
        if (!upRes.ok) {
          const errData = await upRes.json().catch(() => ({}));
          return res.status(upRes.status).json({ error: 'Failed to obtain B2 upload target', details: errData });
        }
        const upTarget = await upRes.json();
        return res.status(200).json({
          success: true,
          uploadUrl: upTarget.uploadUrl,
          authorizationToken: upTarget.authorizationToken,
          storageKey,
          bucket: auth.bucketName
        });
      }

      if (action === 'upload-file' || action === 'direct-upload') {
        const { fileBase64, mimeType = 'application/octet-stream' } = body;
        if (!fileBase64 || !storageKey) {
          return res.status(400).json({ error: 'Missing fileBase64 or storageKey' });
        }

        const upRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bucketId: auth.bucketId })
        });

        if (!upRes.ok) {
          throw new Error('Failed to obtain B2 upload target for direct upload');
        }

        const upTarget = await upRes.json();
        const buffer = Buffer.from(fileBase64, 'base64');

        const b2UploadRes = await fetch(upTarget.uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: upTarget.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(storageKey),
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'X-Bz-Content-Sha1': 'do_not_verify'
          },
          body: buffer
        });

        if (!b2UploadRes.ok) {
          const errData = await b2UploadRes.json().catch(() => ({}));
          throw new Error(errData.message || 'B2 direct upload failed');
        }

        return res.status(200).json({
          success: true,
          storageKey,
          storageProvider: 'backblaze_b2',
          storageBucket: auth.bucketName,
          publicUrl: `${auth.downloadUrl}/file/${auth.bucketName}/${storageKey}`,
          fileSize: buffer.length
        });
      }

      if (action === 'delete') {
        const cleanKey = String(storageKey || '').replace(/^\/+/, '');
        if (!cleanKey) return res.status(400).json({ error: 'Missing storageKey' });
        
        const listRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bucketId: auth.bucketId,
            startFileName: cleanKey,
            maxFileCount: 10
          })
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const matches = (listData.files || []).filter(f => f.fileName === cleanKey);
          for (const f of matches) {
            await fetch(`${auth.apiUrl}/b2api/v3/b2_delete_file_version`, {
              method: 'POST',
              headers: {
                Authorization: auth.authorizationToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fileId: f.fileId, fileName: f.fileName })
            });
          }
        }
        return res.status(200).json({ success: true, message: 'Backblaze B2 object deleted successfully' });
      }

      return res.status(400).json({ error: `Unsupported storage action: ${action}` });
    }

    if (route === '/api/delete' && method === 'POST') {
      const body = await parseRequestBody(req);
      const cleanKey = String(body.storageKey || '').replace(/^\/+/, '');
      if (!cleanKey) return res.status(400).json({ error: 'Missing storageKey' });
      const auth = await getB2AuthTokens();

      const listRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketId: auth.bucketId,
          startFileName: cleanKey,
          maxFileCount: 10
        })
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const matches = (listData.files || []).filter(f => f.fileName === cleanKey);
        for (const f of matches) {
          await fetch(`${auth.apiUrl}/b2api/v3/b2_delete_file_version`, {
            method: 'POST',
            headers: {
              Authorization: auth.authorizationToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileId: f.fileId, fileName: f.fileName })
          });
        }
      }
      return res.status(200).json({ success: true, message: 'Backblaze B2 object deleted successfully' });
    }

    // =========================================================================
    // 5. RESEND TRANSACTIONAL EMAIL DELIVERY (/api/email/send, /api/email/health)
    // =========================================================================

    if (route === '/api/email/health' && method === 'GET') {
      const config = getEmailConfig();
      return res.status(200).json({
        status: 'healthy',
        provider: config.activeProvider,
        resendConfigured: config.resend.isConfigured,
        senderEmail: config.resend.fromEmail,
        senderName: config.resend.fromName,
        replyTo: config.resend.replyTo || null,
        replyToConfigured: config.resend.isReplyToConfigured
      });
    }

    if (route === '/api/email/send' && method === 'POST') {
      const body = await parseRequestBody(req);
      const recipient = body.to || (Array.isArray(body.to) ? body.to[0] : '');
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

      // 1. Abuse prevention: rate limiting per recipient & IP
      const rateLimitCheck = checkServerEmailRateLimit({ email: recipient, ip: clientIp });
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: rateLimitCheck.error || 'Too many email requests. Please wait before retrying.',
          retryAfterSeconds: rateLimitCheck.retryAfterSeconds
        });
      }

      // 2. Dispatch email via Resend production layer
      const result = await dispatchEmail(body);

      // 3. Record rate limit tracker on send attempt
      recordServerEmailRequest({ email: recipient, ip: clientIp });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        const statusCode = result.code === 'RESEND_DELIVERY_FAILED' ? 502 : 400;
        return res.status(statusCode).json(result);
      }
    }

    // =========================================================================
    // 6. STUDENT AUTH & IDENTITY VERIFICATION SYSTEM (/api/auth/student/*)
    // =========================================================================
    if (route.startsWith('/api/auth/student/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Signup Step 1: Check registration number against official records
      if (route === '/api/auth/student/signup-step1' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleSignupStep1(body);
        return res.status(result.success ? 200 : (result.registered ? 409 : 400)).json(result);
      }

      // Signup Step 2: Name verification & contact channel lookup
      if (route === '/api/auth/student/signup-step2' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleSignupStep2(body);
        return res.status(result.success ? 200 : (result.noVerifiedContact || result.invalidName ? 422 : 400)).json(result);
      }

      // Purpose-Bound OTP Dispatch (Signup, Forgot Password, Step-Up Auth)
      if (route === '/api/auth/student/send-otp' && method === 'POST') {
        const body = await parseRequestBody(req);
        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
        const result = await handleSendOtp({ ...body, ipAddress: clientIp });
        return res.status(result.success ? 201 : 400).json(result);
      }

      // Purpose-Bound OTP Verification (Issues short-lived action token)
      if (route === '/api/auth/student/verify-otp' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleVerifyOtp(body);
        return res.status(result.success ? 200 : 401).json(result);
      }

      // Signup Step 4: Password creation & account activation
      if (route === '/api/auth/student/complete-signup' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleCompleteSignup(body);
        return res.status(result.success ? 201 : 400).json(result);
      }

      // Forgot Password Step 1: Registration check
      if (route === '/api/auth/student/forgot-password-step1' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleForgotPasswordStep1(body);
        return res.status(result.success ? 200 : 400).json(result);
      }

      // Forgot Password Step 2: Name & contact verification
      if (route === '/api/auth/student/forgot-password-step2' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleForgotPasswordStep2(body);
        return res.status(result.success ? 200 : (result.noVerifiedContact || result.invalidName ? 422 : 400)).json(result);
      }

      // Forgot Password Step 4: Set new password
      if (route === '/api/auth/student/complete-reset-password' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleCompleteResetPassword(body);
        return res.status(result.success ? 200 : 400).json(result);
      }

      // Sensitive Action Verification (Step-Up Authentication)
      if (route === '/api/auth/student/sensitive-action/request' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleSensitiveActionRequest(body);
        return res.status(result.success ? 200 : 400).json(result);
      }

      if (route === '/api/auth/student/sensitive-action/verify' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleSensitiveActionVerify(body);
        return res.status(result.success ? 200 : 401).json(result);
      }

      if (route === '/api/auth/student/sensitive-action/verify-password' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleSensitiveActionVerifyPassword(body);
        return res.status(result.success ? 200 : 401).json(result);
      }
    }

    // =========================================================================
    // 7. ELECTRA ELECTORAL ACCREDITATION & VOTING ENGINE (/api/electra/*)
    // =========================================================================
    if (route.startsWith('/api/electra/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Step 1: Accreditation & Identity Verification (Reg Number + First Name + Last Name)
      if (route === '/api/electra/accredit' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleElectoralAccreditation(body);
        return res.status(result.success ? 200 : (result.alreadyVoted ? 409 : 400)).json(result);
      }

      // Step 2: Temporary Email Verification Code Dispatch
      if (route === '/api/electra/send-code' && method === 'POST') {
        const body = await parseRequestBody(req);
        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
        const result = await handleSendElectoralCode({ ...body, ipAddress: clientIp });
        return res.status(result.success ? 200 : (result.cooldown ? 429 : 400)).json(result);
      }

      // Step 3: Single-Use Code Verification & Voting Session Issuance
      if (route === '/api/electra/verify-code' && method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await handleVerifyElectoralCode(body);
        return res.status(result.success ? 200 : 401).json(result);
      }

      // Step 4: Voting Session Status & Cast Votes Lookup
      if (route === '/api/electra/session-status' && method === 'GET') {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '') || fullUrl.searchParams.get('token');
        const result = await handleGetSessionStatus({ votingSessionToken: token });
        return res.status(result.authenticated ? 200 : 401).json(result);
      }

      // Step 5: Atomic Single-Choice Ballot Submission
      if (route === '/api/electra/vote' && method === 'POST') {
        const body = await parseRequestBody(req);
        const authHeader = req.headers.authorization || '';
        const token = body.votingSessionToken || authHeader.replace(/^Bearer\s+/i, '');
        const result = await handleSubmitElectoralVote({
          votingSessionToken: token,
          selections: body.selections
        });
        return res.status(result.success ? 200 : 400).json(result);
      }

      // Step 6: Authoritative Aggregated Live Results
      if (route === '/api/electra/results' && method === 'GET') {
        const electionId = fullUrl.searchParams.get('electionId') || fullUrl.searchParams.get('election_id');
        const result = await handleGetAuthoritativeResults({ electionId });
        return res.status(200).json(result);
      }
    }

    // =========================================================================
    // 7. CLOUDINARY MEDIA SIGNING & DELETION
    // =========================================================================
    if (route === '/api/cloudinary/sign' && method === 'POST') {
      const data = await parseRequestBody(req);
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'nacos-futo';
      const apiKey = process.env.CLOUDINARY_API_KEY || 'dev_key';
      const apiSecret = process.env.CLOUDINARY_API_SECRET || 'dev_secret';
      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = {};
      if (data.folder) paramsToSign.folder = data.folder;
      if (data.public_id) paramsToSign.public_id = data.public_id;
      if (data.tags) paramsToSign.tags = Array.isArray(data.tags) ? data.tags.join(',') : data.tags;
      paramsToSign.timestamp = timestamp;
      const sorted = Object.keys(paramsToSign).sort().map(k => `${k}=${paramsToSign[k]}`).join('&');
      const signature = crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
      return res.status(200).json({
        signature,
        timestamp,
        apiKey,
        cloudName,
        folder: paramsToSign.folder,
        public_id: paramsToSign.public_id
      });
    }

    if (route === '/api/cloudinary/delete' && method === 'POST') {
      return res.status(200).json({ result: 'ok' });
    }

    // =========================================================================
    // 8. ADMIN STUDENT REGISTRY MANAGEMENT (/api/admin/students/*)
    // =========================================================================
    if (route === '/api/admin/students/delete' && method === 'POST') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const body = await parseRequestBody(req);
      const result = await handleAdminDeleteStudent(body);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Default 404 for unmapped API routes
    return res.status(404).json({ error: `Endpoint not found: ${method} ${route}` });
  } catch (err) {
    console.error(`[API Serverless Router Error] ${method} ${route}:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
