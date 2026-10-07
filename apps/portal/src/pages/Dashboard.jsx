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
  Bell
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

  const checkPaymentStatus = async (currentUser) => {
    const matric = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber || '';

    // 1. Direct profile flags
    if (
      currentUser?.dues_cleared === true ||
      currentUser?.has_paid_dues === true ||
      ['cleared', 'successful', 'verified', 'paid'].includes(String(currentUser?.payment_status).toLowerCase())
    ) {
      setIsPaid(true);
      return;
    }

    // 2. Local payments db
    if (matric) {
      try {
        const cleanMatric = String(matric).trim().toUpperCase();
        const localPayments = getLocalPaymentsDatabase();
        if (Array.isArray(localPayments)) {
          const found = localPayments.find(p => {
            const pMatric = String(p.student_matric || p.matric_number || '').trim().toUpperCase();
            const pStatus = String(p.status || '').toLowerCase();
            return pMatric === cleanMatric && (pStatus === 'successful' || pStatus === 'verified' || pStatus === 'cleared' || pStatus === 'paid');
          });

          if (found) {
            setIsPaid(true);
            return;
          }
        }
      } catch (e) {
        console.warn('Local payment check error:', e);
      }

      // 3. Supabase check — use student_id (UUID), NOT matric_number (column doesn't exist)
      try {
        const userId = currentUser?.id;
        if (userId) {
          const { data: duesPay } = await supabase
            .from('dues_payments')
            .select('id, status')
            .eq('student_id', userId)
            .in('status', ['successful', 'verified', 'cleared', 'paid'])
            .maybeSingle();

          if (duesPay) {
            setIsPaid(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase dues check error:', err);
      }
    }

    setIsPaid(false);
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
      checkPaymentStatus(mergedUser);

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
      <div className="space-y-5">

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

          {/* Card 3: Fees Paid */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between min-h-[125px] shadow-xs">
            <div className={isPaid ? 'text-[#083002] dark:text-[#4bd043]' : 'text-amber-600 dark:text-amber-400'}>
              <Wallet className="w-6 h-6" />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs sm:text-sm font-normal ${isPaid ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}>
                  Fees paid
                </h4>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${isPaid
                    ? 'bg-white/80 dark:bg-[#041801]/60 text-[#138601] dark:text-[#4bd043]'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  }`}>
                  {isPaid ? 'Cleared' : 'Not Paid'}
                </span>
              </div>
              <div className={`text-sm sm:text-base font-bold ${isPaid ? 'text-gray-900 dark:text-white' : 'text-amber-700 dark:text-amber-400'
                }`}>
                {isPaid ? '2,500 NGN' : '0 NGN'}
              </div>
            </div>
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
