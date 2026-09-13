import React, { useState } from 'react';
import { Floor, Unit, Bill, LandlordSettings } from '../types';
import { UnitCard } from './UnitCard';
import { UnitCardSkeleton } from './UnitCardSkeleton';
import { Plus, Layers, Building2, Search } from 'lucide-react';
import { AppTheme } from '../App';
import { findActiveBillForUnit } from '../utils/billingCycle';

interface HomeScreenProps {
  floors: Floor[];
  units: Unit[];
  bills: Bill[];
  settings: LandlordSettings;
  selectedMonth: string;
  theme: AppTheme;
  isWizardSubmitting?: boolean;
  isSyncing?: boolean;
  onOpenAddFloor: () => void;
  onOpenAddUnit: (floorId?: string) => void;
  onGenerateBill: (unit: Unit) => void;
  onViewDetails: (unit: Unit) => void;
  onQuickWhatsApp: (bill: Bill) => void;
  onViewReceipt?: (bill: Bill) => void;
  onOpenBuildingWizard?: () => void;
  onRenameUnit?: (unitId: string, newName: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  floors,
  units,
  bills,
  settings,
  selectedMonth,
  theme,
  isWizardSubmitting = false,
  isSyncing = false,
  onOpenAddFloor,
  onOpenAddUnit,
  onGenerateBill,
  onViewDetails,
  onQuickWhatsApp,
  onViewReceipt,
  onOpenBuildingWizard,
  onRenameUnit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = theme === 'dark';
  const showWizardLoading = isWizardSubmitting || isSyncing;

  // Only map active rental units on Home screen (exclude archived and not_for_rent/busy rooms)
  const activeUnits = units.filter(
    (unit) => !unit.isArchived && unit.occupancyStatus !== 'not_for_rent'
  );

  // Filter active units by search
  const filteredUnits = activeUnits.filter((unit) => {
    return (
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit.tenantName && unit.tenantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (unit.tenantPhone && unit.tenantPhone.includes(searchQuery))
    );
  });

  const effectiveBillingStrategy = settings.billingStrategy || 'fixed_monthly';
  const effectiveCycleDay = Number(settings.billingCycleDay) || 1;

  return (
    <div id="home-screen-view" className="space-y-4">
      {/* Top Action & Search Bar - Only show when building/floors exist */}
      {floors.length > 0 && (
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-colors shadow-xs ${
          isDark 
            ? 'bg-zinc-900/70 border-zinc-800/80 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`} />
            <input
              id="input-search-units"
              type="text"
              placeholder="Search active flat, tenant, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-emerald-600/20'
              }`}
            />
          </div>

          {/* Action Buttons: Clean "+ Add Unit" and "+ Add Floor" */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-add-unit-primary"
              onClick={() => onOpenAddUnit()}
              className="flex-1 sm:flex-none h-9 py-0 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg text-xs shadow-xs shadow-emerald-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Unit</span>
            </button>

            <button
              id="btn-add-floor-secondary"
              onClick={onOpenAddFloor}
              className={`flex-1 sm:flex-none h-9 py-0 px-2.5 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Add Floor</span>
            </button>
          </div>
        </div>
      )}

      {/* Floors & Active Units Section */}
      {showWizardLoading ? (
        <div id="wizard-transition-skeletons" className="space-y-4 animate-in fade-in duration-300">
          <section className="space-y-2.5">
            {/* Animated Floor Header Bar */}
            <div className="flex items-center justify-between px-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`h-4 w-28 rounded-md animate-pulse ${isDark ? 'bg-zinc-800/90' : 'bg-slate-200'}`} />
                <div className={`h-4 w-16 rounded-full animate-pulse ${isDark ? 'bg-zinc-800/70' : 'bg-slate-200'}`} />
              </div>
              <div className={`h-4 w-20 rounded-md animate-pulse ${isDark ? 'bg-zinc-800/70' : 'bg-slate-200'}`} />
            </div>

            {/* 3 UnitCardSkeleton items */}
            <div className="space-y-2">
              <UnitCardSkeleton key="wizard-skel-1" theme={theme} id="wizard-unit-card-skeleton-1" />
              <UnitCardSkeleton key="wizard-skel-2" theme={theme} id="wizard-unit-card-skeleton-2" />
              <UnitCardSkeleton key="wizard-skel-3" theme={theme} id="wizard-unit-card-skeleton-3" />
            </div>
          </section>
        </div>
      ) : floors.length === 0 ? (
        <div className={`rounded-2xl border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl my-4 transition-all ${
          isDark 
            ? 'bg-zinc-900/80 border-zinc-800/80 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 stroke-[1.75]" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto text-center">
            <h3 className="text-xl font-semibold tracking-tight text-white">
              Set Up Your Building
            </h3>
            <p className="text-xs text-zinc-400 font-normal">
              Create your property to start managing floors and units
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-center gap-2.5 w-full max-w-xs mx-auto pt-1">
            {onOpenBuildingWizard && (
              <button
                id="btn-launch-setup-wizard"
                onClick={onOpenBuildingWizard}
                className="w-full h-10 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-500/15 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Launch Building Setup Wizard</span>
              </button>
            )}

            <button
              id="btn-add-floor-empty-state"
              onClick={onOpenAddFloor}
              className={`w-full h-10 px-4 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Or Add Single Floor Manually</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {floors.map((floor) => {
            const floorUnits = filteredUnits.filter((u) => u.floorId === floor.id);

            return (
              <section key={floor.id} className="space-y-2">
                {/* Floor Header */}
                <div className="flex items-center justify-between px-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <h3 className={`text-xs font-bold uppercase tracking-wider truncate min-w-0 ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}>
                      {floor.name}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border shrink-0 ${
                      isDark 
                        ? 'bg-zinc-800 text-zinc-400 border-zinc-700' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {floorUnits.length} {floorUnits.length === 1 ? 'room' : 'rooms'}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenAddUnit(floor.id)}
                    className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Room
                  </button>
                </div>

                {floorUnits.length === 0 ? (
                  <div className={`p-4 rounded-2xl border text-center ${
                    isDark ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <p className="text-xs font-medium">No active rental units on {floor.name}</p>
                    <button
                      onClick={() => onOpenAddUnit(floor.id)}
                      className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add a unit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {floorUnits.map((unit) => {
                      const unitBills = bills.filter(
                        (b) =>
                          b.unitId === unit.id &&
                          b.tenantName?.trim().toLowerCase() === unit.tenantName?.trim().toLowerCase()
                      );
                      const latestBill = unitBills[unitBills.length - 1];

                      // 1. Try utility function first
                      let activeBillForUnit = findActiveBillForUnit(
                        unit,
                        bills,
                        effectiveBillingStrategy,
                        effectiveCycleDay,
                        selectedMonth
                      );

                      // 2. Defensive fallback for anniversary billing:
                      // If utility returned undefined but a bill exists for this unit, use the latest unit bill
                      if (!activeBillForUnit && effectiveBillingStrategy === 'move_in_anniversary' && latestBill) {
                        activeBillForUnit = latestBill;
                      }

                      return (
                        <UnitCard
                          key={unit.id}
                          unit={unit}
                          floor={floor}
                          selectedMonthBill={activeBillForUnit}
                          latestBill={latestBill}
                          selectedMonth={selectedMonth}
                          theme={theme}
                          billingStrategy={effectiveBillingStrategy}
                          billingCycleDay={effectiveCycleDay}
                          onGenerateBill={onGenerateBill}
                          onViewDetails={onViewDetails}
                          onQuickWhatsApp={onQuickWhatsApp}
                          onViewReceipt={onViewReceipt}
                          onRenameUnit={onRenameUnit}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};