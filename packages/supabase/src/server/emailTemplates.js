/**
 * @file emailTemplates.js
 * NACOS FUTO Transactional Email Templates
 * 
 * Provides responsive, clean, accessible, and NACOS-branded light mode HTML & plain-text templates.
 * Enforces left-aligned official logo, sharp corners (no rounded borders), and subjects without OTP/codes.
 */

const NACOS_LOGO_URL = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1791331612/nacos/general/full-logo-light.png';

function sanitizeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Base layout wrapper for all NACOS FUTO transactional emails.
 * Strict light mode, left-aligned brand logo, sharp edge corners, fully responsive.
 */
export function buildBaseEmailLayout({ title, preheader, contentHtml }) {
  const safeTitle = sanitizeHtml(title || 'NACOS FUTO');
  const safePreheader = sanitizeHtml(preheader || '');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { border-radius: 0 !important; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 24px 18px !important; }
      .header-padding { padding: 24px 18px 16px !important; }
      .footer-padding { padding: 20px 18px !important; }
      .otp-display { font-size: 30px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${safePreheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 28px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Strict Light Mode, Sharp Edges) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; background-color: #ffffff; border-radius: 0; border: 1px solid #e2e8f0;">
          
          <!-- Header: Brand Logo Aligned Left -->
          <tr>
            <td class="header-padding" align="left" style="padding: 28px 28px 18px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <a href="https://nacosfuto.com.ng" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                <img src="${NACOS_LOGO_URL}" alt="NACOS FUTO" width="160" style="display: block; width: 160px; max-width: 180px; height: auto; border: 0;" />
              </a>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 28px 28px 32px; background-color: #ffffff; text-align: left;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-padding" style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="color: #64748b; margin: 0 0 4px; font-size: 12px; font-weight: 600;">
                NACOS FUTO &bull; Department of Computer Science
              </p>
              <p style="color: #94a3b8; margin: 0; font-size: 11px; line-height: 1.5;">
                Federal University of Technology, Owerri &bull; <a href="mailto:support@nacosfuto.com.ng" style="color: #16a34a; text-decoration: underline;">support@nacosfuto.com.ng</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dedicated Layout for Administrative Communications (Strict Light Mode, Sharp Edges, Left-aligned Logo)
 */
export function buildAdminEmailLayout({ title, preheader, contentHtml }) {
  return buildBaseEmailLayout({ title, preheader, contentHtml });
}

/**
 * Account Verification / Registration OTP Template
 */
export function renderVerificationEmail({ code, expiryMinutes = 15, studentName = 'Student', regNumber = '' }) {
  const safeCode = sanitizeHtml(code);
  const safeName = sanitizeHtml(studentName);
  const safeReg = sanitizeHtml(regNumber);

  const preheader = `Your NACOS Portal verification code. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Verify Your Account</h2>
    <p style="color: #334155; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">
      Hello ${safeName}${safeReg ? ` (${safeReg})` : ''},
    </p>
    <p style="color: #334155; margin: 0 0 20px; font-size: 14px; line-height: 1.5;">
      Here is your verification code to complete your NACOS student account setup:
    </p>

    <!-- OTP Display Box (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px;">
      <tr>
        <td align="left" style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 4px solid #16a34a; padding: 18px 20px; border-radius: 0;">
          <span style="color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Verification Code</span>
          <span class="otp-display" style="color: #0f172a; font-size: 34px; font-weight: 800; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; display: block;">${safeCode}</span>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
      Valid for <strong>${expiryMinutes} minutes</strong>. If you did not initiate this request, you can safely ignore this email.
    </p>
  `;

  const text = [
    'NACOS FUTO - ACCOUNT VERIFICATION',
    '=================================',
    '',
    `Hello ${studentName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    'Here is your verification code to complete your NACOS student account setup:',
    '',
    `VERIFICATION CODE: ${code}`,
    '',
    `Valid for ${expiryMinutes} minutes.`,
    'If you did not initiate this request, you can safely ignore this email.',
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: 'Verify Your NACOS Account',
    html: buildBaseEmailLayout({ title: 'Verify Your Account', preheader, contentHtml }),
    text
  };
}

/**
 * Password Reset OTP Template
 */
export function renderPasswordResetEmail({ code, expiryMinutes = 10, studentName = 'Student', regNumber = '' }) {
  const safeCode = sanitizeHtml(code);
  const safeName = sanitizeHtml(studentName);
  const safeReg = sanitizeHtml(regNumber);

  const preheader = `Your NACOS Portal password reset code. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Reset Your Password</h2>
    <p style="color: #334155; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">
      Hello ${safeName}${safeReg ? ` (${safeReg})` : ''},
    </p>
    <p style="color: #334155; margin: 0 0 20px; font-size: 14px; line-height: 1.5;">
      Here is your verification code to reset your NACOS portal password:
    </p>

    <!-- OTP Display Box (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px;">
      <tr>
        <td align="left" style="background-color: #fef2f2; border: 1px solid #fca5a5; border-left: 4px solid #dc2626; padding: 18px 20px; border-radius: 0;">
          <span style="color: #991b1b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Password Reset Code</span>
          <span class="otp-display" style="color: #0f172a; font-size: 34px; font-weight: 800; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; display: block;">${safeCode}</span>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
      Valid for <strong>${expiryMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>
  `;

  const text = [
    'NACOS FUTO - PASSWORD RESET',
    '==========================',
    '',
    `Hello ${studentName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    'Here is your password reset code for the NACOS student portal:',
    '',
    `RESET CODE: ${code}`,
    '',
    `Valid for ${expiryMinutes} minutes.`,
    'If you did not request this, you can safely ignore this email.',
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: 'Reset Your NACOS Password',
    html: buildBaseEmailLayout({ title: 'Reset Your Password', preheader, contentHtml }),
    text
  };
}

/**
 * Formats raw payment type into a clean, human-readable category name
 */
export function formatPaymentCategoryName(paymentType = '') {
  if (!paymentType) return 'Departmental Payment';
  const clean = String(paymentType).trim().toUpperCase();

  if (clean === 'ID_CARD' || clean === 'STUDENT_ID' || clean === 'STUDENT ID CARD' || clean === 'ID CARD') {
    return 'Student ID Card';
  }
  if (clean === 'DEPARTMENTAL_DUES' || clean === 'DUES' || clean === 'NACOS DUES') {
    return 'Departmental Dues';
  }
  if (clean.includes('LEVY')) {
    if (clean === 'LEVY' || clean === 'LEVIES' || clean === 'SPECIAL DEPARTMENTAL LEVY') {
      return 'Special Departmental Levy';
    }
    return clean.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  if (clean === 'EVENT_TICKET' || clean === 'EVENT') return 'Event Ticket';
  if (clean === 'RESOURCE') return 'Academic Resource Fee';
  if (clean === 'MERCHANDISE') return 'Departmental Merchandise';
  if (clean === 'DONATION') return 'Alumni Donation';
  if (clean === 'CUSTOM') return 'Departmental Fee';

  return clean.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Resolves the public student portal URL
 */
function resolvePortalUrl(customUrl = '') {
  if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
    let clean = customUrl.replace(/\/+$/, '');
    if (clean === 'https://portal.nacosfuto.com.ng') {
      clean = 'https://nacosfuto.com.ng/portal';
    }
    return clean;
  }
  const env = typeof process !== 'undefined' ? process.env : {};
  let portalBase = (
    env.PUBLIC_PORTAL_URL ||
    env.NEXT_PUBLIC_PORTAL_URL ||
    env.VITE_PORTAL_URL ||
    'https://nacosfuto.com.ng/portal'
  ).replace(/\/+$/, '');

  if (portalBase === 'https://portal.nacosfuto.com.ng') {
    portalBase = 'https://nacosfuto.com.ng/portal';
  }

  return portalBase;
}

/**
 * Payment Success Email Template
 * Straight to the point, sharp corners, responsive, light mode.
 */
export function renderPaymentSuccessEmail({
  customerName = 'Student',
  regNumber = '',
  reference = '',
  paymentType = 'Payment',
  amount = 0,
  currency = 'NGN',
  paidAt = new Date().toISOString(),
  level = '',
  session = '2026/2027',
  isIdCardGenerated = false,
  portalUrl = ''
}) {
  const safeName = sanitizeHtml(customerName);
  const safeRef = sanitizeHtml(reference);
  const friendlyType = formatPaymentCategoryName(paymentType);
  const safeType = sanitizeHtml(friendlyType);
  const safeReg = sanitizeHtml(regNumber);
  const safeLevel = sanitizeHtml(level);
  const safeSession = sanitizeHtml(session);
  const normType = String(paymentType).toUpperCase();
  const isIdCard = normType === 'ID_CARD' || normType.includes('ID CARD') || normType.includes('STUDENT ID');

  const formattedAmount = Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const dateFormatted = new Date(paidAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  });

  const basePortalUrl = resolvePortalUrl(portalUrl);
  const targetPortalLink = isIdCard ? `${basePortalUrl}/id-card` : basePortalUrl;

  const subject = `${friendlyType} Payment Receipt - NACOS FUTO`;
  const preheader = `Payment confirmed for ${friendlyType}: ${currency} ${formattedAmount}`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 10px; font-size: 18px; font-weight: 700;">Payment Receipt</h2>
    <p style="color: #334155; margin: 0 0 18px; font-size: 14px; line-height: 1.5;">
      Hello <strong>${safeName}</strong>${safeReg ? ` (${safeReg})` : ''}, your payment has been successfully confirmed.
    </p>

    <!-- Transaction Summary Table (Sharp Corners, Clean Light Mode) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 22px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeType}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Amount Paid:</td>
        <td align="right" style="padding: 10px 16px; color: #15803d; font-weight: 800; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${currency} ${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reference:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: 'SFMono-Regular', Consolas, monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeRef}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Academic Session:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeSession}</td>
      </tr>
      ${safeLevel ? `
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Academic Level:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeLevel}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date & Time:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${dateFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Status:</td>
        <td align="right" style="padding: 10px 16px; color: #166534; font-weight: 800;">SUCCESSFUL</td>
      </tr>
    </table>

    <!-- Call to Action Button (Sharp Edges: border-radius 0) -->
    <div style="margin: 0 0 12px;">
      <a href="${targetPortalLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #138601; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 0;">
        ${isIdCard ? 'View ID Card &rarr;' : 'Go to Student Portal &rarr;'}
      </a>
    </div>
  `;

  const textLines = [
    'NACOS FUTO - PAYMENT RECEIPT',
    '============================',
    '',
    `Hello ${customerName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    'Your payment has been successfully confirmed.',
    '',
    `Category: ${friendlyType}`,
    `Amount Paid: ${currency} ${formattedAmount}`,
    `Reference: ${reference}`,
    `Session: ${session}`,
    ...(level ? [`Level: ${level}`] : []),
    `Date & Time: ${dateFormatted}`,
    'Status: SUCCESSFUL',
    '',
    `Portal: ${targetPortalLink}`,
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ];

  return {
    subject,
    html: buildBaseEmailLayout({ title: 'Payment Receipt', preheader, contentHtml }),
    text: textLines.join('\n')
  };
}

/**
 * Payment Failed Email Template
 */
export function renderPaymentFailedEmail({
  customerName = 'Student',
  regNumber = '',
  reference = '',
  paymentType = 'Payment',
  amount = 0,
  currency = 'NGN',
  failedAt = new Date().toISOString(),
  failureReason = '',
  level = '',
  session = '2026/2027',
  portalUrl = ''
}) {
  const safeName = sanitizeHtml(customerName);
  const safeRef = sanitizeHtml(reference);
  const friendlyType = formatPaymentCategoryName(paymentType);
  const safeType = sanitizeHtml(friendlyType);
  const safeReg = sanitizeHtml(regNumber);
  const safeReason = sanitizeHtml(failureReason || 'Transaction was declined or cancelled');
  const safeSession = sanitizeHtml(session);
  const safeLevel = sanitizeHtml(level);

  const formattedAmount = Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const dateFormatted = new Date(failedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  });

  const basePortalUrl = resolvePortalUrl(portalUrl);

  const subject = `Payment Unsuccessful - NACOS FUTO`;
  const preheader = `Payment for ${friendlyType} was unsuccessful.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 10px; font-size: 18px; font-weight: 700;">Payment Unsuccessful</h2>
    <p style="color: #334155; margin: 0 0 18px; font-size: 14px; line-height: 1.5;">
      Hello <strong>${safeName}</strong>${safeReg ? ` (${safeReg})` : ''}, your payment for <strong>${safeType}</strong> could not be completed.
    </p>

    <!-- Summary Table (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 22px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeType}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Attempted Amount:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${currency} ${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reference:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: 'SFMono-Regular', Consolas, monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeRef}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date & Time:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${dateFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Status:</td>
        <td align="right" style="padding: 10px 16px; color: #b91c1c; font-weight: 800; border-bottom: 1px solid #e2e8f0;">UNSUCCESSFUL</td>
      </tr>
      ${safeReason ? `
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Reason:</td>
        <td align="right" style="padding: 10px 16px; color: #b91c1c; font-weight: 600;">${safeReason}</td>
      </tr>` : ''}
    </table>

    <p style="color: #64748b; margin: 0 0 20px; font-size: 13px; line-height: 1.5;">
      If your account was debited, your bank will typically process an automatic reversal. You may log in to retry the payment.
    </p>

    <!-- CTA Button (Sharp Edges) -->
    <div style="margin: 0 0 12px;">
      <a href="${basePortalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 0;">
        Return to Student Portal &rarr;
      </a>
    </div>
  `;

  const textLines = [
    'NACOS FUTO - PAYMENT UNSUCCESSFUL',
    '================================',
    '',
    `Hello ${customerName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    `Your payment for ${friendlyType} could not be completed.`,
    '',
    `Category: ${friendlyType}`,
    `Attempted Amount: ${currency} ${formattedAmount}`,
    `Reference: ${reference}`,
    `Date & Time: ${dateFormatted}`,
    `Status: UNSUCCESSFUL`,
    safeReason ? `Reason: ${safeReason}` : '',
    '',
    `Student Portal: ${basePortalUrl}`,
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].filter(Boolean);

  return {
    subject,
    html: buildBaseEmailLayout({ title: 'Payment Unsuccessful', preheader, contentHtml }),
    text: textLines.join('\n')
  };
}

/**
 * Payment Reversed Email Template
 */
export function renderPaymentReversedEmail({
  customerName = 'Student',
  regNumber = '',
  reference = '',
  paymentType = 'Payment',
  amount = 0,
  currency = 'NGN',
  reversedAt = new Date().toISOString(),
  reversalReason = '',
  level = '',
  session = '2026/2027',
  portalUrl = ''
}) {
  const safeName = sanitizeHtml(customerName);
  const safeRef = sanitizeHtml(reference);
  const friendlyType = formatPaymentCategoryName(paymentType);
  const safeType = sanitizeHtml(friendlyType);
  const safeReg = sanitizeHtml(regNumber);
  const safeSession = sanitizeHtml(session);
  const safeReason = sanitizeHtml(reversalReason || 'Administrative clearance reversal or gateway refund');

  const formattedAmount = Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const dateFormatted = new Date(reversedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  });

  const basePortalUrl = resolvePortalUrl(portalUrl);

  const subject = `Payment Reversal Notice - NACOS FUTO`;
  const preheader = `Payment reversed for ${friendlyType}: ${currency} ${formattedAmount}`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 10px; font-size: 18px; font-weight: 700;">Payment Reversal Notice</h2>
    <p style="color: #334155; margin: 0 0 18px; font-size: 14px; line-height: 1.5;">
      Hello <strong>${safeName}</strong>${safeReg ? ` (${safeReg})` : ''}, the payment for <strong>${safeType}</strong> (Reference: <code>${safeRef}</code>) has been recorded as reversed.
    </p>

    <!-- Summary Table (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 22px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeType}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Amount Reversed:</td>
        <td align="right" style="padding: 10px 16px; color: #92400e; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${currency} ${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reference:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: 'SFMono-Regular', Consolas, monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeRef}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date & Time:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${dateFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Status:</td>
        <td align="right" style="padding: 10px 16px; color: #92400e; font-weight: 800;">REVERSED</td>
      </tr>
    </table>

    <div style="margin: 0 0 12px;">
      <a href="${basePortalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 0;">
        Open Student Portal &rarr;
      </a>
    </div>
  `;

  const textLines = [
    'NACOS FUTO - PAYMENT REVERSAL NOTICE',
    '====================================',
    '',
    `Hello ${customerName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    `The payment for ${friendlyType} [${reference}] has been marked as reversed.`,
    '',
    `Category: ${friendlyType}`,
    `Amount Reversed: ${currency} ${formattedAmount}`,
    `Reference: ${reference}`,
    `Date & Time: ${dateFormatted}`,
    'Status: REVERSED',
    '',
    `Student Portal: ${basePortalUrl}`,
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ];

  return {
    subject,
    html: buildBaseEmailLayout({ title: 'Payment Reversal Notice', preheader, contentHtml }),
    text: textLines.join('\n')
  };
}

/**
 * Backward-compatible payment confirmation receipt alias
 */
export function renderPaymentConfirmationEmail(params) {
  return renderPaymentSuccessEmail(params);
}

/**
 * Account Recovery Notification for Admins
 */
export function renderRecoveryNotificationEmail({ adminEmail, studentReg, studentName }) {
  const safeName = sanitizeHtml(studentName);
  const safeReg = sanitizeHtml(studentReg);

  const preheader = `Account recovery request submitted by ${safeName} (${safeReg})`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Account Recovery Request</h2>
    <p style="color: #334155; margin: 0 0 18px; font-size: 14px; line-height: 1.5;">
      A student has submitted an account recovery request:
    </p>

    <!-- Details Box (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Student Name:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Registration Number:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: monospace; font-weight: 700;">${safeReg}</td>
      </tr>
    </table>

    <p style="color: #475569; margin: 0 0 20px; font-size: 13px; line-height: 1.5;">
      Please log in to the Portal Admin Panel to review this request.
    </p>

    <div style="margin: 0 0 12px;">
      <a href="https://nacosfuto.com.ng/portal-admin" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #138601; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 0;">
        Open Admin Panel &rarr;
      </a>
    </div>
  `;

  const text = [
    'NACOS FUTO - ACCOUNT RECOVERY REQUEST',
    '=====================================',
    '',
    `Student Name: ${studentName}`,
    `Registration Number: ${studentReg}`,
    '',
    'Please review this request in the Portal Admin Panel: https://nacosfuto.com.ng/portal-admin',
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: 'Account Recovery Request - NACOS FUTO',
    html: buildBaseEmailLayout({ title: 'Account Recovery Request', preheader, contentHtml }),
    text
  };
}

/**
 * Administrator Role & Scope Assignment Email
 */
export function renderAdminAssignmentEmail({
  fullName = 'Administrator',
  email = '',
  scope = 'student_portal',
  role = 'portal_admin',
  initialPassword = '',
  assignedLevel = 'all',
  portalAdminUrl = 'https://nacosfuto.com.ng/portal-admin',
  assignedAt = new Date().toISOString()
}) {
  const safeName = sanitizeHtml(fullName);
  const safeEmail = sanitizeHtml(email);
  const safeScope = sanitizeHtml(scope);
  const safeRole = sanitizeHtml(role.replace(/_/g, ' ').toUpperCase());
  const safeInitialPass = sanitizeHtml(initialPassword);
  const levelDisplay = assignedLevel === 'all' ? 'All Academic Levels' : `${sanitizeHtml(assignedLevel)} Level`;
  const accessUrl = portalAdminUrl || 'https://nacosfuto.com.ng/portal-admin';
  const assignedDateFormatted = new Date(assignedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const preheader = `Administrative access granted: ${safeRole}`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Administrator Access Assigned</h2>
    <p style="color: #334155; margin: 0 0 18px; font-size: 14px; line-height: 1.5;">
      Hello <strong>${safeName}</strong>, administrative privileges have been assigned to your account.
    </p>

    <!-- Scope Details Table (Sharp Corners) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 22px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Name:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Email:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Role:</td>
        <td align="right" style="padding: 10px 16px; color: #15803d; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeRole}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Scope:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: monospace; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeScope}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Level:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${levelDisplay}</td>
      </tr>
      ${safeInitialPass ? `
      <tr>
        <td style="padding: 10px 16px; color: #92400e; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Initial Password:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeInitialPass}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Assigned:</td>
        <td align="right" style="padding: 10px 16px; color: #64748b;">${assignedDateFormatted}</td>
      </tr>
    </table>

    <div style="margin: 0 0 12px;">
      <a href="${accessUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #138601; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 0;">
        Access Administrator Portal &rarr;
      </a>
    </div>
  `;

  const text = [
    'NACOS FUTO - ADMINISTRATOR ACCESS ASSIGNED',
    '==========================================',
    '',
    `Dear ${fullName},`,
    '',
    'Administrative privileges have been assigned to your account.',
    '',
    `Role: ${safeRole}`,
    `Scope: ${scope}`,
    `Level: ${levelDisplay}`,
    `Email: ${email}`,
    safeInitialPass ? `Initial Password: ${initialPassword}` : '',
    `Date: ${assignedDateFormatted}`,
    '',
    `Login Link: ${accessUrl}`,
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].filter(Boolean).join('\n');

  return {
    subject: 'Administrator Access Assigned - NACOS FUTO',
    html: buildBaseEmailLayout({ title: 'Administrator Access Assigned', preheader, contentHtml }),
    text
  };
}

/**
 * Administrative Security Authorization Code Email Template
 * Strict Light Mode, Sharp Corners, Left Logo, Straight to the point.
 */
export function renderAdminSecurityCodeEmail({
  code,
  expiryMinutes = 15,
  adminName = 'Administrator',
  roleTitle = 'Portal Administrator',
  scope = 'student_portal'
}) {
  const safeCode = sanitizeHtml(code);
  const safeName = sanitizeHtml(adminName);
  const safeRole = sanitizeHtml(roleTitle.replace(/_/g, ' ').toUpperCase());

  const preheader = `Admin single-use authorization code. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Admin Authorization Code</h2>
    <p style="color: #334155; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">
      Officer <strong>${safeName}</strong> (${safeRole}),
    </p>
    <p style="color: #334155; margin: 0 0 20px; font-size: 14px; line-height: 1.5;">
      Here is your single-use administrative authorization code:
    </p>

    <!-- OTP Display Box (Sharp Corners, Light Mode) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px;">
      <tr>
        <td align="left" style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 4px solid #16a34a; padding: 18px 20px; border-radius: 0;">
          <span style="color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Authorization Code</span>
          <span class="otp-display" style="color: #0f172a; font-size: 34px; font-weight: 800; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; display: block;">${safeCode}</span>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
      Valid for <strong>${expiryMinutes} minutes</strong>. Single use only. Do not share this code.
    </p>
  `;

  const text = [
    'NACOS FUTO - ADMIN AUTHORIZATION CODE',
    '=====================================',
    '',
    `Officer: ${adminName} (${safeRole})`,
    '',
    `AUTHORIZATION CODE: ${code}`,
    '',
    `Valid for ${expiryMinutes} minutes. Single-use only.`,
    'Never disclose this code to anyone.',
    '',
    '---------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: 'NACOS Admin Security Authorization',
    html: buildAdminEmailLayout({ title: 'Admin Authorization Code', preheader, contentHtml }),
    text
  };
}
