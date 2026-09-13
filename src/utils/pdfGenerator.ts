import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Bill, LandlordSettings } from '../types';
import { formatDate, generateUpiUri } from './formatters';

export function getInvoiceFileName(bill: Bill): string {
  const safeUnit = bill.unitName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = bill.billingMonth.replace(/[^a-zA-Z0-9]/g, '_');
  return `Invoice_${safeUnit}_${safeMonth}.pdf`;
}

/**
 * Safely loads an image URL into a Base64 Data URL for embedding into jsPDF
 */
async function loadImageAsDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:image/')) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(null);
        }
      } catch (e) {
        console.warn('Canvas conversion failed for image:', e);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('Could not load image for PDF embedding:', src);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Native vector PDF generation for rent invoices using jsPDF.
 * Bypasses html2canvas completely to avoid CSS/oklch parser crashes.
 */
export async function generateInvoicePdfDoc(
  bill: Bill,
  settings?: LandlordSettings
): Promise<{ pdf: jsPDF; fileName: string }> {
  const fileName = getInvoiceFileName(bill);

  // Initialize A4 PDF: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const propertyName = settings?.propertyName || 'RentBook Property';
  const landlordName = settings?.landlordName || 'Landlord';
  const landlordPhone = settings?.landlordPhone || '';
  const upiId = bill.upiId || settings?.upiId || '';
  const upiPayeeName = settings?.upiPayeeName || landlordName;

  // Generate UPI URI for QR code
  const upiUri = generateUpiUri(
    upiId,
    upiPayeeName,
    bill.totalAmount,
    `Rent ${bill.billingMonth} - ${bill.unitName}`
  );

  // Load QR code as PNG data URL
  let qrDataUrl: string | null = null;
  const customQrUrl = bill.customQrCodeUrl || settings?.customQrCodeUrl;
  if (customQrUrl) {
    qrDataUrl = await loadImageAsDataUrl(customQrUrl);
  }
  if (!qrDataUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(upiUri, {
        margin: 1,
        width: 256,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.warn('Failed to generate QR Data URL:', err);
    }
  }

  // Load Meter Photo if present
  let meterPhotoDataUrl: string | null = null;
  if (bill.meterPhotoUrl) {
    meterPhotoDataUrl = await loadImageAsDataUrl(bill.meterPhotoUrl);
  }

  // ==========================================
  // 1. TOP ACCENT BAR & HEADER
  // ==========================================
  // Emerald Accent top bar
  doc.setFillColor(5, 150, 105); // #059669
  doc.roundedRect(15, 14, 180, 2.5, 1, 1, 'F');

  // Property & Invoice Title (Left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text(propertyName, 15, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105); // #059669
  doc.text('OFFICIAL RENT & UTILITY INVOICE', 15, 29);

  // Invoice Meta (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`Invoice #${bill.billNumber}`, 195, 23, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text(`Date: ${formatDate(bill.generatedDate)}`, 195, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Billing Period: ${bill.billingMonth}`, 195, 33, { align: 'right' });

  // Divider Line
  doc.setDrawColor(229, 231, 235); // #E5E7EB
  doc.setLineWidth(0.35);
  doc.line(15, 38, 195, 38);

  // ==========================================
  // 2. TENANT & PROPERTY CARDS (2-COLUMN)
  // ==========================================
  // Left Box: Tenant Details
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(15, 42, 88, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('BILLED TO / TENANT', 19, 47.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(bill.tenantName || 'Tenant', 19, 53.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Phone: ${bill.tenantPhone || 'N/A'}`, 19, 59.5);

  // Right Box: Property & Floor Details
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(107, 42, 88, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('ROOM / PREMISES', 111, 47.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(bill.unitName, 111, 53.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`${bill.floorName}  |  Month: ${bill.billingMonth}`, 111, 59.5);

  // ==========================================
  // 3. ITEMIZED CHARGES TABLE
  // ==========================================
  let currentY = 70;

  // Table Header
  doc.setFillColor(243, 244, 246); // #F3F4F6
  doc.rect(15, currentY, 180, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('DESCRIPTION / PARTICULARS', 19, currentY + 5);
  doc.text('RATE / DETAILS', 105, currentY + 5);
  doc.text('AMOUNT (INR)', 191, currentY + 5, { align: 'right' });

  currentY += 7.5;

  // Row 1: Base Rent
  doc.setDrawColor(243, 244, 246);
  doc.line(15, currentY + 11.5, 195, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('Monthly House Rent', 19, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Billing Month: ${bill.billingMonth}`, 19, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Fixed Monthly', 105, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs. ${bill.baseRent.toLocaleString('en-IN')}`, 191, currentY + 6.5, { align: 'right' });

  currentY += 11.5;

  // Row 2: Electricity
  doc.setDrawColor(243, 244, 246);
  doc.line(15, currentY + 13.5, 195, currentY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('Electricity Consumption', 19, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Meter: ${bill.previousReading} -> ${bill.currentReading} = ${bill.unitsConsumed} units`, 19, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`${bill.unitsConsumed} units @ Rs. ${Number(bill.electricityRate).toFixed(2)}`, 105, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs. ${(bill.unitsConsumed * bill.electricityRate).toFixed(2)}`, 191, currentY + 7, { align: 'right' });

  currentY += 13.5;

  // Row 3: Other Charges (if any)
  if (bill.otherCharges > 0) {
    doc.setDrawColor(243, 244, 246);
    doc.line(15, currentY + 10, 195, currentY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(`Other Charges ${bill.otherChargesNote ? `(${bill.otherChargesNote})` : ''}`, 19, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text('Additional', 105, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(`Rs. ${bill.otherCharges.toLocaleString('en-IN')}`, 191, currentY + 6, { align: 'right' });

    currentY += 10;
  }

  // Row 4: Discount (if any)
  if (bill.discount > 0) {
    doc.setDrawColor(243, 244, 246);
    doc.line(15, currentY + 10, 195, currentY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38); // #DC2626
    doc.text('Discount / Adjustment', 19, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text('Concession', 105, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`- Rs. ${bill.discount.toLocaleString('en-IN')}`, 191, currentY + 6, { align: 'right' });

    currentY += 10;
  }

  // Total Amount Highlight Card
  currentY += 3;
  doc.setFillColor(236, 253, 245); // #ECFDF5 Emerald light
  doc.setDrawColor(167, 243, 208); // #A7F3D0
  doc.roundedRect(15, currentY, 180, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(6, 95, 70); // #065F46
  doc.text('TOTAL AMOUNT PAYABLE', 21, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105); // #059669
  doc.text(`Rs. ${Math.round(bill.totalAmount).toLocaleString('en-IN')}`, 190, currentY + 9.5, { align: 'right' });

  currentY += 19;

  // ==========================================
  // 4. PAYMENT (QR) & METER PROOF SECTION
  // ==========================================
  const hasMeterPhoto = Boolean(meterPhotoDataUrl);

  if (hasMeterPhoto) {
    // Two Column layout: Left = UPI QR (w: 100), Right = Meter Photo (w: 75)
    const cardHeight = 56;

    // Left UPI Card
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, currentY, 100, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text('SCAN & PAY VIA UPI', 19, currentY + 6.5);

    // Embed QR Code
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 19, currentY + 9.5, 34, 34);
    }

    // UPI text details next to QR
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('UPI ID / VPA:', 57, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(upiId || 'Not provided', 57, currentY + 16.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Payee Name:', 57, currentY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(upiPayeeName, 57, currentY + 26.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('Supported: GPay / PhonePe / Paytm / BHIM', 19, currentY + 50);

    // Right Meter Photo Proof Card
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(120, currentY, 75, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(217, 119, 6); // #D97706 Amber
    doc.text('METER DIAL PROOF PHOTO', 124, currentY + 6.5);

    if (meterPhotoDataUrl) {
      try {
        doc.addImage(meterPhotoDataUrl, 'JPEG', 124, currentY + 9.5, 67, 36);
      } catch (err) {
        console.warn('Failed to embed meter photo in PDF:', err);
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`Reading: ${bill.currentReading} units (${bill.billingMonth})`, 124, currentY + 50);

    currentY += cardHeight + 6;
  } else {
    // Single wide payment card
    const cardHeight = 44;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, currentY, 180, cardHeight, 2, 2, 'FD');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('UPI PAYMENT INSTRUCTIONS', 20, currentY + 7);

    // QR on left
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 20, currentY + 10.5, 29, 29);
    }

    // Payment details in center
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI app:', 56, currentY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('UPI ID / VPA:', 56, currentY + 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text(upiId || 'Not provided', 56, currentY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Payee Name: ${upiPayeeName}`, 56, currentY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Please notify the landlord once the payment is completed.', 56, currentY + 38);

    currentY += cardHeight + 6;
  }

  // ==========================================
  // 5. FOOTER (PINNED AT BOTTOM)
  // ==========================================
  const footerY = 276;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.35);
  doc.line(15, footerY, 195, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const landlordLine = `Issued by: ${landlordName}${landlordPhone ? `  |  Phone: ${landlordPhone}` : ''}`;
  doc.text(landlordLine, 15, footerY + 5.5);
  doc.text(`Property: ${propertyName}`, 15, footerY + 10);

  doc.text('Generated via RentBook • Digital Property & Rent Ledger', 195, footerY + 5.5, { align: 'right' });
  doc.text(`Page 1 of 1  •  ${bill.billingMonth}`, 195, footerY + 10, { align: 'right' });

  return { pdf: doc, fileName };
}

/**
 * Directly downloads the generated vector PDF without DOM rendering
 */
export async function downloadInvoicePdf(
  bill: Bill,
  settings?: LandlordSettings
): Promise<string> {
  const { pdf, fileName } = await generateInvoicePdfDoc(bill, settings);
  pdf.save(fileName);
  return fileName;
}

/**
 * Generates the PDF and opens the PDF blob preview in a new browser tab/window
 */
export async function previewInvoicePdfInNewTab(
  bill: Bill,
  settings?: LandlordSettings
): Promise<string> {
  const { pdf, fileName } = await generateInvoicePdfDoc(bill, settings);
  const blobUrl = pdf.output('bloburl');
  window.open(blobUrl, '_blank');
  return fileName;
}

/**
 * Returns a Blob URL for inline iframe or modal preview
 */
export async function getInvoicePdfBlobUrl(
  bill: Bill,
  settings?: LandlordSettings
): Promise<{ blobUrl: string; fileName: string }> {
  const { pdf, fileName } = await generateInvoicePdfDoc(bill, settings);
  const blob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, fileName };
}
