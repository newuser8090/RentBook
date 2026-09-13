import React, { useState, useRef, useEffect } from 'react';
import { Unit, Floor, Bill, BillingCycleStrategy } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  Zap, 
  FilePlus, 
  MessageSquare, 
  SlidersHorizontal, 
  FileText, 
  UserPlus, 
  Clock, 
  Pencil, 
  Check, 
  X 
} from 'lucide-react';
import { AppTheme } from '../App';
import { 
  isAnniversaryBillUnlocked,
  getTenantIndividualCycleWindow,
  getIndividualCycleStatus,
  getActiveFixedCycleLabel
} from '../utils/billingCycle';

interface UnitCardProps {
  unit: Unit;
  floor?: Floor;
  selectedMonthBill?: Bill;
  latestBill?: Bill;
  selectedMonth: string;
  theme?: AppTheme;
  billingStrategy?: BillingCycleStrategy;
  billingCycleDay?: number;
  onGenerateBill: (unit: Unit) => void;
  onViewDetails: (unit: Unit) => void;
  onQuickWhatsApp?: (bill: Bill) => void;
  onViewReceipt?: (bill: Bill) => void;
  onRenameUnit?: (unitId: string, newName: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  selectedMonthBill,
  latestBill,
  theme = 'dark',
  billingStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  onGenerateBill,
  onViewDetails,
  onQuickWhatsApp,
  onViewReceipt,
  onRenameUnit,
}) => {
  const isDark = theme === 'dark';
  const isOccupied = unit.occupancyStatus === 'occupied';
  const isVacant = unit.occupancyStatus === 'vacant';
  const isNotForRent = unit.occupancyStatus === 'not_for_rent';

  const currentTenant = unit.tenantName?.trim().toLowerCase();
  const billMatchesTenant = (b?: Bill) =>
    Boolean(b && b.tenantName && b.tenantName.trim().toLowerCase() === currentTenant);

  const safeSelectedMonthBill = billMatchesTenant(selectedMonthBill) ? selectedMonthBill : undefined;
  const safeLatestBill = billMatchesTenant(latestBill) ? latestBill : undefined;
  const activeBill = safeSelectedMonthBill || safeLatestBill;

  // Inline Room Renaming State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(unit.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(unit.name);
  }, [unit.name]);

  const handleSaveName = () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== unit.name && onRenameUnit) {
      onRenameUnit(unit.id, trimmed);
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setEditedName(unit.name);
    setIsEditingName(false);
  };

  // Safe resolution of move-in date (supports camelCase and snake_case)
  const effectiveMoveInDate = unit.moveInDate || (unit as any).move_in_date;

  // Strategy & Cycle calculations
  const isIndividualStrategy = billingStrategy === 'move_in_anniversary';
  const individualStatus = isIndividualStrategy && effectiveMoveInDate ? getIndividualCycleStatus(effectiveMoveInDate) : null;
  const individualCycle = effectiveMoveInDate ? getTenantIndividualCycleWindow(effectiveMoveInDate) : null;

  // Resolved active cycle text:
  // 1. If an active bill already exists (e.g., "12 Sep – 11 Oct"), ALWAYS display its exact cycle text!
  // 2. Otherwise calculate individual anniversary cycle if available
  // 3. Otherwise fall back to fixed monthly cycle
  const cyclePillText = isOccupied
    ? activeBill?.billingMonth
      ? activeBill.billingMonth
      : isIndividualStrategy && individualCycle?.cycleText
        ? individualCycle.cycleText
        : getActiveFixedCycleLabel(billingCycleDay)
    : null;

  // Status-colored left border accent calculation
  const getLeftBorderAccent = () => {
    if (isNotForRent) {
      return 'border-l-2 border-l-rose-500';
    }
    if (isVacant) {
      return 'border-l-2 border-l-amber-500';
    }
    // Occupied with bill
    if (activeBill) {
      return activeBill.status === 'paid' 
        ? 'border-l-2 border-l-emerald-500' 
        : 'border-l-2 border-l-amber-500';
    }
    // Occupied without bill
    if (isIndividualStrategy && individualStatus) {
      if (individualStatus.daysRemaining < 0) {
        return 'border-l-2 border-l-rose-500';
      }
      if (individualStatus.daysRemaining === 0) {
        return 'border-l-2 border-l-amber-500';
      }
      return 'border-l-2 border-l-zinc-700';
    }
    return 'border-l-2 border-l-amber-500';
  };

  // Status Badge
  const renderStatusPill = () => {
    if (!isOccupied) {
      if (isVacant) {
        return (
          <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
            isDark 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Vacant
          </span>
        );
      }
      return (
        <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
          isDark 
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          Not for Rent
        </span>
      );
    }

    if (activeBill) {
      const isPaid = activeBill.status === 'paid';
      return (
        <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
          isPaid
            ? isDark 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : isDark 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      );
    }

    if (isIndividualStrategy && individualStatus) {
      if (individualStatus.daysRemaining > 0) {
        return (
          <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
            isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            Unlocks {individualStatus.renewalDateFormatted}
          </span>
        );
      } else if (individualStatus.daysRemaining === 0) {
        return (
          <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
            isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/35' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            Cycle Ended
          </span>
        );
      } else {
        return (
          <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
            isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            Overdue
          </span>
        );
      }
    }

    return (
      <span className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border ${
        isDark 
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        Unpaid
      </span>
    );
  };

  return (
    <div
      id={`unit-card-${unit.id}`}
      className={`rounded-2xl p-3.5 sm:p-4 transition-all shadow-xs space-y-2.5 ${getLeftBorderAccent()} ${
        isDark 
          ? 'bg-zinc-900/70 border border-zinc-800/70 hover:border-zinc-700/80 text-zinc-100' 
          : 'bg-white/90 border border-slate-200/80 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
      }`}
    >
      {/* 1. Top Bar Row */}
      <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelName();
                }}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md border w-full max-w-[140px] focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDark 
                    ? 'bg-zinc-950 border-zinc-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
                autoFocus
              />
              <button
                type="button"
                id={`btn-save-unit-name-${unit.id}`}
                onClick={handleSaveName}
                title="Save unit name"
                className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 flex-shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                id={`btn-cancel-unit-name-${unit.id}`}
                onClick={handleCancelName}
                title="Cancel"
                className={`p-1 rounded-md shrink-0 flex-shrink-0 cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold font-mono text-xs tracking-tight shrink-0 border ${
                isDark 
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <span>{unit.name}</span>
                <button
                  type="button"
                  id={`btn-edit-unit-name-${unit.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditedName(unit.name);
                    setIsEditingName(true);
                  }}
                  title="Rename Unit"
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>

              {isOccupied ? (
                <span 
                  title={unit.tenantName}
                  className={`truncate font-medium text-sm min-w-0 ${
                    isDark ? 'text-zinc-100' : 'text-slate-900'
                  }`}
                >
                  {unit.tenantName}
                </span>
              ) : isVacant ? (
                <span className={`truncate font-medium text-sm min-w-0 ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  Vacant Unit
                </span>
              ) : (
                <span className={`truncate font-medium text-sm min-w-0 ${
                  isDark ? 'text-rose-400' : 'text-rose-600'
                }`}>
                  Owner Occupied
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 shrink-0">
          {renderStatusPill()}
        </div>
      </div>

      {/* 2. Middle Metadata Strip */}
      <div className={`pt-2 pb-0.5 border-t grid grid-cols-3 gap-2 items-center text-xs min-w-0 overflow-hidden ${
        isDark ? 'border-zinc-800/70' : 'border-slate-100'
      }`}>
        <div className="min-w-0">
          <span className={`text-[11px] uppercase tracking-wider block truncate font-medium ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}>
            Rent
          </span>
          <span className={`text-xs font-mono font-semibold block truncate ${
            isDark ? 'text-zinc-200' : 'text-slate-800'
          }`}>
            {formatCurrency(unit.monthlyRent)}
          </span>
        </div>

        <div className="min-w-0">
          <span className={`text-[11px] uppercase tracking-wider block truncate font-medium ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}>
            Meter
          </span>
          <span className="text-xs font-mono font-semibold text-amber-400 inline-flex items-center gap-1 truncate max-w-full">
            <Zap className="w-3 h-3 text-amber-400/90 shrink-0" />
            <span className="truncate">{unit.previousMeterReading} u</span>
          </span>
        </div>

        <div className="min-w-0 text-right">
          <span className={`text-[11px] uppercase tracking-wider block truncate font-medium ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}>
            Cycle
          </span>
          {isOccupied && cyclePillText ? (
            <span 
              title={`Active Cycle: ${cyclePillText}`}
              className={`inline-block text-[10px] sm:text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded border truncate max-w-full ${
                isDark 
                  ? 'bg-zinc-800/90 border-zinc-700/80 text-zinc-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {cyclePillText}
            </span>
          ) : (
            <span className={`text-xs font-medium truncate block ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              {isVacant ? 'Ready' : 'N/A'}
            </span>
          )}
        </div>
      </div>

      {/* 3. Action Button Row */}
      <div className="pt-0.5 flex items-center justify-between gap-2 min-w-0">
        {isOccupied ? (
          <>
            {activeBill ? (
              <button
                type="button"
                id={`btn-view-bill-${unit.id}`}
                onClick={() => onViewReceipt ? onViewReceipt(activeBill) : onGenerateBill(unit)}
                className="flex-1 h-9 py-0 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-semibold shadow-xs shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 truncate"
              >
                <FileText className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span className="truncate">View Invoice</span>
              </button>
            ) : isIndividualStrategy && individualStatus && individualStatus.daysRemaining > 0 ? (
              <div
                id={`btn-locked-bill-${unit.id}`}
                title={`Bill unlocks on ${individualStatus.renewalDateFormatted}`}
                className={`flex-1 h-9 py-0 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 select-none min-w-0 truncate ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Unlocks {individualStatus.renewalDateFormatted}</span>
              </div>
            ) : (
              <button
                type="button"
                id={`btn-generate-bill-${unit.id}`}
                onClick={() => onGenerateBill(unit)}
                className="flex-1 h-9 py-0 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-semibold shadow-xs shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 truncate"
              >
                <FilePlus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span className="truncate">Generate Bill →</span>
              </button>
            )}

            <button
              type="button"
              id={`btn-view-details-${unit.id}`}
              onClick={() => onViewDetails(unit)}
              title="Manage Unit & Tenancy"
              aria-label="Manage Unit"
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isDark 
                  ? 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {activeBill && onQuickWhatsApp && (
              <button
                type="button"
                id={`btn-quick-whatsapp-${unit.id}`}
                onClick={() => onQuickWhatsApp(activeBill)}
                title="Send WhatsApp Invoice"
                aria-label="Send WhatsApp Invoice"
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isDark 
                    ? 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-emerald-400 hover:text-emerald-300' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              id={`btn-manage-vacant-${unit.id}`}
              onClick={() => onViewDetails(unit)}
              className="flex-1 h-9 py-0 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-semibold shadow-xs shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 truncate"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">{isVacant ? '+ Add Tenant' : 'Manage Unit'}</span>
            </button>

            <button
              type="button"
              id={`btn-view-details-${unit.id}`}
              onClick={() => onViewDetails(unit)}
              title="Manage Unit"
              aria-label="Manage Unit"
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isDark 
                  ? 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};