import React from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

/**
 * Authentic Thermal POS Receipt Component
 * Designed to look and feel like a real Point-Of-Sale terminal paper slip.
 * Supports on-screen preview and clean isolated @media print output.
 */
const PosThermalReceipt = ({
  isOpen,
  onClose,
  data,
  isInvoice = false // true for proforma invoice slip, false for official approved receipt
}) => {
  if (!isOpen || !data) return null;

  const {
    receiptNo = 'NACOS-FUTO-001',
    transactionId = 'BCH-TX-89214710',
    date = new Date().toLocaleDateString('en-GB'),
    time = new Date().toLocaleTimeString('en-GB'),
    studentName = 'Student Member',
    matricNo = '20241450682',
    department = 'Computer Science',
    level = '100 Level',
    session = '2026/2027',
    amount = '2,500.00',
    rawAmount = 2500,
    paymentMethod = 'Bachs Payment Gateway (Online)',
    status = isInvoice ? 'PENDING' : 'APPROVED'
  } = data;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const printContent = document.getElementById('thermal-pos-slip-paper')?.outerHTML || '';
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>POS Receipt - ${receiptNo}</title>
  <style>
    body { font-family: 'Courier New', Courier, monospace; background: #eee; margin: 0; padding: 20px; display: flex; justify-content: center; }
    .thermal-paper { width: 340px; background: #fff; padding: 24px 18px; border: 1px dashed #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #333; margin: 10px 0; }
    .double-divider { border-top: 2px solid #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
    .bold { font-weight: bold; }
    .qr { text-align: center; margin: 12px 0; }
    @media print {
      body { background: transparent; padding: 0; }
      .thermal-paper { box-shadow: none; border: none; width: 100%; max-width: 320px; }
    }
  </style>
</head>
<body>
  <div class="thermal-paper">
    ${printContent}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POS_Receipt_${matricNo}_${receiptNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      
      {/* Container Card */}
      <div className="relative max-w-md w-full bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between print:hidden pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {isInvoice ? 'Proforma Invoice Slip' : 'Official Thermal POS Slip'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
              title="Print POS Slip"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
              title="Download HTML"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* REALISTIC THERMAL PAPER SLIP AREA                                  */}
        {/* ================================================================= */}
        <div className="flex justify-center py-1">
          <div
            id="thermal-pos-slip-paper"
            className="w-full max-w-[340px] bg-[#fafaf7] text-neutral-900 font-mono text-xs rounded-sm shadow-xl p-6 relative border border-neutral-300 selection:bg-neutral-300"
            style={{
              fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
              filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))'
            }}
          >
            {/* Top Serrated Edge (Zigzag teeth) */}
            <div 
              className="absolute -top-2 left-0 right-0 h-2 bg-repeat-x bg-[length:12px_8px]"
              style={{
                backgroundImage: 'radial-gradient(circle at 6px 0, transparent 5px, #fafaf7 6px)'
              }}
            />

            {/* Merchant / Organization Header */}
            <div className="text-center space-y-1">
              <div className="font-extrabold text-[13px] tracking-tight text-neutral-950 uppercase">
                NACOS FUTO SECRETARIAT
              </div>
              <div className="text-[10px] uppercase font-bold text-neutral-700">
                Nigeria Association of Computing Students
              </div>
              <div className="text-[10px] text-neutral-600">
                Dept of Computer Science • SICT, FUTO
              </div>
              <div className="text-[9px] text-neutral-500 font-semibold pt-0.5">
                TERMINAL ID: FUTO-POS-01 • MERCH-ID: NACOS-9204
              </div>
            </div>

            {/* Double Divider */}
            <div className="my-3 border-t-2 border-dashed border-neutral-800" />

            {/* Receipt Type Banner */}
            <div className="text-center font-bold text-[12px] tracking-wider py-0.5 uppercase">
              {isInvoice ? '*** PAYMENT INVOICE SLIP ***' : '*** OFFICIAL PAYMENT RECEIPT ***'}
            </div>
            <div className="text-center text-[9px] text-neutral-500 font-medium">
              {isInvoice ? 'PROFORMA SLIP • AWAITING PAYMENT' : 'CUSTOMER COPY • TAX INCLUSIVE'}
            </div>

            {/* Meta Details */}
            <div className="my-2.5 border-t border-dashed border-neutral-400 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">DATE:</span>
                <span className="font-bold text-neutral-900">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">TIME:</span>
                <span className="font-bold text-neutral-900">{time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">TRANS ID:</span>
                <span className="font-bold text-neutral-900 truncate max-w-[190px]">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">INVOICE/REF:</span>
                <span className="font-bold text-neutral-900 truncate max-w-[190px]">{receiptNo}</span>
              </div>
            </div>

            {/* Student Particulars */}
            <div className="my-2.5 border-t border-dashed border-neutral-400 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">STUDENT:</span>
                <span className="font-extrabold text-neutral-950 uppercase truncate max-w-[190px]">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">REG NO:</span>
                <span className="font-extrabold text-neutral-900">{matricNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">DEPT:</span>
                <span className="font-semibold text-neutral-800 truncate max-w-[190px]">{department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">LEVEL:</span>
                <span className="font-extrabold text-neutral-900">{level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">SESSION:</span>
                <span className="font-semibold text-neutral-800">{session}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="my-3 border-t-2 border-dashed border-neutral-800 pt-2 text-[10px]">
              <div className="flex justify-between font-bold text-neutral-700 pb-1 border-b border-neutral-300">
                <span>ITEM DESCRIPTION</span>
                <span>QTY</span>
                <span>AMOUNT (NGN)</span>
              </div>

              <div className="pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold truncate max-w-[170px]">DEPT DUES ({level})</span>
                  <span>1</span>
                  <span className="font-bold">₦{typeof amount === 'number' ? amount.toLocaleString() : amount}</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-neutral-500">
                  <span>PORTAL VERIFY LEVY</span>
                  <span>1</span>
                  <span>₦0.00</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-neutral-500">
                  <span>SECRETARIAT LEVY</span>
                  <span>1</span>
                  <span>₦0.00</span>
                </div>
              </div>
            </div>

            {/* Total Block */}
            <div className="my-3 border-t-2 border-neutral-900 pt-2 space-y-1">
              <div className="flex justify-between items-baseline text-sm font-extrabold text-neutral-950">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base">₦{typeof amount === 'number' ? amount.toLocaleString() : amount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-500">PAYMENT STATUS:</span>
                <span className={`font-black tracking-wider ${isInvoice ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isInvoice ? '*** PENDING PAYMENT ***' : '*** APPROVED / PAID ***'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>PAY METHOD:</span>
                <span className="font-bold truncate max-w-[190px]">{paymentMethod}</span>
              </div>
            </div>

            {/* Realistic Barcode Strips */}
            <div className="my-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-[2px] h-9 overflow-hidden opacity-85 px-4">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, i) => (
                  <div
                    key={i}
                    className="bg-neutral-900 h-full"
                    style={{ width: `${w * 1.5}px` }}
                  />
                ))}
              </div>
              <div className="text-[9px] tracking-widest text-neutral-600 font-bold uppercase">
                *{receiptNo.replace(/[^a-zA-Z0-9]/g, '')}*
              </div>
            </div>

            {/* QR Code Verification Area */}
            <div className="my-2.5 pt-2 border-t border-dashed border-neutral-400 text-center space-y-1">
              <div className="inline-flex p-1.5 bg-white border border-neutral-300 rounded shadow-xs">
                <QrCode className="w-12 h-12 text-neutral-900" />
              </div>
              <div className="text-[9px] text-neutral-500 font-bold">
                SCAN TO VERIFY ELECTRONIC REGISTRY
              </div>
              <div className="text-[8px] text-neutral-400">
                portal.nacosfuto.com/verify
              </div>
            </div>

            {/* Perforated Thermal Footer */}
            <div className="mt-3 pt-2 border-t-2 border-dashed border-neutral-800 text-center space-y-1 text-[9px] text-neutral-600">
              <div className="font-bold text-neutral-800">
                *** PLEASE RETAIN THIS SLIP ***
              </div>
              <div>
                OFFICIAL CLEARANCE PROOF FOR DEPARTMENT SCREENING, EXAMS & ACCREDITATION.
              </div>
              <div className="font-semibold text-neutral-900 pt-0.5">
                POWERED BY NACOS FUTO TECH DIRECTORATE
              </div>
            </div>

            {/* Bottom Serrated Edge (Zigzag teeth) */}
            <div 
              className="absolute -bottom-2 left-0 right-0 h-2 bg-repeat-x bg-[length:12px_8px]"
              style={{
                backgroundImage: 'radial-gradient(circle at 6px 8px, transparent 5px, #fafaf7 6px)'
              }}
            />

          </div>
        </div>

        {/* Bottom Helper Info */}
        <p className="text-[11px] text-center text-slate-400 print:hidden">
          Authentic 80mm thermal receipt format. Click <strong>Print Slip</strong> to output directly to standard POS or A4 printers.
        </p>

      </div>

    </div>
  );
};

export default PosThermalReceipt;
