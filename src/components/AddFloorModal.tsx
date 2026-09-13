import React, { useState } from 'react';
import { Floor, Unit, BillingCycleStrategy } from '../types';
import { X, Layers, Check, Home, ShieldCheck } from 'lucide-react';
import { AppTheme } from '../App';

interface AddFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFloor: (floor: Floor, units?: Unit[]) => void;
  existingFloorCount: number;
  theme?: AppTheme;
  defaultMonthlyRent?: number;
  billingStrategy?: BillingCycleStrategy;
}

export const AddFloorModal: React.FC<AddFloorModalProps> = ({
  isOpen,
  onClose,
  onAddFloor,
  existingFloorCount,
  theme = 'dark',
  defaultMonthlyRent = 8000,
  billingStrategy = 'fixed_monthly',
}) => {
  const isDark = theme === 'dark';
  const defaultInitialFloorName = existingFloorCount === 0 ? 'Ground Floor' : `${existingFloorCount + 1}st Floor`;
  const [floorName, setFloorName] = useState(defaultInitialFloorName);
  const [numberOfUnits, setNumberOfUnits] = useState<number>(2);
  const [rentPerUnit, setRentPerUnit] = useState<number>(defaultMonthlyRent);

  if (!isOpen) return null;

  // Helper to preview and generate clean unit identifiers
  const generateUnitNames = (fName: string, count: number): string[] => {
    const names: string[] = [];
    const isGround = /ground|basement/i.test(fName);
    const match = fName.match(/\d+/);
    const floorNum = isGround ? 'G' : (match ? match[0] : `${existingFloorCount + 1}`);

    const safeCount = Math.min(20, Math.max(1, count));
    for (let i = 1; i <= safeCount; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      if (isGround) {
        names.push(`G-${pad}`);
      } else {
        names.push(`${floorNum}${pad}`);
      }
    }
    return names;
  };

  const previewUnitNames = generateUnitNames(floorName, numberOfUnits);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorName.trim()) return;

    // Use standard crypto UUID for consistent database persistence
    const floorId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `floor-${Date.now()}`;

    const newFloor: Floor = {
      id: floorId,
      name: floorName.trim(),
      order: existingFloorCount + 1,
    };

    const unitNames = generateUnitNames(floorName, numberOfUnits);
    const createdUnits: Unit[] = unitNames.map((uName, idx) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `unit-${Date.now()}-${idx}`,
      floorId: floorId,
      name: uName,
      tenantName: '',
      tenantPhone: '',
      monthlyRent: rentPerUnit > 0 ? rentPerUnit : 8000,
      occupancyStatus: 'vacant',
      previousMeterReading: 0,
      meterNumber: `MTR-${uName}`,
      depositAmount: 0,
      moveInDate: undefined,
      notes: '',
      tenancyHistory: [],
    }));

    onAddFloor(newFloor, createdUnits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-floor-dialog"
        className={`rounded-2xl border shadow-2xl max-w-md w-full overflow-hidden transition-colors my-auto ${
          isDark ? 'bg-[#18181b] text-zinc-100 border-zinc-800' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight leading-tight">Add Single Floor</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Step 2 of 2
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Define floor level and initial empty units
              </p>
            </div>
          </div>

          <button
            id="btn-close-floor-modal"
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Active Strategy Reminder */}
          <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              <strong>Active Strategy:</strong>{' '}
              {billingStrategy === 'move_in_anniversary' 
                ? 'Individual Move-In Anniversary (30-day tenant cycle)' 
                : 'Fixed Monthly Cycle (All units billed on monthly cycle day)'}
            </span>
          </div>

          {/* 1. Floor Name */}
          <div>
            <label htmlFor="input-floor-name" className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
              isDark ? 'text-zinc-300' : 'text-slate-700'
            }`}>
              Floor Name *
            </label>
            <input
              id="input-floor-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Ground Floor, 1st Floor, 2nd Floor"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              className={`w-full p-2.5 text-sm font-semibold rounded-xl border focus:outline-none transition-all ${
                isDark 
                  ? 'bg-[#09090b] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600'
              }`}
            />

            {/* Quick Suggestions */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className={`text-[11px] font-medium mr-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                Presets:
              </span>
              {['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Terrace'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFloorName(preset)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    floorName === preset
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : isDark 
                        ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Number of Units */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="input-number-of-units" className={`text-xs font-semibold uppercase tracking-wide ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}>
                Number of Units / Rooms *
              </label>
              <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Max 20 units
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="input-number-of-units"
                type="number"
                min="1"
                max="20"
                required
                value={numberOfUnits}
                onChange={(e) => setNumberOfUnits(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                className={`w-24 p-2.5 text-sm font-semibold rounded-xl border focus:outline-none transition-all ${
                  isDark 
                    ? 'bg-[#09090b] border-zinc-800 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
              />

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 flex-1">
                {[1, 2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumberOfUnits(num)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      numberOfUnits === num
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/30'
                        : isDark
                          ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Unit Names Live Preview */}
            <div className={`mt-2 p-2.5 rounded-xl border text-[11.5px] ${
              isDark ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1.5 mb-1 font-semibold text-emerald-400">
                <Home className="w-3.5 h-3.5" />
                <span>Vacant Units to Initialize ({previewUnitNames.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {previewUnitNames.map((name) => (
                  <span
                    key={name}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Default Rent */}
          <div>
            <label htmlFor="input-default-rent" className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
              isDark ? 'text-zinc-300' : 'text-slate-700'
            }`}>
              Default Monthly Rent per Unit (₹)
            </label>
            <input
              id="input-default-rent"
              type="number"
              min="0"
              step="500"
              value={rentPerUnit}
              onChange={(e) => setRentPerUnit(Number(e.target.value) || 0)}
              className={`w-full p-2.5 text-sm font-semibold rounded-xl border focus:outline-none transition-all ${
                isDark 
                  ? 'bg-[#09090b] border-zinc-800 text-white focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
              }`}
            />
          </div>

          {/* Modal Actions */}
          <div className={`flex gap-2.5 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              id="btn-cancel-add-floor"
              onClick={onClose}
              className={`flex-1 py-2.5 px-4 rounded-xl border font-semibold text-xs transition-colors cursor-pointer ${
                isDark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-add-floor"
              disabled={!floorName.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Floor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};