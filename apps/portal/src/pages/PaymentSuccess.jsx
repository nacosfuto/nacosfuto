import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import {
  CheckCircle,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Download,
  Printer,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('ref') || 'NACOS-IDCARD-CONFIRMED';
  
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
          const res = await fetch(`/api/payments/id-card/status?reference=${encodeURIComponent(reference)}`);
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
  }, [reference]);

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6">
        
        {/* Main Success Card */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/40 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border-2 border-[#138601]/40 shadow-lg shadow-green-600/10">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
              <ShieldCheck className="w-3.5 h-3.5" /> Authoritative Gateway Confirmation
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
              Your payment for the official <strong>NACOS Student ID Card</strong> has been verified by the Bachs payment gateway. Your application is now unlocked.
            </p>
          </div>

          {/* Payment Receipt Summary */}
          <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/25 text-left text-xs space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-gray-200/60 dark:border-[#138601]/20">
              <span className="text-gray-500 dark:text-green-200/60">Payment Gateway:</span>
              <span className="font-semibold text-gray-900 dark:text-white">Bachs (bachs.io)</span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-gray-200/60 dark:border-[#138601]/20">
              <span className="text-gray-500 dark:text-green-200/60">Transaction Reference:</span>
              <span className="font-mono font-bold text-[#138601] dark:text-[#4bd043] select-all">{reference}</span>
            </div>

            {student && (
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-200/60 dark:border-[#138601]/20">
                <span className="text-gray-500 dark:text-green-200/60">Student / Reg No:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {student.name || student.full_name} ({student.matric || student.registration_number})
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pb-2.5 border-b border-gray-200/60 dark:border-[#138601]/20">
              <span className="text-gray-500 dark:text-green-200/60">Purpose:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">NACOS Student ID Card Issuance</span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-gray-900 dark:text-white">Amount Paid:</span>
              <span className="text-[#138601] dark:text-[#4bd043]">
                ₦{(paymentData?.amount || 5000).toLocaleString()}.00 NGN
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/id-card"
              className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Continue to Passport Upload</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 rounded-xl border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};

export default PaymentSuccess;
