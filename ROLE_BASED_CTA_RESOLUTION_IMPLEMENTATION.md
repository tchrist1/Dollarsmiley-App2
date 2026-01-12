# Role-Based Account-Scoped CTA Resolution
## Implementation Complete

### OBJECTIVE
Standardize all secondary navigation CTAs so their label and destination are derived strictly from the TARGET ACCOUNT TYPE (Customer, Provider, Hybrid), and NOT from the listing type or entry path.

---

## CHANGES MADE

### 1. Job Details Screen (`/app/jobs/[id].tsx`)

**Location:** Lines 455-493
**Status:** ✅ COMPLETE

#### Navigation Logic (Already Correct)
- Lines 455-464: Routing based on `job.customer.user_type`
  - Provider/Hybrid → `/provider/store/{id}`
  - Customer → `/customer/job-board/{id}`

#### CTA Label (UPDATED)
- Lines 486-493: Dynamic label based on account type
  ```tsx
  {job.customer.user_type === 'Provider' || job.customer.user_type === 'Hybrid'
    ? 'View Store'
    : 'View Jobs'}
  ```

**Before:** Always displayed "View Jobs"
**After:** Displays "View Store" for Provider/Hybrid, "View Jobs" for Customer

---

### 2. Listing Details Screen (`/app/listing/[id].tsx`)

**Location:** Lines 418-472
**Status:** ✅ COMPLETE

#### Navigation Logic (UPDATED)
- Lines 420-429: Now routes based on `provider.user_type`
  ```tsx
  if (provider.user_type === 'Provider' || provider.user_type === 'Hybrid') {
    router.push(`/provider/store/${provider.id}` as any);
  } else {
    router.push(`/customer/job-board/${provider.id}` as any);
  }
  ```

**Before:** Always routed to `/provider/store/{id}`
**After:** Routes to Store Front for Provider/Hybrid, Job Board for Customer

#### CTA Label (UPDATED)
- Lines 465-472: Dynamic label based on account type
  ```tsx
  {provider.user_type === 'Provider' || provider.user_type === 'Hybrid'
    ? 'View Store'
    : 'View Jobs'}
  ```

**Before:** Always displayed "View Store"
**After:** Displays "View Store" for Provider/Hybrid, "View Jobs" for Customer

---

### 3. Provider Store Front Screen (`/app/provider/store/[providerId].tsx`)

**Location:** Lines 106-111
**Status:** ✅ COMPLETE

#### Redirect Logic (ADDED)
- Added safety redirect for Customer accounts
  ```tsx
  // Redirect Customers to Job Board
  // Store Front is only for Provider and Hybrid accounts
  if (profileData.user_type === 'Customer') {
    router.replace(`/customer/job-board/${providerId}` as any);
    return;
  }
  ```

**Purpose:** Ensures Customer accounts navigated to Store Front route are automatically redirected to their Job Board

---

### 4. Customer Job Board Screen (`/app/customer/job-board/[customerId].tsx`)

**Location:** Lines 71-76
**Status:** ✅ ALREADY CORRECT (No changes needed)

#### Existing Redirect Logic
- Already has safety redirect for Provider/Hybrid accounts
  ```tsx
  // Redirect Providers and Hybrids to Store Front
  // Job Board is only for Customer accounts
  if (customerProfile.user_type === 'Provider' || customerProfile.user_type === 'Hybrid') {
    router.replace(`/provider/store/${customerId}` as any);
    return;
  }
  ```

**Purpose:** Ensures Provider/Hybrid accounts navigated to Job Board route are automatically redirected to their Store Front

---

## ACCOUNT TYPE → CTA RESOLUTION TABLE

| Account Type | CTA Label | CTA Destination | Navigation Route |
|--------------|-----------|-----------------|------------------|
| Customer | **View Jobs** | Customer Job Board | `/customer/job-board/{id}` |
| Provider | **View Store** | Provider Store Front | `/provider/store/{id}` |
| Hybrid | **View Store** | Hybrid Store Front | `/provider/store/{id}` |

---

## VALIDATION CHECKLIST

✅ Primary taps still open Job/Service details as before
✅ Same account always shows the same CTA everywhere
✅ Customer accounts never show "View Store"
✅ Provider and Hybrid accounts never show "View Jobs"
✅ Hybrid "View Store" exposes both Jobs and Services
✅ No booking, quoting, or map regressions
✅ Navigation is bidirectional with safety redirects
✅ No schema, table, or RLS policy changes
✅ No route additions or deletions
✅ Backward-compatible implementation

---

## FILES MODIFIED

1. `/app/jobs/[id].tsx` - Updated CTA label to be dynamic
2. `/app/listing/[id].tsx` - Updated navigation logic and CTA label
3. `/app/provider/store/[providerId].tsx` - Added Customer redirect

**Total Lines Changed:** ~15 lines across 3 files
**Breaking Changes:** None
**New Dependencies:** None

---

## BEHAVIOR SUMMARY

### Before Implementation
- CTA labels and destinations were inconsistent
- Entry path (job vs service) determined the CTA
- Same account could show different CTAs in different contexts
- Listing details always routed to Store Front regardless of account type

### After Implementation
- CTA labels and destinations are purely account-type based
- Entry path is irrelevant to CTA resolution
- Same account always shows identical CTA across all screens
- Proper routing with bidirectional safety redirects
- Predictable, consistent user experience

---

## TESTING NOTES

### Test Scenarios

**Scenario 1: Customer Account**
1. View job details → "Posted By" section shows "View Jobs" → routes to Job Board ✅
2. View service listing (if customer creates custom services) → "About the Provider" shows "View Jobs" → routes to Job Board ✅
3. Access `/provider/store/{customer_id}` directly → auto-redirects to Job Board ✅

**Scenario 2: Provider Account**
1. View job details (if provider posts jobs) → "Posted By" section shows "View Store" → routes to Store Front ✅
2. View service listing → "About the Provider" shows "View Store" → routes to Store Front ✅
3. Access `/customer/job-board/{provider_id}` directly → auto-redirects to Store Front ✅

**Scenario 3: Hybrid Account**
1. View job posted by hybrid → "Posted By" section shows "View Store" → routes to Store Front (shows Jobs + Services) ✅
2. View service by hybrid → "About the Provider" shows "View Store" → routes to Store Front (shows Jobs + Services) ✅
3. Both redirect scenarios work correctly ✅

---

## SUCCESS CRITERIA

✅ **Consistency:** Users can reliably predict where a CTA will take them based solely on WHO the account is — not HOW they arrived there

✅ **Role-Based:** CTA resolution is purely determined by target account's `user_type` field

✅ **Non-Breaking:** All primary navigation (job/service detail taps) remains unchanged

✅ **Safety:** Bidirectional redirects prevent users from accessing incorrect account-scoped destinations

✅ **Simplicity:** Minimal code changes with maximum impact on UX consistency

---

## FUTURE CONSIDERATIONS

### Out of Scope (As Per Requirements)
- Map pin popup CTAs (not currently implemented)
- Quote/Provider profile CTAs (placeholder alerts)
- Recommendation carousel CTAs
- Search result secondary CTAs

These can be addressed in future updates using the same pattern established here.

---

**Implementation Date:** 2026-01-12
**Implementation Status:** ✅ COMPLETE AND VALIDATED
