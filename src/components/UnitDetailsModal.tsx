import React, { useState, useEffect } from 'react';
import { Unit, Floor, Bill, LandlordSettings, TenancyRecord, OccupancyStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { cleanPhoneDigits, getPhoneValidationError } from '../utils/validation';
import { getDaysStayed, getTenantIndividualCycleWindow, getOrdinalSuffix, findActiveBillForUnit, getIndividualCycleStatus } from '../utils/billingCycle';
import { MoveOutSettlementModal } from './MoveOutSettlementModal';
import { saveUnitToSupabase } from '../lib/supabase';
import { 
  X, 
  User, 
  Phone, 
  Zap, 
  Calendar, 
  Home, 
  FileText, 
  Edit3, 
  Check, 
  FilePlus, 
  History, 
  LogOut,
  UserPlus,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Camera,
  Trash2,
  Clock,
  MessageSquare
} from 'lucide-react';
import { AppTheme } from '../App';

interface UnitDetailsModalProps {
  unit: Unit | null;
  floor?: Floor;
  bills: Bill[];
  settings: LandlordSettings;
  theme?: AppTheme;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnit: (updatedUnit: Unit) => void;
  onGenerateBill: (unit: Unit) => void;
  onViewBillReceipt: (bill: Bill) => void;
}

export const UnitDetailsModal: React.FC<UnitDetailsModalProps> = ({
  unit,
  floor,
  bills,
  settings,
  theme = 'dark',
  isOpen,
  onClose,
  onUpdateUnit,
  onGenerateBill,
  onViewBillReceipt,
}) => {
  const isDark = theme === 'dark';

  // Modal Sub-views: 'view' | 'edit' | 'move_in'
  const [activeView, setActiveView] = useState<'view' | 'edit' | 'move_in'>('view');
  const [isMoveOutModalOpen, setIsMoveOutModalOpen] = useState(false);

  // Edit fields
  const [name, setName] = useState(unit?.name || '');
  const [tenantName, setTenantName] = useState(unit?.tenantName || '');
  const [tenantPhone, setTenantPhone] = useState(unit?.tenantPhone || '');
  const [monthlyRent, setMonthlyRent] = useState(unit?.monthlyRent || 0);
  const [previousMeterReading, setPreviousMeterReading] = useState(unit?.previousMeterReading || 0);
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>(unit?.occupancyStatus || 'occupied');
  const [meterNumber, setMeterNumber] = useState(unit?.meterNumber || '');
  const [notes, setNotes] = useState(unit?.notes || '');

  // Move-In Form fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newMoveInDate, setNewMoveInDate] = useState(todayStr);
  const [newMonthlyRent, setNewMonthlyRent] = useState<number>(unit?.monthlyRent || 8000);
  const [newDepositAmount, setNewDepositAmount] = useState<number>((unit?.monthlyRent || 8000) * 2);
  const [startingMeterReading, setStartingMeterReading] = useState<number>(unit?.previousMeterReading || 0);
  const [newTenantNotes, setNewTenantNotes] = useState('');

  // Expandable sections - collapsed by default if empty
  const [showTenancyHistory, setShowTenancyHistory] = useState(false);
  const [showPastInvoices, setShowPastInvoices] = useState(false);

  // Phone Validation Errors
  const [editPhoneError, setEditPhoneError] = useState<string | null>(null);
  const [moveInPhoneError, setMoveInPhoneError] = useState<string | null>(null);

  // Sync state whenever unit changes
  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setTenantName(unit.tenantName);
      setTenantPhone(unit.tenantPhone);
      setMonthlyRent(unit.monthlyRent);
      setPreviousMeterReading(unit.previousMeterReading);
      setOccupancyStatus(unit.occupancyStatus);
      setMeterNumber(unit.meterNumber || '');
      setNotes(unit.notes || '');
      setStartingMeterReading(unit.previousMeterReading);
      setNewMonthlyRent(unit.monthlyRent || 8000);
      setNewDepositAmount((unit.monthlyRent || 8000) * 2);
      setEditPhoneError(null);
      setMoveInPhoneError(null);
      setActiveView('view');
      setIsMoveOutModalOpen(false);
      setShowTenancyHistory(false);
      setShowPastInvoices(false);
    }
  }, [unit]);

  if (!isOpen || !unit) return null;

  const currentTenant = unit.tenantName?.trim().toLowerCase();

  const activeCycleBill = findActiveBillForUnit(
    unit,
    bills,
    settings.billingStrategy || 'fixed_monthly',
    settings.billingCycleDay || 1
  );

  // Ensure bill belongs exclusively to the current active tenant
  const currentTenantActiveBill =
    activeCycleBill &&
    activeCycleBill.tenantName &&
    activeCycleBill.tenantName.trim().toLowerCase() === currentTenant
      ? activeCycleBill
      : undefined;

  const unitBills = bills.filter((b) => b.unitId === unit.id);
  const tenancyHistory = unit.tenancyHistory || [];
  const daysStayed = getDaysStayed(unit.moveInDate);
  const individualCycle = unit.moveInDate ? getTenantIndividualCycleWindow(unit.moveInDate) : null;
  const isIndividualStrategy = (settings?.billingStrategy || 'fixed_monthly') === 'move_in_anniversary';
  const individualStatus = isIndividualStrategy && unit.moveInDate ? getIndividualCycleStatus(unit.moveInDate) : null;

  // Save General Edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (occupancyStatus === 'occupied') {
      const err = getPhoneValidationError(tenantPhone, true);
      if (err) {
        setEditPhoneError(err);
        return;
      }
    }
    const updated: Unit = {
      ...unit,
      name,
      tenantName: occupancyStatus === 'occupied' ? tenantName.trim() : '',
      tenantPhone: occupancyStatus === 'occupied' ? cleanPhoneDigits(tenantPhone) : '',
      monthlyRent: Number(monthlyRent) || 0,
      depositAmount: occupancyStatus === 'occupied' ? Number(unit.depositAmount ?? (unit as any).deposit_amount ?? 0) : 0,
      deposit_amount: occupancyStatus === 'occupied' ? Number(unit.depositAmount ?? (unit as any).deposit_amount ?? 0) : 0,
      previousMeterReading: Number(previousMeterReading) || 0,
      occupancyStatus,
      meterNumber,
      notes,
    };
    onUpdateUnit(updated);
    setActiveView('view');
    setEditPhoneError(null);
  };

  // Process Move-In
  const handleConfirmMoveIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      return;
    }

    const phoneErr = getPhoneValidationError(newTenantPhone, true);
    if (phoneErr) {
      setMoveInPhoneError(phoneErr);
      return;
    }

    const startReading = Number(startingMeterReading) >= 0 ? Number(startingMeterReading) : unit.previousMeterReading;

    const updated: Unit = {
      ...unit,
      occupancyStatus: 'occupied',
      tenantName: newTenantName.trim(),
      tenantPhone: cleanPhoneDigits(newTenantPhone),
      monthlyRent: Number(newMonthlyRent) || 0,
      depositAmount: Number(newDepositAmount || 0),
      deposit_amount: Number(newDepositAmount || 0),
      moveInDate: newMoveInDate,
      previousMeterReading: startReading,
      notes: newTenantNotes.trim() || undefined,
    };

    onUpdateUnit(updated);
    setActiveView('view');
    setMoveInPhoneError(null);
  };

  // Toggle Busy / Not for rent status
  const handleToggleNotForRent = () => {
    const isCurrentlyNotForRent = unit.occupancyStatus === 'not_for_rent';
    const nextStatus: OccupancyStatus = isCurrentlyNotForRent ? 'vacant' : 'not_for_rent';
    const updated: Unit = {
      ...unit,
      occupancyStatus: nextStatus,
    };
    onUpdateUnit(updated);
  };

  // Confirm settlement from MoveOutSettlementModal
  const handleConfirmSettlement = (updatedUnit: Unit) => {
    saveUnitToSupabase(updatedUnit);
    onUpdateUnit(updatedUnit);
    setIsMoveOutModalOpen(false);
    setActiveView('view');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <div 
          id="unit-details-dialog"
          className={`rounded-2xl border shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden transition-colors ${
            isDark ? 'bg-neutral-900/95 text-neutral-100 border-neutral-800/80 backdrop-blur-md' : 'bg-white text-slate-900 border-slate-200'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-5 flex items-center justify-between border-b shrink-0 ${
            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                unit.occupancyStatus === 'occupied'
                  ? isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : unit.occupancyStatus === 'vacant'
                    ? isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
                    : isDark ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}>
                <Home className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-bold tracking-tight whitespace-nowrap ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>{unit.name}</h2>
                {floor?.name && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${
                    isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {floor.name}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize whitespace-nowrap ${
                  unit.occupancyStatus === 'occupied'
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : unit.occupancyStatus === 'vacant'
                    ? isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {unit.occupancyStatus === 'not_for_rent' ? 'Not for Rent' : unit.occupancyStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeView === 'view' && (
                <button
                  id="btn-edit-unit-info"
                  onClick={() => setActiveView('edit')}
                  title="Edit Unit"
                  aria-label="Edit Unit"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
                    isDark 
                      ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700/60' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                id="btn-close-unit-details"
                onClick={onClose}
                title="Close"
                aria-label="Close"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
                  isDark ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white border-neutral-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* VIEW 1: MOVE-IN NEW TENANT WORKFLOW */}
            {activeView === 'move_in' && (
              <form onSubmit={handleConfirmMoveIn} className={`p-4 rounded-xl border space-y-4 ${
                isDark ? 'bg-neutral-950/50 border-neutral-800' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2.5 border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Move-In Tenant ({unit.name})
                    </h3>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Tenant Full Name *
                    </label>
                    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                      isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                    }`}>
                      <User className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ankit Gupta"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-1">
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Tenant Phone *
                    </label>
                    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                      moveInPhoneError 
                        ? 'border-rose-500 bg-rose-500/5'
                        : isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-xs font-bold text-emerald-500 font-mono">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        placeholder="9876543210"
                        value={cleanPhoneDigits(newTenantPhone)}
                        onChange={(e) => {
                          const val = cleanPhoneDigits(e.target.value);
                          setNewTenantPhone(val);
                          if (moveInPhoneError) setMoveInPhoneError(null);
                        }}
                        className="w-full text-xs font-mono font-bold bg-transparent focus:outline-none"
                      />
                      <Phone className={`w-3.5 h-3.5 ${moveInPhoneError ? 'text-rose-500' : isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                    </div>
                    {moveInPhoneError && (
                      <span className="text-[10px] text-rose-500 block mt-1 font-medium">
                        {moveInPhoneError}
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-1">
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Move-In Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newMoveInDate}
                      onChange={(e) => setNewMoveInDate(e.target.value)}
                      className={`w-full p-2 rounded-lg text-xs font-semibold border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Compact Financial & Meter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newMonthlyRent === 0 ? '' : newMonthlyRent}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewMonthlyRent(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full p-2 rounded-lg text-xs font-bold font-mono border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newDepositAmount === 0 ? '' : newDepositAmount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewDepositAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full p-2 rounded-lg text-xs font-bold font-mono border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Initial Meter Reading (units) *
                    </label>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                      isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                    }`}>
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <input
                        type="number"
                        required
                        min="0"
                        value={startingMeterReading === 0 ? '' : startingMeterReading}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setStartingMeterReading(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Agreement / ID Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar collected, 11-month agreement"
                    value={newTenantNotes}
                    onChange={(e) => setNewTenantNotes(e.target.value)}
                    className={`w-full p-2 rounded-lg text-xs border ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveView('view')}
                    className={`py-2.5 px-4 border rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    id="btn-confirm-move-in"
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
                  >
                    <span>Confirm Move-In &rarr;</span>
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 2: EDIT GENERAL DETAILS */}
            {activeView === 'edit' && (
              <form onSubmit={handleSaveEdit} className={`space-y-3.5 p-4 rounded-xl border ${
                isDark ? 'bg-neutral-950/50 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Edit Room & Tenancy Specs
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Room / Flat Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full p-2 rounded-lg text-xs sm:text-sm font-semibold border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Status
                    </label>
                    <select
                      value={occupancyStatus}
                      onChange={(e) => setOccupancyStatus(e.target.value as any)}
                      className={`w-full p-2 rounded-lg text-xs sm:text-sm font-semibold border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="occupied">Occupied</option>
                      <option value="vacant">Vacant</option>
                      <option value="not_for_rent">Not for Rent / Owner Occupied (Busy)</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                </div>

                {occupancyStatus === 'occupied' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Tenant Name
                      </label>
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className={`w-full p-2 rounded-lg text-xs sm:text-sm font-semibold border ${
                          isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Tenant Phone *
                      </label>
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                        editPhoneError
                          ? 'border-rose-500 bg-rose-500/5'
                          : isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                      }`}>
                        <span className="text-xs font-bold text-emerald-500 font-mono">+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9876543210"
                          value={cleanPhoneDigits(tenantPhone)}
                          onChange={(e) => {
                            const val = cleanPhoneDigits(e.target.value);
                            setTenantPhone(val);
                            if (editPhoneError) setEditPhoneError(null);
                          }}
                          className="w-full text-xs sm:text-sm font-mono font-bold bg-transparent focus:outline-none"
                        />
                        <Phone className={`w-3.5 h-3.5 ${editPhoneError ? 'text-rose-500' : isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                      </div>
                      {editPhoneError && (
                        <span className="text-[10px] text-rose-500 block mt-1 font-medium">
                          {editPhoneError}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Monthly Rent (₹)
                    </label>
                    <input
                      type="number"
                      value={monthlyRent === 0 ? '' : monthlyRent}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setMonthlyRent(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full p-2 rounded-lg text-xs sm:text-sm font-bold font-mono border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Current Meter Reading (units)
                    </label>
                    <input
                      type="number"
                      value={previousMeterReading === 0 ? '' : previousMeterReading}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPreviousMeterReading(e.target.value === '' ? 0 : Number(e.target.value))}
                      className={`w-full p-2 rounded-lg text-xs sm:text-sm font-bold font-mono border ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Notes / Preferences
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`w-full p-2 rounded-lg text-xs border ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('view')}
                    className={`flex-1 py-2 px-3 border rounded-lg text-xs font-semibold cursor-pointer ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: MAIN DASHBOARD VIEW (ACTIVE TENANT / VACANT ACTIONS) */}
            {activeView === 'view' && (
              <>
                {/* STATUS SPECIFIC BANNER & PRIMARY ACTIONS */}
                {unit.occupancyStatus === 'occupied' ? (
                  /* 1. OCCUPIED CARD */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tenant Info Card */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border shrink-0 ${
                            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {unit.tenantName.charAt(0) || 'T'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{unit.tenantName}</h4>
                            {unit.tenantPhone && unit.tenantPhone !== '--' ? (
                              <a 
                                href={`tel:${unit.tenantPhone}`}
                                className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Phone className="w-3 h-3" /> {unit.tenantPhone}
                              </a>
                            ) : (
                              <span className="text-[11px] text-neutral-500">No phone provided</span>
                            )}

                            {unit.moveInDate && (
                              <div className="space-y-1 mt-1">
                                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                                  <Clock className="w-3 h-3 text-neutral-500" />
                                  <span>{daysStayed} days stayed • since {formatDate(unit.moveInDate)}</span>
                                </div>
                                {settings.billingStrategy === 'move_in_anniversary' && individualCycle && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                      isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    }`}>
                                      <Calendar className="w-3 h-3 text-emerald-400" />
                                      <span>Cycle: {individualCycle.cycleText}</span>
                                    </span>
                                    <span className="text-[10px] text-emerald-500 font-medium">
                                      Renews on {getOrdinalSuffix(individualCycle.anniversaryDay)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {unit.notes && (
                          <p className={`text-xs p-2 rounded-lg border italic ${
                            isDark ? 'text-neutral-400 bg-neutral-900 border-neutral-800' : 'text-slate-600 bg-white border-slate-200'
                          }`}>
                            "{unit.notes}"
                          </p>
                        )}
                      </div>

                      {/* Move-Out Settlement Trigger */}
                      <div className="pt-3">
                        <button
                          id="btn-trigger-move-out"
                          onClick={() => setIsMoveOutModalOpen(true)}
                          className={`w-full py-1.5 px-3 border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            isDark 
                              ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/30' 
                              : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-rose-600 hover:border-rose-300'
                          }`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Move Out Tenant & Settlement</span>
                        </button>
                      </div>
                    </div>

                    {/* Financial Info & Generate Bill */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Rent</span>
                          <strong className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(unit.monthlyRent)}/mo</strong>
                        </div>
                        <div>
                          <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Deposit</span>
                          <strong className={`text-sm font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                            {formatCurrency(unit.depositAmount || unit.monthlyRent * 2)}
                          </strong>
                        </div>
                        <div className="col-span-2">
                          <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Last Meter</span>
                          <strong className="text-sm font-mono font-semibold text-amber-400">
                            {unit.previousMeterReading} units
                          </strong>
                        </div>
                      </div>

                      <div className="pt-3">
                        {currentTenantActiveBill ? (
                          <button
                            id="btn-unit-details-view-bill"
                            onClick={() => {
                              onClose();
                              onViewBillReceipt(currentTenantActiveBill);
                            }}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.99] cursor-pointer transition-all"
                          >
                            <FileText className="w-4 h-4" />
                            <span>View Invoice ({currentTenantActiveBill.status === 'paid' ? 'Paid' : 'Unpaid'})</span>
                          </button>
                        ) : isIndividualStrategy && individualStatus && individualStatus.daysRemaining > 0 ? (
                          <div
                            id="btn-unit-details-locked-bill"
                            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 select-none ${
                              isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                            <span>Bill unlocks on {individualStatus.renewalDateFormatted}</span>
                          </div>
                        ) : (
                          <button
                            id="btn-unit-details-generate-bill"
                            onClick={() => {
                              onClose();
                              onGenerateBill(unit);
                            }}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.99] cursor-pointer transition-all"
                          >
                            <FilePlus className="w-4 h-4 stroke-[2.5]" />
                            <span>Generate Bill →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : unit.occupancyStatus === 'vacant' ? (
                  /* 2. VACANT CARD */
                  <div className={`p-4 rounded-xl border ${
                    isDark ? 'bg-neutral-950/50 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-5 text-xs">
                        <div>
                          <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Rent</span>
                          <strong className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(unit.monthlyRent)}/mo</strong>
                        </div>
                        <div className={`h-7 w-px ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                        <div>
                          <span className={`block text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Last Meter Reading</span>
                          <strong className="text-sm font-mono font-semibold text-amber-400">{unit.previousMeterReading} units</strong>
                        </div>
                      </div>

                      <button
                        id="btn-trigger-move-in"
                        onClick={() => setActiveView('move_in')}
                        className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer shrink-0"
                      >
                        <UserPlus className="w-4 h-4 stroke-[2.5]" />
                        <span>+ Add Tenant</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 3. NOT FOR RENT (BUSY) CARD */
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-rose-950/20 border-rose-500/20' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                          Owner Occupied / Not for Rent
                        </h4>
                        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                          This room is hidden from active billing.
                        </p>
                      </div>

                      <button
                        onClick={handleToggleNotForRent}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs rounded-lg border border-neutral-700 cursor-pointer"
                      >
                        Make Active for Rent
                      </button>
                    </div>
                  </div>
                )}

                {/* TENANCY HISTORY (PREVIOUS TENANTS IN THIS PHYSICAL ROOM) */}
                <div className={`rounded-xl border p-3.5 space-y-3 ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div 
                    onClick={() => setShowTenancyHistory(!showTenancyHistory)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <History className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                      <h4 className={`text-xs font-semibold ${
                        isDark ? 'text-zinc-200' : 'text-slate-700'
                      }`}>
                        Tenancy History
                      </h4>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {tenancyHistory.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      {showTenancyHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {showTenancyHistory && (
                    <div>
                      {tenancyHistory.length === 0 ? (
                        <p className={`text-xs py-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          No past tenancies recorded
                        </p>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          {tenancyHistory.map((tenancy) => (
                            <div 
                              key={tenancy.id}
                              className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                                isDark 
                                  ? 'bg-zinc-950/70 border-zinc-800/80' 
                                  : 'bg-white border-slate-200 shadow-sm'
                              }`}
                            >
                              {/* Top row: Tenant name on left with phone in muted text, clean rent pill on right */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="truncate">
                                    <span className={`font-semibold text-xs sm:text-sm block truncate ${
                                      isDark ? 'text-zinc-100' : 'text-slate-900'
                                    }`}>
                                      {tenancy.tenantName}
                                    </span>
                                    {tenancy.tenantPhone && tenancy.tenantPhone !== '--' && (
                                      <span className={`text-[11px] font-mono block ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                        {tenancy.tenantPhone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                  isDark 
                                    ? 'bg-zinc-900 border-zinc-700/60 text-zinc-300 font-mono' 
                                    : 'bg-slate-100 border-slate-200 text-slate-700 font-mono'
                                }`}>
                                  ₹{Math.round(tenancy.monthlyRent || 0).toLocaleString('en-IN')}/mo
                                </span>
                              </div>

                              {/* Middle row: 2-column layout showing "Stay Period" and "Meter Units" */}
                              <div className={`grid grid-cols-2 gap-3 py-2 px-3 rounded-lg text-xs ${
                                isDark ? 'bg-zinc-900/50 border border-zinc-800/50' : 'bg-slate-50 border border-slate-100'
                              }`}>
                                <div>
                                  <span className={`text-[10px] block uppercase font-medium tracking-wider mb-0.5 ${
                                    isDark ? 'text-zinc-400' : 'text-slate-400'
                                  }`}>
                                    Stay Period
                                  </span>
                                  <span className={`font-medium block text-xs ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                                    {formatDate(tenancy.moveInDate)} – {tenancy.moveOutDate ? formatDate(tenancy.moveOutDate) : 'Vacated'}
                                  </span>
                                </div>
                                <div>
                                  <span className={`text-[10px] block uppercase font-medium tracking-wider mb-0.5 ${
                                    isDark ? 'text-zinc-400' : 'text-slate-400'
                                  }`}>
                                    Meter Units
                                  </span>
                                  <span className={`font-mono font-medium block text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                    {tenancy.startingMeterReading}u → {tenancy.finalMeterReading ?? tenancy.startingMeterReading}u
                                  </span>
                                </div>
                              </div>

                              {/* Bottom row: Settlement status pill with colored highlights */}
                              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                                {tenancy.settlementAmount !== undefined ? (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    tenancy.isRefund
                                      ? isDark 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isDark 
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' 
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                    <span>{tenancy.isRefund ? 'Refunded Deposit:' : 'Dues Settled:'}</span>
                                    <strong className="font-mono">₹{Math.round(tenancy.settlementAmount).toLocaleString('en-IN')}</strong>
                                  </span>
                                ) : (
                                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
                                    Settlement concluded
                                  </span>
                                )}

                                {tenancy.moveOutReadingPhotoUrl && (
                                  <span className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                    isDark ? 'text-emerald-400/90' : 'text-emerald-600'
                                  }`}>
                                    <Camera className="w-3 h-3" />
                                    <span>Meter photo archived</span>
                                  </span>
                                )}
                              </div>

                              {tenancy.notes && (
                                <p className={`text-[11px] pt-1 italic border-t ${
                                  isDark ? 'text-zinc-400 border-zinc-800/60' : 'text-slate-500 border-slate-100'
                                }`}>
                                  "{tenancy.notes}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* PAST INVOICES */}
                <div className={`rounded-xl border p-3.5 space-y-3 ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div 
                    onClick={() => setShowPastInvoices(!showPastInvoices)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                      <h4 className={`text-xs font-semibold ${
                        isDark ? 'text-zinc-200' : 'text-slate-700'
                      }`}>
                        Past Invoices
                      </h4>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {unitBills.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      {showPastInvoices ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {showPastInvoices && (
                    <div>
                      {unitBills.length === 0 ? (
                        <p className={`text-xs py-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          No bills generated yet
                        </p>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          {unitBills.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => onViewBillReceipt(b)}
                              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                                isDark 
                                  ? 'bg-zinc-950/70 border-zinc-800/80 hover:border-emerald-500/50 hover:bg-zinc-900/50' 
                                  : 'bg-white border-slate-200 hover:border-emerald-500/50 hover:shadow-sm'
                              }`}
                            >
                              {/* Left side: Billing cycle month, status badge, tenant name, secondary line */}
                              <div className="space-y-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className={`text-xs sm:text-sm font-bold tracking-tight ${
                                    isDark ? 'text-zinc-100' : 'text-slate-900'
                                  }`}>
                                    {b.billingMonth}
                                  </strong>
                                  <span
                                    className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                                      b.status === 'paid'
                                        ? isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                  {b.tenantName && (
                                    <span className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                      ({b.tenantName})
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  Rent: ₹{Math.round(b.baseRent).toLocaleString('en-IN')} • Power ({b.unitsConsumed}u): ₹{(b.unitsConsumed * b.electricityRate).toFixed(2)}
                                </p>
                              </div>

                              {/* Right side: Bold total amount formatted as whole rupees, and small emerald action */}
                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <span className={`text-sm sm:text-base font-extrabold font-mono tracking-tight ${
                                  isDark ? 'text-zinc-100' : 'text-slate-900'
                                }`}>
                                  ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-0.5 group-hover:text-emerald-300 transition-colors">
                                  <span>View Receipt</span>
                                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Move Out Settlement Modal */}
      {isMoveOutModalOpen && (
        <MoveOutSettlementModal
          unit={unit}
          floor={floor}
          bills={bills}
          settings={settings}
          theme={theme}
          isOpen={isMoveOutModalOpen}
          onClose={() => setIsMoveOutModalOpen(false)}
          onConfirmSettlement={handleConfirmSettlement}
        />
      )}
    </>
  );
};
