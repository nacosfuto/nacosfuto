import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CreditCard,
  BookOpen,
  User,
  ArrowUpRight,
  CheckCircle,
  BadgeCheck,
  TrendingUp,
  Info,
  BarChart3,
  Wallet,
  Coins,
  Banknote,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { 
  supabase, 
  getLocalPaymentsDatabase, 
  fetchResultsForStudent, 
  fetchCourses, 
  getDepartmentalDuesFee,
  getIdCardSettings,
  initAcademicSessionSync,
  getCachedStudentClearance,
  getStudentClearanceSummary,
  invalidateStudentDataCache
} from '@nacos/supabase';
import { enrichStudentProfile } from '@nacos/supabase/auth';
import { 
  calculateAcademicProgression, 
  getActiveAcademicSession, 
  getStudentApplicableLevelSessions,
  onAcademicSessionChange 
} from '@nacos/config/academic';

const Dashboard = () => {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) { }
      }
    }
    return {};
  });

  const navigate = useNavigate();

  // Instant synchronous cache pre-load to eliminate ₦0 and unverified state flashes
  const initialCache = getCachedStudentClearance(user);

  const [isPaid, setIsPaid] = useState(() => initialCache?.isPaid ?? false);
  const [verified, setVerified] = useState(false); // true once DB confirms student exists
  const [totalLifetimePayments, setTotalLifetimePayments] = useState(() => initialCache?.totalPaid ?? null);
  const [totalPayable, setTotalPayable] = useState(() => initialCache?.totalPayable ?? null);
  const [pendingObligationsCount, setPendingObligationsCount] = useState(() => initialCache?.pendingObligationsCount ?? 0);
  const [coursesCount, setCoursesCount] = useState(() => initialCache?.coursesCount ?? null);
  const [resultsPublishedCount, setResultsPublishedCount] = useState(() => initialCache?.resultsPublishedCount ?? null);
  const [statsLoading, setStatsLoading] = useState(() => !initialCache);
  const [statsError, setStatsError] = useState(false);

  const [levelClearanceMatrix, setLevelClearanceMatrix] = useState(() => initialCache?.levelClearanceMatrix ?? {
    '100': { dues: false, duesAmount: 0, idCard: false },
    '200': { dues: false, duesAmount: 0, idCard: false },
    '300': { dues: false, duesAmount: 0, idCard: false },
    '400': { dues: false, duesAmount: 0, idCard: false },
    '500': { dues: false, duesAmount: 0, idCard: false }
  });

  const deriveLevelNum = (u) => {
    if (!u) return '100';
    const prog = calculateAcademicProgression(u);
    if (prog && prog.valid && prog.numericLevel) {
      return String(prog.numericLevel * 100);
    }
    const raw = String(u?.level || u?.current_level || '100');
    const match = raw.match(/\d{3}/);
    return match ? match[0] : '100';
  };

  const studentLevelNum = deriveLevelNum(user);

  // Authoritatively load student payment history and level-by-level clearance from database cache service
  const loadStudentClearanceHistory = async (currentUser, { forceRefresh = false } = {}) => {
    try {
      const summary = await getStudentClearanceSummary(currentUser, { forceRefresh });
      if (summary) {
        if (summary.totalPaid !== null) setTotalLifetimePayments(summary.totalPaid);
        if (summary.totalPayable !== null) setTotalPayable(summary.totalPayable);
        setPendingObligationsCount(summary.pendingObligationsCount ?? 0);
        if (summary.levelClearanceMatrix) setLevelClearanceMatrix(summary.levelClearanceMatrix);
        setIsPaid(Boolean(summary.isPaid));
        if (summary.coursesCount !== null) setCoursesCount(summary.coursesCount);
        if (summary.resultsPublishedCount !== null) setResultsPublishedCount(summary.resultsPublishedCount);
        setStatsLoading(false);
        setStatsError(Boolean(summary.isError));
      }
    } catch (e) {
      console.warn('Dashboard loadStudentClearanceHistory error:', e);
      setStatsLoading(false);
      setStatsError(true);
    }
  };

  // Verify student exists in Supabase database & sync live profile
  const verifyStudentInDatabase = async (currentUser) => {
    const regNo = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber;
    const userId = currentUser?.id;

    if (!regNo && !userId) {
      // Empty session object — return to login
      localStorage.removeItem('nacos_user');
      localStorage.removeItem('nacos_last_activity');
      navigate('/login', { replace: true });
      return false;
    }

    try {
      const strippedRegNo = String(regNo || '').replace(/[^a-zA-Z0-9]/g, '');
      const cleanReg = String(regNo || '').trim();

      // Build search query across multiple potential identifiers in profiles
      let query = supabase.from('profiles').select('id, full_name, first_name, middle_name, last_name, surname, email, phone_number, registration_number, matric_number, department, faculty, programme, programme_duration, admission_year, role, is_active, status, gender, date_of_birth, residential_address, bio, zone, cloudinary_public_id, photo_url, photo_alt, created_at, updated_at').limit(1);

      const filterConditions = [];
      if (userId && /^[0-9a-fA-F-]{36}$/.test(userId)) {
        filterConditions.push(`id.eq.${userId}`);
      }
      if (cleanReg) {
        filterConditions.push(`registration_number.ilike.${cleanReg}`);
        filterConditions.push(`matric_number.ilike.${cleanReg}`);
      }
      if (strippedRegNo && strippedRegNo !== cleanReg) {
        filterConditions.push(`registration_number.ilike.${strippedRegNo}`);
        filterConditions.push(`matric_number.ilike.${strippedRegNo}`);
      }
      if (currentUser?.email) {
        filterConditions.push(`email.ilike.${currentUser.email.trim()}`);
      }

      if (filterConditions.length > 0) {
        query = query.or(filterConditions.join(','));
      }

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB verify timeout')), 3000));
      const { data } = await Promise.race([query.maybeSingle(), timeoutPromise]);

      if (data) {
        if (data.is_active === false) {
          // Account exists but has been explicitly deactivated by administration
          localStorage.removeItem('nacos_user');
          localStorage.removeItem('nacos_last_activity');
          navigate('/login?reason=deactivated', { replace: true });
          return false;
        }

        // Merge latest live Supabase database attributes with user state and authoritatively enrich progression
        const mergedUser = enrichStudentProfile({ ...currentUser, ...data }) || { ...currentUser, ...data };
        setUser(mergedUser);
        localStorage.setItem('nacos_user', JSON.stringify(mergedUser));
        await loadStudentClearanceHistory(mergedUser);
        setVerified(true);
        return true;
      }

      // If not found in profiles (e.g. legacy registered student, verified roster, or RLS restriction):
      // NEVER bounce out an already authenticated student! Preserve their valid session and enrich profile.
      const enrichedUser = enrichStudentProfile(currentUser) || currentUser;
      setUser(enrichedUser);
      localStorage.setItem('nacos_user', JSON.stringify(enrichedUser));
      await loadStudentClearanceHistory(enrichedUser);
      setVerified(true);
      return true;
    } catch (err) {
      console.warn('DB verification network notice:', err);
      const enrichedUser = enrichStudentProfile(currentUser) || currentUser;
      setUser(enrichedUser);
      await loadStudentClearanceHistory(enrichedUser);
      setVerified(true);
      return true;
    }
  };

  useEffect(() => {
    initAcademicSessionSync();
    const handleUserUpdate = async () => {
      const stored = localStorage.getItem('nacos_user');
      if (!stored) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        await verifyStudentInDatabase(parsed);
      } catch (e) {
        console.error(e);
      }
    };

    handleUserUpdate();
    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);

    const handleCacheInvalidated = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          loadStudentClearanceHistory(parsed, { forceRefresh: true });
        } catch (_) {}
      }
    };
    window.addEventListener('nacos_student_cache_invalidated', handleCacheInvalidated);

    const unsubSession = onAcademicSessionChange(() => {
      invalidateStudentDataCache();
      handleUserUpdate();
    });

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
      window.removeEventListener('nacos_student_cache_invalidated', handleCacheInvalidated);
      if (unsubSession) unsubSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFirstName = () => {
    if (user.firstName && !user.firstName.toLowerCase().includes('president')) return user.firstName;
    if (user.first_name && !user.first_name.toLowerCase().includes('president')) return user.first_name;
    const fullName = (user.full_name || user.fullName || user.name || '').trim();
    if (fullName.toLowerCase().includes('president') || fullName.toLowerCase().includes('irechukwu')) {
      return 'Emmanuel';
    }
    if (fullName) {
      const parts = fullName.split(/\s+/);
      return parts[0] || 'Student';
    }
    return 'Student';
  };

  const firstName = getFirstName();

  // Dynamic course display
  const getCoursesCount = () => {
    if (isGraduated) return 'Degree Conferred (B.Tech)';
    if (coursesCount !== null && coursesCount > 0) return `${coursesCount} Courses Synced`;
    return 'FUTO Portal Enrolment';
  };

  // Dynamic published results display
  const getResultsCount = () => {
    if (isGraduated) return 'Complete Graduate Record';
    if (resultsPublishedCount !== null && resultsPublishedCount > 0) {
      return `${resultsPublishedCount} ${resultsPublishedCount === 1 ? 'Semester' : 'Semesters'} Published`;
    }
    return 'Awaiting Senate Release';
  };

  const isGraduated = Boolean(user.is_graduated || user.level === 'Graduated' || user.status === 'graduated');
  const graduationYear = user.graduation_year || user.expected_graduation_year || new Date().getFullYear();
  const isRevoked = String(user.payment_status).toLowerCase() === 'revoked';

  return (
    <PortalLayout>
      <div className="space-y-6 font-sans">

        {/* Top Header: Clean, open Welcome greeting */}
        <div className="pt-1 pb-1 text-left">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Welcome Back, {firstName}!
          </h1>
        </div>

        {/* Revocation Warning Alert if Dues are Revoked */}
        {isRevoked && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 flex items-center justify-between gap-3 text-red-900 dark:text-red-200 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>
                <strong>Clearance Revoked:</strong> Your departmental dues clearance was officially revoked by administration. A new dues payment is required to restore your clearance.
              </span>
            </div>
            <Link
              to="/dues"
              className="px-3 py-1.5 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-colors shrink-0"
            >
              Pay Dues Now
            </Link>
          </div>
        )}

        {/* Financial & Academic Summary Metric Cards (Web Standard Rectangular Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Total Payable (Amount Student is Owing) */}
          <Link
            to={Number(totalPayable || 0) > 0 ? (isPaid ? "/id-card" : "/dues") : "/dues"}
            className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] hover:shadow-md transition-all flex items-center justify-between shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-green-200/70 block">
                Total Payable
              </span>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {statsLoading && totalPayable === null ? (
                  <div className="h-7 w-28 bg-gray-200 dark:bg-green-900/40 rounded-lg animate-pulse" />
                ) : statsError && totalPayable === null ? (
                  <span className="text-base font-semibold text-gray-400">Unavailable</span>
                ) : (
                  `₦${Number(totalPayable || 0).toLocaleString()}`
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-green-200/60 block">
                {statsLoading && totalPayable === null ? (
                  <div className="h-3 w-20 bg-gray-200 dark:bg-green-900/30 rounded mt-1 animate-pulse" />
                ) : statsError && totalPayable === null ? (
                  <span className="text-red-500 font-semibold">• Retry later</span>
                ) : Number(totalPayable || 0) > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">• Action required</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• All dues cleared</span>
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center shrink-0 border border-gray-200/60 dark:border-[#138601]/30 group-hover:scale-105 group-hover:bg-[#138601] group-hover:text-white transition-all shadow-2xs">
              <Coins className="w-6 h-6" />
            </div>
          </Link>

          {/* Card 2: Total Paid */}
          <Link
            to="/receipt"
            className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] hover:shadow-md transition-all flex items-center justify-between shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-green-200/70 block">
                Total Paid
              </span>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {statsLoading && totalLifetimePayments === null ? (
                  <div className="h-7 w-28 bg-gray-200 dark:bg-green-900/40 rounded-lg animate-pulse" />
                ) : statsError && totalLifetimePayments === null ? (
                  <span className="text-base font-semibold text-gray-400">Unavailable</span>
                ) : (
                  `₦${Number(totalLifetimePayments || 0).toLocaleString()}`
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-green-200/60 block">
                {statsLoading && totalLifetimePayments === null ? (
                  <div className="h-3 w-20 bg-gray-200 dark:bg-green-900/30 rounded mt-1 animate-pulse" />
                ) : (
                  "Verified receipts"
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center shrink-0 border border-gray-200/60 dark:border-[#138601]/30 group-hover:scale-105 group-hover:bg-[#138601] group-hover:text-white transition-all shadow-2xs">
              <Banknote className="w-6 h-6" />
            </div>
          </Link>

          {/* Card 3: Courses Registered */}
          <Link
            to="/courses"
            className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] hover:shadow-md transition-all flex items-center justify-between shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-green-200/70 block">
                Courses Registered
              </span>
              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {statsLoading && coursesCount === null ? (
                  <div className="h-6 w-32 bg-gray-200 dark:bg-green-900/40 rounded-lg animate-pulse" />
                ) : (
                  getCoursesCount()
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-green-200/60 block">
                Enrolled syllabus
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center shrink-0 border border-gray-200/60 dark:border-[#138601]/30 group-hover:scale-105 group-hover:bg-[#138601] group-hover:text-white transition-all shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
          </Link>

          {/* Card 4: Academic Results */}
          <Link
            to="/results"
            className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] hover:shadow-md transition-all flex items-center justify-between shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-green-200/70 block">
                My Academic Results
              </span>
              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {statsLoading && resultsPublishedCount === null ? (
                  <div className="h-6 w-32 bg-gray-200 dark:bg-green-900/40 rounded-lg animate-pulse" />
                ) : (
                  getResultsCount()
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-green-200/60 block">
                Semester transcript
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center shrink-0 border border-gray-200/60 dark:border-[#138601]/30 group-hover:scale-105 group-hover:bg-[#138601] group-hover:text-white transition-all shadow-2xs">
              <BarChart3 className="w-6 h-6" />
            </div>
          </Link>

        </div>



        {/* Quick Student Actions */}
        <div className="space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Quick Student Actions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <Link
              to="/dues"
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Dues Clearance Receipt</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                      statsLoading && totalPayable === null
                        ? 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        : isPaid
                        ? 'bg-green-50 text-[#138601] border-green-200 dark:bg-[#041801] dark:text-[#4bd043] dark:border-[#138601]/30'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                    }`}>
                      {statsLoading && totalPayable === null ? (
                        'Verifying...'
                      ) : isPaid ? (
                        <>
                          <BadgeCheck className="w-3 h-3 text-[#138601] dark:text-[#4bd043]" />
                          <span>Cleared</span>
                        </>
                      ) : (
                        'Pending'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                    {statsLoading && totalPayable === null ? 'Checking clearance status...' : isPaid ? 'View verified electronic receipt' : 'Clearance required • Pay dues'}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/id-card"
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50/70 dark:bg-[#083002]/90 border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0 border border-gray-200/60 dark:border-[#138601]/20">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Official Student ID Card</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">Generate & print digital identity card</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/results"
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Check Semester Results</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">View GP transcript breakdown</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/courses"
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50/70 dark:bg-[#083002]/90 border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0 border border-gray-200/60 dark:border-[#138601]/20">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Registered Courses</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">Curriculum syllabus, modules & lecturers</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/profile"
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Student Profile</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">View and update bio & academic info</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/notices"
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50/70 dark:bg-[#083002]/90 border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0 border border-gray-200/60 dark:border-[#138601]/20">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Academic Bulletin & Notices</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">Read official circulars & directives</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Feedback / Appraisal Banner (Moved to the bottom after everything) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex items-start gap-3.5 shadow-xs">
          <div className="w-5 h-5 rounded-full bg-[#138601] flex items-center justify-center text-white shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              We would love to hear from you!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100 font-normal">
              Please take a moment to complete this short appraisal to help us enhance our learning environment.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdboB_xQGvHB9GJfFyj2JOHzQAYwRp3-RCFv5nJ7yP2_YPCcQ/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#138601] dark:text-[#4bd043] hover:underline pt-0.5 cursor-pointer"
            >
              <span>Start Your Appraisal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Dashboard;
