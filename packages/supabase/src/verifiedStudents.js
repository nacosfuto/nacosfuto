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
  const stored = localStorage.getItem(VERIFIED_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse verified students storage', e);
    }
  }

  // Pre-seed with authoritative canonical departmental roster
  const seeded = [
    {
      id: 'vs-seed-20241450682',
      registration_number: '20241450682',
      surname: 'Anyanwu',
      first_name: 'Nestor',
      middle_name: 'Ifeanyi',
      last_name: 'Anyanwu',
      full_name: 'Anyanwu Nestor Ifeanyi',
      email: 'neorxpro@gmail.com',
      phone_number: '+234 814 506 8200',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '100 Level',
      admission_year: 2024,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2024/2025',
      status: 'active',
      has_registered: true,
      auth_user_id: 'student-seed-nestor-2024',
      registered_at: '2024-10-15T09:00:00Z',
      created_at: '2024-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20241429481',
      registration_number: '20241429481',
      full_name: 'Nestor Anyanwu',
      email: 'nestor.anyanwu@futo.edu.ng',
      phone_number: '+234 801 234 5678',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '100 Level',
      admission_year: 2024,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2024/2025',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2024-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20251545321',
      registration_number: '20251545321',
      full_name: 'Chioma Eze',
      email: 'chioma.eze@futo.edu.ng',
      phone_number: '+234 809 876 5432',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '100 Level',
      admission_year: 2025,
      programme: 'B.Sc Software Engineering',
      programme_duration: 4,
      academic_session: '2025/2026',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2025-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20261699999',
      registration_number: '20261699999',
      full_name: 'Emeka Okoro',
      email: 'emeka.okoro@futo.edu.ng',
      phone_number: '+234 812 345 6789',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '100 Level',
      admission_year: 2026,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2026/2027',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2026-08-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20221239481',
      registration_number: '20221239481',
      full_name: 'David Okonkwo',
      email: 'david.okonkwo@futo.edu.ng',
      phone_number: '+234 814 592 0184',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '300 Level',
      admission_year: 2022,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2024/2025',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2022-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20231384920',
      registration_number: '20231384920',
      full_name: 'Amarachi Blessing Nwosu',
      email: 'amarachi.nwosu@futo.edu.ng',
      phone_number: '+234 802 998 7711',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '200 Level',
      admission_year: 2023,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2024/2025',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2023-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20211248201',
      registration_number: '20211248201',
      full_name: 'Somtochukwu Michael Obi',
      email: 'somto.obi@futo.edu.ng',
      phone_number: '+234 806 332 1980',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '400 Level',
      admission_year: 2021,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2024/2025',
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: '2021-10-01T08:00:00Z'
    },
    {
      id: 'vs-seed-20201012948',
      registration_number: '20201012948',
      full_name: 'Emmanuel Irechukwu',
      first_name: 'Emmanuel',
      surname: 'Irechukwu',
      email: 'president.futo@nacos.org.ng',
      phone_number: '+234 803 112 3456',
      department: 'Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      level: '500 Level',
      admission_year: 2021,
      programme: 'B.Tech Computer Science',
      programme_duration: 5,
      academic_session: '2025/2026',
      status: 'active',
      has_registered: true,
      auth_user_id: 'student-seed-pres',
      registered_at: '2021-10-10T09:00:00Z',
      created_at: '2021-10-01T08:00:00Z'
    }
  ];

  // Auto-migrate legacy Chapter President (FUTO) in verified roster
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      let updated = false;
      const migrated = parsed.map(s => {
        if (s.registration_number === '20201012948' && (s.full_name?.includes('President') || s.name?.includes('President'))) {
          updated = true;
          return { ...s, full_name: 'Emmanuel Irechukwu', first_name: 'Emmanuel', surname: 'Irechukwu', admission_year: 2021, level: '500 Level' };
        }
        return s;
      });
      if (updated) {
        localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (e) {}
  }

  localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveLocalVerifiedStudents(list) {
  localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(list));
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
 * Get all verified students in the departmental roster
 */
export async function adminGetAllVerifiedStudents() {
  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('verified_students')
      .select('*')
      .order('registration_number', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  // 2. Fallback to local store
  return getLocalVerifiedStudents();
}

/**
 * Bulk import verified students from CSV/Excel data with duplicate pre-check
 */
export async function adminImportVerifiedStudents(rawRecords) {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return { error: { message: 'No student records provided for import.' } };
  }

  const existingRoster = getLocalVerifiedStudents();
  const existingMatricSet = new Set(existingRoster.map(s => s.registration_number.toUpperCase()));
  const existingEmailSet = new Set(existingRoster.map(s => s.email.toLowerCase()));

  const toInsert = [];
  const duplicates = [];
  const errors = [];
  const seenInBatchMatrics = new Set();
  const seenInBatchEmails = new Set();

  for (let i = 0; i < rawRecords.length; i++) {
    const row = rawRecords[i];
    const regNo = (row.registration_number || row.matricNumber || row['Reg No'] || row['Matric'] || '').toString().trim().toUpperCase();
    const fullName = (row.full_name || row.fullName || row['Full Name'] || row['Name'] || '').toString().trim();
    const email = (row.email || row['Email'] || row['Student Email'] || '').toString().trim().toLowerCase();

    if (!regNo || !fullName) {
      errors.push({ row: i + 1, message: `Row ${i + 1}: Missing required fields (Registration Number or Full Name)` });
      continue;
    }

    // Check duplicate matric within batch
    if (seenInBatchMatrics.has(regNo)) {
      duplicates.push({ regNo, email, reason: 'Duplicate registration number inside uploaded file' });
      continue;
    }
    seenInBatchMatrics.add(regNo);

    if (email) {
      if (seenInBatchEmails.has(email)) {
        duplicates.push({ regNo, email, reason: 'Duplicate email inside uploaded file' });
        continue;
      }
      seenInBatchEmails.add(email);
    }

    // Check duplicate in database
    if (existingMatricSet.has(regNo)) {
      duplicates.push({ regNo, email, reason: 'Already exists in departmental roster' });
      continue;
    }
    if (email && existingEmailSet.has(email)) {
      duplicates.push({ regNo, email, reason: 'Email already exists in departmental roster' });
      continue;
    }

    // Calculate level & admission year
    const parse = parseAdmissionYear(regNo, CURRENT_ACADEMIC_YEAR_START);
    const admissionYear = parse.valid ? parse.admissionYear : (parseInt(row.admission_year, 10) || CURRENT_ACADEMIC_YEAR_START);
    const duration = parseInt(row.programme_duration || row.duration, 10) || 5;
    const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);

    const record = {
      id: 'vs-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      registration_number: regNo,
      full_name: fullName,
      email: email,
      phone_number: (row.phone_number || row.phone || '').toString().trim(),
      department: (row.department || 'Computer Science').toString().trim(),
      faculty: (row.faculty || 'School of Information & Communication Tech (SICT)').toString().trim(),
      level: row.level || levelInfo.levelString,
      admission_year: admissionYear,
      programme: (row.programme || 'B.Tech Computer Science').toString().trim(),
      programme_duration: duration,
      academic_session: row.academic_session || getAcademicSession(CURRENT_ACADEMIC_YEAR_START),
      status: 'active',
      has_registered: false,
      auth_user_id: null,
      registered_at: null,
      created_at: new Date().toISOString()
    };

    toInsert.push(record);
  }

  // Save new records
  if (toInsert.length > 0) {
    const updatedRoster = [...existingRoster, ...toInsert];
    saveLocalVerifiedStudents(updatedRoster);

    // Try Supabase insert
    try {
      await supabase.from('verified_students').insert(toInsert);
    } catch (e) {
      console.warn('Supabase bulk insert fallback to local storage:', e);
    }
  }

  return {
    success: true,
    importedCount: toInsert.length,
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

  // 3. Sync with Supabase
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
 * Manually add an individual student to the verified roster
 */
export async function adminAddVerifiedStudent(studentData) {
  const {
    surname,
    firstName,
    middleName,
    fullName,
    matricNumber,
    email,
    phone,
    department,
    faculty,
    programme,
    programmeDuration
  } = studentData;

  const resolvedSurname = (surname || '').trim() || (fullName || '').trim().split(' ')[0] || '';
  const resolvedFirstName = (firstName || '').trim() || (fullName || '').trim().split(' ')[1] || '';
  const resolvedMiddleName = (middleName || '').trim() || (fullName || '').trim().split(' ').slice(2).join(' ') || '';
  const resolvedFullName = [resolvedSurname, resolvedFirstName, resolvedMiddleName].filter(Boolean).join(' ') || (fullName || '').trim();

  if (!resolvedFullName || !matricNumber?.trim() || !email?.trim()) {
    return { error: { message: 'Surname, first name, registration number, and email are required.' } };
  }

  const cleanReg = matricNumber.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  const roster = getLocalVerifiedStudents();
  if (roster.some(s => s.registration_number.toUpperCase() === cleanReg)) {
    return { error: { message: `Student with registration number "${cleanReg}" already exists in roster.` } };
  }

  if (roster.some(s => s.email.toLowerCase() === cleanEmail)) {
    return { error: { message: `Student with email "${cleanEmail}" already exists in roster.` } };
  }

  const parse = parseAdmissionYear(cleanReg, CURRENT_ACADEMIC_YEAR_START);
  const admissionYear = parse.valid ? parse.admissionYear : CURRENT_ACADEMIC_YEAR_START;
  const duration = parseInt(programmeDuration, 10) || 5;
  const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);

  const record = {
    id: 'vs-' + Date.now(),
    registration_number: cleanReg,
    surname: resolvedSurname,
    first_name: resolvedFirstName,
    middle_name: resolvedMiddleName,
    last_name: resolvedSurname,
    full_name: resolvedFullName,
    email: cleanEmail,
    phone_number: phone?.trim() || '',
    department: department || 'Computer Science',
    faculty: faculty || 'School of Information & Communication Tech (SICT)',
    level: levelInfo.levelString,
    admission_year: admissionYear,
    programme: programme || 'B.Tech Computer Science',
    programme_duration: duration,
    academic_session: getAcademicSession(CURRENT_ACADEMIC_YEAR_START),
    status: 'active',
    has_registered: false,
    auth_user_id: null,
    registered_at: null,
    created_at: new Date().toISOString()
  };

  roster.push(record);
  saveLocalVerifiedStudents(roster);

  try {
    await supabase.from('verified_students').insert([record]);
  } catch (e) {}

  return { success: true, data: record };
}

/**
 * Delete a student from the verified roster
 */
export async function adminDeleteVerifiedStudent(regNo) {
  const cleanReg = regNo.trim().toUpperCase();
  const roster = getLocalVerifiedStudents();
  const filtered = roster.filter(s => s.registration_number.toUpperCase() !== cleanReg);
  saveLocalVerifiedStudents(filtered);

  try {
    await supabase.from('verified_students').delete().eq('registration_number', cleanReg);
  } catch (e) {}

  return { success: true };
}
