import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  Calendar, 
  Clock, 
  Zap, 
  FilePlus, 
  CheckCircle2, 
  Home, 
  AlertTriangle 
} from 'lucide-react';
import { Unit } from '../types';
import { DueSoonUnitInfo } from '../utils/billingCycle';

interface DueSoonNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueSoonUnits: DueSoonUnitInfo[];
  theme?: 'dark' | 'light';
  onSelectUnit?: (unit: Unit) => void;
  onGenerateBill?: (unit: Unit) => void;
}

export const DueSoonNotificationsModal: React.FC<DueSoonNotificationsModalProps> = ({
  isOpen,
  onClose,
  dueSoonUnits,
  theme = 'dark',
  onSelectUnit,
  onGenerateBill,
}) => {
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Modal / Slide-over sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className={`relative w-full max-w-lg rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10 ${
              isDark 
                ? 'bg-[#121214] border-neutral-800 text-neutral-100' 
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
              isDark ? 'border-neutral-800/80 bg-neutral-900/40' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  dueSoonUnits.length > 0
                    ? isDark 
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                    : isDark
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  <Bell className={`w-5 h-5 ${dueSoonUnits.length > 0 ? 'text-amber-400 animate-wiggle' : 'text-emerald-500'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold truncate">Due Soon Notifications</h2>
                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      dueSoonUnits.length > 0
                        ? isDark 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                        : isDark
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {dueSoonUnits.length} {dueSoonUnits.length === 1 ? 'Unit' : 'Units'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Individual cycles approaching renewal within 5 days
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-due-soon-modal"
                onClick={onClose}
                className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isDark 
                    ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800' 
                    : 'border-slate-200 text-slate-500 hover:text-black hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {dueSoonUnits.length === 0 ? (
                <div className={`p-8 rounded-2xl border text-center my-4 ${
                  isDark ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold">All cycles are up to date</p>
                  <p className={`text-xs mt-1 max-w-xs mx-auto ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                    No occupied units have individual cycle renewals due within the next 5 days.
                  </p>
                </div>
              ) : (
                dueSoonUnits.map((item) => {
                  const isUpcoming = item.daysRemaining > 0;
                  const isCycleEnded = item.daysRemaining === 0;
                  const isOverdue = item.daysRemaining < 0;

                  return (
                    <div
                      key={item.unit.id}
                      id={`due-soon-item-${item.unit.id}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDark 
                          ? 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800/80 hover:border-neutral-700' 
                          : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* 1. Header: Room Name, Tenant Name, Floor & Status Badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {item.roomName}
                            </span>
                            <span className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              • {item.tenantName}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                              isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {item.floorName}
                            </span>
                          </div>

                          {/* Renewal Date & Alert Pill */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
                              <span>Renewal: <strong className={isDark ? 'text-neutral-200' : 'text-slate-800'}>{item.cycleEndDateFormatted}</strong></span>
                            </div>

                            {/* Alert Pill: Due in X days */}
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isOverdue
                                ? isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                                : isCycleEnded
                                  ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                                  : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{item.dueAlertText}</span>
                            </span>
                          </div>
                        </div>

                        {/* Top-Right Status Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border ${
                          isOverdue
                            ? isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-rose-100 text-rose-800 border-rose-300'
                            : isCycleEnded
                              ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                              : isDark ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {item.statusBadge}
                        </span>
                      </div>

                      {/* 2. Detail Metrics: Rent & Dial */}
                      <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                        isDark ? 'border-neutral-800/80 text-neutral-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span>Rent: <strong className={isDark ? 'text-neutral-200' : 'text-slate-800'}>₹{item.monthlyRent.toLocaleString('en-IN')}/mo</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Last Dial: <strong className={isDark ? 'text-neutral-200' : 'text-slate-800'}>{item.previousReading}</strong></span>
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">
                          {item.activeCycleText}
                        </span>
                      </div>

                      {/* 3. Action Area */}
                      <div className="mt-3.5 pt-1 space-y-2">
                        {isUpcoming ? (
                          /* Upcoming / Reminder State: Bill is LOCKED until renewal date */
                          <>
                            <div 
                              id={`status-locked-${item.unit.id}`}
                              className={`w-full py-1.5 px-3 rounded-xl text-xs font-medium text-center border flex items-center justify-center gap-1.5 select-none ${
                                isDark 
                                  ? 'bg-neutral-800/40 border-neutral-800/80 text-neutral-400' 
                                  : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}
                            >
                              <span>⏳ Bill unlocks on {item.cycleEndDateFormatted}</span>
                            </div>

                            {onSelectUnit && (
                              <button
                                type="button"
                                id={`btn-view-unit-${item.unit.id}`}
                                onClick={() => {
                                  onSelectUnit(item.unit);
                                  onClose();
                                }}
                                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isDark
                                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                                }`}
                              >
                                <Home className="w-3.5 h-3.5" />
                                <span>View Unit in Dashboard</span>
                              </button>
                            )}
                          </>
                        ) : (
                          /* Cycle Ended or Overdue: Active Generate Bill CTA is UNLOCKED */
                          <div className="flex items-center gap-2">
                            {onSelectUnit && (
                              <button
                                type="button"
                                id={`btn-view-unit-${item.unit.id}`}
                                onClick={() => {
                                  onSelectUnit(item.unit);
                                  onClose();
                                }}
                                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                                  isDark
                                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                              >
                                <Home className="w-3.5 h-3.5" />
                                <span>View Unit</span>
                              </button>
                            )}

                            {onGenerateBill && (
                              <button
                                type="button"
                                id={`btn-generate-due-bill-${item.unit.id}`}
                                onClick={() => {
                                  onGenerateBill(item.unit);
                                  onClose();
                                }}
                                className="flex-1 py-2 px-3.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <FilePlus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Generate Bill →</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-neutral-800/80 bg-neutral-900/30 text-neutral-400' : 'border-slate-100 bg-slate-50 text-slate-500'
            }`}>
              <span className="truncate">Individual Move-In Anniversary Billing</span>
              <button
                type="button"
                id="btn-dismiss-due-soon-modal"
                onClick={onClose}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
