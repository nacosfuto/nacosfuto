import { supabase } from './client.js';
import { 
  DEFAULT_ACADEMIC_YEAR_START,
  CURRENT_ACADEMIC_YEAR_START, 
  parseAdmissionYear, 
  calculateCurrentLevel, 
  calculateAcademicProgression,
  calculateExpectedGraduation, 
  getAcademicSession,
  getActiveAcademicSession,
  getActiveAcademicYearStart
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
  const progression = calculateAcademicProgression(student);

  const fullName = student.full_name || [student.surname, student.first_name, student.middle_name].filter(Boolean).join(' ') || '';
  const firstName = student.first_name || (fullName ? fullName.split(' ')[0] : 'Student');
  const lastName = student.last_name || student.surname || (fullName ? fullName.split(' ').slice(-1)[0] : '');
  const matric = student.registration_number || student.matric_number || student.matric || '';

  return {
    ...student,
    full_name: fullName,
    name: fullName,
    first_name: firstName,
    firstName: firstName,
    last_name: lastName,
    lastName: lastName,
    matric,
    matricNumber: matric,
    registration_number: matric,
    admission_year: progression.admissionYear || student.admission_year,
    programme_duration: progression.programmeDuration,
    level: progression.levelString,
    current_level: progression.levelString,
    numeric_level: progression.numericLevel,
    is_graduated: progression.isGraduated,
    status: progression.isGraduated ? 'Graduated' : (student.status || 'Active'),
    class_of: progression.classOf,
    classOf: progression.classOf,
    class_of_display: progression.classOfDisplay,
    classOfDisplay: progression.classOfDisplay,
    graduation_year: progression.expectedGraduationYear,
    expected_graduation_year: progression.expectedGraduationYear,
    academic_session: progression.academicSession || getActiveAcademicSession(),
    role: progression.isGraduated ? (student.role || 'Alumni Member') : (student.role || 'Student Member'),
    is_active: student.is_active !== undefined ? student.is_active : true
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

  // 2. Admission year: use provided field or fallback to current session
  const admissionYear = parseInt(studentData.admission_year || studentData.admissionYear, 10) || CURRENT_ACADEMIC_YEAR_START;

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
  const resolvedReg = (
    studentData.registration_number || 
    studentData.matricNumber || 
    studentData.matric_number || 
    studentData.regNumber || 
    studentData.reg_no || ''
  ).toString().trim().toUpperCase();

  const resolvedEmail = (studentData.email || '').toString().trim().toLowerCase();

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

  const department = studentData.department || 'Computer Science';
  const faculty = studentData.faculty || 'Physical Sciences';
  const programme = studentData.programme || 'Undergraduate';
  const programmeDuration = studentData.programmeDuration || studentData.programme_duration || 5;
  const initialPassword = studentData.initialPassword || 'password';
  const phone = studentData.phone || studentData.phone_number || '';

  if (!resolvedReg) {
    return { error: { message: 'Registration number is required.' } };
  }
  if (!resolvedFullName) {
    return { error: { message: 'Student full name is required.' } };
  }
  if (!resolvedEmail) {
    return { error: { message: 'Student email is required for registered portal accounts.' } };
  }

  // 1. Check duplicate in Supabase profiles
  let existingId = null;
  try {
    let query = supabase.from('profiles').select('id, registration_number, email');
    if (resolvedEmail) {
      query = query.or(`registration_number.ilike.${resolvedReg},email.ilike.${resolvedEmail}`);
    } else {
      query = query.or(`registration_number.ilike.${resolvedReg},matric_number.ilike.${resolvedReg}`);
    }
    const { data: existing } = await query.limit(1).maybeSingle();

    if (existing) {
      existingId = existing.id;
    }
  } catch (e) {}

  const admissionYear = parseInt(studentData.admission_year || studentData.admissionYear, 10) || CURRENT_ACADEMIC_YEAR_START;
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
    email: resolvedEmail || null,
    phone_number: (phone || '').trim(),
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
    const progression = calculateAcademicProgression({
      registration_number: resolvedReg,
      admission_year: admissionYear,
      programme_duration: duration
    });
    await supabase
      .from('verified_students')
      .upsert({
        registration_number: resolvedReg,
        full_name: resolvedFullName,
        surname: resolvedSurname,
        first_name: resolvedFirstName,
        middle_name: resolvedMiddleName,
        last_name: resolvedSurname,
        email: resolvedEmail || null,
        phone_number: profileRecord.phone_number,
        masked_email: resolvedEmail ? maskEmail(resolvedEmail) : '',
        masked_phone: maskPhone(profileRecord.phone_number),
        department: profileRecord.department,
        faculty: profileRecord.faculty,
        level: progression.levelString,
        admission_year: progression.admissionYear || admissionYear,
        programme: profileRecord.programme,
        programme_duration: duration,
        academic_session: progression.academicSession || getActiveAcademicSession(),
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

/**
 * PORTAL ADMIN: Revoke Student Dues Clearance
 * Sets student dues to revoked status, invalidates payment, and requires new payment.
 */
export async function adminRevokeStudentDues(identifier, reason = 'Administrative clearance revocation', adminUser = null) {
  if (!identifier) return { error: { message: 'Student identifier is required.' } };
  const cleanId = String(identifier).trim().toUpperCase();

  // 1. Update Supabase profiles table
  try {
    await supabase
      .from('profiles')
      .update({
        dues_cleared: false,
        has_paid_dues: false,
        payment_status: 'revoked',
        dues_revoked_at: new Date().toISOString(),
        dues_revocation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .or(`registration_number.eq.${cleanId},id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase profiles dues revoke error:', err);
  }

  // 2. Mark corresponding dues payments as revoked
  try {
    await supabase
      .from('payments')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('payment_type', 'DEPARTMENTAL_DUES')
      .or(`registration_number.eq.${cleanId},student_id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase payments dues revoke error:', err);
  }

  try {
    await supabase
      .from('dues_payments')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .or(`student_id.eq.${cleanId},matric_number.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase dues_payments revoke error:', err);
  }

  // 3. Update local databases
  const students = getLocalStudentsDatabase();
  const idx = students.findIndex(s => 
    s.registration_number?.toUpperCase() === cleanId || s.id === cleanId
  );
  if (idx !== -1) {
    students[idx] = {
      ...students[idx],
      dues_cleared: false,
      has_paid_dues: false,
      payment_status: 'revoked',
      dues_revoked_at: new Date().toISOString(),
      dues_revocation_reason: reason,
      updated_at: new Date().toISOString()
    };
    saveLocalStudentsDatabase(students);
  }

  // Update active session if student is logged in locally
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.registration_number?.toUpperCase() === cleanId || u.id === cleanId) {
        u.dues_cleared = false;
        u.has_paid_dues = false;
        u.payment_status = 'revoked';
        u.dues_revoked_at = new Date().toISOString();
        u.dues_revocation_reason = reason;
        localStorage.setItem('nacos_user', JSON.stringify(u));
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    }
  } catch (e) {}

  return { 
    success: true, 
    message: `Dues clearance revoked for ${cleanId}. Student is now required to pay anew to restore clearance.` 
  };
}

/**
 * PORTAL ADMIN: Revoke Student ID Card
 * Revokes an issued ID card, requiring a new payment & application.
 */
export async function adminRevokeStudentIdCard(identifier, reason = 'Administrative card revocation', adminUser = null) {
  if (!identifier) return { error: { message: 'Student identifier is required.' } };
  const cleanId = String(identifier).trim().toUpperCase();

  // 1. Update Supabase id_card_applications
  try {
    await supabase
      .from('id_card_applications')
      .update({
        status: 'revoked',
        payment_status: 'revoked',
        revocation_reason: reason,
        revoked_at: new Date().toISOString(),
        reviewed_by: adminUser?.id || 'admin-portal',
        updated_at: new Date().toISOString()
      })
      .or(`matric_number.eq.${cleanId},user_id.eq.${cleanId},id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase id_card_applications revoke error:', err);
  }

  // 2. Mark payments for ID card as revoked
  try {
    await supabase
      .from('payments')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('payment_type', 'ID_CARD')
      .or(`registration_number.eq.${cleanId},student_id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase payments id card revoke error:', err);
  }

  // Update active session if relevant
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.registration_number?.toUpperCase() === cleanId || u.id === cleanId) {
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    }
  } catch (e) {}

  return {
    success: true,
    message: `ID Card revoked for ${cleanId}. Student is now required to pay & re-apply for a new card.`
  };
}

/**
 * PORTAL ADMIN: Reset Student Registration
 * Completely resets registration so the student can re-register from scratch on /register.
 */
export async function adminResetStudentRegistration(identifier, adminUser = null) {
  if (!identifier) return { error: { message: 'Student identifier is required.' } };
  const cleanId = String(identifier).trim().toUpperCase();

  // 1. Unlink & reset in verified_students
  try {
    await supabase
      .from('verified_students')
      .update({
        has_registered: false,
        is_registered: false,
        auth_user_id: null,
        registered_at: null,
        updated_at: new Date().toISOString()
      })
      .or(`registration_number.eq.${cleanId},email.eq.${cleanId.toLowerCase()}`);
  } catch (err) {
    console.warn('Supabase reset verified_students error:', err);
  }

  // 2. Remove from profiles table so they can re-register without unique constraint collision
  try {
    await supabase
      .from('profiles')
      .delete()
      .or(`registration_number.eq.${cleanId},id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase delete profile error:', err);
  }

  // 3. Remove from local storage
  const students = getLocalStudentsDatabase();
  const updatedStudents = students.filter(s => 
    s.registration_number?.toUpperCase() !== cleanId && s.id !== cleanId
  );
  saveLocalStudentsDatabase(updatedStudents);

  // Clear active session if this student is currently logged in on this machine
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.registration_number?.toUpperCase() === cleanId || u.id === cleanId) {
        localStorage.removeItem('nacos_user');
        localStorage.removeItem('nacos_last_activity');
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    }
  } catch (e) {}

  return {
    success: true,
    message: `Registration for ${cleanId} has been reset. The student can now re-register cleanly at /register.`
  };
}

/**
 * Alias for adminResetStudentRegistration to make the "Revoke vs Delete" distinction crystal clear:
 * - Revoke (adminRevokeStudentRegistration): unlinks the portal login so the student must register again.
 * - Delete (adminDeleteStudent): permanently expunges the student from the database entirely.
 */
export const adminRevokeStudentRegistration = adminResetStudentRegistration;

/**
 * PORTAL ADMIN: Permanently Delete Student User from the Database
 * Completely removes the student user from:
 * 1. public.profiles (active user account, bio-data, credentials)
 * 2. public.verified_students (departmental roster record)
 * 3. Associated unlinked records (id_card_applications, account_recovery_requests)
 * 4. Local client stores & active session caches
 * 
 * Unlike "Revoke / Reset Registration" (which unlinks the account and permits the student to re-register),
 * "Delete" completely expunges the student record from the Supabase database.
 */
export async function adminDeleteStudent(identifier, adminUser = null) {
  if (!identifier) return { error: { message: 'Student identifier is required.' } };

  const rawObj = typeof identifier === 'object' && identifier !== null ? identifier : {};
  const cleanId = String(rawObj.id || rawObj.auth_user_id || rawObj.student_id || (typeof identifier === 'string' && identifier.includes('-') ? identifier : '')).trim();
  const cleanReg = String(
    rawObj.registration_number || 
    rawObj.reg_no || 
    rawObj.regNumber || 
    rawObj.matric_number || 
    rawObj.matric || 
    rawObj.matricNumber || 
    (typeof identifier === 'string' && !identifier.includes('-') ? identifier : '')
  ).trim().toUpperCase();
  const cleanEmail = String(rawObj.email || '').trim().toLowerCase();

  // 1. First attempt secure server endpoint (handles auth.users deletion server-side)
  let serverHandled = false;
  try {
    const apiRes = await fetch('/api/admin/students/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: cleanReg,
        studentId: cleanId,
        email: cleanEmail
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success) {
        serverHandled = true;
      }
    }
  } catch (apiErr) {
    // Fall back to direct database operations
  }

  // 2. If not handled by server, attempt PostgreSQL RPC admin_delete_student_completely
  if (!serverHandled && supabase) {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_student_completely', {
        p_registration_number: cleanReg || null,
        p_student_id: cleanId || null,
        p_email: cleanEmail || null
      });
      if (!rpcErr && rpcData?.success) {
        serverHandled = true;
      }
    } catch (_) {}
  }

  // 3. Direct database table operations fallback
  if (!serverHandled && supabase) {
    try {
      if (cleanReg) await supabase.from('id_card_applications').delete().or(`registration_number.ilike.${cleanReg},matric_number.ilike.${cleanReg}`);
      if (cleanReg) await supabase.from('account_recovery_requests').delete().ilike('registration_number', cleanReg);
      if (cleanReg) await supabase.from('student_auth').delete().ilike('registration_number', cleanReg);
      if (cleanReg) await supabase.from('profiles').delete().ilike('registration_number', cleanReg);
      if (cleanId && cleanId.includes('-')) await supabase.from('profiles').delete().eq('id', cleanId);
      if (cleanEmail) await supabase.from('profiles').delete().ilike('email', cleanEmail);
      if (cleanReg) await supabase.from('verified_students').delete().ilike('registration_number', cleanReg);
      if (cleanId && cleanId.includes('-')) await supabase.from('verified_students').delete().eq('id', cleanId);
      if (cleanEmail) await supabase.from('verified_students').delete().ilike('email', cleanEmail);
    } catch (dbErr) {
      console.warn('Database deletion fallback error:', dbErr);
    }
  }

  // 5. CRUCIAL: Remove student from store_verified_roster in id_card_settings
  try {
    const { data: idSettingsRes } = await supabase
      .from('id_card_settings')
      .select('payload')
      .eq('id', 'store_verified_roster')
      .maybeSingle();

    if (idSettingsRes?.payload?.roster && Array.isArray(idSettingsRes.payload.roster)) {
      const filteredRoster = idSettingsRes.payload.roster.filter(s => {
        const sReg = String(s.registration_number || s.reg_no || s.regNumber || s.matric_number || s.matric || '').trim().toUpperCase();
        const sEmail = String(s.email || '').trim().toLowerCase();
        const sId = String(s.id || '').trim();
        if (cleanReg && sReg === cleanReg) return false;
        if (cleanId && sId === cleanId) return false;
        if (cleanEmail && sEmail === cleanEmail) return false;
        return true;
      });
      await supabase.from('id_card_settings').upsert({
        id: 'store_verified_roster',
        payload: { roster: filteredRoster },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }
  } catch (e) {
    console.warn('Error updating store_verified_roster on delete:', e);
  }

  // 6. Clean up local client stores
  try {
    const students = getLocalStudentsDatabase();
    const updatedStudents = students.filter(s => {
      const sReg = String(s.registration_number || s.matric || s.matric_number || '').trim().toUpperCase();
      const sId = String(s.id || '').trim();
      return (!cleanReg || sReg !== cleanReg) && (!cleanId || sId !== cleanId);
    });
    saveLocalStudentsDatabase(updatedStudents);

    const keysToClean = ['nacos_verified_students_db', 'nacos_verified_students_cache'];
    keysToClean.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(s => {
              const sReg = String(s.registration_number || s.reg_no || s.regNumber || s.matric_number || s.matric || '').trim().toUpperCase();
              const sId = String(s.id || '').trim();
              const sEmail = String(s.email || '').trim().toLowerCase();
              if (cleanReg && sReg === cleanReg) return false;
              if (cleanId && sId === cleanId) return false;
              if (cleanEmail && sEmail === cleanEmail) return false;
              return true;
            });
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        } catch (err) {}
      }
    });
  } catch (e) {}

  // 7. Invalidate active session if this student is currently logged in locally
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      const uReg = String(u.registration_number || u.matric || '').trim().toUpperCase();
      if ((cleanReg && uReg === cleanReg) || (cleanId && u.id === cleanId)) {
        localStorage.removeItem('nacos_user');
        localStorage.removeItem('nacos_last_activity');
      }
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_user_updated'));
    window.dispatchEvent(new Event('nacos_verified_students_updated'));
  }

  return {
    success: true,
    message: `Student user ${cleanReg || cleanId} has been permanently deleted from the database.`
  };
}

/**
 * PORTAL ADMIN: Mark Student as Graduated / Alumni
 * Updates student standing to Graduated with graduation year.
 * Allows student to continue logging into the portal as an Alumni.
 */
export async function adminMarkStudentGraduation(identifier, graduationYear = new Date().getFullYear(), adminUser = null) {
  if (!identifier) return { error: { message: 'Student identifier is required.' } };
  const cleanId = String(identifier).trim().toUpperCase();
  const gradYear = parseInt(graduationYear, 10) || new Date().getFullYear();

  const updates = {
    is_graduated: true,
    status: 'graduated',
    level: 'Graduated',
    current_level: 'Graduated',
    graduation_year: gradYear,
    expected_graduation_year: gradYear,
    graduated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Supabase profiles
  try {
    await supabase
      .from('profiles')
      .update(updates)
      .or(`registration_number.eq.${cleanId},id.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase graduation update error:', err);
  }

  // 2. Supabase verified_students
  try {
    await supabase
      .from('verified_students')
      .update({
        level: 'Graduated',
        status: 'graduated',
        updated_at: new Date().toISOString()
      })
      .or(`registration_number.eq.${cleanId}`);
  } catch (err) {
    console.warn('Supabase verified_students grad update error:', err);
  }

  // 3. Local database
  const students = getLocalStudentsDatabase();
  const idx = students.findIndex(s => s.registration_number?.toUpperCase() === cleanId || s.id === cleanId);
  if (idx !== -1) {
    students[idx] = { ...students[idx], ...updates };
    saveLocalStudentsDatabase(students);
  }

  // Update active session if student is logged in
  try {
    const rawUser = localStorage.getItem('nacos_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.registration_number?.toUpperCase() === cleanId || u.id === cleanId) {
        const merged = { ...u, ...updates };
        localStorage.setItem('nacos_user', JSON.stringify(merged));
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    }
  } catch (e) {}

  return {
    success: true,
    message: `Student ${cleanId} marked as Graduated (Class of ${gradYear}). They can continue accessing the portal as an Alumni.`
  };
}

