import { supabase } from './client.js';
import { hashPassword, enrichStudentProfile, getLocalStudentsDatabase } from './auth.js';
import { 
  CURRENT_ACADEMIC_YEAR_START, 
  parseAdmissionYear, 
  calculateCurrentLevel, 
  calculateExpectedGraduation, 
  getAcademicSession,
  validateRegistrationNumberFormat 
} from '@nacos/config/academic';
import {
  createOTPVerification,
  verifyOTP,
  createVerificationSession,
  consumeVerificationSession,
  maskEmail as otpMaskEmail,
  maskPhone as otpMaskPhone,
  cleanupExpiredOTPs,
  submitAccountRecoveryRequest,
  getRecoveryRequests,
  reviewRecoveryRequest,
  checkRateLimit
} from './otpService.js';
import { sendVerificationEmail } from './emailService.js';
import { sendVerificationSMS } from './smsService.js';

const VERIFIED_STORAGE_KEY = 'nacos_verified_students_db';
const RESEND_COOLDOWN_KEY = 'nacos_resend_cooldown';

/**
 * Mask an email address for safe display in UI: e.g. "n***@futo.edu.ng"
 */
export function maskEmail(email) {
  return otpMaskEmail(email);
}

/**
 * Mask a phone number for safe display: e.g. "******5678"
 */
export function maskPhone(phone) {
  return otpMaskPhone(phone);
}

/**
 * Retrieve verified students roster from localStorage with initial pre-seeding
 */
export function getLocalVerifiedStudents() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VERIFIED_STORAGE_KEY) : null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Scrub out any legacy mock seed records (e.g. vs-seed-*)
        const cleaned = parsed.filter(s => !String(s.id || '').startsWith('vs-seed-'));
        if (cleaned.length !== parsed.length && typeof localStorage !== 'undefined') {
          localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch (e) {
      console.error('Failed to parse verified students storage', e);
    }
  }
  return [];
}

export function saveLocalVerifiedStudents(list) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(list));
  }
}

/**
 * Explicitly check if a student account already exists in profiles, local student DB, or verified roster.
 * Avoids showing generic errors when an account already exists.
 */
export async function checkIfStudentAccountExists(regNo, email) {
  const cleanReg = (regNo || '').trim().toUpperCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Check local students database
  try {
    const localStudents = getLocalStudentsDatabase();
    const localFound = localStudents.find(s => 
      (cleanReg && s.registration_number?.toUpperCase() === cleanReg) ||
      (cleanEmail && s.email?.toLowerCase() === cleanEmail)
    );
    if (localFound) {
      return {
        exists: true,
        message: 'User already exists. Please sign in or use forgot password.'
      };
    }
  } catch (e) {}

  // 2. Check Supabase profiles table
  try {
    if (cleanReg) {
      const { data: regProfile } = await supabase
        .from('profiles')
        .select('id, registration_number, email')
        .eq('registration_number', cleanReg)
        .maybeSingle();

      if (regProfile) {
        return {
          exists: true,
          message: 'User already exists. Please sign in or use forgot password.'
        };
      }
    }

    if (cleanEmail) {
      const { data: emailProfile } = await supabase
        .from('profiles')
        .select('id, registration_number, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (emailProfile) {
        return {
          exists: true,
          message: 'User already exists. Please sign in or use forgot password.'
        };
      }
    }
  } catch (e) {}

  // 3. Check verified_students has_registered status in Supabase
  try {
    if (cleanReg) {
      const { data: vsData } = await supabase
        .from('verified_students')
        .select('id, registration_number, has_registered, is_registered')
        .eq('registration_number', cleanReg)
        .maybeSingle();

      if (vsData && (vsData.has_registered || vsData.is_registered)) {
        return {
          exists: true,
          message: 'User already exists. Please sign in or use forgot password.'
        };
      }
    }
  } catch (e) {}

  // 4. Check local verified students roster
  try {
    const localVerified = getLocalVerifiedStudents();
    const verifiedRecord = localVerified.find(s => s.registration_number?.toUpperCase() === cleanReg);
    if (verifiedRecord && (verifiedRecord.has_registered || verifiedRecord.is_registered)) {
      return {
        exists: true,
        message: 'User already exists. Please sign in or use forgot password.'
      };
    }
  } catch (e) {}

  return { exists: false };
}

/**
 * Step 1: Find student record by registration number
 */
export async function lookupVerifiedStudentRecord(regNo) {
  if (!regNo || !regNo.trim()) {
    return { 
      found: false, 
      error: { message: 'Registration number is required.' } 
    };
  }

  const formatCheck = validateRegistrationNumberFormat(regNo.trim());
  if (!formatCheck.valid) {
    return {
      found: false,
      error: { message: formatCheck.error }
    };
  }

  const cleanReg = regNo.trim().toUpperCase();
  const GENERIC_ERROR = 'Unable to verify these details. Please check your information and try again.';

  // 1. Check if an account already exists in profiles
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, registration_number')
      .eq('registration_number', cleanReg)
      .maybeSingle();

    if (existingProfile) {
      return {
        found: false,
        error: { message: 'User already exists. Please sign in or reset your password.', code: 'ACCOUNT_EXISTS' }
      };
    }
  } catch (e) {}

  // Check local database for existing account
  try {
    const localDb = getLocalStudentsDatabase();
    if (localDb.some(s => s.registration_number?.toUpperCase() === cleanReg)) {
      return {
        found: false,
        error: { message: 'User already exists. Please sign in or reset your password.', code: 'ACCOUNT_EXISTS' }
      };
    }
  } catch (e) {}

  // 2. Try Supabase lookup in verified_students if connected
  try {
    const { data, error } = await supabase
      .from('verified_students')
      .select('*')
      .eq('registration_number', cleanReg)
      .maybeSingle();

    if (!error && data) {
      if (data.status && data.status !== 'active') {
        return { found: false, error: { message: 'This student record is currently inactive. Please contact the department.' } };
      }
      if (data.has_registered || data.is_registered) {
        return {
          found: false,
          error: { message: `An account for registration number "${cleanReg}" has already been registered. Please sign in or recover your account.`, code: 'ACCOUNT_EXISTS' }
        };
      }

      return {
        found: true,
        data: {
          ...data,
          masked_email: maskEmail(data.email),
          masked_phone: maskPhone(data.phone_number)
        },
        error: null
      };
    }
  } catch (err) {
    // Fallback to local store
  }

  // 3. Local store lookup
  const roster = getLocalVerifiedStudents();
  const record = roster.find(s => s.registration_number.toUpperCase() === cleanReg);

  if (!record) {
    return { found: false, error: { message: GENERIC_ERROR } };
  }

  if (record.status !== 'active') {
    return { found: false, error: { message: 'This student record is currently inactive. Please contact the department.' } };
  }

  if (record.has_registered || record.is_registered) {
    return {
      found: false,
      error: { message: `An account for registration number "${cleanReg}" has already been registered. Please sign in or recover your account.`, code: 'ACCOUNT_EXISTS' }
    };
  }

  return {
    found: true,
    data: {
      ...record,
      masked_email: maskEmail(record.email),
      masked_phone: maskPhone(record.phone_number)
    },
    error: null
  };
}

/**
 * Step 2: Validate contact information and start OTP verification
 * The submitted email/phone must match the student record exactly
 */
export async function startRegistrationVerification(regNo, submittedEmail, submittedPhone, channel) {
  const GENERIC_ERROR = 'Unable to verify these details. Please check your information and try again.';

  // 1. Validate input
  if (!submittedEmail?.trim() && !submittedPhone?.trim()) {
    return { success: false, error: { message: 'Please provide an email address or phone number.' } };
  }

  if (channel !== 'email' && channel !== 'phone') {
    return { success: false, error: { message: 'Invalid verification method.' } };
  }

  // 2. Find student record
  const lookup = await lookupVerifiedStudentRecord(regNo);
  if (!lookup.found) {
    return { success: false, error: lookup.error };
  }

  const student = lookup.data;
  const cleanReg = regNo.trim().toUpperCase();

  // 3. Verify contact information matches the student record exactly
  if (channel === 'email') {
    const cleanEmail = submittedEmail.trim().toLowerCase();
    const recordEmail = (student.email || '').trim().toLowerCase();
    
    if (!cleanEmail) {
      return { success: false, error: { message: 'Please enter your email address.' } };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: { message: 'Please enter a valid email address.' } };
    }

    if (cleanEmail !== recordEmail) {
      return { success: false, error: { message: GENERIC_ERROR } };
    }

    // 4. Check rate limit
    const rateCheck = await checkRateLimit(cleanReg, 'email');
    if (!rateCheck.allowed) {
      return { success: false, error: { message: 'Please wait before requesting another code.' }, retryAfterSeconds: rateCheck.retryAfterSeconds };
    }

    // 5. Generate OTP and store hashed
    const otpResult = await createOTPVerification(cleanReg, 'email', student.masked_email, cleanEmail);
    if (!otpResult.success) {
      return { success: false, error: otpResult.error };
    }

    // 6. Send OTP via email
    const emailResult = await sendVerificationEmail(cleanEmail, otpResult.code, student.full_name, cleanReg);
    if (!emailResult.success) {
      return {
        success: false,
        error: { message: emailResult.error || "We couldn't send your verification code right now. Please try again later." },
        retryAfterSeconds: emailResult.retryAfterSeconds
      };
    }

    // 7. Set cooldown
    setResendCooldownTimestamp(cleanReg, 'email');

    return {
      success: true,
      channel: 'email',
      maskedDestination: student.masked_email,
      expiresAt: otpResult.expiresAt
    };
  }

  if (channel === 'phone') {
    const cleanPhone = submittedPhone.trim().replace(/[\s\-()]/g, '');
    const recordPhone = (student.phone_number || '').trim().replace(/[\s\-()]/g, '');
    
    if (!cleanPhone) {
      return { success: false, error: { message: 'Please enter your phone number.' } };
    }

    if (cleanPhone.length < 10) {
      return { success: false, error: { message: 'Please enter a valid phone number.' } };
    }

    // Normalize phone numbers for comparison
    const normalizeForCompare = (p) => p.replace(/\D/g, '').slice(-10);
    if (normalizeForCompare(cleanPhone) !== normalizeForCompare(recordPhone)) {
      return { success: false, error: { message: GENERIC_ERROR } };
    }

    const rateCheck = await checkRateLimit(cleanReg, 'phone');
    if (!rateCheck.allowed) {
      return { success: false, error: { message: 'Please wait before requesting another code.' }, retryAfterSeconds: rateCheck.retryAfterSeconds };
    }

    const otpResult = await createOTPVerification(cleanReg, 'phone', student.masked_phone, cleanPhone);
    if (!otpResult.success) {
      return { success: false, error: otpResult.error };
    }

    const smsResult = await sendVerificationSMS(cleanPhone, otpResult.code);
    if (!smsResult.success) {
      return { success: false, error: { message: "We couldn't send your verification code right now. Please try again later." } };
    }

    setResendCooldownTimestamp(cleanReg, 'phone');

    return {
      success: true,
      channel: 'phone',
      maskedDestination: student.masked_phone,
      expiresAt: otpResult.expiresAt
    };
  }

  return { success: false, error: { message: 'Invalid verification method.' } };
}

/**
 * Resend OTP for registration
 */
export async function resendRegistrationOTP(regNo, channel) {
  const GENERIC_ERROR = 'Unable to verify these details. Please check your information and try again.';

  // Check cooldown
  const cleanReg = regNo.trim().toUpperCase();
  const cooldownKey = `${RESEND_COOLDOWN_KEY}_${cleanReg}_${channel}`;
  const cooldownExpiry = localStorage.getItem(cooldownKey);
  if (cooldownExpiry && new Date(cooldownExpiry) > new Date()) {
    const remaining = Math.ceil((new Date(cooldownExpiry) - new Date()) / 1000);
    return { success: false, error: { message: 'Please wait before requesting another code.' }, retryAfterSeconds: remaining };
  }

  // Find student record to get contact info
  const lookup = await lookupVerifiedStudentRecord(regNo);
  if (!lookup.found) {
    return { success: false, error: lookup.error };
  }

  const student = lookup.data;
  const fullDestination = channel === 'email' ? (student.email || '').trim().toLowerCase() : (student.phone_number || '').trim();

  const rateCheck = await checkRateLimit(cleanReg, channel);
  if (!rateCheck.allowed) {
    return { success: false, error: { message: 'Please wait before requesting another code.' }, retryAfterSeconds: rateCheck.retryAfterSeconds };
  }

  const otpResult = await createOTPVerification(cleanReg, channel, channel === 'email' ? student.masked_email : student.masked_phone, fullDestination);
  if (!otpResult.success) {
    return { success: false, error: otpResult.error };
  }

  if (channel === 'email') {
    const emailResult = await sendVerificationEmail(fullDestination, otpResult.code, student.full_name, cleanReg);
    if (!emailResult.success) {
      return {
        success: false,
        error: { message: emailResult.error || "We couldn't send your verification code right now. Please try again later." },
        retryAfterSeconds: emailResult.retryAfterSeconds
      };
    }
  } else {
    const smsResult = await sendVerificationSMS(fullDestination, otpResult.code);
    if (!smsResult.success) {
      return { success: false, error: { message: "We couldn't send your verification code right now. Please try again later." } };
    }
  }

  setResendCooldownTimestamp(cleanReg, channel);

  return {
    success: true,
    channel,
    maskedDestination: channel === 'email' ? student.masked_email : student.masked_phone,
    expiresAt: otpResult.expiresAt
  };
}

/**
 * Verify OTP code and create a verification session
 */
export async function verifyRegistrationOTP(regNo, channel, code) {
  if (!code || code.trim().length !== 6) {
    return { success: false, error: { message: 'Please enter a valid 6-digit verification code.' } };
  }

  const result = await verifyOTP(regNo, channel, code);
  if (!result.success) {
    return result;
  }

  const sessionResult = await createVerificationSession(
    regNo,
    channel,
    null,
    result.destination
  );

  if (!sessionResult.success) {
    return { success: false, error: { message: 'Failed to create verification session. Please try again.' } };
  }

  return {
    success: true,
    sessionToken: sessionResult.sessionToken,
    channel
  };
}

/**
 * Complete registration with verified session
 */
export async function completeSecureRegistration(sessionToken, regNo, password, fullName) {
  const GENERIC_ERROR = 'Unable to verify these details. Please check your information and try again.';

  // 1. Validate session
  const sessionValidation = await consumeVerificationSession(sessionToken, regNo);
  if (!sessionValidation.valid) {
    return { data: null, error: sessionValidation.error };
  }

  // 2. Validate password
  if (!password || password.length < 6) {
    return { data: null, error: { message: 'Password must be at least 6 characters long.' } };
  }

  if (password.length > 128) {
    return { data: null, error: { message: 'Password must not exceed 128 characters.' } };
  }

  // 3. Fetch authoritative student record
  const cleanReg = regNo.trim().toUpperCase();
  let verifiedRecord = null;

  try {
    const { data } = await supabase
      .from('verified_students')
      .select('*')
      .eq('registration_number', cleanReg)
      .maybeSingle();
    if (data) verifiedRecord = data;
  } catch (e) {}

  if (!verifiedRecord) {
    const roster = getLocalVerifiedStudents();
    verifiedRecord = roster.find(s => s.registration_number.toUpperCase() === cleanReg);
  }

  if (!verifiedRecord) {
    return { data: null, error: { message: GENERIC_ERROR } };
  }

  if (verifiedRecord.has_registered || verifiedRecord.is_registered) {
    return { data: null, error: { message: 'An account has already been registered for this student. Please sign in or recover your account.' } };
  }

  if (verifiedRecord.status && verifiedRecord.status !== 'active') {
    return { data: null, error: { message: GENERIC_ERROR } };
  }

  // 4. Use the full name from the verified record (don't allow custom override for security)
  const resolvedFullName = (verifiedRecord.full_name || '').trim();
  const studentEmail = (verifiedRecord.email || '').trim().toLowerCase();
  const studentPhone = (verifiedRecord.phone_number || '').trim();

  // 5. Hash password
  const passwordHash = await hashPassword(password);

  // 6. Create new student auth profile
  const userId = 'student-auth-' + Date.now();
  const newProfile = {
    id: userId,
    registration_number: verifiedRecord.registration_number,
    full_name: resolvedFullName,
    first_name: verifiedRecord.full_name?.split(' ')[0] || '',
    middle_name: verifiedRecord.full_name?.split(' ').slice(1, -1).join(' ') || '',
    last_name: verifiedRecord.full_name?.split(' ').slice(-1)[0] || '',
    email: studentEmail,
    phone_number: studentPhone,
    admission_year: verifiedRecord.admission_year,
    programme: verifiedRecord.programme,
    department: verifiedRecord.department,
    faculty: verifiedRecord.faculty,
    programme_duration: verifiedRecord.programme_duration || 5,
    password_hash: passwordHash,
    role: 'Student Member',
    is_active: true,
    institution: 'Federal University of Technology, Owerri (FUTO)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 7. Add to local student accounts store
  const allAccounts = getLocalStudentsDatabase();
  const filteredAccounts = allAccounts.filter(a => a.registration_number.toUpperCase() !== cleanReg);
  filteredAccounts.push(newProfile);
  localStorage.setItem('nacos_students_db', JSON.stringify(filteredAccounts));

  // 8. Update verified_students table
  const roster = getLocalVerifiedStudents();
  const index = roster.findIndex(s => s.registration_number.toUpperCase() === cleanReg);
  if (index !== -1) {
    roster[index] = {
      ...roster[index],
      full_name: resolvedFullName,
      email: studentEmail,
      phone_number: studentPhone,
      has_registered: true,
      registered_at: new Date().toISOString(),
      auth_user_id: userId,
      updated_at: new Date().toISOString()
    };
    saveLocalVerifiedStudents(roster);
  }

  // 9. Sync to Supabase if available
  try {
    await supabase.from('verified_students').update({
      full_name: resolvedFullName,
      email: studentEmail,
      phone_number: studentPhone,
      has_registered: true,
      registered_at: new Date().toISOString(),
      auth_user_id: userId
    }).eq('registration_number', cleanReg);

    await supabase.from('profiles').upsert([{
      id: userId,
      registration_number: verifiedRecord.registration_number,
      full_name: resolvedFullName,
      email: studentEmail,
      phone_number: studentPhone,
      admission_year: verifiedRecord.admission_year,
      programme: verifiedRecord.programme,
      department: verifiedRecord.department,
      faculty: verifiedRecord.faculty,
      programme_duration: verifiedRecord.programme_duration,
      role: 'Student Member',
      is_active: true
    }]);
  } catch (e) {
    // Local fallback maintained
  }

  // 10. Enrich profile and log in
  const enriched = enrichStudentProfile(newProfile);
  localStorage.setItem('nacos_user', JSON.stringify(enriched));

  return { data: { user: enriched }, error: null };
}

// =========================================================================
// RESEND COOLDOWN HELPERS
// =========================================================================

function setResendCooldownTimestamp(regNumber, channel) {
  const key = `${RESEND_COOLDOWN_KEY}_${regNumber.trim().toUpperCase()}_${channel}`;
  const expiry = new Date(Date.now() + 60 * 1000).toISOString();
  localStorage.setItem(key, expiry);
}

export function getResendCooldownSeconds(regNumber, channel) {
  const key = `${RESEND_COOLDOWN_KEY}_${regNumber.trim().toUpperCase()}_${channel}`;
  const expiry = localStorage.getItem(key);
  if (!expiry) return 0;
  const remaining = Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 1000));
  return remaining;
}

// =========================================================================
// ACCOUNT RECOVERY (exported from otpService.js via index.js)
// =========================================================================

// =========================================================================
// CLEANUP
// =========================================================================

export function cleanupExpiredData() {
  cleanupExpiredOTPs();
}

// =========================================================================
// ADMIN ROSTER MANAGEMENT SERVICES
// =========================================================================

/**
 * Helper to sync roster store to Supabase id_card_settings
 */
export async function syncRosterStoreToSupabase(rosterList) {
  if (!supabase) return;
  try {
    await supabase.from('id_card_settings').upsert({
      id: 'store_verified_roster',
      payload: { roster: rosterList },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('Sync roster store error:', e);
  }
}

/**
 * Get all verified students in the departmental roster
 */
export async function adminGetAllVerifiedStudents() {
  try {
    if (supabase) {
      const [vsRes, idSettingsRes, profsRes] = await Promise.all([
        supabase.from('verified_students').select('*').order('registration_number', { ascending: true }),
        supabase.from('id_card_settings').select('payload').eq('id', 'store_verified_roster').maybeSingle(),
        supabase.from('profiles').select('registration_number, id, full_name, email')
      ]);

      const map = new Map();
      if (Array.isArray(vsRes.data)) {
        vsRes.data.forEach(s => {
          if (s.registration_number) {
            map.set(s.registration_number.toUpperCase(), { ...s });
          }
        });
      }

      if (idSettingsRes.data?.payload?.roster && Array.isArray(idSettingsRes.data.payload.roster)) {
        idSettingsRes.data.payload.roster.forEach(s => {
          const reg = s.registration_number?.toUpperCase();
          if (reg && !map.has(reg)) {
            map.set(reg, { ...s });
          }
        });
      }

      const registeredRegs = new Set(
        (Array.isArray(profsRes.data) ? profsRes.data : [])
          .map(p => p.registration_number?.toUpperCase())
          .filter(Boolean)
      );

      const merged = Array.from(map.values()).map(s => {
        const isReg = registeredRegs.has(s.registration_number?.toUpperCase()) || Boolean(s.has_registered || s.is_registered);
        return {
          ...s,
          has_registered: isReg,
          is_registered: isReg
        };
      });

      merged.sort((a, b) => (a.registration_number || '').localeCompare(b.registration_number || ''));

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (e) {
    console.warn('adminGetAllVerifiedStudents database notice:', e);
  }

  // Fallback to cache without mock injection
  const cached = getLocalVerifiedStudents();
  return Array.isArray(cached) ? cached : [];
}

/**
 * Bulk import verified students from CSV/Excel data with duplicate pre-check
 * EMAIL IS OPTIONAL: email is stored if provided, but records without email are 100% valid.
 */
export async function adminImportVerifiedStudents(rawRecords, options = { mode: 'add_only', onProgress: null }) {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return { error: { message: 'No student records provided for import.' } };
  }

  const isUpdateMode = options.mode === 'update';
  const existingRoster = await adminGetAllVerifiedStudents();
  const existingMatricMap = new Map();
  const existingEmailMap = new Map();

  existingRoster.forEach(s => {
    if (s.registration_number) {
      existingMatricMap.set(s.registration_number.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase(), s);
    }
    if (s.email && typeof s.email === 'string' && s.email.trim().length > 0) {
      existingEmailMap.set(s.email.trim().toLowerCase(), s.registration_number);
    }
  });

  const toInsert = [];
  const toUpdate = [];
  const duplicates = [];
  const errors = [];
  const seenInBatchMatrics = new Set();
  const seenInBatchEmails = new Set();

  for (let i = 0; i < rawRecords.length; i++) {
    const row = rawRecords[i];
    const rowNumber = row.csv_row_number || (i + 1);

    // Extract registration number
    const regNoRaw = (row.registration_number || row.matricNumber || row.matric_number || row['Registration Number'] || row['Matric Number'] || row['Reg No'] || row['Matric'] || '').toString().trim();
    if (!regNoRaw) {
      errors.push({ row: rowNumber, regNo: null, field: 'registration_number', message: 'Registration number is required' });
      continue;
    }

    const regNo = regNoRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Extract Names (First & Last name required, Middle name optional)
    let firstName = (row.first_name || row.firstName || '').toString().trim();
    let middleName = (row.middle_name || row.middleName || '').toString().trim();
    let lastName = (row.last_name || row.lastName || row.surname || row.Surname || '').toString().trim();
    let fullName = (row.full_name || row.fullName || row['Full Name'] || row['Name'] || '').toString().trim();

    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        if (!lastName) lastName = parts[0];
        if (!firstName) firstName = parts[1];
        if (!middleName && parts.length > 2) middleName = parts.slice(2).join(' ');
      } else if (parts.length === 1) {
        if (!lastName) lastName = parts[0];
        if (!firstName) firstName = parts[0];
      }
    }

    if (!lastName) {
      errors.push({ row: rowNumber, regNo, field: 'last_name', message: 'Last name is missing' });
      continue;
    }
    if (!firstName) {
      errors.push({ row: rowNumber, regNo, field: 'first_name', message: 'First name is missing' });
      continue;
    }

    if (!fullName) {
      fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');
    }

    // Extract Email (OPTIONAL)
    const rawEmail = (row.email || row.Email || row['Student Email'] || '').toString().trim();
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    // Extract Level & normalize
    let levelStr = row.level || '';
    if (!levelStr || levelStr === '100 Level' && !row.level) {
      const parse = parseAdmissionYear(regNo, CURRENT_ACADEMIC_YEAR_START);
      const admissionYear = parse.valid ? parse.admissionYear : (parseInt(row.admission_year, 10) || CURRENT_ACADEMIC_YEAR_START);
      const duration = parseInt(row.programme_duration || row.duration, 10) || 5;
      const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);
      levelStr = levelInfo.levelString;
    }

    // Check duplicate matric within batch
    if (seenInBatchMatrics.has(regNo)) {
      duplicates.push({ row: rowNumber, regNo, reason: 'Duplicate registration number inside uploaded file' });
      continue;
    }
    seenInBatchMatrics.add(regNo);

    // Check duplicate email within batch (ONLY if non-empty!)
    if (email) {
      if (seenInBatchEmails.has(email)) {
        duplicates.push({ row: rowNumber, regNo, email, reason: 'Duplicate email inside uploaded file' });
        continue;
      }
      seenInBatchEmails.add(email);
    }

    // Check duplicate in database
    const existingStudent = existingMatricMap.get(regNo);
    if (existingStudent) {
      if (!isUpdateMode) {
        duplicates.push({ row: rowNumber, regNo, fullName: existingStudent.full_name || fullName, reason: 'Already exists in departmental roster' });
        continue;
      }
    }

    // Check if email belongs to someone else in database
    if (email && existingEmailMap.has(email)) {
      const owner = existingEmailMap.get(email);
      if (owner !== regNo) {
        duplicates.push({ row: rowNumber, regNo, email, reason: `Email already assigned to student ${owner} in database` });
        continue;
      }
    }

    // Calculate level & admission year
    const parse = parseAdmissionYear(regNo, CURRENT_ACADEMIC_YEAR_START);
    const admissionYear = parse.valid ? parse.admissionYear : (parseInt(row.admission_year, 10) || CURRENT_ACADEMIC_YEAR_START);
    const duration = parseInt(row.programme_duration || row.duration, 10) || 5;

    // In update mode, keep existing non-empty contact info if CSV is empty
    let finalEmail = email;
    let finalPhone = (row.phone_number || row.phone || row.Phone || '').toString().trim();
    if (existingStudent) {
      if (!finalEmail && existingStudent.email) {
        finalEmail = existingStudent.email;
      }
      if (!finalPhone && existingStudent.phone_number) {
        finalPhone = existingStudent.phone_number;
      }
    }

    const record = {
      id: existingStudent?.id || ('vs-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)),
      registration_number: regNo,
      full_name: fullName,
      first_name: firstName,
      middle_name: middleName || '',
      last_name: lastName,
      surname: lastName,
      email: finalEmail || null,
      phone_number: finalPhone || '',
      department: (row.department || existingStudent?.department || 'Computer Science').toString().trim(),
      faculty: (row.faculty || existingStudent?.faculty || 'School of Information & Communication Tech (SICT)').toString().trim(),
      level: levelStr,
      admission_year: admissionYear,
      programme: (row.programme || existingStudent?.programme || 'B.Tech Computer Science').toString().trim(),
      programme_duration: duration,
      academic_session: row.academic_session || existingStudent?.academic_session || getAcademicSession(CURRENT_ACADEMIC_YEAR_START),
      status: existingStudent?.status || 'active',
      has_registered: existingStudent?.has_registered || false,
      auth_user_id: existingStudent?.auth_user_id || null,
      registered_at: existingStudent?.registered_at || null,
      created_at: existingStudent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingStudent) {
      toUpdate.push(record);
    } else {
      toInsert.push(record);
    }
  }

  const allProcessed = [...toInsert, ...toUpdate];

  // Save new and updated records
  if (allProcessed.length > 0) {
    if (typeof options.onProgress === 'function') {
      options.onProgress(`Synchronizing ${allProcessed.length} records to database...`);
    }

    // Merge into local cache
    const existingFiltered = existingRoster.filter(s => {
      const reg = s.registration_number?.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return !allProcessed.some(p => p.registration_number === reg);
    });
    const updatedRoster = [...existingFiltered, ...allProcessed];
    saveLocalVerifiedStudents(updatedRoster);
    await syncRosterStoreToSupabase(updatedRoster);

    // 1. Direct Supabase verified_students batch upsert in chunks of 50
    if (supabase) {
      try {
        const vsRows = allProcessed.map(s => ({
          registration_number: s.registration_number,
          full_name: s.full_name,
          first_name: s.first_name,
          middle_name: s.middle_name,
          last_name: s.last_name,
          surname: s.surname,
          email: s.email, // Can be null
          phone_number: s.phone_number,
          department: s.department,
          faculty: s.faculty,
          level: s.level,
          admission_year: s.admission_year,
          programme: s.programme,
          programme_duration: s.programme_duration,
          academic_session: s.academic_session,
          status: s.status,
          has_registered: s.has_registered
        }));

        for (let c = 0; c < vsRows.length; c += 50) {
          const chunk = vsRows.slice(c, c + 50);
          await supabase.from('verified_students').upsert(chunk, { onConflict: 'registration_number' });
        }
      } catch (err) {
        console.warn('Batch upsert into verified_students table error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_verified_students_updated'));
    }
  }

  return {
    success: true,
    importedCount: toInsert.length,
    updatedCount: toUpdate.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    duplicates,
    errors
  };
}

/**
 * Reset student registration: unlinks auth account and marks has_registered = false
 * allows student to re-verify or re-register cleanly
 */
export async function adminResetVerifiedStudentRegistration(regNo) {
  if (!regNo) return { error: { message: 'Registration number is required.' } };
  const cleanReg = regNo.trim().toUpperCase();

  const roster = getLocalVerifiedStudents();
  const index = roster.findIndex(s => s.registration_number.toUpperCase() === cleanReg);

  if (index === -1) {
    return { error: { message: 'Student not found in verified roster.' } };
  }

  // 1. Reset verified roster record
  roster[index] = {
    ...roster[index],
    has_registered: false,
    auth_user_id: null,
    registered_at: null,
    updated_at: new Date().toISOString()
  };
  saveLocalVerifiedStudents(roster);

  // 2. Remove from active student accounts database if present
  const accounts = getLocalStudentsDatabase();
  const updatedAccounts = accounts.filter(a => a.registration_number.toUpperCase() !== cleanReg);
  localStorage.setItem('nacos_students_db', JSON.stringify(updatedAccounts));

  // 3. Sync with Supabase (reset verified_students and delete profile row)
  try {
    await supabase
      .from('verified_students')
      .update({
        has_registered: false,
        auth_user_id: null,
        registered_at: null
      })
      .eq('registration_number', cleanReg);
  } catch (e) {}

  try {
    await supabase
      .from('profiles')
      .delete()
      .eq('registration_number', cleanReg);
  } catch (e) {}

  return { success: true, message: `Registration for ${cleanReg} has been reset. The student can now re-register.` };
}

/**
 * Toggle student active/inactive status in verified roster
 */
export async function adminToggleVerifiedStudentStatus(regNo) {
  if (!regNo) return { error: { message: 'Registration number is required.' } };
  const cleanReg = regNo.trim().toUpperCase();

  const roster = getLocalVerifiedStudents();
  const index = roster.findIndex(s => s.registration_number.toUpperCase() === cleanReg);

  if (index === -1) {
    return { error: { message: 'Student not found in verified roster.' } };
  }

  const newStatus = roster[index].status === 'active' ? 'inactive' : 'active';
  roster[index].status = newStatus;
  roster[index].updated_at = new Date().toISOString();
  saveLocalVerifiedStudents(roster);
  await syncRosterStoreToSupabase(roster);

  // Sync with Supabase
  try {
    await supabase
      .from('verified_students')
      .update({ status: newStatus })
      .eq('registration_number', cleanReg);
  } catch (e) {}

  return { success: true, status: newStatus };
}

/**
 * Manually add an individual student to the verified roster (authoritative student registry)
 * NOTE: This ONLY touches verified_students and does NOT create a portal user or profiles record.
 */
export async function adminAddVerifiedStudent(studentData) {
  const cleanReg = (
    studentData.registration_number || 
    studentData.matricNumber || 
    studentData.matric_number || 
    studentData.regNumber || 
    studentData.reg_no || ''
  ).toString().trim().toUpperCase();

  if (!cleanReg) {
    return { error: { message: 'Registration number is required.' } };
  }

  const cleanEmail = studentData.email ? studentData.email.toString().trim().toLowerCase() : null;

  const resolvedSurname = (
    studentData.last_name || 
    studentData.lastName || 
    studentData.surname || ''
  ).trim() || (studentData.full_name || studentData.fullName || '').trim().split(' ')[0] || '';

  const resolvedFirstName = (
    studentData.first_name || 
    studentData.firstName || ''
  ).trim() || (studentData.full_name || studentData.fullName || '').trim().split(' ')[1] || '';

  const resolvedMiddleName = (
    studentData.middle_name || 
    studentData.middleName || ''
  ).trim() || (studentData.full_name || studentData.fullName || '').trim().split(' ').slice(2).join(' ') || '';

  const resolvedFullName = (
    studentData.full_name || 
    studentData.fullName || 
    [resolvedSurname, resolvedFirstName, resolvedMiddleName].filter(Boolean).join(' ')
  ).trim();

  if (!resolvedFullName) {
    return { error: { message: 'Student full name is required.' } };
  }

  const department = studentData.department || 'Computer Science';
  const faculty = studentData.faculty || 'Physical Sciences';
  const programme = studentData.programme || 'Undergraduate';
  const programmeDuration = studentData.programmeDuration || studentData.programme_duration || 5;

  const parse = parseAdmissionYear(cleanReg, CURRENT_ACADEMIC_YEAR_START);
  const admissionYear = parse.valid ? parse.admissionYear : CURRENT_ACADEMIC_YEAR_START;
  const duration = parseInt(programmeDuration, 10) || 5;
  const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);
  const resolvedLevel = studentData.level || levelInfo.levelString;

  // Check if student already exists in verified_students to preserve registration state
  let existingStudent = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('verified_students')
        .select('*')
        .eq('registration_number', cleanReg)
        .maybeSingle();
      if (data) existingStudent = data;
    } catch (e) {}
  }
  if (!existingStudent) {
    const localRoster = getLocalVerifiedStudents();
    existingStudent = localRoster.find(s => s.registration_number?.toUpperCase() === cleanReg);
  }

  const record = {
    id: existingStudent?.id || ('vs-' + Date.now()),
    registration_number: cleanReg,
    surname: resolvedSurname,
    first_name: resolvedFirstName,
    middle_name: resolvedMiddleName,
    last_name: resolvedSurname,
    full_name: resolvedFullName,
    email: cleanEmail || existingStudent?.email || null,
    phone_number: (studentData.phone || studentData.phone_number || existingStudent?.phone_number || '').trim(),
    department,
    faculty,
    level: resolvedLevel,
    admission_year: admissionYear,
    programme: programme || 'B.Tech Computer Science',
    programme_duration: duration,
    academic_session: getAcademicSession(CURRENT_ACADEMIC_YEAR_START),
    status: existingStudent?.status || 'active',
    has_registered: existingStudent?.has_registered || false,
    is_registered: existingStudent?.is_registered || false,
    auth_user_id: existingStudent?.auth_user_id || null,
    registered_at: existingStudent?.registered_at || null,
    created_at: existingStudent?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update local cache
  const roster = await adminGetAllVerifiedStudents();
  const existingIdx = roster.findIndex(s => s.registration_number?.toUpperCase() === cleanReg);
  if (existingIdx !== -1) {
    roster[existingIdx] = { ...roster[existingIdx], ...record };
  } else {
    roster.push(record);
  }
  saveLocalVerifiedStudents(roster);
  await syncRosterStoreToSupabase(roster);

  // Live sync ONLY to verified_students table in Supabase
  if (supabase) {
    try {
      await supabase.from('verified_students').upsert({
        registration_number: cleanReg,
        full_name: resolvedFullName,
        surname: resolvedSurname,
        first_name: resolvedFirstName,
        middle_name: resolvedMiddleName,
        last_name: resolvedSurname,
        email: record.email,
        phone_number: record.phone_number,
        masked_email: record.email ? maskEmail(record.email) : null,
        masked_phone: record.phone_number ? maskPhone(record.phone_number) : null,
        department: record.department,
        faculty: record.faculty,
        level: record.level,
        admission_year: admissionYear,
        programme: record.programme,
        programme_duration: duration,
        academic_session: record.academic_session,
        status: record.status,
        has_registered: record.has_registered,
        is_registered: record.is_registered,
        registered_at: record.registered_at,
        auth_user_id: record.auth_user_id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'registration_number' });
    } catch (e) {
      console.warn('Supabase adminAddVerifiedStudent error:', e);
    }
  }

  return { success: true, data: record };
}

/**
 * Delete a student from the verified roster
 */
export async function adminDeleteVerifiedStudent(regNo) {
  const cleanReg = regNo.trim().toUpperCase();
  const roster = await adminGetAllVerifiedStudents();
  const filtered = roster.filter(s => (s.registration_number || '').toUpperCase() !== cleanReg);
  saveLocalVerifiedStudents(filtered);
  await syncRosterStoreToSupabase(filtered);

  try {
    await supabase.from('verified_students').delete().eq('registration_number', cleanReg);
    await supabase.from('profiles').delete().eq('registration_number', cleanReg);
  } catch (e) {}

  return { success: true };
}

export const adminCreateVerifiedStudent = adminAddVerifiedStudent;
