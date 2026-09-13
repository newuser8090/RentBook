import React, { useState, useRef, useEffect } from 'react';
import { BillingCycleStrategy } from '../types';
import { AppTheme } from '../App';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronDown,
  Check,
  ArrowRight
} from 'lucide-react';

interface BillingStrategySelectModalProps {
  isOpen: boolean;
  theme: AppTheme;
  initialStrategy?: BillingCycleStrategy;
  initialCycleDay?: number;
  onClose: () => void;
  onConfirmStrategy: (strategy: BillingCycleStrategy, cycleDay: number) => void;
}

export const BillingStrategySelectModal: React.FC<BillingStrategySelectModalProps> = ({
  isOpen,
  theme,
  initialStrategy = 'fixed_monthly',
  initialCycleDay = 1,
  onClose,
  onConfirmStrategy,
}) => {
  const isDark = theme === 'dark';

  const [strategy, setStrategy] = useState<BillingCycleStrategy>(initialStrategy);
  const [cycleDay, setCycleDay] = useState<number>(initialCycleDay);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDayDropdownOpen(false);
      }
    };
    if (isDayDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDayDropdownOpen]);

  if (!isOpen) return null;

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div 
        id="billing-strategy-modal"
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden my-auto flex flex-col ${
          isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Billing Cycle</h2>
            <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Select your property billing schedule
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Strategy Options */}
        <div className="p-4 space-y-3">
          {/* Option A: Fixed Monthly */}
          <div 
            onClick={() => setStrategy('fixed_monthly')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-3 ${
              strategy === 'fixed_monthly'
                ? isDark 
                  ? 'bg-emerald-950/20 border-emerald-500 shadow-sm' 
                  : 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                : isDark 
                  ? 'bg-[#09090b] border-zinc-800 hover:border-zinc-700' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  strategy === 'fixed_monthly'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">Fixed Monthly Date</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      Popular
                    </span>
                  </div>
                  <span className={`text-[11px] block ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    All tenants billed on the same day
                  </span>
                </div>
              </div>

              {strategy === 'fixed_monthly' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>

            {/* Inline Day Picker */}
            {strategy === 'fixed_monthly' && (
              <div 
                className={`pt-2.5 border-t space-y-2 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 5, 10, 15, 20].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCycleDay(d)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                        cycleDay === d
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {d}{getOrdinal(d)}
                    </button>
                  ))}
                </div>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDayDropdownOpen((prev) => !prev)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between cursor-pointer ${
                      isDark 
                        ? 'bg-[#09090b] border-zinc-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <span>Renews on: <strong>{cycleDay}{getOrdinal(cycleDay)}</strong> of every month</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isDayDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDayDropdownOpen && (
                    <div className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-40 overflow-y-auto rounded-lg border shadow-xl p-1 ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setCycleDay(d);
                            setIsDayDropdownOpen(false);
                          }}
                          className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer ${
                            cycleDay === d
                              ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                              : isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <span>{d}{getOrdinal(d)}</span>
                          {cycleDay === d && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Option B: Move-In Anniversary */}
          <div 
            onClick={() => setStrategy('move_in_anniversary')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              strategy === 'move_in_anniversary'
                ? isDark 
                  ? 'bg-emerald-950/20 border-emerald-500 shadow-sm' 
                  : 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                : isDark 
                  ? 'bg-[#09090b] border-zinc-800 hover:border-zinc-700' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  strategy === 'move_in_anniversary'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Move-In Anniversary</span>
                  <span className={`text-[11px] block ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Each tenant renews on their joining date
                  </span>
                </div>
              </div>

              {strategy === 'move_in_anniversary' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3.5 border-t ${isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <button
            type="button"
            onClick={() => onConfirmStrategy(strategy, cycleDay)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};