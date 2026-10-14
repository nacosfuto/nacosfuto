import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  GraduationCap, 
  MapPin, 
  ChevronDown, 
  RotateCcw,
  Lock,
  ShieldAlert,
  AlertTriangle,
  Mail,
  ExternalLink,
  Info,
  X,
  Building2,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Award
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { supabase } from '@nacos/supabase';
import { getLocalStudentsDatabase, updateStudentProfile } from '@nacos/supabase/auth';
import { 
  calculateAcademicProgression, 
  getActiveAcademicSession, 
  onAcademicSessionChange 
} from '@nacos/config/academic';

// Helper to format student record directly from the database schema
const formatDatabaseStudent = (dbRecord, fallback = {}) => {
  if (!dbRecord && !fallback) return null;
  const safeFallback = (fallback && typeof fallback === 'object') ? fallback : {};
  const rec = (dbRecord && typeof dbRecord === 'object') ? dbRecord : safeFallback;

  let progression = {};
  try {
    progression = calculateAcademicProgression(rec) || {};
  } catch (_) {
    progression = {};
  }

  const fullName = String(
    rec.full_name || 
    rec.fullName || 
    rec.name || 
    safeFallback.full_name || 
    safeFallback.fullName || 
    safeFallback.name || 
    `${rec.surname || ''} ${rec.first_name || ''}`
  ).trim();

  const parts = fullName ? fullName.split(/\s+/) : [];
  const surname = rec.surname || rec.last_name || safeFallback.surname || (parts.length > 1 ? parts[0] : '');
  const firstName = rec.first_name || rec.firstName || safeFallback.firstName || (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '');
  
  const rawMatric = (
    rec.registration_number || 
    rec.matric_number || 
    rec.regNo || 
    rec.matric || 
    rec.studentId || 
    rec.student_id || 
    safeFallback.matric || 
    safeFallback.registration_number || 
    ''
  );
  const matric = String(rawMatric).trim().toUpperCase();

  const rawDept = rec.department || rec.dept || safeFallback.department || safeFallback.dept || 'Computer Science';
  const dept = typeof rawDept === 'string' ? rawDept : (rawDept?.name || 'Computer Science');
  const deptCode = rec.dept_code || (String(dept).toLowerCase().includes('software') ? 'SE' : 'CSC');
  
  const rawAvatar = rec.profile_photo_url || rec.avatar_url || rec.photo_url || safeFallback.profile_photo_url || safeFallback.avatar_url || '';
  const avatar = typeof rawAvatar === 'string'
    ? rawAvatar.trim()
    : (rawAvatar?.secure_url || rawAvatar?.url || rawAvatar?.src || '');

  const isGraduated = Boolean(progression.isGraduated);
  const currentLevel = progression.levelString || rec.level || safeFallback.level || '100 Level';
  const graduationYear = progression.expectedGraduationYear || rec.graduation_year || safeFallback.graduation_year || 2029;

  const rawSession = progression.academicSession || rec.academic_session || safeFallback.academic_session;
  const cleanSession = typeof rawSession === 'string'
    ? rawSession
    : (rawSession?.sessionName || rawSession?.session || getActiveAcademicSession());

  let extraMeta = {};
  const rawPhotoAlt = rec.photo_alt || safeFallback.photo_alt;
  if (rawPhotoAlt && typeof rawPhotoAlt === 'string' && rawPhotoAlt.trim().startsWith('{')) {
    try {
      extraMeta = JSON.parse(rawPhotoAlt);
    } catch (_) {}
  }

  const rawGender = rec.gender || extraMeta.gender || safeFallback.gender || 'M';
  const cleanGender = (String(rawGender).toUpperCase().startsWith('F') || String(rawGender).toLowerCase() === 'female') ? 'F' : 'M';

  return {
    id: rec.id || safeFallback.id || matric,
    surname: String(surname || ''),
    firstName: String(firstName || ''),
    name: fullName || `${surname} ${firstName}`.trim(),
    full_name: fullName,
    matric,
    studentId: matric,
    registration_number: matric,
    dept_code: deptCode,
    dept,
    department: dept,
    programme: String(rec.programme || safeFallback.programme || 'B.Tech Computer Science'),
    faculty: String(rec.faculty || safeFallback.faculty || 'School of Information & Communication Tech (SICT)'),
    email: String(rec.email || safeFallback.email || ''),
    phone: String(rec.phone_number || rec.phone || safeFallback.phone || safeFallback.phone_number || ''),
    dob: String(rec.date_of_birth || extraMeta.dob || rec.dob || safeFallback.dob || ''),
    dobFormatted: String(rec.date_of_birth || extraMeta.dob || rec.dobFormatted || rec.dob || safeFallback.dobFormatted || ''),
    address: String(rec.residential_address || extraMeta.address || rec.address || safeFallback.address || ''),
    bio: String(rec.bio || extraMeta.bio || safeFallback.bio || ''),
    institution: String(rec.institution || rec.university || safeFallback.institution || 'FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI, IMO STATE'),
    level: currentLevel,
    current_level: currentLevel,
    numeric_level: progression.numericLevel || 1,
    admission_year: progression.admissionYear || rec.admission_year || 2024,
    programme_duration: progression.programmeDuration || 5,
    is_graduated: isGraduated,
    status: isGraduated ? 'Graduated' : (rec.status || 'Active'),
    graduation_year: graduationYear,
    expected_graduation_year: graduationYear,
    class_of: progression.classOf || graduationYear,
    classOf: progression.classOf || graduationYear,
    class_of_display: progression.classOfDisplay || `Class of ${graduationYear}`,
    classOfDisplay: progression.classOfDisplay || `Class of ${graduationYear}`,
    academic_session: cleanSession,
    zone: String(rec.zone || extraMeta.zone || rec.state_of_origin || safeFallback.zone || 'South East'),
    gender: cleanGender,
    avatar_url: avatar,
    profile_photo_url: avatar,
    role: isGraduated ? 'Alumni Member' : (rec.role || safeFallback.role || 'Student Member'),
    is_active: rec.is_active !== undefined ? rec.is_active : true,
    is_registered: true
  };
};

// Initial session loader
const loadSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('nacos_user');
  if (stored) {
    try {
      return formatDatabaseStudent(JSON.parse(stored));
    } catch (e) {}
  }
  return null;
};

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [lockedError, setLockedError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Dynamic user state initialized from session or default
  const [user, setUser] = useState(() => {
    return loadSessionUser() || {
      surname: '',
      firstName: '',
      name: '',
      full_name: '',
      matric: '',
      studentId: '',
      registration_number: '',
      dept_code: 'CSC',
      dept: 'Computer Science',
      department: 'Computer Science',
      programme: 'B.Tech Computer Science',
      faculty: 'School of Information & Communication Tech (SICT)',
      email: '',
      phone: '',
      dob: '',
      dobFormatted: '',
      address: '',
      bio: '',
      institution: 'FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI, IMO STATE',
      level: '100 Level',
      current_level: '100 Level',
      admission_year: 2024,
      zone: 'South East',
      gender: 'M',
      avatar_url: '',
      profile_photo_url: '',
      role: 'Student Member',
      is_active: true
    };
  });

  // Authoritative reference of pristine database record
  const dbUserRef = useRef(user);

  // 1. Match ALL info on the profile to be directly from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchDatabaseProfile() {
      setIsLoadingDb(true);
      const stored = localStorage.getItem('nacos_user');
      let sessionUser = {};
      if (stored) {
        try {
          sessionUser = JSON.parse(stored);
        } catch (e) {}
      }

      const identifier = (
        sessionUser.registration_number || 
        sessionUser.matric || 
        sessionUser.regNo || 
        sessionUser.studentId || 
        sessionUser.email || 
        ''
      ).trim().toUpperCase();

      const userId = sessionUser.id;
      let authoritativeRecord = null;

      // 1. Query Supabase 'profiles' table (authoritative live database)
      if (supabase && (identifier || userId)) {
        try {
          let query = supabase.from('profiles').select('*');
          if (userId && /^[0-9a-fA-F-]{36}$/.test(userId)) {
            query = query.or(`id.eq.${userId},registration_number.eq.${identifier}`);
          } else if (identifier) {
            query = query.or(`registration_number.eq.${identifier},email.eq.${identifier.toLowerCase()}`);
          }
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            authoritativeRecord = data;
          }
        } catch (err) {
          console.warn('Supabase profiles query notice:', err);
        }
      }

      // 2. Query Supabase 'verified_students' if not yet synced to profiles
      if (!authoritativeRecord && supabase && identifier) {
        try {
          const { data, error } = await supabase
            .from('verified_students')
            .select('*')
            .eq('registration_number', identifier)
            .maybeSingle();
          if (!error && data) {
            authoritativeRecord = data;
          }
        } catch (err) {}
      }

      // 3. Query local students database fallback
      if (!authoritativeRecord && identifier) {
        try {
          const localList = getLocalStudentsDatabase();
          if (Array.isArray(localList)) {
            const found = localList.find(s => 
              s.registration_number?.toUpperCase() === identifier || 
              s.matric?.toUpperCase() === identifier || 
              s.email?.toLowerCase() === identifier.toLowerCase()
            );
            if (found) authoritativeRecord = found;
          }
        } catch (err) {}
      }

      if (isMounted) {
        const resolved = formatDatabaseStudent(authoritativeRecord, sessionUser);
        if (resolved) {
          setUser(resolved);
          dbUserRef.current = resolved;
          // Synchronize localStorage with the fresh authoritative database record
          localStorage.setItem('nacos_user', JSON.stringify(resolved));
        }
        setIsLoadingDb(false);
      }
    }

    fetchDatabaseProfile();
    return () => { isMounted = false; };
  }, []);

  // Listen for real-time academic session changes across the app
  useEffect(() => {
    const unsubscribe = onAcademicSessionChange(() => {
      if (dbUserRef.current) {
        const refreshed = formatDatabaseStudent(dbUserRef.current);
        if (refreshed) {
          setUser(refreshed);
          dbUserRef.current = refreshed;
          try {
            localStorage.setItem('nacos_user', JSON.stringify(refreshed));
          } catch (_) {}
        }
      }
    });
    return unsubscribe;
  }, []);

  // Handle Save: Persist specific student profile fields (Gender, Phone, Address, DOB, Bio, Zone)
  // Maintains strict lock on institutional academic bio-data (Official Name, Matric, Dept, Level)
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setLockedError(null);
    setSaveSuccess(null);

    const pristine = dbUserRef.current || {};

    // Check if user attempted to alter locked academic records
    const attemptedLockedChange = 
      (user.surname && user.surname !== pristine.surname) ||
      (user.firstName && user.firstName !== pristine.firstName) ||
      (user.matric && user.matric !== pristine.matric) ||
      (user.studentId && user.studentId !== pristine.studentId) ||
      (user.department && user.department !== pristine.department) ||
      (user.dept && user.dept !== pristine.dept) ||
      (user.institution && user.institution !== pristine.institution);

    // Revert official academic records to authoritative values
    const sanitizedUser = {
      ...user,
      surname: pristine.surname || user.surname,
      firstName: pristine.firstName || user.firstName,
      name: pristine.name || user.name,
      full_name: pristine.full_name || user.full_name,
      matric: pristine.matric || user.matric,
      studentId: pristine.studentId || user.studentId,
      registration_number: pristine.registration_number || user.registration_number,
      department: pristine.department || user.department,
      dept: pristine.dept || user.dept,
      institution: pristine.institution || user.institution,
      level: pristine.level || user.level,
      current_level: pristine.current_level || user.current_level,
      admission_year: pristine.admission_year || user.admission_year,
      programme: pristine.programme || user.programme,
      faculty: pristine.faculty || user.faculty
    };

    const targetId = sanitizedUser.matric || sanitizedUser.registration_number || sanitizedUser.id;
    const cleanGender = (String(sanitizedUser.gender).toUpperCase().startsWith('F') || String(sanitizedUser.gender).toLowerCase() === 'female') ? 'F' : 'M';
    sanitizedUser.gender = cleanGender;

    const updates = {
      gender: cleanGender,
      phone: sanitizedUser.phone || '',
      phone_number: sanitizedUser.phone || '',
      dob: sanitizedUser.dobFormatted || sanitizedUser.dob || '',
      date_of_birth: sanitizedUser.dobFormatted || sanitizedUser.dob || '',
      address: sanitizedUser.address || '',
      residential_address: sanitizedUser.address || '',
      bio: sanitizedUser.bio || '',
      zone: sanitizedUser.zone || 'South East'
    };

    try {
      const res = await updateStudentProfile(targetId, updates);
      const savedUser = res?.data ? { ...sanitizedUser, ...res.data } : sanitizedUser;
      
      setUser(savedUser);
      dbUserRef.current = savedUser;
      setIsEditing(false);

      if (attemptedLockedChange) {
        setSaveSuccess('Specific profile details (Gender, Contact & Bio) have been updated successfully! Note: Official academic bio-data (Name, Matric No, Department) remains protected under departmental authority.');
      } else {
        setSaveSuccess('Profile updated successfully! Your default gender and personal details have been saved.');
      }
      setTimeout(() => setSaveSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to save profile updates:', err);
      setLockedError('Failed to save profile updates. Please verify your connection and try again.');
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Photo Click/Upload Attempt: Also locked after initial registration
  const handlePhotoClick = (e) => {
    e.preventDefault();
    setLockedError(
      'Profile Photo Locked: Official passport photographs cannot be changed after initial registration. Please contact the departmental administrator at support@nacosfuto.com.ng or visit the NACOS Secretariat with your school ID to request a verified photo update.'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayName = (user?.full_name || user?.name || `${user?.surname || ''} ${user?.firstName || ''}`).trim() || 'Student Profile';
  const displayMatric = user?.matric || user?.studentId || user?.registration_number || 'Not Set';
  const displayInitials = displayName
    .split(/\s+/)
    .map(w => w ? w[0] : '')
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  const rawAvatarUrl = user?.profile_photo_url || user?.avatar_url || user?.passport_url || user?.photo_url || user?.avatar;
  let cleanAvatarUrl = '';
  if (typeof rawAvatarUrl === 'string') {
    cleanAvatarUrl = rawAvatarUrl.trim();
  } else if (rawAvatarUrl && typeof rawAvatarUrl === 'object') {
    cleanAvatarUrl = rawAvatarUrl.secure_url || rawAvatarUrl.url || rawAvatarUrl.src || '';
  }

  const avatarUrl = cleanAvatarUrl
    ? (cleanAvatarUrl.startsWith('data:') || cleanAvatarUrl.startsWith('blob:')
        ? cleanAvatarUrl
        : `${cleanAvatarUrl}${cleanAvatarUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(user?.photo_updated_at || user?.updated_at || '1'))}`)
    : null;

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* ─── Profile Update Success Banner ─── */}
        {saveSuccess && (
          <div className="rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/40 p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-green-900 dark:text-green-200">
                  Profile Updated Successfully
                </h3>
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-300/90 mt-1 leading-relaxed">
                  {saveSuccess}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccess(null)}
                className="text-xs font-semibold text-green-700 dark:text-green-300 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ─── Profile Update Locked Error Banner ─── */}
        {lockedError && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-red-900 dark:text-red-200">
                    Profile Modification Locked
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200">
                    Admin Clearance Required
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300/90 mt-1.5 leading-relaxed">
                  {lockedError}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-red-200/80 dark:border-red-900/50">
                  <a
                    href={`mailto:support@nacosfuto.com.ng?subject=Bio-Data%20Update%20Request%20-%20${encodeURIComponent(displayMatric)}&body=Dear%20NACOS%20Administrator,%0A%0AI%20am%20requesting%20an%20official%20update%20to%20my%20student%20bio-data%20records:%0A-%20Student%20Name:%20${encodeURIComponent(displayName)}%0A-%20Reg%20Number:%20${encodeURIComponent(displayMatric)}%0A-%20Department:%20${encodeURIComponent(user?.dept || user?.department || 'Computer Science')}%0A%0AChanges%20Requested:%0A[Please%20specify%20changes%20here]%0A%0AThank%20you.`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Admin</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setLockedError(null)}
                    className="text-xs font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
                  >
                    Dismiss Notice
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLockedError(null)}
                className="text-red-400 hover:text-red-700 dark:hover:text-red-200 p-1 cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Top Header Card (Authoritative Database Information) ─── */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          
          {/* Avatar & Core Profile Summary */}
          <div className="flex items-center space-x-4 sm:space-x-5">
            
            {/* Avatar Container with Camera Overlay */}
            <div 
              onClick={handlePhotoClick}
              className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#138601]/30 bg-gray-100 dark:bg-[#041801] shadow-xs group cursor-pointer"
              title="Profile photo is locked after registration — contact admin to update"
            >
              {avatarUrl ? (
                <img 
                  key={avatarUrl}
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full flex items-center justify-center bg-[#138601] text-white font-bold text-2xl ${avatarUrl ? 'hidden' : ''}`}
              >
                {displayInitials}
              </div>
              
              {/* Camera Icon Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-2 rounded-full bg-white/90 text-gray-900 shadow">
                  <Lock className="w-3.5 h-3.5 text-red-600" />
                </div>
              </div>
            </div>

            {/* Student Name, ID & Database Badges */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {displayName}
                </h2>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-green-200/80 font-mono">
                {displayMatric} • {user.dept_code || 'CSC'} • {user.programme}
              </p>
              
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-xs">
                {/* Level / Alumni Badge */}
                {user.is_graduated || user.level === 'Graduated' ? (
                  <span className="px-3 py-1 rounded-md text-xs font-bold border border-purple-300 dark:border-purple-600/40 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 flex items-center gap-1.5 shadow-xs">
                    <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Status: Graduated • {user.class_of_display || `Class of ${user.class_of || user.graduation_year || '2026'}`}</span>
                  </span>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-md text-xs font-semibold border border-green-200 dark:border-[#138601]/40 text-[#138601] dark:text-[#4bd043] bg-green-50/60 dark:bg-[#138601]/10 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Level: {user.level || user.current_level || '100 Level'}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5">
                      Session: {typeof user?.academic_session === 'string' ? user.academic_session : (user?.academic_session?.sessionName || user?.academic_session?.session || '2026/2027')}
                    </span>
                  </>
                )}

                {/* Institution Badge */}
                <span className="text-xs font-semibold uppercase tracking-wide text-[#138601] dark:text-[#4bd043] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[280px] sm:max-w-none">{String(user?.institution || 'FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI')}</span>
                </span>

                {/* Gender Badge */}
                <span className="px-2.5 py-1 rounded-md border border-green-200 dark:border-[#138601]/40 text-xs font-bold text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                  Gender: {user.gender === 'F' || user.gender === 'Female' ? 'Female (F)' : 'Male (M)'}
                </span>
              </div>
            </div>

          </div>

          {/* Action Button: Allows user to click Edit and modify text in form, but Save triggers the administrator lock error */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            {isEditing && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Protected Record</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setLockedError(null);
                  setIsEditing(true);
                }
              }}
              className={`px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#138601] hover:bg-[#0f6c01] text-white'
              }`}
            >
              {isEditing ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              ) : (
                <span>Edit Profile</span>
              )}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  // Revert changes on cancel
                  if (dbUserRef.current) setUser({ ...dbUserRef.current });
                  setIsEditing(false);
                }}
                className="px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

        </div>

        {/* ─── Two-Column Form Cards (Authoritative Database Information) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Personal Information */}
          <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/70 mt-0.5">Authoritative student bio-data from database</p>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-green-200/60 font-mono">
                {isEditing ? 'Editing Mode (Locked on Save)' : 'Read-Only Record'}
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              
              {/* Surname & First Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Surname</label>
                  <input
                    type="text"
                    value={user.surname}
                    disabled={!isEditing}
                    placeholder="Enter surname"
                    onChange={(e) => setUser({ ...user, surname: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={user.firstName}
                    disabled={!isEditing}
                    placeholder="Enter first name"
                    onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled={!isEditing}
                  placeholder="student@futo.edu.ng"
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors font-mono"
                />
              </div>

              {/* Phone Number & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={user.phone}
                    disabled={!isEditing}
                    placeholder="080XXXXXXXX"
                    onChange={(e) => setUser({ ...user, phone: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Gender</label>
                  <div className="relative">
                    <select
                      value={user.gender || 'M'}
                      disabled={!isEditing}
                      onChange={(e) => setUser({ ...user, gender: e.target.value })}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 cursor-pointer font-medium"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Date of Birth</label>
                <input
                  type="text"
                  value={user.dobFormatted || user.dob}
                  disabled={!isEditing}
                  placeholder="MM/DD/YYYY"
                  onChange={(e) => setUser({ ...user, dobFormatted: e.target.value, dob: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Residential Address</label>
                <input
                  type="text"
                  value={user.address}
                  disabled={!isEditing}
                  placeholder="Enter residential address"
                  onChange={(e) => setUser({ ...user, address: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Student Bio</label>
                <textarea
                  rows={3}
                  value={user.bio}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself, technical specializations, or campus roles..."
                  onChange={(e) => setUser({ ...user, bio: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 resize-y transition-colors"
                />
              </div>

            </div>
          </div>

          {/* Card 2: Academic Information */}
          <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Academic Information</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/70 mt-0.5">Verified Departmental enrollment records</p>
            </div>

            <div className="space-y-3.5 pt-2">
              
              {/* Institution */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Institution</label>
                <input
                  type="text"
                  value={user.institution}
                  disabled={!isEditing}
                  onChange={(e) => setUser({ ...user, institution: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-gray-50/80 dark:bg-[#041801]/80 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                />
              </div>

              {/* Student ID / Matric Number */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Registration Number / Student ID</label>
                <input
                  type="text"
                  value={user.studentId || user.matric}
                  disabled={!isEditing}
                  placeholder="e.g. 20241450682"
                  onChange={(e) => setUser({ ...user, studentId: e.target.value, matric: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-gray-50/80 dark:bg-[#041801]/80 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 font-mono font-semibold transition-colors"
                />
              </div>

              {/* Academic Level & Progression */}
              {user.is_graduated || user.level === 'Graduated' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Academic Status</label>
                    <div className="px-3.5 py-2.5 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-950/40 font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Status: Graduated</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Cohort Graduation</label>
                    <div className="px-3.5 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40 font-bold text-xs text-amber-800 dark:text-amber-300">
                      {user.class_of_display || `Class of ${user.class_of || user.graduation_year}`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Current Academic Level</label>
                    <div className="px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-gray-50/80 dark:bg-[#041801]/80 text-gray-900 dark:text-white font-bold text-xs flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#138601] shrink-0" />
                      <span>Level: {user.level || user.current_level}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Academic Session</label>
                    <div className="px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-gray-50/80 dark:bg-[#041801]/80 text-gray-900 dark:text-white font-semibold text-xs flex items-center gap-2">
                      <span>Session: {user.academic_session}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Department</label>
                <div className="relative">
                  <select
                    value={user.dept || user.department}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const code = newDept.toLowerCase().includes('software') ? 'SE' : 'CSC';
                      setUser({ ...user, dept: newDept, department: newDept, dept_code: code });
                    }}
                    className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 cursor-pointer"
                  >
                    <option value="Computer Science">Department of Computer Science</option>
                    <option value="Software Engineering">Department of Software Engineering</option>
                    <option value="Cyber Security">Department of Cyber Security</option>
                    <option value="Information Technology">Department of Information Technology</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Zone */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Geopolitical Zone / Origin</label>
                <div className="relative">
                  <select
                    value={user.zone}
                    disabled={!isEditing}
                    onChange={(e) => setUser({ ...user, zone: e.target.value })}
                    className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 cursor-pointer"
                  >
                    <option value="South East">South East</option>
                    <option value="South South">South South</option>
                    <option value="South West">South West</option>
                    <option value="North Central">North Central</option>
                    <option value="North East">North East</option>
                    <option value="North West">North West</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Faculty & Programme Readonly Footprint */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#041801]/50 border border-gray-200/60 dark:border-[#138601]/20">
                  <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Faculty</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate">{user.faculty}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#041801]/50 border border-gray-200/60 dark:border-[#138601]/20">
                  <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Programme</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate">{user.programme}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </PortalLayout>
  );
};

export default Profile;
