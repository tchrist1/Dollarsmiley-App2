# DollarSmiley Marketplace - Security Hardening Guide

## Overview

This guide provides step-by-step instructions to harden the security of the DollarSmiley marketplace platform before production deployment.

---

## 🔴 Critical Security Requirements

### 1. Environment Variables Security

**Status:** CRITICAL
**Action:** Verify all sensitive keys are properly secured

```bash
# .env file should NEVER be committed to git
echo ".env" >> .gitignore

# Verify no secrets in code
grep -r "sk_live" .
grep -r "pk_live" .
grep -r "service_role" .

# All should return no results
```

**Required Environment Variables:**
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Never expose:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

### 2. Row Level Security (RLS) Policies

**Status:** CRITICAL
**Action:** Verify RLS is enabled on ALL tables

```sql
-- Check which tables don't have RLS enabled
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = t.schemaname
          AND p.tablename = t.tablename
      )
  );

-- Enable RLS on any missing tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Critical Tables (Must have RLS):**
- `profiles`
- `payment_methods`
- `transactions`
- `bookings`
- `messages`
- `wallet_balance`
- `provider_verification`
- `escrow_transactions`
- `video_calls`
- `provider_inventory`

**Test RLS:**
```bash
ts-node scripts/test-rls-policies.ts
```

---

### 3. Authentication Configuration

**Status:** CRITICAL
**Action:** Configure Supabase Auth settings

**In Supabase Dashboard → Authentication → Settings:**

```yaml
JWT Settings:
  - JWT expiry: 3600 (1 hour)
  - Refresh token expiry: 2592000 (30 days)
  - JWT algorithm: HS256

Password Requirements:
  - Minimum length: 8 characters
  - Require uppercase: Yes
  - Require lowercase: Yes
  - Require numbers: Yes
  - Require special characters: Yes

Email Settings:
  - Confirm email: Enabled
  - Secure email change: Enabled
  - Double confirm email changes: Enabled

Security:
  - Enable Captcha on signup: Recommended
  - Rate limiting: Enabled
  - Max concurrent sessions: 5
```

---

### 4. Stripe Security

**Status:** CRITICAL
**Action:** Configure Stripe security settings

**Webhook Signature Verification:**
```typescript
// All webhook handlers MUST verify signatures
import { stripe } from '@/lib/stripe';

const sig = request.headers.get('stripe-signature');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

try {
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    webhookSecret
  );
  // Process event
} catch (err) {
  // Invalid signature
  return new Response('Webhook Error', { status: 400 });
}
```

**Stripe Dashboard Settings:**
1. Enable 3D Secure (SCA) for payments
2. Set up fraud detection rules
3. Configure webhook endpoints with signature verification
4. Enable Connect account verification
5. Set up payout schedules

---

## 🟠 High Priority Security

### 5. API Rate Limiting

**Status:** HIGH
**Action:** Implement rate limiting on all endpoints

```sql
-- Rate limiting is configured in the database
SELECT * FROM rate_limit_config;

-- Default limits (adjust as needed):
-- Login attempts: 5 per 15 minutes
-- API calls: 100 per minute
-- Payment attempts: 3 per 10 minutes
```

**Test Rate Limiting:**
```typescript
// Test with multiple rapid requests
for (let i = 0; i < 10; i++) {
  await fetch('/api/endpoint');
}
// Should return 429 after limit exceeded
```

---

### 6. Input Validation & Sanitization

**Status:** HIGH
**Action:** Validate all user inputs

**Server-Side Validation (Edge Functions):**
```typescript
function validateBookingInput(data: any) {
  if (!data.service_date) {
    throw new Error('Service date required');
  }

  const serviceDate = new Date(data.service_date);
  if (serviceDate < new Date()) {
    throw new Error('Service date must be in future');
  }

  if (typeof data.total_amount !== 'number' || data.total_amount <= 0) {
    throw new Error('Invalid amount');
  }

  // Sanitize strings
  const sanitizedNotes = data.notes?.replace(/<[^>]*>/g, '');

  return { ...data, notes: sanitizedNotes };
}
```

**Client-Side Validation:**
```typescript
// Always validate on client, but NEVER trust client-side validation alone
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

### 7. CORS Configuration

**Status:** HIGH
**Action:** Restrict CORS in production

**Edge Functions:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin':
    process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com'  // Your production domain
      : '*',  // Allow all in development
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

---

### 8. Error Handling & Information Disclosure

**Status:** HIGH
**Action:** Never leak sensitive information in errors

**Bad:**
```typescript
// DON'T DO THIS
catch (error) {
  return Response.json({
    error: error.message,  // May expose DB schema, queries, etc.
    stack: error.stack      // NEVER expose stack traces
  });
}
```

**Good:**
```typescript
// DO THIS
catch (error) {
  // Log detailed error server-side
  console.error('Payment failed:', error);
  await logError(error);

  // Return generic message to client
  return Response.json({
    error: 'Payment processing failed. Please try again.'
  }, { status: 500 });
}
```

---

## 🟡 Medium Priority Security

### 9. File Upload Security

**Status:** MEDIUM
**Action:** Validate and sanitize file uploads

**Supabase Storage Policies:**
```sql
-- Create storage bucket with RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true);

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view public images
CREATE POLICY "Public images are viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

**File Validation:**
```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSize = 10 * 1024 * 1024; // 10MB

function validateFile(file: File) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  return true;
}
```

---

### 10. Session Management

**Status:** MEDIUM
**Action:** Implement secure session handling

```typescript
// Refresh token before expiry
async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    // Force re-login
    await supabase.auth.signOut();
    router.push('/login');
  }
}

// Check session every 5 minutes
setInterval(refreshSession, 5 * 60 * 1000);

// Logout on token expiry
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    // Handle accordingly
  }
});
```

---

### 11. SQL Injection Prevention

**Status:** MEDIUM
**Action:** Always use parameterized queries

**Safe (Parameterized):**
```typescript
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('id', userId);  // ✅ Safe
```

**Unsafe (String concatenation):**
```typescript
// ❌ NEVER DO THIS
const query = `SELECT * FROM listings WHERE id = '${userId}'`;
```

---

### 12. Data Encryption

**Status:** MEDIUM
**Action:** Encrypt sensitive fields

**For extremely sensitive data (SSN, Tax ID):**
```sql
-- Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive field
UPDATE profiles
SET ssn_encrypted = pgp_sym_encrypt(ssn, current_setting('app.encryption_key'))
WHERE ssn IS NOT NULL;

-- Create function to decrypt (with proper access control)
CREATE OR REPLACE FUNCTION decrypt_ssn(encrypted_data bytea)
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🟢 Low Priority / Best Practices

### 13. Audit Logging

**Status:** LOW
**Action:** Log all sensitive operations

```typescript
async function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  details?: any
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource,
    details,
    ip_address: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
  });
}

// Log examples:
await logAuditEvent(userId, 'UPDATE', 'payment_method', { last4: '4242' });
await logAuditEvent(adminId, 'DELETE', 'user_account', { deletedUserId });
await logAuditEvent(userId, 'ACCESS', 'sensitive_data', { resource: 'tax_forms' });
```

---

### 14. Security Headers

**Status:** LOW
**Action:** Add security headers to responses

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

return new Response(data, { headers: { ...corsHeaders, ...securityHeaders } });
```

---

### 15. Dependency Security

**Status:** LOW
**Action:** Keep dependencies updated

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

---

## 🔒 Security Checklist

### Pre-Production Deployment

**Authentication & Authorization:**
- [ ] RLS enabled on all tables
- [ ] JWT expiry configured (1 hour)
- [ ] Strong password requirements enforced
- [ ] Email verification enabled
- [ ] Rate limiting active

**Payment Security:**
- [ ] Stripe keys in environment variables
- [ ] Webhook signature verification implemented
- [ ] 3D Secure enabled
- [ ] PCI compliance verified
- [ ] Payment data never stored directly

**API Security:**
- [ ] All endpoints require authentication
- [ ] Input validation on all endpoints
- [ ] CORS restricted to production domain
- [ ] Rate limiting configured
- [ ] Error messages don't leak info

**Data Protection:**
- [ ] Sensitive data encrypted
- [ ] HTTPS enforced
- [ ] File upload validation
- [ ] Storage bucket policies configured
- [ ] Audit logging active

**Edge Functions:**
- [ ] JWT verification on all functions
- [ ] Service role key secured
- [ ] Error handling doesn't leak data
- [ ] CORS headers configured
- [ ] Environment variables secured

---

## �� Incident Response Plan

### Security Incident Detected

1. **Immediate Actions:**
   - Identify affected systems
   - Contain the breach
   - Preserve evidence
   - Notify security team

2. **Assessment:**
   - Determine scope of breach
   - Identify compromised data
   - Document timeline
   - Assess impact

3. **Remediation:**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security policies
   - Monitor for further activity

4. **Communication:**
   - Notify affected users (if PII compromised)
   - Report to authorities (if required)
   - Document lessons learned
   - Update security procedures

---

## 📞 Security Contacts

**For Security Issues:**
- Email: security@dollarsmiley.com
- Emergency: [Emergency Contact]
- Bug Bounty: [If applicable]

**Responsible Disclosure:**
We appreciate responsible disclosure of security vulnerabilities. Please report security issues to security@dollarsmiley.com with:
- Detailed description
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Stripe Security Guide](https://stripe.com/docs/security)
- [React Native Security](https://reactnative.dev/docs/security)

---

**Last Updated:** 2025-11-15
**Next Review:** 2025-12-15

