import React, { useState, useEffect, useRef } from 'react';
import { Unit, Floor, Bill, LandlordSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  Zap, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  IndianRupee, 
  ArrowRight,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Clock,
  Sparkles
} from 'lucide-react';
import { AppTheme } from '../App';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  checkProratedFirstMonth, 
  getFixedCycleLabel, 
  getActiveFixedCycleLabel,
  getTenantIndividualCycleWindow 
} from '../utils/billingCycle';
import { getAppDate, getAppDateISO } from '../utils/appDate';

interface GenerateBillModalProps {
  unit: Unit | null;
  floor?: Floor;
  settings: LandlordSettings;
  theme?: AppTheme;
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (bill: Bill, updatedUnit: Unit) => void;
}

export const GenerateBillModal: React.FC<GenerateBillModalProps> = ({
  unit,
  floor,
  settings,
  theme = 'dark',
  isOpen,
  onClose,
  onSaveBill,
}) => {
  const isDark = theme === 'dark';

  const appD = getAppDate();
  const currentMonthName = appD.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const isIndividualStrategy = settings.billingStrategy === 'move_in_anniversary';

  // Calculate proration if applicable (strictly disabled for Individual Move-In Anniversary strategy)
  const prorationInfo = unit ? (isIndividualStrategy
    ? { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: unit.monthlyRent, fullRent: unit.monthlyRent }
    : checkProratedFirstMonth(
        unit.moveInDate,
        unit.monthlyRent,
        settings.billingStrategy || 'fixed_monthly',
        settings.billingCycleDay || 1
      )) : { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: 0, fullRent: 0 };

  // Compute default billing month/cycle label
  const initialBillingCycle = isIndividualStrategy && unit?.moveInDate
    ? (getTenantIndividualCycleWindow(unit.moveInDate).cycleText || currentMonthName)
    : (settings.billingCycleDay && settings.billingCycleDay > 1
        ? getActiveFixedCycleLabel(settings.billingCycleDay)
        : currentMonthName);

  const [billingMonth, setBillingMonth] = useState(initialBillingCycle);
  const [previousReading, setPreviousReading] = useState(unit?.previousMeterReading ?? 0);
  const [currentReadingInput, setCurrentReadingInput] = useState<string>('');
  const [electricityRate, setElectricityRate] = useState<number>(settings.defaultElectricityRate || 8);
  const [baseRent, setBaseRent] = useState<number>(
    unit ? ((!isIndividualStrategy && prorationInfo.isProrated) ? prorationInfo.proratedRent : unit.monthlyRent) : 0
  );
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [otherChargesNote, setOtherChargesNote] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | undefined>(undefined);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Parse numeric values
  const currentReadingNum = currentReadingInput === '' ? NaN : Number(currentReadingInput);
  const isValidReading = !isNaN(currentReadingNum) && currentReadingNum >= previousReading;
  
  // Real-time calculations
  const unitsConsumed = isValidReading ? currentReadingNum - previousReading : 0;
  const electricityAmount = isValidReading ? Math.round(unitsConsumed * electricityRate * 100) / 100 : 0;
  const totalAmount = Math.round(Math.max(0, (isValidReading ? baseRent + electricityAmount + otherCharges - discount : baseRent + otherCharges - discount)));

  // Sync state on unit/cycle changes
  useEffect(() => {
    if (unit) {
      setPreviousReading(unit.previousMeterReading);
      const computedProration = isIndividualStrategy
        ? { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: unit.monthlyRent, fullRent: unit.monthlyRent }
        : checkProratedFirstMonth(
            unit.moveInDate,
            unit.monthlyRent,
            settings.billingStrategy || 'fixed_monthly',
            settings.billingCycleDay || 1
          );
      const computedCycle = isIndividualStrategy && unit.moveInDate
        ? (getTenantIndividualCycleWindow(unit.moveInDate).cycleText || currentMonthName)
        : (settings.billingCycleDay && settings.billingCycleDay > 1
            ? getActiveFixedCycleLabel(settings.billingCycleDay)
            : currentMonthName);
      setBillingMonth(computedCycle);
      setBaseRent(!isIndividualStrategy && computedProration.isProrated ? computedProration.proratedRent : unit.monthlyRent);
      setCurrentReadingInput('');
      setOtherCharges(0);
      setOtherChargesNote('');
      setDiscount(0);
      setElectricityRate(settings.defaultElectricityRate || 8);
      setMeterPhotoUrl(undefined);
      setValidationError(null);
    }
  }, [unit, settings]);

  useEffect(() => {
    if (currentReadingInput !== '') {
      if (isNaN(currentReadingNum)) {
        setValidationError('Please enter a valid meter number.');
      } else if (currentReadingNum < previousReading) {
        setValidationError(
          `Current reading (${currentReadingNum}) cannot be lower than Previous reading (${previousReading}).`
        );
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError('Current meter reading is required.');
    }
  }, [currentReadingInput, previousReading, currentReadingNum]);

  if (!isOpen || !unit) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      const compressedDataUrl = await compressImageFile(file, 900, 900, 0.75);
      setMeterPhotoUrl(compressedDataUrl);
    } catch (err) {
      console.error('Photo compression error:', err);
      // Fallback to FileReader
      const reader = new FileReader();
      reader.onload = (event) => {
        setMeterPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setMeterPhotoUrl(undefined);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidReading) return;

    const dateStr = new Date().toISOString();
    const billNumber = `RB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${unit.name.replace(/\D/g, '') || Math.floor(100 + Math.random() * 900)}`;

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      billNumber,
      unitId: unit.id,
      unitName: unit.name,
      floorName: floor?.name || 'Main Floor',
      tenantName: unit.tenantName,
      tenantPhone: unit.tenantPhone,
      billingMonth,
      generatedDate: dateStr,
      baseRent,
      previousReading: Number(previousReading || 0),
      currentReading: Number(currentReadingNum || 0),
      previous_reading: Number(previousReading || 0),
      current_reading: Number(currentReadingNum || 0),
      unitsConsumed: Number(unitsConsumed || 0),
      electricityUnits: Number(unitsConsumed || 0),
      electricityRate,
      electricityAmount,
      otherCharges,
      otherChargesNote,
      discount,
      totalAmount,
      status: 'pending',
      upiId: settings.upiId,
      customQrCodeUrl: settings.customQrCodeUrl,
      meterPhotoUrl,
      isProrated: prorationInfo.isProrated,
      proratedDays: prorationInfo.proratedDays,
      proratedTotalDays: prorationInfo.totalDaysInMonth,
    };

    const updatedUnit: Unit = {
      ...unit,
      previousMeterReading: currentReadingNum,
    };

    onSaveBill(newBill, updatedUnit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="generate-bill-dialog"
        className={`rounded-2xl border shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
          isDark 
            ? 'bg-neutral-900/95 text-neutral-100 border-neutral-800/80 backdrop-blur-md' 
            : 'bg-white text-slate-900 border-slate-200 shadow-slate-300/40'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-3.5 sm:p-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <Calculator className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight leading-tight">
                Generate Invoice
              </h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {unit.name} • {unit.tenantName}
              </span>
            </div>
          </div>

          <button
            id="btn-close-generate-modal"
            onClick={onClose}
            aria-label="Close"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
          {/* Proration Banner Notice */}
          {prorationInfo.isProrated && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-200">
                  Prorated First Month Active
                </span>
                <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                  Tenant moved in mid-cycle ({prorationInfo.proratedDays} days remaining). Rent has been prorated to {formatCurrency(prorationInfo.proratedRent)} instead of full {formatCurrency(unit.monthlyRent)}.
                </p>
              </div>
            </div>
          )}

          {/* Billing Period & Base Rent */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl border ${
            isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <label htmlFor="billing-month-input" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                isDark ? 'text-neutral-400' : 'text-slate-500'
              }`}>
                Billing Month / Cycle
              </label>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <input
                  id="billing-month-input"
                  type="text"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="base-rent-input" className={`block text-[10px] font-semibold uppercase tracking-wide ${
                  isDark ? 'text-neutral-400' : 'text-slate-500'
                }`}>
                  House Rent (₹)
                </label>
                {prorationInfo.isProrated && (
                  <span className="text-[10px] text-amber-400 font-mono">Prorated</span>
                )}
              </div>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}>
                <IndianRupee className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-neutral-400' : 'text-slate-400'}`} />
                <input
                  id="base-rent-input"
                  type="number"
                  placeholder="0"
                  value={baseRent === 0 ? '' : baseRent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBaseRent(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-bold bg-transparent focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Electricity Meter Section */}
          <div className={`rounded-xl p-3 border space-y-3 ${
            isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Electricity Meter Reading</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-semibold ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Rate: ₹</span>
                <input
                  id="electricity-rate-input"
                  type="number"
                  step="any"
                  min="0"
                  value={electricityRate === 0 ? '' : electricityRate}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setElectricityRate(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  className={`w-16 px-1.5 py-0.5 rounded-lg border text-xs font-mono font-bold outline-none text-center ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-amber-400 focus:border-amber-500' 
                      : 'bg-white border-slate-200 text-amber-600 focus:border-amber-500'
                  }`}
                />
                <span className={`text-[10px] font-semibold ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>/unit</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Previous Reading (Read-only / Auto-populated) */}
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                  isDark ? 'text-neutral-400' : 'text-slate-500'
                }`}>
                  Previous Dial
                </label>
                <div className={`p-2 rounded-lg border font-mono font-bold text-sm sm:text-base flex items-center justify-between ${
                  isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <span>{previousReading}</span>
                  <span className={`text-xs font-normal ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>units</span>
                </div>
              </div>

              {/* Current Reading (User Input) */}
              <div>
                <label htmlFor="current-reading-input" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                  isDark ? 'text-neutral-400' : 'text-slate-500'
                }`}>
                  Current Dial *
                </label>
                <div className="relative">
                  <input
                    id="current-reading-input"
                    type="number"
                    min={previousReading}
                    step="1"
                    placeholder={`e.g. ${previousReading + 50}`}
                    value={currentReadingInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCurrentReadingInput(e.target.value)}
                    autoFocus
                    className={`w-full p-2 pr-12 text-sm sm:text-base font-mono font-bold rounded-lg border transition-all focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      validationError && currentReadingInput !== ''
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                        : isDark
                          ? 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                          : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                  <span className={`absolute right-2.5 top-2.5 text-xs font-semibold ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>units</span>
                </div>
              </div>
            </div>

            {/* Validation Message */}
            {validationError && (
              <div 
                id="meter-validation-error"
                className="flex items-start gap-2 bg-rose-500/10 text-rose-600 dark:text-rose-300 p-2.5 rounded-lg border border-rose-500/20 text-xs font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p>{validationError}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    Make sure current meter dial is equal to or higher than previous ({previousReading}).
                  </p>
                </div>
              </div>
            )}

            {/* Real-time Math Display: Units Used | Unit Rate | Power Charge */}
            {isValidReading && (
              <div className={`p-2 rounded-lg border grid grid-cols-3 gap-1.5 text-center text-xs ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`p-1.5 rounded-md border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[9px] block ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Units Used</span>
                  <strong className="text-xs sm:text-sm font-extrabold font-mono">
                    {unitsConsumed} u
                  </strong>
                </div>

                <div className={`p-1.5 rounded-md border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[9px] block ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Unit Rate</span>
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-xs font-mono font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={electricityRate === 0 ? '' : electricityRate}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setElectricityRate(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      className="w-14 text-center text-xs sm:text-sm font-extrabold font-mono bg-transparent outline-none focus:text-amber-400"
                    />
                  </div>
                </div>

                <div className={`p-1.5 rounded-md border ${
                  isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <span className="text-emerald-500 text-[9px] block font-semibold">Power Charge</span>
                  <strong className="text-xs sm:text-sm font-extrabold text-emerald-400 font-mono">
                    {formatCurrency(electricityAmount)}
                  </strong>
                </div>
              </div>
            )}

            {/* Verified Meter Photo Upload with compression */}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id="meter-photo-input"
              />

              {meterPhotoUrl ? (
                <div className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 ${
                  isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <img 
                      src={meterPhotoUrl} 
                      alt="Meter Reading Proof" 
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-700 shadow-xs" 
                    />
                    <div>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Photo Attached
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Auto-compressed (&lt;120KB) & saved with invoice
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                    title="Remove Photo"
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
                  className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-emerald-500' 
                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:border-emerald-600'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{isCompressingPhoto ? 'Compressing Photo...' : 'Attach Verified Meter Photo (Optional)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Other Charges & Discount */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl border ${
            isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <label htmlFor="other-charges-input" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                isDark ? 'text-neutral-400' : 'text-slate-500'
              }`}>
                Other Charges (₹)
              </label>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border mb-1 ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-slate-400'}`}>₹</span>
                <input
                  id="other-charges-input"
                  type="number"
                  min="0"
                  value={otherCharges === 0 ? '' : otherCharges}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setOtherCharges(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-xs font-bold bg-transparent focus:outline-none font-mono"
                />
              </div>
              <input
                type="text"
                value={otherChargesNote}
                onChange={(e) => setOtherChargesNote(e.target.value)}
                placeholder="Reason (e.g. Maintenance)"
                className={`w-full text-[11px] px-2 py-1 rounded-lg border focus:outline-none ${
                  isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300 placeholder:text-neutral-600' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>

            <div>
              <label htmlFor="discount-input" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                isDark ? 'text-neutral-400' : 'text-slate-500'
              }`}>
                Discount / Adjustment (₹)
              </label>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border mb-1 ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
              }`}>
                <span className={`text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-slate-400'}`}>-₹</span>
                <input
                  id="discount-input"
                  type="number"
                  min="0"
                  value={discount === 0 ? '' : discount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDiscount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-xs font-bold bg-transparent focus:outline-none font-mono"
                />
              </div>
              <p className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Deducted from total amount</p>
            </div>
          </div>

          {/* Grand Total Summary Box */}
          <div 
            id="bill-calculation-summary"
            className={`rounded-xl p-3 border space-y-2 ${
              isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between text-[10px] border-b pb-1.5 ${
              isDark ? 'text-neutral-400 border-neutral-800' : 'text-slate-500 border-slate-200'
            }`}>
              <span className="font-semibold uppercase tracking-wider">Calculation Summary</span>
              <span className="font-mono text-emerald-400">UPI: {settings.upiId}</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-neutral-400' : 'text-slate-500'}>
                  1. Base Rent {prorationInfo.isProrated ? `(Prorated ${prorationInfo.proratedDays} days)` : ''}:
                </span>
                <span className="font-mono font-bold">{formatCurrency(baseRent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-neutral-400' : 'text-slate-500'}>
                  2. Electricity ({isValidReading ? unitsConsumed : 0} units @ ₹{Number(electricityRate).toFixed(2)}):
                </span>
                <span className="font-mono font-bold text-amber-400">{formatCurrency(electricityAmount)}</span>
              </div>
              {otherCharges > 0 && (
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-neutral-400' : 'text-slate-500'}>3. Other ({otherChargesNote || 'Misc'}):</span>
                  <span className="font-mono font-bold">{formatCurrency(otherCharges)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-rose-500">
                  <span>4. Discount:</span>
                  <span className="font-mono font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}
            </div>

            <div className={`border-t pt-2 flex items-center justify-between ${
              isDark ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block">
                  Total Payable
                </span>
                <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Due for {billingMonth}</span>
              </div>
              <div className="text-xl font-extrabold font-mono tracking-tight text-emerald-400">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              id="btn-cancel-bill"
              onClick={onClose}
              className={`py-2.5 px-4 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${
                isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-save-generate-bill"
              disabled={!isValidReading}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                isValidReading
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 active:scale-[0.99]'
                  : isDark ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <span>Generate Bill →</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
