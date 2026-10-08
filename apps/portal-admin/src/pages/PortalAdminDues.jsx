import React, { useState, useEffect, useMemo } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
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
  Info,
  Calendar,
  Building,
  User,
  Hash,
  DollarSign
} from 'lucide-react';
import {
  getDuesSettings,
  getDynamicAcademicSession,
  updateDuesFee,
  adminGetAllDuesPayments,
  adminManuallyClearDues,
  adminRevokeDuesClearance,
  adminGetAllStudents,
  adminGetAllVerifiedStudents,
  fetchAcademicSessionsFromDatabase,
  supabase
} from '@nacos/supabase';
import {
  getActiveAcademicSession,
  SUPPORTED_ACADEMIC_SESSIONS,
  calculateAcademicProgression,
  extractEntryYearFromRegNumber,
  onAcademicSessionChange
} from '@nacos/config/academic';
import { useTheme } from '../context/ThemeContext';

export default function PortalAdminDues() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duesSettings, setDuesSettings] = useState({
    dues_amount: 2500,
    academic_session: getActiveAcademicSession(),
    is_open: true
  });
  const [duesPayments, setDuesPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [verifiedStudents, setVerifiedStudents] = useState([]);
  const [availableSessions, setAvailableSessions] = useState(SUPPORTED_ACADEMIC_SESSIONS);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | CLEARED | UNPAID | MANUAL
  const [levelFilter, setLevelFilter] = useState('ALL'); // ALL | 100 | 200 | 300 | 400 | 500
  const [sessionFilter, setSessionFilter] = useState(getActiveAcademicSession()); // ALL | specific academic session

  // Modals & Feedback
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [newSession, setNewSession] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [clearanceModalStudent, setClearanceModalStudent] = useState(null);
  const [clearanceForm, setClearanceForm] = useState({
    studentId: '',
    registrationNumber: '',
    studentName: '',
    studentEmail: '',
    level: '100 Level',
    amount: '2500',
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

    // Supabase Live Subscriptions for real-time payments & profiles updates
    let channel = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('portal-admin-dues-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
            loadDuesData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadDuesData(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('[Dues Realtime Notice]:', err);
      }
    }

    const unsubscribeSession = onAcademicSessionChange((payload) => {
      const sessionStr = typeof payload === 'string'
        ? payload
        : (payload?.sessionName || payload?.session || getActiveAcademicSession());
      setSessionFilter(sessionStr);
      setDuesSettings(prev => ({ ...prev, academic_session: sessionStr }));
      setNewSession(sessionStr);
    });

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      if (typeof unsubscribeSession === 'function') unsubscribeSession();
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadDuesData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const [settingsRes, paymentsRes, accountsRes, verifiedRes, sessionsRes] = await Promise.all([
        getDuesSettings().catch(() => ({ dues_amount: 2500, academic_session: getActiveAcademicSession() })),
        adminGetAllDuesPayments().catch(() => []),
        adminGetAllStudents().catch(() => []),
        adminGetAllVerifiedStudents().catch(() => []),
        fetchAcademicSessionsFromDatabase().catch(() => [])
      ]);

      if (settingsRes) {
        const sessionStr = typeof settingsRes.academic_session === 'string'
          ? settingsRes.academic_session
          : (settingsRes.academic_session?.sessionName || getActiveAcademicSession());
        setDuesSettings({
          ...settingsRes,
          academic_session: sessionStr
        });
        setNewRate(settingsRes.dues_amount || 2500);
        setNewSession(sessionStr);
      }

      if (Array.isArray(sessionsRes) && sessionsRes.length > 0) {
        const names = sessionsRes.map(s => s.session_name || s).filter(Boolean);
        setAvailableSessions(Array.from(new Set([...names, ...SUPPORTED_ACADEMIC_SESSIONS])));
      }

      setDuesPayments(Array.isArray(paymentsRes) ? paymentsRes : []);

      const parsedAccounts = Array.isArray(accountsRes)
        ? accountsRes
        : (accountsRes?.students || accountsRes?.data || []);
      setAccounts(parsedAccounts);

      const parsedVerified = Array.isArray(verifiedRes)
        ? verifiedRes
        : (verifiedRes?.students || verifiedRes?.data || []);
      setVerifiedStudents(parsedVerified);

    } catch (err) {
      console.error('[Error loading dues data]:', err);
      showNotification('Failed to fetch latest dues records from database.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Combine registered accounts with dues payments map for authoritative ground truth
  const studentRows = useMemo(() => {
    const rawFilterSession = sessionFilter;
    const filterSessionStr = typeof rawFilterSession === 'string'
      ? rawFilterSession
      : (rawFilterSession?.sessionName || getActiveAcademicSession());
    const isSpecificSession = filterSessionStr && filterSessionStr !== 'ALL';

    const rawSettingsSession = duesSettings?.academic_session;
    const settingsSessionStr = typeof rawSettingsSession === 'string'
      ? rawSettingsSession
      : (rawSettingsSession?.sessionName || getActiveAcademicSession());
    const targetSession = isSpecificSession ? filterSessionStr : settingsSessionStr;

    const paymentMapByReg = new Map();
    const paymentMapByStudentId = new Map();

    duesPayments.forEach(p => {
      if (p.status === 'successful') {
        const rawPSess = p.academic_session || p.metadata?.academic_session;
        const pSession = typeof rawPSess === 'string' ? rawPSess : (rawPSess?.sessionName || '');
        // If filtering for a specific session, only match payments made for that session
        if (isSpecificSession && pSession && pSession !== targetSession) {
          return;
        }

        if (p.registration_number) {
          const regKey = p.registration_number.toUpperCase().trim();
          if (!paymentMapByReg.has(regKey) || (pSession === targetSession)) {
            paymentMapByReg.set(regKey, p);
          }
        }
        if (p.student_id) {
          if (!paymentMapByStudentId.has(p.student_id) || (pSession === targetSession)) {
            paymentMapByStudentId.set(p.student_id, p);
          }
        }
      }
    });

    const activeRate = Number(duesSettings?.dues_amount || 2500);

    return accounts.map(st => {
      const reg = (st.registration_number || st.matricNumber || '').toUpperCase().trim();
      const stId = st.id || st.student_id;

      const directPayment = (reg && paymentMapByReg.get(reg)) || (stId && paymentMapByStudentId.get(stId));
      
      // Determine session-aware clearance:
      // If specific session is selected, clearance requires a payment specifically for that session
      const hasPaid = !!directPayment || (
        !isSpecificSession && (st.dues_cleared === true || st.has_paid_dues === true)
      );

      // Determine level dynamically via central progression engine
      const entryYear = extractEntryYearFromRegNumber(reg) || (st.entry_year ? Number(st.entry_year) : null);
      const progression = entryYear ? calculateAcademicProgression(entryYear, targetSession) : null;
      const derivedLevel = progression ? `${progression.levelNumber} Level` : (st.level || st.current_level || '100 Level');
      const cleanLevel = derivedLevel.replace(/[^0-9]/g, '') || '100';

      const rawPaymentSession = directPayment?.academic_session || directPayment?.metadata?.academic_session || targetSession;
      const paymentSession = typeof rawPaymentSession === 'string'
        ? rawPaymentSession
        : (rawPaymentSession?.sessionName || String(rawPaymentSession || ''));
      const displayLevel = directPayment?.level || `${cleanLevel} Level`;

      return {
        id: st.id || reg || `st-${Math.random()}`,
        studentId: stId,
        name: st.full_name || `${st.surname || ''} ${st.first_name || ''}`.trim() || 'Student',
        email: st.email || '—',
        registrationNumber: reg || 'Pending',
        level: displayLevel,
        rawLevel: cleanLevel,
        session: paymentSession,
        department: st.department || 'Computer Science',
        hasPaid,
        payment: directPayment,
        amount: directPayment?.amount || (hasPaid ? activeRate : 0),
        paidAt: directPayment?.paid_at || directPayment?.created_at || (hasPaid ? (st.dues_paid_at || st.updated_at) : null),
        reference: directPayment?.reference || (hasPaid ? (st.dues_reference || `CLR-${reg}`) : null),
        provider: directPayment?.provider || (directPayment?.metadata?.cleared_manually ? 'Manual Bursary' : (hasPaid ? 'Departmental Clearance' : 'Unpaid')),
        isManual: directPayment?.metadata?.cleared_manually || directPayment?.provider?.toLowerCase().includes('manual') || false
      };
    });
  }, [accounts, duesPayments, duesSettings, sessionFilter]);

  // Filtered rows based on search and filters
  const filteredRows = useMemo(() => {
    return studentRows.filter(row => {
      if (statusFilter === 'CLEARED' && !row.hasPaid) return false;
      if (statusFilter === 'UNPAID' && row.hasPaid) return false;
      if (statusFilter === 'MANUAL' && (!row.hasPaid || !row.isManual)) return false;

      if (levelFilter !== 'ALL' && !row.level.startsWith(levelFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = row.name.toLowerCase().includes(q);
        const matchReg = row.registrationNumber.toLowerCase().includes(q);
        const matchEmail = row.email.toLowerCase().includes(q);
        const matchRef = (row.reference || '').toLowerCase().includes(q);
        const matchSess = (row.session || '').toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchEmail && !matchRef && !matchSess) return false;
      }

      return true;
    });
  }, [studentRows, statusFilter, levelFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const rawFilterSession = sessionFilter;
    const filterSessionStr = typeof rawFilterSession === 'string'
      ? rawFilterSession
      : (rawFilterSession?.sessionName || getActiveAcademicSession());
    const isSpecificSession = filterSessionStr && filterSessionStr !== 'ALL';

    const rawSettingsSession = duesSettings?.academic_session;
    const settingsSessionStr = typeof rawSettingsSession === 'string'
      ? rawSettingsSession
      : (rawSettingsSession?.sessionName || getActiveAcademicSession());
    const targetSession = isSpecificSession ? filterSessionStr : settingsSessionStr;

    const totalStudents = studentRows.length;
    const clearedStudents = studentRows.filter(r => r.hasPaid).length;
    const unpaidStudents = totalStudents - clearedStudents;
    const activeRate = Number(duesSettings?.dues_amount || 2500);

    const relevantPayments = duesPayments.filter(p => {
      if (p.status !== 'successful') return false;
      if (isSpecificSession) {
        const rawPSess = p.academic_session || p.metadata?.academic_session;
        const pSess = typeof rawPSess === 'string' ? rawPSess : (rawPSess?.sessionName || '');
        return pSess === targetSession;
      }
      return true;
    });

    const totalRevenue = relevantPayments.reduce((sum, p) => sum + (Number(p.amount) || activeRate), 0);

    const clearanceRate = totalStudents > 0 ? Math.round((clearedStudents / totalStudents) * 100) : 0;
    const manualCleared = studentRows.filter(r => r.hasPaid && r.isManual).length;

    return {
      totalStudents,
      clearedStudents,
      unpaidStudents,
      totalRevenue,
      clearanceRate,
      manualCleared,
      activeRate
    };
  }, [studentRows, duesPayments, duesSettings, sessionFilter]);

  // Update Dues Fee & Academic Session
  const handleSaveRateAndSession = async (e) => {
    e.preventDefault();
    const rateNum = Number(newRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      showNotification('Please enter a valid dues fee amount.', 'error');
      return;
    }
    const sessionStr = typeof newSession === 'string' ? newSession.trim() : (newSession?.sessionName || '').trim();
    if (!sessionStr) {
      showNotification('Please provide a valid academic session (e.g. 2026/2027).', 'error');
      return;
    }

    setIsSavingRate(true);
    try {
      const res = await updateDuesFee(rateNum, sessionStr);
      if (res?.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Dues fee updated to ₦${rateNum.toLocaleString()} for session ${sessionStr}.`, 'success');
        setIsRateModalOpen(false);
        await loadDuesData();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to update dues settings.', 'error');
    } finally {
      setIsSavingRate(false);
    }
  };

  // Open Manual Clearance Modal
  const openManualClearanceModal = (student = null) => {
    if (student) {
      setClearanceForm({
        studentId: student.studentId || student.id,
        registrationNumber: student.registrationNumber !== 'Pending' ? student.registrationNumber : '',
        studentName: student.name,
        studentEmail: student.email !== '—' ? student.email : '',
        level: student.level,
        amount: String(metrics.activeRate || 2500),
        paymentMethod: 'FUTO Microfinance Bank Teller',
        reference: `BURS-${student.registrationNumber || Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        note: 'Walk-in bursary clearance verified by departmental officer'
      });
      setClearanceModalStudent(student);
    } else {
      setClearanceForm({
        studentId: '',
        registrationNumber: '',
        studentName: '',
        studentEmail: '',
        level: '100 Level',
        amount: String(metrics.activeRate || 2500),
        paymentMethod: 'FUTO Microfinance Bank Teller',
        reference: `BURS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        note: 'Manual bank teller / POS clearance by portal officer'
      });
      setClearanceModalStudent(null);
    }
    setIsClearanceModalOpen(true);
  };

  // Perform Authoritative Manual Clearance
  const handlePerformClearance = async (e) => {
    e.preventDefault();
    if (!clearanceForm.registrationNumber.trim() && !clearanceForm.studentId) {
      showNotification('Please specify a valid student matric/reg number or select a registered student.', 'error');
      return;
    }

    setIsClearing(true);
    try {
      const res = await adminManuallyClearDues({
        studentId: clearanceForm.studentId || clearanceForm.registrationNumber.trim(),
        registrationNumber: clearanceForm.registrationNumber.trim(),
        studentName: clearanceForm.studentName || 'Student',
        studentEmail: clearanceForm.studentEmail,
        amount: Number(clearanceForm.amount) || metrics.activeRate || 2500,
        academicSession: (sessionFilter && sessionFilter !== 'ALL') ? sessionFilter : (duesSettings.academic_session || getActiveAcademicSession()),
        level: clearanceForm.level,
        paymentMethod: clearanceForm.paymentMethod,
        reference: clearanceForm.reference.trim(),
        note: clearanceForm.note
      });

      if (res?.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Bursary clearance granted for ${clearanceForm.registrationNumber || clearanceForm.studentName}!`, 'success');
        setIsClearanceModalOpen(false);
        await loadDuesData();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to process manual clearance.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Revoke Clearance
  const handleRevokeClearance = async () => {
    if (!revokeConfirmStudent) return;
    setIsRevoking(true);
    try {
      const res = await adminRevokeDuesClearance({
        reference: revokeConfirmStudent.reference,
        registrationNumber: revokeConfirmStudent.registrationNumber,
        studentId: revokeConfirmStudent.studentId
      });

      if (res?.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Dues clearance revoked for ${revokeConfirmStudent.name}.`, 'success');
        setRevokeConfirmStudent(null);
        await loadDuesData();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to revoke clearance.', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (studentRows.length === 0) {
      showNotification('No student records to export.', 'error');
      return;
    }

    const headers = ['Full Name', 'Matric Number', 'Email', 'Level', 'Session', 'Department', 'Dues Status', 'Amount Paid (NGN)', 'Payment Method', 'Payment Reference', 'Cleared Date'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(r => [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.registrationNumber}"`,
        `"${r.email}"`,
        `"${r.level}"`,
        `"${r.session || duesSettings.academic_session}"`,
        `"${r.department}"`,
        r.hasPaid ? 'CLEARED' : 'UNPAID',
        r.hasPaid ? (r.amount || metrics.activeRate) : 0,
        `"${r.provider}"`,
        `"${r.reference || 'N/A'}"`,
        `"${r.paidAt ? new Date(r.paidAt).toLocaleDateString() : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NACOS_FUTO_Dues_Ledger_${duesSettings.academic_session?.replace('/', '-')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Departmental dues ledger exported successfully.');
  };

  return (
    <PortalAdminLayout
      title="Departmental Dues Management"
      subtitle="Authoritative bursary clearance, fee configurations, and real-time payment ledger"
    >
      <div className="space-y-6">

        {/* Global Feedback Banner */}
        {feedback.message && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback({ message: '', type: '' })}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Actions Bar */}
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDark ? 'bg-[#083002]/40 border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-xs text-gray-900'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043]">
                Bursary & Financial Ledger
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                Session: {typeof duesSettings?.academic_session === 'string' ? duesSettings.academic_session : (duesSettings?.academic_session?.sessionName || '2026/2027')}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black mt-1 tracking-tight">
              NACOS Departmental Dues Control Center
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Configure Dues Fee Button */}
            <button
              type="button"
              onClick={() => setIsRateModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
              <span>Configure Fee (₦{metrics.activeRate.toLocaleString()})</span>
            </button>

            {/* Manual Bursary Clearance Button */}
            <button
              type="button"
              onClick={() => openManualClearanceModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Manual Bursary Clear</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadDuesData()}
              disabled={loading || refreshing}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#138601]/40 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin text-[#138601]' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── Metric Cards Grid (Just like ID Card own) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Total Revenue */}
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            isDark ? 'bg-[#083002]/50 border-[#138601]/30 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-green-300/70 uppercase tracking-wider">
                Total Dues Revenue
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-[#138601] dark:text-[#4bd043]">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                ₦{Number(metrics.totalRevenue).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                From {metrics.clearedStudents} confirmed payments
              </p>
            </div>
          </div>

          {/* Card 2: Cleared Students */}
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            isDark ? 'bg-[#083002]/50 border-[#138601]/30 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-green-300/70 uppercase tracking-wider">
                Students Cleared
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {metrics.clearedStudents}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.clearanceRate}% of enrolled roster
              </p>
            </div>
          </div>

          {/* Card 3: Unpaid / Pending Students */}
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            isDark ? 'bg-[#083002]/50 border-[#138601]/30 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-green-300/70 uppercase tracking-wider">
                Unpaid / Pending
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                {metrics.unpaidStudents}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Awaiting fee payment
              </p>
            </div>
          </div>

          {/* Card 4: Current Dues Rate */}
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            isDark ? 'bg-[#083002]/50 border-[#138601]/30 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-green-300/70 uppercase tracking-wider">
                Active Fee Rate
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                ₦{Number(metrics.activeRate).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Per student / academic session
              </p>
            </div>
          </div>

          {/* Card 5: Manual Bursary Records */}
          <div className={`p-5 rounded-2xl border transition-all shadow-xs ${
            isDark ? 'bg-[#083002]/50 border-[#138601]/30 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-green-300/70 uppercase tracking-wider">
                Manual Clearances
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                {metrics.manualCleared}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Via Bank Teller or Walk-in POS
              </p>
            </div>
          </div>

        </div>

        {/* ─── Search & Filtering Controls ─── */}
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          isDark ? 'bg-[#083002]/40 border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-xs text-gray-900'
        }`}>
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, matric / reg number, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: `All (${studentRows.length})` },
              { id: 'CLEARED', label: `Cleared (${metrics.clearedStudents})` },
              { id: 'UNPAID', label: `Unpaid (${metrics.unpaidStudents})` },
              { id: 'MANUAL', label: `Manual (${metrics.manualCleared})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#138601] text-white shadow-xs'
                    : isDark
                    ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Academic Session Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Academic Sessions</option>
              {availableSessions.map((sess) => (
                <option key={sess} value={sess}>{sess} Session</option>
              ))}
            </select>
          </div>

          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Academic Levels</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
            </select>
          </div>
        </div>

        {/* ─── Dues Ledger Table ─── */}
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#083002]/40 border-[#138601]/25 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
        }`}>
          <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                <span>Departmental Dues Student Roster & Clearance Status</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Showing {filteredRows.length} of {studentRows.length} total students
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-[#138601] mb-3" />
              <p className="text-xs font-semibold">Synchronizing departmental dues records from database...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <Users className="w-10 h-10 mx-auto opacity-40" />
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300">No matching student records found</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No students match your active filters or search terms. Try clearing the filters or search query.
              </p>
              {(searchQuery || statusFilter !== 'ALL' || levelFilter !== 'ALL' || sessionFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setLevelFilter('ALL');
                    setSessionFilter('ALL');
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-200 cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10 text-gray-400 uppercase tracking-wider text-[11px] bg-gray-50/50 dark:bg-black/20">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Matric / Reg No</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Channel / Reference</th>
                    <th className="py-3 px-4">Date Cleared</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            row.hasPaid 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#138601] dark:text-[#4bd043]'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                          }`}>
                            {row.name[0] || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white leading-tight">
                              {row.name}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">
                              {row.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reg Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#138601] dark:text-green-300">
                        {row.registrationNumber}
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {row.level}
                      </td>

                      {/* Session */}
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        {typeof row.session === 'string' ? row.session : (row.session?.sessionName || '—')}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {row.hasPaid ? (
                          <span className="text-gray-900 dark:text-white">
                            ₦{Number(row.amount || metrics.activeRate).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">₦0</span>
                        )}
                      </td>

                      {/* Channel & Reference */}
                      <td className="py-3.5 px-4">
                        {row.hasPaid ? (
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.isManual
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {row.isManual ? 'Manual Bursary' : 'Online Gateway'}
                            </span>
                            <div className="font-mono text-[10px] text-gray-400 mt-1 truncate max-w-[140px]" title={row.reference}>
                              {row.reference || '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Unpaid</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-[11px]">
                        {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {row.hasPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Cleared</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.hasPaid ? (
                            <>
                              {/* View Receipt */}
                              <button
                                type="button"
                                onClick={() => setReceiptModalPayment(row)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="View Official Receipt"
                              >
                                <Receipt className="w-3 h-3 text-[#138601]" />
                                <span className="hidden sm:inline">Receipt</span>
                              </button>

                              {/* Revoke Clearance */}
                              <button
                                type="button"
                                onClick={() => setRevokeConfirmStudent(row)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Revoke Clearance"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden sm:inline">Revoke</span>
                              </button>
                            </>
                          ) : (
                            /* Manual Clear */
                            <button
                              type="button"
                              onClick={() => openManualClearanceModal(row)}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Grant Bursary Clearance"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Clear Dues</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ─── MODAL 1: Configure Dues Fee & Academic Session ─── */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl border p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-[#138601] dark:text-[#4bd043]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Configure Dues Fee</h3>
                  <p className="text-xs text-gray-400">Departmental financial rate settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRateAndSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Dues Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                    placeholder="2500"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Default fee charged for each student per departmental academic session.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Academic Session
                </label>
                <input
                  type="text"
                  required
                  value={newSession}
                  onChange={(e) => setNewSession(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                  placeholder="2026/2027"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Active academic tenure for this dues fee schedule.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRate}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Manual Bursary Clearance ─── */}
      {isClearanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-lg w-full rounded-2xl border p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-[#138601] dark:text-[#4bd043]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Manual Bursary Clearance</h3>
                  <p className="text-xs text-gray-400">Record bank teller, POS, or bursary exemption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePerformClearance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Matric / Reg Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={clearanceForm.registrationNumber}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, registrationNumber: e.target.value.toUpperCase() })}
                    placeholder="20211234567"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    value={clearanceForm.studentName}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, studentName: e.target.value })}
                    placeholder="Chukwuebuka Anyanwu"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Amount Cleared (NGN) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={clearanceForm.amount}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Level
                  </label>
                  <select
                    value={clearanceForm.level}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, level: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none cursor-pointer"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Payment Channel *
                  </label>
                  <select
                    value={clearanceForm.paymentMethod}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none cursor-pointer"
                  >
                    <option value="FUTO Microfinance Bank Teller">FUTO Microfinance Bank Teller</option>
                    <option value="First Bank Teller">First Bank Teller</option>
                    <option value="Zenith Bank Teller">Zenith Bank Teller</option>
                    <option value="Departmental POS Clearance">Departmental POS Clearance</option>
                    <option value="Cash at Bursary Desk">Cash at Bursary Desk</option>
                    <option value="Special Exemption / Scholarship">Special Exemption / Scholarship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Teller / Receipt Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={clearanceForm.reference}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, reference: e.target.value })}
                    placeholder="TLR-987654"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Audit Note / Remarks
                </label>
                <textarea
                  rows="2"
                  value={clearanceForm.note}
                  onChange={(e) => setClearanceForm({ ...clearanceForm, note: e.target.value })}
                  placeholder="Verified by departmental portal officer"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 focus:border-[#138601] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClearanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClearing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Grant Clearance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Official Printable Receipt ─── */}
      {receiptModalPayment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white text-gray-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReceiptModalPayment(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Header */}
            <div className="text-center space-y-1 border-b pb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#138601] flex items-center justify-center mx-auto mb-2 font-black text-lg">
                NACOS
              </div>
              <h2 className="text-base font-black tracking-tight uppercase">
                Nigeria Association of Computing Students
              </h2>
              <p className="text-xs text-gray-500 font-semibold">
                Federal University of Technology, Owerri (FUTO)
              </p>
              <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-100 text-[#138601] text-[11px] font-bold tracking-wider uppercase">
                Official Departmental Dues Receipt
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Student Name:</span>
                <span className="font-bold text-gray-900">{receiptModalPayment.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Matric / Reg Number:</span>
                <span className="font-mono font-bold text-[#138601]">{receiptModalPayment.registrationNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Academic Level:</span>
                <span className="font-semibold text-gray-900">{receiptModalPayment.level}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Academic Session:</span>
                <span className="font-semibold text-gray-900">{typeof duesSettings?.academic_session === 'string' ? duesSettings.academic_session : (duesSettings?.academic_session?.sessionName || '2026/2027')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Channel:</span>
                <span className="font-semibold text-gray-900">{receiptModalPayment.provider}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Reference Code:</span>
                <span className="font-mono text-[11px] font-bold text-gray-700">{receiptModalPayment.reference || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Date:</span>
                <span className="font-semibold text-gray-900">
                  {receiptModalPayment.paidAt ? new Date(receiptModalPayment.paidAt).toLocaleDateString() : '—'}
                </span>
              </div>

              {/* Amount Highlight */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center mt-3">
                <span className="text-xs font-bold text-gray-600 uppercase">Amount Paid</span>
                <span className="text-lg font-black text-[#138601]">
                  ₦{Number(receiptModalPayment.amount || metrics.activeRate).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Receipt Footer Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer text-center"
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalPayment(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: Revoke Clearance Confirmation ─── */}
      {revokeConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-sm w-full rounded-2xl border p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Revoke Dues Clearance?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to revoke the dues clearance for{' '}
                <strong className="text-gray-900 dark:text-white">{revokeConfirmStudent.name}</strong> ({revokeConfirmStudent.registrationNumber})?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRevokeConfirmStudent(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleRevokeClearance}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Revoke</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </PortalAdminLayout>
  );
}
