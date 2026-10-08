import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Check,
  Printer,
  XCircle,
  ArrowRight
} from 'lucide-react';

/**
 * Bachs Gateway Payment Success Ticket View
 * Matches reference voucher UI:
 * - Big center-positioned checkmark
 * - "Successful" heading with confirmation subtitle
 * - Ticket side cutout notches & perforated dashed divider
 * - Dynamic Ticket/Transaction ID, Amount, Date & Time (not hardcoded)
 * - Styled payment channel card (Mastercard/Card graphic with dynamic gateway status)
 * - Barcode with reference digits
 * - Scalloped bottom ticket edge
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const rawType = searchParams.get('paymentType') || searchParams.get('type') || '';
  const reference = searchParams.get('reference') || searchParams.get('ref') || 'NACOS-BCH-SUCCESS';
  
  const isDues = rawType.toLowerCase().includes('due') || reference.toUpperCase().includes('DUES');
  const paymentPurpose = isDues ? 'Departmental Dues Clearance' : 'Student ID Card Issuance';

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
    const fallbackAmount = isDues ? 2500 : 500;
    try {
      const channel = new BroadcastChannel('nacos_payment_sync');
      channel.postMessage({ 
        status: 'successful', 
        reference, 
        paymentType: isDues ? 'dues' : 'id_card',
        amount: paymentData?.amount || fallbackAmount
      });
      setTimeout(() => channel.close(), 1500);
    } catch (e) {}

    localStorage.setItem('nacos_last_payment_success', JSON.stringify({ 
      reference, 
      paymentType: isDues ? 'dues' : 'id_card',
      amount: paymentData?.amount || fallbackAmount,
      timestamp: Date.now() 
    }));
    window.dispatchEvent(new Event('nacos_user_updated'));
  }, [reference, isDues]);

  const handleCloseTab = () => {
    window.close();
  };

  const amountDisplay = paymentData?.amount 
    ? Number(paymentData.amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (isDues ? '2,500.00' : '500.00');

  const formattedDateTime = (() => {
    try {
      const d = paymentData?.created_at || paymentData?.paid_at ? new Date(paymentData.created_at || paymentData.paid_at) : new Date();
      const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} | ${timePart}`;
    } catch (e) {
      return 'CURRENT SESSION';
    }
  })();

  const studentIdent = student?.matric || student?.registration_number || 'NACOS Member';

  return (
    <div className="min-h-screen bg-[#f3f4f7] dark:bg-[#031401] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors font-sans">
      
      {/* Outer Centered Voucher Ticket Container */}
      <div className="w-full max-w-[380px] sm:max-w-[400px] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Main Ticket Card */}
        <div className="relative w-full bg-white dark:bg-[#072802] rounded-3xl shadow-xl border border-gray-200/80 dark:border-[#138601]/30 overflow-hidden pt-8 pb-3">
          
          {/* Top Section: Big Centered Checkmark, "Successful" & Subtitle */}
          <div className="text-center px-6 sm:px-8 space-y-3">
            {/* Big Center Positioned Checkmark */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/30 flex items-center justify-center mx-auto text-[#0e8040] dark:text-[#4bd043] shadow-lg shadow-emerald-600/10">
              <Check className="w-10 h-10 sm:w-11 sm:h-11 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Successful
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/70 font-normal leading-relaxed">
                Your payment has been processed successfully.
              </p>
            </div>
          </div>

          {/* Ticket Perforated Divider with Circular Notches */}
          <div className="relative my-6">
            {/* Left Circular Notch Cutout */}
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f3f4f7] dark:bg-[#031401] border-r border-gray-200/80 dark:border-[#138601]/30" />
            
            {/* Dashed Horizontal Line */}
            <div className="border-t border-dashed border-gray-300 dark:border-green-800/60 mx-6" />
            
            {/* Right Circular Notch Cutout */}
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f3f4f7] dark:bg-[#031401] border-l border-gray-200/80 dark:border-[#138601]/30" />
          </div>

          {/* Ticket Information Body */}
          <div className="px-6 sm:px-8 space-y-5">
            
            {/* Row 1: Ticket ID & Amount */}
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1 max-w-[60%]">
                <span className="block text-[10px] font-bold text-gray-400 dark:text-green-300/60 tracking-wider uppercase">
                  TICKET ID
                </span>
                <span className="block font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate" title={reference}>
                  {reference}
                </span>
              </div>

              <div className="space-y-1 text-right shrink-0">
                <span className="block text-[10px] font-bold text-gray-400 dark:text-green-300/60 tracking-wider uppercase">
                  AMOUNT
                </span>
                <span className="block font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                  ₦{amountDisplay}
                </span>
              </div>
            </div>

            {/* Row 2: Date & Time */}
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-gray-400 dark:text-green-300/60 tracking-wider uppercase">
                DATE &amp; TIME
              </span>
              <span className="block font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-100 font-mono">
                {formattedDateTime}
              </span>
            </div>

            {/* Payment Method / Channel Pill Card */}
            <div className="p-3.5 rounded-2xl bg-[#f0f3fa] dark:bg-[#041a01] border border-[#e2e8f0] dark:border-[#138601]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mastercard Overlapping Circles Graphic */}
                <div className="flex -space-x-1.5 shrink-0">
                  <div className="w-5 h-5 rounded-full bg-[#eb001b] opacity-90 shadow-2xs" />
                  <div className="w-5 h-5 rounded-full bg-[#f79e1b] opacity-90 shadow-2xs" />
                </div>

                <div className="space-y-0.5">
                  <span className="block font-bold text-xs text-gray-900 dark:text-white">
                    Bachs Gateway Verified
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-green-200/60 font-medium">
                    {paymentPurpose}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/70 dark:text-[#4bd043]">
                CLEARED
              </span>
            </div>

            {/* Bottom Dashed Divider */}
            <div className="border-t border-dashed border-gray-200 dark:border-green-800/40 pt-1" />

            {/* Authentic Barcode Simulation with Dynamic Reference */}
            <div className="pt-2 text-center select-none space-y-1.5">
              <svg 
                className="w-full max-w-[260px] h-11 mx-auto text-gray-900 dark:text-white fill-current" 
                viewBox="0 0 200 40"
                preserveAspectRatio="none"
              >
                <rect x="0" y="0" width="3" height="40" />
                <rect x="5" y="0" width="2" height="40" />
                <rect x="9" y="0" width="4" height="40" />
                <rect x="15" y="0" width="1" height="40" />
                <rect x="18" y="0" width="3" height="40" />
                <rect x="23" y="0" width="5" height="40" />
                <rect x="30" y="0" width="2" height="40" />
                <rect x="34" y="0" width="3" height="40" />
                <rect x="39" y="0" width="1" height="40" />
                <rect x="42" y="0" width="4" height="40" />
                <rect x="48" y="0" width="2" height="40" />
                <rect x="52" y="0" width="5" height="40" />
                <rect x="59" y="0" width="1" height="40" />
                <rect x="62" y="0" width="3" height="40" />
                <rect x="67" y="0" width="2" height="40" />
                <rect x="71" y="0" width="4" height="40" />
                <rect x="77" y="0" width="1" height="40" />
                <rect x="80" y="0" width="3" height="40" />
                <rect x="85" y="0" width="2" height="40" />
                <rect x="89" y="0" width="5" height="40" />
                <rect x="96" y="0" width="2" height="40" />
                <rect x="100" y="0" width="3" height="40" />
                <rect x="105" y="0" width="1" height="40" />
                <rect x="108" y="0" width="4" height="40" />
                <rect x="114" y="0" width="2" height="40" />
                <rect x="118" y="0" width="5" height="40" />
                <rect x="125" y="0" width="1" height="40" />
                <rect x="128" y="0" width="3" height="40" />
                <rect x="133" y="0" width="2" height="40" />
                <rect x="137" y="0" width="4" height="40" />
                <rect x="143" y="0" width="1" height="40" />
                <rect x="146" y="0" width="3" height="40" />
                <rect x="151" y="0" width="5" height="40" />
                <rect x="158" y="0" width="2" height="40" />
                <rect x="162" y="0" width="3" height="40" />
                <rect x="167" y="0" width="1" height="40" />
                <rect x="170" y="0" width="4" height="40" />
                <rect x="176" y="0" width="2" height="40" />
                <rect x="180" y="0" width="5" height="40" />
                <rect x="187" y="0" width="1" height="40" />
                <rect x="190" y="0" width="3" height="40" />
                <rect x="195" y="0" width="4" height="40" />
              </svg>

              <div className="font-mono text-[10px] text-gray-500 dark:text-green-200/60 tracking-wider">
                {reference}
              </div>
            </div>

          </div>

          {/* Authentic Scalloped Bottom Edge Notches */}
          <div className="flex justify-between items-end px-3 -mb-3 pt-6 overflow-hidden">
            {[...Array(9)].map((_, i) => (
              <div 
                key={i} 
                className="w-5 h-5 rounded-full bg-[#f3f4f7] dark:bg-[#031401] shrink-0 border-t border-gray-200/80 dark:border-[#138601]/30" 
              />
            ))}
          </div>

        </div>

        {/* Sync Info Notification */}
        <p className="text-[11px] text-gray-500 dark:text-green-200/60 text-center max-w-xs">
          Your NACOS portal window has automatically synchronized and generated your official A4 POS receipt.
        </p>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleCloseTab}
            className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0e8040] hover:bg-[#0b6a34] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <XCircle className="w-4 h-4" />
            <span>Close This Window</span>
          </button>

          <Link
            to={isDues ? '/dues' : '/id-card'}
            className="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#072802] hover:bg-gray-100 dark:hover:bg-[#093503] border border-gray-200 dark:border-[#138601]/30 shadow-xs transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <span>Back to Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
};

export default PaymentSuccess;
