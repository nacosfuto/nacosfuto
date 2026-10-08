import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ShieldCheck, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight, 
  TrendingUp, 
  FileSpreadsheet, 
  Image as ImageIcon,
  RefreshCw,
  Database,
  ExternalLink,
  UserCheck,
  Calendar,
  Layers
} from 'lucide-react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { adminGetAllVerifiedStudents } from '@nacos/supabase/verifiedStudents';
import { adminGetAllStudents } from '@nacos/supabase/auth';
import { portalAdminGetApplications } from '@nacos/supabase/idCard';
import { getDuesSettings, getDynamicAcademicSession, supabase } from '@nacos/supabase';
import DashboardDuesTracker from '../components/DashboardDuesTracker';
import { useTheme } from '../context/ThemeContext';

export const PortalAdminDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dbStatus, setDbStatus] = useState({ online: true, source: 'Supabase Cloud DB' });

  // Live collections from database
  const [verifiedList, setVerifiedList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [idCardsList, setIdCardsList] = useState([]);

  const [stats, setStats] = useState({
    whitelistTotal: 0,
    activeAccounts: 0,
    pendingIdCards: 0,
    approvedIdCards: 0
  });

  const [duesStats, setDuesStats] = useState({
    rate: 2500,
    academicSession: getDynamicAcademicSession(),
    clearedCount: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadDashboardData();

    // 1. Supabase Real-time Subscriptions for Live Admin Updates
    let channel = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('portal-admin-live-feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
            loadDashboardData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadDashboardData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'id_card_applications' }, () => {
            loadDashboardData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'verified_students' }, () => {
            loadDashboardData(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
      }
    }

    // 2. Continuous 8-second polling to ensure zero data drift
    const pollInterval = setInterval(() => {
      loadDashboardData(true);
    }, 8000);

    // 3. Tab focus reload
    const handleFocus = () => loadDashboardData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [whitelistRes, accountsRes, idCardsRes, duesSettingsRes] = await Promise.all([
        adminGetAllVerifiedStudents(),
        adminGetAllStudents(),
        portalAdminGetApplications({ status: 'ALL' }),
        getDuesSettings().catch(() => ({ dues_amount: 2500, academic_session: getDynamicAcademicSession() }))
      ]);

      // Robust parsing: handles arrays or response objects
      const whitelist = Array.isArray(whitelistRes) 
        ? whitelistRes 
        : (whitelistRes?.students || whitelistRes?.data || []);

      const accounts = Array.isArray(accountsRes) 
        ? accountsRes 
        : (accountsRes?.students || accountsRes?.data || []);

      const idCards = Array.isArray(idCardsRes) 
        ? idCardsRes 
        : (idCardsRes?.applications || idCardsRes?.data || []);

      const pending = idCards.filter(c => 
        ['submitted', 'pending', 'PENDING', 'pending_payment', 'payment_confirmed', 'photo_required', 'ready_to_submit', 'processing', 'generated', 'draft'].includes(c.status)
      ).length;

      const approved = idCards.filter(c => 
        c.status === 'APPROVED' || c.status === 'approved'
      ).length;

      setVerifiedList(whitelist);
      setAccountsList(accounts);
      setIdCardsList(idCards);

      setStats({
        whitelistTotal: whitelist.length,
        activeAccounts: accounts.length,
        pendingIdCards: pending,
        approvedIdCards: approved
      });

      // Calculate dues statistics
      let clearedDuesCount = 0;
      let totalDuesRev = 0;
      if (accounts && accounts.length > 0) {
        clearedDuesCount = accounts.filter(a => a.dues_cleared === true || a.has_paid_dues === true).length;
      }

      const activeDuesRate = Number(duesSettingsRes?.dues_amount || 2500);

      if (supabase) {
        try {
          const { data: duesPays } = await supabase
            .from('payments')
            .select('amount, status')
            .eq('payment_type', 'DEPARTMENTAL_DUES')
            .eq('status', 'successful');

          if (duesPays && duesPays.length > 0) {
            clearedDuesCount = Math.max(clearedDuesCount, duesPays.length);
            totalDuesRev = duesPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          } else {
            totalDuesRev = clearedDuesCount * activeDuesRate;
          }
        } catch (_) {
          totalDuesRev = clearedDuesCount * activeDuesRate;
        }
      }

      setDuesStats({
        rate: activeDuesRate,
        academicSession: duesSettingsRes?.academic_session || getDynamicAcademicSession(),
        clearedCount: clearedDuesCount,
        totalRevenue: totalDuesRev
      });

      setDbStatus({
        online: true,
        source: 'Supabase Cloud Database (Live)'
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      setDbStatus({
        online: false,
        source: 'Local Cache / Offline'
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute live level distribution from active accounts
  const levelDistribution = accountsList.reduce((acc, student) => {
    const lvl = student.level || student.current_level || '100 Level';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});

  const statCards = [
    {
      title: 'Verified Whitelist',
      value: stats.whitelistTotal,
      subtitle: 'Eligible CS ground-truth records',
      icon: Users,
      link: '/students'
    },
    {
      title: 'Active Portal Users',
      value: stats.activeAccounts,
      subtitle: 'Registered live student accounts',
      icon: GraduationCap,
      link: '/students'
    },
    {
      title: 'Departmental Dues',
      value: `₦${Number(duesStats.rate).toLocaleString()}`,
      subtitle: `${duesStats.clearedCount} Cleared • ₦${Number(duesStats.totalRevenue).toLocaleString()} Rev`,
      icon: CreditCard,
      link: '/settings'
    },
    {
      title: 'Pending ID Cards',
      value: stats.pendingIdCards,
      subtitle: 'Awaiting officer review',
      icon: Clock,
      link: '/id-cards'
    },
    {
      title: 'Approved ID Cards',
      value: stats.approvedIdCards,
      subtitle: 'Digitally verified cards',
      icon: CheckCircle2,
      link: '/id-cards'
    }
  ];

  return (
    <PortalAdminLayout 
      title="Student Portal Operations Dashboard" 
      subtitle="Live administrative control center synchronized with Supabase database"
    >
      <div className="space-y-6">

        {/* Live Database Sync Bar */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'bg-[#083002]/50 border-[#138601]/30' : 'bg-green-50/70 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                {dbStatus.source}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">•</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lastUpdated ? `Last synchronized at ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-green-950/40 transition-colors shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#138601]' : 'text-gray-500'}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            const isEven = i % 2 === 0;
            return (
              <Link
                key={i}
                to={stat.link}
                className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:border-[#138601] shadow-xs ${
                  isDark
                    ? isEven ? 'bg-[#083002]/60 border-[#138601]/30 text-white' : 'bg-[#041801]/80 border-[#138601]/20 text-white'
                    : isEven ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-50/80 border-gray-200 text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-green-200/70 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-[#138601] dark:text-[#4bd043]">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    {loading ? '...' : stat.value}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 mt-1 font-normal">
                    {stat.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Dedicated Section: Departmental Dues Clearance & Financial Tracker */}
        <DashboardDuesTracker onSettingsUpdated={loadDashboardData} />

        {/* Live Data Tables & Feeds */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Active Registered Students (Live from Database) */}
          <div className={`p-6 rounded-2xl border lg:col-span-2 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                  <span>Live Student Accounts (Database Ground Truth)</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Synchronized with Supabase <code className="text-[11px] bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded">public.profiles</code> table
                </p>
              </div>

              <Link
                to="/students"
                className="text-xs font-semibold text-[#138601] dark:text-[#4bd043] hover:underline flex items-center gap-1"
              >
                <span>View Full Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[#138601]" />
                <span className="text-xs">Fetching registered student accounts...</span>
              </div>
            ) : accountsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Matric / Reg No</th>
                      <th className="py-2.5 px-3">Level</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {accountsList.slice(0, 5).map((student, idx) => (
                      <tr key={student.id || idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#138601] dark:text-[#4bd043] flex items-center justify-center font-bold text-xs uppercase">
                              {(student.full_name || student.surname || 'S')[0]}
                            </div>
                            <div>
                              <div>{student.full_name || `${student.surname || ''} ${student.first_name || ''}`}</div>
                              <div className="text-[10px] text-gray-400">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-[#138601] dark:text-green-300">
                          {student.registration_number || student.matricNumber || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {student.level || student.current_level || '100 Level'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-300">
                          {student.department || 'Computer Science'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-semibold ${student.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {student.is_active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No registered accounts found in database profiles yet.</p>
              </div>
            )}
          </div>

          {/* Level Distribution & Registry Status */}
          <div className={`p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
              <span>Demographics & Levels</span>
            </h2>

            <div className="space-y-3">
              {['100 Level', '200 Level', '300 Level', '400 Level', '500 Level'].map((lvl) => {
                const count = levelDistribution[lvl] || 0;
                const percentage = stats.activeAccounts > 0 
                  ? Math.round((count / stats.activeAccounts) * 100) 
                  : 0;

                return (
                  <div key={lvl} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{lvl}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count} students ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-black/30 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#138601] to-[#4bd043] transition-all duration-500"
                        style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Whitelist Ground-Truth:</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.whitelistTotal} Records</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Total Activated:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.activeAccounts} Accounts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Total ID Applications:</span>
                <span className="font-bold text-[#138601] dark:text-[#4bd043]">{idCardsList.length} Submissions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Management Module */}
          <div className={`p-6 rounded-2xl border lg:col-span-2 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
              <span>Key Operational Actions</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/students"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-[#138601] dark:text-[#4bd043] shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Verified Student Whitelist</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    View, add, batch import CSV, and manage registered student whitelists.
                  </p>
                </div>
              </Link>

              <Link
                to="/id-cards"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Review ID Card Applications</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Approve passports, reject substandard photos, and inspect QR verification codes.
                  </p>
                </div>
              </Link>

              <Link
                to="/media"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Student Media & ID Photos</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Access student passport galleries and digital identity assets.
                  </p>
                </div>
              </Link>

              <Link
                to="/settings"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Departmental Dues & Session Settings</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Live Dues Rate: <strong className="text-emerald-500">₦{Number(duesStats.rate).toLocaleString()}</strong> ({duesStats.academicSession}). Update fee schedules, dues clearances, and registration controls.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Summary Info Panel */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <h2 className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
              <span>Verification System Status</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-inherit">
                <span className="font-bold text-[#138601] dark:text-[#4bd043] block mb-1">
                  Institutional Whitelist Active
                </span>
                <p className="text-[11px] text-gray-600 dark:text-green-200/70 leading-relaxed">
                  Only students whose registration numbers, emails, and phone numbers match the verified ground truth can create student accounts.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-inherit">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                  OTP Delivery Providers
                </span>
                <p className="text-[11px] text-gray-600 dark:text-blue-200/70 leading-relaxed">
                  Zero-Serverless direct verification active: <strong>Resend</strong> for email verification and <strong>Termii</strong> for Nigerian mobile SMS verification.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/students"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Open Student Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </PortalAdminLayout>
  );
};

export default PortalAdminDashboard;
