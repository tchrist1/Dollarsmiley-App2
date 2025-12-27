# Phone Number Sanitization System

## Overview

The Phone Number Sanitization System enforces marketplace integrity by automatically detecting and removing phone numbers from user-generated content across the platform. This prevents off-platform contact and protects revenue.

## Key Features

- **Global Enforcement**: Automatically sanitizes phone numbers from jobs, service listings, and all customer-facing content
- **Provider Bio Exception**: Provider bios may contain phone numbers, which are extracted and stored for admin access only
- **Server-Side Enforcement**: All sanitization is enforced at the database level via triggers
- **Admin Visibility**: Platform administrators can view extracted phone numbers for moderation and compliance
- **Audit Logging**: All phone number detection is logged for security and compliance monitoring

## Architecture

### Database Layer

**Tables:**
- `phone_sanitization_audit` - Audit log for phone number detection
- `profiles` - Extended with `provider_contact_numbers` and `original_bio_with_phones` columns

**Functions:**
- `detect_phone_numbers(text)` - Returns boolean if text contains phone numbers
- `extract_phone_numbers(text)` - Returns array of phone numbers found in text
- `sanitize_phone_numbers(text)` - Removes phone numbers from text
- `audit_phone_detection(...)` - Logs phone number detection events

**Triggers:**
- `trigger_sanitize_job_phone_numbers` - Auto-sanitizes job titles and descriptions
- `trigger_sanitize_service_phone_numbers` - Auto-sanitizes service listing titles and descriptions
- `trigger_sanitize_provider_bio` - Extracts and sanitizes phone numbers from provider bios

### Edge Functions

**validate-content**
- Validates text before submission
- Optionally returns sanitized text
- Endpoint: `/functions/v1/validate-content`
- Method: POST
- Requires: JWT authentication

**admin-view-contact-numbers**
- Admin-only access to extracted phone numbers
- View provider contact information
- Access phone sanitization audit logs
- Endpoint: `/functions/v1/admin-view-contact-numbers`
- Methods: GET (list/view), POST (audit logs)
- Requires: JWT authentication + Admin role

## Supported Phone Number Formats

The system detects and removes phone numbers in the following formats:

- `1234567890`
- `123-456-7890`
- `(123) 456-7890`
- `+1 123 456 7890`
- `+44 20 7946 0958`
- `+234 803 123 4567`
- `123.456.7890`
- `123 456 7890`

## Where Sanitization Applies

### Automatically Sanitized (Global)

Phone numbers are **automatically removed** from:

- Job titles
- Job descriptions
- Service listing titles
- Service listing descriptions
- All customer-facing text fields

### Exception: Provider Bios

Provider bios are treated specially:
- Phone numbers **are allowed** to be submitted
- Phone numbers are **extracted** and stored in `provider_contact_numbers`
- Original bio is stored in `original_bio_with_phones` (admin-only)
- Public-facing bio has phone numbers **removed**
- Only **platform administrators** can view extracted phone numbers

## How It Works

### 1. Job/Service Creation

```
User submits job/service with phone number in description
    ↓
Database trigger fires BEFORE INSERT/UPDATE
    ↓
Phone numbers detected → Logged to audit table
    ↓
Phone numbers removed → Text sanitized
    ↓
Sanitized record saved to database
```

### 2. Provider Bio Update

```
Provider updates bio with phone number
    ↓
Database trigger fires BEFORE INSERT/UPDATE
    ↓
Phone numbers detected → Logged to audit table
    ↓
Phone numbers extracted → Saved to provider_contact_numbers
    ↓
Original bio saved → Stored in original_bio_with_phones
    ↓
Phone numbers removed from public bio → Text sanitized
    ↓
Sanitized bio saved for public view
```

## API Usage

### Validate Content (Client-Side Validation)

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/validate-content`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: userInput,
      fieldName: 'job description',
      autoSanitize: true,
    }),
  }
);

const result = await response.json();

if (result.hasPhoneNumbers) {
  alert(result.message);
  // Optionally use result.sanitizedText
}
```

### View Extracted Phone Numbers (Admin Only)

```typescript
// Get specific provider's contact numbers
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/admin-view-contact-numbers?providerId=${id}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminSession.access_token}`,
    },
  }
);

const data = await response.json();
console.log(data.provider.contact_numbers);
console.log(data.provider.original_bio);

// Get audit logs
const auditResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/admin-view-contact-numbers`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSession.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recordType: 'job', // or 'service', 'bio'
      limit: 100,
    }),
  }
);

const auditData = await auditResponse.json();
console.log(auditData.audit_logs);
```

## Security & Privacy

### Row-Level Security (RLS)

- **phone_sanitization_audit**: Only admins can read audit logs
- **profiles.provider_contact_numbers**: Admin-only column (enforced via application layer)
- **profiles.original_bio_with_phones**: Admin-only column (enforced via application layer)

### Data Protection

- Phone numbers are **never** exposed in public APIs
- Provider contact numbers are **never** returned to non-admin users
- Original bios with phone numbers are **stored separately** from public bios
- All phone detection events are **logged** for compliance

### Admin Access Control

Only users with `user_type = 'Admin'` can:
- View extracted phone numbers
- Access original provider bios with phone numbers
- Read phone sanitization audit logs

## Testing

### Test Phone Detection

```sql
-- Test phone number detection
SELECT detect_phone_numbers('Call me at 555-123-4567');
-- Returns: true

SELECT detect_phone_numbers('No phone number here');
-- Returns: false
```

### Test Phone Extraction

```sql
-- Test phone number extraction
SELECT extract_phone_numbers('Call 555-123-4567 or +1-555-987-6543');
-- Returns: {555-123-4567,+1-555-987-6543}
```

### Test Phone Sanitization

```sql
-- Test phone number sanitization
SELECT sanitize_phone_numbers('Call me at 555-123-4567 for details');
-- Returns: 'Call me at [phone number removed] for details'
```

### Test Job Sanitization

```sql
-- Insert job with phone number
INSERT INTO jobs (customer_id, category_id, title, description, status)
VALUES (
  'user-uuid',
  'category-uuid',
  'Need plumber ASAP 555-1234',
  'Call me at (555) 123-4567 to discuss',
  'Open'
);

-- Verify sanitization occurred
SELECT title, description FROM jobs WHERE id = 'job-uuid';
-- title: 'Need plumber ASAP [phone number removed]'
-- description: 'Call me at [phone number removed] to discuss'
```

### Test Provider Bio Extraction

```sql
-- Update provider bio with phone number
UPDATE profiles
SET bio = 'Professional plumber. Call 555-123-4567 for emergencies.'
WHERE id = 'provider-uuid';

-- Check public bio (sanitized)
SELECT bio FROM profiles WHERE id = 'provider-uuid';
-- Returns: 'Professional plumber. Call [phone number removed] for emergencies.'

-- Check admin-only fields (as admin)
SELECT provider_contact_numbers, original_bio_with_phones
FROM profiles
WHERE id = 'provider-uuid';
-- provider_contact_numbers: {555-123-4567}
-- original_bio_with_phones: 'Professional plumber. Call 555-123-4567 for emergencies.'
```

## Monitoring & Maintenance

### View Recent Phone Detection Events

```sql
SELECT *
FROM phone_sanitization_audit
WHERE phone_number_detected = true
ORDER BY created_at DESC
LIMIT 50;
```

### View Providers with Contact Numbers

```sql
SELECT id, full_name, email, provider_contact_numbers
FROM profiles
WHERE provider_contact_numbers IS NOT NULL
ORDER BY created_at DESC;
```

### Clear Old Audit Logs (Optional)

```sql
-- Delete audit logs older than 90 days
DELETE FROM phone_sanitization_audit
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Best Practices

1. **Trust the Database**: Sanitization happens automatically via triggers. Don't rely solely on client-side validation.

2. **User Feedback**: Inform users when phone numbers are detected and removed. Use the validation Edge Function for real-time feedback.

3. **Admin Access**: Restrict admin access strictly. Only authorized personnel should view extracted phone numbers.

4. **Audit Review**: Regularly review audit logs for patterns or abuse attempts.

5. **False Positives**: The regex pattern may occasionally match non-phone numbers (e.g., long numbers). Monitor and adjust if needed.

## Troubleshooting

### Phone Number Not Detected

Check if the format matches supported patterns. Test with:
```sql
SELECT detect_phone_numbers('your-text-here');
```

### Sanitization Not Applied

Verify triggers are enabled:
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE '%sanitize%';
```

### Admin Can't View Contact Numbers

Verify admin role:
```sql
SELECT user_type FROM profiles WHERE id = auth.uid();
```

### Edge Function Fails

Check logs and verify JWT is valid:
```bash
supabase functions logs admin-view-contact-numbers
```

## Summary

The Phone Number Sanitization System provides comprehensive, server-enforced protection against off-platform contact while maintaining flexibility for legitimate admin access to provider contact information. All operations are logged, secure, and transparent.
