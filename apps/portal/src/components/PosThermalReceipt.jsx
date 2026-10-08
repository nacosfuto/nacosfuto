import React, { useEffect } from 'react';
import { Printer, X, QrCode } from 'lucide-react';

/**
 * Authentic Responsive POS Thermal Receipt (A5 Proportion)
 * Handheld POS docket proportions (max-w-[350px]) that scale responsively on all screens.
 * Features a sticky action bar with Print and Close (X) buttons, Escape key listener, and backdrop click to close.
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

  const {
    receiptNo = 'NACOS-FUTO-001',
    transactionId = 'BCH-TX-89214710',
    date = new Date().toLocaleDateString('en-GB'),
    time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    studentName = 'Student Member',
    matricNo = '20241450682',
    department = 'Computer Science',
    level = '300 Level',
    session = '2026/2027',
    amount = '2,500.00',
    rawAmount = 2500,
    paymentType = 'Departmental Dues',
    paymentMethod = 'Bachs Online Gateway',
    status = isInvoice ? 'PENDING' : 'APPROVED'
  } = data;

  const isPaid = !isInvoice && (status === 'APPROVED' || String(status).toLowerCase().includes('paid') || String(status).toLowerCase().includes('cleared'));
  const numAmount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 2500);
  const formattedAmount = numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center items-start pt-4 sm:pt-8 pb-10 px-3 sm:px-4 print:p-0 print:bg-white print:static print:inset-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Electronic Payment Receipt"
    >
      {/* Wrapper containing the responsive A5 POS Receipt slip and action controls */}
      <div className="relative w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center gap-2 print:max-w-none print:w-full">
        
        {/* Top Action Bar (Always visible at top of viewport) */}
        <div className="w-full flex items-center justify-between px-1 mb-1 print:hidden shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0e8040] hover:bg-[#0b6a34] shadow-md transition-all cursor-pointer active:scale-95"
            title="Print to printer"
            id="pos-thermal-print-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors cursor-pointer"
            title="Close Receipt (Esc)"
            id="pos-thermal-close-btn"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* AUTHENTIC RESPONSIVE POS THERMAL DOCKET SLIP              */}
        {/* ========================================================= */}
        <div
          id="official-pos-receipt-slip"
          className="w-full bg-white text-gray-950 font-mono text-[10.5px] rounded-lg shadow-2xl p-4 sm:p-5 border border-gray-300 print:border-none print:shadow-none print:p-0 print:rounded-none"
          style={{
            fontFamily: "'Courier New', Courier, monospace, 'SFMono-Regular', Consolas"
          }}
        >
          {/* Print Style Injections */}
          <style>{`
            @page {
              size: A5 portrait;
              margin: 8mm 10mm;
            }
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              #official-pos-receipt-slip {
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
            }
          `}</style>

          {/* POS Header */}
          <div className="text-center space-y-0.5">
            <div className="text-[10px] font-bold tracking-widest uppercase">
              ================================
            </div>
            <div className="text-xs sm:text-sm font-black tracking-tight uppercase">
              NACOS FUTO
            </div>
            <div className="text-[10px] font-bold tracking-tight uppercase">
              NIGERIA ASSOC. OF COMPUTING STUDENTS
            </div>
            <div className="text-[9px] uppercase">
              FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI
            </div>
            <div className="text-[9px] text-gray-700 uppercase">
              DEPT OF COMPUTER SCIENCE &bull; SICT
            </div>
            <div className="text-[10px] font-bold tracking-widest uppercase pt-0.5">
              ================================
            </div>
          </div>

          {/* Slip Type Badge */}
          <div className="my-1.5 py-1 border-y border-dashed border-gray-400 text-center font-bold uppercase tracking-wider text-[10px]">
            {isInvoice ? '*** PROFORMA INVOICE SLIP ***' : '*** OFFICIAL PAYMENT RECEIPT ***'}
          </div>

          {/* Receipt & Transaction Info */}
          <div className="space-y-0.5 py-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-600">RECEIPT NO:</span>
              <span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TRANS REF:</span>
              <span className="font-bold truncate max-w-[180px]">{transactionId}</span>
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

          {/* Divider */}
          <div className="my-1 border-t border-dashed border-gray-400"></div>

          {/* Student Particulars */}
          <div className="space-y-0.5 py-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-600">NAME:</span>
              <span className="font-bold uppercase text-right truncate max-w-[190px]">{studentName}</span>
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

          {/* Divider */}
          <div className="my-1 border-t-2 border-dashed border-gray-400"></div>

          {/* Itemized Table */}
          <div className="space-y-1 py-1 text-[10px]">
            <div className="flex justify-between font-bold border-b border-dashed border-gray-300 pb-0.5">
              <span>DESCRIPTION</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>

            <div className="flex justify-between pt-0.5">
              <span className="font-bold truncate max-w-[170px]">
                {paymentType || `Departmental Dues (${level})`}
              </span>
              <span>1</span>
              <span className="font-bold">₦{formattedAmount}</span>
            </div>

            <div className="flex justify-between text-[9px] text-gray-600">
              <span>E-Portal Clearance Levy</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>Secretariat Tech Levy</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
          </div>

          {/* Total Box */}
          <div className="my-1.5 border-y-2 border-black py-1.5">
            <div className="flex justify-between text-xs sm:text-sm font-black">
              <span>TOTAL PAID:</span>
              <span>₦{formattedAmount}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-0.5 text-[9px] text-gray-700 py-0.5">
            <div className="flex justify-between">
              <span>PAYMENT METHOD:</span>
              <span className="font-bold uppercase">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>ISSUED BY:</span>
              <span>DIRECTOR OF FINANCE</span>
            </div>
          </div>

          {/* QR Code & Verification */}
          <div className="my-2 pt-1.5 border-t border-dashed border-gray-400 flex flex-col items-center text-center space-y-0.5">
            <QrCode className="w-12 h-12 text-black" />
            <div className="text-[9px] font-bold tracking-wider uppercase">
              SCAN TO VERIFY ELECTRONIC RECORD
            </div>
            <div className="text-[8.5px] text-gray-500 font-mono">
              portal.nacosfuto.com.ng/verify/{receiptNo}
            </div>
          </div>

          {/* POS Barcode Simulation */}
          <div className="pt-0.5 text-center font-mono tracking-widest text-[10px] select-none text-gray-800">
            ||| | ||||| || |||| ||||| ||| ||||| ||
            <div className="text-[8.5px] tracking-normal text-gray-500 mt-0.5">
              *{receiptNo}*
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-2 pt-1.5 border-t border-dashed border-gray-400 text-center text-[8.5px] text-gray-600 leading-tight">
            *** OFFICIAL NACOS RECEIPT &bull; RETAIN FOR CLEARANCE ***
            <br />
            THANK YOU FOR SUPPORTING YOUR DEPARTMENT
          </div>

          {/* Secondary In-Receipt Print Button (Hidden on Print) */}
          <div className="mt-3 pt-2 border-t border-dashed border-gray-300 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print to Printer</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default PosThermalReceipt;
