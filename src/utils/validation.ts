/**
 * Phone and Form Validation Utilities for Indian Mobile Numbers (+91)
 */

/**
 * Strips all non-digit characters and limits length to 10 digits
 */
export function cleanPhoneDigits(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Validates whether a given string is a valid 10-digit Indian mobile number.
 * Must start with 6, 7, 8, or 9 and have exactly 10 digits.
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = cleanPhoneDigits(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Returns a human-friendly validation error or null if valid.
 */
export function getPhoneValidationError(phone: string, isRequired = true): string | null {
  const digits = cleanPhoneDigits(phone);
  if (!digits) {
    return isRequired ? 'Phone number is required' : null;
  }
  if (digits.length < 10) {
    return 'Phone number must be exactly 10 digits';
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Phone number must start with 6, 7, 8, or 9';
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return 'Please enter a valid 10-digit mobile number';
  }
  return null;
}

/**
 * Formats a 10-digit phone for clean UI display (e.g. +91 98765 43210)
 */
export function formatPhoneWithCountryCode(phone: string): string {
  const digits = cleanPhoneDigits(phone);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}
