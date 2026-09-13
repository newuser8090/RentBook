import React, { useState } from 'react';
import { Bill, LandlordSettings } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  generateWhatsAppMessage, 
  getWhatsAppShareUrl, 
  generateUpiUri 
} from '../utils/formatters';
import { downloadInvoicePdf } from '../utils/pdfGenerator';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown
} from 'lucide-react';
import { AppTheme } from '../App';

interface BillReceiptModalProps {
  bill: Bill | null;
  settings: LandlordSettings;
  theme?: AppTheme;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (billId: string, status: 'paid' | 'pending') => void;
}

export const BillReceiptModal: React.FC<BillReceiptModalProps> = ({
  bill,
  settings,
  theme = 'dark',
  isOpen,
  onClose,
}) => {
  const isDark = theme === 'dark';
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(true);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  if (!isOpen || !bill) return null;

  const activeQrCodeUrl = bill.customQrCodeUrl || settings.customQrCodeUrl;
  const upiUri = generateUpiUri(
    bill.upiId || settings.upiId, 
    settings.upiPayeeName, 
    Math.round(bill.totalAmount), 
    `Rent ${bill.billingMonth} - ${bill.unitName}`
  );

  const handleCopyMessage = () => {
    const messageText = generateWhatsAppMessage(bill, settings);
    navigator.clipboard.writeText(messageText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(bill.upiId || settings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Direct WhatsApp Share
  const handleDirectWhatsAppShare = () => {
    const whatsappUrl = getWhatsAppShareUrl(bill, settings);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Native jsPDF Download Action
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadInvoicePdf(bill, settings);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto print:bg-white print:p-0">
      <div 
        id="bill-receipt-dialog"
        className={`rounded-2xl border shadow-2xl max-w-md w-full max-h-[94vh] flex flex-col overflow-hidden transition-all duration-150 print:max-w-none print:w-full print:h-auto print:border-none print:shadow-none ${
          isDark 
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 flex items-center justify-between border-b shrink-0 print:hidden ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isDark 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Rent Receipt</h2>
          </div>

          <button
            id="btn-close-receipt-modal"
            onClick={onClose}
            aria-label="Close"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-black'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Receipt Canvas */}
        <div className={`p-3.5 sm:p-4 overflow-y-auto space-y-3.5 print:p-0 print:overflow-visible ${
          isDark ? 'bg-[#09090b]' : 'bg-slate-50/50'
        }`}>
          {/* Printable Invoice Card */}
          <div 
            id="printable-invoice-card"
            className="rounded-2xl border p-4 sm:p-5 shadow-xs space-y-3 bg-white text-slate-900 border-slate-200 print:bg-white print:text-black print:border-slate-300 print:shadow-none print:p-6"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Property & Invoice Head */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-200">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 block">
                  {settings.propertyName || 'RentBook Property'}
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight mt-0.5 text-slate-900">
                  Rent Receipt
                </h3>
                <p className="text-[10px] font-mono text-slate-500">
                  Invoice #{bill.billNumber}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Invoice Date
                </span>
                <p className="text-xs font-semibold mt-0.5 text-slate-700">
                  {formatDate(bill.generatedDate)}
                </p>
                <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
                  Month: {bill.billingMonth}
                </span>
              </div>
            </div>

            {/* Tenant & Unit Info Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs bg-slate-50 border-slate-200">
              <div>
                <span className="block uppercase font-semibold text-[9px] text-slate-500">
                  Tenant:
                </span>
                <strong className="text-xs font-bold block mt-0.5 text-slate-900">{bill.tenantName}</strong>
                <span className="font-mono text-[10px] text-slate-500">{bill.tenantPhone}</span>
              </div>
              <div className="text-right">
                <span className="block uppercase font-semibold text-[9px] text-slate-500">
                  Unit & Floor:
                </span>
                <strong className="text-xs font-bold block mt-0.5 text-slate-900">{bill.unitName}</strong>
                <span className="text-[10px] text-slate-500">{bill.floorName}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold uppercase border-b pb-1 text-[10px] border-slate-200 text-slate-400">
                <span>Particulars</span>
                <span className="text-right">Amount</span>
              </div>

              {/* Base Rent */}
              <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100">
                <span className="text-slate-700">House Rent</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(bill.baseRent)}</span>
              </div>

              {/* Electricity Charges */}
              <div className="py-1 border-b border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-700">Electricity Charges</span>
                    <span className="text-[10px] block font-mono text-slate-400">
                      {bill.unitsConsumed} units @ ₹{Number(bill.electricityRate).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{(bill.unitsConsumed * bill.electricityRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Other Charges */}
              {bill.otherCharges > 0 && (
                <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100">
                  <span className="text-slate-700">
                    Other Charges {bill.otherChargesNote ? `(${bill.otherChargesNote})` : ''}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(bill.otherCharges)}</span>
                </div>
              )}

              {/* Discount */}
              {bill.discount > 0 && (
                <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100 text-rose-600">
                  <span>Discount / Adjustment</span>
                  <span className="font-mono font-bold">-{formatCurrency(bill.discount)}</span>
                </div>
              )}

              {/* Total Payable */}
              <div className="flex justify-between items-center pt-2 text-sm font-extrabold border-t border-slate-200">
                <span className="text-slate-900 font-bold">Total Payable:</span>
                <span className="font-mono text-base font-bold text-emerald-600">
                  ₹{Math.round(bill.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Meter Reading Photo Proof (If Attached) */}
            {bill.meterPhotoUrl && (
              <div className="p-2.5 rounded-xl border space-y-1.5 bg-slate-50 border-slate-200">
                <div 
                  onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Meter Photo Proof</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 print:hidden">
                    <span>{showPhotoPreview ? 'Hide' : 'View Proof'}</span>
                    {showPhotoPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </div>

                {showPhotoPreview && (
                  <div className="pt-1">
                    <div 
                      onClick={() => setIsPhotoZoomed(true)}
                      className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-300 bg-black/5 inline-block"
                    >
                      <img 
                        src={bill.meterPhotoUrl} 
                        alt="Meter Dial Reading Proof" 
                        crossOrigin="anonymous"
                        className="max-h-36 sm:max-h-44 w-auto rounded object-contain transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold print:hidden">
                        Click to enlarge
                      </div>
                    </div>
                    <span className="text-[9px] block mt-1 text-slate-500">
                      Dial reading: {bill.currentReading} units (Captured on {formatDate(bill.generatedDate)})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Section: UPI ID with copy icon + centered QR code */}
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex flex-col items-center justify-center text-center gap-2">
              <div className="flex items-center justify-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold text-emerald-700 bg-white border-slate-200">
                  {bill.upiId || settings.upiId}
                </span>
                <button
                  onClick={handleCopyUpi}
                  className="p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700 print:hidden"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Clean Centered QR Code Box */}
              <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center w-24 h-24 overflow-hidden">
                {activeQrCodeUrl ? (
                  <img
                    src={activeQrCodeUrl}
                    alt="Landlord UPI QR"
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <QRCodeSVG
                    value={upiUri}
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>
            </div>

            {/* Subtle Landlord Signoff */}
            <div className="text-center text-[10px] pt-0.5 text-slate-400">
              <p>
                Issued by <strong className="text-slate-700 font-semibold">{settings.landlordName}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons: WhatsApp (Primary), Download PDF & Copy Text (Secondary) */}
          <div className="space-y-2 print:hidden">
            {/* Primary Button: Share on WhatsApp */}
            <button
              id="btn-share-whatsapp"
              type="button"
              onClick={handleDirectWhatsAppShare}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer select-none"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Share on WhatsApp</span>
            </button>

            {/* Secondary Row: Download PDF and Copy Text */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-download-pdf-invoice"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className={`py-2 px-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              <button
                id="btn-copy-whatsapp-text"
                onClick={handleCopyMessage}
                className={`py-2 px-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {copiedMsg ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 opacity-70" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Zoom for Meter Photo Proof */}
      {isPhotoZoomed && bill.meterPhotoUrl && (
        <div 
          onClick={() => setIsPhotoZoomed(false)}
          className="fixed inset-0 z-70 bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-xl max-h-[85vh] relative flex flex-col items-center">
            <img 
              src={bill.meterPhotoUrl} 
              alt="Meter Proof Full" 
              className="max-h-[80vh] w-auto rounded-xl object-contain border border-zinc-700" 
            />
            <p className="text-white text-xs mt-2 font-medium">
              Meter Dial Snapshot: {bill.unitName} ({bill.currentReading} units) • Tap anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
