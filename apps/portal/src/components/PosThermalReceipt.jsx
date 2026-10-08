import React from 'react';
import { Printer, X, QrCode } from 'lucide-react';

/**
 * Authentic POS Thermal Receipt (A5 Proportion)
 * Pure, authentic POS receipt design without bloated surrounding frames.
 * Single simple "Print" button that triggers native printer dialog (window.print()).
 */
const PosThermalReceipt = ({
  isOpen,
  onClose,
  data,
  isInvoice = false
}) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Wrapper containing solely the A5 POS Receipt and simple action controls */}
      <div className="relative w-full max-w-[440px] flex flex-col items-center gap-3 print:max-w-none print:w-full">
        
        {/* Simple Controls Bar (Print + Close) */}
        <div className="w-full flex items-center justify-between px-1 print:hidden shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-md transition-all cursor-pointer active:scale-95"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* AUTHENTIC A5 POS RECEIPT SLIP                             */}
        {/* ========================================================= */}
        <div
          id="official-pos-receipt-slip"
          className="w-full bg-white text-gray-950 font-mono text-xs rounded-lg shadow-2xl p-6 sm:p-7 border border-gray-300 print:border-none print:shadow-none print:p-0 print:rounded-none"
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
          <div className="text-center space-y-1">
            <div className="text-xs font-bold tracking-widest uppercase">
              ================================
            </div>
            <div className="text-sm font-black tracking-tight uppercase">
              NACOS FUTO
            </div>
            <div className="text-[11px] font-bold tracking-tight uppercase">
              NIGERIA ASSOC. OF COMPUTING STUDENTS
            </div>
            <div className="text-[10px] uppercase">
              FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI
            </div>
            <div className="text-[10px] text-gray-700 uppercase">
              DEPT OF COMPUTER SCIENCE &bull; SICT
            </div>
            <div className="text-xs font-bold tracking-widest uppercase pt-0.5">
              ================================
            </div>
          </div>

          {/* Slip Type Badge */}
          <div className="my-2 py-1 border-y border-dashed border-gray-400 text-center font-bold uppercase tracking-wider text-[11px]">
            {isInvoice ? '*** PROFORMA INVOICE SLIP ***' : '*** OFFICIAL PAYMENT RECEIPT ***'}
          </div>

          {/* Receipt & Transaction Info */}
          <div className="space-y-1 py-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-600">RECEIPT NO:</span>
              <span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TRANS REF:</span>
              <span className="font-bold truncate max-w-[200px]">{transactionId}</span>
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
          <div className="my-1.5 border-t border-dashed border-gray-400"></div>

          {/* Student Particulars */}
          <div className="space-y-1 py-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-600">NAME:</span>
              <span className="font-bold uppercase text-right truncate max-w-[220px]">{studentName}</span>
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
          <div className="my-1.5 border-t-2 border-dashed border-gray-400"></div>

          {/* Itemized Table */}
          <div className="space-y-1.5 py-1 text-[11px]">
            <div className="flex justify-between font-bold border-b border-dashed border-gray-300 pb-1">
              <span>DESCRIPTION</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold truncate max-w-[200px]">
                {paymentType || `Departmental Dues (${level})`}
              </span>
              <span>1</span>
              <span className="font-bold">₦{formattedAmount}</span>
            </div>

            <div className="flex justify-between text-[10px] text-gray-600">
              <span>E-Portal Verification</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Secretariat Tech Levy</span>
              <span>1</span>
              <span>₦0.00</span>
            </div>
          </div>

          {/* Total Box */}
          <div className="my-2 border-y-2 border-black py-2">
            <div className="flex justify-between text-sm font-black">
              <span>TOTAL PAID:</span>
              <span>₦{formattedAmount}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1 text-[10px] text-gray-700 py-1">
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
          <div className="my-3 pt-2 border-t border-dashed border-gray-400 flex flex-col items-center text-center space-y-1">
            <QrCode className="w-16 h-16 text-black" />
            <div className="text-[10px] font-bold tracking-wider uppercase">
              SCAN TO VERIFY ELECTRONIC RECORD
            </div>
            <div className="text-[9px] text-gray-500 font-mono">
              portal.nacosfuto.com.ng/verify/{receiptNo}
            </div>
          </div>

          {/* POS Barcode Simulation */}
          <div className="pt-1 text-center font-mono tracking-widest text-[11px] select-none text-gray-800">
            ||| | ||||| || |||| ||||| ||| ||||| ||
            <div className="text-[9px] tracking-normal text-gray-500 mt-0.5">
              *{receiptNo}*
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-3 pt-2 border-t border-dashed border-gray-400 text-center text-[9px] text-gray-600 leading-tight">
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
