import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { AppTheme } from '../App';
import { BillingCycleStrategy } from '../types';
import { getFixedCycleLabel } from '../utils/billingCycle';

interface MonthPickerModalProps {
  isOpen: boolean;
  selectedMonth: string; // e.g. "August 2026"
  theme?: AppTheme;
  billingStrategy?: BillingCycleStrategy;
  billingCycleDay?: number;
  onClose: () => void;
  onSelectMonth: (monthYear: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  selectedMonth,
  theme = 'dark',
  billingStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  onClose,
  onSelectMonth,
}) => {
  const isDark = theme === 'dark';

  // Parse current selection
  const parts = (selectedMonth || '').split(' ');
  const currentMonthName = parts[0] || 'August';
  const initialYear = parseInt(parts[1] || '2026', 10) || 2026;

  const [year, setYear] = React.useState<number>(initialYear);

  if (!isOpen) return null;

  const activeCycleLabel = billingStrategy === 'fixed_monthly' 
    ? getFixedCycleLabel(selectedMonth, billingCycleDay)
    : selectedMonth;

  const handlePrevYear = () => setYear((y) => y - 1);
  const handleNextYear = () => setYear((y) => y + 1);

  const handleSelect = (monthName: string) => {
    const formatted = `${monthName} ${year}`;
    onSelectMonth(formatted);
    onClose();
  };

  const handleSetCurrentMonth = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
    onSelectMonth(formatted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="month-picker-dialog"
        className={`rounded-2xl border shadow-2xl max-w-sm w-full p-4 sm:p-5 flex flex-col gap-4 transition-all ${
          isDark 
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Select Billing Month</h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Filters rent and meter billing cycles
              </p>
            </div>
          </div>

          <button
            id="btn-close-month-picker"
            onClick={onClose}
            aria-label="Close"
            className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Year Navigator */}
        <div className={`flex items-center justify-between p-2 rounded-xl border ${
          isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={handlePrevYear}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Previous Year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-extrabold font-mono tracking-tight">
            {year}
          </span>

          <button
            onClick={handleNextYear}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Next Year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((m) => {
            const isSelected = currentMonthName === m && year === initialYear;
            return (
              <button
                key={m}
                onClick={() => handleSelect(m)}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-xs'
                    : isDark
                      ? 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                <span>{m.slice(0, 3)}</span>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>

        {/* Footer Quick Reset Button */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Active Cycle: <strong>{activeCycleLabel}</strong>
          </span>
          <button
            onClick={handleSetCurrentMonth}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
          >
            Reset to Current Month
          </button>
        </div>
      </div>
    </div>
  );
};
