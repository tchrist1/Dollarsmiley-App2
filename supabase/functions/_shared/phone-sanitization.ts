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

/**
 * Validates that text does not contain phone numbers
 * Returns an error message if phone numbers are detected
 */
export function validateNoPhoneNumbers(
  text: string | null | undefined,
  fieldName: string = 'text'
): { valid: boolean; error?: string } {
  if (!text || text.trim() === '') {
    return { valid: true };
  }

  if (detectPhoneNumbers(text)) {
    return {
      valid: false,
      error: `Phone numbers are not allowed in ${fieldName}. Please remove any contact information.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes multiple text fields
 */
export function sanitizeTextFields(
  fields: Record<string, string | null | undefined>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    sanitized[key] = sanitizePhoneNumbers(value);
  }

  return sanitized;
}

/**
 * Audit logging interface
 */
export interface PhoneSanitizationAudit {
  recordType: 'job' | 'service' | 'bio' | 'message' | 'other';
  recordId?: string;
  userId?: string;
  phoneNumberDetected: boolean;
  context?: string;
}

/**
 * Creates an audit log entry
 * Note: This should be called after sanitization, not before
 */
export async function logPhoneDetection(
  supabaseClient: any,
  audit: PhoneSanitizationAudit
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('phone_sanitization_audit')
      .insert({
        record_type: audit.recordType,
        record_id: audit.recordId || null,
        user_id: audit.userId || null,
        phone_number_detected: audit.phoneNumberDetected,
        context: audit.context || null,
      });

    if (error) {
      console.error('Failed to log phone detection:', error);
    }
  } catch (err) {
    console.error('Error logging phone detection:', err);
  }
}

/**
 * Middleware function for Edge Functions
 * Automatically sanitizes specified fields in request body
 */
export function createPhoneSanitizationMiddleware(
  fieldsToSanitize: string[]
) {
  return (body: Record<string, any>): Record<string, any> => {
    const sanitized = { ...body };

    for (const field of fieldsToSanitize) {
      if (field in sanitized && typeof sanitized[field] === 'string') {
        const detected = detectPhoneNumbers(sanitized[field]);

        if (detected) {
          sanitized[field] = sanitizePhoneNumbers(sanitized[field]);

          // Mark that sanitization occurred
          if (!sanitized._phoneSanitizationApplied) {
            sanitized._phoneSanitizationApplied = [];
          }
          sanitized._phoneSanitizationApplied.push(field);
        }
      }
    }

    return sanitized;
  };
}
