import { createClient } from '@supabase/supabase-js';
import { Floor, Unit, Bill, LandlordSettings } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables! Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Gets effective user email for data scoping and user_accounts mapping.
 */
export async function resolveUserEmail(overrideEmail?: string): Promise<string | null> {
  if (overrideEmail && overrideEmail.includes('@')) {
    return overrideEmail.toLowerCase().trim();
  }
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('rentbook_is_demo') === 'true';
  if (isDemo) return null;

  const cachedEmail = typeof window !== 'undefined' ? (localStorage.getItem('rentbook_auth_email') || localStorage.getItem('rentbook_auth_phone')) : null;
  if (cachedEmail && cachedEmail.includes('@')) {
    return cachedEmail.toLowerCase().trim();
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    const email = session.user.email.toLowerCase().trim();
    if (typeof window !== 'undefined') localStorage.setItem('rentbook_auth_email', email);
    return email;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    const email = user.email.toLowerCase().trim();
    if (typeof window !== 'undefined') localStorage.setItem('rentbook_auth_email', email);
    return email;
  }
  return null;
}

/**
 * Gets effective user ID for data scoping.
 * Falls back to active auth session if localStorage hasn't loaded yet.
 */
export async function resolveUserId(overrideUid?: string): Promise<string | null> {
  if (overrideUid && !overrideUid.includes('@')) return overrideUid;
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('rentbook_is_demo') === 'true';
  if (isDemo) return null;

  const cachedUid = typeof window !== 'undefined' ? localStorage.getItem('rentbook_auth_uid') : null;
  if (cachedUid) return cachedUid;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    if (typeof window !== 'undefined') localStorage.setItem('rentbook_auth_uid', session.user.id);
    return session.user.id;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    if (typeof window !== 'undefined') localStorage.setItem('rentbook_auth_uid', user.id);
    return user.id;
  }
  return null;
}

export function getActiveUserId(overrideUid?: string): string | null {
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('rentbook_is_demo') === 'true';
  if (isDemo) return null;
  return overrideUid || (typeof window !== 'undefined' ? localStorage.getItem('rentbook_auth_uid') : null);
}

// -------------------------------------------------------------
// Database Mappers: Convert between App Models & Supabase Rows
// -------------------------------------------------------------

export function mapPropertyToRow(settings: Partial<LandlordSettings>, userId: string, overridePropertyId?: string, userEmail?: string) {
  const propertyId = overridePropertyId || settings.propertyId || (userEmail ? `acc-${userEmail}` : `prop-${userId}`);
  return {
    id: propertyId,
    user_id: userId,
    user_email: userEmail ? userEmail.toLowerCase().trim() : null,
    name: settings.propertyName || 'My Building',
    address: settings.propertyAddress || '',
    landlord_name: settings.landlordName || '',
    phone: settings.landlordPhone || '',
    default_electricity_rate: parseFloat(settings.defaultElectricityRate as any) || 8.5,
    billing_strategy: settings.billingStrategy || 'fixed_monthly',
    cycle_start_day: Number(settings.billingCycleDay) || 1,
  };
}

export function mapFloorToRow(floor: Floor, userId: string, overridePropertyId?: string, userEmail?: string) {
  const propertyId = overridePropertyId || floor.propertyId || (userEmail ? `acc-${userEmail}` : (userId ? `prop-${userId}` : ''));
  return {
    id: floor.id,
    user_id: userId,
    user_email: userEmail ? userEmail.toLowerCase().trim() : null,
    property_id: propertyId,
    name: floor.name || `Floor ${floor.order ?? 0}`,
    order_index: Number(floor.order ?? 0),
  };
}

export function mapRowToFloor(row: any): Floor {
  return {
    id: String(row.id),
    propertyId: row.property_id ? String(row.property_id) : undefined,
    name: row.name || `Floor ${row.order_index ?? row.order ?? 0}`,
    order: Number(row.order_index ?? row.order ?? 0),
    userId: row.user_id ? String(row.user_id) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
  };
}

export function mapUnitToRow(unit: Unit, userId: string, userEmail?: string) {
  return {
    id: unit.id,
    user_id: userId,
    user_email: userEmail ? userEmail.toLowerCase().trim() : (unit.userEmail ? unit.userEmail.toLowerCase().trim() : null),
    floor_id: unit.floorId || '',
    name: unit.name || 'Unit',
    status: unit.occupancyStatus || 'vacant',
    rent: Number(unit.monthlyRent || 0),
    deposit_amount: Number(unit.depositAmount ?? (unit as any).deposit_amount ?? 0),
    meter_reading: Number(unit.previousMeterReading ?? unit.meterReading ?? 0),
    meter_reading_image: null,
    tenant_name: unit.tenantName && unit.tenantName.trim() ? unit.tenantName.trim() : null,
    tenant_phone: unit.tenantPhone && unit.tenantPhone.trim() ? unit.tenantPhone.trim() : null,
    move_in_date: unit.moveInDate || (unit as any).move_in_date || null,
    archived_date: unit.archivedDate || null,
    tenancy_history: Array.isArray(unit.tenancyHistory) ? unit.tenancyHistory : [],
  };
}

export function mapRowToUnit(row: any): Unit {
  return {
    id: String(row.id),
    floorId: String(row.floor_id || row.floorId || ''),
    name: row.name || row.unit_name || 'Unit',
    tenantName: row.tenant_name || '',
    tenantPhone: row.tenant_phone || row.phone || '',
    monthlyRent: Number(row.rent ?? row.monthly_rent ?? row.rent_amount ?? 0),
    occupancyStatus: (row.status || row.occupancy_status || 'vacant') as any,
    previousMeterReading: Number(row.meter_reading ?? row.previous_meter_reading ?? 0),
    meterReading: Number(row.meter_reading ?? row.previous_meter_reading ?? 0),
    meterNumber: row.meter_number || undefined,
    depositAmount: Number(row.deposit_amount ?? 0),
    deposit_amount: Number(row.deposit_amount ?? 0),
    moveInDate: row.move_in_date || undefined,
    ...({ move_in_date: row.move_in_date || undefined } as any),
    notes: row.notes || undefined,
    isArchived: Boolean(row.archived_date || row.is_archived),
    isNotForRent: row.status === 'not_for_rent' || Boolean(row.is_not_for_rent),
    archivedDate: row.archived_date || undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
    tenancyHistory: Array.isArray(row.tenancy_history) ? row.tenancy_history : [],
  };
}

export function mapBillToRow(bill: Bill, userId: string, userEmail?: string) {
  return {
    id: bill.id,
    user_id: userId,
    user_email: userEmail ? userEmail.toLowerCase().trim() : (bill.userEmail ? bill.userEmail.toLowerCase().trim() : null),
    unit_id: bill.unitId || '',
    tenant_name: bill.tenantName || '',
    billing_month: bill.billingMonth || '',
    base_rent: Number(bill.baseRent || 0),
    previous_reading: Number(bill.previousReading ?? bill.previous_reading ?? 0),
    current_reading: Number(bill.currentReading ?? bill.current_reading ?? 0),
    electricity_units: Number(bill.unitsConsumed ?? bill.electricityUnits ?? 0),
    electricity_rate: Number(bill.electricityRate || 0),
    electricity_amount: Number(bill.electricityAmount || 0),
    total_amount: Number(bill.totalAmount || 0),
    status: bill.status || 'pending',
    paid_on: bill.paidDate || null,
    payment_mode: bill.paymentMode || null,
    meter_reading_image: bill.meterReadingImage || bill.meterPhotoUrl || null,
  };
}

export function mapRowToBill(row: any, unit?: Unit, floor?: Floor): Bill {
  return {
    id: String(row.id),
    billNumber: row.bill_number || `INV-${String(row.id).slice(0, 6)}`,
    unitId: String(row.unit_id || ''),
    unitName: unit?.name || row.unit_name || 'Unit',
    floorName: floor?.name || row.floor_name || '',
    tenantName: row.tenant_name || unit?.tenantName || '',
    tenantPhone: unit?.tenantPhone || row.tenant_phone || row.phone || '',
    billingMonth: row.billing_month || '',
    generatedDate: row.created_at || row.paid_on || row.generated_date || new Date().toISOString(),
    baseRent: Number(row.base_rent ?? row.rent_amount ?? 0),
    previousReading: Number(row.previous_reading ?? row.previousReading ?? 0),
    currentReading: Number(row.current_reading ?? row.currentReading ?? 0),
    previous_reading: Number(row.previous_reading ?? row.previousReading ?? 0),
    current_reading: Number(row.current_reading ?? row.currentReading ?? 0),
    unitsConsumed: Number(row.electricity_units ?? row.units_consumed ?? 0),
    electricityUnits: Number(row.electricity_units ?? row.units_consumed ?? 0),
    electricityRate: Number(row.electricity_rate ?? row.rate_per_unit ?? 0),
    electricityAmount: Number(row.electricity_amount ?? row.electricity_charge ?? 0),
    otherCharges: Number(row.other_charges ?? 0),
    otherChargesNote: row.other_charges_note || '',
    discount: Number(row.discount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    status: row.status === 'paid' ? 'paid' : 'pending',
    paidDate: row.paid_on || row.paid_date || undefined,
    paymentMode: row.payment_mode || undefined,
    upiId: row.upi_id || '',
    customQrCodeUrl: row.custom_qr_code_url || undefined,
    meterPhotoUrl: row.meter_reading_image || row.meter_photo_url || undefined,
    meterReadingImage: row.meter_reading_image || row.meter_photo_url || undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
  };
}

export function mapSettingsToRow(settings: Partial<LandlordSettings>, userId: string, theme: string = 'dark') {
  return {
    id: 'set-' + userId,
    user_id: userId,
    upi_id: settings.upiId || '',
    qr_code: settings.customQrCodeUrl || null,
    theme: theme || 'dark',
  };
}

// -------------------------------------------------------------
// 1. Supabase Payload Alignment & Saving Functions
// -------------------------------------------------------------

export async function saveProperty(
  settings: Partial<LandlordSettings>,
  userUid?: string,
  overridePropertyId?: string
): Promise<{ success: boolean; propertyId: string; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) {
    console.error('Supabase saveProperty error: No active user session');
    return { success: false, propertyId: '', error: 'No active user session' };
  }

  try {
    const targetPropertyId = overridePropertyId || settings.propertyId || (email ? `acc-${email}` : `prop-${uid}`);

    const payload = {
      id: targetPropertyId,
      user_id: uid,
      user_email: email,
      name: settings.propertyName || 'My Building',
      address: settings.propertyAddress || '',
      landlord_name: settings.landlordName || '',
      phone: settings.landlordPhone || '',
      default_electricity_rate: parseFloat(settings.defaultElectricityRate as any) || 8.5,
      billing_strategy: settings.billingStrategy || 'fixed_monthly',
      cycle_start_day: Number(settings.billingCycleDay) || 1,
    };

    try {
      await supabase.from('properties').upsert(payload, { onConflict: 'id' });
    } catch (_) {}

    if (email) {
      await saveSettings(settings, email);
    }

    return { success: true, propertyId: targetPropertyId };
  } catch (err) {
    console.error('Supabase saveProperty catch error:', err);
    return { success: false, propertyId: overridePropertyId || settings.propertyId || '', error: err };
  }
}
export const savePropertyToSupabase = saveProperty;

export async function saveFloor(
  floor: Floor,
  userUid?: string,
  overridePropertyId?: string
): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return { success: false, error: 'No active user session' };

  const propertyId = overridePropertyId || floor.propertyId || (email ? `acc-${email}` : `prop-${uid}`);

  try {
    const payload = {
      ...mapFloorToRow(floor, uid || '', propertyId, email || undefined),
      property_id: propertyId,
      user_email: email,
    };
    const { error } = await supabase.from('floors').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`Supabase saveFloor error for floor ${floor.id}:`, error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error(`Supabase saveFloor catch error for floor ${floor.id}:`, err);
    return { success: false, error: err };
  }
}
export const saveFloorToSupabase = saveFloor;

export async function saveFloors(
  floors: Floor[],
  propertyId: string,
  userUid?: string
): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return { success: false, error: 'No active user session' };

  const targetPropertyId = propertyId || (email ? `acc-${email}` : `prop-${uid}`);

  try {
    for (const floor of floors) {
      const payload = {
        ...mapFloorToRow(floor, uid || '', targetPropertyId, email || undefined),
        property_id: targetPropertyId,
        user_email: email,
      };
      const { error } = await supabase.from('floors').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Supabase saveFloors error for floor ${floor.id}:`, error);
        return { success: false, error };
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Supabase saveFloors catch error:', err);
    return { success: false, error: err };
  }
}

export async function deleteFloor(floorId: string, userUid?: string): Promise<void> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return;

  try {
    let query = supabase.from('floors').delete().eq('id', floorId);
    if (email) {
      query = query.eq('user_email', email);
    } else if (uid) {
      query = query.eq('user_id', uid);
    }
    const { error } = await query;
    if (error) console.error('Supabase deleteFloor error:', error);
  } catch (err) {
    console.error('Supabase deleteFloor catch error:', err);
  }
}
export const deleteFloorFromSupabase = deleteFloor;

export async function saveUnit(unit: Unit, userUid?: string, userEmail?: string): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail(userEmail);
  if (!uid && !email) return { success: false, error: 'No active user session' };

  try {
    const payload = mapUnitToRow(unit, uid || '', email || undefined);
    const { error } = await supabase.from('units').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`Supabase saveUnit error for unit ${unit.id}:`, error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error(`Supabase saveUnit catch error for unit ${unit.id}:`, err);
    return { success: false, error: err };
  }
}
export const saveUnitToSupabase = saveUnit;

export async function saveUnits(units: Unit[], userUid?: string, userEmail?: string): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail(userEmail);
  if (!uid && !email) return { success: false, error: 'No active user session' };

  try {
    for (const unit of units) {
      const payload = mapUnitToRow(unit, uid || '', email || undefined);
      const { error } = await supabase.from('units').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Supabase saveUnits error for unit ${unit.id}:`, error);
        return { success: false, error };
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Supabase saveUnits catch error:', err);
    return { success: false, error: err };
  }
}

export async function deleteUnit(unitId: string, userUid?: string): Promise<void> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return;

  try {
    let query = supabase.from('units').delete().eq('id', unitId);
    if (email) {
      query = query.eq('user_email', email);
    } else if (uid) {
      query = query.eq('user_id', uid);
    }
    const { error } = await query;
    if (error) console.error('Supabase deleteUnit error:', error);
  } catch (err) {
    console.error('Supabase deleteUnit catch error:', err);
  }
}
export const deleteUnitFromSupabase = deleteUnit;

export async function saveBill(bill: Bill, userUid?: string, userEmail?: string): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail(userEmail);
  if (!uid && !email) return { success: false, error: 'No active user session' };

  try {
    const payload = mapBillToRow(bill, uid || '', email || undefined);
    const { error } = await supabase.from('bills').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`Supabase saveBill error for bill ${bill.id}:`, error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error(`Supabase saveBill catch error for bill ${bill.id}:`, err);
    return { success: false, error: err };
  }
}
export const saveBillToSupabase = saveBill;

export async function saveBills(bills: Bill[], userUid?: string, userEmail?: string): Promise<{ success: boolean; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail(userEmail);
  if (!uid && !email) return { success: false, error: 'No active user session' };

  try {
    for (const bill of bills) {
      const payload = mapBillToRow(bill, uid || '', email || undefined);
      const { error } = await supabase.from('bills').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Supabase saveBills error for bill ${bill.id}:`, error);
        return { success: false, error };
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Supabase saveBills catch error:', err);
    return { success: false, error: err };
  }
}

export async function deleteBill(billId: string, userUid?: string): Promise<void> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return;

  try {
    let query = supabase.from('bills').delete().eq('id', billId);
    if (email) {
      query = query.eq('user_email', email);
    } else if (uid) {
      query = query.eq('user_id', uid);
    }
    const { error } = await query;
    if (error) console.error('Supabase deleteBill error:', error);
  } catch (err) {
    console.error('Supabase deleteBill catch error:', err);
  }
}
export const deleteBillFromSupabase = deleteBill;

/**
 * Upserts settings and landlord profile parameters to the unified `user_accounts` table
 * keyed by `user_email`.
 */
export async function saveSettings(
  settings: Partial<LandlordSettings>,
  userEmailOrUid?: string,
  theme: string = 'dark'
): Promise<{ success: boolean; propertyId: string; data?: LandlordSettings; error?: any }> {
  const name = (settings.landlordName || '').trim();
  const prop = (settings.propertyName || '').trim();
  const upi = (settings.upiId || '').trim();
  if (!name && !prop && !upi) {
    console.warn('saveSettings aborted: empty payload prevented from overwriting user_accounts.');
    return { success: false, propertyId: '', error: 'Empty settings payload aborted to protect data' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const resolvedEmail = (
      (userEmailOrUid && userEmailOrUid.includes('@') ? userEmailOrUid : session?.user?.email) ||
      (typeof window !== 'undefined' ? (localStorage.getItem('rentbook_auth_email') || localStorage.getItem('rentbook_auth_phone')) : null)
    )?.toLowerCase().trim();

    if (!resolvedEmail) {
      console.error('saveSettings error: No authenticated email available');
      return { success: false, propertyId: '', error: 'No authenticated email available' };
    }

    const sessionUserId = session?.user?.id;
    const fallbackUserId = (userEmailOrUid && !userEmailOrUid.includes('@')) ? userEmailOrUid : await resolveUserId();
    const effectiveUserId = sessionUserId || fallbackUserId || null;

    const isValidUuid = typeof effectiveUserId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);

    const accountPayload: Record<string, any> = {
      user_email: resolvedEmail,
      landlord_name: settings.landlordName || '',
      phone: settings.landlordPhone || '',
      property_name: settings.propertyName || 'My Building',
      property_address: settings.propertyAddress || '',
      default_electricity_rate: Number(settings.defaultElectricityRate) || 8.5,
      billing_strategy: settings.billingStrategy || 'fixed_monthly',
      billing_cycle_day: Number(settings.billingCycleDay) || 1,
      upi_id: settings.upiId || '',
      qr_code: settings.customQrCodeUrl || null,
      theme: theme || 'dark',
      updated_at: new Date().toISOString(),
    };

    if (isValidUuid) {
      accountPayload.user_id = effectiveUserId;
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .upsert(accountPayload, { onConflict: 'user_email' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase user_accounts save error:', error);
    }

    if (isValidUuid && effectiveUserId) {
      try {
        await supabase
          .from('landlord_profiles')
          .upsert({
            id: `prof-${effectiveUserId}`,
            user_id: effectiveUserId,
            landlord_name: settings.landlordName || '',
            phone: settings.landlordPhone || '',
            property_name: settings.propertyName || 'My Building',
            property_address: settings.propertyAddress || '',
            default_electricity_rate: Number(settings.defaultElectricityRate) || 8.5,
            billing_strategy: settings.billingStrategy || 'fixed_monthly',
            billing_cycle_day: Number(settings.billingCycleDay) || 1,
            upi_id: settings.upiId || '',
            qr_code: settings.customQrCodeUrl || null,
            theme: theme || 'dark',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (_) {}
    }

    const row = data || accountPayload;
    const payloadResult: Partial<LandlordSettings> = {
      propertyId: row.id || `acc-${resolvedEmail}`,
      landlordName: row.landlord_name,
      landlordPhone: row.phone,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      defaultElectricityRate: Number(row.default_electricity_rate),
      billingStrategy: row.billing_strategy as any,
      billingCycleDay: Number(row.billing_cycle_day),
      upiId: row.upi_id,
      customQrCodeUrl: row.qr_code || undefined,
      upiPayeeName: row.landlord_name || 'Landlord',
      billingStrategyConfigured: true,
      userEmail: resolvedEmail,
    };

    return {
      success: !error,
      propertyId: row.id || `acc-${resolvedEmail}`,
      data: { ...settings, ...payloadResult } as LandlordSettings,
      error,
    };
  } catch (err) {
    console.error('saveSettings catch error:', err);
    return { success: false, propertyId: '', error: err };
  }
}
export const saveSettingsToSupabase = saveSettings;

export async function saveBuildingDataSequentially(
  propertyData: Partial<LandlordSettings>,
  floorsData: Floor[],
  unitsData: Unit[],
  billsData: Bill[] = [],
  userUid?: string,
  theme: string = 'dark'
): Promise<{ success: boolean; propertyId: string; error?: any }> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return { success: false, propertyId: '', error: 'No active user session' };

  try {
    const confirmedPropertyId = propertyData.propertyId || (email ? `acc-${email}` : `prop-${uid}`);

    await saveSettings(propertyData, email || uid || undefined, theme);

    const floorsWithProperty = floorsData.map((f) => ({
      ...f,
      propertyId: confirmedPropertyId,
      userEmail: email || undefined,
    }));
    await saveFloors(floorsWithProperty, confirmedPropertyId, uid || undefined);

    const unitsWithEmail = unitsData.map((u) => ({
      ...u,
      userEmail: email || undefined,
    }));
    await saveUnits(unitsWithEmail, uid || undefined, email || undefined);

    if (billsData.length > 0) {
      const billsWithEmail = billsData.map((b) => ({
        ...b,
        userEmail: email || undefined,
      }));
      await saveBills(billsWithEmail, uid || undefined, email || undefined);
    }

    return { success: true, propertyId: confirmedPropertyId };
  } catch (err) {
    console.error('saveBuildingDataSequentially catch error:', err);
    return { success: false, propertyId: '', error: err };
  }
}

// -------------------------------------------------------------
// 2. Reliable Session Hydration (Load on Sign In)
// -------------------------------------------------------------

export interface HydratedUserData {
  properties: any | null;
  settings: LandlordSettings | null;
  floors: Floor[];
  units: Unit[];
  bills: Bill[];
  theme?: string;
}

export async function fetchUserDataFromSupabase(userEmailOrId?: string): Promise<HydratedUserData | null> {
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('rentbook_is_demo') === 'true';
  if (isDemo) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionEmail = session?.user?.email?.toLowerCase().trim();
    const email = (
      (userEmailOrId && userEmailOrId.includes('@') ? userEmailOrId.toLowerCase().trim() : sessionEmail) ||
      (typeof window !== 'undefined' ? (localStorage.getItem('rentbook_auth_email') || localStorage.getItem('rentbook_auth_phone')) : null)?.toLowerCase().trim()
    );
    const sessionUserId = session?.user?.id || (userEmailOrId && !userEmailOrId.includes('@') ? userEmailOrId : await resolveUserId());

    if (!email && !sessionUserId) return null;

    let accountRows: any[] | null = null;
    if (email) {
      const { data: accData, error: accErr } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_email', email);
      if (accErr) {
        console.error('Supabase fetch user_accounts error:', accErr);
      } else if (accData && accData.length > 0) {
        accountRows = accData;
      }
    }

    if ((!accountRows || accountRows.length === 0) && sessionUserId) {
      const { data: profData } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', sessionUserId);
      if (profData && profData.length > 0) {
        accountRows = profData;
      }
    }

    let floorRows: any[] | null = null;
    let unitRows: any[] | null = null;
    let billRows: any[] | null = null;

    if (email) {
      const [fRes, uRes, bRes] = await Promise.all([
        supabase.from('floors').select('*').eq('user_email', email).order('order_index', { ascending: true }),
        supabase.from('units').select('*').eq('user_email', email),
        supabase.from('bills').select('*').eq('user_email', email),
      ]);
      if (fRes.data && fRes.data.length > 0) floorRows = fRes.data;
      if (uRes.data && uRes.data.length > 0) unitRows = uRes.data;
      if (bRes.data && bRes.data.length > 0) billRows = bRes.data;
    }

    if ((!floorRows || floorRows.length === 0) && sessionUserId) {
      const { data: fData } = await supabase.from('floors').select('*').eq('user_id', sessionUserId).order('order_index', { ascending: true });
      if (fData && fData.length > 0) floorRows = fData;
    }
    if ((!unitRows || unitRows.length === 0) && sessionUserId) {
      const { data: uData } = await supabase.from('units').select('*').eq('user_id', sessionUserId);
      if (uData && uData.length > 0) unitRows = uData;
    }
    if ((!billRows || billRows.length === 0) && sessionUserId) {
      const { data: bData } = await supabase.from('bills').select('*').eq('user_id', sessionUserId);
      if (bData && bData.length > 0) billRows = bData;
    }

    const confirmedPropertyId = (accountRows && accountRows.length > 0 && accountRows[0].id)
      ? String(accountRows[0].id)
      : (email ? `acc-${email}` : (sessionUserId ? `prof-${sessionUserId}` : undefined));

    const floors: Floor[] = (floorRows || []).map((row: any) => {
      const f = mapRowToFloor(row);
      if (!f.propertyId && confirmedPropertyId) {
        f.propertyId = confirmedPropertyId;
      }
      return f;
    });

    const units: Unit[] = (unitRows || []).map(mapRowToUnit);

    const unitMap = new Map<string, Unit>();
    units.forEach((u) => unitMap.set(u.id, u));
    const floorMap = new Map<string, Floor>();
    floors.forEach((f) => floorMap.set(f.id, f));

    const bills: Bill[] = (billRows || []).map((row: any) => {
      const u = unitMap.get(row.unit_id);
      const f = u ? floorMap.get(u.floorId) : undefined;
      return mapRowToBill(row, u, f);
    });

    let settings: LandlordSettings | null = null;
    let theme: string | undefined = undefined;

    if (accountRows && accountRows.length > 0) {
      const row = accountRows[0];
      const strategy = (row.billing_strategy as any) || 'move_in_anniversary';
      settings = {
        propertyId: row.id || `acc-${row.user_email || email || sessionUserId}`,
        propertyName: row.property_name || 'My Building',
        propertyAddress: row.property_address || '',
        landlordName: row.landlord_name || '',
        landlordPhone: row.phone || '',
        defaultElectricityRate: Number(row.default_electricity_rate ?? 8.5),
        billingStrategy: strategy,
        billingCycleDay: Number(row.billing_cycle_day ?? 1),
        billingStrategyConfigured: true,
        upiId: row.upi_id || '',
        upiPayeeName: row.landlord_name || 'Landlord',
        customQrCodeUrl: row.qr_code || undefined,
        currencySymbol: '₹',
        paymentDueDay: 5,
        userEmail: row.user_email || email || undefined,
      };
      theme = row.theme || 'dark';
    }

    return {
      properties: accountRows?.[0] || null,
      settings,
      floors,
      units,
      bills,
      theme,
    };
  } catch (err) {
    console.error('Supabase fetchUserDataFromSupabase catch error:', err);
    return null;
  }
}

export async function uploadInitialDataToSupabase(
  floors: Floor[],
  units: Unit[],
  bills: Bill[],
  settings: LandlordSettings,
  userUid?: string,
  theme: string = 'dark'
): Promise<void> {
  await saveBuildingDataSequentially(settings, floors, units, bills, userUid, theme);
}

export async function purgeUserDataFromSupabase(userUid?: string): Promise<void> {
  const uid = await resolveUserId(userUid);
  const email = await resolveUserEmail();
  if (!uid && !email) return;

  try {
    if (email) {
      await supabase.from('bills').delete().eq('user_email', email);
      await supabase.from('units').delete().eq('user_email', email);
      await supabase.from('floors').delete().eq('user_email', email);
    } else if (uid) {
      await supabase.from('bills').delete().eq('user_id', uid);
      await supabase.from('units').delete().eq('user_id', uid);
      await supabase.from('floors').delete().eq('user_id', uid);
    }
  } catch (err) {
    console.error('Supabase purgeUserData error:', err);
  }
}

export async function deleteAccountFromSupabase(userUid?: string, password?: string): Promise<{ success: boolean; error?: string }> {
  const email = await resolveUserEmail();

  try {
    if (password && email) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (verifyError) {
        return { success: false, error: 'Invalid password. Account deletion aborted.' };
      }
    }

    // Must invoke the database RPC function
    const { error: rpcError } = await supabase.rpc('delete_user_account');
    if (rpcError) {
      console.error('RPC delete error:', rpcError);
      throw rpcError;
    }

    // Immediately sign out
    await supabase.auth.signOut();

    // Clear all browser state
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAccountFromSupabase error:', err);
    throw err;
  }
}