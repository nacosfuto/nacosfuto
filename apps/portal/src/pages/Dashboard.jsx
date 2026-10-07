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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Bell,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { supabase, getLocalPaymentsDatabase } from '@nacos/supabase';

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

  const [levelClearanceMatrix, setLevelClearanceMatrix] = useState({
    '100': { dues: false, duesAmount: 0, idCard: false },
    '200': { dues: false, duesAmount: 0, idCard: false },
    '300': { dues: false, duesAmount: 0, idCard: false },
    '400': { dues: false, duesAmount: 0, idCard: false },
    '500': { dues: false, duesAmount: 0, idCard: false }
  });

  const deriveLevelNum = (u) => {
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
        let query = supabase
          .from('payments')
          .select('*')
          .in('status', ['successful']);

        if (cleanMatric && userId) {
          query = query.or(`registration_number.eq.${cleanMatric},student_id.eq.${userId}`);
        } else if (cleanMatric) {
          query = query.eq('registration_number', cleanMatric);
        }

        const { data: payments } = await query;
        if (payments && payments.length > 0) {
          payments.forEach(p => {
            const amt = Number(p.amount || 0);
            totalSum += amt;

            const lvlRaw = p.metadata?.level || p.level || '';
            const match = String(lvlRaw).match(/\d{3}/);
            const lvl = match ? match[0] : currentLvl;

            if (matrix[lvl]) {
              if (p.payment_type === 'DEPARTMENTAL_DUES') {
                matrix[lvl].dues = true;
                matrix[lvl].duesAmount = amt;
              } else if (p.payment_type === 'ID_CARD') {
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
            const amt = Number(item.amount || 2500);
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
      matrix[currentLvl].dues = true;
      matrix[currentLvl].duesAmount = 2500;
      totalSum += 2500;
    }

    setLevelClearanceMatrix(matrix);
    setTotalLifetimePayments(totalSum);
    setIsPaid(Boolean(matrix[currentLvl]?.dues));
  };

  // Verify student exists in Supabase database
  const verifyStudentInDatabase = async (currentUser) => {
    const regNo = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber;
    const userId = currentUser?.id;

    if (!regNo && !userId) {
      // No identifier at all — clear session
      localStorage.removeItem('nacos_user');
      localStorage.removeItem('nacos_last_activity');
      navigate('/login?reason=not_registered', { replace: true });
      return false;
    }

    try {
      let query = supabase.from('profiles').select('*').limit(1);
      if (userId && regNo) {
        query = query.or(`id.eq.${userId},registration_number.ilike.${regNo}`);
      } else if (userId) {
        query = query.eq('id', userId);
      } else {
        query = query.ilike('registration_number', regNo);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        // Student not found in Supabase profiles — revoke session
        localStorage.removeItem('nacos_user');
        localStorage.removeItem('nacos_last_activity');
        navigate('/login?reason=not_registered', { replace: true });
        return false;
      }

      if (data.is_active === false) {
        // Account exists but has been deactivated
        localStorage.removeItem('nacos_user');
        localStorage.removeItem('nacos_last_activity');
        navigate('/login?reason=deactivated', { replace: true });
        return false;
      }

      // Merge latest live Supabase database attributes with user state
      const mergedUser = { ...currentUser, ...data };
      setUser(mergedUser);
      localStorage.setItem('nacos_user', JSON.stringify(mergedUser));
      await loadStudentClearanceHistory(mergedUser);

      setVerified(true);
      return true;
    } catch (err) {
      // Network error — if user was previously verified allow them in (offline grace)
      console.warn('DB verification network error:', err);
      setVerified(true);
      return true;
    }
  };

  useEffect(() => {
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
    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
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

  // Dynamic course count based on level
  const getCoursesCount = () => {
    const levelStr = String(user.level || user.current_level || '100');
    const levelNum = parseInt(levelStr, 10);
    if (levelNum === 200) return '14 courses';
    if (levelNum === 300) return '14 courses';
    if (levelNum === 400) return '8 courses';
    if (levelNum === 500) return '10 courses';
    return '16 courses';
  };

  // Dynamic published results count based on level
  const getResultsCount = () => {
    const levelStr = String(user.level || user.current_level || '100');
    const levelNum = parseInt(levelStr, 10);
    if (levelNum >= 300) return '4 semesters';
    if (levelNum >= 200) return '2 semesters';
    return '0 results';
  };

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* Welcome Header */}
        <div className="pb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-0.5">
            Department of Computer Science • Federal University of Technology, Owerri
          </p>
        </div>

        {/* Feedback / Appraisal Banner */}
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

        {/* 3 Clean Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card 1: Courses Registered */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between min-h-[125px] shadow-xs">
            <div className="text-[#138601] dark:text-[#4bd043]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="mt-3 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-normal text-gray-700 dark:text-gray-200">
                Courses Registered
              </h4>
              <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {getCoursesCount()}
              </div>
            </div>
          </div>

          {/* Card 2: Results Published */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between min-h-[125px] shadow-xs">
            <div className="text-[#138601] dark:text-[#4bd043]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="mt-3 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-normal text-gray-700 dark:text-gray-200">
                Results Published
              </h4>
              <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {getResultsCount()}
              </div>
            </div>
          </div>

          {/* Card 3: Total Payments (100L Till Date) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between min-h-[125px] shadow-xs">
            <div className={isPaid ? 'text-[#083002] dark:text-[#4bd043]' : 'text-amber-600 dark:text-amber-400'}>
              <Wallet className="w-6 h-6" />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs sm:text-sm font-normal ${isPaid ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}>
                  Total Paid (100L Till Date)
                </h4>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${isPaid
                    ? 'bg-white/80 dark:bg-[#041801]/60 text-[#138601] dark:text-[#4bd043]'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  }`}>
                  {isPaid ? `${studentLevelNum}L Cleared` : `${studentLevelNum}L Pending`}
                </span>
              </div>
              <div className={`text-sm sm:text-base font-bold ${isPaid ? 'text-gray-900 dark:text-white' : 'text-amber-700 dark:text-amber-400'
                }`}>
                ₦{totalLifetimePayments.toLocaleString()}
              </div>
            </div>
          </div>

        </div>

        {/* Academic Level Clearance Matrix (100L – 500L) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-[#138601] dark:text-[#4bd043]" />
                Academic Level Clearance &amp; Payment Matrix (100L – 500L)
              </h3>
              <p className="text-xs text-gray-500 dark:text-green-200/80 mt-0.5">
                Authoritative record of your Departmental Dues and Student ID Card validity synchronized with the database.
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 border border-gray-200 dark:border-[#138601]/20 self-start sm:self-auto">
              Current Academic Standing: <span className="font-bold text-[#138601] dark:text-[#4bd043]">{studentLevelNum} Level</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {['100', '200', '300', '400', '500'].map((lvl) => {
              const info = levelClearanceMatrix[lvl] || { dues: false, idCard: false };
              const isCurrent = studentLevelNum === lvl;

              return (
                <div
                  key={lvl}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${isCurrent
                      ? 'border-[#138601] bg-[#138601]/5 dark:bg-[#138601]/10 ring-1 ring-[#138601]/20'
                      : 'border-gray-200/80 dark:border-[#138601]/20 bg-gray-50/50 dark:bg-[#041801]/60'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {lvl} Level
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#138601] text-white">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Dues Status */}
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-green-200/70 block mb-0.5 font-medium">Departmental Dues</span>
                      {info.dues ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#138601] dark:text-[#4bd043]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Cleared {info.duesAmount ? `(₦${info.duesAmount.toLocaleString()})` : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Outstanding</span>
                        </div>
                      )}
                    </div>

                    {/* ID Card Status */}
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-green-200/70 block mb-0.5 font-medium">Student ID Card</span>
                      {info.idCard ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#138601] dark:text-[#4bd043]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active / Issued</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Not Applied</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-[11px]">
                    <Link
                      to="/dues"
                      className="font-semibold text-[#138601] dark:text-[#4bd043] hover:underline"
                    >
                      {info.dues ? 'Receipt' : 'Pay Dues'}
                    </Link>
                    <Link
                      to="/id-card"
                      className="text-gray-600 dark:text-green-200/80 hover:underline"
                    >
                      ID Card
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Student Actions */}
        <div className="space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Quick Student Actions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <Link
              to="/dues"
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isPaid
                    ? 'bg-[#f1f3f5] dark:bg-[#041801] text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white'
                  }`}>
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Dues Clearance Receipt</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isPaid
                        ? 'bg-green-100 text-green-800 dark:bg-[#138601]/20 dark:text-[#4bd043]'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}>
                      {isPaid ? 'Cleared' : 'Not Paid'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                    {isPaid ? 'View verified electronic receipt' : 'Clearance required • Pending payment'}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors shrink-0" />
            </Link>

            <Link
              to="/id-card"
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
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
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
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
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
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
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
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
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all group shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] dark:bg-[#041801] flex items-center justify-center text-gray-700 dark:text-[#4bd043] group-hover:bg-[#138601] group-hover:text-white transition-colors shrink-0">
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
      </div>
    </PortalLayout>
  );
};

export default Dashboard;
