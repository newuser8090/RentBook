import React from 'react';
import { 
  X, 
  BarChart3, 
  Building, 
  TrendingUp
} from 'lucide-react';
import { Floor, Unit, Bill, BillingCycleStrategy } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AppTheme } from '../App';
import { getActiveFixedCycleLabel, getActiveBillingMonthName, findActiveBillForUnit } from '../utils/billingCycle';

interface AnalyticsDrawerProps {
  isOpen: boolean;
  floors: Floor[];
  units: Unit[];
  bills: Bill[];
  theme?: AppTheme;
  billingStrategy?: BillingCycleStrategy;
  billingCycleDay?: number;
  onClose: () => void;
}

export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen,
  floors,
  units,
  bills,
  theme = 'dark',
  billingStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  onClose,
}) => {
  const strategy: BillingCycleStrategy = (billingStrategy as BillingCycleStrategy) || 'fixed_monthly';
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  // Occupancy metrics
  const occupiedUnits = units.filter((u) => !u.isArchived && u.occupancyStatus === 'occupied');
  const vacantUnits = units.filter((u) => !u.isArchived && u.occupancyStatus === 'vacant');
  const notForRentUnits = units.filter((u) => !u.isArchived && u.occupancyStatus === 'not_for_rent');

  // Dynamic active cycle calculation
  const activeCycleLabel = getActiveFixedCycleLabel(billingCycleDay);
  const activeMonthName = getActiveBillingMonthName(billingCycleDay);

  // Match bills for current active cycle dynamically
  const activeCycleBillsMap = new Map<string, Bill>();

  // 1. From active occupied units for this cycle
  units.forEach((u) => {
    if (u.occupancyStatus === 'occupied') {
      const b = findActiveBillForUnit(
        u,
        bills,
        strategy,
        billingCycleDay
      );
      if (b) {
        activeCycleBillsMap.set(b.id, b);
      }
    }
  });

  // 2. Also check any bills explicitly matching the current active cycle label / month
  bills.forEach((b) => {
    if (!b.billingMonth) return;
    const bm = b.billingMonth.toLowerCase().trim();
    if (
      bm === activeCycleLabel.toLowerCase().trim() ||
      bm === activeMonthName.toLowerCase().trim()
    ) {
      activeCycleBillsMap.set(b.id, b);
    }
  });

  // Active invoices list for current cycle
  let activeInvoices = Array.from(activeCycleBillsMap.values());

  // Graceful fallback if no bills were generated yet in the current cycle:
  if (activeInvoices.length === 0 && bills.length > 0) {
    const monthFirstWord = activeMonthName.split(' ')[0].toLowerCase();
    const loose = bills.filter((b) => b.billingMonth && b.billingMonth.toLowerCase().includes(monthFirstWord));
    activeInvoices = loose.length > 0 ? loose : bills;
  }

  // Filter by paid and pending status
  const paidInvoices = activeInvoices.filter((b) => 
    b.status && b.status.toLowerCase() === 'paid'
  );
  const pendingInvoices = activeInvoices.filter((b) => 
    !b.status || b.status.toLowerCase() === 'pending' || b.status.toLowerCase() === 'unpaid'
  );

  // Dynamic Financial Calculations from Invoices state
  const collectedTotal = paidInvoices.reduce((sum, b) => {
    const amt = Number(b.totalAmount) || Number(b.baseRent) || 0;
    return sum + amt;
  }, 0);

  const pendingTotal = pendingInvoices.reduce((sum, b) => {
    const amt = Number(b.totalAmount) || Number(b.baseRent) || 0;
    return sum + amt;
  }, 0);

  // Expected: Total Collected + Total Pending
  const expectedTotal = collectedTotal + pendingTotal;

  // Collection Rate %: (Collected / Expected) * 100 (show 0% if Expected is 0)
  const collectionPercentage = expectedTotal > 0 
    ? Math.min(100, Math.round((collectedTotal / expectedTotal) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div 
        id="analytics-side-drawer"
        className={`w-full max-w-md h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 border-l transition-colors ${
          isDark 
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 1. Modal Header: Left (Icon, Title, Subtitle), Right (Close Button) */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b sticky top-0 z-10 ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Collection Analytics</h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Current cycle invoice reconciliation
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            id="btn-close-analytics-drawer"
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
              isDark 
                ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700/60' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* 2. Recovery Rate & Progress Bar Card */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className={`text-xs font-semibold ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}>
                  Collection Rate
                </span>
              </div>
              <span className={`text-base font-bold font-mono px-2.5 py-0.5 rounded-lg border ${
                collectionPercentage >= 100
                  ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : collectionPercentage > 0
                    ? isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                    : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}>
                {collectionPercentage}%
              </span>
            </div>

            {/* Thin Emerald Progress Bar */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-slate-200'
            }`}>
              <div
                className="h-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{paidInvoices.length} Paid Invoices</span>
              <span>{pendingInvoices.length} Pending</span>
            </div>
          </div>

          {/* 3. Unified Financial Metrics Grid (Expected, Collected, Pending) */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="grid grid-cols-3 gap-2 text-left">
              {/* Expected (Neutral) */}
              <div>
                <span className={`text-[10px] font-medium uppercase tracking-wider block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  Expected
                </span>
                <strong className={`text-sm sm:text-base font-bold font-mono block mt-0.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {formatCurrency(expectedTotal)}
                </strong>
                <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {activeInvoices.length} invoices
                </span>
              </div>

              {/* Collected (Emerald) */}
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider block text-emerald-600 dark:text-emerald-400">
                  Collected
                </span>
                <strong className="text-sm sm:text-base font-bold font-mono block mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(collectedTotal)}
                </strong>
                <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {paidInvoices.length} paid
                </span>
              </div>

              {/* Pending (Amber) */}
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider block text-amber-600 dark:text-amber-400">
                  Pending
                </span>
                <strong className="text-sm sm:text-base font-bold font-mono block mt-0.5 text-amber-600 dark:text-amber-400">
                  {formatCurrency(pendingTotal)}
                </strong>
                <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {pendingInvoices.length} unpaid
                </span>
              </div>
            </div>
          </div>

          {/* 4. Property Occupancy Block (Single row with clean stat pills) */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] uppercase font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Occupied</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-500 mt-0.5">{occupiedUnits.length} Units</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] uppercase font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Vacant</span>
              <span className={`text-xs sm:text-sm font-bold mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{vacantUnits.length} Units</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] uppercase font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Owner/Busy</span>
              <span className={`text-xs sm:text-sm font-bold mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{notForRentUnits.length} Units</span>
            </div>
          </div>

          {/* Floor-by-Floor Breakdown */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className={`text-xs font-semibold ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}>
                Floor Revenue Breakdown
              </span>
              <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                {floors.length} Floors
              </span>
            </div>

            <div className="space-y-1.5">
              {floors.map((floor) => {
                const floorUnits = units.filter((u) => u.floorId === floor.id);
                const floorUnitIds = new Set(floorUnits.map((u) => u.id));
                const floorInvoices = activeInvoices.filter((b) => floorUnitIds.has(b.unitId));
                const floorCollected = floorInvoices
                  .filter((b) => b.status?.toLowerCase() === 'paid')
                  .reduce((sum, b) => sum + (Number(b.totalAmount) || Number(b.baseRent) || 0), 0);
                const floorTotalRent = floorUnits.reduce((sum, u) => sum + (u.occupancyStatus === 'occupied' ? u.monthlyRent : 0), 0);

                return (
                  <div
                    key={floor.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                      <div>
                        <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{floor.name}</span>
                        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          {floorUnits.filter(u => u.occupancyStatus === 'occupied').length} occupied / {floorUnits.length} total
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className={`font-mono font-semibold block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(floorCollected)}
                      </strong>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        of {formatCurrency(floorTotalRent)} rent
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
