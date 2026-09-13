import { Bill, LandlordSettings } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '--';
  if (dateString === 'Recorded prior' || dateString === '--') return dateString;

  // If ISO string like 2026-09-12T00:00:00 or 2026-09-12
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = isoMatch[1];
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }

  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {}

  return dateString.replace(/T.*$/, '');
}

export function generateWhatsAppMessage(bill: Bill, settings: LandlordSettings): string {
  const cleanPhone = bill.tenantPhone.replace(/\D/g, '');
  const lines = [
    `🏠 *RENT & ELECTRICITY BILL - ${bill.billingMonth.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Tenant:* ${bill.tenantName}`,
    `🚪 *Unit:* ${bill.unitName} (${bill.floorName})`,
    `📅 *Bill Date:* ${formatDate(bill.generatedDate)}`,
    `🔢 *Bill No:* ${bill.billNumber}`,
    ``,
    `📋 *BILL BREAKDOWN:*`,
    `• Monthly House Rent: *₹${bill.baseRent.toLocaleString('en-IN')}*`,
    `• Electricity Meter:`,
    `   - Current Reading: ${bill.currentReading}`,
    `   - Previous Reading: ${bill.previousReading}`,
    `   - Units Consumed: *${bill.unitsConsumed} units*`,
    `   - Electricity Charge (@ ₹${Number(bill.electricityRate).toFixed(2)}/unit): *₹${(bill.unitsConsumed * bill.electricityRate).toFixed(2)}*`,
  ];

  if (bill.otherCharges > 0) {
    const note = bill.otherChargesNote ? ` (${bill.otherChargesNote})` : '';
    lines.push(`• Other Charges${note}: *₹${bill.otherCharges.toLocaleString('en-IN')}*`);
  }

  if (bill.discount > 0) {
    lines.push(`• Discount / Adjustment: *-₹${bill.discount.toLocaleString('en-IN')}*`);
  }

  lines.push(
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 *TOTAL PAYABLE AMOUNT: ₹${Math.round(bill.totalAmount).toLocaleString('en-IN')}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💳 *PAYMENT INSTRUCTIONS:*`,
    `• Pay via UPI to: *${bill.upiId || settings.upiId}*`,
    `• Payee Name: *${settings.upiPayeeName}*`,
    `• Status: *${bill.status.toUpperCase()}*`,
    ``,
    `🙏 _Thank you for keeping payments timely!_`,
    `— ${settings.landlordName} (${settings.propertyName})`
  );

  return lines.join('\n');
}

export function getWhatsAppShareUrl(bill: Bill, settings: LandlordSettings): string {
  const text = generateWhatsAppMessage(bill, settings);
  const cleanPhone = bill.tenantPhone.replace(/\D/g, '');
  // If phone has 10 digits without country code, prepend 91
  const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
}

export function getWhatsAppPdfMessage(bill: Bill): string {
  return `Hello ${bill.tenantName}, your rent invoice for ${bill.billingMonth} is ready. Total due: ₹${bill.totalAmount.toLocaleString('en-IN')}.\n\n*I am attaching the PDF invoice with meter proofs and payment QR.*`;
}

export function getWhatsAppPdfShareUrl(bill: Bill): string {
  const text = getWhatsAppPdfMessage(bill);
  const cleanPhone = bill.tenantPhone.replace(/\D/g, '');
  const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
}

export function generateUpiUri(upiId: string, payeeName: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}
