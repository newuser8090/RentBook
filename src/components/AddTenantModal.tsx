import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { AppTheme } from '../App';
import { X, UserPlus, IndianRupee, Zap, Phone, Calendar, CheckCircle2 } from 'lucide-react';
import { cleanPhoneDigits, getPhoneValidationError } from '../utils/validation';

export interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  theme?: AppTheme;
  onSave?: (updatedUnit: Unit) => void;
  onAddTenant?: (updatedUnit: Unit) => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  isOpen,
  onClose,
  unit,
  theme = 'dark',
  onSave,
  onAddTenant,
}) => {
  const isDark = theme === 'dark';

  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(() => unit?.monthlyRent ?? 0);
  const [depositAmount, setDepositAmount] = useState<number>(() => {
    if (!unit) return 0;
    return Number(unit.depositAmount ?? (unit as any).deposit_amount ?? unit.deposit ?? (unit.monthlyRent ? unit.monthlyRent * 2 : 0));
  });
  const [moveInDate, setMoveInDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startingMeterReading, setStartingMeterReading] = useState<number>(() => unit?.previousMeterReading ?? 0);
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (unit && isOpen) {
      setTenantName(unit.tenantName || '');
      setTenantPhone(unit.tenantPhone || '');
      setMonthlyRent(unit.monthlyRent || 0);
      const initialDeposit = Number(unit.depositAmount ?? (unit as any).deposit_amount ?? (unit.monthlyRent ? unit.monthlyRent * 2 : 0));
      setDepositAmount(initialDeposit);
      setMoveInDate(unit.moveInDate || new Date().toISOString().split('T')[0]);
      setStartingMeterReading(unit.previousMeterReading ?? 0);
      setNotes(unit.notes || '');
      setPhoneError(null);
    }
  }, [unit, isOpen]);

  if (!isOpen || !unit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) return;

    const phoneErr = getPhoneValidationError(tenantPhone, true);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    const updatedUnit: Unit = {
      ...unit,
      occupancyStatus: 'occupied',
      tenantName: tenantName.trim(),
      tenantPhone: cleanPhoneDigits(tenantPhone),
      monthlyRent: Number(monthlyRent || 0),
      depositAmount: Number(depositAmount || 0),
      deposit_amount: Number(depositAmount || 0),
      moveInDate: moveInDate || new Date().toISOString().split('T')[0],
      previousMeterReading: Number(startingMeterReading >= 0 ? startingMeterReading : (unit.previousMeterReading || 0)),
      notes: notes.trim() || undefined,
    };

    if (onSave) {
      onSave(updatedUnit);
    } else if (onAddTenant) {
      onAddTenant(updatedUnit);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-tenant-dialog"
        className={`rounded-2xl border shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
          isDark ? 'bg-neutral-900 text-neutral-100 border-neutral-800' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Add Tenant to {unit.name}
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                Enter tenant onboarding details and security deposit
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
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
              Tenant Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className={`w-full h-10 px-3 rounded-xl border font-medium ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Tenant Mobile Number *
              </label>
              <div className={`h-10 flex items-center gap-2 px-3 rounded-xl border ${
                phoneError ? 'border-rose-500' : isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  value={tenantPhone}
                  onChange={(e) => {
                    setTenantPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  className="w-full bg-transparent font-medium focus:outline-none"
                />
              </div>
              {phoneError && (
                <span className="text-[10px] text-rose-400 block mt-1 font-medium">{phoneError}</span>
              )}
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Move-In Date *
              </label>
              <div className={`h-10 flex items-center gap-2 px-3 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="date"
                  required
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full bg-transparent font-medium focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Monthly Rent (₹) *
              </label>
              <div className={`relative h-10 rounded-xl border flex items-center ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
              }`}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 font-mono">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={monthlyRent === 0 ? '' : monthlyRent}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMonthlyRent(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Security Deposit (₹)
              </label>
              <div className={`relative h-10 rounded-xl border flex items-center ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
              }`}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  value={depositAmount === 0 ? '' : depositAmount}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDepositAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full h-full pl-7 pr-3 font-mono font-bold text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Initial Meter Reading (units) *
              </label>
              <div className={`relative h-10 rounded-xl border flex items-center ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
              }`}>
                <input
                  type="number"
                  required
                  min="0"
                  value={startingMeterReading === 0 ? '' : startingMeterReading}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setStartingMeterReading(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full h-full pl-3 pr-11 font-mono font-bold text-xs bg-transparent focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">units</span>
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 1 month advance, lease till end of year"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full h-10 px-3 rounded-xl border font-medium ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`h-10 px-4 rounded-xl border font-semibold text-xs cursor-pointer ${
                isDark ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.99] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Onboard Tenant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
