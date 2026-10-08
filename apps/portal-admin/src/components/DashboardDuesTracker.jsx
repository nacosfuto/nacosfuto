import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Download,
  RefreshCw,
  Edit3,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Receipt,
  RotateCcw,
  UserCheck,
  Users,
  Coins,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getDuesSettings,
  getDynamicAcademicSession,
  updateDuesFee,
  adminGetAllDuesPayments,
  adminManuallyClearDues,
  adminRevokeDuesClearance,
  adminGetAllStudents,
  adminGetAllVerifiedStudents
} from '@nacos/supabase';
import { useTheme } from '../context/ThemeContext';

export const DashboardDuesTracker = ({ onSettingsUpdated }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duesSettings, setDuesSettings] = useState({
    dues_amount: 2500,
    academic_session: getDynamicAcademicSession(),
    is_open: true
  });
  const [duesPayments, setDuesPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [verifiedStudents, setVerifiedStudents] = useState([]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | CLEARED | UNPAID
  const [levelFilter, setLevelFilter] = useState('ALL'); // ALL | 100 | 200 | 300 | 400 | 500

  // Modals & Feedback
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [newSession, setNewSession] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  const [clearanceModalStudent, setClearanceModalStudent] = useState(null);
  const [clearanceForm, setClearanceForm] = useState({
    amount: '',
    paymentMethod: 'FUTO Microfinance Bank Teller',
    reference: '',
    note: ''
  });
  const [isClearing, setIsClearing] = useState(false);

  const [receiptModalPayment, setReceiptModalPayment] = useState(null);
  const [revokeConfirmStudent, setRevokeConfirmStudent] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadDuesData();
  }, []);

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadDuesData = async () => {
    setLoading(true);
    try {
      const [settingsRes, paymentsRes, accountsRes, verifiedRes] = await Promise.all([
        getDuesSettings().catch(() => ({ dues_amount: 2500, academic_session: getDynamicAcademicSession() })),
        adminGetAllDuesPayments().catch(() => []),
        adminGetAllStudents().catch(() => []),
        adminGetAllVerifiedStudents().catch(() => [])
      ]);

      if (settingsRes) {
        const sessionStr = typeof settingsRes.academic_session === 'string'
          ? settingsRes.academic_session
          : (settingsRes.academic_session?.sessionName || getDynamicAcademicSession());
        setDuesSettings({
          ...settingsRes,
          academic_session: sessionStr
        });
        setNewRate(settingsRes.dues_amount || 2500);
        setNewSession(sessionStr);
      }

      setDuesPayments(paymentsRes || []);

      const parsedAccounts = Array.isArray(accountsRes) 
        ? accountsRes 
        : (accountsRes?.students || accountsRes?.data || []);
      setAccounts(parsedAccounts);

      const parsedVerified = Array.isArray(verifiedRes) 
        ? verifiedRes 
        : (verifiedRes?.students || verifiedRes?.data || []);
      setVerifiedStudents(parsedVerified);
    } catch (err) {
      console.error('[Dashboard Dues Tracker Load Error]:', err);
      showNotification('Failed to synchronize dues records from database.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDuesData();
  };

  // Helper to extract student level (e.g. "100", "200", "300")
  const extractLevel = (student) => {
    const raw = String(student?.level || student?.current_level || student?.entry_level || '').trim();
    const match = raw.match(/\b(100|200|300|400|500)\b/);
    if (match) return match[1];
    if (student?.admission_year) {
      const year = Number(student.admission_year);
      if (year === 2026 || year === 2027) return '100';
      if (year === 2025) return '200';
      if (year === 2024) return '300';
      if (year === 2023) return '400';
      if (year <= 2022) return '500';
    }
    return '100';
  };

  // Build Unified Student Dues Ledger
  const ledgerRoster = useMemo(() => {
    // Map of successful payments keyed by uppercase registration number and student ID
    const paymentMap = new Map();
    duesPayments.forEach(p => {
      if (p.status === 'successful') {
        if (p.registration_number) paymentMap.set(String(p.registration_number).trim().toUpperCase(), p);
        if (p.student_id) paymentMap.set(String(p.student_id).trim(), p);
      }
    });

    // Create a unified list using registered accounts first, supplemented by whitelist if needed
    const studentMap = new Map();

    accounts.forEach(acc => {
      const reg = String(acc.registration_number || acc.matric_number || acc.matric || '').trim().toUpperCase();
      if (!reg && !acc.id) return;

      const key = reg || acc.id;
      const matchedPayment = paymentMap.get(reg) || (acc.id ? paymentMap.get(acc.id) : null);
      const isCleared = Boolean(matchedPayment) || acc.dues_cleared === true || acc.has_paid_dues === true;

      studentMap.set(key, {
        id: acc.id || key,
        fullName: acc.full_name || `${acc.surname || ''} ${acc.first_name || ''}`.trim() || 'Student Account',
        registrationNumber: reg || 'PENDING',
        email: acc.email || '—',
        level: extractLevel(acc),
        isCleared,
        payment: matchedPayment,
        isRegistered: true
      });
    });

    // Supplement with ground truth whitelist students that may not have registered accounts yet
    verifiedStudents.forEach(v => {
      const reg = String(v.registration_number || v.regNo || v.matric || '').trim().toUpperCase();
      if (!reg || studentMap.has(reg)) return;

      const matchedPayment = paymentMap.get(reg);
      const isCleared = Boolean(matchedPayment);

      studentMap.set(reg, {
        id: `wh_${reg}`,
        fullName: v.full_name || v.name || 'Verified Whitelist Student',
        registrationNumber: reg,
        email: v.email || '—',
        level: extractLevel(v),
        isCleared,
        payment: matchedPayment,
        isRegistered: false
      });
    });

    return Array.from(studentMap.values());
  }, [accounts, verifiedStudents, duesPayments]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return ledgerRoster.filter(item => {
      // Search Filter
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const nameMatch = item.fullName.toLowerCase().includes(q);
        const regMatch = item.registrationNumber.toLowerCase().includes(q);
        const refMatch = item.payment?.reference?.toLowerCase().includes(q);
        if (!nameMatch && !regMatch && !refMatch) return false;
      }

      // Status Filter
      if (statusFilter === 'CLEARED' && !item.isCleared) return false;
      if (statusFilter === 'UNPAID' && item.isCleared) return false;

      // Level Filter
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;

      return true;
    });
  }, [ledgerRoster, searchQuery, statusFilter, levelFilter]);

  // Summary Metrics
  const totalStudents = ledgerRoster.length;
  const clearedStudents = ledgerRoster.filter(s => s.isCleared).length;
  const unpaidStudents = totalStudents - clearedStudents;
  const clearancePercentage = totalStudents > 0 ? Math.round((clearedStudents / totalStudents) * 100) : 0;

  const totalRevenue = useMemo(() => {
    return duesPayments
      .filter(p => p.status === 'successful')
      .reduce((sum, p) => sum + (Number(p.amount) || Number(duesSettings.dues_amount) || 0), 0);
  }, [duesPayments, duesSettings.dues_amount]);

  // Action: Save Dues Rate & Session
  const handleSaveDuesRate = async (e) => {
    e.preventDefault();
    const rateNum = Number(newRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      showNotification('Please enter a valid positive dues amount.', 'error');
      return;
    }

    setIsSavingRate(true);
    try {
      const res = await updateDuesFee(rateNum, newSession || duesSettings.academic_session);
      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        setDuesSettings({
          ...duesSettings,
          dues_amount: rateNum,
          academic_session: newSession || duesSettings.academic_session
        });
        showNotification(`Dues fee updated to ₦${rateNum.toLocaleString()} for ${newSession || duesSettings.academic_session} session.`);
        setIsRateModalOpen(false);
        if (onSettingsUpdated) onSettingsUpdated();
      }
    } catch (err) {
      showNotification('Failed to update dues settings in database.', 'error');
    } finally {
      setIsSavingRate(false);
    }
  };

  // Action: Open Manual Clearance Modal
  const openClearanceModal = (student) => {
    setClearanceModalStudent(student);
    setClearanceForm({
      amount: String(duesSettings.dues_amount || 2500),
      paymentMethod: 'Department POS / Office Teller',
      reference: `NACOS-MANUAL-${student.registrationNumber}-${Date.now().toString().slice(-6)}`,
      note: 'Cleared manually by departmental administrator'
    });
  };

  // Action: Submit Manual Clearance
  const handleManualClearanceSubmit = async (e) => {
    e.preventDefault();
    if (!clearanceModalStudent) return;

    setIsClearing(true);
    try {
      const res = await adminManuallyClearDues({
        studentId: clearanceModalStudent.id,
        registrationNumber: clearanceModalStudent.registrationNumber,
        studentName: clearanceModalStudent.fullName,
        studentEmail: clearanceModalStudent.email,
        amount: Number(clearanceForm.amount) || duesSettings.dues_amount || 2500,
        academicSession: duesSettings.academic_session || '2026/2027',
        level: clearanceModalStudent.level,
        paymentMethod: clearanceForm.paymentMethod,
        reference: clearanceForm.reference,
        note: clearanceForm.note
      });

      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Dues cleared successfully for ${clearanceModalStudent.fullName} (${clearanceModalStudent.registrationNumber}).`);
        setClearanceModalStudent(null);
        await loadDuesData();
      }
    } catch (err) {
      showNotification('Failed to record manual dues clearance.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Action: Submit Revoke Clearance
  const handleRevokeClearance = async () => {
    if (!revokeConfirmStudent) return;

    setIsRevoking(true);
    try {
      const ref = revokeConfirmStudent.payment?.reference;
      const res = await adminRevokeDuesClearance({
        reference: ref,
        registrationNumber: revokeConfirmStudent.registrationNumber,
        studentId: revokeConfirmStudent.id
      });

      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Clearance revoked for ${revokeConfirmStudent.fullName}. Status reset to Unpaid.`);
        setRevokeConfirmStudent(null);
        await loadDuesData();
      }
    } catch (err) {
      showNotification('Failed to revoke clearance.', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  // Action: Export Ledger CSV
  const handleExportCSV = () => {
    const headers = [
      'Registration Number',
      'Student Name',
      'Email',
      'Level',
      'Clearance Status',
      'Fee Amount (NGN)',
      'Payment Channel',
      'Payment Reference',
      'Payment Date',
      'Academic Session'
    ];

    const rows = filteredRoster.map(s => [
      `"${s.registrationNumber}"`,
      `"${s.fullName}"`,
      `"${s.email}"`,
      `"${s.level} Level"`,
      s.isCleared ? '"CLEARED"' : '"UNPAID"',
      s.isCleared ? (s.payment?.amount || duesSettings.dues_amount || 2500) : 0,
      `"${s.payment?.provider || (s.isCleared ? 'Manual Clearance' : '—')}"`,
      `"${s.payment?.reference || '—'}"`,
      `"${s.payment?.paid_at || s.payment?.created_at || '—'}"`,
      `"${duesSettings.academic_session || '2026/2027'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NACOS_Dues_Clearance_Report_${duesSettings.academic_session.replace('/', '-')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Departmental dues clearance report exported successfully.');
  };

  return (
    <div className={`p-6 sm:p-7 rounded-2xl border transition-all ${
      isDark ? 'bg-[#083002]/40 backdrop-blur border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
    }`}>
      {/* Toast Notification Banner */}
      {feedback.message && (
        <div className={`mb-5 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
          feedback.type === 'error'
            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ message: '', type: '' })} className="hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200/60 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#138601]/20 to-lime-500/20 text-[#138601] dark:text-[#4bd043] border border-[#138601]/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>Departmental Dues & Clearance Tracker</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#138601]/15 text-[#138601] dark:text-[#4bd043] border border-[#138601]/30 uppercase tracking-wide">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Session <strong>{typeof duesSettings?.academic_session === 'string' ? duesSettings.academic_session : (duesSettings?.academic_session?.sessionName || getDynamicAcademicSession())}</strong> • Universal Bachs Payment & Institutional Bursary Ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsRateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-green-950/60 border border-gray-200 dark:border-[#138601]/40 text-gray-700 dark:text-green-200 transition-colors shadow-xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
            <span>Configure Rate (₦{Number(duesSettings.dues_amount || 2500).toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredRoster.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-green-950/60 border border-gray-200 dark:border-[#138601]/40 text-gray-700 dark:text-green-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export Clearance CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-green-950/40 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-[#138601]' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Financial & Clearance Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50/80 border-gray-200/80'}`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Configured Fee Rate</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-inherit">
            ₦{Number(duesSettings.dues_amount || 2500).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span>Per student •</span>
            <span className="text-[#138601] dark:text-[#4bd043] font-semibold">{duesSettings.academic_session}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50/80 border-gray-200/80'}`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Cleared Students</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {clearedStudents} <span className="text-sm font-semibold text-gray-400">/ {totalStudents}</span>
          </div>
          <div className="mt-1.5 w-full bg-gray-200 dark:bg-black/40 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${clearancePercentage}%` }}
            />
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50/80 border-gray-200/80'}`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Total Revenue Collected</span>
            <Receipt className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-inherit">
            ₦{Number(totalRevenue).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Authoritative Bachs & Bursary reconciled
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50/80 border-gray-200/80'}`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Pending / Unpaid Roster</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {unpaidStudents} <span className="text-sm font-semibold text-gray-400">Students</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {100 - clearancePercentage}% of cohort requiring clearance
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, reg number, or reference..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
              isDark 
                ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' 
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-[#138601] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All ({totalStudents})
            </button>
            <button
              onClick={() => setStatusFilter('CLEARED')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'CLEARED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Cleared ({clearedStudents})
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'UNPAID'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Unpaid ({unpaidStudents})
            </button>
          </div>

          {/* Level Filter Dropdown */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${
              isDark 
                ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' 
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
            }`}
          >
            <option value="ALL">All Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
            <option value="500">500 Level</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#138601]" />
          <p className="text-xs">Synchronizing live dues clearance ledger from database...</p>
        </div>
      ) : filteredRoster.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200/60 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Student Details</th>
                <th className="py-3 px-3.5">Reg Number</th>
                <th className="py-3 px-3.5">Level</th>
                <th className="py-3 px-3.5">Fee Rate</th>
                <th className="py-3 px-3.5">Clearance Status</th>
                <th className="py-3 px-3.5">Payment Channel</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredRoster.map((student) => {
                const isCleared = student.isCleared;
                const p = student.payment;
                const paidAmount = p?.amount || duesSettings.dues_amount || 2500;

                return (
                  <tr key={student.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    {/* Student Info */}
                    <td className="py-3 px-3.5 font-semibold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                          isCleared 
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400' 
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                        }`}>
                          {student.fullName[0] || 'S'}
                        </div>
                        <div>
                          <div className="leading-tight">{student.fullName}</div>
                          <div className="text-[10px] text-gray-400 font-normal">{student.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Reg No */}
                    <td className="py-3 px-3.5 font-mono font-medium text-[#138601] dark:text-green-300">
                      {student.registrationNumber}
                    </td>

                    {/* Level */}
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                        {student.level}L
                      </span>
                    </td>

                    {/* Fee Amount */}
                    <td className="py-3 px-3.5 font-semibold">
                      ₦{Number(paidAmount).toLocaleString()}.00
                    </td>

                    {/* Clearance Status */}
                    <td className="py-3 px-3.5">
                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Cleared</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Unpaid</span>
                        </span>
                      )}
                    </td>

                    {/* Payment Channel */}
                    <td className="py-3 px-3.5 text-gray-500 dark:text-gray-400 text-[11px]">
                      {isCleared ? (
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {p?.provider === 'BACHS' ? 'Bachs Live Gateway' : (p?.provider || 'Departmental Bursary')}
                          </div>
                          {p?.reference && (
                            <div className="font-mono text-[9px] text-gray-400 truncate max-w-[130px]" title={p.reference}>
                              {p.reference}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      {isCleared ? (
                        <div className="inline-flex items-center gap-1.5">
                          {p?.reference && (
                            <button
                              type="button"
                              onClick={() => setReceiptModalPayment(p)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                              title="View Payment Receipt"
                            >
                              Receipt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setRevokeConfirmStudent(student)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Revoke clearance"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openClearanceModal(student)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Clear Student</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
          <p className="text-xs font-medium">No matching student dues records found.</p>
          <p className="text-[11px] text-gray-500 mt-1">Try adjusting your search query or filter options above.</p>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL 1: CONFIGURE DUES RATE & ACADEMIC SESSION
          --------------------------------------------------------------------- */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-left ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                <h3 className="text-base font-bold text-inherit">Configure Departmental Dues</h3>
              </div>
              <button onClick={() => setIsRateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-green-100/70">
              Set the authoritative dues clearance fee charged across the portal. Any updates immediately synchronize with the live Bachs payment gateway and database.
            </p>

            <form onSubmit={handleSaveDuesRate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Departmental Dues Fee (₦)
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  step="100"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                  placeholder="e.g. 2500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Active Academic Session
                </label>
                <input
                  type="text"
                  required
                  value={newSession}
                  onChange={(e) => setNewSession(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                  placeholder="e.g. 2026/2027"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRate}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Parameters</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL 2: MANUAL BURSARY CLEARANCE / EXEMPTION
          --------------------------------------------------------------------- */}
      {clearanceModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-left ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                <h3 className="text-base font-bold text-inherit">Clear Departmental Dues</h3>
              </div>
              <button onClick={() => setClearanceModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <span className="font-bold text-inherit">{clearanceModalStudent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reg Number:</span>
                <span className="font-mono font-bold text-[#138601] dark:text-[#4bd043]">{clearanceModalStudent.registrationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Level:</span>
                <span className="font-medium text-inherit">{clearanceModalStudent.level} Level</span>
              </div>
            </div>

            <form onSubmit={handleManualClearanceSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Amount Paid (₦)
                </label>
                <input
                  type="number"
                  required
                  value={clearanceForm.amount}
                  onChange={(e) => setClearanceForm({ ...clearanceForm, amount: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Payment Method / Channel
                </label>
                <select
                  value={clearanceForm.paymentMethod}
                  onChange={(e) => setClearanceForm({ ...clearanceForm, paymentMethod: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                >
                  <option value="Department POS / Office Teller">Department POS / Office Teller</option>
                  <option value="FUTO Microfinance Bank Teller">FUTO Microfinance Bank Teller</option>
                  <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                  <option value="Departmental Exemption / Waiver">Departmental Exemption / Waiver</option>
                  <option value="Scholarship / Bursary Grant">Scholarship / Bursary Grant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Payment Reference / Teller Number
                </label>
                <input
                  type="text"
                  required
                  value={clearanceForm.reference}
                  onChange={(e) => setClearanceForm({ ...clearanceForm, reference: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Administrative Note (Optional)
                </label>
                <input
                  type="text"
                  value={clearanceForm.note}
                  onChange={(e) => setClearanceForm({ ...clearanceForm, note: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white focus:border-[#138601]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#138601]'
                  }`}
                  placeholder="e.g. Verified by Department Secretary"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setClearanceModalStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClearing}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Authorize Clearance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL 3: PAYMENT RECEIPT & AUDIT INSPECTOR
          --------------------------------------------------------------------- */}
      {receiptModalPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-left ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-inherit">Official Clearance Receipt</h3>
              </div>
              <button onClick={() => setReceiptModalPayment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference:</span>
                <span className="font-mono font-bold text-[#138601] dark:text-[#4bd043] select-all">
                  {receiptModalPayment.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Student Reg No:</span>
                <span className="font-mono font-semibold text-inherit">{receiptModalPayment.registration_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gateway Provider:</span>
                <span className="font-semibold text-inherit">{receiptModalPayment.provider || 'BACHS'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-emerald-500 uppercase">{receiptModalPayment.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid:</span>
                <span className="font-bold text-inherit">₦{Number(receiptModalPayment.amount || 2500).toLocaleString()}.00 NGN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date Confirmed:</span>
                <span className="text-inherit">
                  {receiptModalPayment.paid_at ? new Date(receiptModalPayment.paid_at).toLocaleString() : 'Current Session'}
                </span>
              </div>
              {receiptModalPayment.metadata?.payment_method && (
                <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-white/10">
                  <span className="text-gray-500">Bursary Channel:</span>
                  <span className="font-medium text-inherit">{receiptModalPayment.metadata.payment_method}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(receiptModalPayment.reference);
                  showNotification('Payment reference copied to clipboard.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-inherit cursor-pointer"
              >
                Copy Reference
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalPayment(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL 4: CONFIRM REVOCATION
          --------------------------------------------------------------------- */}
      {revokeConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-left ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-inherit">Revoke Dues Clearance?</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-green-100/80 leading-relaxed">
              Are you sure you want to revoke departmental dues clearance for{' '}
              <strong>{revokeConfirmStudent.fullName}</strong> ({revokeConfirmStudent.registrationNumber})?
              This will reset their clearance status to <strong>Unpaid</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRevokeConfirmStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeClearance}
                disabled={isRevoking}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDuesTracker;
