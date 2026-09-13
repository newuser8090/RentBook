import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Floor, Unit, Bill, LandlordSettings, BillingCycleStrategy } from './types';
import { 
  DEFAULT_BLANK_SETTINGS,
  DEMO_SETTINGS, 
  DEMO_FLOORS, 
  DEMO_UNITS, 
  DEMO_BILLS,
} from './data/initialData';
import { 
  supabase,
  saveProperty,
  saveFloor,
  saveFloors,
  deleteFloor,
  saveUnit,
  saveUnits,
  deleteUnit,
  saveBill,
  saveBills,
  deleteBill,
  saveSettings,
  saveBuildingDataSequentially,
  saveFloorToSupabase,
  deleteFloorFromSupabase,
  saveUnitToSupabase,
  deleteUnitFromSupabase,
  saveBillToSupabase,
  deleteBillFromSupabase,
  purgeUserDataFromSupabase,
  deleteAccountFromSupabase,
  saveSettingsToSupabase,
  uploadInitialDataToSupabase,
  fetchUserDataFromSupabase,
} from './lib/supabase';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthScreen } from './components/AuthScreen';
import { AnalyticsDrawer } from './components/AnalyticsDrawer';
import { MonthPickerModal } from './components/MonthPickerModal';
import { GenerateBillModal } from './components/GenerateBillModal';
import { BillReceiptModal } from './components/BillReceiptModal';
import { UnitDetailsModal } from './components/UnitDetailsModal';
import { AddFloorModal } from './components/AddFloorModal';
import { AddUnitModal } from './components/AddUnitModal';
import { BuildingSetupWizardModal } from './components/BuildingSetupWizardModal';
import { BillingStrategySelectModal } from './components/BillingStrategySelectModal';
import { DueSoonNotificationsModal } from './components/DueSoonNotificationsModal';
import { ProfileOnboardingModal, OnboardingProfileData } from './components/ProfileOnboardingModal';
import { 
  getActiveBillingMonthName,
  getDueSoonUnitsForIndividualMode 
} from './utils/billingCycle';
import { Check, CheckCircle2, X, Building2, Heart } from 'lucide-react';

export type AppTheme = 'dark' | 'light';

export default function App() {
  // Fullscreen Initial Data Sync & Wizard submission loading states
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isWizardSubmitting, setIsWizardSubmitting] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('rentbook_is_demo') === 'true';
  });

  // Current authenticated email for verification and display
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return (
      localStorage.getItem('rentbook_auth_email') ||
      localStorage.getItem('rentbook_auth_phone') ||
      ''
    );
  });

  // Initial AuthScreen view mode ('splash' by default, or 'signup' after account deletion)
  const [authInitialMode, setAuthInitialMode] = useState<'splash' | 'signin' | 'signup'>('splash');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = localStorage.getItem('rentbook_auth_session');
    return session === 'true';
  });

  const [activeUserUid, setActiveUserUid] = useState<string>(() => {
    return localStorage.getItem('rentbook_auth_uid') || '';
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('rentbook_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('rentbook_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (!isDemoMode && (currentUserEmail || activeUserUid)) {
      saveSettings(settings, currentUserEmail || activeUserUid, nextTheme);
    }
  };

  // Selected Billing Month State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return getActiveBillingMonthName(1);
  });

  useEffect(() => {
    localStorage.setItem('rentbook_selected_month', selectedMonth);
  }, [selectedMonth]);

  // Drawer and Dialog States
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isDueSoonModalOpen, setIsDueSoonModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Persistence State
  const [floors, setFloors] = useState<Floor[]>(() => {
    const isDemo = localStorage.getItem('rentbook_is_demo') === 'true';
    if (isDemo) return DEMO_FLOORS;
    try {
      const saved = localStorage.getItem('rentbook_floors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached floors from localStorage:', e);
    }
    return [];
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    const isDemo = localStorage.getItem('rentbook_is_demo') === 'true';
    if (isDemo) return DEMO_UNITS;
    try {
      const saved = localStorage.getItem('rentbook_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached units from localStorage:', e);
    }
    return [];
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const isDemo = localStorage.getItem('rentbook_is_demo') === 'true';
    if (isDemo) return DEMO_BILLS;
    try {
      const saved = localStorage.getItem('rentbook_bills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached bills from localStorage:', e);
    }
    return [];
  });

  const [settings, setSettings] = useState<LandlordSettings>(() => {
    const isDemo = localStorage.getItem('rentbook_is_demo') === 'true';
    if (isDemo) return DEMO_SETTINGS;
    try {
      const saved = localStorage.getItem('rentbook_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_BLANK_SETTINGS,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.error('Failed to load cached settings from localStorage:', e);
    }
    return DEFAULT_BLANK_SETTINGS;
  });

  // Cloud sync status state
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Modals state
  const [generatingBillUnit, setGeneratingBillUnit] = useState<Unit | null>(null);
  const [viewingReceiptBill, setViewingReceiptBill] = useState<Bill | null>(null);
  const [viewingDetailsUnit, setViewingDetailsUnit] = useState<Unit | null>(null);
  const [isStrategySelectModalOpen, setIsStrategySelectModalOpen] = useState(false);
  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isBuildingWizardOpen, setIsBuildingWizardOpen] = useState(false);
  const [isProfileOnboardingOpen, setIsProfileOnboardingOpen] = useState(false);
  const [addUnitTargetFloorId, setAddUnitTargetFloorId] = useState<string | undefined>(undefined);

  // Sync with Local Storage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('rentbook_floors', JSON.stringify(floors));
    }
  }, [floors, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('rentbook_units', JSON.stringify(units));
    }
  }, [units, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('rentbook_bills', JSON.stringify(bills));
    }
  }, [bills, isAuthenticated]);

  // Prevent overwriting existing user settings with DEFAULT_BLANK_SETTINGS when an authenticated session is active
  useEffect(() => {
    if (isAuthenticated) {
      const hasRealSettings = Boolean(
        (settings.landlordName && settings.landlordName.trim()) ||
        (settings.propertyName && settings.propertyName.trim()) ||
        (settings.upiId && settings.upiId.trim()) ||
        (settings.propertyAddress && settings.propertyAddress.trim())
      );
      if (hasRealSettings) {
        localStorage.setItem('rentbook_settings', JSON.stringify(settings));
      }
    }
  }, [settings, isAuthenticated]);

  // Centralized data applicator for Supabase cloud sync & session rehydration
  const applyUserData = useCallback((userData: any) => {
    if (!userData) return;

    // Only update settings if landlordName or propertyName or upiId are populated
    if (
      userData.settings &&
      (Boolean(userData.settings.landlordName?.trim()) ||
       Boolean(userData.settings.propertyName?.trim()) ||
       Boolean(userData.settings.upiId?.trim()))
    ) {
      setSettings((prev) => {
        const cloudPropName = (userData.settings.propertyName !== undefined && userData.settings.propertyName !== null && String(userData.settings.propertyName).trim() !== '')
          ? String(userData.settings.propertyName).trim()
          : '';
        const prevPropName = (prev.propertyName && prev.propertyName.trim() !== '') ? prev.propertyName.trim() : '';

        const merged: LandlordSettings = {
          ...prev,
          ...userData.settings,
          upiId: userData.settings.upiId || prev.upiId || '',
          customQrCodeUrl: userData.settings.customQrCodeUrl || prev.customQrCodeUrl || undefined,
          landlordName: userData.settings.landlordName || prev.landlordName || '',
          propertyName: cloudPropName || prevPropName || 'My Building',
        };
        localStorage.setItem('rentbook_settings', JSON.stringify(merged));
        return merged;
      });
    }

    if (userData.floors && userData.floors.length > 0) {
      setFloors(userData.floors);
      localStorage.setItem('rentbook_floors', JSON.stringify(userData.floors));
    }

    if (userData.units && userData.units.length > 0) {
      setUnits(userData.units);
      localStorage.setItem('rentbook_units', JSON.stringify(userData.units));
    }

    if (userData.bills) {
      setBills(userData.bills);
      localStorage.setItem('rentbook_bills', JSON.stringify(userData.bills));
    }

    if (userData.theme === 'dark' || userData.theme === 'light') {
      setTheme(userData.theme as AppTheme);
      localStorage.setItem('rentbook_theme', userData.theme);
    }

    setIsCloudSynced(true);
  }, []);

  // Track Supabase Auth state change & check initial session with immediate hydration
  useEffect(() => {
    let isMounted = true;

    const hydrateCloudData = async (uidOrEmail: string) => {
      setIsHydrating(true);
      const email = uidOrEmail.includes('@') ? uidOrEmail.toLowerCase().trim() : currentUserEmail;
      if (email) {
        setCurrentUserEmail(email);
        localStorage.setItem('rentbook_auth_email', email);
      }
      if (!uidOrEmail.includes('@')) {
        setActiveUserUid(uidOrEmail);
        localStorage.setItem('rentbook_auth_uid', uidOrEmail);
      }
      localStorage.setItem('rentbook_auth_session', 'true');
      localStorage.removeItem('rentbook_is_demo');
      setIsDemoMode(false);
      setIsAuthenticated(true);

      try {
        const userData = await fetchUserDataFromSupabase(email || uidOrEmail);
        if (userData && isMounted) {
          applyUserData(userData);

          const hasConfiguredProfile = Boolean(
            userData.settings?.landlordName?.trim() ||
            userData.settings?.propertyName?.trim() ||
            userData.settings?.upiId?.trim()
          );

          if (hasConfiguredProfile) {
            setIsProfileOnboardingOpen(false);
            setIsBuildingWizardOpen(false);
          }
        }
      } catch (err) {
        console.error('Immediate session hydration error:', err);
      } finally {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              setIsHydrating(false);
            }
          }, 300);
        }
      }
    };

    // Check active session on initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isMounted) {
        const email = session.user.email?.toLowerCase().trim();
        if (email) {
          setCurrentUserEmail(email);
          localStorage.setItem('rentbook_auth_email', email);
        }
        if (session.user.id) {
          setActiveUserUid(session.user.id);
          localStorage.setItem('rentbook_auth_uid', session.user.id);
        }
        await hydrateCloudData(email || session.user.id);
      } else if (isMounted) {
        // No active supabase session, finish hydration
        setTimeout(() => {
          if (isMounted) {
            setIsHydrating(false);
          }
        }, 300);
      }
    }).catch(() => {
      if (isMounted) {
        setTimeout(() => {
          if (isMounted) {
            setIsHydrating(false);
          }
        }, 300);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // STRICT TAB-SWITCH IMMUNITY: Ignore token renewals, user updates, initial session events, and background sign-outs
      // Never wipe state on SIGNED_OUT inside onAuthStateChange. State is cleared only when the user explicitly clicks "Log Out".
      if (
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_OUT'
      ) {
        return;
      }

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          const email = session.user.email?.toLowerCase().trim();
          if (email) {
            setCurrentUserEmail(email);
            localStorage.setItem('rentbook_auth_email', email);
          }
          if (session.user.id) {
            setActiveUserUid(session.user.id);
            localStorage.setItem('rentbook_auth_uid', session.user.id);
          }
          await hydrateCloudData(email || session.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [currentUserEmail, applyUserData]);

  // Sync active cycle month when billingCycleDay changes
  useEffect(() => {
    const active = getActiveBillingMonthName(settings.billingCycleDay || 1);
    setSelectedMonth(active);
  }, [settings.billingCycleDay]);

  const activeUnitIds = useMemo(() => new Set(units.map((u) => u.id)), [units]);

  const validBills = useMemo(() => {
    if (floors.length === 0 || units.length === 0) return [];
    return bills.filter((b) => activeUnitIds.has(b.unitId));
  }, [bills, activeUnitIds, floors.length, units.length]);

  const pendingBillsCount = validBills.filter((b) => b.status === 'pending').length;
  
  // Auto-purge orphaned bills when building has zero floors
  useEffect(() => {
    if (isCloudSynced && floors.length === 0 && bills.length > 0) {
      setBills([]);
      localStorage.removeItem('rentbook_bills');
      if (!isDemoMode && activeUserUid) {
        (async () => {
          try {
            await supabase.from('bills').delete().eq('user_id', activeUserUid);
          } catch (err) {
            console.warn('Notice clearing orphaned bills from Supabase:', err);
          }
        })();
      }
    }
  }, [floors.length, bills.length, isDemoMode, activeUserUid, isCloudSynced]);

  const dueSoonUnits = useMemo(() => {
    return getDueSoonUnitsForIndividualMode(units, validBills, floors);
  }, [units, validBills, floors]);

  const cyclesDueSoonCount = dueSoonUnits.length;

  // Handlers
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== 'home') {
      setIsStrategySelectModalOpen(false);
      setIsBuildingWizardOpen(false);
      setIsAddFloorOpen(false);
      setIsAddUnitOpen(false);
    }
  };

  const handleOpenAddFloor = () => {
    if (activeTab !== 'home') return;
    if (floors.length === 0) {
      setIsStrategySelectModalOpen(true);
    } else {
      setIsAddFloorOpen(true);
    }
  };

  const handleConfirmStrategy = (strategy: BillingCycleStrategy, cycleDay: number) => {
    const updatedSettings: LandlordSettings = {
      ...settings,
      billingStrategy: strategy,
      billingCycleDay: Math.min(31, Math.max(1, Number(cycleDay) || 1)),
      billingStrategyConfigured: true,
    };
    setSettings(updatedSettings);
    localStorage.setItem('rentbook_settings', JSON.stringify(updatedSettings));

    setIsStrategySelectModalOpen(false);
    setIsAddFloorOpen(true);

    if (!isDemoMode && activeUserUid) {
      saveSettings(updatedSettings, activeUserUid, theme).catch((err) => {
        console.error('Failed to sync settings to Supabase', err);
      });
    }
  };

  const handleOpenAddUnit = (floorId?: string) => {
    setAddUnitTargetFloorId(floorId);
    setIsAddUnitOpen(true);
  };

  const handleAddFloor = async (newFloor: Floor, newUnits?: Unit[]) => {
    const currentPropertyId = settings.propertyId || (activeUserUid ? `prop-${activeUserUid}` : '');
    const floorWithProp: Floor = {
      ...newFloor,
      propertyId: newFloor.propertyId || currentPropertyId,
    };
    const updatedFloors = [...floors, floorWithProp];
    setFloors(updatedFloors);

    if (newUnits && newUnits.length > 0) {
      const unitsWithFloor = newUnits.map((u) => ({
        ...u,
        floorId: u.floorId || newFloor.id,
      }));
      setUnits([...units, ...unitsWithFloor]);
    }

    if (!isDemoMode && activeUserUid) {
      const propResult = await saveProperty(settings, activeUserUid, currentPropertyId);
      const confirmedPropId = propResult.propertyId || currentPropertyId;

      await saveFloor({ ...floorWithProp, propertyId: confirmedPropId }, activeUserUid, confirmedPropId);

      if (newUnits && newUnits.length > 0) {
        const unitsWithFloor = newUnits.map((u) => ({
          ...u,
          floorId: u.floorId || newFloor.id,
        }));
        await saveUnits(unitsWithFloor, activeUserUid);
      }
    }

    setSettings((prev) => {
      const updated = { ...prev, billingStrategyConfigured: true, propertyId: currentPropertyId };
      if (!isDemoMode && activeUserUid) {
        saveSettings(updated, activeUserUid, theme);
      }
      return updated;
    });

    showToast(`Added ${newFloor.name} with ${newUnits?.length || 0} units!`);
  };

  const handleAddUnit = (newUnit: Unit) => {
    setUnits([...units, newUnit]);
    if (!isDemoMode && activeUserUid) {
      saveUnitToSupabase(newUnit, activeUserUid);
    }
  };

  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits(units.map((u) => (u.id === updatedUnit.id ? updatedUnit : u)));
    if (!isDemoMode && activeUserUid) {
      saveUnitToSupabase(updatedUnit, activeUserUid);
    }
    if (viewingDetailsUnit && viewingDetailsUnit.id === updatedUnit.id) {
      setViewingDetailsUnit(updatedUnit);
    }
  };

  const handleArchiveUnit = (unitId: string) => {
    const target = units.find((u) => u.id === unitId);
    if (target) {
      const updated = { ...target, isArchived: true, archivedDate: new Date().toISOString() };
      setUnits(units.map((u) => (u.id === unitId ? updated : u)));
      if (!isDemoMode && activeUserUid) {
        saveUnitToSupabase(updated, activeUserUid);
      }
    }
    if (viewingDetailsUnit && viewingDetailsUnit.id === unitId) {
      setViewingDetailsUnit(null);
    }
  };

  const handleUnarchiveUnit = (unitId: string) => {
    const target = units.find((u) => u.id === unitId);
    if (target) {
      const updated = { ...target, isArchived: false, archivedDate: undefined };
      setUnits(units.map((u) => (u.id === unitId ? updated : u)));
      if (!isDemoMode && activeUserUid) {
        saveUnitToSupabase(updated, activeUserUid);
      }
    }
  };

  const handleSaveBill = (newBill: Bill, updatedUnit: Unit) => {
    setBills([newBill, ...bills]);
    if (!isDemoMode && activeUserUid) {
      saveBillToSupabase(newBill, activeUserUid);
    }

    setUnits(units.map((u) => (u.id === updatedUnit.id ? updatedUnit : u)));
    if (!isDemoMode && activeUserUid) {
      saveUnitToSupabase(updatedUnit, activeUserUid);
    }

    setGeneratingBillUnit(null);
    setViewingReceiptBill(newBill);
  };

  const handleUpdateBillStatus = (
    billId: string, 
    status: 'paid' | 'pending', 
    paymentMode: any = 'UPI'
  ) => {
    const updatedBills = bills.map((b) => {
      if (b.id === billId) {
        const updatedBill: Bill = {
          ...b,
          status,
          paidDate: status === 'paid' ? new Date().toISOString() : undefined,
          paymentMode: status === 'paid' ? paymentMode : undefined,
        };
        if (!isDemoMode && activeUserUid) {
          saveBillToSupabase(updatedBill, activeUserUid);
        }
        return updatedBill;
      }
      return b;
    });

    setBills(updatedBills);

    if (viewingReceiptBill && viewingReceiptBill.id === billId) {
      setViewingReceiptBill({
        ...viewingReceiptBill,
        status,
        paidDate: status === 'paid' ? new Date().toISOString() : undefined,
        paymentMode: status === 'paid' ? paymentMode : undefined,
      });
    }
  };

  const handleSaveProfileOnboarding = async (data: OnboardingProfileData) => {
    const updatedSettings: LandlordSettings = {
      ...settings,
      landlordName: data.landlordName,
      landlordPhone: data.landlordPhone,
      propertyName: data.propertyName,
      propertyAddress: data.propertyAddress,
      defaultElectricityRate: data.defaultElectricityRate,
      upiId: data.upiId,
      upiPayeeName: data.landlordName,
      customQrCodeUrl: data.customQrCodeUrl,
    };

    setSettings(updatedSettings);
    localStorage.setItem('rentbook_settings', JSON.stringify(updatedSettings));

    if (!isDemoMode && (currentUserEmail || activeUserUid)) {
      const res = await saveSettings(updatedSettings, currentUserEmail || activeUserUid, theme);
      if (res.success && res.data) {
        setSettings(res.data);
        localStorage.setItem('rentbook_settings', JSON.stringify(res.data));
      }
    }

    // Close profile setup modal and land directly on home screen without auto-opening the wizard
    setIsProfileOnboardingOpen(false);
    setIsBuildingWizardOpen(false);
    setActiveTab('home');
    showToast('Landlord profile saved! You can now set up your building or add units.');
  };

  const handleCompleteAuth = (
    authenticatedUserPhoneOrEmail: string, 
    updatedSettings?: Partial<LandlordSettings>,
    userUid?: string,
    isNewUser?: boolean,
    toastMsg?: string
  ) => {
    const targetUid = userUid || activeUserUid || '';
    const email = authenticatedUserPhoneOrEmail.includes('@') ? authenticatedUserPhoneOrEmail.toLowerCase().trim() : '';
    setIsDemoMode(false);
    localStorage.removeItem('rentbook_is_demo');
    if (targetUid) {
      setActiveUserUid(targetUid);
      localStorage.setItem('rentbook_auth_uid', targetUid);
    }
    localStorage.setItem('rentbook_auth_session', 'true');
    localStorage.setItem('rentbook_auth_phone', authenticatedUserPhoneOrEmail);
    if (email) {
      localStorage.setItem('rentbook_auth_email', email);
    }
    setCurrentUserEmail(authenticatedUserPhoneOrEmail);

    if (updatedSettings && Object.keys(updatedSettings).length > 0) {
      const merged = { ...settings, ...updatedSettings };
      setSettings(merged);
      localStorage.setItem('rentbook_settings', JSON.stringify(merged));
      saveSettings(merged, email || targetUid, theme);
    }
    setIsAuthenticated(true);
    setActiveTab('home');

    if (toastMsg) {
      showToast(toastMsg);
    }

    if (isNewUser) {
      setFloors([]);
      setUnits([]);
      setBills([]);
      setIsProfileOnboardingOpen(true);
      setIsBuildingWizardOpen(false);
      setIsHydrating(false);
      return;
    }

    const lookupKey = email || targetUid;
    if (lookupKey) {
      setIsHydrating(true);
      fetchUserDataFromSupabase(lookupKey)
        .then((userData) => {
          if (userData) {
            applyUserData(userData);
            const hasConfiguredProfile = Boolean(
              userData.settings?.landlordName?.trim() || userData.settings?.propertyName?.trim()
            );
            if (hasConfiguredProfile) {
              setIsProfileOnboardingOpen(false);
              setIsBuildingWizardOpen(false);
            } else {
              setIsProfileOnboardingOpen(true);
            }
          } else {
            setIsProfileOnboardingOpen(true);
          }
        })
        .catch((err) => {
          console.error('Session hydration on sign in error:', err);
        })
        .finally(() => {
          setTimeout(() => {
            setIsHydrating(false);
          }, 300);
        });
    } else {
      setIsHydrating(false);
    }
  };

  const handleStartDemoMode = () => {
    setIsHydrating(false);
    setIsDemoMode(true);
    localStorage.setItem('rentbook_is_demo', 'true');
    localStorage.setItem('rentbook_auth_session', 'true');
    setActiveUserUid('demo-landlord-user');
    setSettings(DEMO_SETTINGS);
    setFloors(DEMO_FLOORS);
    setUnits(DEMO_UNITS);
    setBills(DEMO_BILLS);
    setIsAuthenticated(true);
    setActiveTab('home');
  };

  const handleSaveBuildingSetup = async (
    newFloors: Floor[],
    newUnits: Unit[],
    updatedSettings: Partial<LandlordSettings>
  ) => {
    setIsWizardSubmitting(true);
    try {
      setBills([]);
      localStorage.removeItem('rentbook_bills');

      const mergedSettings: LandlordSettings = {
        ...settings,
        ...updatedSettings,
        propertyId: updatedSettings.propertyId || settings.propertyId || (activeUserUid ? `prop-${activeUserUid}` : undefined),
      };

      if (!isDemoMode && activeUserUid) {
        await purgeUserDataFromSupabase(activeUserUid);

        const propResult = await saveProperty(mergedSettings, activeUserUid, mergedSettings.propertyId);
        const confirmedPropertyId = propResult.propertyId || mergedSettings.propertyId || `prop-${activeUserUid}`;
        mergedSettings.propertyId = confirmedPropertyId;

        await saveSettings(mergedSettings, activeUserUid, theme);

        const floorsWithProperty = newFloors.map((f) => ({
          ...f,
          propertyId: confirmedPropertyId,
        }));
        await saveFloors(floorsWithProperty, confirmedPropertyId, activeUserUid);
        await saveUnits(newUnits, activeUserUid);
        await saveBills([], activeUserUid);

        setSettings(mergedSettings);
        localStorage.setItem('rentbook_settings', JSON.stringify(mergedSettings));
        setFloors(floorsWithProperty);
        setUnits(newUnits);
        setIsCloudSynced(true);
      } else {
        setSettings(mergedSettings);
        localStorage.setItem('rentbook_settings', JSON.stringify(mergedSettings));
        setFloors(newFloors);
        setUnits(newUnits);
      }
    } catch (err) {
      console.error('Failed to save building setup:', err);
    } finally {
      setTimeout(() => {
        setIsWizardSubmitting(false);
      }, 300);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut notice:', err);
    }
    localStorage.removeItem('rentbook_is_demo');
    localStorage.removeItem('rentbook_auth_session');
    localStorage.removeItem('rentbook_auth_email');
    localStorage.removeItem('rentbook_auth_phone');
    localStorage.removeItem('rentbook_auth_uid');
    localStorage.removeItem('rentbook_floors');
    localStorage.removeItem('rentbook_units');
    localStorage.removeItem('rentbook_bills');
    localStorage.removeItem('rentbook_settings');

    setIsDemoMode(false);
    setActiveUserUid('');
    setCurrentUserEmail('');
    setIsAuthenticated(false);
    setIsHydrating(false);
    setFloors([]);
    setUnits([]);
    setBills([]);
    setSettings(DEFAULT_BLANK_SETTINGS);
    setActiveTab('home');
  };

  const handleDeleteAccount = async (password?: string) => {
    if (isDemoMode) {
      handleLogout();
      showToast('Demo mode session reset.');
      return;
    }

    // Immediately trigger fullscreen farewell transition overlay
    setIsDeletingAccount(true);

    const startTime = Date.now();

    try {
      if (activeUserUid) {
        const res = await deleteAccountFromSupabase(activeUserUid, password);
        if (!res.success) {
          throw new Error(res.error || 'Failed to delete account');
        }
      }
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Signout warning during account deletion:', e);
      }

      // Clear all cached storage state
      localStorage.clear();

      // Ensure farewell screen stays readable for a smooth 1.8 to 2.0 seconds
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      // Transition smoothly into AuthScreen on Sign-Up view with a clean slate
      setIsDemoMode(false);
      setActiveUserUid('');
      setCurrentUserEmail('');
      setFloors([]);
      setUnits([]);
      setBills([]);
      setSettings(DEFAULT_BLANK_SETTINGS);
      setActiveTab('home');
      setAuthInitialMode('signup');
      setIsAuthenticated(false);
      setIsDeletingAccount(false);
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setIsDeletingAccount(false);
      throw err;
    }
  };

  const handleSaveSettings = async (newSettings: LandlordSettings, userEmail?: string) => {
    setSettings(newSettings);
    localStorage.setItem('rentbook_settings', JSON.stringify(newSettings));
    const targetEmail = (userEmail || currentUserEmail || '').trim();
    if (!isDemoMode && (targetEmail || activeUserUid)) {
      const res = await saveSettings(newSettings, targetEmail || activeUserUid, theme);
      if (res.success && res.data) {
        setSettings(res.data);
        localStorage.setItem('rentbook_settings', JSON.stringify(res.data));
        showToast('Profile updated and synced to cloud!');
      } else if (!res.success) {
        showToast('Error saving profile to Supabase');
      }
    } else {
      showToast('Profile updated and synced to cloud!');
    }
  };

  const handleResetData = () => {
    if (isDemoMode) {
      setFloors(DEMO_FLOORS);
      setUnits(DEMO_UNITS);
      setBills(DEMO_BILLS);
      setSettings(DEMO_SETTINGS);
    } else {
      setFloors([]);
      setUnits([]);
      setBills([]);
      if (!isAuthenticated) {
        setSettings(DEFAULT_BLANK_SETTINGS);
      }
      if (activeUserUid) {
        uploadInitialDataToSupabase([], [], [], settings, activeUserUid);
      }
    }
  };

  const handleExportData = () => {
    const data = {
      floors,
      units,
      bills,
      settings,
      theme,
      selectedMonth,
      isDemoMode,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `RentBook_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRenameUnit = (unitId: string, newName: string) => {
    const target = units.find((u) => u.id === unitId);
    if (target) {
      const updated = { ...target, name: newName };
      handleUpdateUnit(updated);
    }
  };

  const targetUnitFloor = (unit: Unit | null) => 
    unit ? floors.find((f) => f.id === unit.floorId) : undefined;

  const isPropertyConfigured = floors.length > 0 && Boolean(settings.billingStrategyConfigured || settings.billingStrategy);

  const hasUserSession = isAuthenticated || Boolean(
    localStorage.getItem('rentbook_auth_session') === 'true' ||
    localStorage.getItem('rentbook_auth_email') ||
    localStorage.getItem('rentbook_auth_uid')
  );

  // Fullscreen Initial Data Sync Screen
  if (isHydrating && hasUserSession && !isDeletingAccount) {
    return (
      <div 
        id="fullscreen-data-sync-screen"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 selection:bg-emerald-500/30"
      >
        <div className="flex flex-col items-center max-w-xs text-center space-y-5 animate-in fade-in duration-300">
          {/* Centered emerald Building2 icon with pulse glow */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <Building2 className="w-8 h-8 stroke-[2]" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/25 blur-md -z-10 animate-pulse" />
          </div>
          
          {/* Title & Subtitle */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">Loading RentBook</h2>
            <p className="text-xs text-zinc-400 font-medium">Syncing building & ledger...</p>
          </div>

          {/* Slim gradient progress bar with a shimmering animation */}
          <div className="w-48 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden relative">
            <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Farewell State Overlay during Account Deletion
  if (isDeletingAccount) {
    return (
      <div 
        id="account-deletion-farewell-overlay"
        className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none"
      >
        <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl shadow-black/80 space-y-4">
          {/* Subtle soft-glowing heart icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 animate-pulse">
              <Heart className="w-8 h-8 stroke-[1.8] fill-rose-500/20" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-rose-500/20 blur-md -z-10 animate-pulse" />
          </div>

          {/* Headline and Subtext */}
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
              We're sorry to see you go
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Your account and data have been completely wiped. We hope to see you back soon!
            </p>
          </div>

          {/* Minimal animated progress bar indicating cleanup finalizing */}
          <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative mt-2">
            <div className="w-full h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        theme={theme}
        initialAuthMode={authInitialMode}
        onToggleTheme={toggleTheme}
        settings={settings}
        onCompleteAuth={handleCompleteAuth}
        onStartDemoMode={handleStartDemoMode}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col justify-between transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30' 
        : 'bg-[#f8fafc] text-slate-900 selection:bg-emerald-500/20'
    }`}>
      {/* 1. Header */}
      <Header
        isConfigured={isPropertyConfigured}
        currentMonth={selectedMonth}
        propertyName={settings.propertyName}
        landlordName={settings.landlordName}
        theme={theme}
        isDemoMode={isDemoMode}
        billingStrategy={settings.billingStrategy || 'fixed_monthly'}
        billingCycleDay={settings.billingCycleDay || 1}
        cyclesDueSoonCount={cyclesDueSoonCount}
        onToggleTheme={toggleTheme}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
        onOpenDueSoonNotifications={() => setIsDueSoonModalOpen(true)}
      />

      {/* 2. Main Viewport */}
      <main className="max-w-xl mx-auto px-3.5 sm:px-6 pt-3.5 pb-24 w-full flex-1">
        {activeTab === 'home' && (
          <HomeScreen
            floors={floors}
            units={units}
            bills={validBills}
            settings={settings}
            selectedMonth={selectedMonth}
            theme={theme}
            isWizardSubmitting={isWizardSubmitting}
            onOpenAddFloor={handleOpenAddFloor}
            onOpenAddUnit={handleOpenAddUnit}
            onGenerateBill={(unit) => setGeneratingBillUnit(unit)}
            onViewDetails={(unit) => setViewingDetailsUnit(unit)}
            onQuickWhatsApp={(bill) => setViewingReceiptBill(bill)}
            onViewReceipt={(bill) => setViewingReceiptBill(bill)}
            onOpenBuildingWizard={() => setIsBuildingWizardOpen(true)}
            onRenameUnit={handleRenameUnit}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            bills={validBills}
            units={units}
            floorsCount={floors.length}
            settings={settings}
            theme={theme}
            onUpdateStatus={handleUpdateBillStatus}
            onViewReceipt={(bill) => setViewingReceiptBill(bill)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            floors={floors}
            units={units}
            bills={validBills}
            theme={theme}
            isDemoMode={isDemoMode}
            currentUserEmail={currentUserEmail}
            onToggleTheme={toggleTheme}
            onSaveSettings={handleSaveSettings}
            onUpdateUnit={handleUpdateUnit}
            onViewBillReceipt={(bill) => setViewingReceiptBill(bill)}
            onResetData={handleResetData}
            onExportData={handleExportData}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* 3. Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingCount={pendingBillsCount}
        theme={theme}
      />

      {/* Analytics Side Drawer */}
      {isAnalyticsOpen && (
        <AnalyticsDrawer
          isOpen={isAnalyticsOpen}
          floors={floors}
          units={units}
          bills={bills}
          theme={theme}
          billingStrategy={settings.billingStrategy || 'fixed_monthly'}
          billingCycleDay={settings.billingCycleDay || 1}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}

      {/* Month & Year Selector Modal */}
      {isMonthPickerOpen && (
        <MonthPickerModal
          isOpen={isMonthPickerOpen}
          selectedMonth={selectedMonth}
          theme={theme}
          billingStrategy={settings.billingStrategy || 'fixed_monthly'}
          billingCycleDay={settings.billingCycleDay || 1}
          onClose={() => setIsMonthPickerOpen(false)}
          onSelectMonth={(month) => setSelectedMonth(month)}
        />
      )}

      {/* Due Soon Notification Modal */}
      <DueSoonNotificationsModal
        isOpen={isDueSoonModalOpen}
        onClose={() => setIsDueSoonModalOpen(false)}
        dueSoonUnits={dueSoonUnits}
        theme={theme}
        onSelectUnit={(unit) => {
          setIsDueSoonModalOpen(false);
          setTimeout(() => {
            const cardEl = document.getElementById(`unit-card-${unit.id}`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cardEl.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
              setTimeout(() => {
                cardEl.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
              }, 2500);
            } else {
              setViewingDetailsUnit(unit);
            }
          }, 100);
        }}
        onGenerateBill={(unit) => {
          setGeneratingBillUnit(unit);
        }}
      />

      {/* Modals */}
      {generatingBillUnit && (
        <GenerateBillModal
          unit={generatingBillUnit}
          floor={targetUnitFloor(generatingBillUnit)}
          settings={settings}
          theme={theme}
          isOpen={!!generatingBillUnit}
          onClose={() => setGeneratingBillUnit(null)}
          onSaveBill={handleSaveBill}
        />
      )}

      {viewingReceiptBill && (
        <BillReceiptModal
          bill={viewingReceiptBill}
          settings={settings}
          theme={theme}
          isOpen={!!viewingReceiptBill}
          onClose={() => setViewingReceiptBill(null)}
          onUpdateStatus={handleUpdateBillStatus}
        />
      )}

      {viewingDetailsUnit && (
        <UnitDetailsModal
          unit={viewingDetailsUnit}
          floor={targetUnitFloor(viewingDetailsUnit)}
          bills={bills}
          settings={settings}
          theme={theme}
          isOpen={!!viewingDetailsUnit}
          onClose={() => setViewingDetailsUnit(null)}
          onUpdateUnit={handleUpdateUnit}
          onGenerateBill={(unit) => setGeneratingBillUnit(unit)}
          onViewBillReceipt={(bill) => {
            setViewingDetailsUnit(null);
            setViewingReceiptBill(bill);
          }}
        />
      )}

      {/* Setup Modals - Scoped strictly to Home screen and explicit user action */}
      {activeTab === 'home' && isAddFloorOpen && (
        <AddFloorModal
          isOpen={isAddFloorOpen}
          theme={theme}
          onClose={() => setIsAddFloorOpen(false)}
          onAddFloor={handleAddFloor}
          existingFloorCount={floors.length}
          billingStrategy={settings.billingStrategy || 'fixed_monthly'}
        />
      )}

      {activeTab === 'home' && isAddUnitOpen && (
        <AddUnitModal
          isOpen={isAddUnitOpen}
          theme={theme}
          onClose={() => setIsAddUnitOpen(false)}
          floors={floors}
          defaultFloorId={addUnitTargetFloorId}
          billingStrategy={settings.billingStrategy || 'fixed_monthly'}
          billingCycleDay={settings.billingCycleDay || 1}
          onAddUnit={handleAddUnit}
        />
      )}

      {activeTab === 'home' && isStrategySelectModalOpen && (
        <BillingStrategySelectModal
          isOpen={isStrategySelectModalOpen}
          theme={theme}
          initialStrategy={settings.billingStrategy || 'fixed_monthly'}
          initialCycleDay={settings.billingCycleDay || 1}
          onClose={() => setIsStrategySelectModalOpen(false)}
          onConfirmStrategy={handleConfirmStrategy}
        />
      )}

      {activeTab === 'home' && isBuildingWizardOpen && (
        <BuildingSetupWizardModal
          isOpen={isBuildingWizardOpen}
          theme={theme}
          settings={settings}
          onClose={() => setIsBuildingWizardOpen(false)}
          onSaveSetup={handleSaveBuildingSetup}
        />
      )}

      {/* Mandatory Profile & Building Onboarding Modal */}
      <ProfileOnboardingModal
        isOpen={isProfileOnboardingOpen}
        theme={theme}
        initialValues={{
          landlordName: settings.landlordName,
          landlordPhone: settings.landlordPhone,
          propertyName: settings.propertyName,
          propertyAddress: settings.propertyAddress,
          defaultElectricityRate: settings.defaultElectricityRate,
          upiId: settings.upiId,
          customQrCodeUrl: settings.customQrCodeUrl,
        }}
        onSave={handleSaveProfileOnboarding}
      />

      {/* Global Toast */}
      {toastMessage && (
        <div 
          id="global-toast-notification"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] sm:max-w-md pointer-events-auto rounded-full bg-zinc-900/90 backdrop-blur-md border border-emerald-500/30 ring-1 ring-white/10 text-zinc-100 shadow-2xl shadow-black/50 flex items-center gap-2.5 px-3.5 py-2 animate-in fade-in slide-in-from-top-4 duration-300 ease-out"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 stroke-[2.5]" />
          </div>
          <span className="text-[12px] font-medium tracking-tight text-zinc-200 truncate pr-1">
            {toastMessage}
          </span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-auto p-1 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fullscreen Account Deletion Farewell Overlay */}
      {isDeletingAccount && (
        <div 
          id="account-deletion-farewell-overlay"
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none"
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl shadow-black/80 space-y-4">
            {/* Subtle soft-glowing heart/shield icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 animate-pulse">
                <Heart className="w-8 h-8 stroke-[1.8] fill-rose-500/20" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-rose-500/20 blur-md -z-10 animate-pulse" />
            </div>

            {/* Headline and Subtext */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                We're sorry to see you go
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Your account and data have been completely wiped. We hope to see you back soon!
              </p>
            </div>

            {/* Minimal animated progress bar indicating cleanup finalizing */}
            <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative mt-2">
              <div className="w-full h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 rounded-full animate-shimmer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}