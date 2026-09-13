import React, { useState } from 'react';
import { Unit, Floor, OccupancyStatus, BillingCycleStrategy } from '../types';
import { X, Home, IndianRupee, Zap, User, Phone, Calendar, FileText } from 'lucide-react';
import { AppTheme } from '../App';
import { cleanPhoneDigits, isValidIndianPhone, getPhoneValidationError } from '../utils/validation';
import { getTenantAnniversaryDay, getOrdinalSuffix } from '../utils/billingCycle';
import { saveUnitToSupabase } from '../lib/supabase';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  floors: Floor[];
  defaultFloorId?: string;
  theme?: AppTheme;
  billingStrategy?: BillingCycleStrategy;
  billingCycleDay?: number;
  onAddUnit: (unit: Unit) => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen,
  onClose,
  floors,
  defaultFloorId,
  theme = 'dark',
  billingStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  onAddUnit,
}) => {
  const isDark = theme === 'dark';

  const [floorId, setFloorId] = useState(defaultFloorId || floors[0]?.id || 'floor-ground');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [monthlyRent, setMonthlyRent] = useState<string>('8000');
  const [depositAmount, setDepositAmount] = useState<number>(16000);
  const [isDepositManual, setIsDepositManual] = useState<boolean>(false);
  const [previousMeterReading, setPreviousMeterReading] = useState<string>('1000');
  const [meterNumber, setMeterNumber] = useState('');
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('occupied');
  const [moveInDate, setMoveInDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const isOccupied = occupancyStatus === 'occupied';
  const isNameValid = name.trim().length > 0;
  const isTenantNameValid = !isOccupied || tenantName.trim().length > 0;
  const isPhoneValid = !isOccupied || isValidIndianPhone(tenantPhone);
  const isFormValid = isNameValid && isTenantNameValid && isPhoneValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (isOccupied) {
      const err = getPhoneValidationError(tenantPhone, true);
      if (err) {
        setPhoneError(err);
        return;
      }
    }

    // Use standard crypto UUID for consistent database persistence
    const unitId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `unit-${Date.now()}`;

    const finalDeposit = isOccupied ? Number(depositAmount || 0) : 0;

    const newUnit: Unit = {
      id: unitId,
      floorId,
      name: name.trim(),
      tenantName: isOccupied ? (tenantName.trim() || 'Tenant') : '',
      tenantPhone: isOccupied ? cleanPhoneDigits(tenantPhone) : '',
      monthlyRent: Number(monthlyRent) || 0,
      occupancyStatus,
      previousMeterReading: Number(previousMeterReading) || 0,
      meterNumber: meterNumber.trim() || `EM-${Math.floor(10000 + Math.random() * 90000)}`,
      notes: notes.trim(),
      depositAmount: finalDeposit,
      deposit_amount: finalDeposit,
      moveInDate: isOccupied ? (moveInDate || new Date().toISOString().split('T')[0]) : undefined,
      tenancyHistory: [],
    };

    onAddUnit(newUnit);
    saveUnitToSupabase(newUnit).catch((err) => {
      console.warn('saveUnitToSupabase error in AddUnitModal:', err);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-unit-dialog"
        className={`rounded-2xl border shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
          isDark ? 'bg-[#18181b] text-zinc-100 border-zinc-800' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <Home className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight leading-tight">Add New Unit</h2>
          </div>

          <button
            id="btn-close-add-unit-modal"
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Floor & Unit Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="select-floor" className={`block text-[11px] font-semibold mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                Floor *
              </label>
              <select
                id="select-floor"
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
                className={`w-full p-2.5 rounded-xl font-medium text-xs sm:text-sm border focus:outline-none ${
                  isDark 
                    ? 'bg-[#09090b] border-zinc-800 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
              >
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="input-unit-name" className={`block text-[11px] font-semibold mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                Unit / Room Name *
              </label>
              <input
                id="input-unit-name"
                type="text"
                required
                placeholder="e.g. 101, Room 4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-2.5 rounded-xl font-medium text-xs sm:text-sm border focus:outline-none ${
                  isDark 
                    ? 'bg-[#09090b] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600'
                }`}
              />
            </div>
          </div>

          {/* Initial Status Toggle */}
          <div>
            <label className={`block text-[11px] font-semibold mb-1.5 ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Initial Status
            </label>
            <div className={`p-1 rounded-xl border grid grid-cols-2 gap-1 ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setOccupancyStatus('occupied')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  occupancyStatus === 'occupied'
                    ? isDark 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs' 
                      : 'bg-white text-emerald-700 border border-emerald-200 shadow-xs'
                    : isDark 
                      ? 'text-zinc-400 hover:text-zinc-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Occupied
              </button>
              <button
                type="button"
                onClick={() => setOccupancyStatus('vacant')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  occupancyStatus === 'vacant'
                    ? isDark 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs' 
                      : 'bg-white text-amber-700 border border-amber-200 shadow-xs'
                    : isDark 
                      ? 'text-zinc-400 hover:text-zinc-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vacant
              </button>
            </div>
          </div>

          {/* Tenant Details if Occupied */}
          {occupancyStatus === 'occupied' && (
            <div className={`p-3.5 rounded-xl border space-y-3 ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-tenant-name" className={`block text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Tenant Full Name *
                  </label>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                    <User className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                    <input
                      id="input-tenant-name"
                      type="text"
                      required={occupancyStatus === 'occupied'}
                      placeholder="e.g. Suresh Patel"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className={`w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none ${
                        isDark ? 'text-white placeholder:text-zinc-600' : 'text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-tenant-phone" className={`block text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Tenant Phone *
                  </label>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    phoneError
                      ? 'border-rose-500 bg-rose-500/5'
                      : isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-xs font-bold text-emerald-500 font-mono">+91</span>
                    <input
                      id="input-tenant-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9876543210"
                      value={cleanPhoneDigits(tenantPhone)}
                      onChange={(e) => {
                        const val = cleanPhoneDigits(e.target.value);
                        setTenantPhone(val);
                        if (phoneError) setPhoneError(null);
                      }}
                      className={`w-full text-xs sm:text-sm font-mono font-bold bg-transparent focus:outline-none ${
                        isDark ? 'text-white placeholder:text-zinc-600' : 'text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    <Phone className={`w-3.5 h-3.5 ${phoneError ? 'text-rose-500' : isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                  </div>
                  {phoneError && (
                    <span className="text-[10px] text-rose-500 block mt-1 font-medium">
                      {phoneError}
                    </span>
                  )}
                </div>
              </div>

              {/* Move-In Date & Security Deposit Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                <div>
                  <label htmlFor="input-move-in-date" className={`block text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Tenant Move-In Date *
                  </label>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <input
                      id="input-move-in-date"
                      type="date"
                      required={occupancyStatus === 'occupied'}
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className={`w-full text-xs sm:text-sm font-semibold bg-transparent focus:outline-none cursor-pointer ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-deposit-amount" className={`block text-[11px] font-semibold mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Security Deposit (₹)
                  </label>
                  <div className={`relative flex items-center rounded-xl border transition-colors ${
                    isDark ? 'bg-[#18181b] border-zinc-800 focus-within:border-emerald-500' : 'bg-white border-slate-200 focus-within:border-emerald-600'
                  }`}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 font-mono">₹</span>
                    <input
                      id="input-deposit-amount"
                      type="number"
                      min="0"
                      placeholder={String((Number(monthlyRent) || 0) * 2 || 16000)}
                      value={depositAmount === 0 ? '' : depositAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setIsDepositManual(true);
                        setDepositAmount(e.target.value === '' ? 0 : Number(e.target.value));
                      }}
                      className="w-full py-2 pl-7 pr-3 text-xs sm:text-sm font-mono font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Strategy Connection Note */}
              <div className="text-[10.5px] leading-relaxed">
                {billingStrategy === 'move_in_anniversary' ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <span>✨</span>
                    <span>
                      <strong>Individual Anniversary Cycle:</strong> Renews every {getTenantAnniversaryDay(moveInDate)}{getOrdinalSuffix(getTenantAnniversaryDay(moveInDate))} of the month with 30-day bill lock & due soon alerts.
                    </span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <span>✨</span>
                    <span>
                      <strong>Fixed Monthly Cycle (Day {billingCycleDay}):</strong> Mid-cycle move-in will receive automated pro-rata rent calculation.
                    </span>
                  </span>
                )}
              </div>

              {/* Agreement / ID Notes Input */}
              <div>
                <label htmlFor="input-agreement-notes" className={`block text-[11px] font-semibold mb-1 ${
                  isDark ? 'text-zinc-400' : 'text-slate-600'
                }`}>
                  Agreement / ID Notes (Optional)
                </label>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                  <input
                    id="input-agreement-notes"
                    type="text"
                    placeholder="e.g. Aadhaar verified, 11-month lease, ₹16,000 security received"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full text-xs font-medium bg-transparent focus:outline-none ${
                      isDark ? 'text-white placeholder:text-zinc-600' : 'text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Financial & Meter Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-monthly-rent" className={`block text-[11px] font-semibold mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                Monthly Rent (₹) *
              </label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <IndianRupee className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
                <input
                  id="input-monthly-rent"
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={monthlyRent === '0' || monthlyRent === 0 ? '' : monthlyRent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthlyRent(val);
                    if (!isDepositManual) {
                      const numRent = Number(val) || 0;
                      setDepositAmount(numRent * 2);
                    }
                  }}
                  className="w-full text-xs sm:text-sm font-bold bg-transparent focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-initial-meter" className={`block text-[11px] font-semibold mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}>
                Starting Meter Reading *
              </label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  id="input-initial-meter"
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={previousMeterReading === '0' || previousMeterReading === 0 ? '' : previousMeterReading}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPreviousMeterReading(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold bg-transparent focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Meter Serial ID Single Line */}
          <div>
            <label htmlFor="input-meter-number" className={`block text-[11px] font-semibold mb-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Meter Serial / ID (Optional)
            </label>
            <input
              id="input-meter-number"
              type="text"
              placeholder="e.g. EM-30491"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none ${
                isDark 
                  ? 'bg-[#09090b] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              id="btn-cancel-add-unit"
              onClick={onClose}
              className={`py-2.5 px-4 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${
                isDark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-add-unit"
              disabled={!isFormValid}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 min-h-[38px] ${
                isFormValid
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 active:scale-[0.99] cursor-pointer'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <span>Add Unit &rarr;</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};