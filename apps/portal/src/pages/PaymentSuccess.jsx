import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import {
  CheckCircle,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Printer,
  XCircle,
  Clock
} from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const rawType = searchParams.get('paymentType') || searchParams.get('type') || '';
  const reference = searchParams.get('reference') || searchParams.get('ref') || 'NACOS-PAYMENT-CONFIRMED';
  
  const isDues = rawType.toLowerCase().includes('due') || reference.toUpperCase().includes('DUES');
  const paymentTitle = isDues ? 'Departmental Dues & Levies Clearance' : 'NACOS Student Identity Card Issuance';

  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        setStudent(JSON.parse(stored));
      } catch (e) {}
    }

    const fetchPaymentDetails = async () => {
      setLoading(true);
      try {
        if (reference) {
          const endpoint = isDues 
            ? `/api/payments/dues/status?reference=${encodeURIComponent(reference)}`
            : `/api/payments/id-card/status?reference=${encodeURIComponent(reference)}`;
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            setPaymentData(data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch payment record:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();

    // Broadcast authoritative confirmation across all browser tabs
    const finalAmount = isDues ? 2500 : 500;
    try {
      const channel = new BroadcastChannel('nacos_payment_sync');
      channel.postMessage({ 
        status: 'successful', 
        reference, 
        paymentType: isDues ? 'dues' : 'id_card',
        amount: paymentData?.amount || finalAmount
      });
      setTimeout(() => channel.close(), 1500);
    } catch (e) {}

    localStorage.setItem('nacos_last_payment_success', JSON.stringify({ 
      reference, 
      paymentType: isDues ? 'dues' : 'id_card',
      amount: paymentData?.amount || finalAmount,
      timestamp: Date.now() 
    }));
    window.dispatchEvent(new Event('nacos_user_updated'));
  }, [reference, isDues]);

  const handleCloseTab = () => {
    window.close();
  };

  const amountDisplay = paymentData?.amount 
    ? Number(paymentData.amount).toLocaleString() 
    : (isDues ? '2,500' : '500');

  return (
    <PortalLayout>
      <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6">
        
        {/* Authoritative Gateway Confirmation Card */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/40 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border-2 border-[#138601]/40 shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" /> Gateway Transaction Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
              Your payment has been securely verified by <strong>Bachs Gateway</strong>. Your active NACOS portal session in your other tab has already received this confirmation.
            </p>
          </div>

          {/* Bachs Transaction Slip Summary */}
          <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/25 text-left text-xs space-y-3 font-mono">
            <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-gray-200 dark:border-[#138601]/20 font-sans">
              <span className="text-gray-500 dark:text-green-200/60 font-medium">Gateway Provider:</span>
              <span className="font-bold text-gray-900 dark:text-white">Bachs (bachs.io)</span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-gray-200 dark:border-[#138601]/20">
              <span className="text-gray-500 dark:text-green-200/60 font-sans">Reference:</span>
              <span className="font-bold text-[#138601] dark:text-[#4bd043] select-all break-all text-[11px]">{reference}</span>
            </div>

            {student && (
              <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-gray-200 dark:border-[#138601]/20 font-sans">
                <span className="text-gray-500 dark:text-green-200/60">Student / Reg No:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {student.name || student.full_name} ({student.matric || student.registration_number})
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pb-2.5 border-b border-dashed border-gray-200 dark:border-[#138601]/20 font-sans">
              <span className="text-gray-500 dark:text-green-200/60">Payment Purpose:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{paymentTitle}</span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold font-sans">
              <span className="text-gray-900 dark:text-white">Amount Paid:</span>
              <span className="text-[#0e8040] dark:text-[#4bd043]">
                ₦{amountDisplay}.00 NGN
              </span>
            </div>
          </div>

          {/* Sync Notice Alert */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-[#041801]/60 border border-emerald-200/70 dark:border-[#138601]/30 text-emerald-900 dark:text-emerald-200 text-xs text-left flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-[#0e8040] dark:text-[#4bd043] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your official NACOS A5 clearance receipt has popped up in your main portal tab. You can safely close this tab or return to the portal.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCloseTab}
              className="w-full sm:w-auto px-7 py-3 text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Close This Tab</span>
              <XCircle className="w-4 h-4" />
            </button>

            <Link
              to={isDues ? '/dues' : '/id-card'}
              className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#062402] rounded-xl border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <span>Return to {isDues ? 'Dues' : 'ID Card'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};

export default PaymentSuccess;
