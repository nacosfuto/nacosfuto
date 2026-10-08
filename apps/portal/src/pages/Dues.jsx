import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Download,
  CreditCard,
  Plus,
  RefreshCw,
  X,
  FileText,
  ChevronDown,
  ExternalLink,
  Check
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { useTheme } from '../context/ThemeContext';
import { supabase, recordStudentPayment, getDuesSettings, getLocalPaymentsDatabase } from '@nacos/supabase';
import StepUpAuthModal from '../components/StepUpAuthModal';
import PosThermalReceipt from '../components/PosThermalReceipt';

/**
 * Determine Progressive Levels for a student.
 * Students in 100L only see 100L. Students in 200L see 100L and 200L.
 * Students never see future levels beyond their current standing.
 */
export const getProgressiveLevels = (u) => {
  if (!u) return ['100'];
  if (u.is_graduated || String(u.level).toLowerCase().includes('graduat')) {
    return ['100', '200', '300', '400', '500'];
  }
  const raw = String(u.level || u.current_level || '100');
  const match = raw.match(/(\d{3})/);
  let lvlNum = match ? parseInt(match[1], 10) : 100;

  if ((!lvlNum || lvlNum < 100) && u.admission_year) {
    const yearsDiff = new Date().getFullYear() - parseInt(u.admission_year, 10) + 1;
    lvlNum = Math.min(500, Math.max(100, yearsDiff * 100));
  }

  const validMax = Math.min(500, Math.max(100, Math.floor(lvlNum / 100) * 100));
  const allLevels = ['100', '200', '300', '400', '500'];
  const maxIdx = allLevels.indexOf(String(validMax));
  return maxIdx !== -1 ? allLevels.slice(0, maxIdx + 1) : ['100'];
};

const Dues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [duesFee, setDuesFee] = useState(2500);
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);

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

  const [isRevoked, setIsRevoked] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');
  const [totalLifetimeDues, setTotalLifetimeDues] = useState(0);

  // Complete list of ALL payments student has made (synced from DB)
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);

  // Level map storing dues clearance for each academic level
  const [levelDuesMap, setLevelDuesMap] = useState({
    '100': null,
    '200': null,
    '300': null,
    '400': null,
    '500': null
  });

  // Allowed levels based on progressive student level
  const progressiveLevels = getProgressiveLevels(user);

  // New Invoice Modal state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [formSession, setFormSession] = useState('2026/2027');
  const [formPaymentType, setFormPaymentType] = useState('Departmental Dues - Full Payment');
  const [formLevel, setFormLevel] = useState(() => {
    const pLevels = getProgressiveLevels(user);
    return pLevels[pLevels.length - 1] || '100';
  });

  // Cross-tab Gateway Waiting & Polling State
  const [isAwaitingGateway, setIsAwaitingGateway] = useState(false);
  const [gatewayRef, setGatewayRef] = useState('');
  const pollTimerRef = useRef(null);

  // Real Thermal POS Receipt Modal State
  const [isPosReceiptOpen, setIsPosReceiptOpen] = useState(false);
  const [posReceiptData, setPosReceiptData] = useState(null);
  const [isInvoiceSlip, setIsInvoiceSlip] = useState(false);

  // Check payment status from Bachs payments table and Supabase across all levels
  const checkStatus = async (currentUser) => {
    const matric = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber || '';
    const cleanMatric = String(matric).trim().toUpperCase();
    const userId = currentUser?.id;
    const studentHomeLevel = String(currentUser?.level || currentUser?.current_level || '100').match(/\d{3}/)?.[0] || '100';

    const newMap = {
      '100': null,
      '200': null,
      '300': null,
      '400': null,
      '500': null
    };

    let totalPaidSum = 0;
    const allRecords = [];

    // Helper to format and add a payment record to the master history list
    const processItem = (item) => {
      const amt = Number(item.amount || 2500);
      const isPaid = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(String(item.status).toLowerCase()) || Boolean(item.paid_at);

      if (isPaid) {
        totalPaidSum += amt;
      }

      const payDate = item.paid_at || item.created_at || new Date().toISOString();
      const dateObj = new Date(payDate);
      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'Current Session';
      const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-GB') : '12:00:00';

      const itemLevelRaw = item.metadata?.level || item.level || '';
      const match = String(itemLevelRaw).match(/\d{3}/);
      const lvl = match ? match[0] : studentHomeLevel;

      const isIdCard = item.payment_type === 'ID_CARD' || 
        String(item.purpose || '').toLowerCase().includes('id card') ||
        String(item.title || '').toLowerCase().includes('id card') ||
        String(item.payment_title || '').toLowerCase().includes('id card');

      // STRICT USER RULE: ID Card payments NEVER show on Dues page
      if (isIdCard) return;

      // STRICT USER RULE: Only successful payments are allowed to show on the dashboard table
      if (!isPaid) return;

      const paymentTypeLabel = 'Departmental Dues (Full Payment)';
      const session = item.metadata?.academic_session || item.session || currentUser?.academic_session || '2026/2027';

      const formatted = {
        id: item.id || item.reference || `pay-${Math.random()}`,
        receiptNo: item.reference || item.payment_reference || `NACOS/DUES/${cleanMatric}-${lvl}L`,
        transactionId: item.provider_payment_id || item.id || `BCH-${Date.now()}`,
        date: dateStr,
        time: timeStr,
        paymentDate: `${dateStr} (${timeStr} GMT+1)`,
        amount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        rawAmount: amt,
        paymentMethod: item.provider ? `${item.provider} Online Gateway` : (item.payment_method || 'Bachs Online Gateway (Verified)'),
        status: 'Verified & Cleared',
        isPaid: true,
        session: session,
        level: `${lvl} LEVEL`,
        levelNum: lvl,
        paymentType: paymentTypeLabel,
        studentName: (currentUser?.full_name || currentUser?.name || item.customer_name || 'Student Member').trim(),
        matricNo: cleanMatric || '20241450682',
        department: currentUser?.department || 'Computer Science',
        created_at: item.created_at || item.paid_at || new Date().toISOString()
      };

      allRecords.push(formatted);

      if (['100', '200', '300', '400', '500'].includes(lvl) && !newMap[lvl]) {
        newMap[lvl] = formatted;
      }
    };

    // 1. Authoritative Bachs Live Payments Table (Supabase)
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

        const { data: allDbPayments } = await query.order('created_at', { ascending: false });
        if (allDbPayments && allDbPayments.length > 0) {
          allDbPayments.forEach(p => processItem(p));
        }
      }
    } catch (err) {
      console.warn('Bachs payments check error:', err);
    }

    // 2. Legacy dues_payments table
    try {
      if (userId && supabase) {
        const { data: legacyDues } = await supabase
          .from('dues_payments')
          .select('*')
          .eq('student_id', userId);

        if (legacyDues && legacyDues.length > 0) {
          legacyDues.forEach(item => processItem(item));
        }
      }
    } catch (err) {
      console.warn('Legacy dues check error:', err);
    }

    // 3. Departmental dues table
    try {
      if (cleanMatric && supabase) {
        const { data: deptDues } = await supabase
          .from('departmental_dues')
          .select('*')
          .eq('matric_number', cleanMatric);

        if (deptDues && deptDues.length > 0) {
          deptDues.forEach(item => processItem(item));
        }
      }
    } catch (err) {
      console.warn('Departmental dues table check error:', err);
    }

    // 4. Local storage verified payments database
    try {
      const localPays = getLocalPaymentsDatabase();
      if (Array.isArray(localPays)) {
        const userLocal = localPays.filter(p => 
          (p.student_matric && p.student_matric.toUpperCase() === cleanMatric) ||
          (p.registration_number && p.registration_number.toUpperCase() === cleanMatric)
        );
        userLocal.forEach(p => processItem(p));
      }
    } catch (err) {
      console.warn('Local payments check error:', err);
    }

    // 5. Fallback to profile flags for student's active level if marked cleared
    if (
      currentUser?.dues_cleared === true ||
      currentUser?.has_paid_dues === true ||
      ['cleared', 'successful', 'verified', 'paid'].includes(String(currentUser?.payment_status).toLowerCase())
    ) {
      const existingPaidForLevel = allRecords.find(r => r.levelNum === studentHomeLevel && r.isPaid);
      if (!existingPaidForLevel) {
        processItem({
          id: `prof-${cleanMatric}-${studentHomeLevel}`,
          reference: currentUser.receipt_no || currentUser.payment_reference || `NACOS/DUES/${cleanMatric || 'FUTO'}-${studentHomeLevel}L`,
          amount: currentUser.dues_amount || 2500,
          status: 'successful',
          level: studentHomeLevel,
          session: currentUser.academic_session || '2026/2027',
          paid_at: currentUser.dues_paid_at || new Date().toISOString()
        });
      }
    }

    // Deduplicate records by receiptNo or transactionId
    const seenKeys = new Set();
    const uniqueRecords = [];
    for (const rec of allRecords) {
      const key = rec.receiptNo || rec.transactionId || rec.id;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRecords.push(rec);
      }
    }

    // Sort latest first
    uniqueRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setPaymentHistoryList(uniqueRecords);
    setLevelDuesMap(newMap);
    setTotalLifetimeDues(totalPaidSum);

    // Revocation status check
    const userIsRevoked = String(currentUser?.payment_status).toLowerCase() === 'revoked' || currentUser?.dues_revoked === true;
    if (userIsRevoked) {
      setIsRevoked(true);
      setRevocationReason(currentUser?.dues_revocation_reason || 'Departmental dues clearance was officially revoked by administration. A new dues payment is required to restore clearance.');
    } else {
      setIsRevoked(false);
      setRevocationReason('');
    }
  };

  // Cross-tab Polling & Listener
  const startAwaitingPaymentSync = (ref, checkoutId, targetLevel) => {
    let attempts = 0;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const checkPayment = async () => {
      attempts++;
      try {
        const queryParams = new URLSearchParams();
        if (ref) queryParams.set('reference', ref);
        if (checkoutId) queryParams.set('checkoutId', checkoutId);
        const matric = user?.registration_number || user?.matric;
        if (matric) queryParams.set('registrationNumber', matric);
        queryParams.set('paymentType', 'DEPARTMENTAL_DUES');

        const resp = await fetch(`/api/payments/status?${queryParams.toString()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.isPaid || data.status === 'successful') {
            clearInterval(pollTimerRef.current);
            setIsAwaitingGateway(false);

            // Update user record in session
            const updatedUser = {
              ...user,
              dues_cleared: true,
              has_paid_dues: true,
              payment_status: 'cleared',
              receipt_no: data.reference || ref,
              dues_paid_at: new Date().toISOString()
            };
            localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            window.dispatchEvent(new Event('nacos_user_updated'));

            await checkStatus(updatedUser);

            // Update notification and prepare receipt without abrupt screen takeover
            setNotification({
              type: 'success',
              message: `Payment confirmed! Departmental dues clearance for ${targetLevel} Level has been approved and recorded.`
            });

            const receiptPayload = {
              receiptNo: data.reference || ref || `NACOS/DUES/${matric}-${targetLevel}L`,
              transactionId: data.payment?.provider_payment_id || `BCH-${Date.now()}`,
              date: new Date().toLocaleDateString('en-GB'),
              time: new Date().toLocaleTimeString('en-GB'),
              studentName: (user.full_name || user.name || 'Student Member').trim(),
              matricNo: matric || '20241450682',
              department: user.department || 'Computer Science',
              level: `${targetLevel} LEVEL`,
              session: formSession,
              amount: data.amount ? `₦${Number(data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦2,500.00',
              rawAmount: data.amount || 2500,
              paymentType: 'Departmental Dues (Full Payment)',
              paymentMethod: 'Bachs Online Gateway (Confirmed)',
              status: 'APPROVED'
            };
            setPosReceiptData(receiptPayload);
            setIsInvoiceSlip(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Cross-tab sync poll error:', err);
      }

      if (attempts > 60) {
        clearInterval(pollTimerRef.current);
        setIsAwaitingGateway(false);
      }
    };

    pollTimerRef.current = setInterval(checkPayment, 2500);
  };

  useEffect(() => {
    // Cross-tab broadcast listener (when payment succeeds in another tab)
    let channel = null;
    try {
      channel = new BroadcastChannel('nacos_payment_sync');
      channel.onmessage = (event) => {
        if (event.data?.status === 'successful') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsAwaitingGateway(false);
          const stored = localStorage.getItem('nacos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed);
              checkStatus(parsed);
            } catch (e) {}
          }
        }
      };
    } catch (e) {}

    const handleStorageEvent = (e) => {
      if (e.key === 'nacos_last_payment_success' || e.key === 'nacos_user') {
        const stored = localStorage.getItem('nacos_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            checkStatus(parsed);
          } catch (err) {}
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [user]);

  // Handle URL return parameters if user navigated back in the same tab
  useEffect(() => {
    const paymentAction = searchParams.get('payment');
    const ref = searchParams.get('reference');
    const chkId = searchParams.get('checkout_id') || searchParams.get('checkoutId');

    if (paymentAction === 'verifying' && (ref || chkId)) {
      setIsAwaitingGateway(true);
      setGatewayRef(chkId || ref);
      startAwaitingPaymentSync(ref, chkId, formLevel);
      searchParams.delete('payment');
      searchParams.delete('reference');
      searchParams.delete('checkout_id');
      searchParams.delete('checkoutId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('nacos_user');
      let currentUser = user;
      if (stored) {
        try {
          currentUser = JSON.parse(stored);
          setUser(currentUser);
        } catch (e) {}
      }
      await checkStatus(currentUser);

      try {
        const ds = await getDuesSettings();
        if (ds?.dues_amount && !isNaN(Number(ds.dues_amount))) {
          setDuesFee(Number(ds.dues_amount));
        }
        if (ds?.academic_session) {
          setFormSession(ds.academic_session);
        }
      } catch (e) {}
    };

    init();
  }, []);

  // Initiate Dues Payment
  const handleOpenNewInvoice = () => {
    setIsNewInvoiceOpen(true);
  };

  const handleSubmitNewInvoice = () => {
    setIsStepUpOpen(true);
  };

  // Authoritative Checkout Handler: Opens Gateway in New Tab
  const executeCheckout = async (actionToken) => {
    setIsProcessing(true);
    try {
      const resp = await fetch('/api/payments/dues/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': actionToken ? `Bearer ${actionToken}` : ''
        },
        body: JSON.stringify({
          student: user,
          academicSession: formSession,
          level: formLevel,
          stepUpToken: actionToken
        })
      });

      const data = await resp.json();

      if (data.checkoutUrl) {
        // 1. OPEN IN NEW TAB
        window.open(data.checkoutUrl, '_blank');

        // 2. Close New Invoice Form
        setIsNewInvoiceOpen(false);

        // 3. Keep current portal tab active with live listening
        setIsAwaitingGateway(true);
        setGatewayRef(data.providerCheckoutId || data.reference || '');
        startAwaitingPaymentSync(data.reference, data.providerCheckoutId, formLevel);
        return;
      }

      // Safe local fallback
      const matric = user?.registration_number || user?.matric || '20241450682';
      const res = await recordStudentPayment(matric, duesFee);
      if (res.success) {
        const updatedUser = {
          ...user,
          dues_cleared: true,
          has_paid_dues: true,
          payment_status: 'cleared',
          receipt_no: res.payment.payment_reference,
          dues_paid_at: new Date().toISOString()
        };
        localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('nacos_user_updated'));
        await checkStatus(updatedUser);
        setIsNewInvoiceOpen(false);
      }
    } catch (e) {
      console.error('Payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Real POS Receipt Modal for a specific row
  const handleOpenPosReceipt = (row, isInvoice = false) => {
    setPosReceiptData(row);
    setIsInvoiceSlip(isInvoice);
    setIsPosReceiptOpen(true);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* Top Header with "New Invoice" Action Button (Matching User Image 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              School Fees &amp; Departmental Dues
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
              Official clearance history and electronic POS receipts for Department of Computer Science.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenNewInvoice}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Revocation Alert Banner */}
        {isRevoked && (
          <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 space-y-3 shadow-xs print:hidden">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                  Departmental Dues Clearance Revoked
                </h3>
                <p className="text-xs text-red-700 dark:text-red-200">
                  {revocationReason || 'Your clearance standing was officially revoked by administration. A new dues payment is required to restore your clearance.'}
                </p>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenNewInvoice}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Dues Now to Restore Clearance (₦{Number(duesFee).toLocaleString()})</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SCHOOL FEES HISTORY TABLE (Matching User Image 1 Exactly)             */}
        {/* ==================================================================== */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 shadow-xs overflow-hidden">
          
          <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              School Fees History
            </h2>
            <span className="text-xs font-semibold text-gray-500 dark:text-green-200/70">
              Total Records: <strong className="text-gray-900 dark:text-white">{paymentHistoryList.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200/70 dark:border-[#138601]/20 bg-gray-50/50 dark:bg-[#041801]/60 text-gray-500 dark:text-green-200/70 font-semibold text-[11px] sm:text-xs">
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-4">Amount ₦</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Payment Type</th>
                  <th className="py-3.5 px-4">Session</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 text-gray-800 dark:text-gray-100">
                {paymentHistoryList.length > 0 ? (
                  paymentHistoryList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors">
                      <td className="py-4 px-5 font-mono font-medium text-gray-900 dark:text-white text-xs">
                        <div className="flex items-center gap-2">
                          <span>{row.receiptNo}</span>
                          {row.isPaid ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/60 dark:text-[#4bd043]">
                              PAID
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              PENDING
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                        {row.rawAmount ? Number(row.rawAmount).toLocaleString() : '2,500'}
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-700 dark:text-green-200">
                        {row.level}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                        {row.paymentType || 'Full Payment'}
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-600 dark:text-gray-300">
                        {row.session}
                      </td>
                      <td className="py-4 px-5 text-right space-y-1.5 sm:space-y-0 sm:space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPosReceipt(row, true)}
                          className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#062402] border border-gray-200/80 dark:border-[#138601]/30 transition-colors cursor-pointer"
                        >
                          Print Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPosReceipt(row, false)}
                          className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-[#0e8040] hover:text-[#0b6a34] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer"
                        >
                          Print Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 px-5 text-center space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-400 dark:text-green-200/50 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                          No Dues Payment History Found
                        </p>
                        <p className="text-xs text-gray-500 dark:text-green-200/60 max-w-sm mx-auto">
                          You have not completed any departmental dues payments yet. Click <strong>"New Invoice"</strong> to generate your dues invoice and complete payment.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenNewInvoice}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create New Dues Invoice</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* ==================================================================== */}
        {/* NEW INVOICE MODAL / "SELECT SESSION" (Matching User Image 2 Exactly)  */}
        {/* ==================================================================== */}
        {isNewInvoiceOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="relative max-w-2xl w-full bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/40 shadow-2xl p-6 sm:p-8 space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#138601]/25">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Select Session
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                    Generate an official departmental dues clearance invoice.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body (Matching Image 2 field-for-field) */}
              <div className="space-y-5">
                
                {/* 1. Academic Session */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Academic Session
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formSession}
                      onChange={(e) => setFormSession(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer"
                    >
                      <option value="2026/2027">2026/2027 Academic Session</option>
                      <option value="2025/2026">2025/2026 Academic Session</option>
                      <option value="2024/2025">2024/2025 Academic Session</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Payment Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Payment Type
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formPaymentType}
                      onChange={(e) => setFormPaymentType(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer"
                    >
                      <option value="Departmental Dues - Full Payment">
                        Departmental Dues (Full Payment - ₦{Number(duesFee).toLocaleString()})
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Level (PROGRESSIVE DETERMINATION - Users cannot see levels ahead of them) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Level
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-[#0e8040] dark:border-[#138601] bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer font-medium"
                    >
                      {progressiveLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} Level
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Progressive Level notice */}
                <div className="text-[11px] text-gray-500 dark:text-green-200/60 bg-gray-50 dark:bg-[#041801]/60 p-3 rounded-lg border border-gray-200/60 dark:border-[#138601]/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0e8040] inline mr-1 -mt-0.5" />
                  Progressive academic levels active: Showing clearance tiers available for your registered standing ({user.level || '100 Level'}).
                </div>

              </div>

              {/* Modal Footer with "Submit" Button (Matching Image 2 green submit) */}
              <div className="pt-4 border-t border-gray-100 dark:border-[#138601]/25 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitNewInvoice}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Submit</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CROSS-TAB GATEWAY LISTENING OVERLAY (Opens Gateway in New Tab)        */}
        {/* ==================================================================== */}
        {isAwaitingGateway && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-white dark:bg-[#083002] rounded-2xl border border-gray-200 dark:border-[#138601]/40 shadow-2xl p-6 sm:p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-[#041801] text-[#0e8040] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-[#0e8040]/30 animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/70 dark:text-[#4bd043]">
                  Bachs Gateway Opened in New Tab
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Awaiting Payment Confirmation
                </h3>
                <p className="text-xs text-gray-600 dark:text-green-100/80 leading-relaxed">
                  We opened the official Bachs checkout window in a new tab. Please complete payment there. This page will <strong>automatically refresh and display your official receipt</strong> once payment is received.
                </p>
              </div>

              {gatewayRef && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20 text-xs font-mono text-gray-600 dark:text-green-200 break-all">
                  Ref: <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">{gatewayRef}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => checkStatus(user)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Status Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAwaitingGateway(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Close Waiting Notice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REAL THERMAL POS RECEIPT MODAL                                       */}
        {/* ==================================================================== */}
        <PosThermalReceipt
          isOpen={isPosReceiptOpen}
          onClose={() => setIsPosReceiptOpen(false)}
          data={posReceiptData}
          isInvoice={isInvoiceSlip}
        />

        {/* Step-Up Authentication Modal */}
        <StepUpAuthModal
          isOpen={isStepUpOpen}
          onClose={() => setIsStepUpOpen(false)}
          onSuccess={(token) => executeCheckout(token)}
          purpose="PAYMENT_CONFIRMATION"
          title="Confirm Departmental Dues Payment"
          description={`Verify your identity before proceeding to Bachs payment checkout for ${formLevel} Level (${formSession}).`}
          user={user}
        />

      </div>
    </PortalLayout>
  );
};

export default Dues;
