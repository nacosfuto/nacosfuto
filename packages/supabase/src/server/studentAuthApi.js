/**
 * @file packages/supabase/src/server/studentAuthApi.js
 * Authoritative Server-Side Student Authentication & Identity Verification Engine
 * 
 * Implements strict multi-step identity verification:
 * 1. Step 1: Registration Number check (checks ground truth in verified_students, no PII leaked).
 * 2. Step 2: Name Verification (normalized exact match of First Name & Last Name against official record;
 *            checks verified contact on file; blocks if no verified contact exists).
 * 3. Step 3: Account Ownership Verification (purpose-bound 6-digit OTP sent to verified contact).
 * 4. Step 4: Account Creation / Password Setting (immutable registration number, account linking).
 * 5. Forgot Password: Same 4-step identity verification model.
 * 6. Sensitive Action Step-Up Authentication (purpose-bound tokens for payments, ID cards, profile updates).
 */

import crypto from 'crypto';
import { supabase } from '../client.js';
import { dispatchEmail } from './emailDispatcher.js';
import { validateRegistrationNumberFormat } from '@nacos/config/academic';

const AUTH_SECRET = process.env.SESSION_SECRET || process.env.VITE_SUPABASE_ANON_KEY || 'nacos_futo_auth_signature_key_2026';
const SALT = 'nacos_futo_salt_2026';
const OTP_EXPIRY_MINUTES = 15;
const ACTION_TOKEN_EXPIRY_MINUTES = 15;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// =============================================================================
// CRYPTOGRAPHIC TOKEN HELPERS (HMAC-SHA256 Signed State Machine)
// =============================================================================

export function signAuthToken(payload) {
  const data = {
    ...payload,
    timestamp: Date.now()
  };
  const jsonStr = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(jsonStr).digest('base64url');
  return `${jsonStr}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [jsonStr, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(jsonStr).digest('base64url');
  if (signature !== expectedSignature) return null;
  try {
    const payload = JSON.parse(Buffer.from(jsonStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (_) {
    return null;
  }
}

export function hashPasswordServer(password, salt = SALT) {
  // Enterprise PBKDF2 with 100,000 iterations (NIST SP 800-63B compliant)
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2$100000$${hash}`;
}

export function verifyPasswordServer(password, storedHash, salt = SALT) {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const iters = parseInt(parts[1], 10) || 100000;
    const computed = `pbkdf2$${iters}$${crypto.pbkdf2Sync(password, salt, iters, 32, 'sha256').toString('hex')}`;
    return computed === storedHash;
  }
  // Legacy SHA-256 salted or unsalted
  const legacySalted = crypto.createHash('sha256').update(password + salt).digest('hex');
  const legacyUnsalted = crypto.createHash('sha256').update(password).digest('hex');
  return storedHash === legacySalted || storedHash === legacyUnsalted;
}

export function hashOtpServer(otp) {
  return crypto.createHash('sha256').update(otp + 'nacos_otp_salt_2026').digest('hex');
}

// =============================================================================
// NORMALIZATION & MASKING HELPERS
// =============================================================================

export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local.charAt(0)}••@${domain}`;
  return `${local.charAt(0)}••••${local.charAt(local.length - 1)}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return '••••••' + digits.slice(-4);
}

// =============================================================================
// DATABASE LOOKUPS (Official Ground Truth: verified_students & profiles)
// =============================================================================

async function getOfficialStudentRecord(registrationNumber) {
  const cleanReg = registrationNumber.trim().toUpperCase();

  // 1. Try Supabase verified_students table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verified_students')
        .select('*')
        .or(`registration_number.eq.${cleanReg},registration_number.ilike.${cleanReg}`)
        .limit(1)
        .maybeSingle();

      if (data && !error) return data;
    } catch (e) {
      console.warn('verified_students lookup warning:', e.message);
    }
  }

  // 2. Canonical departmental roster fallback
  const { getLocalVerifiedStudents } = await import('../verifiedStudents.js');
  const roster = getLocalVerifiedStudents();
  return roster.find(s => 
    s.registration_number.toUpperCase() === cleanReg ||
    s.registration_number.replace(/[^a-zA-Z0-9]/g, '') === cleanReg.replace(/[^a-zA-Z0-9]/g, '')
  ) || null;
}

async function getStudentProfile(registrationNumber) {
  const cleanReg = registrationNumber.trim().toUpperCase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`registration_number.eq.${cleanReg},registration_number.ilike.${cleanReg}`)
        .limit(1)
        .maybeSingle();

      if (data && !error) return data;
    } catch (_) {}
  }
  return null;
}

// =============================================================================
// 1. STEP 1: REGISTRATION NUMBER CHECK
// =============================================================================

export async function handleSignupStep1({ registrationNumber }) {
  if (!registrationNumber || !registrationNumber.trim()) {
    return { success: false, error: 'Registration number is required.' };
  }

  const cleanReg = registrationNumber.trim().toUpperCase();
  const formatValidation = validateRegistrationNumberFormat(cleanReg);
  if (!formatValidation.valid) {
    return { success: false, error: formatValidation.error || 'Invalid registration number format.' };
  }

  // 1. Check official student record in backend
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return {
      success: false,
      error: 'Registration number not found in departmental records. Please verify the number or contact your departmental administrator.'
    };
  }

  // 2. Check if student already registered
  const isMarkedRegistered = officialRecord.has_registered === true || officialRecord.is_registered === true;
  const existingProfile = await getStudentProfile(cleanReg);
  const hasActivePassword = Boolean(existingProfile?.password_hash);

  if (isMarkedRegistered || hasActivePassword) {
    return {
      success: false,
      registered: true,
      message: 'This registration number is already registered. Please log in with your password or use Forgot Password to reset your account.'
    };
  }

  // 3. Issue Step 1 verification token (valid for 30 minutes, zero PII exposed)
  const step1Token = signAuthToken({
    step: 1,
    purpose: 'SIGNUP',
    registrationNumber: cleanReg,
    studentId: officialRecord.id,
    exp: Date.now() + 30 * 60 * 1000
  });

  return {
    success: true,
    registered: false,
    step1Token,
    message: 'Registration number verified in departmental records.'
  };
}

// =============================================================================
// 2. STEP 2: NAME & CONTACT VERIFICATION
// =============================================================================

export async function handleSignupStep2({ step1Token, firstName, lastName, middleName }) {
  const verifiedToken = verifyAuthToken(step1Token);
  if (!verifiedToken || verifiedToken.step !== 1 || verifiedToken.purpose !== 'SIGNUP') {
    return { success: false, error: 'Invalid or expired verification session. Please restart from Step 1.' };
  }

  if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
    return { success: false, error: 'First Name and Last Name are required.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return { success: false, error: 'Student record could not be retrieved. Please restart.' };
  }

  // Normalize candidate names and official names
  const normInputFirst = normalizeName(firstName);
  const normInputLast = normalizeName(lastName);
  const normInputMiddle = normalizeName(middleName || '');

  const normOfficialFirst = normalizeName(officialRecord.first_name || '');
  const normOfficialLast = normalizeName(officialRecord.last_name || officialRecord.surname || '');
  const normOfficialMiddle = normalizeName(officialRecord.middle_name || '');
  const normOfficialFull = normalizeName(officialRecord.full_name || '');

  // Strict check: First and Last name must match official record
  // Either direct first/last match, or swapped if entered as surname, or contained as distinct words in full_name
  const officialWords = normOfficialFull.split(' ').filter(Boolean);

  const firstMatches = normInputFirst === normOfficialFirst || 
    normInputFirst === normOfficialLast ||
    officialWords.includes(normInputFirst);

  const lastMatches = normInputLast === normOfficialLast || 
    normInputLast === normOfficialFirst ||
    officialWords.includes(normInputLast);

  if (!firstMatches || !lastMatches) {
    return {
      success: false,
      error: 'The name entered does not match the official departmental records for this registration number. Please check your spelling.'
    };
  }

  if (normInputMiddle && normOfficialMiddle) {
    const middleMatches = normInputMiddle === normOfficialMiddle || officialWords.includes(normInputMiddle);
    if (!middleMatches) {
      return {
        success: false,
        error: 'The middle name entered does not match our records.'
      };
    }
  }

  // Check verified contact details on file
  const officialEmail = (officialRecord.email || '').trim().toLowerCase();
  const officialPhone = (officialRecord.phone_number || '').trim();

  const channels = [];
  if (officialEmail && officialEmail.includes('@')) {
    channels.push({
      type: 'email',
      label: 'Official Email',
      masked: maskEmail(officialEmail)
    });
  }
  if (officialPhone && officialPhone.replace(/\D/g, '').length >= 10) {
    channels.push({
      type: 'phone',
      label: 'Official Phone',
      masked: maskPhone(officialPhone)
    });
  }

  // Edge case: No verified contact on official record
  if (channels.length === 0) {
    return {
      success: false,
      noVerifiedContact: true,
      message: 'Your official departmental record does not contain verified contact details. Please contact the NACOS Departmental Administrator to update your record before completing registration.'
    };
  }

  // Issue Step 2 Token (stores trusted contact info server-side, valid for 20 minutes)
  const step2Token = signAuthToken({
    step: 2,
    purpose: 'SIGNUP',
    registrationNumber: cleanReg,
    studentId: officialRecord.id,
    hasEmail: Boolean(officialEmail),
    hasPhone: Boolean(officialPhone),
    exp: Date.now() + 20 * 60 * 1000
  });

  return {
    success: true,
    step2Token,
    channels,
    message: 'Identity verified. Please select a verification method to receive your security code.'
  };
}

// =============================================================================
// 3. STEP 3: SEND OTP (PURPOSE-BOUND)
// =============================================================================

export async function handleSendOtp({ stepToken, channel = 'email', purpose = 'SIGNUP', ipAddress = null }) {
  const verifiedToken = verifyAuthToken(stepToken);
  if (!verifiedToken) {
    return { success: false, error: 'Invalid or expired session. Please restart verification.' };
  }

  const validPurposes = ['SIGNUP', 'PASSWORD_RESET', 'PAYMENT_CONFIRMATION', 'ID_CARD_GENERATION', 'PASSWORD_CHANGE'];
  if (!validPurposes.includes(purpose)) {
    return { success: false, error: 'Invalid verification purpose.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return { success: false, error: 'Official student record not found.' };
  }

  const cleanChannel = channel === 'sms' || channel === 'phone' ? 'phone' : 'email';
  const destination = cleanChannel === 'email' ? officialRecord.email : officialRecord.phone_number;

  if (!destination) {
    return {
      success: false,
      error: `No verified ${cleanChannel} is associated with your official student record. Please contact the departmental administrator.`
    };
  }

  const maskedDestination = cleanChannel === 'email' ? maskEmail(destination) : maskPhone(destination);

  // Rate Limiting Check
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  let currentAttempts = 0;
  if (supabase) {
    try {
      const { count } = await supabase
        .from('otp_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('registration_number', cleanReg)
        .gte('created_at', windowStart);

      currentAttempts = count || 0;
    } catch (_) {}
  }

  if (currentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      success: false,
      error: 'Too many verification code requests. Please wait 15 minutes before trying again.',
      retryAfterSeconds: 900
    };
  }

  // Generate cryptographically secure 6-digit OTP
  const randomBytes = crypto.randomBytes(3);
  const otpCode = ((randomBytes.readUIntBE(0, 3) % 900000) + 100000).toString();
  const otpHash = hashOtpServer(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Save Challenge in Database
  if (supabase) {
    try {
      // Clean up only expired challenges for this registration number
      const nowIso = new Date().toISOString();
      await supabase
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('registration_number', cleanReg)
        .lt('expires_at', nowIso)
        .eq('is_used', false);

      // Insert new verification record with purpose encoded
      await supabase.from('otp_verifications').insert([{
        registration_number: cleanReg,
        channel: cleanChannel,
        destination: maskedDestination,
        destination_full: destination,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        max_attempts: 5,
        is_used: false,
        ip_address: JSON.stringify({ purpose, clientIp: ipAddress, studentId: officialRecord.id }),
        created_at: new Date().toISOString()
      }]);

      // If otp_challenges table exists, also insert there
      try {
        await supabase.from('otp_challenges').insert([{
          student_id: officialRecord.id,
          registration_number: cleanReg,
          purpose,
          channel: cleanChannel,
          destination_masked: maskedDestination,
          destination_hash: crypto.createHash('sha256').update(destination).digest('hex'),
          otp_hash: otpHash,
          expires_at: expiresAt,
          attempt_count: 0,
          max_attempts: 5,
          is_used: false,
          ip_address: ipAddress,
          created_at: new Date().toISOString()
        }]);
      } catch (_) {}
    } catch (dbErr) {
      console.warn('Could not record OTP in database:', dbErr.message);
    }
  }

  // Dispatch OTP
  const studentName = officialRecord.first_name || officialRecord.full_name?.split(' ')[0] || 'Student';
  if (cleanChannel === 'email') {
    const emailSubject = purpose === 'SIGNUP'
      ? `${otpCode} is your NACOS Student Portal Verification Code`
      : purpose === 'PASSWORD_RESET'
      ? `${otpCode} is your Password Reset Code`
      : `${otpCode} is your NACOS Security Verification Code`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">NACOS FUTO</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Official Student Portal</p>
        </div>
        <p style="font-size: 16px; line-height: 24px; color: #374151;">Hello <strong>${studentName}</strong>,</p>
        <p style="font-size: 15px; line-height: 22px; color: #4b5563;">
          Use the 6-digit verification code below to authorize your <strong>${purpose.replace(/_/g, ' ')}</strong> request on the NACOS FUTO Student Portal:
        </p>
        <div style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 18px;">
          • This security code is valid for <strong>15 minutes</strong>.<br />
          • Registration Number: <strong>${cleanReg}</strong><br />
          • Never share this code with anyone. NACOS administrators will never ask for your verification code.
        </p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">
          Federal University of Technology, Owerri • Department of Computer Science<br />
          NACOS Secretariat, SICT Building, FUTO
        </p>
      </div>
    `;

    try {
      await dispatchEmail({
        to: destination,
        subject: emailSubject,
        html: emailHtml
      });
    } catch (sendErr) {
      console.error('[OTP Dispatch Error]:', sendErr.message);
      return { success: false, error: 'Failed to deliver verification code. Please try again.' };
    }
  } else {
    // SMS dispatch via Termii (or serverless SMS)
    try {
      const { sendSMSMessage } = await import('../smsService.js').catch(() => ({}));
      if (sendSMSMessage) {
        await sendSMSMessage(destination, `NACOS FUTO Portal: Your verification code is ${otpCode}. Valid for 15 mins.`);
      }
    } catch (smsErr) {
      console.warn('SMS delivery warning:', smsErr.message);
    }
  }

  return {
    success: true,
    maskedDestination,
    cooldownSeconds: 60,
    expiresAt,
    message: `Verification code sent to ${maskedDestination}.`
  };
}

// =============================================================================
// 3b. STEP 3: VERIFY OTP (PURPOSE-BOUND CHALLENGE VALIDATION)
// =============================================================================

export async function handleVerifyOtp({ stepToken, otpCode, purpose = 'SIGNUP' }) {
  const verifiedToken = verifyAuthToken(stepToken);
  if (!verifiedToken) {
    return { success: false, error: 'Session expired. Please restart the verification flow.' };
  }

  // Sanitize input: extract 6 digits, strip any accidental whitespace, hyphens, or formatting
  const cleanOtp = (otpCode || '').toString().replace(/\D/g, '').trim();
  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit verification code.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const candidateHash = hashOtpServer(cleanOtp);
  const nowIso = new Date().toISOString();

  let matched = false;

  // 1. Look up active challenge(s) in Supabase
  if (supabase) {
    try {
      // Fetch all active, unexpired, unused verification challenges for this student
      const { data: activeRecords, error: fetchErr } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('registration_number', cleanReg)
        .eq('is_used', false)
        .gte('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        console.warn('Database OTP query warning:', fetchErr.message);
      }

      const activeList = activeRecords || [];
      const matchedRecord = activeList.find(r => r.otp_hash === candidateHash);

      if (matchedRecord) {
        if (matchedRecord.attempts >= (matchedRecord.max_attempts || 5)) {
          return { success: false, error: 'Too many incorrect attempts on this code. Please request a new verification code.' };
        }

        matched = true;

        // Mark the matched record as used & verified
        await supabase
          .from('otp_verifications')
          .update({ is_used: true, verified_at: nowIso })
          .eq('id', matchedRecord.id);

        // Deactivate all sibling pending codes for this student to prevent reuse
        await supabase
          .from('otp_verifications')
          .update({ is_used: true })
          .eq('registration_number', cleanReg)
          .eq('is_used', false);

      } else if (activeList.length > 0) {
        // Active challenge exists, but user entered wrong code
        const latestChallenge = activeList[0];
        const newAttempts = (latestChallenge.attempts || 0) + 1;
        const maxAttempts = latestChallenge.max_attempts || 5;

        await supabase
          .from('otp_verifications')
          .update({
            attempts: newAttempts,
            is_used: newAttempts >= maxAttempts
          })
          .eq('id', latestChallenge.id);

        const remaining = Math.max(0, maxAttempts - newAttempts);
        return {
          success: false,
          error: remaining > 0
            ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
            : 'Maximum verification attempts exceeded. Please request a new code.'
        };
      } else {
        // No active unexpired unused challenge found. Check historical records to give precise feedback
        const { data: recentRecords } = await supabase
          .from('otp_verifications')
          .select('*')
          .eq('registration_number', cleanReg)
          .order('created_at', { ascending: false })
          .limit(10);

        const historicalMatch = (recentRecords || []).find(r => r.otp_hash === candidateHash);
        if (historicalMatch) {
          if (historicalMatch.verified_at) {
            return { success: false, error: 'This verification code has already been verified and used.' };
          }
          if (historicalMatch.is_used) {
            return { success: false, error: 'This verification code was superseded by a newer code. Please use the most recent code sent to your contact or request a new code.' };
          }
          if (new Date(historicalMatch.expires_at) <= new Date()) {
            return { success: false, error: 'This verification code has expired. Please request a new code.' };
          }
        }

        return { success: false, error: 'Invalid or expired verification code. Please request a new code.' };
      }
    } catch (e) {
      console.warn('Database OTP verification error:', e.message);
    }
  }

  if (!matched) {
    return { success: false, error: 'Invalid or expired verification code. Please request a new code.' };
  }

  // Issue Action Authorization Token (Short-lived, Purpose-Bound, valid for 15 minutes)
  const authorizationToken = signAuthToken({
    purpose,
    registrationNumber: cleanReg,
    studentId: verifiedToken.studentId,
    verifiedAt: Date.now(),
    exp: Date.now() + ACTION_TOKEN_EXPIRY_MINUTES * 60 * 1000
  });

  // Also record in verification_sessions for database tracking
  if (supabase) {
    try {
      await supabase.from('verification_sessions').insert([{
        registration_number: cleanReg,
        session_token: authorizationToken,
        verified_channel: 'email',
        verified_destination: 'verified',
        is_consumed: false,
        expires_at: new Date(Date.now() + ACTION_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString(),
        created_at: nowIso
      }]);
    } catch (_) {}
  }

  return {
    success: true,
    authorizationToken,
    message: 'Verification code confirmed.'
  };
}

// =============================================================================
// 4. STEP 4: COMPLETE SIGNUP & ACCOUNT CREATION
// =============================================================================

export async function handleCompleteSignup({ authorizationToken, password }) {
  const verifiedToken = verifyAuthToken(authorizationToken);
  if (!verifiedToken || verifiedToken.purpose !== 'SIGNUP') {
    return { success: false, error: 'Unauthorized or expired session. Please complete identity verification first.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return { success: false, error: 'Student record could not be found.' };
  }

  const passwordHash = hashPasswordServer(password);
  const nowIso = new Date().toISOString();

  // Create or Update student profile in public.profiles
  const profileRecord = {
    id: officialRecord.id || crypto.randomUUID(),
    registration_number: cleanReg,
    matric_number: cleanReg,
    surname: officialRecord.surname || officialRecord.last_name || '',
    first_name: officialRecord.first_name || '',
    middle_name: officialRecord.middle_name || '',
    last_name: officialRecord.last_name || officialRecord.surname || '',
    full_name: officialRecord.full_name || `${officialRecord.first_name} ${officialRecord.last_name || officialRecord.surname}`,
    email: officialRecord.email,
    phone_number: officialRecord.phone_number || '',
    admission_year: officialRecord.admission_year || 2024,
    department: officialRecord.department || 'Computer Science',
    faculty: officialRecord.faculty || 'School of Information & Communication Tech (SICT)',
    programme: officialRecord.programme || 'B.Tech Computer Science',
    programme_duration: officialRecord.programme_duration || 5,
    role: 'Student Member',
    institution: 'Federal University of Technology, Owerri (FUTO)',
    is_active: true,
    password_hash: passwordHash,
    updated_at: nowIso
  };

  if (supabase) {
    try {
      // 1. Upsert profile
      await supabase.from('profiles').upsert(profileRecord, { onConflict: 'registration_number' });

      // 2. Mark verified_students as registered
      await supabase
        .from('verified_students')
        .update({
          has_registered: true,
          is_registered: true,
          registered_at: nowIso,
          updated_at: nowIso
        })
        .eq('registration_number', cleanReg);

      // 3. Mark verification session consumed
      await supabase
        .from('verification_sessions')
        .update({ is_consumed: true })
        .eq('session_token', authorizationToken);

      // 4. Update or insert student_auth
      try {
        await supabase
          .from('student_auth')
          .upsert({
            student_id: officialRecord.id,
            registration_number: cleanReg,
            account_status: 'active',
            verified_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'registration_number' });
      } catch (_) {}
    } catch (dbErr) {
      console.warn('Database signup completion warning:', dbErr.message);
    }
  }

  const { enrichStudentProfile } = await import('../auth.js');
  const enriched = enrichStudentProfile(profileRecord);

  return {
    success: true,
    user: enriched,
    message: 'Your NACOS student account has been successfully created!'
  };
}

// =============================================================================
// 5. FORGOT PASSWORD WORKFLOW (MATCHING 4-STEP IDENTITY VERIFICATION)
// =============================================================================

export async function handleForgotPasswordStep1({ registrationNumber }) {
  if (!registrationNumber || !registrationNumber.trim()) {
    return { success: false, error: 'Registration number is required.' };
  }

  const cleanReg = registrationNumber.trim().toUpperCase();
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return {
      success: false,
      error: 'Registration number not found in departmental records. Please verify your details.'
    };
  }

  // Check if account has been registered
  const existingProfile = await getStudentProfile(cleanReg);
  const isRegistered = officialRecord.has_registered === true || officialRecord.is_registered === true || Boolean(existingProfile?.password_hash);

  if (!isRegistered) {
    return {
      success: false,
      notRegistered: true,
      message: 'This registration number has not been registered yet. Please create your account first.'
    };
  }

  // Issue Step 1 Token for Password Reset
  const step1Token = signAuthToken({
    step: 1,
    purpose: 'PASSWORD_RESET',
    registrationNumber: cleanReg,
    studentId: officialRecord.id,
    exp: Date.now() + 30 * 60 * 1000
  });

  return {
    success: true,
    step1Token,
    message: 'Registration number verified. Please confirm your identity in Step 2.'
  };
}

export async function handleForgotPasswordStep2({ step1Token, firstName, lastName, middleName }) {
  const verifiedToken = verifyAuthToken(step1Token);
  if (!verifiedToken || verifiedToken.step !== 1 || verifiedToken.purpose !== 'PASSWORD_RESET') {
    return { success: false, error: 'Session expired. Please restart password recovery.' };
  }

  if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
    return { success: false, error: 'First Name and Last Name are required.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    return { success: false, error: 'Student record could not be retrieved.' };
  }

  // Strict normalized name comparison
  const normInputFirst = normalizeName(firstName);
  const normInputLast = normalizeName(lastName);
  const normInputMiddle = normalizeName(middleName || '');

  const normOfficialFirst = normalizeName(officialRecord.first_name || '');
  const normOfficialLast = normalizeName(officialRecord.last_name || officialRecord.surname || '');
  const normOfficialMiddle = normalizeName(officialRecord.middle_name || '');
  const normOfficialFull = normalizeName(officialRecord.full_name || '');
  const officialWords = normOfficialFull.split(' ').filter(Boolean);

  const firstMatches = normInputFirst === normOfficialFirst || 
    normInputFirst === normOfficialLast || 
    officialWords.includes(normInputFirst);

  const lastMatches = normInputLast === normOfficialLast || 
    normInputLast === normOfficialFirst || 
    officialWords.includes(normInputLast);

  if (!firstMatches || !lastMatches) {
    return {
      success: false,
      error: 'The name entered does not match the official departmental records for this registration number.'
    };
  }

  if (normInputMiddle && normOfficialMiddle) {
    const middleMatches = normInputMiddle === normOfficialMiddle || officialWords.includes(normInputMiddle);
    if (!middleMatches) {
      return { success: false, error: 'The middle name entered does not match our records.' };
    }
  }

  // Check verified contact details
  const officialEmail = (officialRecord.email || '').trim().toLowerCase();
  const officialPhone = (officialRecord.phone_number || '').trim();

  const channels = [];
  if (officialEmail && officialEmail.includes('@')) {
    channels.push({ type: 'email', label: 'Official Email', masked: maskEmail(officialEmail) });
  }
  if (officialPhone && officialPhone.replace(/\D/g, '').length >= 10) {
    channels.push({ type: 'phone', label: 'Official Phone', masked: maskPhone(officialPhone) });
  }

  if (channels.length === 0) {
    return {
      success: false,
      noVerifiedContact: true,
      message: 'Your official departmental record does not contain verified contact details. Please contact the NACOS Departmental Administrator to restore access to your account.'
    };
  }

  const step2Token = signAuthToken({
    step: 2,
    purpose: 'PASSWORD_RESET',
    registrationNumber: cleanReg,
    studentId: officialRecord.id,
    exp: Date.now() + 20 * 60 * 1000
  });

  return {
    success: true,
    step2Token,
    channels,
    message: 'Identity verified. Please select where to receive your password reset code.'
  };
}

export async function handleCompleteResetPassword({ authorizationToken, newPassword }) {
  const verifiedToken = verifyAuthToken(authorizationToken);
  if (!verifiedToken || verifiedToken.purpose !== 'PASSWORD_RESET') {
    return { success: false, error: 'Unauthorized or expired session. Please complete verification.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const cleanReg = verifiedToken.registrationNumber;
  const passwordHash = hashPasswordServer(newPassword);
  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      await supabase
        .from('profiles')
        .update({ password_hash: passwordHash, updated_at: nowIso })
        .eq('registration_number', cleanReg);

      await supabase
        .from('verification_sessions')
        .update({ is_consumed: true })
        .eq('session_token', authorizationToken);
    } catch (e) {
      console.warn('Password reset database warning:', e.message);
    }
  }

  return {
    success: true,
    message: 'Your password has been successfully reset. Please log in with your new password.'
  };
}

// =============================================================================
// 6. SENSITIVE ACTION VERIFICATION (STEP-UP AUTHENTICATION)
// =============================================================================

export async function handleSensitiveActionRequest({ registrationNumber, purpose, channel = 'email' }) {
  if (!registrationNumber || !purpose) {
    return { success: false, error: 'Registration number and purpose are required.' };
  }

  const stepToken = signAuthToken({
    step: 2,
    purpose,
    registrationNumber: registrationNumber.trim().toUpperCase(),
    exp: Date.now() + 15 * 60 * 1000
  });

  return handleSendOtp({ stepToken, channel, purpose });
}

export async function handleSensitiveActionVerify({ registrationNumber, purpose, otpCode }) {
  if (!registrationNumber || !purpose || !otpCode) {
    return { success: false, error: 'Missing required parameters.' };
  }

  const stepToken = signAuthToken({
    step: 2,
    purpose,
    registrationNumber: registrationNumber.trim().toUpperCase(),
    exp: Date.now() + 15 * 60 * 1000
  });

  return handleVerifyOtp({ stepToken, otpCode, purpose });
}

export async function handleSensitiveActionVerifyPassword({ registrationNumber, password, purpose }) {
  if (!registrationNumber || !password || !purpose) {
    return { success: false, error: 'Registration number, password, and purpose are required.' };
  }

  const cleanReg = registrationNumber.trim().toUpperCase();
  const profile = await getStudentProfile(cleanReg);
  if (!profile || !profile.password_hash) {
    return { success: false, error: 'Student account profile not found.' };
  }

  const isValid = verifyPasswordServer(password, profile.password_hash);
  if (!isValid) {
    return { success: false, error: 'Incorrect password. Verification failed.' };
  }

  // Issue action token
  const actionToken = signAuthToken({
    purpose,
    registrationNumber: cleanReg,
    studentId: profile.id,
    verifiedAt: Date.now(),
    exp: Date.now() + ACTION_TOKEN_EXPIRY_MINUTES * 60 * 1000
  });

  return {
    success: true,
    actionToken,
    message: 'Identity confirmed.'
  };
}
