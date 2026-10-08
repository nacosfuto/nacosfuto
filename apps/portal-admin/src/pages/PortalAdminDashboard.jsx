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
  Layers,
  Coins,
  Award,
  Vote,
  Sparkles
} from 'lucide-react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { adminGetAllVerifiedStudents } from '@nacos/supabase/verifiedStudents';
import { adminGetAllStudents } from '@nacos/supabase/auth';
import { portalAdminGetApplications } from '@nacos/supabase/idCard';
import { getDuesSettings, getDynamicAcademicSession, supabase } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';
import { useTheme } from '../context/ThemeContext';

export const PortalAdminDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const urls = getAppUrls();

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dbStatus, setDbStatus] = useState({ online: true, source: 'Supabase Cloud DB' });

  // Summary collections from database
  const [verifiedList, setVerifiedList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [idCardsList, setIdCardsList] = useState([]);

  const [stats, setStats] = useState({
    whitelistTotal: 0,
    activeAccounts: 0,
    pendingIdCards: 0,
    approvedIdCards: 0,
    rejectedIdCards: 0
  });

  const [duesStats, setDuesStats] = useState({
    rate: 2500,
    academicSession: getDynamicAcademicSession(),
    clearedCount: 0,
    totalRevenue: 0,
    onlineCount: 0,
    manualCount: 0
  });

  useEffect(() => {
    loadDashboardData();

    // 1. Supabase Real-time Subscriptions for Live Admin Updates
    let channel = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('portal-admin-summary-feed')
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

    // 2. Continuous 12-second refresh
    const pollInterval = setInterval(() => {
      loadDashboardData(true);
    }, 12000);

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
        adminGetAllVerifiedStudents().catch(() => []),
        adminGetAllStudents().catch(() => []),
        portalAdminGetApplications({ status: 'ALL' }).catch(() => []),
        getDuesSettings().catch(() => ({ dues_amount: 2500, academic_session: getDynamicAcademicSession() }))
      ]);

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

      const rejected = idCards.filter(c => 
        c.status === 'REJECTED' || c.status === 'rejected' || c.status === 'REVOKED' || c.status === 'revoked'
      ).length;

      setVerifiedList(whitelist);
      setAccountsList(accounts);
      setIdCardsList(idCards);

      setStats({
        whitelistTotal: whitelist.length,
        activeAccounts: accounts.length,
        pendingIdCards: pending,
        approvedIdCards: approved,
        rejectedIdCards: rejected
      });

      // Calculate authoritative dues summary
      let clearedDuesCount = 0;
      let totalDuesRev = 0;
      let onlineDuesCount = 0;
      let manualDuesCount = 0;

      if (accounts && accounts.length > 0) {
        clearedDuesCount = accounts.filter(a => a.dues_cleared === true || a.has_paid_dues === true).length;
      }

      const activeDuesRate = Number(duesSettingsRes?.dues_amount || 2500);

      if (supabase) {
        try {
          const { data: duesPays } = await supabase
            .from('payments')
            .select('amount, status, provider, metadata')
            .eq('payment_type', 'DEPARTMENTAL_DUES')
            .eq('status', 'successful');

          if (duesPays && duesPays.length > 0) {
            clearedDuesCount = Math.max(clearedDuesCount, duesPays.length);
            totalDuesRev = duesPays.reduce((sum, p) => sum + (Number(p.amount) || activeDuesRate), 0);
            manualDuesCount = duesPays.filter(p => p.metadata?.cleared_manually || p.provider?.toLowerCase().includes('manual')).length;
            onlineDuesCount = duesPays.length - manualDuesCount;
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
        totalRevenue: totalDuesRev,
        onlineCount: onlineDuesCount,
        manualCount: manualDuesCount
      });

      setDbStatus({
        online: true,
        source: 'Supabase Cloud Database (Live)'
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to load summary dashboard data:', e);
      setDbStatus({
        online: false,
        source: 'Local Cache / Offline'
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute live level distribution
  const levelDistribution = accountsList.reduce((acc, student) => {
    const lvl = (student.level || student.current_level || '100 Level').replace(/[^0-9]/g, '');
    const key = `${lvl || '100'} Level`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const duesClearanceRate = stats.activeAccounts > 0
    ? Math.min(100, Math.round((duesStats.clearedCount / stats.activeAccounts) * 100))
    : 0;

  const idCardCompletionRate = idCardsList.length > 0
    ? Math.round((stats.approvedIdCards / idCardsList.length) * 100)
    : 0;

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
      value: `₦${Number(duesStats.totalRevenue).toLocaleString()}`,
      subtitle: `${duesStats.clearedCount} Cleared • ₦${Number(duesStats.rate).toLocaleString()} Rate`,
      icon: CreditCard,
      link: '/dues'
    },
    {
      title: 'ID Card Applications',
      value: idCardsList.length,
      subtitle: `${stats.approvedIdCards} Approved • ${stats.pendingIdCards} Pending`,
      icon: ShieldCheck,
      link: '/id-cards'
    },
    {
      title: 'Electoral Ballots',
      value: 'ELECTRA',
      subtitle: 'Decentralized voting ready',
      icon: Vote,
      link: urls.electra
    }
  ];

  return (
    <PortalAdminLayout 
      title="Portal Overview & Operations Summary" 
      subtitle="High-level executive metrics, live clearance rates, and operational indicators"
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
              {lastUpdated ? `Synchronized at ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-green-950/40 transition-colors shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#138601]' : 'text-gray-500'}`} />
            <span>Refresh Summary</span>
          </button>
        </div>

        {/* Top KPI Grid */}
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
                  <span className="text-[11px] font-bold text-gray-500 dark:text-green-200/70 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-[#138601] dark:text-[#4bd043]">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
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

        {/* ─── Executive Summary Modules (Zero Table Clutter) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SUMMARY 1: Departmental Dues Overview */}
          <div className={`p-6 sm:p-7 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-[#138601] dark:text-[#4bd043]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Departmental Dues Summary</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Session {duesStats.academicSession} • Rate: ₦{Number(duesStats.rate).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Link
                  to="/dues"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs transition-colors"
                >
                  <span>Manage Dues</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mt-5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Clearance Completion</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {duesClearanceRate}% ({duesStats.clearedCount} of {stats.activeAccounts || 0} students)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-black/40 overflow-hidden p-0.5 border border-gray-200 dark:border-white/10">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#138601] to-[#4bd043] transition-all duration-700"
                    style={{ width: `${Math.max(duesClearanceRate, duesStats.clearedCount > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Dues Breakdown Pill Grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Total Revenue
                  </span>
                  <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    ₦{Number(duesStats.totalRevenue).toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Cleared Roster
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {duesStats.clearedCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Pending Dues
                  </span>
                  <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                    {Math.max(0, stats.activeAccounts - duesStats.clearedCount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Authoritative Bursary Ledger active</span>
              <Link to="/dues" className="text-[#138601] dark:text-[#4bd043] font-bold hover:underline flex items-center gap-1">
                <span>View Full Dues Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SUMMARY 2: ID Cards Processing Overview */}
          <div className={`p-6 sm:p-7 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">ID Card Applications Summary</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Digital Student Identity Cards • Batch Verification
                    </p>
                  </div>
                </div>

                <Link
                  to="/id-cards"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs transition-colors"
                >
                  <span>Review Cards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mt-5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Approval Rate</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {idCardCompletionRate}% ({stats.approvedIdCards} of {idCardsList.length || 0} submitted)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-black/40 overflow-hidden p-0.5 border border-gray-200 dark:border-white/10">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700"
                    style={{ width: `${Math.max(idCardCompletionRate, stats.approvedIdCards > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>

              {/* ID Cards Breakdown Pill Grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Submitted
                  </span>
                  <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {idCardsList.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Pending Review
                  </span>
                  <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                    {stats.pendingIdCards}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Approved Cards
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {stats.approvedIdCards}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>QR Verification Engine synced</span>
              <Link to="/id-cards" className="text-[#138601] dark:text-[#4bd043] font-bold hover:underline flex items-center gap-1">
                <span>Open Application Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* ─── Bottom Summary Row: Demographics & Quick Actions ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Level Distribution Summary */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                <span>Student Level Demographics</span>
              </h2>
              <Link to="/students" className="text-xs font-bold text-[#138601] dark:text-[#4bd043] hover:underline">
                Registry →
              </Link>
            </div>

            <div className="space-y-3 pt-1">
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
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-between text-xs text-gray-500">
              <span>Ground Truth Whitelist:</span>
              <strong className="text-gray-900 dark:text-white">{stats.whitelistTotal} eligible records</strong>
            </div>
          </div>

          {/* Key Operations Modules */}
          <div className={`p-6 rounded-2xl border lg:col-span-2 space-y-4 ${
            isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
          }`}>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
              <span>Administrative Operations Quick Access</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Dues Management */}
              <Link
                to="/dues"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all hover:-translate-y-0.5 ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-[#138601] dark:text-[#4bd043] shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Dues Management Section</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Manual bursary clearance, fee configurations, and real-time payment audit.
                  </p>
                </div>
              </Link>

              {/* ID Cards */}
              <Link
                to="/id-cards"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all hover:-translate-y-0.5 ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">ID Card Applications</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Review submitted passports, approve digital cards, and manage ID fees.
                  </p>
                </div>
              </Link>

              {/* Student Whitelist */}
              <Link
                to="/students"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all hover:-translate-y-0.5 ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit">Student Whitelist Registry</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Ground-truth verified records, batch CSV import, and account status controls.
                  </p>
                </div>
              </Link>

              {/* Electra Election Platform */}
              <a
                href={urls.electra}
                target="_blank"
                rel="noreferrer"
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all hover:-translate-y-0.5 ${
                  isDark 
                    ? 'bg-black/20 border-[#138601]/20 hover:border-[#138601] hover:bg-[#083002]/60' 
                    : 'bg-gray-50 border-gray-200 hover:border-[#138601] hover:bg-green-50/50'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-[#5C4EFA]/10 text-[#5C4EFA] shrink-0">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-inherit flex items-center gap-1.5">
                    <span>ELECTRA Election Engine</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Official voting portal with light-mode ballots and live election audit.
                  </p>
                </div>
              </a>
            </div>
          </div>

        </div>

      </div>
    </PortalAdminLayout>
  );
};

export default PortalAdminDashboard;
