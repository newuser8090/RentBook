/**
 * Standard Application Date Utilities for RentBook.
 * Uses real system Date across the entire application.
 */

/**
 * Returns the effective Date object (standard real Date, or customDate if explicitly provided).
 */
export function getAppDate(customDate?: Date | string | null): Date {
  if (customDate) {
    if (typeof customDate === 'string') {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      }
      const d = new Date(customDate);
      if (!isNaN(d.getTime())) return d;
    } else if (customDate instanceof Date && !isNaN(customDate.getTime())) {
      return customDate;
    }
  }
  return new Date();
}

/**
 * Returns effective date formatted as YYYY-MM-DD using standard current date.
 */
export function getAppDateISO(customDate?: Date | string | null): string {
  const d = getAppDate(customDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object or ISO string to readable format e.g. "17 Aug 2026"
 */
export function formatAppDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

