import React, { useState, useEffect, useRef } from 'react';
import { Unit, Floor, Bill, LandlordSettings, TenancyRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { computeMoveOutSettlement } from '../utils/billingCycle';
import { compressImageFile } from '../utils/imageCompressor';
import { generateMoveOutStatementPdf } from '../utils/generateMoveOutStatementPdf';
import { saveUnitToSupabase } from '../lib/supabase';
import { 
  X, 
  Zap, 
  LogOut, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Trash2, 
  MessageSquare,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { AppTheme } from '../App';

interface MoveOutSettlementModalProps {
  unit: Unit | null;
  floor?: Floor;
  bills: Bill[];
  settings: LandlordSettings;
  theme?: AppTheme;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSettlement: (updatedUnit: Unit, settlementRecord: TenancyRecord) => void;
}

const extractDeposit = (u: any): number => {
  if (!u) return 0;
  return Number(u.depositAmount ?? u.deposit_amount ?? u.deposit ?? 0);
};

export const MoveOutSettlementModal: React.FC<MoveOutSettlementModalProps> = ({
  unit,
  floor,
  bills,
  settings,
  theme = 'dark',
  isOpen,
  onClose,
  onConfirmSettlement,
}) => {
  const isDark = theme === 'dark';

  const todayStr = new Date().toISOString().split('T')[0];
  const [moveOutDate, setMoveOutDate] = useState(todayStr);
  const [finalMeterReading, setFinalMeterReading] = useState<number>(() => unit?.previousMeterReading ?? 0);
  const [electricityRate] = useState<number>(settings.defaultElectricityRate || 8);
  
  // Calculate existing unpaid dues for this unit
  const unpaidBills = unit ? bills.filter(b => b.unitId === unit.id && b.status === 'pending') : [];
  const totalUnpaidBillsAmount = Math.round(unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0));

  const [securityDeposit, setSecurityDeposit] = useState<number>(() => extractDeposit(unit));
  const [unpaidDues, setUnpaidDues] = useState<number>(Math.round(totalUnpaidBillsAmount));
  const [cleaningDeductions, setCleaningDeductions] = useState<number>(0);
  const [damageDeductions, setDamageDeductions] = useState<number>(0);
  const [noticeGiven, setNoticeGiven] = useState<boolean>(true);
  const [noticePenalty, setNoticePenalty] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('Standard move-out checkout complete.');

  // Sync security deposit and meter reading whenever unit changes or modal opens
  useEffect(() => {
    setSecurityDeposit(extractDeposit(unit));
    if (unit) {
      setFinalMeterReading(unit.previousMeterReading ?? 0);
    }
  }, [unit?.id, unit?.depositAmount, (unit as any)?.deposit_amount, isOpen]);

  // Photo state
  const [closingPhotoUrl, setClosingPhotoUrl] = useState<string | undefined>(undefined);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !unit) return null;

  const finalMeterReadingNum = finalMeterReading;

  // Real-time calculation
  const settlement = computeMoveOutSettlement({
    depositAmount: securityDeposit,
    previousReading: unit.previousMeterReading,
    finalReading: finalMeterReadingNum,
    electricityRate,
    unpaidDues,
    cleaningDeductions,
    damageDeductions,
    noticePenalty: noticeGiven ? 0 : noticePenalty,
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      const compressedDataUrl = await compressImageFile(file, 900, 900, 0.75);
      setClosingPhotoUrl(compressedDataUrl);
    } catch (err) {
      console.error('Photo compression error:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setClosingPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setClosingPhotoUrl(undefined);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleWhatsAppShare = () => {
    const propertyTitle = settings.propertyName ? `*${settings.propertyName}*` : '*Rental Settlement*';
    const message = `🧾 ${propertyTitle} - *Move-Out Settlement Statement*
━━━━━━━━━━━━━━━━━━━
👤 *Tenant:* ${unit.tenantName}
🏠 *Room/Unit:* ${unit.name} (${floor?.name || 'Floor'})
📅 *Move-in:* ${unit.moveInDate ? formatDate(unit.moveInDate) : 'N/A'}
📅 *Move-out:* ${formatDate(moveOutDate)}

⚡ *Final Electricity Calculation:*
• Opening Reading: ${unit.previousMeterReading} units
• Closing Reading: ${finalMeterReadingNum} units
• Consumed: ${settlement.electricityUnitsUsed} units @ ₹${Number(electricityRate).toFixed(2)}/u
• Power Due: ₹${Math.round(settlement.electricityCost).toLocaleString('en-IN')}

💰 *Settlement Breakdown:*
• Deposit Paid: ₹${Math.round(securityDeposit).toLocaleString('en-IN')}
• Unpaid Bills/Rent: ₹${Math.round(unpaidDues).toLocaleString('en-IN')}
• Electricity Charge: ₹${Math.round(settlement.electricityCost).toLocaleString('en-IN')}
• Deductions (Cleaning/Damage): ₹${Math.round(cleaningDeductions + damageDeductions).toLocaleString('en-IN')}
${!noticeGiven && noticePenalty > 0 ? `• Notice Penalty: ₹${Math.round(noticePenalty).toLocaleString('en-IN')}\n` : ''}━━━━━━━━━━━━━━━━━━━
${settlement.isRefund 
  ? `🟢 *Net Refund to Tenant:* *₹${Math.round(settlement.netAmount).toLocaleString('en-IN')}*` 
  : `🔴 *Net Amount Due from Tenant:* *₹${Math.round(settlement.netAmount).toLocaleString('en-IN')}*`}

📝 *Notes:* ${remarks}
📞 *Contact:* ${settings.landlordName || 'Landlord'} (${settings.landlordPhone || ''})
━━━━━━━━━━━━━━━━━━━
_Generated via RentBook_`;

    const phoneClean = (unit.tenantPhone || '').replace(/\D/g, '');
    const url = phoneClean 
      ? `https://wa.me/91${phoneClean.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = async () => {
    if (!unit) return;
    try {
      setIsGeneratingPdf(true);
      await generateMoveOutStatementPdf({
        unit,
        bills,
        settings,
        securityDeposit,
        unpaidDues,
        closingPhotoUrl,
        moveOutDate,
        finalMeterReading: finalMeterReadingNum,
        electricityRate,
        cleaningDeductions,
        damageDeductions,
        noticePenalty,
        noticeGiven,
        remarks,
      });
    } catch (err) {
      console.error('Error generating move-out statement PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pastTenancy: TenancyRecord = {
      id: `tenancy_${Date.now()}`,
      tenantName: unit.tenantName,
      tenantPhone: unit.tenantPhone,
      monthlyRent: Math.round(unit.monthlyRent || 0),
      depositAmount: Math.round(securityDeposit),
      moveInDate: unit.moveInDate || 'Recorded prior',
      moveOutDate: moveOutDate,
      startingMeterReading: unit.previousMeterReading,
      finalMeterReading: finalMeterReadingNum,
      settlementAmount: Math.round(settlement.netAmount),
      isRefund: settlement.isRefund,
      cleaningDeduction: Math.round(cleaningDeductions),
      damageDeduction: Math.round(damageDeductions),
      noticeGiven,
      notes: remarks || (settlement.isRefund ? `Refunded ₹${Math.round(settlement.netAmount).toLocaleString('en-IN')}` : `Collected dues ₹${Math.round(settlement.netAmount).toLocaleString('en-IN')}`),
      moveOutReadingPhotoUrl: closingPhotoUrl,
    };

    const existingHistory = Array.isArray(unit.tenancyHistory) ? unit.tenancyHistory : [];
    const updatedHistory = [pastTenancy, ...existingHistory];

    const updatedUnit: Unit = {
      ...unit,
      occupancyStatus: 'vacant',
      tenantName: '',
      tenantPhone: '',
      depositAmount: undefined,
      moveInDate: undefined,
      previousMeterReading: finalMeterReadingNum,
      tenancyHistory: updatedHistory,
      notes: `Vacant as of ${formatDate(moveOutDate)}. Last tenant: ${pastTenancy.tenantName}`,
    };

    saveUnitToSupabase(updatedUnit);
    onConfirmSettlement(updatedUnit, pastTenancy);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div 
        id="move-out-settlement-dialog"
        className={`rounded-2xl border shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
          isDark 
            ? 'bg-neutral-900 text-neutral-100 border-neutral-800' 
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Move-Out Settlement & Reconciliation
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                {unit.name} • {unit.tenantName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleFinalSubmit} className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
          {/* 1. Timeline & Notice Card */}
          <div className={`border rounded-xl p-3 space-y-2.5 ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Actual Move-Out Date *
              </label>
              <div className={`h-9 flex items-center gap-2 px-3 rounded-lg border ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="date"
                  required
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Notice Given?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNoticeGiven(true)}
                  className={`h-9 px-3 rounded-lg border font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    noticeGiven
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-bold'
                      : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNoticeGiven(false)}
                  className={`h-9 px-3 rounded-lg border font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    !noticeGiven
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 font-bold'
                      : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Short / No Notice</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Closing Electricity Meter Card */}
          <div className={`border rounded-xl p-3 space-y-2.5 ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Closing Meter Reading
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold">
                ₹{electricityRate}/unit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Opening Dial
                </label>
                <div className={`relative h-9 px-3 rounded-lg border font-mono font-bold text-xs flex items-center ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <span>{unit.previousMeterReading}</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">units</span>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Closing Dial *
                </label>
                <div className={`relative h-9 rounded-lg border flex items-center transition-colors ${
                  isDark ? 'bg-zinc-900 border-zinc-800 focus-within:border-amber-500' : 'bg-white border-slate-200 focus-within:border-amber-500'
                }`}>
                  <input
                    type="number"
                    required
                    min={unit.previousMeterReading}
                    value={finalMeterReading === 0 ? '' : finalMeterReading}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFinalMeterReading(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full h-full pl-3 pr-11 font-mono font-bold text-xs bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-zinc-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">units</span>
                </div>
              </div>
            </div>

            <div className={`h-8 px-3 rounded-lg border flex items-center justify-between font-mono text-xs ${
              isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            }`}>
              <span className="text-zinc-400 text-[11px]">
                Power Used: <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{settlement.electricityUnitsUsed} units</strong>
              </span>
              <span className="text-amber-400 font-bold">
                Final Power Due: {formatCurrency(settlement.electricityCost)}
              </span>
            </div>

            {/* Meter Photo Picker */}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id="closing-meter-photo-input"
              />

              {closingPhotoUrl ? (
                <div className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <img 
                      src={closingPhotoUrl} 
                      alt="Closing Meter Proof" 
                      className="w-8 h-8 rounded-md object-cover border border-zinc-700 shrink-0" 
                    />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Photo Attached
                      </span>
                      <span className="text-[10px] text-zinc-500 block">Saved with checkout record</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="h-7 px-2 rounded-md border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isCompressingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className={`h-9 w-full px-3 rounded-lg border border-dashed font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isCompressingPhoto ? 'Compressing Photo...' : 'Attach Closing Meter Photo (Optional)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Deductions & Adjustments Card */}
          <div className={`border rounded-xl p-3 space-y-2.5 ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Deductions & Adjustments</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Security Deposit
                </label>
                <div className={`relative h-9 rounded-lg border flex items-center transition-colors ${
                  isDark ? 'bg-zinc-900 border-zinc-800 focus-within:border-emerald-500' : 'bg-white border-slate-200 focus-within:border-emerald-600'
                }`}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit === 0 ? '' : securityDeposit}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSecurityDeposit(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none text-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Unpaid Bills / Rent
                </label>
                <div className={`relative h-9 rounded-lg border flex items-center transition-colors ${
                  isDark ? 'bg-zinc-900 border-zinc-800 focus-within:border-rose-500' : 'bg-white border-slate-200 focus-within:border-rose-600'
                }`}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={unpaidDues === 0 ? '' : unpaidDues}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setUnpaidDues(e.target.value === '' ? 0 : Math.max(0, Math.round(Number(e.target.value))))}
                    className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none text-rose-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Cleaning & Damage Repairs
              </label>
              <div className={`relative h-9 rounded-lg border flex items-center transition-colors ${
                isDark ? 'bg-zinc-900 border-zinc-800 focus-within:border-rose-500' : 'bg-white border-slate-200 focus-within:border-rose-600'
              }`}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  value={(cleaningDeductions + damageDeductions) === 0 ? '' : (cleaningDeductions + damageDeductions)}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, Math.round(Number(e.target.value)));
                    setCleaningDeductions(val);
                    setDamageDeductions(0);
                  }}
                  className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none text-rose-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {!noticeGiven && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                  Notice Penalty Deduction (₹)
                </label>
                <div className={`relative h-9 rounded-lg border flex items-center transition-colors ${
                  isDark ? 'bg-zinc-900 border-rose-900/60 focus-within:border-rose-500' : 'bg-white border-rose-200 focus-within:border-rose-500'
                }`}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={noticePenalty === 0 ? '' : noticePenalty}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNoticePenalty(e.target.value === '' ? 0 : Math.max(0, Math.round(Number(e.target.value))))}
                    className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none text-rose-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Settlement Remarks
              </label>
              <div className={`h-9 px-3 rounded-lg border flex items-center ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
              }`}>
                <input
                  type="text"
                  placeholder="Deduction reason / handover remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full h-full text-xs bg-transparent focus:outline-none ${
                    isDark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 4. Settlement Summary Banner */}
          <div className={`p-3 rounded-xl border ${
            settlement.isRefund
              ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
              : isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                  settlement.isRefund ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {settlement.isRefund ? '🟢 Net Refund to Tenant' : '🔴 Net Dues from Tenant'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {settlement.isRefund ? 'Return this balance to tenant' : 'Collect remaining balance from tenant'}
                </span>
              </div>

              <div className={`text-lg font-extrabold font-mono tracking-tight ${
                settlement.isRefund ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                ₹{Math.round(settlement.netAmount).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* 5. Aligned Action Row */}
          <div className="space-y-2 pt-1">
            {/* Top Sub-Row: 2 Equal Export/Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Share Statement</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className={`h-9 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs ${
                  isDark 
                    ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200' 
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isGeneratingPdf ? 'Generating...' : 'PDF Statement'}</span>
              </button>
            </div>

            {/* Bottom Row: Full-width Primary Confirmation */}
            <button
              type="submit"
              className="w-full h-10 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Settlement & Vacate Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};