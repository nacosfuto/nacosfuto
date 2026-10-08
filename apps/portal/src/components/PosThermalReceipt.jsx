import React from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, QrCode, FileText } from 'lucide-react';

/**
 * Official Institutional Paper Payment Clearance Receipt (A4 / A5 Ratio)
 * Clean, mature, and orderly academic clearance document.
 * Minimal modal footprint on screen, with direct native printer triggering (window.print()).
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
    level = '300 Level',
    session = '2026/2027',
    amount = '2,500.00',
    rawAmount = 2500,
    paymentType = 'Departmental Dues',
    paymentMethod = 'Bachs Online Gateway (Confirmed)',
    status = isInvoice ? 'PENDING' : 'APPROVED'
  } = data;

  const isPaid = !isInvoice && (status === 'APPROVED' || String(status).toLowerCase().includes('paid') || String(status).toLowerCase().includes('cleared'));
  const numAmount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 2500);
  const formattedAmount = numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const printContent = document.getElementById('official-paper-receipt-slip')?.outerHTML || '';
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NACOS_Receipt_${matricNo}_${receiptNo}</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .receipt-container { max-width: 720px; margin: 0 auto; background: #ffffff; padding: 36px 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    @media print {
      body { background: transparent; padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${printContent}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NACOS_Official_Receipt_${matricNo}_${receiptNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Container Card */}
      <div className="relative max-w-2xl w-full bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[94vh] flex flex-col print:bg-transparent print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none print:static">
        
        {/* Top Control Bar (Suppressed on Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              {isInvoice ? 'Proforma Invoice' : 'Official Payment Receipt'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Print Receipt to Printer"
            >
              <Printer className="w-4 h-4" />
              <span>Print to Printer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
              title="Save HTML Copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
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

        {/* Paper Document Preview Area (A4/A5 Proportions) */}
        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar print:overflow-visible">
          <div
            id="official-paper-receipt-slip"
            className="w-full bg-white text-gray-900 rounded-xl shadow-md p-6 sm:p-8 border border-gray-200 space-y-6 print:border-none print:shadow-none print:p-0 print:rounded-none"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
          >
            {/* Official Institutional Header */}
            <div className="border-b-2 border-emerald-800 pb-4 text-center space-y-1 relative">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 font-bold text-xs">
                  NACOS
                </div>
                <div className="flex-1 text-center space-y-0.5">
                  <div className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Federal University of Technology, Owerri (FUTO)
                  </div>
                  <h1 className="text-sm sm:text-base font-extrabold text-[#083002] tracking-tight uppercase">
                    Nigeria Association of Computing Students (NACOS)
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 uppercase">
                    Department of Computer Science • SICT Secretariat
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 font-bold text-xs">
                  SICT
                </div>
              </div>

              <div className="inline-block px-3 py-1 bg-emerald-900 text-white text-[11px] font-bold uppercase tracking-wider rounded-md mt-1">
                {isInvoice ? 'Official Proforma Invoice Slip' : 'Official Payment Clearance Receipt'}
              </div>
            </div>

            {/* Receipt & Transaction Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/80 p-3.5 rounded-lg border border-gray-200/80">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <span>Invoice / Receipt No:</span>
                </div>
                <div className="font-mono font-bold text-gray-900 text-[11px] sm:text-xs truncate">
                  {receiptNo}
                </div>

                <div className="text-[10px] text-gray-500 pt-1 font-medium">
                  Transaction Ref: <span className="font-mono text-gray-800">{transactionId}</span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <span>Payment Status:</span>
                </div>
                <div>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      APPROVED / CLEARED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      PENDING PAYMENT
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-gray-500 pt-1">
                  Date: <span className="font-semibold text-gray-800">{date} ({time})</span>
                </div>
              </div>
            </div>

            {/* Student Particulars Table */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Student & Academic Particulars</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg border border-gray-200">
                <div className="col-span-2 sm:col-span-2 space-y-0.5">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Student Name</div>
                  <div className="font-bold text-gray-900 uppercase truncate">{studentName}</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Reg / Matric No</div>
                  <div className="font-mono font-bold text-gray-900">{matricNo}</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Academic Level</div>
                  <div className="font-bold text-emerald-800">{level}</div>
                </div>

                <div className="col-span-2 sm:col-span-2 space-y-0.5 pt-1 border-t border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Department</div>
                  <div className="font-medium text-gray-800">{department}</div>
                </div>

                <div className="space-y-0.5 pt-1 border-t border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Academic Session</div>
                  <div className="font-mono font-semibold text-gray-800">{session}</div>
                </div>

                <div className="space-y-0.5 pt-1 border-t border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Payment Channel</div>
                  <div className="font-semibold text-gray-800 truncate">{paymentMethod}</div>
                </div>
              </div>
            </div>

            {/* Itemized Fee Breakdown Table */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <span>Payment Breakdown & Items</span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        {paymentType || `Departmental Dues (${level})`}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">{session}</td>
                      <td className="py-3 px-3 text-center font-mono">1</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">
                        ₦{formattedAmount}
                      </td>
                    </tr>
                    <tr className="text-gray-500 text-[11px]">
                      <td className="py-2 px-3">Electronic Portal Verification Levy</td>
                      <td className="py-2 px-3 font-mono">{session}</td>
                      <td className="py-2 px-3 text-center font-mono">1</td>
                      <td className="py-2 px-3 text-right font-medium">₦0.00 (Included)</td>
                    </tr>
                    <tr className="text-gray-500 text-[11px]">
                      <td className="py-2 px-3">Secretariat Maintenance & Tech Levy</td>
                      <td className="py-2 px-3 font-mono">{session}</td>
                      <td className="py-2 px-3 text-center font-mono">1</td>
                      <td className="py-2 px-3 text-right font-medium">₦0.00 (Included)</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/60 border-t-2 border-emerald-800 text-gray-900">
                      <td colSpan={3} className="py-3 px-3 font-bold text-xs uppercase text-emerald-950">
                        Total Amount Paid
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-sm sm:text-base text-emerald-900">
                        ₦{formattedAmount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Verification, QR Code & Signatures */}
            <div className="pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
                  <QrCode className="w-14 h-14 text-gray-900" />
                </div>
                <div className="space-y-0.5 text-[10px] text-gray-500">
                  <div className="font-bold uppercase text-gray-800">Electronic Registry QR</div>
                  <div>Scan with mobile device to verify clearance on the official registry.</div>
                  <div className="font-mono text-[9px] text-emerald-800">portal.nacosfuto.com.ng/verify</div>
                </div>
              </div>

              <div className="text-right space-y-1 sm:border-l sm:border-gray-200 sm:pl-4">
                <div className="inline-block border-b border-gray-400 pb-0.5 mb-1 px-4 text-center">
                  <span className="font-serif italic text-xs text-gray-700">NACOS Secretariat</span>
                </div>
                <div className="text-[10px] font-bold text-gray-800 uppercase">
                  Director of Finance & Records
                </div>
                <div className="text-[9px] text-gray-500">
                  Official Electronic Authorization Seal
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="pt-3 border-t border-dashed border-gray-200 text-center text-[9px] text-gray-500 leading-relaxed">
              This document is an authentic electronic clearance slip issued by NACOS FUTO. Please retain a printed copy for departmental screening, examination clearance, and student verification.
            </div>

          </div>
        </div>

        {/* Bottom Helper Bar (Suppressed on Print) */}
        <div className="pt-2 text-center text-slate-400 text-[11px] print:hidden shrink-0 flex items-center justify-between">
          <span>Official Paper Size: <strong>A4 / Standard Sheet</strong></span>
          <button
            type="button"
            onClick={handlePrint}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
          >
            Click here to print with your printer
          </button>
        </div>

      </div>

    </div>
  );
};

export default PosThermalReceipt;
