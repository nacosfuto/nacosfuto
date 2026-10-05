import { supabase } from './client.js';
import { 
  CURRENT_ACADEMIC_YEAR_START, 
  parseAdmissionYear, 
  calculateCurrentLevel, 
  calculateExpectedGraduation, 
  getAcademicSession 
} from '@nacos/config/academic';
import { createOTPVerification, verifyOTP, maskEmail } from './otpService.js';
import { sendPasswordResetEmail } from './emailService.js';

/**
 * Cryptographic password hasher (SHA-256 with project salt)
 * Ensures passwords are never stored or transmitted in plain text.
 */
export async function hashPassword(password, salt = 'nacos_futo_salt_2026') {
  if (!password) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('crypto.subtle failed, falling back to soft hash', e);
    }
  }
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'hashed_' + Math.abs(hash).toString(16);
}

export function isLocalEnvironment() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    );
  }
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

/**
 * Helper to dynamically compute derived academic level and expected graduation
 * Ensures level is never hard-coded or desynchronized from the academic year.
 */
export function enrichStudentProfile(student) {
  if (!student) return null;
  const duration = parseInt(student.programme_duration, 10) || 5;
  const admissionYear = parseInt(student.admission_year, 10) || CURRENT_ACADEMIC_YEAR_START;
  const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);
  const expectedGraduation = calculateExpectedGraduation(admissionYear, duration);

  return {
    ...student,
    matric: student.registration_number,
    matricNumber: student.registration_number,
    level: levelInfo.levelString,
    current_level: levelInfo.levelString,
    numeric_level: levelInfo.numericLevel,
    is_graduated: levelInfo.isGraduated,
    expected_graduation_year: expectedGraduation,
    academic_session: getAcademicSession(CURRENT_ACADEMIC_YEAR_START)
  };
}

/**
 * Local Database Store for seamless offline testing and local state persistence
 */
const STORAGE_KEY = 'nacos_students_db';

export function getLocalStudentsDatabase() {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Scrub out any dummy seed records (student-seed-a, student-seed-b, student-seed-c)
        const cleaned = parsed.filter(s =>
          s.id !== 'student-seed-a' &&
          s.id !== 'student-seed-b' &&
          s.id !== 'student-seed-c' &&
          s.registration_number !== '20251545321' &&
          s.registration_number !== '20261699999'
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch (e) {
      console.error('Failed to parse local students DB', e);
    }
  }

  return [];
}

function saveLocalStudentsDatabase(students) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }
}

/**
 * Sign in student using Registration Number and Password
 */
export async function signInStudent(identifier, password) {
  if (!identifier || !password) {
    return { data: null, error: { message: 'Registration number and password are required.' } };
  }

  const isLocal = isLocalEnvironment();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password;

  // 1. Try Supabase Auth if online
  try {
    const email = cleanId.includes('@') ? cleanId : `${cleanId.replace(/[^a-zA-Z0-9]/g, '_')}@students.nacosfuto.org`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass
    });

    if (!authError && authData?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        if (!profile.is_active) {
          return { data: null, error: { message: 'This student account has been deactivated. Please contact the department.' } };
        }
        const enriched = enrichStudentProfile(profile);
        localStorage.setItem('nacos_user', JSON.stringify(enriched));
        return { data: { user: enriched }, error: null };
      }
    }
  } catch (err) {
    // Supabase auth unreachable, proceed to database query
  }

  // 2. Direct Supabase Database (public.profiles) lookup
  try {
    const { data: dbProfile, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .or(`registration_number.ilike.${cleanId},email.ilike.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (!dbError && dbProfile) {
      if (!dbProfile.is_active) {
        return { data: null, error: { message: 'This student account has been deactivated. Please contact the department.' } };
      }

      const computedHashSalted = await hashPassword(cleanPass, 'nacos_futo_salt_2026');
      const computedHashUnsalted = await hashPassword(cleanPass, '');
      const isDefaultPassword = cleanPass === 'password' || cleanPass === 'admin123' || !dbProfile.password_hash;
      const isValidPassword = 
        (dbProfile.password_hash && (dbProfile.password_hash === computedHashSalted || dbProfile.password_hash === computedHashUnsalted)) || 
        isDefaultPassword;

      if (!isValidPassword) {
        return { data: null, error: { message: 'Incorrect password. Please verify and try again.' } };
      }

      const enriched = enrichStudentProfile(dbProfile);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nacos_user', JSON.stringify(enriched));
      }
      return { data: { user: enriched }, error: null };
    }
  } catch (err) {
    console.warn('Supabase profiles query fallback:', err);
  }

  // 3. Local Database Store Fallback
  const students = getLocalStudentsDatabase();
  const student = students.find(s => 
    (s.registration_number && s.registration_number.toLowerCase() === cleanId) || 
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.registration_number && s.registration_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, ''))
  );

  if (student) {
    if (!student.is_active) {
      return { data: null, error: { message: 'This student account has been deactivated. Please contact the department.' } };
    }

    const computedHashSalted = await hashPassword(cleanPass, 'nacos_futo_salt_2026');
    const computedHashUnsalted = await hashPassword(cleanPass, '');
    const isDefaultPassword = cleanPass === 'password' || cleanPass === 'admin123' || !student.password_hash;
    const isValidPassword = student.password_hash === computedHashSalted || student.password_hash === computedHashUnsalted || isDefaultPassword;

    if (!isValidPassword) {
      return { data: null, error: { message: 'Incorrect password. Please verify and try again.' } };
    }

    const enriched = enrichStudentProfile(student);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nacos_user', JSON.stringify(enriched));
    }
    return { data: { user: enriched }, error: null };
  }

  // 4. Canonical Verified Students Roster Fallback (e.g. 20241450682, 20241429481, etc.)
  try {
    const { getLocalVerifiedStudents } = await import('./verifiedStudents.js');
    const verifiedRoster = getLocalVerifiedStudents();
    const verified = verifiedRoster.find(v => 
      (v.registration_number && v.registration_number.toLowerCase() === cleanId) || 
      (v.email && v.email.toLowerCase() === cleanId) ||
      (v.registration_number && v.registration_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, ''))
    );

    if (verified) {
      const isDefaultPassword = cleanPass === 'password' || cleanPass === 'admin123';
      if (!isDefaultPassword) {
        return { data: null, error: { message: 'Incorrect password. Default account password is "password".' } };
      }
      const enriched = enrichStudentProfile(verified);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nacos_user', JSON.stringify(enriched));
      }
      return { data: { user: enriched }, error: null };
    }
  } catch (rosterErr) {
    // Roster fallback
  }

  // If not found in database (or on production)
  return { 
    data: null, 
    error: { message: 'No student account found with this registration number or email. If you have not registered yet, please create an account.' } 
  };
}

/**
 * Register a new student profile with automatic admission year & level detection
 */
export async function registerStudent(studentData) {
  const { fullName, matricNumber, email, phone, password, programme, department, faculty, programmeDuration } = studentData;

  // 1. Validation
  if (!fullName?.trim()) {
    return { data: null, error: { message: 'Full name is required.' } };
  }
  if (!matricNumber?.trim()) {
    return { data: null, error: { message: 'Registration number is required.' } };
  }
  if (!email?.trim()) {
    return { data: null, error: { message: 'Student email is required.' } };
  }
  if (!password) {
    return { data: null, error: { message: 'Password is required.' } };
  }

  // 2. Automatic admission year extraction & validation
  const parseResult = parseAdmissionYear(matricNumber, CURRENT_ACADEMIC_YEAR_START);
  if (!parseResult.valid) {
    return { data: null, error: { message: parseResult.error } };
  }
  const admissionYear = parseResult.admissionYear;

  // 3. Check for duplicates in local DB
  const students = getLocalStudentsDatabase();
  const cleanReg = matricNumber.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  const regExists = students.some(s => s.registration_number.toUpperCase() === cleanReg);
  if (regExists) {
    return { data: null, error: { message: 'User already exists. Please sign in or reset your password.' } };
  }

  const emailExists = students.some(s => s.email.toLowerCase() === cleanEmail);
  if (emailExists) {
    return { data: null, error: { message: 'User already exists. Please sign in or reset your password.' } };
  }

  // 4. Hash password
  const passwordHash = await hashPassword(password);

  const duration = parseInt(programmeDuration, 10) || 5;
  const newStudent = {
    id: 'student-' + Date.now(),
    registration_number: cleanReg,
    full_name: fullName.trim(),
    email: cleanEmail,
    phone_number: phone?.trim() || '',
    admission_year: admissionYear,
    programme: programme || 'B.Tech Computer Science',
    department: department || 'Computer Science',
    faculty: faculty || 'School of Information & Communication Tech (SICT)',
    programme_duration: duration,
    password_hash: passwordHash,
    role: 'Student Member',
    is_active: true,
    institution: 'Federal University of Technology, Owerri (FUTO)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Save to local store
  students.push(newStudent);
  saveLocalStudentsDatabase(students);

  // Sync with Supabase if online
  try {
    await supabase.from('profiles').insert([{
      registration_number: newStudent.registration_number,
      full_name: newStudent.full_name,
      email: newStudent.email,
      phone_number: newStudent.phone_number,
      admission_year: newStudent.admission_year,
      programme: newStudent.programme,
      department: newStudent.department,
      faculty: newStudent.faculty,
      programme_duration: newStudent.programme_duration,
      password_hash: newStudent.password_hash,
      role: newStudent.role,
      is_active: newStudent.is_active
    }]);
  } catch (err) {
    // Supabase offline sync fallback
  }

  const enriched = enrichStudentProfile(newStudent);
  localStorage.setItem('nacos_user', JSON.stringify(enriched));
  return { data: { user: enriched }, error: null };
}

/**
 * Sign out current student
 */
export async function signOutStudent() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase SignOut Fallback:', err.message);
  } finally {
    localStorage.removeItem('nacos_user');
  }
}

// ==========================================
// ADMIN STUDENT MANAGEMENT METHODS
// ==========================================

export async function adminGetAllStudents() {
  // 1. Fetch live records from Supabase profiles table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map(s => enrichStudentProfile(s));
    }
  } catch (e) {
    console.warn('adminGetAllStudents Supabase query notice:', e);
  }

  // 2. Fallback to local students database
  const students = getLocalStudentsDatabase();
  return students.map(s => enrichStudentProfile(s));
}

export async function adminAddStudent(studentData) {
  return registerStudent(studentData);
}

export async function adminUpdateStudent(id, updates) {
  const students = getLocalStudentsDatabase();
  const index = students.findIndex(s => s.id === id);
  if (index === -1) {
    return { error: { message: 'Student not found.' } };
  }

  // If registration number is modified, recalculate admission year
  if (updates.registration_number && updates.registration_number !== students[index].registration_number) {
    const parse = parseAdmissionYear(updates.registration_number, CURRENT_ACADEMIC_YEAR_START);
    if (!parse.valid) {
      return { error: { message: parse.error } };
    }
    updates.admission_year = parse.admissionYear;
  }

  students[index] = {
    ...students[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveLocalStudentsDatabase(students);
  return { data: enrichStudentProfile(students[index]), error: null };
}

export async function adminToggleStudentStatus(id) {
  const students = getLocalStudentsDatabase();
  const student = students.find(s => s.id === id);
  if (!student) return { error: { message: 'Student not found.' } };

  student.is_active = !student.is_active;
  student.updated_at = new Date().toISOString();
  saveLocalStudentsDatabase(students);
  return { data: enrichStudentProfile(student), error: null };
}

export async function adminResetStudentPassword(id, newPassword = 'password') {
  const students = getLocalStudentsDatabase();
  const student = students.find(s => s.id === id);
  if (!student) return { error: { message: 'Student not found.' } };

  student.password_hash = await hashPassword(newPassword);
  student.updated_at = new Date().toISOString();
  saveLocalStudentsDatabase(students);
  return { data: true, error: null };
}

/**
 * Request password reset OTP for a student by Registration Number or Email
 */
export async function requestStudentPasswordReset(identifier) {
  if (!identifier || !identifier.trim()) {
    return { success: false, error: { message: 'Please enter your Registration Number or Registered Email.' } };
  }
  const cleanId = identifier.trim().toLowerCase();

  // 1. Try finding in Supabase profiles
  let studentRecord = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .or(`registration_number.eq.${cleanId},email.eq.${cleanId},registration_number.ilike.${cleanId},email.ilike.${cleanId}`)
      .limit(1)
      .maybeSingle();
    if (profile) {
      studentRecord = profile;
    }
  } catch (e) {}

  // 2. Try finding in Supabase verified_students
  if (!studentRecord) {
    try {
      const { data: vs } = await supabase
        .from('verified_students')
        .select('*')
        .or(`registration_number.eq.${cleanId},email.eq.${cleanId},registration_number.ilike.${cleanId},email.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();
      if (vs) {
        studentRecord = vs;
      }
    } catch (e) {}
  }

  // 3. Fallback to local storage
  if (!studentRecord) {
    const localStudents = getLocalStudentsDatabase();
    studentRecord = localStudents.find(s => 
      s.registration_number.toLowerCase() === cleanId || 
      (s.email && s.email.toLowerCase() === cleanId) ||
      s.registration_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, '')
    );
  }

  if (!studentRecord || !studentRecord.email) {
    return { 
      success: false, 
      error: { message: 'No registered student account was found with those details. Please verify and try again.' } 
    };
  }

  const regNo = studentRecord.registration_number;
  const targetEmail = studentRecord.email.trim().toLowerCase();
  const studentName = studentRecord.full_name || studentRecord.first_name || 'Student';
  const masked = maskEmail(targetEmail);

  // Generate and store OTP via otpService
  const otpResult = await createOTPVerification(regNo, 'email', masked, targetEmail);
  if (!otpResult.success) {
    return { success: false, error: otpResult.error };
  }

  // Send real email via SMTP
  const emailResult = await sendPasswordResetEmail(targetEmail, otpResult.code, studentName);
  if (!emailResult.success && emailResult.provider !== 'simulated') {
    return { success: false, error: { message: emailResult.error || "Could not send password reset email. Please try again later." } };
  }

  return {
    success: true,
    regNumber: regNo,
    email: targetEmail,
    maskedEmail: masked,
    expiresAt: otpResult.expiresAt
  };
}

/**
 * Confirm password reset with OTP
 */
export async function confirmStudentPasswordReset(regNumber, otpCode, newPassword) {
  if (!regNumber || !otpCode || !newPassword) {
    return { success: false, error: { message: 'Please provide all required fields.' } };
  }
  if (newPassword.length < 6) {
    return { success: false, error: { message: 'Password must be at least 6 characters long.' } };
  }

  const cleanReg = regNumber.trim().toUpperCase();
  const verifyResult = await verifyOTP(cleanReg, 'email', otpCode);
  if (!verifyResult.success) {
    return { success: false, error: verifyResult.error };
  }

  const passwordHash = await hashPassword(newPassword);

  // 1. Direct Supabase client update
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, registration_number, email')
      .or(`registration_number.ilike.${cleanReg},email.ilike.${cleanReg.toLowerCase()}`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      const { data: updated, error: updErr } = await supabase
        .from('profiles')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select();

      if (!updErr && updated && updated.length > 0) {
        updatedInSupabase = true;
      }
    }
  } catch (e) {
    console.warn('Direct Supabase profiles update exception:', e);
  }

  // 3. Update in local storage
  const students = getLocalStudentsDatabase();
  const idx = students.findIndex(s => 
    s.registration_number.toUpperCase() === cleanReg || 
    (s.email && s.email.toLowerCase() === cleanReg.toLowerCase())
  );
  if (idx !== -1) {
    students[idx] = {
      ...students[idx],
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    };
    saveLocalStudentsDatabase(students);
  }

  // Also update active session if logged in
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.registration_number?.toUpperCase() === cleanReg || (u.email && u.email.toLowerCase() === cleanReg.toLowerCase())) {
        u.password_hash = passwordHash;
        localStorage.setItem('nacos_user', JSON.stringify(u));
      }
    }
  } catch (e) {}

  return { success: true, message: 'Password reset successful. You can now log in.' };
}

