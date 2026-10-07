import { supabase } from './client.js';

const OTP_STORAGE_KEY = 'nacos_otp_verifications_db';
const SESSION_STORAGE_KEY = 'nacos_verification_sessions_db';
const RATE_LIMIT_KEY = 'nacos_otp_rate_limits_db';
const RECOVERY_REQUESTS_KEY = 'nacos_account_recovery_requests_db';

const OTP_EXPIRY_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 5;
const SESSION_EXPIRY_MINUTES = 15;

// =========================================================================
// CRYPTOGRAPHIC UTILITIES
// =========================================================================

export function generateSecureOTP() {
  const array = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 6; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += (array[i] % 10).toString();
  }
  return otp;
}

export async function hashOTP(otp) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + 'nacos_otp_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  const str = otp + 'nacos_otp_salt_2026';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'otp_hash_' + Math.abs(hash).toString(16);
}

export function generateSessionToken() {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =========================================================================
// MASKING UTILITIES
// =========================================================================

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local.charAt(0)}\u2022\u2022@${domain}`;
  return `${local.charAt(0)}\u2022\u2022\u2022\u2022${local.charAt(local.length - 1)}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return '\u2022'.repeat(digits.length - 4) + digits.slice(-4);
}

// =========================================================================
// LOCAL STORAGE HELPERS
// =========================================================================

function getLocalData(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

function saveLocalData(key, data) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {}
}

// =========================================================================
// RATE LIMITING
// =========================================================================

export async function checkRateLimit(regNumber, channel) {
  const cleanReg = regNumber.trim().toUpperCase();

  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('otp_rate_limits')
      .select('request_count, window_start')
      .eq('registration_number', cleanReg)
      .eq('request_type', channel)
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && data.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      const windowEnd = new Date(new Date(data.window_start).getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      const retryAfter = Math.max(0, Math.ceil((windowEnd - new Date()) / 1000));
      return { allowed: false, retryAfterSeconds: retryAfter };
    }
  } catch (e) {}

  const limits = getLocalData(RATE_LIMIT_KEY);
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  const relevant = limits.filter(l =>
    l.registration_number === cleanReg &&
    l.request_type === channel &&
    (now - new Date(l.window_start).getTime()) < windowMs
  );
  const totalCount = relevant.reduce((sum, l) => sum + l.request_count, 0);
  if (totalCount >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = relevant.sort((a, b) => new Date(a.window_start) - new Date(b.window_start))[0];
    const windowEnd = new Date(new Date(oldest.window_start).getTime() + windowMs);
    const retryAfter = Math.max(0, Math.ceil((windowEnd - new Date()) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function recordRateLimit(regNumber, channel) {
  const cleanReg = regNumber.trim().toUpperCase();
  const now = new Date().toISOString();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

  try {
    const windowStart = new Date(Date.now() - windowMs).toISOString();
    const { data } = await supabase
      .from('otp_rate_limits')
      .select('id, request_count, window_start')
      .eq('registration_number', cleanReg)
      .eq('request_type', channel)
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      await supabase
        .from('otp_rate_limits')
        .update({ request_count: data.request_count + 1 })
        .eq('id', data.id);
    } else {
      await supabase.from('otp_rate_limits').insert([{
        registration_number: cleanReg,
        request_type: channel,
        request_count: 1,
        window_start: now
      }]);
    }
  } catch (e) {}

  const limits = getLocalData(RATE_LIMIT_KEY);
  const relevant = limits.find(l =>
    l.registration_number === cleanReg &&
    l.request_type === channel &&
    (now - new Date(l.window_start).getTime()) < windowMs
  );
  if (relevant) {
    relevant.request_count += 1;
  } else {
    limits.push({
      id: 'rl-' + Date.now(),
      registration_number: cleanReg,
      request_type: channel,
      request_count: 1,
      window_start: now
    });
  }
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const cleaned = limits.filter(l => new Date(l.window_start).getTime() > new Date(cutoff).getTime());
  saveLocalData(RATE_LIMIT_KEY, cleaned);
}

// =========================================================================
// OTP GENERATION & STORAGE
// =========================================================================

export async function createOTPVerification(regNumber, channel, destination, fullDestination) {
  const cleanReg = regNumber.trim().toUpperCase();

  const rateCheck = await checkRateLimit(cleanReg, channel);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: { message: 'Too many requests. Please wait before requesting another code.' },
      retryAfterSeconds: rateCheck.retryAfterSeconds
    };
  }

  const otp = generateSecureOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  try {
    const nowIso = new Date().toISOString();
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('registration_number', cleanReg)
      .eq('channel', channel)
      .lt('expires_at', nowIso)
      .eq('is_used', false);

    await supabase.from('otp_verifications').insert([{
      registration_number: cleanReg,
      channel,
      destination,
      destination_full: fullDestination,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: OTP_MAX_ATTEMPTS,
      is_used: false,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {}

  let storedCodes = getLocalData(OTP_STORAGE_KEY);
  storedCodes = storedCodes.filter(c =>
    !(c.registration_number === cleanReg && c.channel === channel && !c.is_used)
  );
  storedCodes.push({
    id: 'otp-' + Date.now(),
    registration_number: cleanReg,
    channel,
    destination,
    destination_full: fullDestination,
    otp_hash: otpHash,
    code: otp,
    expires_at: expiresAt,
    attempts: 0,
    max_attempts: OTP_MAX_ATTEMPTS,
    is_used: false,
    created_at: new Date().toISOString()
  });
  saveLocalData(OTP_STORAGE_KEY, storedCodes);

  await recordRateLimit(cleanReg, channel);

  console.info(`[NACOS OTP] Verification code for ${cleanReg} (${channel}): ${otp}`);

  return {
    success: true,
    code: otp,
    destination,
    maskedDestination: channel === 'email' ? maskEmail(fullDestination) : maskPhone(fullDestination),
    expiresAt,
    message: `A 6-digit verification code has been sent to your ${channel}.`
  };
}

// =========================================================================
// OTP VERIFICATION
// =========================================================================

export async function verifyOTP(regNumber, channel, submittedCode) {
  const cleanReg = regNumber.trim().toUpperCase();
  const cleanCode = (submittedCode || '').toString().replace(/\D/g, '').trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, error: { message: 'Please enter a valid 6-digit verification code.' } };
  }

  const nowIso = new Date().toISOString();
  const submittedHash = await hashOTP(cleanCode);
  let match = null;

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: activeList } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('registration_number', cleanReg)
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (activeList && activeList.length > 0) {
      match = activeList.find(r => r.otp_hash === submittedHash);

      if (match) {
        const expiryTime = match.expires_at ? new Date(match.expires_at).getTime() : 0;
        const isExpired = expiryTime > 0 && (Date.now() > expiryTime + 5 * 60 * 1000);

        if (isExpired) {
          return { success: false, error: { message: 'This verification code has expired. Please request a new code.' } };
        }

        // Mark match as verified & used
        await supabase
          .from('otp_verifications')
          .update({
            verified_at: nowIso,
            is_used: true
          })
          .eq('id', match.id);
      } else {
        const activeUnused = activeList.filter(c => !c.is_used);
        if (activeUnused.length > 0) {
          const latest = activeUnused[0];
          const newAttempts = (latest.attempts || 0) + 1;
          await supabase
            .from('otp_verifications')
            .update({
              attempts: newAttempts,
              is_used: newAttempts >= (latest.max_attempts || OTP_MAX_ATTEMPTS)
            })
            .eq('id', latest.id);

          if (newAttempts >= (latest.max_attempts || OTP_MAX_ATTEMPTS)) {
            return { success: false, error: { message: 'Too many verification attempts. Please request a new code.' } };
          }
          return { success: false, error: { message: 'Incorrect verification code. Please try again.' } };
        }
      }
    }
  } catch (e) {}

  if (!match) {
    const storedCodes = getLocalData(OTP_STORAGE_KEY);
    const activeStored = storedCodes.filter(c =>
      c.registration_number === cleanReg &&
      !c.is_used &&
      (new Date(c.expires_at).getTime() + 5 * 60 * 1000 >= Date.now())
    );

    match = activeStored.find(c => c.otp_hash === submittedHash);

    if (match) {
      match.is_used = true;
      match.verified_at = nowIso;
      saveLocalData(OTP_STORAGE_KEY, storedCodes);
    } else if (activeStored.length > 0) {
      const codeRecord = activeStored[0];
      codeRecord.attempts = (codeRecord.attempts || 0) + 1;
      if (codeRecord.attempts >= OTP_MAX_ATTEMPTS) {
        codeRecord.is_used = true;
      }
      saveLocalData(OTP_STORAGE_KEY, storedCodes);
      if (codeRecord.attempts >= OTP_MAX_ATTEMPTS) {
        return { success: false, error: { message: 'Too many verification attempts. Please request a new code.' } };
      }
      return { success: false, error: { message: 'Incorrect verification code. Please try again.' } };
    }
  }

  if (!match) {
    return { success: false, error: { message: 'Invalid or expired verification code. Please request a new code.' } };
  }

  const isExpired = new Date(match.expires_at) < new Date();
  if (isExpired) {
    return { success: false, error: { message: 'This verification code has expired. Please request a new code.' } };
  }

  const storedCodes = getLocalData(OTP_STORAGE_KEY);
  const localIdx = storedCodes.findIndex(c => c.id === match.id);
  if (localIdx !== -1) {
    storedCodes[localIdx].is_used = true;
    storedCodes[localIdx].verified_at = new Date().toISOString();
    storedCodes[localIdx].attempts = attempts;
    saveLocalData(OTP_STORAGE_KEY, storedCodes);
  }

  return { success: true, channel, destination: match.destination };
}

// =========================================================================
// VERIFICATION SESSION MANAGEMENT
// =========================================================================

export async function createVerificationSession(regNumber, channel, otpVerificationId, destination) {
  const cleanReg = regNumber.trim().toUpperCase();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const sessionData = {
    registration_number: cleanReg,
    session_token: token,
    otp_verification_id: otpVerificationId || null,
    verified_channel: channel,
    verified_destination: destination,
    is_consumed: false,
    expires_at: expiresAt
  };

  try {
    await supabase.from('verification_sessions').insert([sessionData]);
  } catch (e) {}

  let sessions = getLocalData(SESSION_STORAGE_KEY);
  sessions = sessions.filter(s =>
    !(s.registration_number === cleanReg && !s.is_consumed && new Date(s.expires_at) > new Date())
  );
  sessions.push({
    id: 'vs-' + Date.now(),
    ...sessionData,
    created_at: new Date().toISOString()
  });
  saveLocalData(SESSION_STORAGE_KEY, sessions);

  return { success: true, sessionToken: token, expiresAt };
}

export async function validateVerificationSession(sessionToken, regNumber) {
  if (!sessionToken || !regNumber) {
    return { valid: false, error: { message: 'Invalid verification session.' } };
  }

  const cleanReg = regNumber.trim().toUpperCase();

  let session = null;

  try {
    const { data } = await supabase
      .from('verification_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('registration_number', cleanReg)
      .eq('is_consumed', false)
      .maybeSingle();

    if (data) session = data;
  } catch (e) {}

  if (!session) {
    const sessions = getLocalData(SESSION_STORAGE_KEY);
    session = sessions.find(s =>
      s.session_token === sessionToken &&
      s.registration_number === cleanReg &&
      !s.is_consumed
    );
  }

  if (!session) {
    return { valid: false, error: { message: 'Verification session not found. Please restart the registration process.' } };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: { message: 'Verification session has expired. Please restart the registration process.' } };
  }

  if (session.is_consumed) {
    return { valid: false, error: { message: 'Verification session has already been used.' } };
  }

  return {
    valid: true,
    registrationNumber: session.registration_number,
    channel: session.verified_channel,
    destination: session.verified_destination
  };
}

export async function consumeVerificationSession(sessionToken, regNumber) {
  const validation = await validateVerificationSession(sessionToken, regNumber);
  if (!validation.valid) return validation;

  const cleanReg = regNumber.trim().toUpperCase();

  try {
    await supabase
      .from('verification_sessions')
      .update({ is_consumed: true })
      .eq('session_token', sessionToken)
      .eq('registration_number', cleanReg);
  } catch (e) {}

  let sessions = getLocalData(SESSION_STORAGE_KEY);
  const idx = sessions.findIndex(s => s.session_token === sessionToken);
  if (idx !== -1) {
    sessions[idx].is_consumed = true;
    saveLocalData(SESSION_STORAGE_KEY, sessions);
  }

  return { valid: true, ...validation };
}

// =========================================================================
// ACCOUNT RECOVERY REQUESTS
// =========================================================================

export async function submitAccountRecoveryRequest(regNumber, requestedEmail, requestedPhone, reason) {
  const cleanReg = regNumber.trim().toUpperCase();
  if (!reason || !reason.trim()) {
    return { success: false, error: { message: 'Please provide a reason for your recovery request.' } };
  }

  const existingRequests = await getRecoveryRequests(cleanReg);
  const pendingRequest = existingRequests.find(r => r.status === 'pending');
  if (pendingRequest) {
    return { success: false, error: { message: 'You already have a pending recovery request. Please wait for it to be reviewed.' } };
  }

  const request = {
    registration_number: cleanReg,
    full_name: '',
    requested_email: requestedEmail || '',
    requested_phone: requestedPhone || '',
    reason: reason.trim(),
    status: 'pending'
  };

  try {
    const { data: vsData } = await supabase
      .from('verified_students')
      .select('full_name')
      .eq('registration_number', cleanReg)
      .maybeSingle();
    if (vsData) request.full_name = vsData.full_name;
  } catch (e) {}

  try {
    await supabase.from('account_recovery_requests').insert([request]);
  } catch (e) {}

  const requests = getLocalData(RECOVERY_REQUESTS_KEY);
  requests.push({
    id: 'rec-' + Date.now(),
    ...request,
    created_at: new Date().toISOString()
  });
  saveLocalData(RECOVERY_REQUESTS_KEY, requests);

  return { success: true, message: 'Your recovery request has been submitted and will be reviewed by an administrator.' };
}

export async function getRecoveryRequests(regNumber) {
  const cleanReg = regNumber ? regNumber.trim().toUpperCase() : null;

  let data = null;
  try {
    let query = supabase.from('account_recovery_requests').select('*').order('created_at', { ascending: false });
    if (cleanReg) query = query.eq('registration_number', cleanReg);
    const result = await query;
    if (!result.error && result.data && result.data.length > 0) {
      data = result.data;
    }
  } catch (e) {}

  if (!data) {
    let requests = getLocalData(RECOVERY_REQUESTS_KEY);
    if (cleanReg) {
      requests = requests.filter(r => r.registration_number === cleanReg);
    }
    data = requests;
  }

  return data;
}

export async function reviewRecoveryRequest(requestId, status, reviewNotes, reviewedBy) {
  if (!['approved', 'rejected'].includes(status)) {
    return { success: false, error: { message: 'Invalid status.' } };
  }

  try {
    await supabase
      .from('account_recovery_requests')
      .update({
        status,
        review_notes: reviewNotes || '',
        reviewed_by: reviewedBy || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);
  } catch (e) {}

  const requests = getLocalData(RECOVERY_REQUESTS_KEY);
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    requests[idx].status = status;
    requests[idx].review_notes = reviewNotes || '';
    requests[idx].reviewed_by = reviewedBy;
    requests[idx].reviewed_at = new Date().toISOString();
    saveLocalData(RECOVERY_REQUESTS_KEY, requests);
  }

  return { success: true, message: `Recovery request ${status}.` };
}

// =========================================================================
// CLEANUP UTILITIES
// =========================================================================

export function cleanupExpiredOTPs() {
  let storedCodes = getLocalData(OTP_STORAGE_KEY);
  const now = new Date();
  storedCodes = storedCodes.filter(c => new Date(c.expires_at) > now || c.is_used);
  saveLocalData(OTP_STORAGE_KEY, storedCodes);
}

export function cleanupExpiredSessions() {
  let sessions = getLocalData(SESSION_STORAGE_KEY);
  const now = new Date();
  sessions = sessions.filter(s => new Date(s.expires_at) > now || s.is_consumed);
  saveLocalData(SESSION_STORAGE_KEY, sessions);
}
