import React, { useState, useMemo } from 'react';
import { Bill, Unit, LandlordSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  History as HistoryIcon, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Check,
  RotateCcw
} from 'lucide-react';
import { AppTheme } from '../App';

interface HistoryScreenProps {
  bills: Bill[];
  units?: Unit[];
  floorsCount?: number;
  settings: LandlordSettings;
  theme?: AppTheme;
  onUpdateStatus: (billId: string, status: 'paid' | 'pending', paymentMode?: any) => void;
  onViewReceipt: (bill: Bill) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  bills,
  units = [],
  floorsCount,
  theme = 'dark',
  onUpdateStatus,
  onViewReceipt,
}) => {
  const isDark = theme === 'dark';
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically filter invoices: only render invoices whose unitId currently exists in the active units list
  const activeUnitIds = useMemo(() => new Set(units.map((u) => u.id)), [units]);
  const activeBills = useMemo(() => {
    if (floorsCount !== undefined && floorsCount === 0) return [];
    if (units.length === 0) return [];
    return bills.filter((b) => activeUnitIds.has(b.unitId));
  }, [bills, units.length, activeUnitIds, floorsCount]);

  const filteredBills = activeBills
    .filter((b) => {
      const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
      const matchesSearch =
        b.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billingMonth.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());

  return (
    <div id="history-screen-view" className="space-y-4">
      {/* Top Filter & Search Card */}
      <div className={`p-3.5 sm:p-4 rounded-xl border shadow-xs space-y-3 transition-colors ${
        isDark 
          ? 'bg-zinc-900/70 border-zinc-800/80 text-zinc-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold tracking-tight">
              Invoice History
            </h2>
          </div>

          {/* Status Filter Tabs */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border self-start sm:self-auto ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              id="filter-bills-all"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? isDark ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({activeBills.length})
            </button>
            <button
              id="filter-bills-pending"
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'pending'
                  ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  : isDark ? 'text-zinc-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-700'
              }`}
            >
              Pending ({activeBills.filter((b) => b.status === 'pending').length})
            </button>
            <button
              id="filter-bills-paid"
              onClick={() => setFilterStatus('paid')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'paid'
                  ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isDark ? 'text-zinc-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              Paid ({activeBills.filter((b) => b.status === 'paid').length})
            </button>
          </div>
        </div>

        {/* Minimal Search Bar */}
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
          <input
            id="input-search-history"
            type="text"
            placeholder="Search by Unit, Tenant or Month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border transition-colors focus:outline-none ${
              isDark 
                ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600'
            }`}
          />
        </div>
      </div>

      {/* Ledger Bills List or Clean Empty States */}
      {activeBills.length === 0 ? (
        <div 
          id="empty-invoices-state"
          className={`rounded-xl border border-dashed p-8 text-center space-y-2 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <FileText className={`w-7 h-7 mx-auto ${isDark ? 'text-zinc-600' : 'text-slate-400'}`} />
          <h3 className="text-xs font-semibold">No Invoices Yet</h3>
          <p className={`text-[11px] max-w-sm mx-auto ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Invoices will appear here once generated for your units.
          </p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-8 text-center space-y-2 ${
          isDark ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <FileText className={`w-7 h-7 mx-auto ${isDark ? 'text-zinc-600' : 'text-slate-400'}`} />
          <h3 className="text-xs font-semibold">No Invoices Found</h3>
          <p className={`text-[11px] max-w-sm mx-auto ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Try changing your search keywords or filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const isPaid = bill.status === 'paid';

            return (
              <div
                key={bill.id}
                id={`history-bill-card-${bill.id}`}
                className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                  isDark 
                    ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100 hover:border-zinc-700/80 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* 1. Top Row: Unit pill + tenant name truncated on the left, status pill pinned right */}
                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono tracking-tight shrink-0 border ${
                      isDark 
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700' 
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {bill.unitName}
                    </span>
                    <span className={`text-sm font-semibold truncate min-w-0 ${
                      isDark ? 'text-zinc-100' : 'text-slate-900'
                    }`} title={bill.tenantName}>
                      {bill.tenantName}
                    </span>
                  </div>

                  {/* Status pill pinned right - never wraps */}
                  <span
                    className={`flex-shrink-0 shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap border inline-flex items-center gap-1 ${
                      isPaid
                        ? isDark 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isDark 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Paid</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>

                {/* 2. Middle Row: Display total bill amount alongside billing cycle dates in subtle text */}
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                  <span className={`text-base font-bold font-mono tracking-tight ${
                    isDark ? 'text-zinc-100' : 'text-slate-900'
                  }`}>
                    {formatCurrency(bill.totalAmount)}
                  </span>
                  <span className={`text-xs truncate ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>
                    {bill.billingMonth}
                  </span>
                </div>

                {/* 3. Bottom Row: Inline action buttons styled as compact buttons (h-8 text-xs font-medium) */}
                <div className={`flex items-center gap-2 pt-2 border-t min-w-0 ${
                  isDark ? 'border-zinc-800/70' : 'border-slate-100'
                }`}>
                  {isPaid ? (
                    <button
                      id={`btn-toggle-status-${bill.id}`}
                      type="button"
                      onClick={() => onUpdateStatus(bill.id, 'pending')}
                      title="Payment received. Click to undo and mark pending."
                      className={`group flex-1 h-8 py-0 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 truncate ${
                        isDark 
                          ? 'bg-emerald-500/10 hover:bg-zinc-800 border-emerald-500/25 hover:border-zinc-700 text-emerald-400 hover:text-amber-400' 
                          : 'bg-emerald-50 hover:bg-slate-100 border-emerald-200 hover:border-slate-300 text-emerald-700 hover:text-amber-700'
                      }`}
                    >
                      <Check className="w-3 h-3 text-emerald-500 group-hover:hidden shrink-0" />
                      <RotateCcw className="w-3 h-3 hidden group-hover:inline text-amber-500 shrink-0" />
                      <span className="group-hover:hidden truncate">Paid ✓</span>
                      <span className="hidden group-hover:inline truncate">Mark Pending</span>
                    </button>
                  ) : (
                    <button
                      id={`btn-toggle-status-${bill.id}`}
                      type="button"
                      onClick={() => onUpdateStatus(bill.id, 'paid', 'UPI')}
                      title="Click to mark invoice as paid"
                      className="flex-1 h-8 py-0 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer min-w-0 truncate"
                    >
                      <Check className="w-3 h-3 stroke-[2.5] shrink-0" />
                      <span className="truncate">Mark Paid</span>
                    </button>
                  )}

                  {/* Secondary CTA: Compact View Invoice Button */}
                  <button
                    id={`btn-view-receipt-${bill.id}`}
                    type="button"
                    onClick={() => onViewReceipt(bill)}
                    className={`h-8 py-0 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isDark 
                        ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>View Invoice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
