import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill, LandlordSettings, Unit } from '../types';
import { formatDate } from './formatters';

export interface MoveOutStatementPdfParams {
  unit: Unit;
  bills: Bill[];
  settings?: LandlordSettings;
  securityDeposit: number;
  unpaidDues?: number;
  closingPhotoUrl?: string;
  moveOutDate?: string;
  finalMeterReading?: number;
  electricityRate?: number;
  cleaningDeductions?: number;
  damageDeductions?: number;
  noticePenalty?: number;
  noticeGiven?: boolean;
  remarks?: string;
}

/**
 * Safely converts an image URL / blob to a base64 Data URL for embedding in jsPDF
 */
async function getImageDataUrl(src?: string): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  if (!src) return null;

  // Already a base64 string
  if (src.startsWith('data:image/')) {
    const isPng = src.startsWith('data:image/png');
    return { dataUrl: src, format: isPng ? 'PNG' : 'JPEG' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.85),
            format: 'JPEG',
          });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generateMoveOutStatementPdf(
  paramsOrUnit: MoveOutStatementPdfParams | Unit,
  billsArg?: Bill[],
  settingsArg?: LandlordSettings,
  securityDepositArg?: number,
  unpaidDuesArg?: number,
  closingPhotoUrlArg?: string
): Promise<{ pdf: jsPDF; fileName: string }> {
  let params: MoveOutStatementPdfParams;
  if ('name' in paramsOrUnit && 'id' in paramsOrUnit) {
    params = {
      unit: paramsOrUnit,
      bills: billsArg || [],
      settings: settingsArg,
      securityDeposit: securityDepositArg ?? 0,
      unpaidDues: unpaidDuesArg ?? 0,
      closingPhotoUrl: closingPhotoUrlArg,
    };
  } else {
    params = paramsOrUnit as MoveOutStatementPdfParams;
  }

  const {
    unit,
    bills = [],
    settings,
    securityDeposit = 0,
    unpaidDues = 0,
    closingPhotoUrl = (unit as any).moveOutReadingPhotoUrl || (unit as any).moveOutPhotoUrl,
    moveOutDate = new Date().toISOString().split('T')[0],
    finalMeterReading = unit.previousMeterReading,
    electricityRate = settings?.defaultElectricityRate || 8,
    cleaningDeductions = 0,
    damageDeductions = 0,
    noticePenalty = 0,
    noticeGiven = true,
    remarks = '',
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Final meter calculations
  const openingReading = unit.previousMeterReading ?? 0;
  const closingReading = finalMeterReading >= openingReading ? finalMeterReading : openingReading;
  const finalUnitsUsed = Math.max(0, closingReading - openingReading);
  const finalPowerCost = Math.round(finalUnitsUsed * electricityRate * 100) / 100;

  // Dues and Settlement calculations
  const safeDeposit = Math.round(Number(securityDeposit) || 0);
  const safeUnpaidDues = Math.round(Number(unpaidDues) || 0);
  const safeCleaning = Math.round(Number(cleaningDeductions) || 0);
  const safeDamage = Math.round(Number(damageDeductions) || 0);
  const safePenalty = noticeGiven ? 0 : Math.round(Number(noticePenalty) || 0);
  const totalDeductions = Math.round(safeCleaning + safeDamage + safePenalty);

  const totalPayableByTenant = Math.round(safeUnpaidDues + finalPowerCost + totalDeductions);
  const netAmount = Math.abs(safeDeposit - totalPayableByTenant);
  const isRefund = safeDeposit >= totalPayableByTenant;

  const propertyName = settings?.propertyName || 'Property Management';
  const landlordName = settings?.landlordName || settings?.upiPayeeName || 'Landlord';
  const landlordPhone = settings?.landlordPhone || '';
  const upiId = settings?.upiId || '';
  const tenantName = unit.tenantName || 'Tenant';
  const tenantPhone = unit.tenantPhone || 'N/A';
  const unitName = unit.name || 'Unit';
  const moveInDateStr = unit.moveInDate ? formatDate(unit.moveInDate) : 'Recorded prior';
  const settlementDateStr = formatDate(moveOutDate);

  let cursorY = margin;

  // 1. TOP HEADER BANNER
  doc.setFillColor(236, 253, 245); // light mint green
  doc.setDrawColor(167, 243, 208); // emerald-200 border
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cursorY, contentWidth, 21, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // dark slate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(propertyName.toUpperCase(), margin + 6, cursorY + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('TENANT MOVE-OUT SETTLEMENT STATEMENT', margin + 6, cursorY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`UNIT: ${unitName.toUpperCase()}`, pageWidth - margin - 6, cursorY + 8.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${settlementDateStr}`, pageWidth - margin - 6, cursorY + 14.5, { align: 'right' });

  cursorY += 24;

  // 2. METADATA CARDS
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, contentWidth / 2 - 2, 26, 2, 2, 'FD');
  doc.roundedRect(margin + contentWidth / 2 + 2, cursorY, contentWidth / 2 - 2, 26, 2, 2, 'FD');

  // Left card: Tenant Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TENANT DETAILS', margin + 4, cursorY + 5.5);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenantName, margin + 4, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${tenantPhone}`, margin + 4, cursorY + 16.5);
  doc.text(`Monthly Rent: Rs. ${Math.round(unit.monthlyRent || 0).toLocaleString('en-IN')}`, margin + 4, cursorY + 21.5);

  // Right card: Tenancy Period
  const rightX = margin + contentWidth / 2 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TENANCY DURATION & OWNER', rightX + 4, cursorY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Move-In Date: ${moveInDateStr}`, rightX + 4, cursorY + 11);
  doc.text(`Move-Out Date: ${settlementDateStr}`, rightX + 4, cursorY + 16);
  doc.setTextColor(100, 116, 139);
  doc.text(`Owner: ${landlordName} ${landlordPhone ? `(${landlordPhone})` : ''}`, rightX + 4, cursorY + 21.5);

  cursorY += 30;

  // 3. MONTH-WISE BILLING LEDGER
  const tenantBills = bills.filter((b) => {
    if (b.unitId !== unit.id) return false;
    if (!b.tenantName || !unit.tenantName) return true;
    return b.tenantName.trim().toLowerCase() === unit.tenantName.trim().toLowerCase();
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Month-Wise Billing Ledger (Prior Tenancy Cycles)', margin, cursorY);
  cursorY += 2.5;

  const ledgerRows = tenantBills.length > 0
    ? tenantBills.map((b) => {
        const prev = Number(b.previousReading ?? (b as any).previous_reading ?? 0);
        const curr = Number(b.currentReading ?? (b as any).current_reading ?? 0);
        const units = Number(b.electricityUnits ?? b.unitsConsumed ?? 0);
        const rate = Number(b.electricityRate || electricityRate).toFixed(2);
        const powerAmount = Math.round(b.electricityAmount || 0);
        const total = Math.round(b.totalAmount || 0);
        const status = (b.status || 'pending').toUpperCase();

        const meterUsageText =
          prev === 0 && curr === 0 && units > 0
            ? `${units} units consumed`
            : `${prev} -> ${curr} (${units}u @ Rs. ${rate})`;

        return [
          b.billingMonth || 'Billing Cycle',
          `Rs. ${Math.round(b.baseRent || 0).toLocaleString('en-IN')}`,
          meterUsageText,
          `Rs. ${powerAmount.toLocaleString('en-IN')}`,
          `Rs. ${total.toLocaleString('en-IN')}`,
          status,
        ];
      })
    : [
        [
          'No prior generated billing cycles recorded for this tenancy',
          `Rs. ${Math.round(unit.monthlyRent || 0).toLocaleString('en-IN')}`,
          `Baseline: ${openingReading} units`,
          'Rs. 0',
          'Rs. 0',
          'PAID / N/A',
        ],
      ];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Billing Month', 'Base Rent', 'Meter Reading & Usage', 'Power Cost', 'Total Bill', 'Status']],
    body: ledgerRows,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      lineColor: [4, 120, 87],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'right' },
      2: { cellWidth: 50 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw).toUpperCase();
        if (text === 'PAID') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text === 'PENDING') {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 5;

  // 4. FINAL CLOSING METER READING SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Final Meter Reading & Checkout Power Due', margin, cursorY);
  cursorY += 2.5;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Opening Dial', 'Closing Dial', 'Net Consumed', 'Unit Rate', 'Final Power Due']],
    body: [
      [
        `${openingReading} units`,
        `${closingReading} units`,
        `${finalUnitsUsed} units`,
        `Rs. ${Number(electricityRate).toFixed(2)} / unit`,
        `Rs. ${Math.round(finalPowerCost).toLocaleString('en-IN')}`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      lineColor: [4, 120, 87],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [15, 23, 42],
      halign: 'center',
    },
    columnStyles: {
      4: { fontStyle: 'bold', textColor: [180, 83, 9] },
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 5;

  // 5. FINANCIAL RECONCILIATION TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Comprehensive Financial Reconciliation', margin, cursorY);
  cursorY += 2.5;

  const reconciliationBody: any[] = [
    ['Baseline Security Deposit (Recorded upon Move-In)', '(+) In Credit', `Rs. ${safeDeposit.toLocaleString('en-IN')}`],
    ['Unpaid Rent / Prior Bills Outstanding', '(-) Deduction', `Rs. ${safeUnpaidDues.toLocaleString('en-IN')}`],
    ['Final Electricity Charges (Closing Meter Usage)', '(-) Deduction', `Rs. ${Math.round(finalPowerCost).toLocaleString('en-IN')}`],
  ];

  if (safeCleaning > 0 || safeDamage > 0) {
    reconciliationBody.push([
      `Cleaning & Damage Repair Deductions ${remarks ? `(${remarks})` : ''}`,
      '(-) Deduction',
      `Rs. ${(safeCleaning + safeDamage).toLocaleString('en-IN')}`,
    ]);
  }

  if (safePenalty > 0) {
    reconciliationBody.push([
      'Notice Period Non-Compliance Penalty',
      '(-) Deduction',
      `Rs. ${safePenalty.toLocaleString('en-IN')}`,
    ]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Particulars / Description', 'Classification', 'Amount']],
    body: reconciliationBody,
    theme: 'striped',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      lineColor: [4, 120, 87],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 36, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const text = String(data.cell.raw);
        if (text.includes('Credit')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // 6. GRAND TOTAL BOX
  const boxHeight = 16;
  if (isRefund) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text('NET REFUND TO TENANT:', margin + 6, cursorY + 6.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text('Balance returned to tenant in full & final settlement', margin + 6, cursorY + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(4, 120, 87);
    doc.text(`Rs. ${netAmount.toLocaleString('en-IN')}`, pageWidth - margin - 6, cursorY + 10.5, { align: 'right' });
  } else {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(225, 29, 72);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(225, 29, 72);
    doc.text('NET DUES FROM TENANT:', margin + 6, cursorY + 6.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(244, 63, 94);
    doc.text('Outstanding balance due from tenant to complete move-out', margin + 6, cursorY + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(190, 18, 60);
    doc.text(`Rs. ${netAmount.toLocaleString('en-IN')}`, pageWidth - margin - 6, cursorY + 10.5, { align: 'right' });
  }

  cursorY += boxHeight + 4;

  // 7. SIDE-BY-SIDE CARDS: METER PHOTO (LEFT) & PAYMENT / OWNER DETAILS (RIGHT)
  const blockHeight = 36;
  const colWidth = (contentWidth - 4) / 2;
  const rightColX = margin + colWidth + 4;

  // Left Card: Meter Photo Proof
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, colWidth, blockHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('METER DIAL PROOF PHOTO', margin + 4, cursorY + 5);

  let photoAttached = false;
  if (closingPhotoUrl) {
    try {
      const imgRes = await getImageDataUrl(closingPhotoUrl);
      if (imgRes) {
        doc.addImage(imgRes.dataUrl, imgRes.format, margin + 4, cursorY + 7, 26, 22);
        photoAttached = true;
      }
    } catch (e) {
      console.warn('Could not embed meter photo:', e);
    }
  }

  if (!photoAttached) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + 4, cursorY + 7, 26, 22, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No photo', margin + 9, cursorY + 18);
  }

  const textLeft = margin + 33;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Final Dial Verification', textLeft, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reading: ${closingReading} units`, textLeft, cursorY + 16);
  doc.text(`Consumed: ${finalUnitsUsed} units`, textLeft, cursorY + 20);
  doc.text(`Rate: Rs. ${Number(electricityRate).toFixed(2)}/u`, textLeft, cursorY + 24);

  // Right Card: Landlord Payment or Clearance Details
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightColX, cursorY, colWidth, blockHeight, 2, 2, 'FD');

  if (!isRefund && upiId) {
    // Tenant owes money -> Show QR Code & UPI Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('SCAN & PAY DUES VIA UPI', rightColX + 4, cursorY + 5);

    // QR Code Image
    const qrUrl = settings?.customQrCodeUrl || 
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        `upi://pay?pa=${upiId}&pn=${encodeURIComponent(landlordName)}&am=${netAmount}&cu=INR`
      )}`;

    const qrRes = await getImageDataUrl(qrUrl);
    if (qrRes) {
      doc.addImage(qrRes.dataUrl, qrRes.format, rightColX + 4, cursorY + 7, 23, 23);
    }

    const qrTextX = rightColX + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(landlordName, qrTextX, cursorY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`UPI ID: ${upiId}`, qrTextX, cursorY + 16);
    if (landlordPhone) {
      doc.text(`Phone: ${landlordPhone}`, qrTextX, cursorY + 20);
    }
    doc.text('GPay / PhonePe / Paytm', qrTextX, cursorY + 24);
  } else {
    // Landlord refund or settled -> No QR, Show Landlord Contact & Clearance info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('LANDLORD & CLEARANCE DETAILS', rightColX + 4, cursorY + 5);

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(landlordName, rightColX + 4, cursorY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    if (landlordPhone) {
      doc.text(`Contact: ${landlordPhone}`, rightColX + 4, cursorY + 17);
    }
    if (upiId) {
      doc.text(`UPI VPA: ${upiId}`, rightColX + 4, cursorY + 21);
    }
    doc.text(
      isRefund ? 'Status: Refund processed to tenant' : 'Status: Tenancy settled even',
      rightColX + 4,
      cursorY + 26
    );
  }

  cursorY += blockHeight + 4;

  // 8. SIGNATURE / SIGN-OFF BLOCK
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY + 11, margin + 60, cursorY + 11);
  doc.line(pageWidth - margin - 60, cursorY + 11, pageWidth - margin, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tenant Signature (${tenantName})`, margin, cursorY + 15);
  doc.text(`Landlord Signature / Seal (${landlordName})`, pageWidth - margin, cursorY + 15, { align: 'right' });

  // 9. FOOTER
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Settlement generated electronically via RentBook. Document certified on ${settlementDateStr}.`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  const safeTenant = tenantName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeUnit = unitName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `MoveOut_Statement_${safeUnit}_${safeTenant}.pdf`;

  doc.save(fileName);

  return { pdf: doc, fileName };
}