/**
 * Phone Number Sanitization Utility
 *
 * Detects and removes phone numbers from text to prevent off-platform contact.
 * Supports international and US phone number formats.
 */

/**
 * Phone number regex pattern
 * Matches:
 * - 1234567890
 * - 123-456-7890
 * - (123) 456-7890
 * - +1 123 456 7890
 * - +44 20 7946 0958
 * - +234 803 123 4567
 * - 123.456.7890
 * - 123 456 7890
 */
const PHONE_PATTERN = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

/**
 * Detects if text contains phone numbers
 */
export function detectPhoneNumbers(text: string | null | undefined): boolean {
  if (!text || text.trim() === '') {
    return false;
  }

  return PHONE_PATTERN.test(text);
}

/**
 * Extracts all phone numbers from text
 */
export function extractPhoneNumbers(text: string | null | undefined): string[] {
  if (!text || text.trim() === '') {
    return [];
  }

  const matches = text.match(PHONE_PATTERN);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Removes phone numbers from text
 */
export function sanitizePhoneNumbers(text: string | null | undefined): string {
  if (!text || text.trim() === '') {
    return text || '';
  }

  return text.replace(PHONE_PATTERN, '[phone number removed]');
}
