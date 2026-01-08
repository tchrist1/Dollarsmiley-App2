# Marketplace Trust Scoring System

## Overview

The Marketplace Trust Scoring System is a comprehensive framework that evaluates both **CUSTOMER** and **PROVIDER** reliability using role-appropriate signals. The system detects behavioral patterns rather than punishing single incidents, maintains transparency, and protects marketplace integrity without introducing punitive measures.

## Design Principles

### Core Principles (Apply to Both Roles)

1. **Pattern Detection, Not Punishment**
   - Single incidents do NOT materially impact trust
   - System requires repeated behavior to trigger status changes
   - One-off issues are recorded but don't affect trust level

2. **Recency Weighting**
   - Recent behavior weighs more than older behavior
   - Events expire after 180 days (negative) or 90 days (neutral)
   - Positive events never expire

3. **Trust Decay & Recovery**
   - Trust improves with good behavior over time
   - Consecutive completed jobs accelerate recovery
   - 5 consecutive completions (customers) or 10 (providers) reduce trust level by 1

4. **Transparency**
   - Users see their own trust status
   - Clear guidance on how to improve
   - No public trust labels or badges
   - No cross-party visibility

5. **No Automatic Penalties**
   - No automatic price increases
   - No automatic financial penalties
   - No automatic bans or delisting
   - No silent job throttling

6. **Symmetry & Fairness**
   - Customer no-shows do NOT affect provider trust
   - Provider delays do NOT affect customer trust
   - Each role scored only on actions they control
   - One party cannot directly lower the other's trust score

---

## Customer Trust Scoring

### Signal: No-Show Reliability

Customers are evaluated **exclusively** on no-show behavior. A no-show is recorded **ONLY** when:

- Provider waited through the full grace period (15 minutes)
- Provider attempted in-app contact
- Job could not proceed due to customer absence or access failure
- Provider marked the incident as "Customer No-Show" via the approved flow

### Trust Levels

| Level | Label | Threshold | Impact |
|-------|-------|-----------|--------|
| **0** | Normal | 0-1 no-shows in 6 months | None |
| **1** | Soft Warning | 2 no-shows in 90 days OR 15%+ no-show rate | In-app warning at job posting |
| **2** | Reliability Risk | 3-4 no-shows in 90-180 days | Require predefined no-show fee for new jobs |
| **3** | High Risk | 5+ no-shows across multiple providers | Limit time-sensitive job posting + additional confirmation |

### Tracked Metrics

- **No-show count** (30d, 90d, 180d, lifetime)
- **Completed jobs** (30d, 90d, 180d, lifetime)
- **No-show rate** (no-shows / total jobs)
- **Provider diversity** (unique providers affected)
- **Consecutive completed jobs** (recovery tracking)
- **Last no-show date** (recency weighting)

### Recovery Path

Customers can improve their trust level by:

1. **Complete 5 consecutive jobs** without any no-shows
2. Trust level automatically reduces by 1 when threshold is met
3. No other penalties or requirements

### Restrictions by Level

#### Level 0 (Normal)
- ✅ No restrictions
- ✅ Can post any job type
- ✅ No additional fees required

#### Level 1 (Soft Warning)
- ⚠️ Warning shown at job posting
- ✅ Can post any job type
- ✅ No additional fees required
- 💡 Guidance: "Recent no-shows detected. Please ensure availability before booking."

#### Level 2 (Reliability Risk)
- 🔒 **Must set no-show fee** for new job postings
- ⚠️ Warning shown at job posting
- ✅ Can still post jobs
- 💡 Guidance: "Multiple no-shows detected. A no-show fee protects providers."

#### Level 3 (High Risk)
- 🔒 **Must set no-show fee** for new job postings
- 🔒 **Time-sensitive job posting limited**
- ⚠️ Additional confirmation required
- 🔍 Eligible for internal trust & safety review
- 💡 Guidance: "Your account requires attention. Please contact support."

### Explicit Prohibitions

- ❌ No public indicators
- ❌ No automatic price increases
- ❌ No provider visibility of customer trust level
- ❌ No automatic bans or restrictions on receiving quotes
- ❌ No penalties for first-time incidents

---

## Provider Trust Scoring

### Signals: Reliability & Conduct

Providers are evaluated on **provider-caused issues only**, excluding customer-caused problems.

### Primary Signals (Negative)

1. **Provider No-Show** - Fails to arrive or cancels after start window
2. **Repeated Late Arrivals** - Beyond grace period without communication
3. **Excessive Unapproved Time Extensions** - Repeatedly requesting more time
4. **Excessive Post-Completion Adjustments** - Frequent price changes after work
5. **Customer Disputes Upheld** - Platform rules against provider
6. **Abandoned Jobs** - Jobs left incomplete without resolution

### Explicit Exclusions (DO NOT Count Against Provider)

- ❌ Customer no-shows
- ❌ Customer-caused delays
- ❌ Platform outages
- ❌ Weather or force majeure
- ❌ Mutually agreed reschedules

### Trust Levels

| Level | Label | Threshold | Impact |
|-------|-------|-----------|--------|
| **0** | Good Standing | No significant issues | None |
| **1** | Advisory | 1-2 incidents in 90d OR 10-20% incident rate | In-app guidance and reminders |
| **2** | Reliability Risk | 2+ incidents in 90d OR 20%+ incident rate | Require clearer confirmations |
| **3** | High Risk | Sustained pattern across customers | Limited high-urgency jobs + review |

### Tracked Metrics

- **Incident count by type** (30d, 90d, 180d)
- **Completed jobs** (30d, 90d, 180d, lifetime)
- **Incident rate** (incidents / total jobs)
- **Customer diversity** (unique customers affected)
- **Consecutive completed jobs** (recovery tracking)
- **Last incident date** (recency weighting)

### Recovery Path

Providers can improve their trust level by:

1. **Complete 10 consecutive jobs** successfully without incidents
2. Trust level automatically reduces by 1 when threshold is met
3. No other penalties or requirements

### Restrictions by Level

#### Level 0 (Good Standing)
- ✅ No restrictions
- ✅ Can accept any job type
- ✅ Normal payout schedule

#### Level 1 (Advisory)
- ⚠️ In-app reminders before accepting jobs
- ✅ Can accept any job type
- ✅ Normal payout schedule
- 💡 Guidance: "Please review job commitments carefully."

#### Level 2 (Reliability Risk)
- 🔒 **Additional confirmation required** before accepting jobs
- ⚠️ Increased visibility of rules and requirements
- ✅ Can accept most job types
- ✅ Normal payout schedule
- 💡 Guidance: "Only accept jobs you can definitely complete."

#### Level 3 (High Risk)
- 🔒 **Limited access to high-urgency jobs**
- 🔒 **Additional confirmation required**
- 🔍 Eligible for internal trust & safety review
- ⚠️ May require support consultation
- ✅ Normal payout schedule (no automatic holds)
- 💡 Guidance: "Your account requires immediate attention."

### Explicit Prohibitions

- ❌ No automatic delisting
- ❌ No public trust indicators
- ❌ No silent job throttling
- ❌ No automatic payout holds
- ❌ No customer visibility of provider trust level

---

## Database Schema

### Tables

#### `customer_trust_scores`
Primary table for customer reliability scoring.

**Key Columns:**
- `customer_id` - References profiles(id)
- `no_show_count_30d/90d/180d/lifetime` - No-show counts by period
- `completed_jobs_30d/90d/180d/lifetime` - Completed job counts
- `no_show_rate_30d/90d/180d/lifetime` - Calculated rates
- `unique_providers_affected_*` - Provider diversity signals
- `trust_level` - Current level (0-3)
- `consecutive_completed_jobs` - Recovery tracking
- `last_no_show_at` - Recency weighting

#### `provider_trust_scores`
Primary table for provider reliability scoring.

**Key Columns:**
- `provider_id` - References profiles(id)
- `provider_no_show_count_*` - Incident counts by period
- `late_arrival_count_*` - Late arrival tracking
- `excessive_extension_count_*` - Extension request tracking
- `disputed_jobs_upheld_*` - Dispute tracking
- `completed_jobs_*` - Positive signal tracking
- `incident_rate_*` - Calculated rates
- `unique_customers_affected_*` - Customer diversity signals
- `trust_level` - Current level (0-3)
- `consecutive_completed_jobs` - Recovery tracking

#### `trust_score_events`
Audit trail for all trust-affecting events.

**Key Columns:**
- `user_id` - User affected by event
- `user_role` - 'customer' or 'provider'
- `event_type` - Type of event (e.g., 'customer_no_show', 'booking_completed')
- `event_category` - 'negative', 'positive', or 'neutral'
- `trust_level_before/after` - Impact tracking
- `trust_level_changed` - Boolean flag
- `expires_at` - Event expiration (180d for negative, 90d for neutral, null for positive)

#### `trust_score_snapshots`
Historical snapshots for trend analysis.

**Key Columns:**
- `user_id` - User being tracked
- `user_role` - 'customer' or 'provider'
- `trust_level` - Level at snapshot time
- `score_data` - JSONB with all metrics
- `snapshot_reason` - Description of why snapshot was taken

### Key Functions

#### `calculate_customer_trust_score(p_customer_id uuid)`
Recalculates all customer trust metrics and updates the trust score.

#### `calculate_provider_trust_score(p_provider_id uuid)`
Recalculates all provider trust metrics and updates the trust score.

#### `update_customer_trust_level(p_customer_id uuid)`
Determines customer trust level (0-3) based on calculated metrics and applies recovery bonuses.

#### `update_provider_trust_level(p_provider_id uuid)`
Determines provider trust level (0-3) based on calculated metrics and applies recovery bonuses.

#### `record_trust_event(...)`
Records a trust-affecting event, recalculates trust score, and returns event ID.

**Parameters:**
- `p_user_id` - User affected
- `p_user_role` - 'customer' or 'provider'
- `p_event_type` - Event type string
- `p_event_category` - 'negative', 'positive', or 'neutral'
- `p_job_id` - Optional job reference
- `p_booking_id` - Optional booking reference
- `p_incident_id` - Optional incident reference
- `p_notes` - Optional notes
- `p_metadata` - Optional JSONB metadata

#### `get_trust_improvement_guidance(p_user_id uuid, p_user_role text)`
Returns JSONB with trust status, level, tips, and recovery progress.

**Returns:**
```json
{
  "trust_level": 0,
  "trust_level_label": "Normal",
  "status": "good",
  "no_show_count_90d": 0,
  "completed_jobs_90d": 15,
  "consecutive_completed_jobs": 5,
  "improvement_tips": [...],
  "recovery_progress": {
    "eligible_for_improvement": true,
    "completed": 5,
    "required": 5,
    "message": "You qualify for trust level improvement!"
  }
}
```

### Triggers

#### `update_customer_trust_on_no_show`
Triggered when `job_customer_incidents` status changes to 'acknowledged' or 'resolved' for no-show incidents. Records trust event and recalculates customer trust score.

#### `update_customer_trust_on_job_complete`
Triggered when job status changes to 'completed'. Records positive trust event and recalculates customer trust score.

#### `update_provider_trust_on_booking_complete`
Triggered when booking status changes to 'completed'. Records positive trust event and recalculates provider trust score.

---

## TypeScript Library

### Installation

```typescript
import {
  getCustomerTrustScore,
  getProviderTrustScore,
  getTrustImprovementGuidance,
  checkCustomerEligibilityForJob,
  checkProviderEligibilityForJob,
  getTrustLevelColor,
  getTrustLevelLabel,
} from '@/lib/trust-scoring';
```

### Key Functions

#### `getCustomerTrustScore(customerId: string)`
Fetches the complete customer trust score record.

```typescript
const score = await getCustomerTrustScore(userId);
if (score) {
  console.log('Trust Level:', score.trust_level);
  console.log('No-Shows (90d):', score.no_show_count_90d);
  console.log('Completed Jobs:', score.completed_jobs_90d);
}
```

#### `getProviderTrustScore(providerId: string)`
Fetches the complete provider trust score record.

```typescript
const score = await getProviderTrustScore(userId);
if (score) {
  console.log('Trust Level:', score.trust_level);
  console.log('Incidents (90d):', score.provider_no_show_count_90d);
  console.log('Incident Rate:', score.incident_rate_90d);
}
```

#### `getTrustImprovementGuidance(userId: string, userRole: 'customer' | 'provider')`
Returns trust status and actionable improvement tips.

```typescript
const guidance = await getTrustImprovementGuidance(userId, 'customer');
if (guidance) {
  console.log('Status:', guidance.status);
  console.log('Level:', guidance.trust_level_label);
  console.log('Tips:', guidance.improvement_tips);
  console.log('Recovery:', guidance.recovery_progress);
}
```

#### `checkCustomerEligibilityForJob(customerId: string)`
Checks if customer can post a job and returns any warnings or requirements.

```typescript
const eligibility = await checkCustomerEligibilityForJob(userId);
console.log('Eligible:', eligibility.eligible);
console.log('Requires No-Show Fee:', eligibility.requiresNoShowFee);
console.log('Warnings:', eligibility.warnings);
```

#### `checkProviderEligibilityForJob(providerId: string, jobUrgency?: 'low' | 'medium' | 'high')`
Checks if provider can accept a job and returns any warnings or requirements.

```typescript
const eligibility = await checkProviderEligibilityForJob(userId, 'high');
console.log('Eligible:', eligibility.eligible);
console.log('Requires Confirmation:', eligibility.requiresConfirmation);
console.log('Warnings:', eligibility.warnings);
```

#### Utility Functions

```typescript
// Get color for trust level
const color = getTrustLevelColor(trustLevel); // Returns hex color

// Get label for trust level
const label = getTrustLevelLabel(trustLevel, 'customer'); // "Normal", "Soft Warning", etc.

// Check if no-show fee is required
const required = shouldRequireNoShowFee(trustLevel); // true if level >= 2

// Check if urgent jobs should be limited
const limited = shouldLimitUrgentJobs(trustLevel); // true if level >= 3

// Get all restrictions for a trust level
const restrictions = getTrustLevelRestrictions(trustLevel, 'customer');
// Returns: { canPostJobs, canAcceptJobs, requiresNoShowFee, limitsUrgentJobs, requiresAdditionalConfirmation, showsWarning }
```

---

## UI Components

### CustomerTrustStatusCard

Displays customer trust status with metrics, guidance, and recovery progress.

```typescript
import { CustomerTrustStatusCard } from '@/components/CustomerTrustStatusCard';

// Full card view
<CustomerTrustStatusCard
  customerId={userId}
  onViewDetails={() => {/* Navigate to trust history */}}
/>

// Compact view (for inline display)
<CustomerTrustStatusCard
  customerId={userId}
  compact={true}
  onViewDetails={() => {/* Navigate to trust history */}}
/>
```

**Features:**
- Shows trust level with color coding
- Displays key metrics (completed jobs, no-shows, consecutive completions)
- Provides improvement tips
- Shows recovery progress bar
- Warning for required no-show fee (Level 2+)

### ProviderTrustStatusCard

Displays provider trust status with metrics, guidance, and recovery progress.

```typescript
import { ProviderTrustStatusCard } from '@/components/ProviderTrustStatusCard';

// Full card view
<ProviderTrustStatusCard
  providerId={userId}
  onViewDetails={() => {/* Navigate to trust history */}}
/>

// Compact view (for inline display)
<ProviderTrustStatusCard
  providerId={userId}
  compact={true}
  onViewDetails={() => {/* Navigate to trust history */}}
/>
```

**Features:**
- Shows trust level with color coding
- Displays key metrics (completed jobs, incidents, incident rate)
- Badge for excellent reliability (Level 0 with 10+ jobs)
- Provides advisory guidance
- Shows recovery progress bar
- Warnings for confirmations and restrictions

### TrustWarningModal

Modal shown when users attempt actions that trigger trust warnings.

```typescript
import { TrustWarningModal } from '@/components/TrustWarningModal';

<TrustWarningModal
  visible={showWarning}
  onClose={() => setShowWarning(false)}
  onContinue={handleProceed}
  trustLevel={trustLevel}
  role="customer"
  warnings={[
    'Recent no-shows detected.',
    'A no-show fee is required for this job posting.',
  ]}
  requiresNoShowFee={true}
  requiresConfirmation={false}
/>
```

**Features:**
- Color-coded header based on trust level
- Lists all applicable warnings
- Highlights requirements (no-show fee, confirmation)
- Shows improvement guidance
- Continue and cancel buttons

---

## Integration Guide

### Job Posting Flow (Customers)

Add trust check before allowing job submission:

```typescript
import { checkCustomerEligibilityForJob } from '@/lib/trust-scoring';
import { TrustWarningModal } from '@/components/TrustWarningModal';

const handlePostJob = async () => {
  // Check trust eligibility
  const eligibility = await checkCustomerEligibilityForJob(profile.id);

  if (eligibility.warnings.length > 0) {
    // Show warning modal
    setTrustWarnings(eligibility.warnings);
    setRequiresNoShowFee(eligibility.requiresNoShowFee);
    setShowTrustWarning(true);
    return;
  }

  // Proceed with job posting
  await submitJob();
};

// In render:
<TrustWarningModal
  visible={showTrustWarning}
  onClose={() => setShowTrustWarning(false)}
  onContinue={handleContinueWithWarning}
  trustLevel={trustLevel}
  role="customer"
  warnings={trustWarnings}
  requiresNoShowFee={requiresNoShowFee}
/>
```

**If trust level >= 2:**
- Job posting form must include no-show fee field
- No-show fee becomes required (not optional)
- Validate no-show fee is set before submission

### Job Acceptance Flow (Providers)

Add trust check before allowing job acceptance:

```typescript
import { checkProviderEligibilityForJob } from '@/lib/trust-scoring';
import { TrustWarningModal } from '@/components/TrustWarningModal';

const handleAcceptJob = async (job: Job) => {
  // Check trust eligibility
  const eligibility = await checkProviderEligibilityForJob(
    profile.id,
    job.urgency // 'low', 'medium', or 'high'
  );

  if (!eligibility.eligible) {
    Alert.alert('Unable to Accept', eligibility.warnings.join(' '));
    return;
  }

  if (eligibility.warnings.length > 0) {
    // Show warning modal
    setTrustWarnings(eligibility.warnings);
    setRequiresConfirmation(eligibility.requiresConfirmation);
    setShowTrustWarning(true);
    return;
  }

  // Proceed with job acceptance
  await acceptJob(job.id);
};

// In render:
<TrustWarningModal
  visible={showTrustWarning}
  onClose={() => setShowTrustWarning(false)}
  onContinue={handleContinueWithWarning}
  trustLevel={trustLevel}
  role="provider"
  warnings={trustWarnings}
  requiresConfirmation={requiresConfirmation}
/>
```

**If trust level >= 3 and job urgency is 'high':**
- Provider is not eligible to accept
- Show clear message explaining restriction
- Suggest contacting support

### Profile Screen Integration

Add trust status card to user profile:

```typescript
import { CustomerTrustStatusCard } from '@/components/CustomerTrustStatusCard';
import { ProviderTrustStatusCard } from '@/components/ProviderTrustStatusCard';

// In customer profile
<CustomerTrustStatusCard
  customerId={profile.id}
  onViewDetails={() => router.push('/trust/history')}
/>

// In provider profile
<ProviderTrustStatusCard
  providerId={profile.id}
  onViewDetails={() => router.push('/trust/history')}
/>
```

### Dashboard Integration

Show compact trust status in dashboards:

```typescript
// Customer dashboard
<CustomerTrustStatusCard
  customerId={profile.id}
  compact={true}
  onViewDetails={() => router.push('/trust/status')}
/>

// Provider dashboard
<ProviderTrustStatusCard
  providerId={profile.id}
  compact={true}
  onViewDetails={() => router.push('/trust/status')}
/>
```

---

## Testing & Validation

### Test Scenarios

#### Customer Trust Scoring

**Test 1: Normal Behavior**
- Customer posts and completes 10 jobs without issues
- Expected: Trust level remains 0 (Normal)

**Test 2: Single No-Show (Pattern Detection)**
- Customer no-shows on 1 job out of 10 completed
- Expected: Trust level remains 0 (single incident allowed)

**Test 3: Soft Warning Trigger**
- Customer no-shows on 2 jobs within 90 days
- Expected: Trust level increases to 1 (Soft Warning)
- Warning shown at job posting

**Test 4: Reliability Risk Trigger**
- Customer no-shows on 4 jobs within 180 days
- Expected: Trust level increases to 2 (Reliability Risk)
- No-show fee required for new postings

**Test 5: Recovery Path**
- Customer at level 2 completes 5 consecutive jobs
- Expected: Trust level decreases to 1, then to 0 after 5 more

#### Provider Trust Scoring

**Test 1: Good Standing**
- Provider completes 20 jobs without issues
- Expected: Trust level remains 0 (Good Standing)

**Test 2: Advisory Trigger**
- Provider has 1 incident out of 10 completed jobs
- Expected: Trust level increases to 1 (Advisory)
- In-app guidance shown

**Test 3: Reliability Risk Trigger**
- Provider has 2 incidents out of 10 jobs (20% incident rate)
- Expected: Trust level increases to 2 (Reliability Risk)
- Confirmation required for new jobs

**Test 4: High Risk Trigger**
- Provider has 4+ incidents across multiple customers
- Expected: Trust level increases to 3 (High Risk)
- High-urgency jobs limited

**Test 5: Recovery Path**
- Provider at level 2 completes 10 consecutive jobs
- Expected: Trust level decreases to 1, then to 0 after 10 more

### Validation Queries

```sql
-- Check customer trust scores
SELECT
  p.email,
  cts.trust_level,
  cts.no_show_count_90d,
  cts.completed_jobs_90d,
  cts.no_show_rate_90d,
  cts.consecutive_completed_jobs
FROM customer_trust_scores cts
JOIN profiles p ON p.id = cts.customer_id
ORDER BY cts.trust_level DESC, cts.no_show_count_90d DESC;

-- Check provider trust scores
SELECT
  p.email,
  pts.trust_level,
  pts.provider_no_show_count_90d,
  pts.completed_jobs_90d,
  pts.incident_rate_90d,
  pts.consecutive_completed_jobs
FROM provider_trust_scores pts
JOIN profiles p ON p.id = pts.provider_id
ORDER BY pts.trust_level DESC, pts.incident_rate_90d DESC;

-- Check trust events for a user
SELECT
  event_type,
  event_category,
  trust_level_before,
  trust_level_after,
  trust_level_changed,
  notes,
  created_at
FROM trust_score_events
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 20;

-- Check trust level distribution
SELECT
  trust_level,
  COUNT(*) as customer_count
FROM customer_trust_scores
GROUP BY trust_level
ORDER BY trust_level;
```

---

## Admin & Support

### Admin Visibility

Admins have full visibility into trust scores for support and review:

```sql
-- View all users with trust concerns
SELECT
  p.email,
  CASE WHEN cts.customer_id IS NOT NULL THEN 'customer' ELSE 'provider' END as role,
  COALESCE(cts.trust_level, pts.trust_level) as trust_level,
  COALESCE(cts.no_show_count_90d, pts.provider_no_show_count_90d) as incidents_90d,
  COALESCE(cts.completed_jobs_90d, pts.completed_jobs_90d) as completed_90d
FROM profiles p
LEFT JOIN customer_trust_scores cts ON cts.customer_id = p.id
LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.id
WHERE COALESCE(cts.trust_level, pts.trust_level, 0) >= 2
ORDER BY COALESCE(cts.trust_level, pts.trust_level) DESC;
```

### Support Actions

**When user contacts support about trust status:**

1. **Review Trust History**
   - Check `trust_score_events` for the user
   - Verify all incidents are legitimate
   - Check for any platform errors or false positives

2. **Manual Adjustment (If Warranted)**
   - Update trust level if incidents were platform errors
   - Record adjustment in `trust_score_snapshots`
   - Add notes explaining the adjustment

3. **Guidance**
   - Provide personalized improvement plan
   - Explain recovery path clearly
   - Set realistic expectations for timeline

**Example Support Query:**
```sql
-- Get complete trust history for support review
SELECT
  tse.event_type,
  tse.event_category,
  tse.trust_level_before,
  tse.trust_level_after,
  tse.notes,
  tse.created_at,
  j.title as job_title,
  b.id as booking_id
FROM trust_score_events tse
LEFT JOIN jobs j ON j.id = tse.job_id
LEFT JOIN bookings b ON b.id = tse.booking_id
WHERE tse.user_id = 'USER_ID_HERE'
ORDER BY tse.created_at DESC;
```

---

## Frequently Asked Questions

### General

**Q: Does this system publicly shame users with low trust scores?**
A: No. Trust scores are completely private. Only the user and admins can see them. There are no public badges, indicators, or ratings.

**Q: Can one bad experience ruin my trust score?**
A: No. The system is designed to detect patterns, not punish one-offs. A single incident typically won't change your trust level.

**Q: How long do incidents affect my score?**
A: Negative events expire after 180 days. Recent behavior is weighted more heavily than older behavior.

**Q: Can I see why my trust level changed?**
A: Yes. Use the trust history view to see all events that affected your score, including dates, reasons, and impact.

### For Customers

**Q: What happens if I'm late to a job?**
A: Minor delays within the grace period (15 minutes) have no impact. If you're delayed beyond that, providers may report it, but it's recorded as informational only unless you completely no-show.

**Q: What if I have an emergency and can't make it?**
A: Cancel the job as soon as possible. Cancellations are different from no-shows. If you must no-show due to emergency, explain the situation to the provider and support.

**Q: How do I improve my trust level?**
A: Complete 5 consecutive jobs without any no-shows. Your trust level will automatically decrease by 1.

**Q: Do I have to pay a no-show fee if my trust level is 2+?**
A: You must **set** a no-show fee for new job postings, but you only pay it if you actually no-show. Complete the job as scheduled and no fee applies.

### For Providers

**Q: Does a customer no-show affect my provider trust score?**
A: No. Customer no-shows are tracked separately and do NOT affect your provider reliability score.

**Q: What if a customer causes me to be late?**
A: Customer-caused delays are excluded from provider trust scoring. Document the situation and it won't count against you.

**Q: How do I improve my trust level?**
A: Complete 10 consecutive jobs successfully without incidents. Your trust level will automatically decrease by 1.

**Q: What does "high-urgency jobs limited" mean?**
A: If your trust level reaches 3, you won't be able to accept jobs marked as high-urgency. You can still accept standard and low-urgency jobs.

**Q: Will my payouts be held?**
A: No. The trust scoring system does NOT affect payouts. Payouts follow the normal escrow and release schedule regardless of trust level.

---

## Success Criteria

✅ **Customers and providers are evaluated fairly and separately**
- Separate scoring systems for each role
- Role-appropriate signals for each
- No cross-contamination of scores

✅ **Repeat patterns are detected without punishing one-offs**
- Single incidents don't change trust level
- Requires 2+ incidents within timeframe
- Pattern detection across multiple counterparties

✅ **Trust scoring improves reliability without fear or confusion**
- Clear, transparent guidance
- Visible recovery path
- No surprise penalties

✅ **Escrow, pricing, and payouts remain untouched**
- No automatic financial changes
- No payout holds or delays
- No price adjustments

✅ **Abuse by either side is mitigated**
- Repeat no-shows addressed (customers)
- Repeat unreliability addressed (providers)
- Symmetry prevents gaming

✅ **Marketplace trust and completion rates improve**
- Incentivizes good behavior
- Discourages repeat offenders
- Maintains platform integrity

---

## Backward Compatibility

### No Breaking Changes

✅ **Existing users have clean slate**
- All existing users start at trust level 0
- No retroactive scoring unless events already recorded
- Historical data used only if incident records exist

✅ **Optional features**
- Trust checks only activate when user triggers them
- No changes to existing workflows
- No forced adoption

✅ **Database compatibility**
- All new columns nullable
- No required schema changes to existing tables
- No data migration required

✅ **API compatibility**
- All trust functions are new additions
- No changes to existing API endpoints
- No breaking changes to job or booking flows

---

## Future Enhancements

Potential improvements to consider:

1. **Trust Score Appeals Process**
   - Allow users to appeal trust level changes
   - Provide evidence for review
   - Admin review and adjustment workflow

2. **Trust Score Rewards**
   - Badges or benefits for consistently high trust
   - Priority placement for level 0 users
   - Reduced fees for excellent reliability

3. **Predictive Analytics**
   - ML model to predict no-show likelihood
   - Early intervention for at-risk users
   - Proactive guidance before issues occur

4. **Trust Score Insights**
   - Detailed trend charts
   - Comparison to marketplace average
   - Personalized recommendations

5. **Trust Score Integration**
   - Link to external verification services
   - Integration with background checks
   - Credential verification bonuses

---

## Support & Maintenance

### Monitoring

Monitor trust score health with these queries:

```sql
-- Daily trust level distribution
SELECT
  'customer' as role,
  trust_level,
  COUNT(*) as count
FROM customer_trust_scores
GROUP BY trust_level
UNION ALL
SELECT
  'provider' as role,
  trust_level,
  COUNT(*) as count
FROM provider_trust_scores
GROUP BY trust_level
ORDER BY role, trust_level;

-- Recent trust level changes
SELECT
  DATE(created_at) as date,
  user_role,
  COUNT(*) FILTER (WHERE trust_level_changed = true) as changes,
  COUNT(*) FILTER (WHERE trust_level_after > trust_level_before) as increased,
  COUNT(*) FILTER (WHERE trust_level_after < trust_level_before) as decreased
FROM trust_score_events
WHERE created_at >= now() - interval '7 days'
GROUP BY DATE(created_at), user_role
ORDER BY date DESC, user_role;
```

### Maintenance Tasks

1. **Weekly Review**
   - Check for users at level 3
   - Review recent level changes
   - Identify any anomalies

2. **Monthly Analysis**
   - Trust level distribution trends
   - Recovery rate analysis
   - No-show and incident trends

3. **Quarterly Audit**
   - Review trust calculation thresholds
   - Adjust if marketplace dynamics change
   - Update guidance text if needed

---

## Conclusion

The Marketplace Trust Scoring System provides fair, transparent, and effective reliability evaluation for both customers and providers. By detecting patterns rather than punishing one-offs, maintaining complete transparency, and offering clear recovery paths, the system improves marketplace integrity without introducing fear, confusion, or punitive measures.

All code, components, and documentation are production-ready with zero breaking changes to existing functionality.
