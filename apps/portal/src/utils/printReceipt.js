/**
 * Reliable POS Thermal Receipt Slip Printer
 * 
 * Uses an isolated hidden iframe with clean document structure to eliminate:
 * 1. Modal backdrop / overflow:hidden parent clippings
 * 2. Tailwind dark-mode print filter issues
 * 3. Blank page bugs caused by body * { visibility: hidden }
 */
export const printReceiptSlip = (elementId = 'official-pos-receipt-slip') => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const existingIframe = document.getElementById('nacos-receipt-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create clean isolated iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'nacos-receipt-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const pri = iframe.contentWindow;
  const doc = pri.document;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>NACOS FUTO - Official Payment Receipt</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, 'SFMono-Regular', Consolas, monospace;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 5mm 0;
          }
          .receipt-print-container {
            width: 100%;
            max-width: 440px;
            margin: 0 auto;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px 14px;
            border: 1px dashed #444444;
          }
          /* Typography & spacing */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .font-mono { font-family: 'Courier New', Courier, monospace; }
          .uppercase { text-transform: uppercase; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          
          /* Flex utilities */
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-center { align-items: center; }
          
          /* Spacing */
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1\\.5 > * + * { margin-top: 6px; }
          .my-2 { margin-top: 8px; margin-bottom: 8px; }
          .my-2\\.5 { margin-top: 10px; margin-bottom: 10px; }
          .mb-3 { margin-bottom: 12px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .pt-1 { padding-top: 4px; }
          .pb-1 { padding-bottom: 4px; }
          .pt-2\\.5 { padding-top: 10px; }
          
          /* Borders */
          .border-t { border-top: 1px dashed #555555; }
          .border-t-2 { border-top: 2px dashed #333333; }
          .border-b { border-bottom: 1px dashed #555555; }
          .border-y { border-top: 1px dashed #555555; border-bottom: 1px dashed #555555; }
          .border-y-2 { border-top: 2px solid #000000; border-bottom: 2px solid #000000; }
          .border-dashed { border-style: dashed !important; }
          
          /* Text sizing */
          .text-xs { font-size: 12px; }
          .text-\\[10px\\] { font-size: 10px; }
          .text-\\[11px\\] { font-size: 11px; }
          .text-sm { font-size: 13px; }
          .text-base { font-size: 14px; }
          .text-gray-600 { color: #444444; }
          .text-gray-700 { color: #333333; }
          
          /* Hide all action buttons and print:hidden elements */
          button, .print\\:hidden, #receipt-print-btn, #receipt-close-btn {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Logo sizing */
          img {
            max-height: 48px;
            width: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="receipt-print-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Wait for images to load before opening print dialog
  const imgs = doc.images;
  let loadedCount = 0;
  const totalImgs = imgs.length;

  const executePrint = () => {
    try {
      pri.focus();
      pri.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e);
      window.print();
    } finally {
      setTimeout(() => {
        try { iframe.remove(); } catch (_) {}
      }, 2000);
    }
  };

  if (totalImgs === 0) {
    setTimeout(executePrint, 150);
  } else {
    for (let i = 0; i < totalImgs; i++) {
      if (imgs[i].complete) {
        loadedCount++;
      } else {
        imgs[i].onload = () => {
          loadedCount++;
          if (loadedCount >= totalImgs) executePrint();
        };
        imgs[i].onerror = () => {
          loadedCount++;
          if (loadedCount >= totalImgs) executePrint();
        };
      }
    }
    if (loadedCount >= totalImgs) {
      setTimeout(executePrint, 150);
    }
  }
};
