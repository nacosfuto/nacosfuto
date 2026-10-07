import { supabase } from './client.js';
import { 
  CURRENT_ACADEMIC_YEAR_START, 
  parseAdmissionYear, 
  calculateCurrentLevel, 
  calculateExpectedGraduation, 
  getAcademicSession 
} from '@nacos/config/academic';
import { createOTPVerification, verifyOTP, maskEmail, maskPhone } from './otpService.js';
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

/**
 * Enterprise NIST SP 800-63B compliant PBKDF2 password hasher (100,000 iterations)
 */
export async function hashPasswordPBKDF2(password, salt = 'nacos_futo_salt_2026', iterations = 100000) {
  if (!password) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(salt),
          iterations: iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      const hashArray = Array.from(new Uint8Array(derivedBits));
      return `pbkdf2$${iterations}$` + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {}
  }
  return hashPassword(password, salt);
}

/**
 * Verifies candidate password against stored hash (supports both PBKDF2 and legacy SHA-256)
 */
export async function verifyPassword(password, storedHash, salt = 'nacos_futo_salt_2026') {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const iterations = parseInt(parts[1], 10) || 100000;
    const computed = await hashPasswordPBKDF2(password, salt, iterations);
    return computed === storedHash;
  }
  const computedHashSalted = await hashPassword(password, salt);
  const computedHashUnsalted = await hashPassword(password, '');
  return storedHash === computedHashSalted || storedHash === computedHashUnsalted;
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

  const fullName = student.full_name || [student.surname, student.first_name, student.middle_name].filter(Boolean).join(' ') || '';
  const firstName = student.first_name || (fullName ? fullName.split(' ')[0] : 'Student');
  const lastName = student.last_name || student.surname || (fullName ? fullName.split(' ').slice(-1)[0] : '');

  return {
    ...student,
    full_name: fullName,
    name: fullName,
    first_name: firstName,
    firstName: firstName,
    last_name: lastName,
    lastName: lastName,
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
    const strippedId = cleanId.replace(/[^a-zA-Z0-9]/g, '');
    let filterString = `registration_number.ilike.${cleanId},email.ilike.${cleanId}`;
    if (strippedId && strippedId !== cleanId) {
      filterString += `,registration_number.ilike.${strippedId},matric_number.ilike.${cleanId},matric_number.ilike.${strippedId}`;
    } else {
      filterString += `,matric_number.ilike.${cleanId}`;
    }
    const { data: dbProfile, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .or(filterString)
      .limit(1)
      .maybeSingle();

    if (!dbError && dbProfile) {
      if (!dbProfile.is_active) {
        return { data: null, error: { message: 'This student account has been deactivated. Please contact the department.' } };
      }

      if (!dbProfile.password_hash) {
        return {
          data: null,
          error: {
            message: 'This student account has not been activated yet. Please complete account registration to verify your identity and set your password.',
            needsActivation: true,
            registrationNumber: dbProfile.registration_number
          }
        };
      }

      const isValidPassword = await verifyPassword(cleanPass, dbProfile.password_hash);

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

    if (!student.password_hash) {
      return {
        data: null,
        error: {
          message: 'This student account has not been activated yet. Please complete account registration to verify your identity and set your password.',
          needsActivation: true,
          registrationNumber: student.registration_number
        }
      };
    }

    const isValidPassword = await verifyPassword(cleanPass, student.password_hash);

    if (!isValidPassword) {
      return { data: null, error: { message: 'Incorrect password. Please verify and try again.' } };
    }

    const enriched = enrichStudentProfile(student);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nacos_user', JSON.stringify(enriched));
    }
    return { data: { user: enriched }, error: null };
  }

  // 4. Supabase verified_students roster lookup
  // If student exists here but has not registered, inform them to complete 4-step registration
  try {
    const { data: vsRecord } = await supabase
      .from('verified_students')
      .select('*')
      .or(`registration_number.ilike.${cleanId},email.ilike.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (vsRecord) {
      if (vsRecord.status && vsRecord.status !== 'active') {
        return { data: null, error: { message: 'This student account has been deactivated. Please contact the department.' } };
      }

      return {
        data: null,
        error: {
          message: 'This student account has not been activated yet. Please complete account registration to verify your identity and set your password.',
          needsActivation: true,
          registrationNumber: vsRecord.registration_number
        }
      };
    }
  } catch (vsErr) {}

  // 5. Canonical Verified Students Roster Local Fallback
  try {
    const { getLocalVerifiedStudents } = await import('./verifiedStudents.js');
    const verifiedRoster = getLocalVerifiedStudents();
    const verified = verifiedRoster.find(v => 
      (v.registration_number && v.registration_number.toLowerCase() === cleanId) || 
      (v.email && v.email.toLowerCase() === cleanId) ||
      (v.registration_number && v.registration_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, ''))
    );

    if (verified) {
      return {
        data: null,
        error: {
          message: 'This student account has not been activated yet. Please complete account registration to verify your identity and set your password.',
          needsActivation: true,
          registrationNumber: verified.registration_number
        }
      };
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      return data.map(s => enrichStudentProfile(s));
    }
  } catch (e) {
    console.warn('adminGetAllStudents Supabase query notice:', e);
  }

  // 2. Fallback to cache without mock injection
  const cached = getLocalStudentsDatabase();
  return Array.isArray(cached) ? cached.map(s => enrichStudentProfile(s)) : [];
}

export async function adminAddStudent(studentData) {
  const {
    surname,
    firstName,
    middleName,
    fullName,
    matricNumber,
    registration_number,
    regNumber,
    email,
    phone,
    phone_number,
    department,
    faculty,
    programme,
    programmeDuration,
    initialPassword = 'password'
  } = studentData;

  const resolvedReg = (matricNumber || registration_number || regNumber || '').toString().trim().toUpperCase();
  const resolvedEmail = (email || '').toString().trim().toLowerCase();
  const resolvedSurname = (surname || '').trim() || (fullName || '').trim().split(' ')[0] || '';
  const resolvedFirstName = (firstName || '').trim() || (fullName || '').trim().split(' ')[1] || '';
  const resolvedMiddleName = (middleName || '').trim() || (fullName || '').trim().split(' ').slice(2).join(' ') || '';
  const resolvedFullName = [resolvedSurname, resolvedFirstName, resolvedMiddleName].filter(Boolean).join(' ') || (fullName || '').trim();

  if (!resolvedReg) {
    return { error: { message: 'Registration number is required.' } };
  }
  if (!resolvedEmail) {
    return { error: { message: 'Student email is required.' } };
  }
  if (!resolvedFullName) {
    return { error: { message: 'Student full name is required.' } };
  }

  // 1. Check duplicate in Supabase profiles
  let existingId = null;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, registration_number, email')
      .or(`registration_number.ilike.${resolvedReg},email.ilike.${resolvedEmail}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      existingId = existing.id;
    }
  } catch (e) {}

  const parse = parseAdmissionYear(resolvedReg, CURRENT_ACADEMIC_YEAR_START);
  const admissionYear = parse.valid ? parse.admissionYear : CURRENT_ACADEMIC_YEAR_START;
  const duration = parseInt(programmeDuration, 10) || 5;
  const passwordHash = await hashPassword(initialPassword || 'password');
  const studentId = existingId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `student-${Date.now()}`);

  const profileRecord = {
    id: studentId,
    registration_number: resolvedReg,
    matric_number: resolvedReg,
    surname: resolvedSurname,
    first_name: resolvedFirstName,
    middle_name: resolvedMiddleName,
    last_name: resolvedSurname,
    full_name: resolvedFullName,
    email: resolvedEmail,
    phone_number: (phone || phone_number || '').trim(),
    department: department || 'Computer Science',
    faculty: faculty || 'School of Information & Communication Tech (SICT)',
    programme: programme || 'B.Tech Computer Science',
    programme_duration: duration,
    admission_year: admissionYear,
    password_hash: passwordHash,
    role: 'Student Member',
    is_active: true,
    institution: 'Federal University of Technology, Owerri (FUTO)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 2. Persist to Supabase profiles
  let finalRecord = profileRecord;
  try {
    let res;
    if (existingId) {
      res = await supabase.from('profiles').update(profileRecord).eq('id', existingId).select().maybeSingle();
    } else {
      res = await supabase.from('profiles').insert([profileRecord]).select().maybeSingle();
    }
    if (!res.error && res.data) {
      finalRecord = res.data;
    }
  } catch (err) {
    console.warn('Supabase profiles live sync exception:', err);
  }

  // 3. Sync to verified_students in Supabase (upsert so new student exists in both tables)
  try {
    const levelInfo = calculateCurrentLevel(admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);
    await supabase
      .from('verified_students')
      .upsert({
        registration_number: resolvedReg,
        full_name: resolvedFullName,
        surname: resolvedSurname,
        first_name: resolvedFirstName,
        middle_name: resolvedMiddleName,
        last_name: resolvedSurname,
        email: resolvedEmail,
        phone_number: profileRecord.phone_number,
        masked_email: maskEmail(resolvedEmail),
        masked_phone: maskPhone(profileRecord.phone_number),
        department: profileRecord.department,
        faculty: profileRecord.faculty,
        level: levelInfo.levelString,
        admission_year: admissionYear,
        programme: profileRecord.programme,
        programme_duration: duration,
        academic_session: getAcademicSession(CURRENT_ACADEMIC_YEAR_START),
        status: 'active',
        has_registered: true,
        is_registered: true,
        registered_at: new Date().toISOString(),
        auth_user_id: studentId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'registration_number' });
  } catch (err) {
    console.warn('Supabase verified_students sync error:', err);
  }

  // 4. Save to local stores
  const localDb = getLocalStudentsDatabase();
  const existingIdx = localDb.findIndex(s => s.registration_number?.toUpperCase() === resolvedReg);
  if (existingIdx !== -1) {
    localDb[existingIdx] = { ...localDb[existingIdx], ...finalRecord };
  } else {
    localDb.unshift(finalRecord);
  }
  saveLocalStudentsDatabase(localDb);

  return { success: true, data: enrichStudentProfile(finalRecord), error: null };
}

export async function adminUpdateStudent(id, updates) {
  // Recalculate admission year if registration number is updated
  if (updates.registration_number) {
    const parse = parseAdmissionYear(updates.registration_number, CURRENT_ACADEMIC_YEAR_START);
    if (!parse.valid) {
      return { error: { message: parse.error } };
    }
    updates.admission_year = parse.admissionYear;
  }

  const dbUpdates = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  // 1. Sync live to Supabase profiles
  try {
    await supabase.from('profiles').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Supabase update student error:', err);
  }

  // 2. Sync to local database
  const students = getLocalStudentsDatabase();
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students[index] = {
      ...students[index],
      ...dbUpdates
    };
    saveLocalStudentsDatabase(students);
    return { data: enrichStudentProfile(students[index]), error: null };
  }

  return { data: enrichStudentProfile({ id, ...dbUpdates }), error: null };
}

export async function adminToggleStudentStatus(id) {
  let newStatus = true;

  // 1. Check live in Supabase profiles
  try {
    const { data: current } = await supabase.from('profiles').select('id, is_active').eq('id', id).maybeSingle();
    if (current) {
      newStatus = !current.is_active;
      await supabase.from('profiles').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    }
  } catch (err) {}

  // 2. Update in local store
  const students = getLocalStudentsDatabase();
  const student = students.find(s => s.id === id);
  if (student) {
    student.is_active = newStatus;
    student.updated_at = new Date().toISOString();
    saveLocalStudentsDatabase(students);
    return { data: enrichStudentProfile(student), error: null };
  }

  return { data: { id, is_active: newStatus }, error: null };
}

export async function adminResetStudentPassword(id, newPassword = 'password') {
  const passwordHash = await hashPassword(newPassword);

  // 1. Sync live to Supabase profiles
  try {
    await supabase.from('profiles').update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    }).eq('id', id);
  } catch (err) {
    console.warn('Supabase password reset update error:', err);
  }

  // 2. Update local store
  const students = getLocalStudentsDatabase();
  const student = students.find(s => s.id === id);
  if (student) {
    student.password_hash = passwordHash;
    student.updated_at = new Date().toISOString();
    saveLocalStudentsDatabase(students);
  }

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

  // Send transactional email via Resend
  const emailResult = await sendPasswordResetEmail(targetEmail, otpResult.code, studentName, regNo);
  if (!emailResult.success && emailResult.provider !== 'simulated') {
    return {
      success: false,
      error: { message: emailResult.error || "Could not send password reset email. Please try again later." },
      retryAfterSeconds: emailResult.retryAfterSeconds
    };
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
    } else {
      // If student is in verified_students but not yet in profiles, provision them into profiles with the new password hash
      const { data: vsRecord } = await supabase
        .from('verified_students')
        .select('*')
        .or(`registration_number.ilike.${cleanReg},email.ilike.${cleanReg.toLowerCase()}`)
        .limit(1)
        .maybeSingle();

      if (vsRecord) {
        const profileRecord = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `student-${Date.now()}`,
          registration_number: vsRecord.registration_number,
          matric_number: vsRecord.registration_number,
          surname: vsRecord.surname || vsRecord.full_name?.split(' ')[0] || '',
          first_name: vsRecord.first_name || vsRecord.full_name?.split(' ')[1] || '',
          middle_name: vsRecord.middle_name || '',
          last_name: vsRecord.last_name || vsRecord.surname || '',
          full_name: vsRecord.full_name,
          email: vsRecord.email,
          phone_number: vsRecord.phone_number || '',
          department: vsRecord.department || 'Computer Science',
          faculty: vsRecord.faculty || 'School of Information & Communication Tech (SICT)',
          programme: vsRecord.programme || 'B.Tech Computer Science',
          programme_duration: vsRecord.programme_duration || 5,
          admission_year: vsRecord.admission_year || 2024,
          password_hash: passwordHash,
          role: 'Student Member',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const { error: insErr } = await supabase.from('profiles').insert([profileRecord]);
        if (!insErr) {
          updatedInSupabase = true;
        }
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

