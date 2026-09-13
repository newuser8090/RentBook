import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Floor, Unit, LandlordSettings, BillingCycleStrategy } from '../types';
import { AppTheme } from '../App';
import { compressQrImageFile } from '../utils/imageCompressor';
import { 
  Building2, 
  Layers, 
  Zap, 
  X, 
  DoorOpen, 
  Upload, 
  Trash2,
  ArrowRight,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface BuildingSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  settings: LandlordSettings;
  onSaveSetup: (
    newFloors: Floor[], 
    newUnits: Unit[], 
    updatedSettings: Partial<LandlordSettings>
  ) => void;
}

export const BuildingSetupWizardModal: React.FC<BuildingSetupWizardModalProps> = ({
  isOpen,
  onClose,
  theme,
  settings,
  onSaveSetup,
}) => {
  const isDark = theme === 'dark';
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Form State - prefill from settings to avoid duplicate entry
  const [propertyName, setPropertyName] = useState(settings.propertyName || '');
  const [propertyAddress, setPropertyAddress] = useState(settings.propertyAddress || '');
  
  // Floor configuration
  const [numFloors, setNumFloors] = useState<number>(3);
  const [includeGroundFloor, setIncludeGroundFloor] = useState<boolean>(true);
  
  // Units per floor choice: 0 = manual later, 1, 2, 3, 4
  const [unitsMode, setUnitsMode] = useState<number>(2);

  // Billing Cycle Strategy Configuration
  const [billingStrategy, setBillingStrategy] = useState<BillingCycleStrategy>(
    settings.billingStrategy || 'fixed_monthly'
  );
  const [billingCycleDay, setBillingCycleDay] = useState<number>(
    settings.billingCycleDay || 1
  );
  
  // Default billing rates
  const [defaultRent, setDefaultRent] = useState<number>(8500);
  const [electricityRate, setElectricityRate] = useState<number>(settings.defaultElectricityRate || 8.5);
  
  // Payment UPI & QR Code
  const [upiId, setUpiId] = useState(settings.upiId || '');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(settings.customQrCodeUrl || '');

  // Keep state synced if external settings are hydrated or updated
  useEffect(() => {
    if (settings.propertyName) setPropertyName(settings.propertyName);
    if (settings.propertyAddress) setPropertyAddress(settings.propertyAddress);
    if (settings.billingStrategy) setBillingStrategy(settings.billingStrategy);
    if (settings.billingCycleDay) setBillingCycleDay(settings.billingCycleDay);
    if (settings.defaultElectricityRate) setElectricityRate(settings.defaultElectricityRate);
    if (settings.upiId) setUpiId(settings.upiId);
    if (settings.customQrCodeUrl) setQrCodeUrl(settings.customQrCodeUrl);
  }, [settings]);

  // Calculate Floor Names
  const previewFloors = useMemo(() => {
    const list: { order: number; name: string; prefix: string }[] = [];
    for (let i = 0; i < numFloors; i++) {
      if (includeGroundFloor) {
        if (i === 0) {
          list.push({ order: 1, name: 'Ground Floor (G)', prefix: 'G' });
        } else if (i === 1) {
          list.push({ order: i + 1, name: '1st Floor', prefix: '1' });
        } else if (i === 2) {
          list.push({ order: i + 1, name: '2nd Floor', prefix: '2' });
        } else if (i === 3) {
          list.push({ order: i + 1, name: '3rd Floor', prefix: '3' });
        } else {
          list.push({ order: i + 1, name: `${i}th Floor`, prefix: `${i}` });
        }
      } else {
        if (i === 0) {
          list.push({ order: 1, name: '1st Floor', prefix: '1' });
        } else if (i === 1) {
          list.push({ order: 2, name: '2nd Floor', prefix: '2' });
        } else if (i === 2) {
          list.push({ order: 3, name: '3rd Floor', prefix: '3' });
        } else {
          list.push({ order: i + 1, name: `${i + 1}th Floor`, prefix: `${i + 1}` });
        }
      }
    }
    return list;
  }, [numFloors, includeGroundFloor]);

  if (!isOpen) return null;

  // Handle QR image file upload with off-screen canvas compression to under 30KB
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressQrImageFile(file);
      setQrCodeUrl(compressed);
    } catch (err) {
      console.error('Failed to process QR image:', err);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyName.trim()) return;

    const generatedFloors: Floor[] = [];
    const generatedUnits: Unit[] = [];

    // 1. Generate Floors with standard UUIDs
    previewFloors.forEach((pf, idx) => {
      const floorId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `floor-${Date.now()}-${idx}`;

      generatedFloors.push({
        id: floorId,
        propertyId: settings.propertyId,
        name: pf.name,
        order: pf.order,
      });

      // 2. Generate Units if not skipped
      if (unitsMode > 0) {
        for (let u = 0; u < unitsMode; u++) {
          const unitNumber = pf.prefix === 'G' 
            ? `G-0${u + 1}` 
            : `${pf.prefix}0${u + 1}`;
          
          const unitId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `unit-${Date.now()}-${idx}-${u}`;

          generatedUnits.push({
            id: unitId,
            floorId: floorId,
            name: `Flat ${unitNumber}`,
            tenantName: '',
            tenantPhone: '',
            monthlyRent: defaultRent,
            occupancyStatus: 'vacant',
            previousMeterReading: 0,
            meterNumber: `MTR-${unitNumber}`,
            depositAmount: 0,
            moveInDate: undefined,
            notes: '',
            tenancyHistory: [],
          });
        }
      }
    });

    onSaveSetup(generatedFloors, generatedUnits, {
      propertyName: propertyName.trim(),
      landlordName: settings.landlordName || 'Landlord',
      landlordPhone: settings.landlordPhone || '',
      defaultElectricityRate: electricityRate,
      billingStrategy,
      billingCycleDay: Math.min(31, Math.max(1, Number(billingCycleDay) || 1)),
      billingStrategyConfigured: true,
      upiId: upiId.trim(),
      upiPayeeName: settings.upiPayeeName || settings.landlordName || 'Landlord',
      customQrCodeUrl: qrCodeUrl.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="building-setup-wizard-modal"
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all my-6 ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Building Setup & Billing</h2>
              {propertyName && (
                <p className="text-[11px] text-emerald-400 font-medium truncate max-w-[240px]">
                  {propertyName}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleGenerate} className="p-5 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Section 1: Billing Cycle Strategy */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>1. Billing Cycle Strategy</span>
              <span className="text-[10px] text-neutral-400 font-normal normal-case">Engine Rule</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Fixed Monthly Date */}
              <button
                type="button"
                onClick={() => setBillingStrategy('fixed_monthly')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  billingStrategy === 'fixed_monthly'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : isDark
                      ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${billingStrategy === 'fixed_monthly' ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    <span className="text-xs font-semibold">Fixed Monthly Date</span>
                  </div>
                  {billingStrategy === 'fixed_monthly' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  All units billed on a fixed calendar date (e.g. 1st). Mid-month move-ins get auto-prorated for remaining days.
                </p>
              </button>

              {/* Option B: Individual Move-In Anniversary Cycle */}
              <button
                type="button"
                onClick={() => setBillingStrategy('move_in_anniversary')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  billingStrategy === 'move_in_anniversary'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : isDark
                      ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${billingStrategy === 'move_in_anniversary' ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    <span className="text-xs font-semibold">Move-In Anniversary</span>
                  </div>
                  {billingStrategy === 'move_in_anniversary' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Each tenant renews on their individual move-in day (e.g. renews every 18th). Bill unlocks when cycle arrives.
                </p>
              </button>
            </div>

            {/* Fixed Date Configuration Sub-Input */}
            {billingStrategy === 'fixed_monthly' && (
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-neutral-950 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-medium text-neutral-200">
                    Cycle Start Day of Month
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={billingCycleDay}
                      onChange={(e) => setBillingCycleDay(Number(e.target.value))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
                      }`}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d === 1 ? '1st of month' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Header will display cycle window with automatic leap/short month clamping.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Floors & Units */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              2. Floors & Units
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Total Floors Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Total Floors
                </label>
                <div className={`flex items-center rounded-xl border px-3.5 py-2.5 ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <Layers className="w-4 h-4 mr-2.5 text-emerald-400 shrink-0" />
                  <select
                    value={numFloors}
                    onChange={(e) => setNumFloors(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-sm font-semibold text-white outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n} className="bg-neutral-900 text-white">
                        {n} {n === 1 ? 'Floor' : 'Floors'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Units Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Flats per Floor
                </label>
                <div className={`flex items-center rounded-xl border px-3.5 py-2.5 ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <DoorOpen className="w-4 h-4 mr-2.5 text-teal-400 shrink-0" />
                  <select
                    value={unitsMode}
                    onChange={(e) => setUnitsMode(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold text-white outline-none cursor-pointer"
                  >
                    <option value={1} className="bg-neutral-900 text-white">1 Flat / Floor</option>
                    <option value={2} className="bg-neutral-900 text-white">2 Flats / Floor</option>
                    <option value={3} className="bg-neutral-900 text-white">3 Flats / Floor</option>
                    <option value={4} className="bg-neutral-900 text-white">4 Flats / Floor</option>
                    <option value={0} className="bg-neutral-900 text-amber-400">Skip (Add Later)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkbox for Ground Floor */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label htmlFor="include-ground-checkbox" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="include-ground-checkbox"
                  type="checkbox"
                  checked={includeGroundFloor}
                  onChange={(e) => setIncludeGroundFloor(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-neutral-900 border-neutral-700 cursor-pointer accent-emerald-500"
                />
                <span className="text-xs font-semibold text-white">Include Ground Floor (G)</span>
              </label>

              <span className="text-xs px-2 py-0.5 rounded-md font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {includeGroundFloor ? `G + ${numFloors - 1}` : `${numFloors} Floors`}
              </span>
            </div>

            {/* Calculated Floor Preview */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {previewFloors.map((pf) => (
                <div 
                  key={pf.order}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border bg-neutral-950 border-neutral-800 text-neutral-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{pf.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Payment & Rates */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              3. Rates & Payment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Default Rent (₹/mo)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={defaultRent}
                  onChange={(e) => setDefaultRent(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Electricity Rate (₹/unit)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl border pl-3.5 pr-8 py-2.5 text-sm font-semibold outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                  <Zap className="w-4 h-4 absolute right-3 top-3 text-amber-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* UPI ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white">
                Landlord UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. landlord@okhdfcbank"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            {/* Payment QR Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white">
                Payment QR Code (Optional)
              </label>

              <input
                type="file"
                ref={qrFileInputRef}
                accept="image/*"
                onChange={handleQrUpload}
                className="hidden"
              />

              {!qrCodeUrl ? (
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  className={`w-full py-3.5 px-4 rounded-xl border border-dashed text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    isDark 
                      ? 'border-neutral-700 bg-neutral-950/60 text-neutral-300 hover:text-white hover:border-emerald-500/50 hover:bg-neutral-950' 
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload QR Code Image</span>
                </button>
              ) : (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <img 
                      src={qrCodeUrl} 
                      alt="Payment QR Preview" 
                      className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-neutral-700" 
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">QR Code Loaded</span>
                      <span className="text-[11px] text-emerald-400 font-medium block">Ready for rent receipts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="py-1.5 px-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrCodeUrl('')}
                      className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove QR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-confirm-create-building"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Building & Apply Billing</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};