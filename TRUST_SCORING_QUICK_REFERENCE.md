# Trust Scoring Quick Reference

## Trust Levels

### Customer Trust Levels
| Level | Label | Trigger | Impact |
|-------|-------|---------|--------|
| 0 | Normal | 0-1 no-shows in 6mo | None |
| 1 | Soft Warning | 2 no-shows in 90d | Warning at job posting |
| 2 | Reliability Risk | 3-4 no-shows in 90-180d | Require no-show fee |
| 3 | High Risk | 5+ no-shows across providers | Limit urgent + confirmation |

### Provider Trust Levels
| Level | Label | Trigger | Impact |
|-------|-------|---------|--------|
| 0 | Good Standing | No issues | None |
| 1 | Advisory | 1-2 incidents OR 10-20% rate | Reminders |
| 2 | Reliability Risk | 2+ incidents OR 20%+ rate | Confirmation required |
| 3 | High Risk | Sustained pattern | Limit high-urgency jobs |

## Recovery Paths
- **Customers:** 5 consecutive completed jobs → trust level -1
- **Providers:** 10 consecutive completed jobs → trust level -1

## Quick Code Snippets

### Check Customer Eligibility
```typescript
import { checkCustomerEligibilityForJob } from '@/lib/trust-scoring';

const eligibility = await checkCustomerEligibilityForJob(customerId);
// Returns: { eligible, trustLevel, requiresNoShowFee, warnings }
```

### Check Provider Eligibility
```typescript
import { checkProviderEligibilityForJob } from '@/lib/trust-scoring';

const eligibility = await checkProviderEligibilityForJob(providerId, 'high');
// Returns: { eligible, trustLevel, requiresConfirmation, warnings }
```

### Get Trust Guidance
```typescript
import { getTrustImprovementGuidance } from '@/lib/trust-scoring';

const guidance = await getTrustImprovementGuidance(userId, 'customer');
// Returns: { trust_level, trust_level_label, status, improvement_tips, recovery_progress }
```

### Display Trust Status Card
```typescript
import { CustomerTrustStatusCard } from '@/components/CustomerTrustStatusCard';
import { ProviderTrustStatusCard } from '@/components/ProviderTrustStatusCard';

// Customer
<CustomerTrustStatusCard customerId={userId} compact={false} />

// Provider
<ProviderTrustStatusCard providerId={userId} compact={true} />
```

### Show Trust Warning Modal
```typescript
import { TrustWarningModal } from '@/components/TrustWarningModal';

<TrustWarningModal
  visible={showWarning}
  onClose={() => setShowWarning(false)}
  onContinue={handleContinue}
  trustLevel={2}
  role="customer"
  warnings={['No-show fee required']}
  requiresNoShowFee={true}
/>
```

## Database Functions

### Calculate Trust Score
```sql
-- Customer
SELECT calculate_customer_trust_score('customer-uuid');

-- Provider
SELECT calculate_provider_trust_score('provider-uuid');
```

### Get Trust Guidance
```sql
SELECT get_trust_improvement_guidance('user-uuid', 'customer');
-- Returns JSONB with guidance
```

### Record Trust Event
```sql
SELECT record_trust_event(
  'user-uuid',
  'customer',
  'customer_no_show',
  'negative',
  'job-uuid',
  NULL,
  'incident-uuid',
  'Customer did not show up',
  '{"grace_period_elapsed": true}'::jsonb
);
```

## Key Principles

✅ **Pattern Detection** - Single incidents don't change trust level
✅ **Recency Weighting** - Recent behavior matters more
✅ **Transparent** - Users see their own status and how to improve
✅ **No Public Shaming** - Trust scores are private
✅ **Symmetry** - Each role scored only on actions they control
✅ **Recovery Paths** - Clear path to improvement
✅ **No Auto-Penalties** - No automatic financial or access penalties

## What's Excluded

❌ Customer no-shows don't affect provider trust
❌ Provider delays don't affect customer trust
❌ Platform outages excluded from both
❌ Weather/force majeure excluded
❌ Mutually agreed reschedules excluded
❌ Single incidents don't trigger level changes

## Integration Checklist

### Job Posting Flow
- [ ] Check customer eligibility before submission
- [ ] Show TrustWarningModal if warnings exist
- [ ] Require no-show fee field if trust level >= 2
- [ ] Validate no-show fee is set if required

### Job Acceptance Flow
- [ ] Check provider eligibility before acceptance
- [ ] Show TrustWarningModal if warnings exist
- [ ] Block high-urgency jobs if trust level >= 3
- [ ] Require confirmation if trust level >= 2

### Profile/Dashboard
- [ ] Display CustomerTrustStatusCard or ProviderTrustStatusCard
- [ ] Link to detailed trust history
- [ ] Show recovery progress if applicable

## Common Queries

### View User Trust Status
```sql
-- Customer
SELECT * FROM customer_trust_scores WHERE customer_id = 'uuid';

-- Provider
SELECT * FROM provider_trust_scores WHERE provider_id = 'uuid';
```

### View Trust Events
```sql
SELECT * FROM trust_score_events
WHERE user_id = 'uuid'
ORDER BY created_at DESC
LIMIT 20;
```

### Users with Trust Concerns
```sql
SELECT p.email, cts.trust_level, cts.no_show_count_90d
FROM customer_trust_scores cts
JOIN profiles p ON p.id = cts.customer_id
WHERE cts.trust_level >= 2;
```

## Color Codes
- Level 0: `#10B981` (Green)
- Level 1: `#F59E0B` (Amber)
- Level 2: `#EF4444` (Red)
- Level 3: `#DC2626` (Dark Red)

## Support Actions

### When User Reports Trust Issue
1. Query trust_score_events for the user
2. Verify all incidents are legitimate
3. Check for platform errors or false positives
4. Manual adjustment if warranted
5. Document in notes

### Trust Score Override (If Needed)
```sql
-- Update trust level
UPDATE customer_trust_scores
SET trust_level = 0,
    notes = 'Manual adjustment: [reason]',
    updated_at = now()
WHERE customer_id = 'uuid';

-- Record snapshot
INSERT INTO trust_score_snapshots (user_id, user_role, trust_level, score_data, snapshot_reason)
VALUES ('uuid', 'customer', 0, '{...}'::jsonb, 'Manual adjustment: [reason]');
```

## Testing Checklist

- [ ] Customer completes 10 jobs → trust level 0
- [ ] Customer no-shows 1 job → still trust level 0 (pattern detection)
- [ ] Customer no-shows 2 jobs in 90d → trust level 1
- [ ] Customer no-shows 4 jobs in 180d → trust level 2
- [ ] Customer completes 5 consecutive → trust level decreases
- [ ] Provider completes 20 jobs → trust level 0
- [ ] Provider has 1 incident → trust level 1 (if rate high enough)
- [ ] Provider has 2+ incidents → trust level 2
- [ ] Provider completes 10 consecutive → trust level decreases
- [ ] Customer no-show does NOT affect provider trust
- [ ] Provider delay does NOT affect customer trust

## RLS Policies

All tables have RLS enabled:
- Users can view **only their own** trust scores
- Admins can view **all** trust scores
- No cross-party visibility (customer can't see provider trust, vice versa)

## Event Expiration

- **Negative events:** 180 days
- **Neutral events:** 90 days
- **Positive events:** Never expire

## Files

### Database
- `supabase/migrations/20260108200000_create_marketplace_trust_scoring_system.sql`

### Library
- `lib/trust-scoring.ts` (317 lines)

### Components
- `components/CustomerTrustStatusCard.tsx` (392 lines)
- `components/ProviderTrustStatusCard.tsx` (442 lines)
- `components/TrustWarningModal.tsx` (280 lines)

### Documentation
- `MARKETPLACE_TRUST_SCORING_SYSTEM.md` (Complete guide)
- `TRUST_SCORING_QUICK_REFERENCE.md` (This file)

## End of Quick Reference
