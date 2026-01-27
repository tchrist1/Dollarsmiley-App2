# Testing Guide: "More Options Nearby" Feature

## Overview
This guide provides step-by-step instructions for testing the "More Options Nearby" feature implementation.

## Prerequisites
- App running in development mode
- Test user accounts: Customer, Provider, Admin
- Demo listings in database with varying distances
- Location permissions enabled

## Test Scenarios

### Scenario 1: Sparse Local Supply (< 30 listings within 25 miles)

**Setup:**
1. Log in as Customer
2. Enable location services
3. Navigate to Home screen
4. Apply distance filter: 25 miles (default)

**Expected Behavior:**
1. ✅ Primary listings appear first (< 30 items)
2. ✅ "More options nearby" section header appears
3. ✅ Expanded listings appear below header
4. ✅ All listings show distance badges
5. ✅ Distance badges show correct values
6. ✅ Primary listings: distance ≤ 25 miles
7. ✅ Expanded listings: distance > 25 miles and ≤ 100 miles

**Dev Console Check:**
```
[useListingsCursor] Home Discovery: Sparse local supply (22). Appending 15 nearby listings (≤100 mi).
```

**Map View Check:**
1. Switch to Map view
2. ✅ Both primary and expanded markers visible
3. ✅ Expanded markers visually de-emphasized (if map styling implemented)
4. ✅ Tapping marker shows correct listing details

**View Modes:**
- ✅ List view: Section header renders correctly
- ✅ Grid view: Section header renders correctly
- ✅ Map view: Both primary and expanded markers shown

---

### Scenario 2: Sufficient Local Supply (≥ 30 listings within 25 miles)

**Setup:**
1. Log in as Customer
2. Enable location services
3. Navigate to Home screen (urban area with many listings)
4. Apply distance filter: 25 miles (default)

**Expected Behavior:**
1. ✅ Only primary listings appear (≥ 30 items)
2. ✅ NO "More options nearby" section
3. ✅ NO expanded listings
4. ✅ All listings show distance badges
5. ✅ All distances ≤ 25 miles

**Dev Console Check:**
```
(No expansion message should appear)
```

**Map View Check:**
1. Switch to Map view
2. ✅ Only primary markers visible (within 25 miles)
3. ✅ No markers beyond 25 miles

---

### Scenario 3: Provider Account (Unchanged Behavior)

**Setup:**
1. Log in as Provider
2. Enable location services
3. Navigate to Home screen

**Expected Behavior:**
1. ✅ All listings appear as normal
2. ✅ NO "More options nearby" section
3. ✅ NO bucketing occurs
4. ✅ Current behavior completely unchanged

**Dev Console Check:**
```
(No expansion message should appear)
```

**Map View Check:**
1. Switch to Map view
2. ✅ All markers render normally (no expansion logic)

---

### Scenario 4: Hybrid Account (Unchanged Behavior)

**Setup:**
1. Log in as Hybrid user
2. Enable location services
3. Navigate to Home screen

**Expected Behavior:**
1. ✅ All listings appear as normal
2. ✅ NO "More options nearby" section
3. ✅ NO bucketing occurs
4. ✅ Current behavior completely unchanged

---

### Scenario 5: Admin Account (Unchanged Behavior)

**Setup:**
1. Log in as Admin
2. Enable location services
3. Navigate to Home screen

**Expected Behavior:**
1. ✅ All listings appear as normal
2. ✅ NO "More options nearby" section
3. ✅ NO bucketing occurs
4. ✅ Current behavior completely unchanged

---

### Scenario 6: Customer Without Location Permissions

**Setup:**
1. Log in as Customer
2. DENY location permissions
3. Navigate to Home screen

**Expected Behavior:**
1. ✅ Listings appear without distance filtering
2. ✅ NO "More options nearby" section
3. ✅ NO distance badges (no user location)
4. ✅ Current fallback behavior unchanged

---

### Scenario 7: Filter Changes

**Setup:**
1. Log in as Customer with sparse local supply
2. See expanded section initially

**Test Actions:**
1. Change distance filter from 25 to 50 miles
2. Observe behavior

**Expected Behavior:**
1. ✅ Results refresh
2. ✅ More listings now in primary bucket (≤ 50 miles)
3. ✅ If primary ≥ 30, expanded section disappears
4. ✅ If primary < 30, expanded section may still appear (50-100 miles)

---

### Scenario 8: Search Query Changes

**Setup:**
1. Log in as Customer
2. Start with sparse local supply showing expanded section

**Test Actions:**
1. Enter search query: "photographer"
2. Clear search query
3. Enter different query: "plumber"

**Expected Behavior:**
1. ✅ Each search triggers new cycle
2. ✅ Expansion evaluated independently per search
3. ✅ Section header appears/disappears based on results
4. ✅ No flicker during transitions

---

### Scenario 9: Pagination (Load More)

**Setup:**
1. Log in as Customer
2. Scroll down to trigger pagination

**Expected Behavior:**
1. ✅ "Load More" appends to existing array
2. ✅ Section header position remains stable
3. ✅ New listings append to appropriate section
4. ✅ No re-bucketing occurs during pagination
5. ✅ Expanded section structure preserved

---

### Scenario 10: Section Header UI

**Visual Checks:**
1. ✅ Section header has clear visual separation
2. ✅ Title: "More options nearby"
3. ✅ Subtitle: "Listings within 100 miles of your location"
4. ✅ Appropriate padding/spacing
5. ✅ Border top and bottom visible
6. ✅ Background color distinct from listings
7. ✅ Text color legible
8. ✅ Consistent across list and grid views

---

### Scenario 11: Performance Validation

**Metrics to Check:**
1. ✅ No additional network calls during expansion
2. ✅ No visible flicker or jank
3. ✅ Initial load speed unchanged
4. ✅ Scroll performance smooth
5. ✅ Memory usage stable

**Dev Console Timing:**
```
[useListingsCursor] Cycle finalized: id=XXX finalCount=37
[useListingsCursor] Cycle commit: id=XXX visualCommitReady=true
```

---

### Scenario 12: Edge Cases

#### 12.1: Exactly 30 Listings
- ✅ NO expanded section (threshold is < 30)

#### 12.2: 29 Listings + 0 Expanded
- ✅ NO expanded section (expanded count = 0)

#### 12.3: Listings Exactly at 25 Miles
- ✅ Falls into primary bucket (≤ 25 miles)

#### 12.4: Listings Exactly at 100 Miles
- ✅ Falls into expanded bucket (≤ 100 miles)

#### 12.5: Listings Beyond 100 Miles
- ✅ NOT included in any bucket (filtered out)

---

## Debugging Commands

### Enable Dev Logging
App runs in development mode by default. Check console for:
```
[useListingsCursor] Home Discovery: Sparse local supply (N). Appending M nearby listings (≤100 mi).
```

### Check Expansion Metadata
Add temporary console.log in index.tsx:
```typescript
console.log('Expansion Metadata:', expansionMetadata);
```

### Check Listing Distances
Add temporary console.log:
```typescript
listings.forEach(l => console.log(`${l.title}: ${l.distance_miles} mi`));
```

### Check Map Markers
Add temporary console.log:
```typescript
console.log('Map Markers:', rawMapMarkers.filter(m => m.isExpanded));
```

---

## Rollback Procedure

If critical issues found:

### Quick Disable (No Code Changes)
```typescript
// In hooks/useListingsCursor.ts, line 27:
const SPARSE_LOCAL_THRESHOLD = 0; // Disables expansion
```

### Full Rollback
```bash
git revert <commit-hash>
```

---

## Success Criteria

All scenarios must pass:
- ✅ Scenario 1: Sparse supply shows expanded section
- ✅ Scenario 2: Sufficient supply shows no expanded section
- ✅ Scenario 3-5: Provider/Hybrid/Admin unchanged
- ✅ Scenario 6: No location works correctly
- ✅ Scenario 7-9: Dynamic behavior correct
- ✅ Scenario 10: UI renders correctly
- ✅ Scenario 11: Performance maintained
- ✅ Scenario 12: Edge cases handled

---

## Reporting Issues

When reporting issues, include:
1. User type (Customer/Provider/Hybrid/Admin)
2. Device location (if enabled)
3. Number of primary listings
4. Number of expanded listings
5. Dev console logs
6. Screenshots (especially of section header)
7. View mode (list/grid/map)

---

## Additional Testing

### Automated Testing
Consider adding integration tests:
- Customer with <30 listings → expansionMetadata.hasExpanded = true
- Customer with ≥30 listings → expansionMetadata = null
- Provider account → expansionMetadata = null

### Manual Performance Testing
1. Test with 1000+ listings in database
2. Verify no slowdown during expansion
3. Check memory usage remains stable
4. Verify smooth scrolling

---

## Notes

- Feature is **Customer-only** by design
- Expansion is **presentation-layer** only (no DB changes)
- Section header is **simple text** (no complex UI)
- Distance badges **always visible** (transparency requirement)
- Map markers include **isExpanded flag** for styling
