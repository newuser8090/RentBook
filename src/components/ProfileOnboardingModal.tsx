import React, { useState } from 'react';
import { AppTheme } from '../App';
import { 
  Building2, 
  UserCheck, 
  Phone, 
  MapPin, 
  Zap, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  CreditCard
} from 'lucide-react';
import { isValidIndianPhone, cleanPhoneDigits } from '../utils/validation';
import { compressQrImageFile } from '../utils/imageCompressor';

export interface OnboardingProfileData {
  landlordName: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddress: string;
  defaultElectricityRate: number;
  upiId: string;
  customQrCodeUrl?: string;
}

interface ProfileOnboardingModalProps {
  isOpen: boolean;
  theme: AppTheme;
  initialValues?: Partial<OnboardingProfileData>;
  onSave: (data: OnboardingProfileData) => Promise<void> | void;
}

export const ProfileOnboardingModal: React.FC<ProfileOnboardingModalProps> = ({
  isOpen,
  theme,
  initialValues,
  onSave,
}) => {
  const isDark = theme === 'dark';

  const [landlordName, setLandlordName] = useState(initialValues?.landlordName || '');
  const [phone, setPhone] = useState(initialValues?.landlordPhone || '');
  const [propertyName, setPropertyName] = useState(initialValues?.propertyName || '');
  const [propertyAddress, setPropertyAddress] = useState(initialValues?.propertyAddress || '');
  const [defaultElectricityRate, setDefaultElectricityRate] = useState<number | string>(
    initialValues?.defaultElectricityRate ?? 8.5
  );
  const [upiId, setUpiId] = useState(initialValues?.upiId || '');
  const [customQrCodeUrl, setCustomQrCodeUrl] = useState<string | undefined>(
    initialValues?.customQrCodeUrl
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setLandlordName(initialValues?.landlordName || '');
    setPhone(initialValues?.landlordPhone || '');
    setPropertyName(initialValues?.propertyName || '');
    setPropertyAddress(initialValues?.propertyAddress || '');
    setDefaultElectricityRate(initialValues?.defaultElectricityRate ?? 8.5);
    setUpiId(initialValues?.upiId || '');
    setCustomQrCodeUrl(initialValues?.customQrCodeUrl);
    setErrorMsg('');
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressQrImageFile(file);
        setCustomQrCodeUrl(compressed);
        setErrorMsg('');
      } catch (err) {
        console.error('Failed to compress QR image:', err);
        setErrorMsg('Failed to process QR image. Please try another image.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = landlordName.trim();
    const rawPhone = phone.trim();
    const phoneDigits = cleanPhoneDigits(rawPhone);
    const cleanPropName = propertyName.trim();
    const cleanAddress = propertyAddress.trim();
    const cleanUpi = upiId.trim();
    const rateNum = parseFloat(String(defaultElectricityRate)) || 8.5;

    if (!cleanName) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!phoneDigits || phoneDigits.length !== 10 || !isValidIndianPhone(phoneDigits)) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!cleanPropName) {
      setErrorMsg('Please enter your property or building name');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await onSave({
        landlordName: cleanName,
        landlordPhone: phoneDigits,
        propertyName: cleanPropName,
        propertyAddress: cleanAddress,
        defaultElectricityRate: rateNum,
        upiId: cleanUpi,
        customQrCodeUrl,
      });
    } catch (err: any) {
      console.error('Save profile onboarding error:', err);
      setErrorMsg(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start gap-3.5 ${
          isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-100 bg-zinc-50/60'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Complete Landlord & Building Profile</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Set up your building details and payment preferences to start generating receipts.
            </p>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Full Landlord Name <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="onboarding-landlord-name"
                required
                placeholder="e.g. Shivam Maurya"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* WhatsApp Phone & Property Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                WhatsApp Phone <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="onboarding-landlord-phone"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Property / Building Name <span className="text-emerald-500">*</span>
              </label>
              <input
                type="text"
                id="onboarding-property-name"
                required
                placeholder="e.g. Green Heights Residency"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Property Address
            </label>
            <input
              type="text"
              id="onboarding-property-address"
              placeholder="e.g. 124, 5th Cross, Indiranagar, Bengaluru"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Electricity Rate & UPI ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Default Electricity Rate (₹/unit)
              </label>
              <input
                type="number"
                id="onboarding-electricity-rate"
                step="any"
                min="0"
                value={defaultElectricityRate}
                onChange={(e) => setDefaultElectricityRate(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                UPI ID (for tenant rent payments)
              </label>
              <input
                type="text"
                id="onboarding-upi-id"
                placeholder="e.g. name@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-zinc-800/60 border-zinc-700/70 text-zinc-100 focus:border-emerald-500' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* UPI QR Code Upload */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Upload UPI Payment QR Code (Optional)
            </label>
            {customQrCodeUrl ? (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-zinc-800/40 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex items-center gap-3">
                  <img 
                    src={customQrCodeUrl} 
                    alt="Uploaded QR Code" 
                    className="w-12 h-12 object-contain rounded-lg border border-zinc-700/50 bg-white"
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 block flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> QR Code Uploaded
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Will appear on tenant payment receipts
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomQrCodeUrl(undefined)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2.5 p-3.5 border border-dashed rounded-xl cursor-pointer transition-colors ${
                isDark 
                  ? 'border-zinc-700 hover:border-emerald-500 bg-zinc-800/20' 
                  : 'border-zinc-300 hover:border-emerald-500 bg-zinc-50'
              }`}>
                <Upload className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-400">
                  Click to select QR image (PNG, JPG)
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleQrUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-save-onboarding-profile"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile to Cloud...</span>
                </>
              ) : (
                <span>Save Profile & Start</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
