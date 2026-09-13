import React, { useState, useEffect, useRef } from 'react';
import { Floor, Unit, Bill, LandlordSettings, OccupancyStatus } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { generateUpiUri, formatCurrency } from '../utils/formatters';
import { cleanPhoneDigits, getPhoneValidationError } from '../utils/validation';
import { compressQrImageFile } from '../utils/imageCompressor';
import { QrCropperModal } from './QrCropperModal';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Phone, 
  Building, 
  CreditCard, 
  QrCode, 
  Check, 
  Save, 
  RefreshCw, 
  Download, 
  IndianRupee, 
  Copy, 
  Sun, 
  Moon, 
  Sparkles,
  Upload,
  Trash2,
  Home,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Database,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';
import { AppTheme } from '../App';

interface SettingsScreenProps {
  settings: LandlordSettings;
  floors: Floor[];
  units: Unit[];
  bills: Bill[];
  theme: AppTheme;
  isDemoMode?: boolean;
  currentUserEmail?: string;
  onToggleTheme: () => void;
  onSaveSettings: (newSettings: LandlordSettings) => Promise<void> | void;
  onUpdateUnit?: (updatedUnit: Unit) => void;
  onViewBillReceipt?: (bill: Bill) => void;
  onResetData: () => void;
  onExportData: () => void;
  onLogout: () => void;
  onDeleteAccount?: (password?: string) => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LandlordSettings;
  theme: AppTheme;
  currentUserEmail?: string;
  onSaveSettings: (updatedSettings: LandlordSettings, userEmail?: string) => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  settings,
  theme,
  currentUserEmail,
  onSaveSettings,
  onShowToast,
}) => {
  const isDark = theme === 'dark';
  const [editName, setEditName] = useState(settings.landlordName || '');
  const [editPhone, setEditPhone] = useState(settings.landlordPhone || '');
  const [editBuildingName, setEditBuildingName] = useState(settings.propertyName || '');
  const [editRate, setEditRate] = useState<number | string>(
    settings.defaultElectricityRate ?? 8.5
  );
  const [profilePhoneError, setProfilePhoneError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditName(settings.landlordName || '');
      setEditPhone(settings.landlordPhone || '');
      setEditBuildingName(settings.propertyName || '');
      setEditRate(settings.defaultElectricityRate ?? 8.5);
      setProfilePhoneError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneErr = getPhoneValidationError(editPhone, true);
    if (phoneErr) {
      setProfilePhoneError(phoneErr);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveSettings({
        ...settings,
        landlordName: editName.trim(),
        landlordPhone: editPhone.trim(),
        propertyName: editBuildingName.trim() || 'My Building',
        defaultElectricityRate: parseFloat(String(editRate)) || 8.5,
        upiPayeeName: editName.trim() || 'Landlord'
      }, currentUserEmail);
      setSavedSuccess(true);
      onClose();
      if (onShowToast) {
        onShowToast('Profile updated and synced to cloud!');
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Landlord & Property Profile</h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Appears across bills, receipts, and headers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="p-4 overflow-y-auto space-y-3.5">
          <div>
            <label htmlFor="settings-landlord-name" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              Landlord Full Name *
            </label>
            <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <User className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                id="settings-landlord-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-landlord-phone" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              WhatsApp Phone Number *
            </label>
            <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
              profilePhoneError 
                ? 'border-rose-500 bg-rose-500/5' 
                : isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-xs font-bold text-emerald-500 font-mono">+91</span>
              <input
                id="settings-landlord-phone"
                type="tel"
                inputMode="numeric"
                required
                placeholder="9876543210"
                value={editPhone}
                onChange={(e) => {
                  const cleaned = cleanPhoneDigits(e.target.value);
                  setEditPhone(cleaned);
                  setProfilePhoneError(getPhoneValidationError(cleaned, true));
                }}
                className="w-full text-xs font-mono font-bold bg-transparent focus:outline-none"
              />
              <Phone className={`w-3.5 h-3.5 ${profilePhoneError ? 'text-rose-500' : isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            </div>
            {profilePhoneError && (
              <span className="text-[10px] text-rose-500 block mt-1 font-medium">
                {profilePhoneError}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="settings-property-name" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              Building / Property Name *
            </label>
            <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Building className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                id="settings-property-name"
                type="text"
                placeholder="e.g. Sharma Niwas"
                value={editBuildingName}
                onChange={(e) => setEditBuildingName(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-rate-input" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              Default Electricity Rate (₹/unit) *
            </label>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 p-2 rounded-xl border w-36 ${
                isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                <input
                  id="settings-rate-input"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full text-sm font-mono font-bold bg-transparent focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 font-semibold">/u</span>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {[6, 7, 8, 9, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setEditRate(rate)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      Number(editRate) === rate
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold'
                        : isDark ? 'bg-[#09090b] text-zinc-300 border-zinc-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{rate}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`p-3 border-t flex items-center justify-between gap-2 ${
            isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditProfileModal = ProfileModal;
export const LandlordProfileModal = ProfileModal;

type ActiveSettingsModal = 'rooms' | 'payment' | 'profile' | 'backup' | null;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  floors,
  units,
  bills,
  theme,
  isDemoMode = false,
  currentUserEmail,
  onToggleTheme,
  onSaveSettings,
  onUpdateUnit,
  onViewBillReceipt,
  onResetData,
  onExportData,
  onLogout,
  onDeleteAccount,
  onShowToast,
}) => {
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState<LandlordSettings>({ ...settings });
  const [activeModal, setActiveModal] = useState<ActiveSettingsModal>(null);

  // Delete Account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // QR Cropping States
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawQrImageSrc, setRawQrImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [profilePhoneError, setProfilePhoneError] = useState<string | null>(null);

  // Active units list
  const activeUnits = units.filter((u) => !u.isArchived);
  const busyUnitsCount = activeUnits.filter((u) => u.occupancyStatus === 'not_for_rent').length;
  const availableUnitsCount = activeUnits.length - busyUnitsCount;

  // Keep local form in sync if external settings change
  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const sampleUpiUri = generateUpiUri(
    formData.upiId,
    formData.upiPayeeName,
    8800,
    `Sample Rent for ${formData.propertyName}`
  );

  // Field change helper
  const handleFieldChange = (field: keyof LandlordSettings, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (field === 'landlordPhone') {
      const err = getPhoneValidationError(value, true);
      setProfilePhoneError(err);
    }
  };

  // Image selected from file picker -> compress and open interactive cropper
  const handleQrFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressQrImageFile(file);
      setRawQrImageSrc(compressedDataUrl);
      setCropperOpen(true);
    } catch (err) {
      console.error('Failed to process QR image:', err);
      alert('Failed to process image. Please try another QR code file.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cropper completed crop -> save to settings
  const handleCropComplete = (croppedDataUrl: string) => {
    const updated = { ...formData, customQrCodeUrl: croppedDataUrl };
    setFormData(updated);
    setRawQrImageSrc(null);
    onSaveSettings(updated);
  };

  const handleRemoveCustomQr = () => {
    const updated = { ...formData, customQrCodeUrl: undefined };
    setFormData(updated);
    onSaveSettings(updated);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(formData.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleToggleRoomRentStatus = (unit: Unit) => {
    if (!onUpdateUnit) return;
    const isCurrentlyBusy = unit.occupancyStatus === 'not_for_rent';
    const nextStatus: OccupancyStatus = isCurrentlyBusy ? 'vacant' : 'not_for_rent';
    
    onUpdateUnit({
      ...unit,
      occupancyStatus: nextStatus,
    });
  };

  const handleSaveModalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'profile') {
      const phoneErr = getPhoneValidationError(formData.landlordPhone, true);
      if (phoneErr) {
        setProfilePhoneError(phoneErr);
        return;
      }

      const updatedSettings: LandlordSettings = {
        ...settings,
        landlordName: formData.landlordName,
        landlordPhone: formData.landlordPhone,
        propertyName: formData.propertyName,
        defaultElectricityRate: typeof formData.defaultElectricityRate === 'number'
          ? formData.defaultElectricityRate
          : parseFloat(formData.defaultElectricityRate as any) || 8.5,
        upiPayeeName: formData.landlordName, // keep synced
      };

      await onSaveSettings(updatedSettings, currentUserEmail);
      setSavedSuccess(true);
      if (onShowToast) {
        onShowToast('Profile updated and synced to cloud!');
      }
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveModal(null);
        setProfilePhoneError(null);
      }, 500);
      return;
    }

    const updatedSettings: LandlordSettings = {
      ...settings,
      ...formData,
      upiPayeeName: formData.upiPayeeName?.trim() || formData.landlordName?.trim() || settings.landlordName?.trim() || 'Landlord',
    };

    await onSaveSettings(updatedSettings, currentUserEmail);
    setSavedSuccess(true);
    if (onShowToast) {
      onShowToast('Settings updated and synced to cloud!');
    }
    setTimeout(() => {
      setSavedSuccess(false);
      setActiveModal(null);
      setProfilePhoneError(null);
    }, 500);
  };

  const handleConfirmLogout = () => {
    onLogout();
  };

  const getFloorName = (floorId: string) => {
    return floors.find((f) => f.id === floorId)?.name || 'Floor';
  };

  const handleConfirmDeleteAccount = async () => {
    if (!onDeleteAccount) return;

    if (!isDemoMode && !deletePassword.trim()) {
      setDeleteAccountError('Please enter your account password to confirm deletion.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteAccountError(null);

      // Re-authenticate with password to verify ownership before deletion
      if (!isDemoMode) {
        let emailToVerify = currentUserEmail;
        if (!emailToVerify) {
          const { data: userData } = await supabase.auth.getUser();
          emailToVerify = userData.user?.email || '';
        }

        if (emailToVerify) {
          const { error: authErr } = await supabase.auth.signInWithPassword({
            email: emailToVerify,
            password: deletePassword,
          });

          if (authErr) {
            setDeleteAccountError('Incorrect password. Account deletion aborted.');
            setIsDeletingAccount(false);
            return;
          }
        }
      }

      // Close password modal immediately as deletion commences
      setDeleteModalOpen(false);
      const pass = deletePassword;
      setDeletePassword('');

      await onDeleteAccount(pass);
    } catch (err: any) {
      setDeleteAccountError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div id="settings-screen-view" className="space-y-4">
      {/* 1. Top Verified Landlord Profile Summary Banner */}
      <div className={`p-4 rounded-2xl border transition-colors shadow-xs ${
        isDark 
          ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-lg shrink-0">
              {formData.landlordName ? formData.landlordName.charAt(0).toUpperCase() : 'L'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm sm:text-base font-bold truncate leading-none">
                  {formData.landlordName || 'Landlord'}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <p className={`text-[11px] truncate mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {formData.landlordPhone || 'No Phone'} • {formData.propertyName || 'My Property'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('profile')}
            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              isDark 
                ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* 2. Categorized Navigation Menu List */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
        isDark 
          ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/80 text-zinc-100' 
          : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
      }`}>
        {/* Row 1: Manage Rooms & Units */}
        <button
          type="button"
          id="menu-btn-rooms"
          onClick={() => setActiveModal('rooms')}
          className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left transition-colors cursor-pointer group ${
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isDark 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <Home className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold truncate">
              Manage Rooms & Units
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hidden xs:inline-block ${
              busyUnitsCount > 0
                ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {availableUnitsCount} Active • {busyUnitsCount} Busy
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`} />
          </div>
        </button>

        {/* Row 2: Payment & UPI Settings */}
        <button
          type="button"
          id="menu-btn-payment"
          onClick={() => setActiveModal('payment')}
          className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left transition-colors cursor-pointer group ${
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isDark 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold truncate">
              Payment & UPI Settings
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hidden xs:inline-block ${
              formData.customQrCodeUrl
                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {formData.customQrCodeUrl ? 'Custom QR' : 'Auto QR'}
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`} />
          </div>
        </button>

        {/* Row 3: Property & Profile */}
        <button
          type="button"
          id="menu-btn-profile"
          onClick={() => setActiveModal('profile')}
          className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left transition-colors cursor-pointer group ${
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isDark 
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold truncate">
              Property & Profile
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hidden xs:inline-block ${
              isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              ₹{formData.defaultElectricityRate}/u
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`} />
          </div>
        </button>

        {/* Row 4: Data Backup (JSON) */}
        <button
          type="button"
          id="menu-btn-backup"
          onClick={() => setActiveModal('backup')}
          className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left transition-colors cursor-pointer group ${
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isDark 
                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold truncate">
              Data Backup (JSON)
            </span>
          </div>

          <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`} />
        </button>
      </div>

      {/* 3. Appearance & Theme Card */}
      <div className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
        isDark 
          ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Appearance & Theme
            </h4>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            isDark 
              ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            id="theme-btn-dark"
            onClick={() => theme !== 'dark' && onToggleTheme()}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
              isDark 
                ? 'bg-zinc-800/90 border-emerald-500 ring-1 ring-emerald-500/30 text-white font-bold' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold truncate whitespace-nowrap">
                Dark Slate
              </span>
            </div>
            {isDark && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          </button>

          <button
            type="button"
            id="theme-btn-light"
            onClick={() => theme !== 'light' && onToggleTheme()}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
              !isDark 
                ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/30 text-slate-900 font-bold' 
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                <Sun className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold truncate whitespace-nowrap">
                Clean Light
              </span>
            </div>
            {!isDark && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          </button>
        </div>
      </div>

      {/* 4. Logout Option Card */}
      <div className={`p-1.5 rounded-2xl border shadow-xs ${
        isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          id="btn-logout"
          onClick={handleConfirmLogout}
          className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
            isDark 
              ? 'hover:bg-zinc-800/60 text-zinc-300' 
              : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
              isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-slate-100 border border-slate-200'
            }`}>
              <LogOut className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold block leading-tight">
                Log Out
              </span>
              <span className={`text-[11px] block mt-0.5 opacity-80 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Clear session and return to Phone login
              </span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 opacity-70" />
        </button>
      </div>

      {/* 5. Clean & Minimal Delete Account Row */}
      <div className={`p-1.5 rounded-2xl border shadow-xs ${
        isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
              isDark ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}>
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={`text-xs sm:text-sm font-bold block leading-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                Delete Account
              </span>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Permanently remove your property, rooms, and billing records
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-open-delete-account"
            onClick={() => {
              setDeleteAccountError(null);
              setDeleteModalOpen(true);
            }}
            className="py-1.5 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: MANAGE ROOMS & AVAILABILITY */}
      {activeModal === 'rooms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Manage Room Availability</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {activeUnits.length} Total Rooms Registered
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5">
              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Toggle owner-occupied or personal rooms as <strong>Mark Busy (Hide)</strong> to hide them from the Home screen active dashboard.
              </p>

              <div className="space-y-2">
                {activeUnits.map((unit) => {
                  const isBusy = unit.occupancyStatus === 'not_for_rent';
                  const isOccupied = unit.occupancyStatus === 'occupied';

                  return (
                    <div 
                      key={unit.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors ${
                        isBusy
                          ? isDark ? 'bg-[#141215] border-rose-950/60' : 'bg-rose-50/40 border-rose-200/80'
                          : isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          isBusy 
                            ? isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isOccupied 
                              ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Home className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <strong className="text-xs sm:text-sm font-bold truncate">{unit.name}</strong>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                              isBusy
                                ? isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
                                : isOccupied
                                  ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isBusy ? 'Not for Rent (Busy)' : unit.occupancyStatus}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {getFloorName(unit.floorId)} • {isOccupied ? `Tenant: ${unit.tenantName}` : isBusy ? 'Owner / Personal Use' : 'Vacant'} • {formatCurrency(unit.monthlyRent)}/mo
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {onUpdateUnit && (
                          <button
                            type="button"
                            id={`btn-toggle-availability-${unit.id}`}
                            onClick={() => handleToggleRoomRentStatus(unit)}
                            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                              isBusy
                                ? isDark 
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : isDark 
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isBusy ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Show on Home</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Mark Busy (Hide)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`p-3.5 border-t flex justify-end ${
              isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: PAYMENT & UPI DETAILS WITH INTERACTIVE QR CROPPER */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Payment & UPI Details</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Configure UPI ID and custom scanned QR code
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalSettings} className="p-4 overflow-y-auto space-y-4">
              <div>
                <label htmlFor="settings-upi-id" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  UPI ID (VPA) *
                </label>
                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
                  isDark 
                    ? 'bg-[#09090b] border-zinc-800 focus-within:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 focus-within:border-emerald-600'
                }`}>
                  <CreditCard className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                  <input
                    id="settings-upi-id"
                    type="text"
                    required
                    placeholder="e.g. landlord@okhdfcbank, 9876543210@paytm"
                    value={formData.upiId}
                    onChange={(e) => handleFieldChange('upiId', e.target.value)}
                    className="w-full text-xs font-mono font-semibold bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="settings-payee-name" className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  UPI Payee Name (Registered in Bank)
                </label>
                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
                  isDark 
                    ? 'bg-[#09090b] border-zinc-800 focus-within:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 focus-within:border-emerald-600'
                }`}>
                  <User className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                  <input
                    id="settings-payee-name"
                    type="text"
                    placeholder={formData.landlordName || 'e.g. Landlord Name'}
                    value={formData.upiPayeeName}
                    onChange={(e) => handleFieldChange('upiPayeeName', e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* QR Upload & Interactive Cropper Section */}
              <div className={`p-3.5 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    Payment QR Code
                  </span>
                  {formData.customQrCodeUrl && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isDark 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      Active
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center w-28 h-28 shrink-0 overflow-hidden">
                    {formData.customQrCodeUrl ? (
                      <img
                        src={formData.customQrCodeUrl}
                        alt="Custom Landlord UPI QR"
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <QRCodeSVG
                        value={sampleUpiUri}
                        size={100}
                        level="M"
                        includeMargin={false}
                      />
                    )}
                  </div>

                  <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Upload your Google Pay, PhonePe, or Paytm QR code.
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileInput}
                        className="hidden"
                        id="custom-qr-file-input"
                      />
                      <button
                        type="button"
                        id="btn-upload-qr"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-1.5 px-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>{formData.customQrCodeUrl ? 'Change QR Code' : 'Add QR Code'}</span>
                      </button>

                      {formData.customQrCodeUrl && (
                        <button
                          type="button"
                          id="btn-remove-qr"
                          onClick={handleRemoveCustomQr}
                          className={`py-1.5 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            isDark 
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30' 
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3 border-t flex items-center justify-between gap-2 ${
                isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savedSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
                  <span>{savedSuccess ? 'Saved!' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: LANDLORD & PROPERTY PROFILE */}
      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        settings={settings}
        theme={theme}
        currentUserEmail={currentUserEmail}
        onSaveSettings={onSaveSettings}
        onShowToast={onShowToast}
      />

      {/* MODAL: DELETE ACCOUNT CONFIRMATION */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Delete Account</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Permanent account removal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingAccount) {
                    setDeleteModalOpen(false);
                    setDeleteAccountError(null);
                  }
                }}
                disabled={isDeletingAccount}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                This will permanently erase your property profile, rooms, tenants, meter readings, and invoice records from the system.
              </p>

              {!isDemoMode && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-rose-400">
                    Enter Account Password to Confirm <span className="text-rose-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border px-3 py-2 transition-all ${
                    isDark 
                      ? 'bg-zinc-900/90 border-zinc-700 focus-within:border-rose-500' 
                      : 'bg-white border-slate-300 focus-within:border-rose-500'
                  }`}>
                    <Lock className="w-4 h-4 mr-2 text-zinc-500 shrink-0" />
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      id="delete-account-password"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        if (deleteAccountError) setDeleteAccountError(null);
                      }}
                      placeholder="Enter your current password"
                      className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-zinc-500 font-medium"
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
                      title={showDeletePassword ? 'Hide password' : 'Show password'}
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {deleteAccountError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deleteAccountError}</span>
                </div>
              )}
            </div>

            <div className={`p-3.5 border-t flex items-center justify-end gap-2 ${
              isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteAccountError(null);
                }}
                disabled={isDeletingAccount}
                className={`py-2 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-account"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <span>Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 5: DATA MANAGEMENT & BACKUP */}
      {activeModal === 'backup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Data Management & Backup</h3>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Export and restore your offline rental records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-xs font-bold block">Export Data Backup</span>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Download all floors, rooms, tenant logs, meter histories, and billing receipts as a standalone JSON file.
                </p>
                <button
                  type="button"
                  id="btn-export-backup"
                  onClick={onExportData}
                  className={`w-full py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isDark 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Download Backup (JSON)</span>
                </button>
              </div>

              {isDemoMode && (
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/50 border-rose-200'
                }`}>
                  <span className="text-xs font-bold text-rose-500 block">Reset Demo Data</span>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Reverts RentBook to initial sample demonstration records.
                  </p>
                  <button
                    type="button"
                    id="btn-reset-demo-data"
                    onClick={() => {
                      if (window.confirm('Reset demo data to initial sample values?')) {
                        onResetData();
                        setActiveModal(null);
                      }
                    }}
                    className={`w-full py-2.5 px-3 border rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isDark 
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30' 
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Reset Demo Data</span>
                  </button>
                </div>
              )}
            </div>

            <div className={`p-3 border-t flex justify-end ${
              isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className={`py-2 px-4 border rounded-xl text-xs font-semibold cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE QR CROPPER MODAL */}
      <QrCropperModal
        isOpen={cropperOpen}
        imageSrc={rawQrImageSrc}
        theme={theme}
        onClose={() => {
          setCropperOpen(false);
          setRawQrImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};