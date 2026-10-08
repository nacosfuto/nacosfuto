/**
 * @file emailTemplates.js
 * NACOS FUTO Transactional Email Templates
 * 
 * Provides responsive, clean, accessible, and NACOS-branded HTML & plain-text templates.
 * Department green palette: #083002, #138601, #16a34a, #f0fdf4
 */

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
 * Base layout wrapper for all NACOS FUTO transactional emails
 */
export function buildBaseEmailLayout({ title, preheader, contentHtml }) {
  const safeTitle = sanitizeHtml(title || 'NACOS FUTO Notification');
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
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .otp-display { font-size: 32px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${safePreheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #083002; background: linear-gradient(135deg, #083002 0%, #138601 100%); padding: 32px 28px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      <span style="color: #86efac; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Official Portal Communication</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">NACOS FUTO</h1>
                    <p style="color: #dcfce7; margin: 6px 0 0; font-size: 13px; font-weight: 500;">Department of Computer Science &bull; Student Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 36px 32px; background-color: #ffffff;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Security & Help Banner -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #f1f5f9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 12px; color: #64748b; line-height: 1.5;">
                    <strong style="color: #334155;">Security Notice:</strong> NACOS executives or administrators will never ask for your verification code or password.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; margin: 0 0 6px; font-size: 12px; font-weight: 600;">
                National Association of Computer Science Students (NACOS)
              </p>
              <p style="color: #94a3b8; margin: 0; font-size: 11px; line-height: 1.5;">
                Federal University of Technology, Owerri (FUTO), Imo State, Nigeria<br>
                Need assistance? Contact <a href="mailto:support@nacosfuto.org.ng" style="color: #16a34a; text-decoration: underline;">support@nacosfuto.org.ng</a>
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
 * Account Verification / Registration OTP Template
 */
export function renderVerificationEmail({ code, expiryMinutes = 15, studentName = 'Student', regNumber = '' }) {
  const safeCode = sanitizeHtml(code);
  const safeName = sanitizeHtml(studentName);
  const safeReg = sanitizeHtml(regNumber);

  const preheader = `Your NACOS Portal verification code is ${safeCode}. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Verify Your Student Account</h2>
    <p style="color: #475569; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      Hello ${safeName}${safeReg ? ` (${safeReg})` : ''},
    </p>
    <p style="color: #475569; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
      Thank you for registering on the <strong>NACOS FUTO Student Portal</strong>. Use the one-time verification code below to verify your email address and complete your account setup:
    </p>

    <!-- OTP Display Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
      <tr>
        <td align="center" style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 24px 16px;">
          <span style="color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your Verification Code</span>
          <span class="otp-display" style="color: #052e16; font-size: 38px; font-weight: 800; letter-spacing: 10px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; display: inline-block; padding-left: 10px;">${safeCode}</span>
        </td>
      </tr>
    </table>

    <!-- Expiration Warning -->
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 12px 16px; margin: 0 0 20px;">
      <p style="color: #1e40af; margin: 0; font-size: 13px; line-height: 1.5;">
        ⏰ This code is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once.
      </p>
    </div>

    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
      If you did not initiate this registration request, you can safely disregard this email. No changes will be made to your account.
    </p>
  `;

  const text = [
    'NACOS FUTO - STUDENT ACCOUNT VERIFICATION',
    '=========================================',
    '',
    `Hello ${studentName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    'You are verifying your account on the NACOS FUTO Student Portal.',
    '',
    `YOUR VERIFICATION CODE: ${code}`,
    '',
    `This code expires in ${expiryMinutes} minutes and can only be used once.`,
    '',
    'SECURITY NOTICE: Never share this verification code with anyone.',
    'If you did not initiate this request, you can safely ignore this email.',
    '',
    '-----------------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: `NACOS Portal Verification Code: ${code}`,
    html: buildBaseEmailLayout({ title: 'Verify Your Student Account', preheader, contentHtml }),
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

  const preheader = `Your NACOS Portal password reset code is ${safeCode}. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
    <p style="color: #475569; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      Hello ${safeName}${safeReg ? ` (${safeReg})` : ''},
    </p>
    <p style="color: #475569; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
      We received a request to reset the password for your <strong>NACOS FUTO Student Portal</strong> account. Enter the 6-digit code below to set a new password:
    </p>

    <!-- OTP Display Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
      <tr>
        <td align="center" style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 24px 16px;">
          <span style="color: #991b1b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your Password Reset Code</span>
          <span class="otp-display" style="color: #7f1d1d; font-size: 38px; font-weight: 800; letter-spacing: 10px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; display: inline-block; padding-left: 10px;">${safeCode}</span>
        </td>
      </tr>
    </table>

    <!-- Expiration Warning -->
    <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-radius: 4px; padding: 12px 16px; margin: 0 0 20px;">
      <p style="color: #9a3412; margin: 0; font-size: 13px; line-height: 1.5;">
        ⏰ This reset code will expire in <strong>${expiryMinutes} minutes</strong>.
      </p>
    </div>

    <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
      If you did not request a password reset, your account is still secure. You can safely ignore this email or contact NACOS ICT Directorate if you suspect unauthorized activity.
    </p>
  `;

  const text = [
    'NACOS FUTO - PASSWORD RESET REQUEST',
    '====================================',
    '',
    `Hello ${studentName}${regNumber ? ` (${regNumber})` : ''},`,
    '',
    'We received a request to reset your password for the NACOS FUTO Student Portal.',
    '',
    `YOUR RESET CODE: ${code}`,
    '',
    `This code will expire in ${expiryMinutes} minutes.`,
    '',
    'SECURITY NOTICE: If you did not make this request, please ignore this email.',
    'Your password will not change until you verify this code.',
    '',
    '-----------------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: `NACOS Portal Password Reset: ${code}`,
    html: buildBaseEmailLayout({ title: 'Password Reset Request', preheader, contentHtml }),
    text
  };
}

/**
 * Payment Confirmation Email Template (Styled as Official Institutional Paper Receipt)
 */
export function renderPaymentConfirmationEmail({
  customerName = 'Student',
  reference,
  paymentType = 'Payment',
  amount,
  currency = 'NGN',
  paidAt = new Date().toISOString(),
  regNumber = '',
  level = '',
  session = '2026/2027'
}) {
  const safeName = sanitizeHtml(customerName);
  const safeRef = sanitizeHtml(reference);
  const safeType = sanitizeHtml(paymentType.replace(/_/g, ' '));
  const safeReg = sanitizeHtml(regNumber);
  const safeLevel = sanitizeHtml(level);
  const safeSession = sanitizeHtml(session);
  const formattedAmount = Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormatted = new Date(paidAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const preheader = `Official Receipt: ${safeType} - ${currency} ${formattedAmount} [Ref: ${safeRef}]`;

  const contentHtml = `
    <!-- A5 Proportion POS Thermal Slip Container -->
    <div style="max-width: 440px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 24px 20px; font-family: 'Courier New', Courier, monospace, 'SFMono-Regular', Consolas; font-size: 12px; color: #111827; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
      
      <!-- POS Header -->
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; letter-spacing: 2px;">================================</div>
        <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0 2px;">NACOS FUTO</div>
        <div style="font-size: 11px; font-weight: 700;">NIGERIA ASSOC. OF COMPUTING STUDENTS</div>
        <div style="font-size: 10px; color: #374151;">FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI</div>
        <div style="font-size: 10px; color: #4b5563;">DEPT OF COMPUTER SCIENCE &bull; SICT</div>
        <div style="font-size: 11px; font-weight: bold; letter-spacing: 2px; margin-top: 4px;">================================</div>
      </div>

      <!-- Slip Type Badge -->
      <div style="border-top: 1px dashed #9ca3af; border-bottom: 1px dashed #9ca3af; padding: 6px 0; text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 12px;">
        *** OFFICIAL PAYMENT RECEIPT ***
      </div>

      <!-- Receipt & Transaction Info -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11px; margin-bottom: 8px;">
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">RECEIPT REF:</td>
          <td align="right" style="font-weight: 700; font-family: monospace;">${safeRef}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">DATE / TIME:</td>
          <td align="right">${dateFormatted}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">PAYMENT STATUS:</td>
          <td align="right" style="font-weight: 900; color: #166534;">APPROVED / CLEARED</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">CHANNEL:</td>
          <td align="right">Bachs Online Gateway</td>
        </tr>
      </table>

      <!-- Dashed Divider -->
      <div style="border-top: 1px dashed #9ca3af; margin: 8px 0;"></div>

      <!-- Student Particulars -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11px; margin-bottom: 8px;">
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">NAME:</td>
          <td align="right" style="font-weight: 700; text-transform: uppercase;">${safeName}</td>
        </tr>
        ${safeReg ? `
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">REG / MATRIC:</td>
          <td align="right" style="font-weight: 700; font-family: monospace;">${safeReg}</td>
        </tr>` : ''}
        ${safeLevel ? `
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">LEVEL:</td>
          <td align="right" style="font-weight: 700;">${safeLevel}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">DEPARTMENT:</td>
          <td align="right">Computer Science</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 2px 0;">SESSION:</td>
          <td align="right">${safeSession}</td>
        </tr>
      </table>

      <!-- Double Dashed Divider -->
      <div style="border-top: 2px dashed #6b7280; margin: 10px 0 6px;"></div>

      <!-- Itemized Table -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11px; margin-bottom: 8px;">
        <tr style="border-bottom: 1px dashed #d1d5db; font-weight: bold;">
          <th align="left" style="padding-bottom: 4px;">DESCRIPTION</th>
          <th align="center" style="padding-bottom: 4px;">QTY</th>
          <th align="right" style="padding-bottom: 4px;">AMOUNT</th>
        </tr>
        <tr>
          <td style="padding: 6px 0 2px; font-weight: 700;">${safeType}</td>
          <td align="center" style="padding: 6px 0 2px;">1</td>
          <td align="right" style="padding: 6px 0 2px; font-weight: 700;">${currency} ${formattedAmount}</td>
        </tr>
        <tr style="font-size: 10px; color: #6b7280;">
          <td style="padding: 2px 0;">E-Portal Verification</td>
          <td align="center" style="padding: 2px 0;">1</td>
          <td align="right" style="padding: 2px 0;">₦0.00</td>
        </tr>
        <tr style="font-size: 10px; color: #6b7280;">
          <td style="padding: 2px 0;">Secretariat Tech Levy</td>
          <td align="center" style="padding: 2px 0;">1</td>
          <td align="right" style="padding: 2px 0;">₦0.00</td>
        </tr>
      </table>

      <!-- Total Box -->
      <div style="border-top: 2px solid #111827; border-bottom: 2px solid #111827; padding: 8px 0; margin: 8px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; font-weight: 900;">
          <tr>
            <td>TOTAL PAID:</td>
            <td align="right">${currency} ${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <!-- Barcode simulation -->
      <div style="text-align: center; font-family: monospace; letter-spacing: 3px; font-size: 11px; margin: 14px 0 4px; color: #374151;">
        ||| | ||||| || |||| ||||| ||| ||||| ||
        <div style="font-size: 9px; letter-spacing: 0; color: #6b7280; margin-top: 2px;">*${safeRef}*</div>
      </div>

      <!-- Footer Notice -->
      <div style="border-top: 1px dashed #9ca3af; padding-top: 8px; margin-top: 8px; text-align: center; font-size: 9px; color: #6b7280; line-height: 1.4;">
        *** OFFICIAL NACOS RECEIPT &bull; RETAIN FOR CLEARANCE ***<br />
        THANK YOU FOR SUPPORTING YOUR DEPARTMENT
      </div>

    </div>

    </div>
  `;

  const text = [
    'NACOS FUTO - OFFICIAL PAYMENT CLEARANCE RECEIPT',
    '=================================================',
    '',
    `Student Name: ${customerName}`,
    ...(regNumber ? [`Reg Number: ${regNumber}`] : []),
    `Item Description: ${paymentType.replace(/_/g, ' ')}`,
    `Total Amount: ${currency} ${formattedAmount}`,
    `Reference: ${reference}`,
    `Date & Time: ${dateFormatted}`,
    'Payment Channel: Bachs Online Gateway',
    'Status: APPROVED & CLEARED',
    '',
    'This is an official payment confirmation and clearance document issued by NACOS FUTO.',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: `NACOS FUTO Official Receipt: ${safeType} [${safeRef}]`,
    html: buildBaseEmailLayout({ title: 'Official Payment Clearance Receipt', preheader, contentHtml }),
    text
  };
}

/**
 * Account Recovery Notification for Admins
 */
export function renderRecoveryNotificationEmail({ adminEmail, studentReg, studentName }) {
  const safeName = sanitizeHtml(studentName);
  const safeReg = sanitizeHtml(studentReg);

  const preheader = `Account recovery request submitted by ${safeName} (${safeReg})`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Account Recovery Request</h2>
    <p style="color: #475569; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      A student has submitted an account recovery request on the NACOS FUTO Student Portal:
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 0 0 20px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #334155;"><strong>Student Name:</strong> ${safeName}</p>
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Registration Number:</strong> ${safeReg}</p>
    </div>

    <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
      Please log in to the <strong>Portal Admin Panel</strong> to review this request and take appropriate verification action.
    </p>
  `;

  const text = [
    'NACOS FUTO - ACCOUNT RECOVERY REQUEST',
    '======================================',
    '',
    `Student Name: ${studentName}`,
    `Registration Number: ${studentReg}`,
    '',
    'Please review this request in the Portal Admin Panel.',
    '',
    '-----------------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: `[NACOS Portal] Account Recovery Request: ${studentReg}`,
    html: buildBaseEmailLayout({ title: 'Account Recovery Request', preheader, contentHtml }),
    text
  };
}

/**
 * Official Administrator Role & Scope Assignment Email
 */
export function renderAdminAssignmentEmail({
  fullName = 'Administrator',
  email = '',
  scope = 'student_portal',
  role = 'portal_admin',
  assignedLevel = 'all',
  portalAdminUrl = 'https://portal-admin.nacosfuto.com.ng',
  assignedAt = new Date().toISOString()
}) {
  const safeName = sanitizeHtml(fullName);
  const safeEmail = sanitizeHtml(email);
  const safeScope = sanitizeHtml(scope);
  const safeRole = sanitizeHtml(role.replace(/_/g, ' ').toUpperCase());
  const levelDisplay = assignedLevel === 'all' ? 'All Academic Levels (Full Access)' : `${sanitizeHtml(assignedLevel)} Level Only`;
  const accessUrl = portalAdminUrl || 'https://portal-admin.nacosfuto.com.ng';
  const assignedDateFormatted = new Date(assignedAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const preheader = `You have been appointed as a NACOS FUTO Administrator (${safeRole}) with scope: ${safeScope}`;

  const contentHtml = `
    <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">Administrator Role &amp; Scope Assigned</h2>
    <p style="color: #475569; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
      Dear <strong>${safeName}</strong>,
    </p>
    <p style="color: #475569; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
      You have been officially granted administrative privileges on the <strong>Nigeria Association of Computing Students (NACOS) FUTO</strong> management platform.
    </p>

    <!-- Scope Details Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 24px; overflow: hidden;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Administrator Name</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Assigned Email</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Designated Role</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #15803d; font-weight: 700; text-align: right;">${safeRole}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">System Scope</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: 600; text-align: right;">${safeScope}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Academic Level Scope</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${levelDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">Assignment Timestamp</td>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b; text-align: right;">${assignedDateFormatted}</td>
      </tr>
    </table>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${accessUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #083002 0%, #138601 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(19, 134, 1, 0.25);">
        Access Administrator Portal &rarr;
      </a>
    </div>

    <!-- Direct Access Link -->
    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 20px; text-align: center;">
      Direct link: <a href="${accessUrl}" style="color: #16a34a; text-decoration: underline;">${accessUrl}</a>
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 24px 0 0;">
      <p style="color: #166534; margin: 0; font-size: 12px; line-height: 1.6;">
        <strong>Security &amp; Ethics Notice:</strong> Administrative access is strictly confidential and monitored. Always log in using your registered credentials and ensure your session is terminated after administrative sessions.
      </p>
    </div>
  `;

  const text = [
    'NACOS FUTO - ADMINISTRATOR ROLE & SCOPE ASSIGNMENT',
    '==================================================',
    '',
    `Dear ${fullName},`,
    '',
    'You have been officially granted administrative privileges on the NACOS FUTO management platform.',
    '',
    `Administrative Role: ${safeRole}`,
    `System Scope: ${scope}`,
    `Assigned Level: ${levelDisplay}`,
    `Assigned Email: ${email}`,
    `Assignment Date: ${assignedDateFormatted}`,
    '',
    `Access Link: ${accessUrl}`,
    '',
    '-----------------------------------------',
    'Department of Computer Science',
    'Federal University of Technology, Owerri (FUTO)'
  ].join('\n');

  return {
    subject: `[NACOS FUTO] Administrative Scope Assigned: ${safeRole} (${levelDisplay})`,
    html: buildBaseEmailLayout({ title: 'Administrative Scope Assigned', preheader, contentHtml }),
    text
  };
}
