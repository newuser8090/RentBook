export type OccupancyStatus = 'occupied' | 'vacant' | 'not_for_rent' | 'maintenance';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMode = 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
export type BillingCycleStrategy = 'fixed_monthly' | 'move_in_anniversary';

export interface Floor {
  id: string;
  propertyId?: string;
  name: string;
  order: number;
  userId?: string;
  userEmail?: string;
}

export interface TenancyRecord {
  id: string;
  tenantName: string;
  tenantPhone: string;
  monthlyRent: number;
  depositAmount?: number;
  moveInDate: string;
  moveOutDate?: string;
  startingMeterReading: number;
  finalMeterReading?: number;
  notes?: string;
  // Final Move-out Settlement Details
  settlementAmount?: number;
  isRefund?: boolean;
  cleaningDeduction?: number;
  damageDeduction?: number;
  damageDeductions?: number;
  damageDeductionsNote?: string;
  noticeGiven?: boolean;
  unusedPaidDays?: number;
  unusedRentRefund?: number;
  finalPowerUnits?: number;
  finalPowerAmount?: number;
  netSettlementAmount?: number;
  settlementType?: 'refund_to_tenant' | 'tenant_owes' | 'settled_even';
  settledAt?: string;
  moveInPhotoUrl?: string;
  moveOutPhotoUrl?: string;
  moveOutReadingPhotoUrl?: string;
}

export interface Unit {
  id: string;
  floorId: string;
  name: string; // e.g. "Unit 101" or "Flat G-01"
  tenantName: string;
  tenantPhone: string;
  monthlyRent: number;
  occupancyStatus: OccupancyStatus;
  previousMeterReading: number;
  meterNumber?: string;
  depositAmount?: number;
  deposit_amount?: number;
  moveInDate?: string;
  meterReadingImage?: string; // Stored meter reading image (base64 / URL)
  meterReading?: number;
  notes?: string;
  tenancyHistory?: TenancyRecord[];
  isNotForRent?: boolean;
  isArchived?: boolean;
  archivedDate?: string;
  userId?: string;
  userEmail?: string;
}

export interface Bill {
  id: string;
  billNumber?: string;
  unitId: string;
  unitName?: string;
  floorName?: string;
  tenantName: string;
  tenantPhone?: string;
  billingMonth: string;
  generatedDate?: string;
  baseRent: number;
  previousReading?: number;
  currentReading?: number;
  previous_reading?: number;
  current_reading?: number;
  unitsConsumed?: number;
  electricityUnits?: number;
  electricityRate: number;
  electricityAmount: number;
  otherCharges?: number;
  otherChargesNote?: string;
  discount?: number;
  totalAmount: number;
  status: PaymentStatus;
  paidDate?: string;
  paymentMode?: PaymentMode;
  upiId?: string;
  customQrCodeUrl?: string;
  meterPhotoUrl?: string;
  meterReadingImage?: string; // Stored meter reading image (base64 / URL)
  // Proration & Cycle metadata
  isProrated?: boolean;
  proratedDays?: number;
  proratedTotalDays?: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  userId?: string;
  userEmail?: string;
}

export interface LandlordSettings {
  propertyId?: string;
  landlordName: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddress?: string;
  defaultElectricityRate: number;
  upiId: string;
  upiPayeeName: string;
  currencySymbol: string;
  paymentDueDay: number;
  customQrCodeUrl?: string;
  // Billing cycle configuration
  billingStrategy?: BillingCycleStrategy; // 'fixed_monthly' | 'move_in_anniversary'
  billingCycleDay?: number; // 1 to 31 (for fixed_monthly)
  billingStrategyConfigured?: boolean; // whether strategy has been selected by landlord
  userEmail?: string;
}

export interface MoveOutSettlementData {
  unitId: string;
  unitName: string;
  floorName: string;
  tenantName: string;
  tenantPhone: string;
  monthlyRent: number;
  depositAmount: number;
  moveInDate: string;
  moveOutDate: string;
  previousMeterReading: number;
  finalMeterReading: number;
  finalMeterPhotoUrl?: string;
  electricityRate: number;
  powerUnitsConsumed: number;
  finalPowerAmount: number;
  damageDeductions: number;
  damageDeductionsNote: string;
  noticeGiven: boolean;
  isCurrentCycleRentPaid: boolean;
  unusedPaidDays: number;
  unusedRentRefund: number;
  netSettlementAmount: number;
  settlementType: 'refund_to_tenant' | 'tenant_owes' | 'settled_even';
}