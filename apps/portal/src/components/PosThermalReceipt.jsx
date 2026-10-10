import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import logoLight from '../assets/full-logo-light.png';
import { printReceiptSlip } from '../utils/printReceipt';
import { getActiveAcademicSession } from '@nacos/config/academic';

/**
 * Authentic A4/A5 Sized POS Style Receipt
 * - Top: Official NACOS FUTO brand logo centered at the top (no text at the top)
 * - Body: Monospace POS styling with dashed borders, receipt info, student particulars, itemized breakdown & total
 * - Clean: QR code & barcode sections completely removed as requested
 * - Print: Formatted for standard A4 portrait dimensions using isolated iframe printer
 */
const PosThermalReceipt = ({
  isOpen,
  onClose,
  data,
  isInvoice = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const activeSessionFallback = getActiveAcademicSession();

  const receiptNo = data.receiptNo || (data.reference || data.id ? `REC-${String(data.reference || data.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : 'NACOS-FUTO-REC');
  const transactionId = data.transactionId || data.reference || data.transaction_reference || data.id || 'TX-CONFIRMED';
  const date = data.date || (data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const time = data.time || (data.created_at ? new Date(data.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const studentName = data.studentName || data.student_name || data.fullName || 'Student Member';
  const matricNo = data.matricNo || data.reg_no || data.student_reg_no || data.matric_no || '';
  const department = data.department || 'Computer Science';
  const level = data.level || data.metadata?.level || '';
  const session = data.session || data.academic_session || data.metadata?.session || activeSessionFallback;
  const rawAmount = data.rawAmount !== undefined ? data.rawAmount : (data.amount !== undefined ? data.amount : 0);
  const paymentType = data.paymentType || data.payment_type_label || (data.payment_type ? String(data.payment_type).replace(/_/g, ' ') : 'Departmental Dues');
  const rawMethod = data.paymentMethod || data.payment_method || 'Online Gateway (Confirmed)';
  const paymentMethod = String(rawMethod).replace(/bachs/gi, 'Online Gateway');
  const status = isInvoice ? 'PENDING' : (data.status || 'APPROVED');

  const isPaid = !isInvoice && (status === 'APPROVED' || String(status).toLowerCase().includes('paid') || String(status).toLowerCase().includes('cleared'));
  const numAmount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(String(amount || 0).replace(/[^0-9.]/g, '')) || 0);
  const formattedAmount = numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    printReceiptSlip('official-pos-receipt-slip');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center items-start pt-4 sm:pt-8 pb-10 px-3 sm:px-4 print:p-0 print:bg-white print:static print:inset-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Official Payment Receipt"
    >
      {/* Wrapper containing the A4 proportioned POS Receipt slip and action controls */}
      <div className="relative w-full max-w-[400px] sm:max-w-[440px] flex flex-col items-center gap-2.5 print:max-w-none print:w-full">
        
        {/* Top Floating Control Bar (Always visible at top of viewport) */}
        <div className="w-full flex items-center justify-between px-1 mb-1 print:hidden shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0e8040] hover:bg-[#0b6a34] shadow-md transition-all cursor-pointer active:scale-95"
            title="Print Receipt to Printer"
            id="receipt-print-btn"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors cursor-pointer"
            title="Close Receipt (Esc)"
            id="receipt-close-btn"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* AUTHENTIC A4/A5 PROPORTION POS RECEIPT SLIP               */}
        {/* ========================================================= */}
        <div
          id="official-pos-receipt-slip"
          className="w-full bg-white text-gray-950 font-mono text-[11px] sm:text-xs rounded-xl shadow-2xl p-5 sm:p-7 border border-gray-300 print:border-none print:shadow-none print:p-0 print:rounded-none"
          style={{
            fontFamily: "'Courier New', Courier, monospace, 'SFMono-Regular', Consolas"
          }}
        >
          {/* Print Style Injections for A4 Portrait */}
          <style>{`
            @page {
              size: A4 portrait;
              margin: 15mm 20mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              #official-pos-receipt-slip, #official-pos-receipt-slip * {
                visibility: visible !important;
              }
              #official-pos-receipt-slip {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10mm 15mm !important;
                margin: 0 !important;
              }
              button, .print\\:hidden {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}</style>

          {/* Top Logo Centered (NO text at top as requested) */}
          <div className="flex justify-center items-center py-2 mb-3">
            <img
              src={logoLight}
              alt="NACOS FUTO"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>

          {/* Slip Type Badge */}
          <div className="my-2 py-1.5 border-y border-dashed border-gray-400 text-center font-bold uppercase tracking-wider text-xs">
            {isInvoice ? '*** PROFORMA INVOICE SLIP ***' : '*** OFFICIAL PAYMENT RECEIPT ***'}
          </div>

          {/* Receipt & Transaction Particulars */}
          <div className="space-y-1 py-1.5 text-[11px] sm:text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">RECEIPT NO:</span>
              <span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TRANS REF:</span>
              <span className="font-bold truncate max-w-[220px]">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DATE:</span>
              <span>{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TIME:</span>
              <span>{time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">STATUS:</span>
              <span className={`font-black ${isPaid ? 'text-black' : 'text-gray-700'}`}>
                {isPaid ? 'APPROVED / CLEARED' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Dashed Divider */}
          <div className="my-2 border-t border-dashed border-gray-400"></div>

          {/* Student Particulars */}
          <div className="space-y-1 py-1.5 text-[11px] sm:text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">NAME:</span>
              <span className="font-bold uppercase text-right truncate max-w-[240px]">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">REG / MATRIC:</span>
              <span className="font-bold">{matricNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DEPARTMENT:</span>
              <span>{department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">LEVEL:</span>
              <span className="font-bold">{level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SESSION:</span>
              <span>{session}</span>
            </div>
          </div>

          {/* Double Dashed Divider */}
          <div className="my-2 border-t-2 border-dashed border-gray-400"></div>

          {/* Itemized Breakdown Table */}
          <div className="space-y-1.5 py-1.5 text-[11px] sm:text-xs">
            <div className="flex justify-between font-bold border-b border-dashed border-gray-300 pb-1">
              <span>DESCRIPTION</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold truncate max-w-[220px]">
                {paymentType || `Departmental Dues (${level})`}
              </span>
              <span>1</span>
              <span className="font-bold">₦{formattedAmount}</span>
            </div>

            <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-600">
              <span>E-Portal Clearance Levy</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-600">
              <span>Secretariat Tech Levy</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
          </div>

          {/* Total Box */}
          <div className="my-2.5 border-y-2 border-black py-2">
            <div className="flex justify-between text-sm sm:text-base font-black">
              <span>TOTAL PAID:</span>
              <span>₦{formattedAmount}</span>
            </div>
          </div>

          {/* Payment Method & Issuer */}
          <div className="space-y-1 text-[10px] sm:text-[11px] text-gray-700 py-1">
            <div className="flex justify-between">
              <span>PAYMENT METHOD:</span>
              <span className="font-bold uppercase">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>ISSUED BY:</span>
              <span>DIRECTOR OF FINANCE</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-3 pt-2.5 border-t border-dashed border-gray-400 text-center text-[10px] sm:text-[11px] text-gray-600 leading-tight">
            *** OFFICIAL NACOS RECEIPT &bull; RETAIN FOR CLEARANCE ***
            <br />
            THANK YOU FOR SUPPORTING YOUR DEPARTMENT
          </div>
        </div>

      </div>

    </div>
  );
};

export default PosThermalReceipt;
