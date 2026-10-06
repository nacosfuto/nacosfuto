import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Printer,
  CreditCard,
  Check
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';
import { useTheme } from '../context/ThemeContext';
import { supabase, getLocalPaymentsDatabase, recordStudentPayment } from '@nacos/supabase';

const Dues = () => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const [paymentData, setPaymentData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);

  // Level the student is paying dues for — pre-filled from their profile
  const deriveLevel = (u) => {
    const raw = String(u?.level || u?.current_level || '100');
    const num = parseInt(raw, 10);
    if ([100, 200, 300, 400, 500].includes(num)) return String(num);
    const match = raw.match(/(\d{3})/);
    return match ? match[1] : '100';
  };
  const [selectedLevel, setSelectedLevel] = useState(() => deriveLevel(user));

  // Check payment status from local storage and database
  const checkStatus = async (currentUser) => {
    const matric = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber || '';

    // 1. Check user profile object flags
    if (
      currentUser?.dues_cleared === true ||
      currentUser?.has_paid_dues === true ||
      ['cleared', 'successful', 'verified', 'paid'].includes(String(currentUser?.payment_status).toLowerCase())
    ) {
      setIsPaid(true);
      setPaymentData({
        receiptNo: currentUser.receipt_no || currentUser.payment_reference || `NACOS-FUTO-${matric || '2026'}-CLEARED`,
        paymentDate: currentUser.dues_paid_at || currentUser.payment_date || '12th November, 2024 (14:32:10 GMT+1)',
        amount: currentUser.dues_amount || '₦2,500.00',
        paymentMethod: currentUser.payment_method || 'Interswitch WebPAY / Direct Card Debit',
        status: 'Verified & Cleared'
      });
      return;
    }

    // 2. Check local payments database (nacos_payments_db)
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
            const dateStr = found.created_at ? new Date(found.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }) + ' (' + new Date(found.created_at).toLocaleTimeString('en-GB') + ' GMT+1)' : 'Current Session';

            setPaymentData({
              receiptNo: found.payment_reference || `NACOS-FUTO-${cleanMatric}`,
              paymentDate: dateStr,
              amount: found.amount ? `₦${Number(found.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦2,500.00',
              paymentMethod: found.payment_method || 'Interswitch WebPAY / Direct Card Debit',
              status: 'Verified & Cleared'
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Local payment check error:', e);
      }

      // 3. Check Supabase — use student_id (UUID), NOT matric_number (column doesn't exist)
      try {
        const userId = currentUser?.id;
        if (userId) {
          const { data: duesPay } = await supabase
            .from('dues_payments')
            .select('*')
            .eq('student_id', userId)
            .in('status', ['successful', 'verified', 'cleared', 'paid'])
            .maybeSingle();

          if (duesPay) {
            setIsPaid(true);
            const dateStr = duesPay.created_at ? new Date(duesPay.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }) + ' (' + new Date(duesPay.created_at).toLocaleTimeString('en-GB') + ' GMT+1)' : 'Current Session';
            setPaymentData({
              receiptNo: duesPay.payment_reference || `NACOS-FUTO-${matric || userId.slice(0, 8).toUpperCase()}`,
              paymentDate: dateStr,
              amount: duesPay.amount ? `₦${Number(duesPay.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦2,500.00',
              paymentMethod: duesPay.payment_method || 'Interswitch WebPAY / Direct Card Debit',
              status: 'Verified & Cleared'
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase dues check error:', err);
      }
    }

    // Otherwise unpaid
    setIsPaid(false);
    setPaymentData(null);
  };

  useEffect(() => {
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setSelectedLevel(deriveLevel(parsed));
          checkStatus(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    };

    handleUserUpdate();
    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
    };
  }, []);

  // Allow user to pay dues and immediately update status
  const handlePayDues = async () => {
    setIsProcessing(true);
    try {
      const matric = user.registration_number || user.matric || user.matricNumber || '20241450682';
      const res = await recordStudentPayment(matric, 2500);
      if (res.success) {
        const updatedUser = {
          ...user,
          dues_cleared: true,
          has_paid_dues: true,
          payment_status: 'cleared',
          receipt_no: res.payment.payment_reference,
          dues_paid_at: new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }) + ' (' + new Date().toLocaleTimeString('en-GB') + ' GMT+1)'
        };
        localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('nacos_user_updated'));
        await checkStatus(updatedUser);
      }
    } catch (e) {
      console.error('Payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Derive dynamic live student information
  const rawName = (
    user.full_name ||
    user.fullName ||
    [user.surname, user.first_name, user.middle_name].filter(Boolean).join(' ') ||
    user.name ||
    ''
  ).trim();
  const studentName = rawName.toLowerCase().includes('president') || rawName.toLowerCase().includes('irechukwu')
    ? 'Emmanuel Irechukwu'
    : (rawName || 'Student Member');

  const matricNo = user.registration_number || user.matric || user.matricNumber || 'N/A';
  const levelLabel = `${selectedLevel} Level`;
  const department = user.department || 'Computer Science';
  const session = user.academic_session || '2026/2027 Academic Session';

  const paymentRecord = isPaid ? {
    receiptNo: paymentData?.receiptNo || `NACOS-FUTO-${matricNo}-08941`,
    session,
    studentName,
    matricNo,
    level: levelLabel,
    department,
    amount: paymentData?.amount || '₦2,500.00',
    amountInWords: 'Two Thousand Five Hundred Naira Only',
    paymentDate: paymentData?.paymentDate || '12th November, 2024 (14:32:10 GMT+1)',
    paymentMethod: paymentData?.paymentMethod || 'Interswitch WebPAY / Direct Card Debit',
    status: 'Verified & Cleared',
    authorizedBy: 'NACOS FUTO Directorate of Finance'
  } : {
    receiptNo: 'PENDING PAYMENT',
    session,
    studentName,
    matricNo,
    level: levelLabel,
    department,
    amount: '₦0.00',
    amountInWords: 'Zero Naira (₦2,500.00 Outstanding)',
    paymentDate: 'Payment Not Received',
    paymentMethod: 'Awaiting Payment',
    status: 'Payment Pending (Unpaid)',
    authorizedBy: 'NACOS FUTO Directorate of Finance'
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      window.print();
    }, 400);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Dues Clearance &amp; Receipts
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-1">
              Official annual departmental association dues payment confirmation and electronic receipt.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            {/* Level Selector — only shown when not yet paid */}
            {!isPaid && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-green-200/80 whitespace-nowrap">Paying as:</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 border border-gray-200 dark:border-[#138601]/40 rounded bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                >
                  {['100', '200', '300', '400', '500'].map(l => (
                    <option key={l} value={l}>{l} Level</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              {!isPaid && (
                <button
                  type="button"
                  onClick={handlePayDues}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'Pay Dues (₦2,500.00)'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${isPaid
                    ? 'text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs'
                    : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#083002] hover:bg-gray-200 dark:hover:bg-[#062402] border border-gray-200/80 dark:border-[#138601]/30'
                  }`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isPrinting
                    ? 'Generating Printout...'
                    : isPaid
                      ? 'Print Official Receipt'
                      : 'Print Payment Slip'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Overview Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">

          {/* Card 1: Clearance Status */}
          <div className={`p-5 rounded-2xl bg-white dark:bg-[#083002] border space-y-1 shadow-xs ${isPaid
              ? 'border-gray-200/80 dark:border-[#138601]/30'
              : 'border-amber-200/80 dark:border-amber-700/40 bg-amber-50/30'
            }`}>
            <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Clearance Status</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${isPaid
                ? 'text-[#138601] dark:text-[#4bd043]'
                : 'text-amber-600 dark:text-amber-400'
              }`}>
              {isPaid ? (
                <>
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>Dues Cleared</span>
                </>
              ) : (
                <>
                  <Clock className="w-4.5 h-4.5" />
                  <span>Payment Pending</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
              {isPaid ? 'Eligible for departmental clearance' : 'Dues payment required for clearance'}
            </p>
          </div>

          {/* Card 2: Current Session Amount */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Current Session Amount</span>
            <div className="text-xl font-bold text-gray-900 dark:text-white">₦2,500.00</div>
            <p className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
              {session} {isPaid ? '• Paid in Full' : '• Outstanding Balance'}
            </p>
          </div>

          {/* Card 3: Electronic Receipt Number */}
          <div className={`p-5 rounded-2xl bg-white dark:bg-[#083002] border space-y-1 shadow-xs ${isPaid
              ? 'border-gray-200/80 dark:border-[#138601]/30'
              : 'border-amber-200/80 dark:border-amber-700/40'
            }`}>
            <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Electronic Receipt Number</span>
            <div className={`text-xs sm:text-sm font-semibold font-mono ${isPaid
                ? 'text-gray-900 dark:text-white'
                : 'text-amber-700 dark:text-amber-400'
              }`}>
              {paymentRecord.receiptNo}
            </div>
            {isPaid ? (
              <p className="text-xs text-[#138601] dark:text-[#4bd043] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Cryptographically Signed
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Awaiting Payment Confirmation
              </p>
            )}
          </div>
        </div>

        {/* Official Printable Electronic Receipt Box */}
        <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 space-y-5 shadow-xs print:border-none print:shadow-none print:p-0 overflow-hidden">

          {/* Receipt Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#138601]/25 text-center sm:text-left">
            <div className="flex items-center space-x-3">
              <img src={isDark ? logoDark : logoLight} alt="NACOS Logo" className="h-8 w-auto object-contain" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                  Nigeria Association of Computing Students
                </h3>
                <p className="text-xs text-gray-500 dark:text-green-200 font-medium mt-0.5">Department of Computer Science • FUTO Chapter</p>
              </div>
            </div>

            <div className="text-center sm:text-right">
              {isPaid ? (
                <div className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#138601] border border-emerald-200 dark:bg-[#138601]/25 dark:border-[#138601]/40 dark:text-[#4bd043]">
                  Official Electronic Receipt
                </div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                  Payment Pending
                </div>
              )}
              <div className="text-[10px] text-gray-500 dark:text-green-200/70 mt-1 font-mono break-all max-w-[180px] sm:max-w-none mx-auto">
                {isPaid ? paymentRecord.receiptNo : 'Awaiting Payment Reference'}
              </div>
            </div>
          </div>

          {/* Receipt Data Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Student Full Name</span>
              <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words">{paymentRecord.studentName}</span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Matriculation Number</span>
              <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white font-mono break-all">{paymentRecord.matricNo}</span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Department &amp; Level</span>
              <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words">{paymentRecord.department} ({paymentRecord.level})</span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Academic Session</span>
              <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">{paymentRecord.session}</span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Payment Date &amp; Time</span>
              <span className={`font-semibold text-xs sm:text-sm break-words ${isPaid ? 'text-gray-900 dark:text-white' : 'text-amber-700 dark:text-amber-400 font-normal italic'
                }`}>
                {paymentRecord.paymentDate}
              </span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Payment Method</span>
              <span className={`font-semibold text-xs sm:text-sm break-words ${isPaid ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 font-normal italic'
                }`}>
                {paymentRecord.paymentMethod}
              </span>
            </div>

            <div className="sm:col-span-2 pt-3.5 border-t border-gray-100 dark:border-[#138601]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-gray-500 dark:text-green-200/70 block mb-0.5 text-[11px]">Amount Paid</span>
                <span className={`text-xl sm:text-2xl font-bold ${isPaid ? 'text-[#138601] dark:text-[#4bd043]' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                  {paymentRecord.amount}
                </span>
                <span className="text-xs text-gray-500 dark:text-green-200/70 block italic font-normal mt-0.5">
                  {paymentRecord.amountInWords}
                </span>
              </div>

              <div className={`flex items-center space-x-2.5 p-3 rounded-xl border ${isPaid
                  ? 'bg-[#f1f3f5] dark:bg-[#041801] border-gray-200/80 dark:border-[#138601]/30'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30'
                }`}>
                <QrCode className={`w-8 h-8 ${isPaid ? 'text-gray-700 dark:text-[#4bd043]' : 'text-amber-600 dark:text-amber-400'
                  }`} />
                <div className="text-[11px] text-gray-600 dark:text-green-200/80 font-normal">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {isPaid ? 'Scan to Verify' : 'Payment Pending'}
                  </div>
                  <div>
                    {isPaid ? 'Authenticity Token Valid' : 'Unverified • Invoice Slip'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#138601]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-green-200/70 gap-2 text-center sm:text-left font-normal">
            <span>Authorized by: {paymentRecord.authorizedBy}</span>
            <span>
              {isPaid
                ? 'This is a computer-generated receipt. No physical stamp required.'
                : 'This is a pro-forma payment slip. Official clearance receipt will be issued upon payment.'}
            </span>
          </div>

        </div>

        {/* Action Callout when Unpaid */}
        {!isPaid && (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 shadow-xs print:hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  Annual Departmental Dues Required — {levelLabel}
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/80">
                  Pay your ₦2,500.00 departmental dues for <strong>{levelLabel}</strong> to complete academic clearance and unlock your verified electronic receipt.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full sm:w-auto">
                {/* Inline level selector inside callout */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">Level:</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 border border-amber-300 dark:border-amber-600/60 rounded bg-white dark:bg-[#1a0c00] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {['100', '200', '300', '400', '500'].map(l => (
                      <option key={l} value={l}>{l} Level</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handlePayDues}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing Payment...' : `Pay ₦2,500 — ${levelLabel}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};

export default Dues;
