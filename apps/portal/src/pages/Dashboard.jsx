import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CreditCard,
  BookOpen,
  User,
  ArrowUpRight,
  CheckCircle,
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
  initAcademicSessionSync 
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
  const [isPaid, setIsPaid] = useState(false);
  const [verified, setVerified] = useState(false); // true once DB confirms student exists
  const [totalLifetimePayments, setTotalLifetimePayments] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [pendingObligationsCount, setPendingObligationsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(null);
  const [resultsPublishedCount, setResultsPublishedCount] = useState(null);

  const [levelClearanceMatrix, setLevelClearanceMatrix] = useState({
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

  // Authoritatively load student payment history and level-by-level clearance from database
  const loadStudentClearanceHistory = async (currentUser) => {
    const matric = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber || '';
    const cleanMatric = String(matric).trim().toUpperCase();
    const userId = currentUser?.id;
    const currentLvl = deriveLevelNum(currentUser);

    const matrix = {
      '100': { dues: false, duesAmount: 0, idCard: false },
      '200': { dues: false, duesAmount: 0, idCard: false },
      '300': { dues: false, duesAmount: 0, idCard: false },
      '400': { dues: false, duesAmount: 0, idCard: false },
      '500': { dues: false, duesAmount: 0, idCard: false }
    };

    let totalSum = 0;

    // 1. Authoritative Bachs Live Payments Table
    try {
      if (supabase && (cleanMatric || userId)) {
        let query = supabase.from('payments').select('*');

        if (cleanMatric && userId) {
          query = query.or(`registration_number.eq.${cleanMatric},student_id.eq.${userId}`);
        } else if (cleanMatric) {
          query = query.eq('registration_number', cleanMatric);
        } else if (userId) {
          query = query.eq('student_id', userId);
        }

        const { data: payments } = await query;
        if (payments && payments.length > 0) {
          payments.forEach(p => {
            const isConfirmed = ['successful', 'paid', 'verified', 'cleared', 'completed'].includes(String(p.status).toLowerCase()) || Boolean(p.paid_at);
            if (!isConfirmed) return;

            const amt = Number(p.amount || 0);
            totalSum += amt;

            const lvlRaw = p.metadata?.level || p.level || '';
            const match = String(lvlRaw).match(/\d{3}/);
            const lvl = match ? match[0] : currentLvl;

            if (matrix[lvl]) {
              if (p.payment_type === 'DEPARTMENTAL_DUES' || String(p.payment_type || '').toLowerCase().includes('due')) {
                matrix[lvl].dues = true;
                matrix[lvl].duesAmount = amt;
              } else if (p.payment_type === 'ID_CARD' || String(p.payment_type || '').toLowerCase().includes('id')) {
                matrix[lvl].idCard = true;
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Dashboard payments history error:', e);
    }

    // 2. ID Card Applications Table
    try {
      if (supabase && (cleanMatric || userId)) {
        let appQuery = supabase
          .from('id_card_applications')
          .select('*')
          .in('payment_status', ['paid', 'verified']);

        if (cleanMatric && userId) {
          appQuery = appQuery.or(`matric_number.eq.${cleanMatric},user_id.eq.${userId}`);
        } else if (cleanMatric) {
          appQuery = appQuery.eq('matric_number', cleanMatric);
        }

        const { data: idApps } = await appQuery;
        if (idApps && idApps.length > 0) {
          idApps.forEach(app => {
            const lvlRaw = app.level || '';
            const match = String(lvlRaw).match(/\d{3}/);
            const lvl = match ? match[0] : currentLvl;
            if (matrix[lvl]) {
              matrix[lvl].idCard = true;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Dashboard id card apps error:', e);
    }

    // 3. Legacy dues_payments table
    try {
      if (supabase && userId) {
        const { data: legacyDues } = await supabase
          .from('dues_payments')
          .select('*')
          .eq('student_id', userId)
          .in('status', ['successful', 'verified', 'cleared', 'paid']);

        if (legacyDues && legacyDues.length > 0) {
          legacyDues.forEach(item => {
            const amt = Number(item.amount || 0);
            const lvlRaw = item.level || '';
            const match = String(lvlRaw).match(/\d{3}/);
            const lvl = match ? match[0] : currentLvl;
            if (matrix[lvl] && !matrix[lvl].dues) {
              matrix[lvl].dues = true;
              matrix[lvl].duesAmount = amt;
              totalSum += amt;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Dashboard legacy dues error:', e);
    }

    // Fallback profile check for current level dues
    if (
      !matrix[currentLvl].dues &&
      (currentUser?.dues_cleared === true ||
        currentUser?.has_paid_dues === true ||
        ['cleared', 'successful', 'verified', 'paid'].includes(String(currentUser?.payment_status).toLowerCase()))
    ) {
      let dynFee = 0;
      try {
        const duesSettings = await getDepartmentalDuesFee();
        dynFee = Number(duesSettings?.dues_amount) || 0;
      } catch (_) {}
      matrix[currentLvl].dues = true;
      matrix[currentLvl].duesAmount = dynFee;
      totalSum += dynFee;
    }

    // Dynamically resolve fee amounts for dues and ID card obligations strictly from live database
    let duesFeeAmount = 0;
    let idCardFeeAmount = 0;
    try {
      const [duesCfg, idCfg] = await Promise.all([
        getDepartmentalDuesFee().catch(() => null),
        getIdCardSettings().catch(() => null)
      ]);
      if (duesCfg?.dues_amount && !isNaN(Number(duesCfg.dues_amount))) {
        duesFeeAmount = Number(duesCfg.dues_amount);
      }
      if (idCfg?.id_card_fee && !isNaN(Number(idCfg.id_card_fee))) {
        idCardFeeAmount = Number(idCfg.id_card_fee);
      }
    } catch (_) {}

    // Calculate total owing (payable) across all applicable levels (100L up to current level)
    const applicableLevels = getStudentApplicableLevelSessions(currentUser) || [];
    let calculatedOwing = 0;
    let pendingCount = 0;

    applicableLevels.forEach(item => {
      const lvlStr = String(item.numericLevel || item.level || '').replace(/\D/g, '');
      const lvlEntry = matrix[lvlStr] || { dues: false, idCard: false };

      if (!lvlEntry.dues) {
        calculatedOwing += duesFeeAmount;
        pendingCount++;
      }
      if (!lvlEntry.idCard) {
        calculatedOwing += idCardFeeAmount;
        pendingCount++;
      }
    });

    setLevelClearanceMatrix(matrix);
    setTotalLifetimePayments(totalSum);
    setTotalPayable(calculatedOwing);
    setPendingObligationsCount(pendingCount);
    setIsPaid(Boolean(matrix[currentLvl]?.dues));

    // Live sync published results count for student
    try {
      const studentId = cleanMatric || userId;
      if (studentId) {
        const res = await fetchResultsForStudent(studentId);
        if (res && res.data && res.data.length > 0) {
          const distinctSemesters = new Set(res.data.map(r => `${r.level}-${r.semester}`));
          setResultsPublishedCount(distinctSemesters.size);
        } else {
          setResultsPublishedCount(0);
        }
      } else {
        setResultsPublishedCount(0);
      }
    } catch (e) {
      setResultsPublishedCount(0);
    }

    // Live sync courses count for current level
    try {
      const lvlNum = parseInt(currentLvl, 10) || 100;
      const cRes = await fetchCourses({ level: lvlNum });
      if (cRes && cRes.data && cRes.data.length > 0) {
        setCoursesCount(cRes.data.length);
      } else {
        setCoursesCount(0);
      }
    } catch (e) {
      setCoursesCount(0);
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
      let query = supabase.from('profiles').select('*').limit(1);

      const filterConditions = [];
      if (userId && !String(userId).startsWith('student-')) {
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

    const unsubSession = onAcademicSessionChange(() => {
      handleUserUpdate();
    });

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
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
        <div className="space-y-1.5 sm:space-y-2 pt-1 pb-1 text-left">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#138601] dark:text-[#4bd043] border border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap">
              Session {getActiveAcademicSession()}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-green-300/80 whitespace-nowrap">
              {isGraduated ? 'Alumni Member' : `${studentLevelNum} Level`}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Welcome Back, {firstName}!
          </h1>

          <p className="text-[11px] sm:text-sm text-gray-600 dark:text-green-100/90 leading-relaxed font-normal max-w-xl line-clamp-2 sm:line-clamp-none">
            {isGraduated
              ? 'Department of Computer Science • Federal University of Technology, Owerri (Alumni Member). Your complete academic records are permanently archived.'
              : 'Department of Computer Science • Federal University of Technology, Owerri. Keep track of your departmental clearance, course registrations, and semester records.'}
          </p>

          <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1 flex-wrap text-[11px] sm:text-xs text-gray-500 dark:text-green-300/70">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate max-w-[120px] sm:max-w-none">{user.registration_number || user.matric_number || user.matric || 'NACOS Member'}</span>
            </div>
            <span>•</span>
            <div className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {isPaid ? 'Bursary Cleared' : 'Clearance Pending'}
              </span>
            </div>
          </div>
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

        {/* Square Intuitive Financial & Academic Summary Cards (Aspect-Square, Clean without pill badges) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Total Payable (Amount Student is Owing) */}
          <Link
            to={totalPayable > 0 ? (isPaid ? "/id-card" : "/dues") : "/dues"}
            className="aspect-square w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transition-all flex flex-col items-center justify-center text-center shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            {/* Centered Coins Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-xs">
              <Coins className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            {/* Prominent Amount */}
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              ₦{totalPayable.toLocaleString()}
            </div>

            {/* Label */}
            <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
              Total Payable
            </div>
          </Link>

          {/* Card 2: Total Paid */}
          <Link
            to="/receipt"
            className="aspect-square w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transition-all flex flex-col items-center justify-center text-center shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            {/* Centered Cash & Coins Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-xs">
              <Banknote className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            {/* Prominent Amount */}
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              ₦{totalLifetimePayments.toLocaleString()}
            </div>

            {/* Label */}
            <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
              Total Paid
            </div>
          </Link>

          {/* Card 3: Courses Registered */}
          <Link
            to="/courses"
            className="aspect-square w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transition-all flex flex-col items-center justify-center text-center shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            {/* Centered Book Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-xs">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            {/* Prominent Stat */}
            <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {getCoursesCount()}
            </div>

            {/* Label */}
            <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
              Courses Registered
            </div>
          </Link>

          {/* Card 4: Academic Results */}
          <Link
            to="/results"
            className="aspect-square w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transition-all flex flex-col items-center justify-center text-center shadow-xs group cursor-pointer active:scale-[0.98]"
          >
            {/* Centered Bar Chart Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-[#041801] text-gray-700 dark:text-green-300 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-xs">
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            {/* Prominent Stat */}
            <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {getResultsCount()}
            </div>

            {/* Label */}
            <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
              Academic Results
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
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${isPaid
                        ? 'bg-green-50 text-[#138601] border-green-200 dark:bg-[#041801] dark:text-[#4bd043] dark:border-[#138601]/30'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}>
                      {isPaid ? 'Cleared' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                    {isPaid ? 'View verified electronic receipt' : 'Clearance required • Pay dues'}
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
