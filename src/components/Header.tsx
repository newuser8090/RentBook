import React from 'react';
import { Building, Calendar, Sun, Moon, BarChart3, ChevronDown, Zap, Bell } from 'lucide-react';
import { AppTheme } from '../App';
import { BillingCycleStrategy } from '../types';
import { getActiveFixedCycleLabel } from '../utils/billingCycle';

interface HeaderProps {
  currentMonth: string;
  propertyName: string;
  landlordName?: string;
  theme: AppTheme;
  isConfigured?: boolean;
  isDemoMode?: boolean;
  billingStrategy?: BillingCycleStrategy;
  billingCycleDay?: number;
  cyclesDueSoonCount?: number;
  onToggleTheme: () => void;
  onOpenAnalytics: () => void;
  onOpenMonthPicker?: () => void;
  onOpenDueSoonNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  propertyName,
  landlordName,
  theme,
  isConfigured = false,
  isDemoMode = false,
  billingStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  cyclesDueSoonCount = 0,
  onToggleTheme,
  onOpenAnalytics,
  onOpenMonthPicker,
  onOpenDueSoonNotifications,
}) => {
  const isDark = theme === 'dark';
  const isFixed = billingStrategy === 'fixed_monthly' || (billingStrategy as string) === 'fixed';
  const isIndividual = billingStrategy === 'move_in_anniversary' || (billingStrategy as string) === 'individual';

  // Compute dynamic active billing cycle using standard system date
  const activeCycleLabel = getActiveFixedCycleLabel(billingCycleDay);

  return (
    <header 
      id="rentbook-header" 
      className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-200 ${
        isDark 
          ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-100' 
          : 'bg-white/90 border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Top Brand & Profile Bar */}
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
        {/* Left: Analytics Trigger (Post-Setup Only) + App Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isConfigured && (
            <button
              id="btn-header-analytics-drawer"
              onClick={onOpenAnalytics}
              aria-label="Open Collection Analytics Drawer"
              title="Collection Analytics & Summary"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
                isDark 
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className={`text-sm sm:text-base font-semibold tracking-tight truncate max-w-[130px] sm:max-w-[180px] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {propertyName || 'Sharma Niwas'}
              </h1>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border hidden sm:inline-flex items-center gap-1 shrink-0 ${
                isDark 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                RentBook
              </span>
            </div>
            <p className={`text-[11px] font-medium truncate max-w-[130px] sm:max-w-[180px] ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              {landlordName ? `${landlordName}` : 'Property Ledger'}
            </p>
          </div>
        </div>

        {/* Right Actions: Cycle Indicator & Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Option B: Individual Anniversary Mode Bell - Render ONLY when setup is finished and >= 1 occupied room is approaching cycle */}
          {isConfigured && isIndividual && cyclesDueSoonCount > 0 && (
            <button
              type="button"
              id="header-notification-bell"
              onClick={onOpenDueSoonNotifications}
              title={`${cyclesDueSoonCount} unit(s) approaching cycle renewal (within 5 days). Click to view.`}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer select-none shrink-0 ${
                isDark
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 shadow-xs'
              }`}
            >
              <span className="text-xs shrink-0">🔔</span>
              <span className="truncate font-semibold">
                {cyclesDueSoonCount} Due Soon
              </span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-black leading-none shrink-0 shadow-xs">
                {cyclesDueSoonCount}
              </span>
            </button>
          )}

          {/* Option A: Fixed Monthly Date Active Cycle Pill - Render ONLY when setup is finished */}
          {isConfigured && isFixed && (
            <div
              id="header-cycle-pill"
              title={`Active Billing Cycle: ${activeCycleLabel}`}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold select-none shrink-0 ${
                isDark 
                  ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200' 
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-xs shrink-0">📅</span>
              <span className="truncate font-semibold tracking-tight whitespace-nowrap">
                {activeCycleLabel}
              </span>
            </div>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            id="btn-header-theme-toggle"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
              isDark 
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-black'
            }`}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>

      {/* Slim Demo Strip */}
      {isDemoMode && (
        <div className="h-6 w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-400 text-[11px] font-medium flex items-center justify-center tracking-wide select-none">
          ⚡ Demo Mode • Sandbox Data
        </div>
      )}
    </header>
  );
};
