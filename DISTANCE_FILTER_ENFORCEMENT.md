# Distance Radius Filter — Enforcement & Safety Guardrails

## 📋 Overview

This document describes the safety guardrails and enforcement logic for the Distance Radius filter in the Home screen.

---

## ✅ PHASE 1: Audit Results

### RPC Parameter Passing
**Status:** ✅ CORRECT

Both cursor-based RPC functions correctly pass all three required parameters:

**Services RPC (`get_services_cursor_paginated_v2`):**
- `p_user_lat` — User latitude
- `p_user_lng` — User longitude
- `p_distance` — Distance radius in miles

**Jobs RPC (`get_jobs_cursor_paginated_v2`):**
- `p_user_lat` — User latitude
- `p_user_lng` — User longitude
- `p_distance` — Distance radius in miles

**Location:** `hooks/useListingsCursor.ts:327-330, 367-369`

### Signature Generation
**Status:** ✅ CORRECT

Stable signature includes all three distance-related parameters:

```typescript
{
  distance: filts.distance !== undefined && filts.distance !== null ? filts.distance : null,
  userLat: filts.userLatitude !== undefined && filts.userLatitude !== null ? filts.userLatitude : null,
  userLng: filts.userLongitude !== undefined && filts.userLongitude !== null ? filts.userLongitude : null,
}
```

**Location:** `hooks/useListingsCursor.ts:131-133`

---

## 🛡️ PHASE 2: Safety Guards Implemented

### Guard #1: Filter Application (Home Screen)
**File:** `app/(tabs)/index.tsx:660-694`

**Logic:**
- Checks if distance is set AND coordinates are missing
- If true: Clears distance, preserves all other filters
- If false: Applies all filters normally

**Result:**
- Prevents empty result sets
- Prevents blank Map View
- Preserves user's other filter selections

**Code:**
```typescript
const hasDistance = newFilters.distance !== undefined && newFilters.distance !== null;
const hasCoordinates =
  newFilters.userLatitude !== undefined &&
  newFilters.userLatitude !== null &&
  newFilters.userLongitude !== undefined &&
  newFilters.userLongitude !== null;

if (hasDistance && !hasCoordinates) {
  // Clear distance but preserve all other filters
  setFilters({ ...newFilters, distance: undefined });
} else {
  // All filters valid - apply directly
  setFilters(newFilters);
}
```

### Guard #2: Modal Apply Button (Filter Modal)
**File:** `components/FilterModalAnimated.tsx:211-251`

**Logic:**
- Checks if distance is set AND coordinates are missing
- If true: Shows alert to user, prevents modal from closing
- If false: Closes modal and applies filters normally

**Result:**
- User-visible feedback
- Prevents applying invalid filter state
- Guides user to fix the issue

**Code:**
```typescript
const hasDistance = draftFilters.distance !== undefined && draftFilters.distance !== null;
const hasCoordinates =
  draftFilters.userLatitude !== undefined &&
  draftFilters.userLatitude !== null &&
  draftFilters.userLongitude !== undefined &&
  draftFilters.userLongitude !== null;

if (hasDistance && !hasCoordinates) {
  if (Platform.OS !== 'web') {
    Alert.alert(
      'Location Required',
      'Distance filter requires a location. Please enable location services or select a location on the map.',
      [{ text: 'OK', style: 'default' }]
    );
  }
  return; // Don't close modal
}
```

---

## ✅ PHASE 3: Map View Consistency

### Map Markers Source
**Status:** ✅ VERIFIED CORRECT

Map markers are derived from the SAME `listings` array used by List/Grid views.

**Data Flow:**
```
useListingsCursor (RPC with distance filtering)
    ↓
listings array
    ↓
rawMapMarkers (useMemo, filters by coordinates)
    ↓
getMapMarkers (waits for visualCommitReady)
    ↓
HomeMapViewWrapper → InteractiveMapViewPlatform
```

**Key Safety:**
- Markers wait for `visualCommitReady === true`
- No duplicate data sources
- No client-side filtering
- Single source of truth

**Location:** `app/(tabs)/index.tsx:813-891`

### Map Rendering Guards
**Status:** ✅ VERIFIED CORRECT

**Guards:**
1. Filter by valid coordinates: `listing.latitude != null && listing.longitude != null`
2. Respect map mode (services, jobs_all, jobs_fixed, jobs_quoted, listings)
3. Wait for visual commit before updating: `if (visualCommitReady)`
4. Validate markers in DEV mode: Check for null coordinates

**Result:**
- No marker flicker during filter changes
- Consistent with List/Grid views
- No empty map states

---

## ✅ PHASE 4: No-Op Protection

### Existing Protections
**Status:** ✅ VERIFIED CORRECT

Distance-only filter changes are protected by:

1. **Cycle validation** — Stale results discarded
2. **Signature comparison** — Duplicate fetches prevented
3. **Result signature** — No-op commits suppressed
4. **Visual commit ready** — Smooth transitions

**Location:** `hooks/useListingsCursor.ts:89-154`

**Key Mechanisms:**
- `cycleIdRef` — Tracks fetch cycles
- `cycleSignatureRef` — Detects duplicate requests
- `lastCommittedResultSigRef` — Prevents redundant commits
- `visualCommitReady` — Controls UI updates

**Result:**
- No multiple fetches on distance change
- No map marker flicker
- No clearing of markers before new results

---

## 📊 Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| Distance constrains results when coords exist | ✅ PASS | RPC receives all 3 params correctly |
| No empty Home screen after distance filter | ✅ PASS | Guard clears distance if coords missing |
| Map shows markers when listings exist | ✅ PASS | Same data source as List/Grid |
| No regression in Home load speed | ✅ PASS | Guards are non-blocking |
| No change to snapshot behavior | ✅ PASS | No modifications to snapshot logic |
| No new network calls | ✅ PASS | Uses existing cycle management |

---

## 🔬 Testing Scenarios

### Scenario 1: Distance Filter with Valid Location
**Setup:**
1. Set location with coordinates
2. Set distance radius (e.g., 10 miles)
3. Apply filters

**Expected:**
- ✅ RPC receives: distance=10, lat, lng
- ✅ Results filtered by distance
- ✅ Map shows filtered markers
- ✅ No errors

### Scenario 2: Distance Filter without Location
**Setup:**
1. Clear location
2. Set distance radius (e.g., 10 miles)
3. Try to apply filters

**Expected:**
- ✅ Alert shown: "Location Required"
- ✅ Modal stays open
- ✅ Filters not applied

### Scenario 3: Distance Filter after Location Cleared
**Setup:**
1. Set location and distance
2. Apply filters
3. Clear location
4. Apply filters again

**Expected:**
- ✅ Distance automatically cleared
- ✅ Other filters preserved
- ✅ Results show all listings (unfiltered by distance)
- ✅ Map shows all markers

### Scenario 4: Map View Consistency
**Setup:**
1. Apply distance filter with valid location
2. Switch between List, Grid, Map views

**Expected:**
- ✅ All views show same listings
- ✅ Map markers match List/Grid items
- ✅ No marker flicker
- ✅ No duplicate fetches

---

## 🔧 Edge Cases Handled

1. **Distance set, coordinates missing** → Distance cleared automatically
2. **Location cleared, distance preserved** → Distance cleared on next apply
3. **Rapid filter changes** → Cycle validation prevents race conditions
4. **Map view during filter transition** → Visual commit prevents flicker
5. **Invalid coordinates (null/undefined)** → Markers filtered out gracefully

---

## 📚 Related Files

### Primary Files
- `app/(tabs)/index.tsx` — Safety guard in handleApplyFilters
- `components/FilterModalAnimated.tsx` — User alert on apply
- `hooks/useListingsCursor.ts` — RPC parameter passing

### Supporting Files
- `components/HomeMapViewWrapper.tsx` — Map rendering
- `components/InteractiveMapViewPlatform.tsx` — Map component
- `hooks/useMapData.ts` — Location services
- `components/FilterSections.tsx` — Distance UI component

---

## 🎯 Key Principles

1. **Non-blocking** — Guards never delay initial load
2. **Fail-safe** — Invalid states automatically corrected
3. **Single source** — Map uses same data as List/Grid
4. **User-visible** — Errors shown with actionable guidance
5. **Performance** — No additional fetches or redundant commits

---

## 🔄 History

- **Jan 2025:** Audited distance filtering RPC parameters
- **Jan 2025:** Implemented safety guards for coordinates
- **Jan 2025:** Verified map marker consistency
- **Current:** Distance filter fully enforced with guardrails

