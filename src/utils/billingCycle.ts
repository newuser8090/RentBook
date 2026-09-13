import { Floor, Unit, Bill, LandlordSettings, MoveOutSettlementData, BillingCycleStrategy } from '../types';
import { getAppDate } from './appDate';

/**
 * Safely parse any date representation (YYYY-MM-DD, ISO timestamp, Date object)
 * into a local Date without timezone shifting.
 */
export function parseDateParts(dateStr?: string | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const clean = String(dateStr).trim();
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const res = new Date(y, m, d);
    return isNaN(res.getTime()) ? null : res;
  }
  const fallback = new Date(clean);
  if (isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

/**
 * Get total days in a given year and month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates number of days a tenant has stayed.
 */
export function getDaysStayed(
  moveInDateStr?: string, 
  targetDateStr?: string,
  customDate?: Date | string
): number {
  if (!moveInDateStr) return 0;
  try {
    const moveIn = parseDateParts(moveInDateStr);
    if (!moveIn) return 0;

    let target: Date;
    if (targetDateStr) {
      const parsedTarget = parseDateParts(targetDateStr);
      if (!parsedTarget) return 0;
      target = parsedTarget;
    } else {
      target = getAppDate(customDate);
    }

    const d1 = new Date(moveIn.getFullYear(), moveIn.getMonth(), moveIn.getDate());
    const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export function formatDaysStayed(moveInDateStr?: string, customDate?: Date | string): string {
  if (!moveInDateStr) return '';
  const days = getDaysStayed(moveInDateStr, undefined, customDate);
  if (days === 0) return 'Moved in today';
  if (days === 1) return 'Staying for 1 day';
  return `Staying for ${days} days`;
}

/**
 * Returns the tenant's monthly renewal day (1-31) derived from move-in date.
 */
export function getTenantAnniversaryDay(moveInDateStr?: string): number {
  if (!moveInDateStr) return 1;
  try {
    const d = parseDateParts(moveInDateStr);
    return d ? d.getDate() : 1;
  } catch {
    return 1;
  }
}

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:  return `${day}st`;
    case 2:  return `${day}nd`;
    case 3:  return `${day}rd`;
    default: return `${day}th`;
  }
}

export function getFixedCycleLabel(monthNameStr: string, fixedDay = 1, customDate?: Date | string): string {
  try {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const appD = getAppDate(customDate);
    let year = appD.getFullYear();
    let month = appD.getMonth();

    if (monthNameStr) {
      const parts = monthNameStr.trim().split(/\s+/);
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        year = Number(parts[1]);
        const fullIdx = monthNamesFull.findIndex(m => m.toLowerCase().startsWith(parts[0].toLowerCase()));
        if (fullIdx !== -1) {
          month = fullIdx;
        }
      } else {
        const parsed = new Date(monthNameStr);
        if (!isNaN(parsed.getTime())) {
          year = parsed.getFullYear();
          month = parsed.getMonth();
        }
      }
    }

    const monthShort = monthNamesShort[month];

    if (fixedDay === 1) {
      const totalDays = getDaysInMonth(year, month + 1);
      return `1 ${monthShort} – ${totalDays} ${monthShort}`;
    }

    const startTotalDays = getDaysInMonth(year, month + 1);
    const clampedStartDay = Math.min(fixedDay, startTotalDays);

    const nextMonthIndex = (month + 1) % 12;
    const nextMonthShort = monthNamesShort[nextMonthIndex];
    const endDay = clampedStartDay === 1 ? startTotalDays : clampedStartDay - 1;

    return `${clampedStartDay} ${monthShort} – ${endDay} ${nextMonthShort}`;
  } catch {
    return monthNameStr;
  }
}

export function getActiveFixedCycleLabel(fixedDay = 1, customDate?: Date | string): string {
  try {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const appD = getAppDate(customDate);
    const todayDay = appD.getDate();
    const todayMonth = appD.getMonth();
    const todayYear = appD.getFullYear();

    if (fixedDay <= 1) {
      const totalDays = getDaysInMonth(todayYear, todayMonth + 1);
      const monthShort = monthNamesShort[todayMonth];
      return `1 ${monthShort} – ${totalDays} ${monthShort}`;
    }

    if (todayDay >= fixedDay) {
      const startTotalDays = getDaysInMonth(todayYear, todayMonth + 1);
      const clampedStartDay = Math.min(fixedDay, startTotalDays);
      const startMonthShort = monthNamesShort[todayMonth];

      const nextDate = new Date(todayYear, todayMonth + 1, 1);
      const nextYear = nextDate.getFullYear();
      const nextMonth = nextDate.getMonth();
      const nextTotalDays = getDaysInMonth(nextYear, nextMonth + 1);
      const clampedNextDay = Math.min(fixedDay, nextTotalDays);
      const endDay = clampedNextDay === 1 ? nextTotalDays : clampedNextDay - 1;
      const nextMonthShort = monthNamesShort[nextMonth];

      return `${clampedStartDay} ${startMonthShort} – ${endDay} ${nextMonthShort}`;
    }

    const prevDate = new Date(todayYear, todayMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const prevTotalDays = getDaysInMonth(prevYear, prevMonth + 1);
    const clampedStartDay = Math.min(fixedDay, prevTotalDays);
    const startMonthShort = monthNamesShort[prevMonth];

    const thisTotalDays = getDaysInMonth(todayYear, todayMonth + 1);
    const clampedThisDay = Math.min(fixedDay, thisTotalDays);
    const endDay = clampedThisDay === 1 ? thisTotalDays : clampedThisDay - 1;
    const thisMonthShort = monthNamesShort[todayMonth];

    return `${clampedStartDay} ${startMonthShort} – ${endDay} ${thisMonthShort}`;
  } catch {
    return 'Active Cycle';
  }
}

export function getActiveBillingMonthName(fixedDay = 1, customDate?: Date | string): string {
  try {
    const appD = getAppDate(customDate);
    const todayDay = appD.getDate();
    const todayMonth = appD.getMonth();
    const todayYear = appD.getFullYear();

    if (fixedDay > 1 && todayDay < fixedDay) {
      const prevDate = new Date(todayYear, todayMonth - 1, 1);
      return prevDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    return appD.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return 'September 2026';
  }
}

/**
 * Calculates the active individual billing cycle window for a tenant.
 */
export function getTenantIndividualCycleWindow(
  moveInDateStr?: string,
  customDate?: Date | string
): {
  cycleText: string;
  renewsText: string;
  anniversaryDay: number;
  cycleEndDate: Date;
  cycleEndDateFormatted: string;
  daysRemaining: number;
  startMonthName: string;
  startYear: number;
} {
  const dummyDate = new Date();
  if (!moveInDateStr) {
    return {
      cycleText: '',
      renewsText: '',
      anniversaryDay: 1,
      cycleEndDate: dummyDate,
      cycleEndDateFormatted: '',
      daysRemaining: 0,
      startMonthName: '',
      startYear: dummyDate.getFullYear(),
    };
  }

  try {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const moveIn = parseDateParts(moveInDateStr);
    if (!moveIn) {
      return {
        cycleText: '',
        renewsText: '',
        anniversaryDay: 1,
        cycleEndDate: dummyDate,
        cycleEndDateFormatted: '',
        daysRemaining: 0,
        startMonthName: '',
        startYear: dummyDate.getFullYear(),
      };
    }

    const moveInDay = moveIn.getDate();
    const today = getAppDate(customDate);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    let startYear = today.getFullYear();
    let startMonth = today.getMonth();
    const todayDay = today.getDate();

    if (todayDay < moveInDay) {
      const prevDate = new Date(startYear, startMonth - 1, 1);
      startYear = prevDate.getFullYear();
      startMonth = prevDate.getMonth();
    }

    const moveInYear = moveIn.getFullYear();
    const moveInMonth = moveIn.getMonth();
    if (startYear < moveInYear || (startYear === moveInYear && startMonth < moveInMonth)) {
      startYear = moveInYear;
      startMonth = moveInMonth;
    }

    const startTotalDays = getDaysInMonth(startYear, startMonth + 1);
    const clampedStartDay = Math.min(moveInDay, startTotalDays);
    const startMonthShort = monthNamesShort[startMonth];

    const nextDate = new Date(startYear, startMonth + 1, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth();
    const nextTotalDays = getDaysInMonth(nextYear, nextMonth + 1);
    const clampedNextDay = Math.min(moveInDay, nextTotalDays);
    const endDay = clampedNextDay === 1 ? nextTotalDays : clampedNextDay - 1;
    const nextMonthShort = monthNamesShort[nextMonth];

    const cycleText = `${clampedStartDay} ${startMonthShort} – ${endDay} ${nextMonthShort}`;
    const renewsText = `Renews on ${getOrdinalSuffix(moveInDay)}`;

    const cycleEndDate = new Date(nextYear, nextMonth, clampedNextDay);
    const diffMs = cycleEndDate.getTime() - todayMidnight.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const cycleEndDateFormatted = `${clampedNextDay} ${nextMonthShort}`;

    return {
      cycleText,
      renewsText,
      anniversaryDay: moveInDay,
      cycleEndDate,
      cycleEndDateFormatted,
      daysRemaining,
      startMonthName: monthNamesFull[startMonth],
      startYear,
    };
  } catch {
    return {
      cycleText: '',
      renewsText: '',
      anniversaryDay: 1,
      cycleEndDate: dummyDate,
      cycleEndDateFormatted: '',
      daysRemaining: 0,
      startMonthName: '',
      startYear: dummyDate.getFullYear(),
    };
  }
}

export interface DueSoonUnitInfo {
  unit: Unit;
  floorName: string;
  tenantName: string;
  roomName: string;
  cycleEndDate: Date;
  cycleEndDateFormatted: string;
  daysRemaining: number;
  daysRemainingText: string;
  dueAlertText: string;
  statusBadge: 'UPCOMING' | 'CYCLE ENDED' | 'OVERDUE';
  statusType: 'due_soon' | 'due_today' | 'overdue';
  isUnlocked: boolean;
  billUnlocksOnText: string;
  activeCycleText: string;
  upcomingCycleText: string;
  monthlyRent: number;
  previousReading: number;
}

export interface IndividualCycleStatus {
  anniversaryDay: number;
  renewalDate: Date;
  renewalDateFormatted: string;
  daysRemaining: number;
  isUnlocked: boolean;
  statusBadge: 'UPCOMING' | 'CYCLE ENDED' | 'OVERDUE';
  dueAlertText: string;
  unlocksOnText: string;
  activeCycleText: string;
  upcomingCycleText: string;
}

export function getIndividualCycleStatus(
  moveInDateStr?: string,
  customDate?: Date | string
): IndividualCycleStatus | null {
  if (!moveInDateStr) return null;
  try {
    const anniversaryDay = getTenantAnniversaryDay(moveInDateStr);
    const today = getAppDate(customDate);
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayMidnight = new Date(todayYear, todayMonth, todayDay);
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const clampedTargetDay = Math.min(anniversaryDay, getDaysInMonth(todayYear, todayMonth + 1));
    const cycleEndDate = new Date(todayYear, todayMonth, clampedTargetDay);
    const diffMs = cycleEndDate.getTime() - todayMidnight.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const renewalDateFormatted = `${clampedTargetDay} ${monthNamesShort[todayMonth]}`;

    let statusBadge: 'UPCOMING' | 'CYCLE ENDED' | 'OVERDUE' = 'UPCOMING';
    let dueAlertText = `Due in ${daysRemaining} days`;

    if (daysRemaining > 0) {
      statusBadge = 'UPCOMING';
      dueAlertText = daysRemaining === 1 ? 'Due tomorrow' : `Due in ${daysRemaining} days`;
    } else if (daysRemaining === 0) {
      statusBadge = 'CYCLE ENDED';
      dueAlertText = 'Due Today';
    } else {
      statusBadge = 'OVERDUE';
      const daysOverdue = Math.abs(daysRemaining);
      dueAlertText = daysOverdue === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOverdue} days`;
    }

    const individual = getTenantIndividualCycleWindow(moveInDateStr, customDate);

    const nextDate = new Date(todayYear, todayMonth + 1, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth();
    const nextTotalDays = getDaysInMonth(nextYear, nextMonth + 1);
    const clampedNextDay = Math.min(anniversaryDay, nextTotalDays);
    const endDay = clampedNextDay === 1 ? nextTotalDays : clampedNextDay - 1;
    const upcomingCycleText = `${clampedTargetDay} ${monthNamesShort[todayMonth]} – ${endDay} ${monthNamesShort[nextMonth]}`;

    return {
      anniversaryDay,
      renewalDate: cycleEndDate,
      renewalDateFormatted,
      daysRemaining,
      isUnlocked: daysRemaining <= 0,
      statusBadge,
      dueAlertText,
      unlocksOnText: `Bill unlocks on ${renewalDateFormatted}`,
      activeCycleText: individual.cycleText,
      upcomingCycleText,
    };
  } catch {
    return null;
  }
}

export function getDueSoonUnitsForIndividualMode(
  units: Unit[],
  bills: Bill[],
  floors: Floor[] = [],
  customDate?: Date | string
): DueSoonUnitInfo[] {
  const today = getAppDate(customDate);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const results: DueSoonUnitInfo[] = [];

  for (const unit of units) {
    const moveInStr = unit.moveInDate || (unit as any).move_in_date;
    if (unit.occupancyStatus !== 'occupied' || !moveInStr || !unit.tenantName) {
      continue;
    }

    const anniversaryDay = getTenantAnniversaryDay(moveInStr);
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const floor = floors.find((f) => f.id === unit.floorId);
    const floorName = floor?.name || 'Main Floor';

    if (todayDay < anniversaryDay) {
      const clampedTargetDay = Math.min(anniversaryDay, getDaysInMonth(todayYear, todayMonth + 1));
      const cycleEndDate = new Date(todayYear, todayMonth, clampedTargetDay);
      const diffMs = cycleEndDate.getTime() - todayMidnight.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 5 && daysRemaining >= 0) {
        const nextDate = new Date(todayYear, todayMonth + 1, 1);
        const nextYear = nextDate.getFullYear();
        const nextMonth = nextDate.getMonth();
        const nextTotalDays = getDaysInMonth(nextYear, nextMonth + 1);
        const clampedNextDay = Math.min(anniversaryDay, nextTotalDays);
        const endDay = clampedNextDay === 1 ? nextTotalDays : clampedNextDay - 1;
        const upcomingCycleText = `${clampedTargetDay} ${monthNamesShort[todayMonth]} – ${endDay} ${monthNamesShort[nextMonth]}`;

        const upcomingBillExists = bills.some(
          (b) => b.unitId === unit.id && b.billingMonth?.toLowerCase().trim() === upcomingCycleText.toLowerCase().trim()
        );

        if (!upcomingBillExists) {
          const daysText = daysRemaining === 0 
            ? 'Ends today' 
            : daysRemaining === 1 
              ? 'In 1 day' 
              : `In ${daysRemaining} days`;

          const dueAlertText = daysRemaining === 0
            ? 'Due Today'
            : daysRemaining === 1
              ? 'Due in 1 day'
              : `Due in ${daysRemaining} days`;

          const renewalDateFormatted = `${clampedTargetDay} ${monthNamesShort[todayMonth]}`;

          results.push({
            unit,
            floorName,
            tenantName: unit.tenantName,
            roomName: unit.name,
            cycleEndDate,
            cycleEndDateFormatted: renewalDateFormatted,
            daysRemaining,
            daysRemainingText: `Ends ${renewalDateFormatted} • ${daysText}`,
            dueAlertText,
            statusBadge: daysRemaining === 0 ? 'CYCLE ENDED' : 'UPCOMING',
            statusType: daysRemaining === 0 ? 'due_today' : 'due_soon',
            isUnlocked: daysRemaining <= 0,
            billUnlocksOnText: `Bill unlocks on ${renewalDateFormatted}`,
            activeCycleText: getTenantIndividualCycleWindow(moveInStr, customDate).cycleText,
            upcomingCycleText,
            monthlyRent: unit.monthlyRent,
            previousReading: unit.previousMeterReading,
          });
        }
      }
    } else {
      const individual = getTenantIndividualCycleWindow(moveInStr, customDate);
      const currentTenant = unit.tenantName?.trim().toLowerCase();
      const hasBillForActive = bills.some(
        (b) =>
          b.unitId === unit.id &&
          b.tenantName &&
          b.tenantName.trim().toLowerCase() === currentTenant &&
          b.billingMonth?.toLowerCase().trim() === individual.cycleText.toLowerCase().trim()
      );

      if (!hasBillForActive) {
        const clampedDay = Math.min(anniversaryDay, getDaysInMonth(todayYear, todayMonth + 1));
        const cycleEndDate = new Date(todayYear, todayMonth, clampedDay);
        const daysPassed = Math.round((todayMidnight.getTime() - cycleEndDate.getTime()) / (1000 * 60 * 60 * 24));
        const renewalDateFormatted = `${clampedDay} ${monthNamesShort[todayMonth]}`;

        results.push({
          unit,
          floorName,
          tenantName: unit.tenantName,
          roomName: unit.name,
          cycleEndDate,
          cycleEndDateFormatted: renewalDateFormatted,
          daysRemaining: -daysPassed,
          daysRemainingText: daysPassed === 0 
            ? `Ends ${renewalDateFormatted} • Ends today` 
            : `Ends ${renewalDateFormatted} • Due now`,
          dueAlertText: daysPassed === 0 ? 'Due Today' : `Overdue by ${daysPassed} day${daysPassed === 1 ? '' : 's'}`,
          statusBadge: daysPassed === 0 ? 'CYCLE ENDED' : 'OVERDUE',
          statusType: daysPassed === 0 ? 'due_today' : 'overdue',
          isUnlocked: true,
          billUnlocksOnText: daysPassed === 0 ? 'Bill unlocked today' : 'Bill overdue',
          activeCycleText: individual.cycleText,
          upcomingCycleText: individual.cycleText,
          monthlyRent: unit.monthlyRent,
          previousReading: unit.previousMeterReading,
        });
      }
    }
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function isAnniversaryBillUnlocked(moveInDateStr?: string, customDate?: Date | string): boolean {
  if (!moveInDateStr) return true;
  try {
    const status = getIndividualCycleStatus(moveInDateStr, customDate);
    return status ? status.isUnlocked : true;
  } catch {
    return true;
  }
}

export function checkProratedFirstMonth(
  unitOrMoveInDate?: Unit | string,
  billingMonthOrRent?: string | number,
  billingStrategyOrCycleDay: BillingCycleStrategy | number = 'fixed_monthly',
  cycleDayArg: number = 1,
  customDate?: Date | string
): {
  isProrated: boolean;
  proratedDays: number;
  totalDaysInMonth: number;
  proratedRent: number;
  fullRent: number;
} {
  let moveInDateStr: string | undefined;
  let fullRent = 0;
  let billingMonth = getAppDate(customDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  let billingCycleDay = 1;
  let strategy: BillingCycleStrategy = 'fixed_monthly';

  if (unitOrMoveInDate && typeof unitOrMoveInDate === 'object') {
    moveInDateStr = unitOrMoveInDate.moveInDate || (unitOrMoveInDate as any).move_in_date;
    fullRent = unitOrMoveInDate.monthlyRent || 0;
    if (typeof billingMonthOrRent === 'string') {
      billingMonth = billingMonthOrRent;
    }
    if (typeof billingStrategyOrCycleDay === 'string') {
      strategy = billingStrategyOrCycleDay as BillingCycleStrategy;
    } else if (typeof billingStrategyOrCycleDay === 'number') {
      billingCycleDay = billingStrategyOrCycleDay;
    }
    if (typeof cycleDayArg === 'number') {
      billingCycleDay = cycleDayArg;
    }
  } else if (typeof unitOrMoveInDate === 'string') {
    moveInDateStr = unitOrMoveInDate;
    fullRent = typeof billingMonthOrRent === 'number' ? billingMonthOrRent : 0;
    if (typeof billingStrategyOrCycleDay === 'string') {
      strategy = billingStrategyOrCycleDay as BillingCycleStrategy;
    } else if (typeof billingStrategyOrCycleDay === 'number') {
      billingCycleDay = billingStrategyOrCycleDay;
    }
    if (typeof cycleDayArg === 'number') {
      billingCycleDay = cycleDayArg;
    }
  }

  if (strategy === 'move_in_anniversary') {
    return { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: fullRent, fullRent };
  }

  if (!moveInDateStr || fullRent <= 0) {
    return { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: fullRent, fullRent };
  }

  try {
    const parsedMonth = new Date(`${billingMonth} 1`);
    if (isNaN(parsedMonth.getTime())) {
      return { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: fullRent, fullRent };
    }

    const targetYear = parsedMonth.getFullYear();
    const targetMonth = parsedMonth.getMonth();

    const startTotalDays = getDaysInMonth(targetYear, targetMonth + 1);
    const clampedStartDay = Math.min(billingCycleDay, startTotalDays);
    const cycleStartDate = new Date(targetYear, targetMonth, clampedStartDay);

    let cycleEndDate: Date;
    if (billingCycleDay === 1) {
      cycleEndDate = new Date(targetYear, targetMonth, startTotalDays);
    } else {
      const nextMonthDate = new Date(targetYear, targetMonth + 1, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth();
      const nextTotalDays = getDaysInMonth(nextYear, nextMonth + 1);
      const clampedNextStartDay = Math.min(billingCycleDay, nextTotalDays);
      const endDay = clampedNextStartDay === 1 ? nextTotalDays : clampedNextStartDay - 1;
      cycleEndDate = new Date(nextYear, nextMonth, endDay);
    }

    const totalDaysInCycle = Math.round(
      (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const moveInDate = parseDateParts(moveInDateStr);
    if (!moveInDate) {
      return { isProrated: false, proratedDays: 0, totalDaysInMonth: totalDaysInCycle, proratedRent: fullRent, fullRent };
    }

    const moveInTime = moveInDate.getTime();
    const startTime = cycleStartDate.getTime();
    const endTime = cycleEndDate.getTime();

    if (moveInTime > startTime && moveInTime <= endTime) {
      const remainingDays = Math.round((endTime - moveInTime) / (1000 * 60 * 60 * 24)) + 1;
      const dailyRate = fullRent / totalDaysInCycle;
      const proratedRent = Math.round(dailyRate * remainingDays);

      return {
        isProrated: true,
        proratedDays: remainingDays,
        totalDaysInMonth: totalDaysInCycle,
        proratedRent,
        fullRent,
      };
    }
  } catch {
    // fallback
  }

  return { isProrated: false, proratedDays: 0, totalDaysInMonth: 30, proratedRent: fullRent, fullRent };
}

export interface MoveOutCalculationParams {
  depositAmount: number;
  previousReading: number;
  finalReading: number;
  electricityRate: number;
  unpaidDues?: number;
  cleaningDeductions?: number;
  damageDeductions?: number;
  noticePenalty?: number;
}

export interface MoveOutCalculationResult {
  electricityUnitsUsed: number;
  electricityCost: number;
  totalDeductions: number;
  netAmount: number;
  isRefund: boolean;
  settlementType: 'refund_to_tenant' | 'tenant_owes' | 'settled_even';
}

export function computeMoveOutSettlement(params: MoveOutCalculationParams): MoveOutCalculationResult {
  const {
    depositAmount = 0,
    previousReading = 0,
    finalReading = 0,
    electricityRate = 8,
    unpaidDues = 0,
    cleaningDeductions = 0,
    damageDeductions = 0,
    noticePenalty = 0,
  } = params;

  const safeDeposit = Math.round(depositAmount);
  const safeUnpaidDues = Math.round(unpaidDues);
  const safeCleaning = Math.round(cleaningDeductions);
  const safeDamage = Math.round(damageDeductions);
  const safeNoticePenalty = Math.round(noticePenalty);

  const safeFinal = Math.max(previousReading, finalReading);
  const electricityUnitsUsed = safeFinal - previousReading;
  const electricityCost = Math.round(electricityUnitsUsed * electricityRate);

  const totalDeductions = Math.round(
    electricityCost + safeUnpaidDues + safeCleaning + safeDamage + safeNoticePenalty
  );
  const rawBalance = Math.round(safeDeposit - totalDeductions);

  const isRefund = rawBalance >= 0;
  const netAmount = Math.round(Math.abs(rawBalance));
  const settlementType: 'refund_to_tenant' | 'tenant_owes' | 'settled_even' = 
    rawBalance > 0 ? 'refund_to_tenant' : rawBalance < 0 ? 'tenant_owes' : 'settled_even';

  return {
    electricityUnitsUsed,
    electricityCost,
    totalDeductions,
    netAmount,
    isRefund,
    settlementType,
  };
}

/**
 * Accurately finds the bill associated with a unit for its current active billing cycle.
 */
export function findActiveBillForUnit(
  unit: Unit,
  bills: Bill[],
  strategy: BillingCycleStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  selectedMonth?: string,
  customDate?: Date | string
): Bill | undefined {
  if (!unit || unit.occupancyStatus !== 'occupied') return undefined;

  const currentTenant = unit.tenantName?.trim().toLowerCase();
  if (!currentTenant) return undefined;

  const unitBills = bills.filter(
    (b) =>
      b.unitId === unit.id &&
      b.tenantName &&
      b.tenantName.trim().toLowerCase() === currentTenant
  );
  if (unitBills.length === 0) return undefined;

  const moveInDateStr = unit.moveInDate || (unit as any).move_in_date;

  if (strategy === 'move_in_anniversary') {
    if (moveInDateStr) {
      const individual = getTenantIndividualCycleWindow(moveInDateStr, customDate);
      const targetCycleText = individual.cycleText.toLowerCase().trim();

      // 1. Direct match on billingMonth string (e.g. "12 Sep – 11 Oct")
      const directMatch = unitBills.find((b) => 
        b.billingMonth && b.billingMonth.toLowerCase().trim() === targetCycleText
      );
      if (directMatch) return directMatch;

      // 2. Match on start month name & year (e.g. "September 2026")
      const startMonth = individual.startMonthName ? individual.startMonthName.toLowerCase() : '';
      const startYear = individual.startYear ? String(individual.startYear) : '';
      if (startMonth && startYear) {
        const looseMatch = unitBills.find((b) => {
          if (!b.billingMonth) return false;
          const bm = b.billingMonth.toLowerCase().trim();
          return bm === `${startMonth} ${startYear}` || (bm.includes(startMonth) && bm.includes(startYear));
        });
        if (looseMatch) return looseMatch;
      }
    }

    // Defensive fallback: return the latest bill generated for this unit
    return unitBills[unitBills.length - 1];
  }

  // Fixed Monthly Strategy
  const activeCycleLabel = getActiveFixedCycleLabel(billingCycleDay, customDate);
  const activeMonthName = getActiveBillingMonthName(billingCycleDay, customDate);
  const currMonth = selectedMonth || activeMonthName;
  const fixedCycleLabel = getFixedCycleLabel(currMonth, billingCycleDay, customDate);

  const match = unitBills.find(
    (b) => b.billingMonth === currMonth || b.billingMonth === fixedCycleLabel || b.billingMonth === activeCycleLabel
  );
  if (match) return match;

  const monthNameFirstWord = currMonth.split(' ')[0].toLowerCase();
  const loose = unitBills.find((b) => {
    if (!b.billingMonth) return false;
    const bm = b.billingMonth.toLowerCase();
    return bm.includes(monthNameFirstWord);
  });
  if (loose) return loose;

  return undefined;
}

export function hasActiveInvoiceForCurrentCycle(
  unit: Unit,
  bills: Bill[],
  strategy: BillingCycleStrategy = 'fixed_monthly',
  billingCycleDay = 1,
  selectedMonth?: string,
  customDate?: Date | string
): boolean {
  return !!findActiveBillForUnit(unit, bills, strategy, billingCycleDay, selectedMonth, customDate);
}