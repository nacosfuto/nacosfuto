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
import { getLocalStudentsDatabase } from '@nacos/supabase/auth';

// Helper to format student record directly from the database schema
const formatDatabaseStudent = (dbRecord, fallback = {}) => {
  if (!dbRecord && !fallback) return null;
  const rec = dbRecord || fallback;
  const isGraduated = Boolean(rec.is_graduated || rec.status === 'graduated' || rec.level === 'Graduated' || fallback.is_graduated || fallback.level === 'Graduated');
  const graduationYear = rec.graduation_year || fallback.graduation_year || (isGraduated ? 2026 : null);
  const fullName = (
    rec.full_name || 
    rec.fullName || 
    rec.name || 
    fallback.full_name || 
    fallback.fullName || 
    fallback.name || 
    `${rec.surname || ''} ${rec.first_name || ''}`
  ).trim();

  const parts = fullName ? fullName.split(/\s+/) : [];
  const surname = rec.surname || rec.last_name || fallback.surname || (parts.length > 1 ? parts[0] : '');
  const firstName = rec.first_name || rec.firstName || fallback.firstName || (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '');
  const matric = (
    rec.registration_number || 
    rec.matric_number || 
    rec.regNo || 
    rec.matric || 
    rec.studentId || 
    rec.student_id || 
    fallback.matric || 
    fallback.registration_number || 
    ''
  ).toUpperCase();

  const dept = rec.department || rec.dept || fallback.department || fallback.dept || 'Computer Science';
  const deptCode = rec.dept_code || (dept.toLowerCase().includes('software') ? 'SE' : 'CSC');
  const avatar = rec.profile_photo_url || rec.avatar_url || rec.photo_url || fallback.profile_photo_url || fallback.avatar_url || '';
  const admissionYear = parseInt(rec.admission_year || fallback.admission_year || 2024, 10);
  const currentLevel = isGraduated
    ? 'Graduated'
    : (rec.current_level || rec.level || fallback.current_level || fallback.level || 
      (admissionYear ? `${Math.min(5, Math.max(1, 2026 - admissionYear + 1))}00 Level` : '100 Level'));

  return {
    id: rec.id || fallback.id || matric,
    surname,
    firstName,
    name: fullName || `${surname} ${firstName}`.trim(),
    full_name: fullName,
    matric,
    studentId: matric,
    registration_number: matric,
    dept_code: deptCode,
    dept,
    department: dept,
    programme: rec.programme || fallback.programme || 'B.Tech Computer Science',
    faculty: rec.faculty || fallback.faculty || 'School of Information & Communication Tech (SICT)',
    email: rec.email || fallback.email || '',
    phone: rec.phone_number || rec.phone || fallback.phone || fallback.phone_number || '',
    dob: rec.date_of_birth || rec.dob || fallback.dob || '',
    dobFormatted: rec.date_of_birth || rec.dobFormatted || rec.dob || fallback.dobFormatted || '',
    address: rec.residential_address || rec.address || fallback.address || '',
    bio: rec.bio || fallback.bio || '',
    institution: rec.institution || rec.university || fallback.institution || 'FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI, IMO STATE',
    level: currentLevel,
    current_level: currentLevel,
    admission_year: admissionYear,
    is_graduated: isGraduated,
    graduation_year: graduationYear,
    zone: rec.zone || rec.state_of_origin || fallback.zone || 'South East',
    gender: rec.gender || fallback.gender || 'M',
    avatar_url: avatar,
    profile_photo_url: avatar,
    role: isGraduated ? 'Alumni Member' : (rec.role || fallback.role || 'Student Member'),
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

  // Handle Save Attempt: Disallow updating profile after initial registration
  // Allows user to edit text in fields while in edit mode, but once Save is clicked,
  // rejects the changes and displays an error instructing the student to contact the administrator.
  const handleSave = (e) => {
    if (e) e.preventDefault();
    
    // 1. Reject save - do not write to database or localStorage
    // 2. Revert any in-flight form edits back to authoritative database profile
    if (dbUserRef.current) {
      setUser({ ...dbUserRef.current });
    }
    
    // 3. Exit edit mode
    setIsEditing(false);

    // 4. Set explicit administrator contact error
    setLockedError(
      'Profile Update Locked: Official student bio-data cannot be updated after initial registration. Changes to your full name, registration number, department, or academic records require administrative clearance. Please contact the departmental administrator at nacosfuto@gmail.com or visit the NACOS Secretariat.'
    );

    // Scroll to the error alert for immediate user feedback
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Photo Click/Upload Attempt: Also locked after initial registration
  const handlePhotoClick = (e) => {
    e.preventDefault();
    setLockedError(
      'Profile Photo Locked: Official passport photographs cannot be changed after initial registration. Please contact the departmental administrator at nacosfuto@gmail.com or visit the NACOS Secretariat with your school ID to request a verified photo update.'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayName = (user.full_name || user.name || `${user.surname} ${user.firstName}`).trim() || 'Student Profile';
  const displayMatric = user.matric || user.studentId || 'Not Set';
  const displayInitials = displayName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  return (
    <PortalLayout>
      <div className="space-y-6">

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
                    href={`mailto:nacosfuto@gmail.com?subject=Bio-Data%20Update%20Request%20-%20${encodeURIComponent(displayMatric)}&body=Dear%20NACOS%20Administrator,%0A%0AI%20am%20requesting%20an%20official%20update%20to%20my%20student%20bio-data%20records:%0A-%20Student%20Name:%20${encodeURIComponent(displayName)}%0A-%20Reg%20Number:%20${encodeURIComponent(displayMatric)}%0A-%20Department:%20${encodeURIComponent(user.dept)}%0A%0AChanges%20Requested:%0A[Please%20specify%20changes%20here]%0A%0AThank%20you.`}
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
              {user.profile_photo_url || user.avatar_url ? (
                <img 
                  src={user.profile_photo_url || user.avatar_url} 
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
                className={`w-full h-full flex items-center justify-center bg-[#138601] text-white font-bold text-2xl ${user.profile_photo_url || user.avatar_url ? 'hidden' : ''}`}
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 dark:bg-[#138601]/20 text-[#138601] dark:text-[#4bd043] border border-green-200 dark:border-[#138601]/30" title="Verified Database Account">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Database Record</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-green-200/80 font-mono">
                {displayMatric} • {user.dept_code || 'CSC'} • {user.programme}
              </p>
              
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-xs">
                {/* Level / Alumni Badge */}
                {user.is_graduated || user.level === 'Graduated' ? (
                  <span className="px-3 py-1 rounded-md text-xs font-bold border border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-1.5 shadow-xs">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Alumni • Class of {user.graduation_year || '2026'}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-md text-xs font-semibold border border-green-200 dark:border-[#138601]/40 text-[#138601] dark:text-[#4bd043] bg-green-50/60 dark:bg-[#138601]/10 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{user.level || user.current_level || '100 Level'}</span>
                  </span>
                )}

                {/* Institution Badge */}
                <span className="text-xs font-semibold uppercase tracking-wide text-[#138601] dark:text-[#4bd043] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[280px] sm:max-w-none">{user.institution}</span>
                </span>

                {/* Gender Badge */}
                <span className="px-2.5 py-1 rounded-md border border-green-200 dark:border-[#138601]/40 text-xs font-bold text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                  Gender: {user.gender || 'M'}
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

              {/* Phone Number & Date of Birth */}
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

              {/* Current Level */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1.5">Current Academic Level</label>
                <div className="relative">
                  <select
                    value={user.level || user.current_level}
                    disabled={!isEditing}
                    onChange={(e) => setUser({ ...user, level: e.target.value, current_level: e.target.value })}
                    className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] disabled:bg-gray-50/70 dark:disabled:bg-[#041801]/60 disabled:text-gray-700 dark:disabled:text-gray-200 cursor-pointer"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                    <option value="Graduated">Graduated / Alumni</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

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
