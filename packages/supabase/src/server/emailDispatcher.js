/**
 * @file emailDispatcher.js
 * Centralized Production Email Service for NACOS FUTO
 * 
 * Powered by official Resend SDK as primary transactional email delivery layer.
 * Includes domain-based sender configuration, branded NACOS templates,
 * server-side error handling, rate limiting, and structured logging.
 * 
 * SECRECY GUARANTEE:
 * This module is STRICTLY server-side. RESEND_API_KEY and credentials
 * are never bundled into client-side code or exposed to browsers.
 */

import { Resend } from 'resend';
import {
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPaymentConfirmationEmail,
  renderRecoveryNotificationEmail,
  renderAdminAssignmentEmail
} from './emailTemplates.js';

let cachedResendInstance = null;
let cachedResendKey = '';
let nodemailerModule = null;

/**
 * Validate standard email format (supports "email@domain.com" and "Name <email@domain.com>")
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const match = email.match(/<([^>]+)>/);
  const target = (match ? match[1] : email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
}

/**
 * Mask email address for privacy and safe server logging
 * Example: 'chidera.okoro@futo.edu.ng' -> 'c***o@futo.edu.ng'
 */
function maskEmailForLogs(email) {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [user, domain] = parts;
  if (user.length <= 2) return `${user.charAt(0)}*@${domain}`;
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
}

/**
 * Parses and resolves email configuration from server environment variables
 */
export function getEmailConfig(overrideEnv = {}) {
  const env = { ...process.env, ...overrideEnv };

  // Resend Credentials (PRIMARY PRODUCTION LAYER)
  const resendApiKey = (env.RESEND_API_KEY || '').trim();
  const resendFromName = (env.RESEND_FROM_NAME || 'NACOS FUTO').trim();
  
  // Resolve Sender Email (Domain-based source of truth)
  let resendFromEmail = (env.RESEND_FROM_EMAIL || '').trim();
  
  // Support backwards-compatible env variable names if RESEND_FROM_EMAIL is not yet set
  if (!resendFromEmail && env.RESEND_FROM) {
    const fromMatch = env.RESEND_FROM.match(/<([^>]+)>/);
    resendFromEmail = fromMatch ? fromMatch[1].trim() : env.RESEND_FROM.trim();
  }
  if (!resendFromEmail && env.EMAIL_FROM) {
    const fromMatch = env.EMAIL_FROM.match(/<([^>]+)>/);
    resendFromEmail = fromMatch ? fromMatch[1].trim() : env.EMAIL_FROM.trim();
  }

  // Fallback sender if not specified (e.g. testing domain)
  if (!resendFromEmail) {
    resendFromEmail = 'onboarding@resend.dev';
  }

  // Reply-To Address (Separate support / contact mailbox)
  const resendReplyTo = (env.RESEND_REPLY_TO || env.REPLY_TO_EMAIL || env.REPLY_TO || 'support@nacosfuto.com.ng').trim();
  const isReplyToValid = Boolean(resendReplyTo && isValidEmail(resendReplyTo));

  // Format RFC 5322 "Display Name <email@domain.com>"
  const formattedResendFrom = resendFromEmail.includes('<') && resendFromEmail.includes('>')
    ? resendFromEmail
    : `"${resendFromName}" <${resendFromEmail}>`;

  // Secondary SMTP Credentials (for optional fallback)
  const smtpHost = env.SMTP_HOST || '';
  const smtpPort = parseInt(env.SMTP_PORT || '465', 10);
  const smtpSecure = env.SMTP_SECURE === 'true' || env.SMTP_SECURE === true || smtpPort === 465;
  const smtpUser = env.SMTP_USER || '';
  const smtpPass = env.SMTP_PASS || '';
  const smtpFrom = env.SMTP_FROM || `"${resendFromName}" <${smtpUser || resendFromEmail}>`;

  const isResendConfigured = Boolean(resendApiKey && resendApiKey !== 're_your_resend_api_key_here');
  const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);

  // Active Provider Selection
  let activeProvider = (env.EMAIL_PROVIDER || '').toLowerCase().trim();
  if (!activeProvider) {
    if (isResendConfigured) {
      activeProvider = 'resend';
    } else if (isSmtpConfigured) {
      activeProvider = 'smtp';
    } else {
      activeProvider = 'simulated';
    }
  }

  return {
    activeProvider,
    resend: {
      apiKey: resendApiKey,
      fromEmail: resendFromEmail,
      fromName: resendFromName,
      formattedFrom: formattedResendFrom,
      replyTo: resendReplyTo,
      isReplyToConfigured: isReplyToValid,
      isConfigured: isResendConfigured
    },
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
      replyTo: resendReplyTo,
      isConfigured: isSmtpConfigured
    }
  };
}

/**
 * Returns a cached official Resend SDK client instance
 */
export function getResendClient(apiKey) {
  if (!apiKey) return null;
  if (cachedResendInstance && cachedResendKey === apiKey) {
    return cachedResendInstance;
  }
  cachedResendInstance = new Resend(apiKey);
  cachedResendKey = apiKey;
  return cachedResendInstance;
}

/**
 * Dynamically loads nodemailer for optional SMTP fallback
 */
async function getNodemailer() {
  if (nodemailerModule) return nodemailerModule;
  try {
    const mod = await import('nodemailer');
    nodemailerModule = mod.default || mod;
    return nodemailerModule;
  } catch (err) {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      nodemailerModule = require('nodemailer');
      return nodemailerModule;
    } catch (e) {
      throw new Error(`Nodemailer is not available: ${err.message}`);
    }
  }
}

/**
 * Server-Side In-Memory Rate Limiter & Abuse Prevention
 * Prevents repeated email requests and spamming to same recipient or from same IP.
 */
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_EMAILS_PER_WINDOW = 5;             // Max 5 emails per recipient in 15 mins
const MIN_COOLDOWN_MS = 30 * 1000;           // 30 seconds cooldown between consecutive sends

export function checkServerEmailRateLimit({ email, ip }) {
  const now = Date.now();
  const cleanEmail = (email || '').trim().toLowerCase();
  const key = cleanEmail || `ip_${ip || 'unknown'}`;

  // Purge expired records periodically
  if (rateLimitCache.size > 2000) {
    for (const [k, v] of rateLimitCache.entries()) {
      if (now - v.lastRequestTime > RATE_LIMIT_WINDOW_MS) {
        rateLimitCache.delete(k);
      }
    }
  }

  const record = rateLimitCache.get(key);
  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // 1. Enforce minimum consecutive send cooldown
  const timeSinceLast = now - record.lastRequestTime;
  if (timeSinceLast < MIN_COOLDOWN_MS) {
    const retryAfter = Math.ceil((MIN_COOLDOWN_MS - timeSinceLast) / 1000);
    return {
      allowed: false,
      reason: 'cooldown',
      error: `Please wait ${retryAfter}s before requesting another email.`,
      retryAfterSeconds: retryAfter
    };
  }

  // 2. Enforce sliding window max count
  const validTimestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_EMAILS_PER_WINDOW) {
    const oldest = validTimestamps[0];
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      reason: 'window_limit',
      error: `Too many email requests. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
      retryAfterSeconds: retryAfter
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordServerEmailRequest({ email, ip }) {
  const now = Date.now();
  const cleanEmail = (email || '').trim().toLowerCase();
  const key = cleanEmail || `ip_${ip || 'unknown'}`;

  const record = rateLimitCache.get(key) || { timestamps: [], lastRequestTime: 0 };
  record.lastRequestTime = now;
  record.timestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  record.timestamps.push(now);
  rateLimitCache.set(key, record);
}

/**
 * Send email via official Resend SDK
 */
async function sendViaResend(resendConfig, { to, subject, html, text, from, replyTo, tags }) {
  if (!resendConfig.isConfigured) {
    throw new Error('Resend is not configured (missing RESEND_API_KEY).');
  }

  const resend = getResendClient(resendConfig.apiKey);
  const sender = from || resendConfig.formattedFrom;
  const recipients = Array.isArray(to) ? to : [to];

  const payload = {
    from: sender,
    to: recipients,
    subject: subject || 'NACOS FUTO Notification',
    html: html || undefined,
    text: text || undefined
  };

  if (replyTo) {
    payload.replyTo = replyTo;
    payload.reply_to = replyTo; // Dual property compatibility
  }
  if (tags && Array.isArray(tags)) payload.tags = tags;

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(error.message || `Resend API Error [${error.name || 'UNKNOWN'}]`);
  }

  return {
    success: true,
    provider: 'resend',
    id: data?.id || `resend_${Date.now()}`
  };
}

/**
 * Send email via Nodemailer SMTP (secondary fallback)
 */
async function sendViaSmtp(smtpConfig, { to, subject, html, text, from, replyTo }) {
  if (!smtpConfig.isConfigured) {
    throw new Error('SMTP is not fully configured.');
  }

  const nodemailer = await getNodemailer();
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 8000
  });

  const info = await transporter.sendMail({
    from: from || smtpConfig.from,
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo: replyTo || smtpConfig.replyTo || undefined,
    subject,
    text: text || undefined,
    html: html || undefined
  });

  return {
    success: true,
    provider: 'smtp',
    id: info.messageId || `smtp_${Date.now()}`
  };
}

/**
 * Core Universal Server-Side Email Dispatcher
 * Dispatches via Resend as primary, supports optional SMTP fallback,
 * and provides simulated mode for local offline development.
 */
export async function sendEmail({ to, subject, html, text, from, replyTo, tags, emailType = 'transactional' }, overrideEnv = {}) {
  const config = getEmailConfig(overrideEnv);
  const targetEmail = Array.isArray(to) ? to.join(', ') : to;
  const maskedTarget = maskEmailForLogs(Array.isArray(to) ? to[0] : to);
  const timestamp = new Date().toISOString();

  // Resolve and validate Reply-To (separate from sender address)
  const effectiveReplyTo = (replyTo || config.resend.replyTo || '').trim();

  // 1. Primary Route: RESEND
  if (config.activeProvider === 'resend' || config.resend.isConfigured) {
    // Validate that Reply-To is configured and valid for production delivery
    if (!effectiveReplyTo) {
      console.error(`\x1b[31m[Email Config Error]\x1b[0m RESEND_REPLY_TO is not configured. Replies will have nowhere to go.`);
      return {
        success: false,
        error: 'Email delivery error: Reply-To address (RESEND_REPLY_TO) is not configured in server environment.',
        code: 'MISSING_REPLY_TO'
      };
    }
    if (!isValidEmail(effectiveReplyTo)) {
      console.error(`\x1b[31m[Email Config Error]\x1b[0m RESEND_REPLY_TO is invalid: "${effectiveReplyTo}"`);
      return {
        success: false,
        error: `Email delivery error: Reply-To address "${effectiveReplyTo}" is not a valid email address.`,
        code: 'INVALID_REPLY_TO'
      };
    }

    try {
      console.log(`\x1b[36m[Email Service: Resend]\x1b[0m Type: ${emailType} | To: ${maskedTarget} | From: ${from || config.resend.formattedFrom} | Reply-To: ${effectiveReplyTo} | At: ${timestamp}`);
      const result = await sendViaResend(config.resend, { to, subject, html, text, from, replyTo: effectiveReplyTo, tags });
      console.log(`\x1b[32m[Resend Success]\x1b[0m ID: ${result.id} | To: ${maskedTarget} | Reply-To: ${effectiveReplyTo}`);
      return {
        success: true,
        id: result.id,
        provider: 'resend',
        replyTo: effectiveReplyTo
      };
    } catch (resendErr) {
      console.error(`\x1b[31m[Resend Error]\x1b[0m Failed sending ${emailType} to ${maskedTarget}: ${resendErr.message}`);

      // Optional Fallback to SMTP if configured
      if (config.smtp.isConfigured) {
        console.warn('\x1b[33m[Email Fallback]\x1b[0m Attempting fallback to SMTP...');
        try {
          const smtpResult = await sendViaSmtp(config.smtp, { to, subject, html, text, from, replyTo: effectiveReplyTo });
          console.log(`\x1b[32m[SMTP Fallback Success]\x1b[0m ID: ${smtpResult.id}`);
          return {
            success: true,
            id: smtpResult.id,
            provider: 'smtp',
            replyTo: effectiveReplyTo,
            fallbackFrom: 'resend',
            resendError: resendErr.message
          };
        } catch (smtpErr) {
          console.error(`\x1b[31m[SMTP Fallback Error]\x1b[0m ${smtpErr.message}`);
        }
      }

      // Safe user-facing error response
      return {
        success: false,
        error: resendErr.message || 'Failed to deliver email through Resend.',
        code: 'RESEND_DELIVERY_FAILED'
      };
    }
  }

  // 2. Secondary Route: SMTP
  if (config.activeProvider === 'smtp' && config.smtp.isConfigured) {
    try {
      console.log(`\x1b[36m[Email Service: SMTP]\x1b[0m Type: ${emailType} | To: ${maskedTarget} | Reply-To: ${effectiveReplyTo || 'none'}`);
      const result = await sendViaSmtp(config.smtp, { to, subject, html, text, from, replyTo: effectiveReplyTo });
      return { success: true, id: result.id, provider: 'smtp', replyTo: effectiveReplyTo };
    } catch (smtpErr) {
      console.error(`\x1b[31m[SMTP Error]\x1b[0m ${smtpErr.message}`);
      return { success: false, error: smtpErr.message || 'SMTP delivery failed.', code: 'SMTP_FAILED' };
    }
  }

  // 3. Fallback Route: Development Mode Simulation
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProd) {
    console.error('[Email Service] Production email service is not configured. Missing RESEND_API_KEY.');
    return {
      success: false,
      error: 'Email delivery service is currently not configured. Please contact the administrator.',
      code: 'EMAIL_SERVICE_NOT_CONFIGURED'
    };
  }

  console.warn('\x1b[33m[Email DEV Mode]\x1b[0m No RESEND_API_KEY detected. Simulating transactional email:');
  console.info(`\x1b[33m[Simulated To]\x1b[0m: ${maskedTarget}`);
  console.info(`\x1b[33m[From]\x1b[0m: ${config.resend.formattedFrom}`);
  console.info(`\x1b[33m[Reply-To]\x1b[0m: ${effectiveReplyTo || 'not configured'}`);
  console.info(`\x1b[33m[Subject]\x1b[0m: ${subject}`);

  return {
    success: true,
    provider: 'simulated',
    simulated: true,
    id: `sim_${Date.now()}`,
    replyTo: effectiveReplyTo,
    message: 'Email simulated in development mode (credentials not configured).'
  };
}

/**
 * High-Level Reusable Function: Send OTP Email
 */
export async function sendOTPEmail({ to, code, expiryMinutes = 15, studentName = 'Student', regNumber = '', replyTo }, overrideEnv = {}) {
  const template = renderVerificationEmail({ code, expiryMinutes, studentName, regNumber });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    emailType: 'otp_verification',
    tags: [{ name: 'category', value: 'otp_verification' }]
  }, overrideEnv);
}

/**
 * High-Level Reusable Function: Send Account Verification Email
 */
export async function sendAccountVerificationEmail({ to, code, expiryMinutes = 15, studentName = 'Student', regNumber = '', replyTo }, overrideEnv = {}) {
  return sendOTPEmail({ to, code, expiryMinutes, studentName, regNumber, replyTo }, overrideEnv);
}

/**
 * High-Level Reusable Function: Send Password Reset Email
 */
export async function sendPasswordResetEmail({ to, code, expiryMinutes = 10, studentName = 'Student', regNumber = '', replyTo }, overrideEnv = {}) {
  const template = renderPasswordResetEmail({ code, expiryMinutes, studentName, regNumber });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    emailType: 'password_reset',
    tags: [{ name: 'category', value: 'password_reset' }]
  }, overrideEnv);
}

/**
 * High-Level Reusable Function: Send Payment Confirmation Email
 */
export async function sendPaymentConfirmationEmail({ to, customerName = 'Student', reference, paymentType, amount, currency, paidAt, regNumber, level, session, replyTo }, overrideEnv = {}) {
  const template = renderPaymentConfirmationEmail({ customerName, reference, paymentType, amount, currency, paidAt, regNumber, level, session });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    emailType: 'payment_receipt',
    tags: [{ name: 'category', value: 'payment_receipt' }]
  }, overrideEnv);
}

/**
 * High-Level Reusable Function: Send Admin Recovery Notification
 */
export async function sendRecoveryNotificationEmail({ adminEmail, studentReg, studentName, replyTo }, overrideEnv = {}) {
  const template = renderRecoveryNotificationEmail({ adminEmail, studentReg, studentName });
  return sendEmail({
    to: adminEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    emailType: 'admin_notification',
    tags: [{ name: 'category', value: 'admin_notification' }]
  }, overrideEnv);
}

/**
 * High-Level Reusable Function: Send Admin Role & Scope Assignment Email
 */
export async function sendAdminAssignmentEmail({ to, fullName, scope, role, assignedLevel, portalAdminUrl, assignedAt, replyTo }, overrideEnv = {}) {
  const template = renderAdminAssignmentEmail({
    fullName,
    email: to,
    scope,
    role,
    assignedLevel,
    portalAdminUrl,
    assignedAt: assignedAt || new Date().toISOString()
  });

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
    emailType: 'admin_assignment',
    tags: [{ name: 'category', value: 'admin_assignment' }]
  }, overrideEnv);
}

/**
 * Universal Endpoint Handler Dispatcher
 * Consumes requests from /api/email/send
 */
export async function dispatchEmail(payload = {}, overrideEnv = {}) {
  const { to, subject, html, text, type, code, expiryMinutes, studentName, regNumber, payment, admin, replyTo } = payload;

  if (!to) {
    return { success: false, error: 'Recipient email address ("to") is required.' };
  }

  // If specific high-level type requested, use template renderer
  if (type === 'otp' || type === 'verification') {
    return sendOTPEmail({ to, code, expiryMinutes, studentName, regNumber, replyTo }, overrideEnv);
  }

  if (type === 'password_reset') {
    return sendPasswordResetEmail({ to, code, expiryMinutes, studentName, regNumber, replyTo }, overrideEnv);
  }

  if (type === 'admin_assignment') {
    return sendAdminAssignmentEmail({
      to,
      fullName: admin?.fullName || studentName || 'Administrator',
      scope: admin?.scope || 'student_portal',
      role: admin?.role || 'portal_admin',
      assignedLevel: admin?.assignedLevel || 'all',
      portalAdminUrl: admin?.portalAdminUrl,
      assignedAt: admin?.assignedAt,
      replyTo
    }, overrideEnv);
  }

  if (type === 'payment_confirmation' && payment) {
    return sendPaymentConfirmationEmail({
      to,
      customerName: payment.customerName || studentName,
      reference: payment.reference,
      paymentType: payment.paymentType,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      replyTo
    }, overrideEnv);
  }

  // Default raw email dispatch
  return sendEmail({
    to,
    subject: subject || 'NACOS FUTO Portal Notification',
    html,
    text,
    replyTo,
    emailType: type || 'transactional'
  }, overrideEnv);
}

