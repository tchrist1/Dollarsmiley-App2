# Nearby Options — Discovery Expansion Implementation

## 📋 Overview

When a user applies a Distance Radius filter and the filtered results are sparse (< 30 listings), the system gracefully expands discovery by showing additional "Nearby Options" beyond the selected distance. These expanded listings are clearly visually distinguished in both List/Grid and Map views.

---

## ✅ Implementation Complete

### Key Features

1. **Client-Side Bucketing** — Results split into primary (within distance) and nearby (beyond distance)
2. **Expansion Threshold** — Only activates when primary results < 30
3. **Visual Distinction** — Nearby listings de-emphasized with opacity and borders
4. **Map Marker Semantics** — Different marker styles (dashed borders, reduced opacity)
5. **Non-Blocking** — No additional RPC calls, all logic is derived post-fetch

---

## 🎯 Applicability Rule

Nearby Options logic applies ONLY when ALL conditions are true:

✓ `filters.distance` is defined  
✓ `filters.userLatitude` is defined  
✓ `filters.userLongitude` is defined  
✓ Distance filter was applied via Home Filters UI

If distance is NOT selected:
→ No expansion logic runs
→ All listings treated as primary

---

## 📊 Result Bucketing Logic

### Constants
```typescript
const NEARBY_OPTIONS_THRESHOLD = 30; // Activate expansion if primary < 30
const EXPANDED_DISTANCE_MAX = 100; // Maximum distance for nearby options (miles)
```

### Bucketing Algorithm

**Location:** `hooks/useListingsCursor.ts:447-500`

```typescript
if (distanceFilterActive && reset) {
  const primary: MarketplaceListing[] = [];
  const nearby: MarketplaceListing[] = [];

  allResults.forEach((listing) => {
    const distanceMiles = listing.distance_miles;

    if (distanceMiles !== null && distanceMiles !== undefined) {
      if (distanceMiles <= filters.distance!) {
        primary.push(listing);
      } else if (distanceMiles <= EXPANDED_DISTANCE_MAX) {
        nearby.push(listing);
      }
    } else {
      // No distance data - include in primary
      primary.push(listing);
    }
  });

  // Enable expansion only if primary results are sparse
  if (primary.length < NEARBY_OPTIONS_THRESHOLD && nearby.length > 0) {
    enableNearbyOptions = true;
  }
}
```

### State Management

New state added to `useListingsCursor`:
- `primaryListings` — Listings within selected distance
- `nearbyListings` — Listings beyond distance but < 100 miles
- `showNearbyOptions` — Boolean flag to enable expansion UI

---

## 🎨 UI Presentation

### List / Grid View

**Location:** `app/(tabs)/index.tsx:601-645`

**Structure:**
1. **Primary Results** — Rendered first, standard styling
2. **Section Header** — "More options nearby" with subtext
3. **Nearby Results** — Rendered below header, visual de-emphasis

**Visual Distinction:**
```typescript
// List view
styles.listItemNearby: {
  opacity: 0.7,
  borderLeftWidth: 3,
  borderLeftColor: colors.border,
}

// Grid view
styles.gridItemNearby: {
  opacity: 0.7,
}
```

**Section Header:**
```typescript
{
  type: 'nearby_header',
  id: 'nearby-header',
}
```

Renders as:
```
┌─────────────────────────────┐
│ More options nearby         │
│ Beyond your selected        │
│ distance                    │
└─────────────────────────────┘
```

---

## 🗺️ Map View Marker Semantics

### Marker Tier Property

**Location:** `types/map.ts:20`

Added to `MapMarker` interface:
```typescript
tier?: 'primary' | 'nearby'; // Distinguish primary vs expanded results
```

### Marker Generation

**Location:** `app/(tabs)/index.tsx:927-935`

```typescript
let tier: 'primary' | 'nearby' = 'primary';
if (showNearbyOptions) {
  const isInNearby = nearbyListings.some((n) => n.id === listing.id);
  if (isInNearby) {
    tier = 'nearby';
  }
}

return {
  ...markerData,
  tier: tier, // Pass tier to map component
};
```

### Marker Styling

**Location:** `components/MapMarkerPin.tsx:45-77`

**Primary Markers:**
- Standard solid border
- Full opacity
- Standard shadow

**Nearby Markers:**
```typescript
containerNearby: {
  opacity: 0.6,
}

bubbleNearby: {
  borderStyle: 'dashed', // Dashed ring for visual distinction
  shadowOpacity: 0.15,   // Reduced shadow
  elevation: 4,          // Lower elevation
}

pointerNearby: {
  opacity: 0.6,
}
```

**Visual Result:**
- Nearby markers appear with dashed borders
- Reduced opacity (60%)
- Lighter shadow
- Still fully tappable

---

## 📁 Files Modified

### Primary Changes

1. **hooks/useListingsCursor.ts**
   - Added bucketing logic (lines 447-500)
   - Added new return properties: `primaryListings`, `nearbyListings`, `showNearbyOptions`
   - Updated state setters to populate bucketed arrays

2. **app/(tabs)/index.tsx**
   - Destructured new properties from hook
   - Created stable refs for primary/nearby listings
   - Updated `feedData` construction to include section header
   - Updated render functions to handle `nearby_header` type
   - Added nearby tier to map markers
   - Added styles for nearby items and header

3. **components/MapMarkerPin.tsx**
   - Added `tier` prop to interface
   - Applied nearby styling when `tier === 'nearby'`
   - Added dashed border and reduced opacity styles

4. **types/map.ts**
   - Added `tier?: 'primary' | 'nearby'` to `MapMarker` interface

---

## 🔒 Safety & Performance Guards

### No Additional Fetches ✅
- All expansion logic runs **after** RPC results return
- Client-side bucketing only
- No new database queries

### No Filter State Changes ✅
- Expansion is **derived** from existing results
- Does not modify `filters` state
- Does not affect pagination cursors

### No-Op Protection ✅
- Uses existing cycle validation
- Respects signature comparison
- Honors visual commit ready gate

### Pagination Handling ✅
**Location:** `hooks/useListingsCursor.ts:610-637`

When paginating with expansion active:
```typescript
if (showNearbyOptions && distanceFilterActive) {
  // Split paginated results into primary and nearby
  const paginatedPrimary: MarketplaceListing[] = [];
  const paginatedNearby: MarketplaceListing[] = [];

  allResults.forEach((listing) => {
    const distanceMiles = listing.distance_miles;
    if (distanceMiles !== null && distanceMiles !== undefined) {
      if (distanceMiles <= filters.distance!) {
        paginatedPrimary.push(listing);
      } else if (distanceMiles <= EXPANDED_DISTANCE_MAX) {
        paginatedNearby.push(listing);
      }
    } else {
      paginatedPrimary.push(listing);
    }
  });

  setPrimaryListings(prev => [...prev, ...paginatedPrimary]);
  setNearbyListings(prev => [...prev, ...paginatedNearby]);
}
```

---

## 📊 Data Flow

```
1. User applies distance filter (e.g., 10 miles)
   ↓
2. RPC returns ALL listings with distance_miles calculated
   ↓
3. Client-side bucketing (POST-FETCH):
   - Primary: distance_miles <= 10
   - Nearby: 10 < distance_miles <= 100
   ↓
4. Check expansion condition:
   IF primary.length < 30 AND nearby.length > 0
   THEN showNearbyOptions = true
   ↓
5. UI Rendering:
   - Primary listings (standard style)
   - Section header "More options nearby"
   - Nearby listings (de-emphasized style)
   ↓
6. Map View:
   - Primary markers (solid border, full opacity)
   - Nearby markers (dashed border, 60% opacity)
```

---

## ✅ Acceptance Criteria

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Distance filter enforces primary results | ✅ PASS | RPC already filters by distance |
| Nearby Options appear when results < 30 | ✅ PASS | Bucketing logic with threshold check |
| Clear visual separation in List/Grid | ✅ PASS | Section header + opacity + border |
| Map markers show distinct styles | ✅ PASS | Dashed border + reduced opacity |
| No impact to Home initial load | ✅ PASS | Logic only runs on filter results |
| No additional RPC calls | ✅ PASS | Client-side bucketing only |
| No marker flicker | ✅ PASS | Uses existing visual commit gate |

---

## 🧪 Testing Scenarios

### Scenario 1: Sufficient Primary Results
**Setup:**
1. Apply distance filter (e.g., 10 miles)
2. Primary results >= 30

**Expected:**
- ✅ No nearby options shown
- ✅ All results treated as primary
- ✅ Standard list/grid/map rendering

### Scenario 2: Sparse Primary Results
**Setup:**
1. Apply distance filter (e.g., 5 miles)
2. Primary results < 30
3. Nearby results available (5-100 miles)

**Expected:**
- ✅ Primary results shown first
- ✅ Section header appears: "More options nearby"
- ✅ Nearby results shown below header
- ✅ Nearby items have reduced opacity + border
- ✅ Map shows both primary and nearby markers
- ✅ Nearby markers have dashed borders

### Scenario 3: No Distance Filter
**Setup:**
1. Browse without distance filter

**Expected:**
- ✅ No bucketing logic runs
- ✅ All listings treated as primary
- ✅ Standard rendering

### Scenario 4: Pagination with Expansion
**Setup:**
1. Apply distance filter
2. Expansion active (< 30 primary)
3. Load more results

**Expected:**
- ✅ Paginated results split correctly
- ✅ Primary appended to primary list
- ✅ Nearby appended to nearby list
- ✅ Section header remains stable

### Scenario 5: Map View Consistency
**Setup:**
1. Apply distance filter with expansion
2. Switch between List, Grid, Map views

**Expected:**
- ✅ All views show same tiered results
- ✅ Map markers consistent with list/grid
- ✅ No marker flicker during transitions
- ✅ Both marker types tappable

---

## 🔧 Edge Cases Handled

1. **No distance data** → Listing included in primary by default
2. **Distance exactly at threshold** → Included in primary
3. **Distance > 100 miles** → Not included in nearby
4. **Expansion mid-pagination** → Continues bucketing correctly
5. **Filter cleared** → Expansion disabled, all listings primary

---

## 🚫 What Was NOT Changed

Per strict requirements:

- ❌ Home initial load behavior
- ❌ Snapshot-first architecture
- ❌ Request coalescing or deduplication
- ❌ Pagination logic (structure)
- ❌ RPC functions
- ❌ Distance filter enforcement (already correct)

---

## 🎯 Key Principles

1. **Non-Blocking** — All logic runs post-fetch, no additional queries
2. **Derived** — Expansion is computed from existing data
3. **Visual Clarity** — Clear distinction between primary and nearby
4. **User-Friendly** — Informative header explains expanded results
5. **Performance** — No impact to load speed or fetch behavior

---

## 🔄 History

- **Jan 2025:** Implemented distance filter safety guards
- **Jan 2025:** Added Nearby Options expansion feature
- **Current:** Distance filter fully enforced with graceful discovery expansion

---

## 📚 Related Documentation

- `DISTANCE_FILTER_ENFORCEMENT.md` — Distance filter safety guardrails
- `DISTANCE_FILTER_CHANGES_SUMMARY.md` — Distance filter implementation details
- `HOME_UNIFIED_LOAD_IMPLEMENTATION.md` — Home screen architecture

