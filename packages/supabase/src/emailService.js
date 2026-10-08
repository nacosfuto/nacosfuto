/**
 * @file emailService.js
 * Client-Side Transactional Email Interface for NACOS FUTO
 * 
 * Routes all email dispatch securely through the serverless endpoint /api/email/send.
 * This guarantees that provider secrets (RESEND_API_KEY) are NEVER included
 * in browser bundles or exposed to client-side code.
 */

import {
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPaymentConfirmationEmail,
  renderRecoveryNotificationEmail
} from './server/emailTemplates.js';

export {
  renderVerificationEmail as buildVerificationEmailHTML,
  renderPasswordResetEmail as buildPasswordResetEmailHTML
};

/**
 * Low-level client dispatcher that hits /api/email/send
 */
export async function sendEmailViaApi(payload) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const result = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
      console.warn('[Email Service /api/email/send Failed]:', response.status, result);
      return {
        success: false,
        error: result.error || `Failed to send email (${response.status})`,
        retryAfterSeconds: result.retryAfterSeconds,
        code: result.code || 'SEND_FAILED',
        statusCode: response.status
      };
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send email.',
        code: result.code || 'SEND_FAILED'
      };
    }

    return {
      success: true,
      id: result.id,
      provider: result.provider || 'resend',
      simulated: result.simulated || false
    };
  } catch (err) {
    console.error('[Email Service Network Error]:', err);

    // If completely offline in local Vite dev server, log gracefully
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocal) {
      console.warn('[Email Dev Mode] Local API request failed. Falling back to console simulation:', err.message);
      return {
        success: true,
        provider: 'simulated',
        simulated: true,
        message: 'Email simulated locally in development mode.'
      };
    }

    return {
      success: false,
      error: 'Network connection issue while communicating with email service. Please try again.',
      code: 'NETWORK_ERROR'
    };
  }
}

/**
 * Dispatch verification OTP email to student
 */
export async function sendVerificationEmail(toEmail, otpCode, studentName = 'Student', regNumber = '') {
  const expiryMinutes = 15;
  const template = renderVerificationEmail({ code: otpCode, expiryMinutes, studentName, regNumber });

  console.info(`[Email Service] Requesting verification OTP dispatch for ${toEmail}`);

  return sendEmailViaApi({
    to: toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'otp',
    code: otpCode,
    expiryMinutes,
    studentName,
    regNumber
  });
}

/**
 * Dispatch password reset email to student
 */
export async function sendPasswordResetEmail(toEmail, resetCode, studentName = 'Student', regNumber = '') {
  const expiryMinutes = 10;
  const template = renderPasswordResetEmail({ code: resetCode, expiryMinutes, studentName, regNumber });

  console.info(`[Email Service] Requesting password reset dispatch for ${toEmail}`);

  return sendEmailViaApi({
    to: toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'password_reset',
    code: resetCode,
    expiryMinutes,
    studentName,
    regNumber
  });
}

/**
 * Dispatch payment confirmation receipt email
 */
export async function sendPaymentConfirmationEmail(toEmail, paymentDetails = {}) {
  const template = renderPaymentConfirmationEmail({
    customerName: paymentDetails.customerName || 'Student',
    reference: paymentDetails.reference,
    paymentType: paymentDetails.paymentType,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency || 'NGN',
    paidAt: paymentDetails.paidAt || new Date().toISOString(),
    regNumber: paymentDetails.regNumber || paymentDetails.registrationNumber || '',
    level: paymentDetails.level || '',
    session: paymentDetails.session || paymentDetails.academicSession || '2026/2027'
  });

  return sendEmailViaApi({
    to: toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'payment_confirmation',
    payment: paymentDetails
  });
}

/**
 * Send account recovery notification email to admin
 */
export async function sendRecoveryNotificationEmail(adminEmail, studentReg, studentName) {
  const template = renderRecoveryNotificationEmail({ adminEmail, studentReg, studentName });

  return sendEmailViaApi({
    to: adminEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'admin_notification'
  });
}
