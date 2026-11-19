/**
 * @file emailTemplates.js
 * NACOS FUTO Transactional Email Templates
 * 
 * Provides responsive, clean, accessible, and NACOS-branded light mode HTML & plain-text templates.
 * Enforces left-aligned official logo, sharp corners (no rounded borders), and subjects without OTP/codes.
 */

const NACOS_LOGO_URL = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1791331612/nacos/general/full-logo-light.png';

export const NACOS_EMAIL_ASSETS = {
  logo: NACOS_LOGO_URL,
  icons: {
    website: 'https://res.cloudinary.com/z3wgqisj/image/upload/f_png,w_64,h_64,c_fit/nacos/email_assets/icon_globe.png',
    email: 'https://res.cloudinary.com/z3wgqisj/image/upload/f_png,w_64,h_64,c_fit/nacos/email_assets/icon_email.png',
    linkedin: 'https://res.cloudinary.com/z3wgqisj/image/upload/f_png,w_64,h_64,c_fit/nacos/email_assets/icon_linkedin.png',
    instagram: 'https://res.cloudinary.com/z3wgqisj/image/upload/f_png,w_64,h_64,c_fit/nacos/email_assets/icon_instagram.png',
    facebook: 'https://res.cloudinary.com/z3wgqisj/image/upload/f_png,w_64,h_64,c_fit/nacos/email_assets/icon_facebook.png'
  },
  links: {
    website: 'https://nacosfuto.com.ng',
    email: 'mailto:hello@nacosfuto.com.ng',
    linkedin: 'https://www.linkedin.com/company/nigeria-association-of-computing-students-futo-chapter/',
    instagram: 'https://www.instagram.com/nacosfuto',
    facebook: 'https://facebook.com/nacosfuto'
  }
};

/**
 * Standard Branded Email Footer (HTML)
 * Displays "CONNECT WITH US", social + website + email icons row, department name, and university address.
 */
export function renderEmailFooterHtml() {
  const { icons, links } = NACOS_EMAIL_ASSETS;

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
      <tr>
        <td class="footer-padding" align="center" style="padding: 26px 20px 24px; text-align: center;">
          <!-- CONNECT WITH US Header -->
          <p style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            CONNECT WITH US
          </p>

          <!-- Social & Email Icons Row -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px auto;">
            <tr>
              <td align="center" valign="middle" style="padding: 0 8px;">
                <a href="${links.website}" target="_blank" rel="noopener noreferrer" title="NACOS FUTO Website" style="text-decoration: none; display: inline-block;">
                  <img src="${icons.website}" alt="Website" width="24" height="24" style="display: block; width: 24px; height: 24px; border: 0;" />
                </a>
              </td>
              <td align="center" valign="middle" style="padding: 0 8px;">
                <a href="${links.email}" title="Email NACOS FUTO" style="text-decoration: none; display: inline-block;">
                  <img src="${icons.email}" alt="Email Us" width="24" height="24" style="display: block; width: 24px; height: 24px; border: 0;" />
                </a>
              </td>
              <td align="center" valign="middle" style="padding: 0 8px;">
                <a href="${links.linkedin}" target="_blank" rel="noopener noreferrer" title="NACOS FUTO LinkedIn" style="text-decoration: none; display: inline-block;">
                  <img src="${icons.linkedin}" alt="LinkedIn" width="24" height="24" style="display: block; width: 24px; height: 24px; border: 0;" />
                </a>
              </td>
              <td align="center" valign="middle" style="padding: 0 8px;">
                <a href="${links.instagram}" target="_blank" rel="noopener noreferrer" title="NACOS FUTO Instagram" style="text-decoration: none; display: inline-block;">
                  <img src="${icons.instagram}" alt="Instagram" width="24" height="24" style="display: block; width: 24px; height: 24px; border: 0;" />
                </a>
              </td>
              <td align="center" valign="middle" style="padding: 0 8px;">
                <a href="${links.facebook}" target="_blank" rel="noopener noreferrer" title="NACOS FUTO Facebook" style="text-decoration: none; display: inline-block;">
                  <img src="${icons.facebook}" alt="Facebook" width="24" height="24" style="display: block; width: 24px; height: 24px; border: 0;" />
                </a>
              </td>
            </tr>
          </table>

          <!-- Clickable Text Links Row (Ensures visibility if image icons are blocked by client) -->
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <a href="${links.website}" target="_blank" rel="noopener noreferrer" style="color: #15803d; text-decoration: none; font-weight: 600;">nacosfuto.com.ng</a>
            &nbsp;&bull;&nbsp;
            <a href="${links.email}" style="color: #475569; text-decoration: none;">hello@nacosfuto.com.ng</a>
          </p>

          <!-- Department & Chapter Title -->
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-align: center; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            Department of Computer Science &bull; NACOS FUTO Chapter
          </p>

          <!-- University Address & Copyright -->
          <p style="margin: 0 auto; max-width: 480px; font-size: 11px; line-height: 1.5; color: #64748b; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            School of Information and Communication Technology (SICT)<br/>
            Federal University of Technology, PMB 1526, Owerri, Imo State, Nigeria.<br/>
            &copy; 2026 NACOS FUTO. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Standard Branded Email Footer (Plain-text)
 */
export function renderEmailFooterText() {
  const { links } = NACOS_EMAIL_ASSETS;
  return [
    '---------------------------------',
    'CONNECT WITH US:',
    `Website:   ${links.website}`,
    'Email:     hello@nacosfuto.com.ng',
    `LinkedIn:  ${links.linkedin}`,
    `Instagram: ${links.instagram}`,
    `Facebook:  ${links.facebook}`,
    '',
    'Nigeria Association of Computing Students (NACOS) — FUTO Chapter',
    '© 2026 Department of Computer Science, Federal University of Technology, PMB 1526, Owerri, Imo State, Nigeria.'
  ].join('\n');
}

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
            <td style="padding: 0; background-color: #f8fafc;">
              ${renderEmailFooterHtml()}
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
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
    renderEmailFooterText()
  ].join('\n');

  return {
    subject: 'NACOS Admin Security Authorization',
    html: buildAdminEmailLayout({ title: 'Admin Authorization Code', preheader, contentHtml }),
    text
  };
}

/**
 * Incoming Website Contact Form Notification Template
 * Clean, structured, quotation/receipt table formatting with brand identity,
 * preserved message line breaks, and responsive layout.
 */
export function renderContactEnquiryEmail({
  name = 'Website Visitor',
  email = '',
  subject = 'New Website Enquiry',
  message = '',
  phone = '',
  receivedAt = new Date().toISOString()
}) {
  const safeName = sanitizeHtml(name || 'Website Visitor');
  const safeEmail = sanitizeHtml(email || 'Not provided');
  const safeSubject = sanitizeHtml(subject || 'General Enquiry');
  const safePhone = sanitizeHtml(phone || '');
  const safeMessage = sanitizeHtml(message || '').replace(/\r\n|\r|\n/g, '<br/>');

  const dateFormatted = new Date(receivedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  });

  const preheader = `New website message from ${safeName}: "${safeSubject}"`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 18px; font-weight: 700;">New Website Enquiry</h2>
    <p style="color: #475569; margin: 0 0 20px; font-size: 13px; line-height: 1.5;">
      A new enquiry was submitted through the official NACOS FUTO website contact form.
    </p>

    <!-- Sender Information Table (Sharp Corners, Structured Presentation) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 22px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 35%;">Full Name:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Email Address:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
          <a href="mailto:${safeEmail}" style="color: #15803d; text-decoration: none; font-weight: 600;">${safeEmail}</a>
        </td>
      </tr>
      ${safePhone ? `
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phone Number:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
          <a href="tel:${safePhone}" style="color: #0f172a; text-decoration: none;">${safePhone}</a>
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Subject:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeSubject}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Date &amp; Time Received:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600;">${dateFormatted} (WAT)</td>
      </tr>
    </table>

    <!-- Message Content Header -->
    <p style="color: #0f172a; margin: 0 0 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      Message Content
    </p>

    <!-- Message Block (Preserved formatting, clean left accent) -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #138601; padding: 18px 20px; margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
${safeMessage}
    </div>

    <!-- Quick Action: Reply to Visitor -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
      <tr>
        <td align="center" style="background-color: #138601;">
          <a href="mailto:${safeEmail}?subject=Re:%20${encodeURIComponent(subject)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 11px 24px; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            Reply to ${safeName}
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.5;">
      <em>Note: This message was submitted via the public contact form at <a href="https://nacosfuto.com.ng/contact" style="color: #15803d; text-decoration: none;">nacosfuto.com.ng/contact</a>.</em>
    </p>
  `;

  const text = [
    'NEW WEBSITE ENQUIRY - NACOS FUTO',
    '================================',
    '',
    `Full Name:     ${name}`,
    `Email Address: ${email}`,
    phone ? `Phone Number:  ${phone}` : null,
    `Subject:       ${subject}`,
    `Date & Time:   ${dateFormatted} (WAT)`,
    '',
    'MESSAGE CONTENT:',
    '----------------',
    message,
    '',
    '----------------',
    `Reply directly to: ${email}`,
    '',
    renderEmailFooterText()
  ].filter(Boolean).join('\n');

  return {
    subject: `[Website Enquiry] ${safeSubject} — from ${safeName}`,
    html: buildBaseEmailLayout({ title: 'New Website Enquiry', preheader, contentHtml }),
    text
  };
}

/**
 * The Agentic Build 2026 - Hackathon Registration Notification (Sent to ICT Directorate)
 * Clean, minimal, sharp edges, structured tables, and standard branded footer.
 */
export function renderHackathonRegistrationEmail({
  participationType = 'solo',
  teamName = '',
  chapter = 'FUTO',
  projectKind = 'Web Application',
  leadName = '',
  leadFirstName = '',
  leadLastName = '',
  leadEmail = '',
  leadMatric = '',
  leadPhone = '',
  leadDepartment = 'Computer Science',
  projectTitle = '',
  problemStatement = '',
  proposedSolution = '',
  techStack = '',
  githubRepo = '',
  members = [],
  submittedAt = new Date().toISOString()
}) {
  const safeLeadName = sanitizeHtml(leadName || `${leadFirstName || ''} ${leadLastName || ''}`.trim() || 'Solo Builder');
  const safeLeadEmail = sanitizeHtml(leadEmail || 'N/A');
  const safeLeadMatric = sanitizeHtml(leadMatric || 'N/A');
  const safeLeadPhone = sanitizeHtml(leadPhone || 'N/A');
  const safeLeadDept = sanitizeHtml(leadDepartment || 'Computer Science');
  const safeTeamName = sanitizeHtml(teamName || 'N/A');
  const safeProjectTitle = sanitizeHtml(projectTitle || 'Untitled Pitch');
  const safeProjectKind = sanitizeHtml(projectKind || 'Software Application');
  const safeChapter = sanitizeHtml(chapter || 'FUTO');
  const safeTechStack = sanitizeHtml(techStack || 'Not specified');
  const safeGithubRepo = sanitizeHtml(githubRepo || '');
  const safeProblem = sanitizeHtml(problemStatement || '').replace(/\r\n|\r|\n/g, '<br/>');
  const safeSolution = sanitizeHtml(proposedSolution || '').replace(/\r\n|\r|\n/g, '<br/>');

  const isSolo = participationType === 'solo';
  const entityLabel = isSolo ? `Solo Builder: ${safeLeadName}` : `Team: ${safeTeamName}`;
  const totalCount = isSolo ? 1 : (members.length + 1);

  const dateFormatted = new Date(submittedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  });

  const preheader = `[The Agentic Build 2026] New Registration: ${entityLabel} (${safeProjectKind})`;

  const membersRows = members.length > 0
    ? members.map((m, idx) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">#${idx + 2}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${sanitizeHtml(m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'N/A')}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">
            <a href="mailto:${sanitizeHtml(m.email)}" style="color: #15803d; text-decoration: none;">${sanitizeHtml(m.email || 'N/A')}</a>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; font-weight: 600; color: #0f172a;">${sanitizeHtml(m.matric || 'N/A')}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${sanitizeHtml(m.role || 'Builder')}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${sanitizeHtml(m.department || 'Computer Science')}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="6" style="padding: 14px; text-align: center; color: #64748b; font-style: italic;">
            Solo Builder &mdash; No additional team members.
          </td>
        </tr>
      `;

  const contentHtml = `
    <!-- Header Title -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #86efac; color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; margin-bottom: 8px;">
        Hackathon Registration Submission
      </span>
      <h1 style="color: #0f172a; margin: 0 0 6px; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">
        The Agentic Build 2026
      </h1>
      <p style="color: #64748b; margin: 0; font-size: 13px;">
        Office of the Director of ICT &bull; Department of Computer Science, FUTO
      </p>
    </div>

    <!-- Registration Overview -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 35%;">Format:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
          ${isSolo ? '👤 Solo Builder (1 Person)' : `👥 Team (${totalCount} Members)`}
        </td>
      </tr>
      ${!isSolo ? `
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Team Name:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${safeTeamName}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Project Kind:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeProjectKind}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Institution / Chapter:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeChapter}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Submitted At:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600;">${dateFormatted} (WAT)</td>
      </tr>
    </table>

    <!-- Lead / Builder Information -->
    <h3 style="color: #0f172a; margin: 0 0 10px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      ${isSolo ? 'Builder Details' : 'Team Lead (Primary Contact)'}
    </h3>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 35%;">Full Legal Name:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeLeadName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Registration / Matric No:</td>
        <td align="right" style="padding: 10px 16px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${safeLeadMatric}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Department:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeLeadDept}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Email Address:</td>
        <td align="right" style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
          <a href="mailto:${safeLeadEmail}" style="color: #15803d; text-decoration: none; font-weight: 600;">${safeLeadEmail}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">WhatsApp / Phone:</td>
        <td align="right" style="padding: 10px 16px;">
          <a href="tel:${safeLeadPhone}" style="color: #0f172a; text-decoration: none; font-weight: 600;">${safeLeadPhone}</a>
        </td>
      </tr>
    </table>

    <!-- Product Pitch & Concept -->
    <h3 style="color: #0f172a; margin: 0 0 10px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      Product Pitch &amp; Technical Concept
    </h3>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 35%;">Working Title:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${safeProjectTitle}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 12px 16px 4px; color: #64748b; font-weight: 600;">Problem Statement:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 0 16px 14px; color: #1e293b; line-height: 1.6; border-bottom: 1px solid #e2e8f0;">
          ${safeProblem || 'N/A'}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 12px 16px 4px; color: #64748b; font-weight: 600;">Proposed Solution &amp; AI Workflow:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 0 16px 14px; color: #1e293b; line-height: 1.6; border-bottom: 1px solid #e2e8f0;">
          ${safeSolution || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Tech Stack:</td>
        <td align="right" style="padding: 10px 16px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeTechStack}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">GitHub Repository:</td>
        <td align="right" style="padding: 10px 16px;">
          ${safeGithubRepo ? `<a href="${safeGithubRepo}" target="_blank" rel="noopener noreferrer" style="color: #15803d; text-decoration: none; font-weight: 600;">${safeGithubRepo}</a>` : '<span style="color: #94a3b8;">Not provided yet</span>'}
        </td>
      </tr>
    </table>

    <!-- Team Roster -->
    <h3 style="color: #0f172a; margin: 0 0 10px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
      Team Roster (${totalCount} Total)
    </h3>
    <div style="overflow-x: auto; margin-bottom: 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 0; background-color: #ffffff; font-size: 12px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">#</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Full Name</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Email</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Matric No</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Role</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Dept</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">#1 (Lead)</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${safeLeadName}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">
              <a href="mailto:${safeLeadEmail}" style="color: #15803d; text-decoration: none;">${safeLeadEmail}</a>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; font-weight: 600; color: #0f172a;">${safeLeadMatric}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${isSolo ? 'Solo Builder' : 'Team Lead'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${safeLeadDept}</td>
          </tr>
          ${membersRows}
        </tbody>
      </table>
    </div>
  `;

  return {
    subject: `[The Agentic Build 2026] New Registration: ${entityLabel} (${safeProjectKind})`,
    html: buildBaseEmailLayout({
      title: `Hackathon Registration: ${entityLabel}`,
      preheader,
      contentHtml
    }),
    text: [
      `THE AGENTIC BUILD 2026 - NEW REGISTRATION`,
      `Format: ${isSolo ? 'Solo Builder' : 'Team: ' + safeTeamName}`,
      `Lead: ${safeLeadName} (${safeLeadMatric}) - ${safeLeadEmail}`,
      `Project Title: ${safeProjectTitle}`,
      `Kind: ${safeProjectKind}`,
      `Tech Stack: ${safeTechStack}`,
      `GitHub: ${safeGithubRepo || 'N/A'}`,
      `Problem: ${problemStatement || 'N/A'}`,
      `Solution: ${proposedSolution || 'N/A'}`,
      '',
      renderEmailFooterText()
    ].join('\n')
  };
}

/**
 * The Agentic Build 2026 - Hackathon Registration Confirmation (Sent to Applicant Lead)
 * Clean, minimal, encouraging confirmation receipt with event details and SDLC rules.
 */
export function renderHackathonConfirmationEmail({
  participationType = 'solo',
  teamName = '',
  leadName = '',
  leadFirstName = '',
  leadLastName = '',
  projectTitle = '',
  projectKind = 'Web Application',
  whatsappUrl = 'https://chat.whatsapp.com/AgenticBuild2026'
}) {
  const safeName = sanitizeHtml(leadName || `${leadFirstName || ''} ${leadLastName || ''}`.trim() || 'Innovator');
  const safeTeam = sanitizeHtml(teamName || 'Solo Builder');
  const safeTitle = sanitizeHtml(projectTitle || 'Your Project');
  const safeKind = sanitizeHtml(projectKind || 'Software Application');
  const safeWhatsappUrl = sanitizeHtml(whatsappUrl || 'https://chat.whatsapp.com/AgenticBuild2026');
  const isSolo = participationType === 'solo';

  const preheader = `Your registration for The Agentic Build 2026 has been confirmed. You will be contacted with further details.`;

  const contentHtml = `
    <!-- Header Title -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #86efac; color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; margin-bottom: 8px;">
        Registration Confirmed
      </span>
      <h1 style="color: #0f172a; margin: 0 0 6px; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">
        Welcome to The Agentic Build 2026
      </h1>
      <p style="color: #64748b; margin: 0; font-size: 13px;">
        Office of the Director of ICT &bull; Department of Computer Science, FUTO
      </p>
    </div>

    <p style="color: #334155; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      Hello <strong>${safeName}</strong>,
    </p>
    <p style="color: #334155; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      Your registration for <strong>The Agentic Build 2026</strong> has been officially received and recorded by the NACOS FUTO Directorate of ICT.
    </p>
    <p style="color: #334155; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
      <strong>You will be contacted</strong> with further details regarding your entry verification, workspace access, and sprint schedule. Join the official hackathon WhatsApp community to receive real-time announcements!
    </p>

    <!-- WhatsApp Community Call-to-Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; text-align: center;">
      <tr>
        <td align="center">
          <a href="${safeWhatsappUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25D366; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 28px; text-decoration: none; border: 1px solid #1ebe5d;">
            💬 Join Hackathon Community on WhatsApp
          </a>
        </td>
      </tr>
    </table>

    <!-- Key Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; border: 1px solid #e2e8f0; border-radius: 0; background-color: #f8fafc; font-size: 13px;">
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 35%;">Format:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
          ${isSolo ? 'Solo Builder (1 Person)' : `Team: ${safeTeam}`}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Project Title:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${safeTitle}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Product Kind:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${safeKind}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Event Date:</td>
        <td align="right" style="padding: 10px 16px; color: #15803d; font-weight: 800; border-bottom: 1px solid #e2e8f0;">December 11th, 2026</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Venue:</td>
        <td align="right" style="padding: 10px 16px; color: #0f172a; font-weight: 700;">Department of Computer Science, FUTO</td>
      </tr>
    </table>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 16px; margin: 0 0 24px;">
      <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase;">Next Steps &amp; Guidelines</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
        <li>Follow standard SDLC practices throughout your product development.</li>
        <li>Ensure your git repository is active and ready for commits.</li>
        <li>During pitch day, be prepared to demonstrate both your working product and your AI workflow.</li>
      </ul>
    </div>

    <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
      If you have questions or need to make amendments to your roster, please contact us at <a href="mailto:ict@nacosfuto.com.ng" style="color: #15803d; font-weight: 600; text-decoration: none;">ict@nacosfuto.com.ng</a>.
    </p>
  `;

  return {
    subject: `Registration Confirmed: The Agentic Build 2026 (${isSolo ? safeName : safeTeam})`,
    html: buildBaseEmailLayout({
      title: 'Registration Confirmed - The Agentic Build 2026',
      preheader,
      contentHtml
    }),
    text: [
      `WELCOME TO THE AGENTIC BUILD 2026`,
      `Hello ${safeName},`,
      `Your registration has been confirmed by the NACOS FUTO Directorate of ICT.`,
      `You will be contacted with further details regarding your entry and sprint schedule.`,
      `Join our WhatsApp Community for updates: ${safeWhatsappUrl}`,
      `Format: ${isSolo ? 'Solo Builder' : 'Team: ' + safeTeam}`,
      `Project Title: ${safeTitle}`,
      `Date: December 11th, 2026`,
      `Venue: Department of Computer Science, FUTO`,
      '',
      renderEmailFooterText()
    ].join('\n')
  };
}
