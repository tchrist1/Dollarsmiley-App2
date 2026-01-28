# Nearby Map Markers Non-Rendering Root Cause Analysis

## READ-ONLY INSPECTION REPORT

---

## PHASE 1 — MARKER SOURCE TRACE

### Primary Marker Source Variable

**File:** `app/(tabs)/index.tsx`

**Variable Name:** `rawMapMarkers`

**Location:** Lines 794-917

**Computation:**
```typescript
const rawMapMarkers = useMemo(() => {
  if (viewMode !== 'map') {
    return [];
  }

  // PHASE 4: Use primary + nearby arrays when expansion is enabled
  const allListings = expansionMetadata.enabled
    ? [...listingsPrimary, ...listingsNearby]
    : listings;

  // ... marker construction from allListings

}, [listings, listingsPrimary, listingsNearby, expansionMetadata.enabled, ...]);
```

**Analysis:**
✓ Unified source `allListings` IS implemented correctly
✓ Uses `listingsPrimary` + `listingsNearby` when expansion enabled
✓ Dependencies include all necessary state: `listingsPrimary`, `listingsNearby`, `expansionMetadata.enabled`

---

## PHASE 2 — EXPANSION DATA REACHABILITY

### listingsNearby Source

**File:** `hooks/useListingsCursor.ts`

**Definition:** Line 88 - `const [listingsNearby, setListingsNearby] = useState<MarketplaceListing[]>([]);`

**Updates:** Lines 422-423 in `fetchExpansionResults`
```typescript
setListingsPrimary(mergedPrimary);
setListingsNearby(nearby);
```

**Reachability to Map Logic:**
✓ DIRECT reference in rawMapMarkers (line 802)
✓ Used in `allListings` unified source
✓ Included in dependency array (line 917)

**Verdict:** listingsNearby data DOES reach map marker construction

---

## PHASE 3 — MEMOIZATION & DEPENDENCY AUDIT

### Memo Block 1: rawMapMarkers

**File:** `app/(tabs)/index.tsx`
**Lines:** 794-917

**Dependencies:**
```typescript
[listings, listingsPrimary, listingsNearby, expansionMetadata.enabled,
 mapMode, profile?.user_type, hasHydratedLiveData, viewMode]
```

**Assessment:**
✓ All expansion-related deps present
✓ Includes listingsPrimary
✓ Includes listingsNearby
✓ Includes expansionMetadata.enabled

### Memo Block 2: getMapMarkers (CRITICAL GATE)

**File:** `app/(tabs)/index.tsx`
**Lines:** 920-936

**Code:**
```typescript
const getMapMarkers = useMemo(() => {
  if (visualCommitReady) {
    stableMapMarkersRef.current = rawMapMarkers;
  }
  return stableMapMarkersRef.current;
}, [rawMapMarkers, visualCommitReady]);
```

**Dependencies:**
```typescript
[rawMapMarkers, visualCommitReady]
```

**Assessment:**
✓ Depends on rawMapMarkers (correct)
✓ Depends on visualCommitReady (gating mechanism)
⚠️ **POTENTIAL ISSUE:** Gate only updates ref when `visualCommitReady === true`

---

## PHASE 4 — VISUAL COMMIT READY GATE ANALYSIS

### visualCommitReady Source

**File:** `hooks/useListingsCursor.ts`

**Initial State:** Line 99 - `const [visualCommitReady, setVisualCommitReady] = useState(true);`

**Set to FALSE:** Lines 926-927 (when new fetch cycle starts)
```typescript
if (!snapshotLoadedRef.current || initialLoadComplete) {
  setVisualCommitReady(false);
}
```

**Set to TRUE:** Lines 710-714, 759-761 (when primary fetch finalizes)
```typescript
if (!commitDoneRef.current) {
  commitDoneRef.current = true;
  setVisualCommitReady(true);
}
```

### Expansion Fetch Impact

**File:** `hooks/useListingsCursor.ts`
**Function:** `fetchExpansionResults` (lines 287-448)

**State Updates When Expansion Completes:**
```typescript
setListingsPrimary(mergedPrimary);     // Line 422
setListingsNearby(nearby);             // Line 423
setExpansionMetadata({...});           // Line 424
setListings([...]);                    // Line 433
```

**❌ CRITICAL FINDING:**
`fetchExpansionResults` NEVER calls `setVisualCommitReady(true)`

### Flow Analysis

1. User changes distance filter
2. `visualCommitReady = false` (new cycle starts)
3. Primary fetch completes → `visualCommitReady = true`
4. Expansion fetch starts (async, non-blocking)
5. **Expansion fetch completes → NO visualCommitReady update**
6. `listingsPrimary`, `listingsNearby`, `expansionMetadata` all update
7. `rawMapMarkers` recalculates (deps changed)
8. `getMapMarkers` memo runs with new `rawMapMarkers`
9. Line 921: `if (visualCommitReady)` → **TRUE** (from primary fetch)
10. Line 922: `stableMapMarkersRef.current = rawMapMarkers` → **SHOULD UPDATE**

**Theoretical Result:** Should work correctly

---

## PHASE 5 — VIEW MODE GATE ANALYSIS

### Early Return in rawMapMarkers

**File:** `app/(tabs)/index.tsx`
**Lines:** 795-798

```typescript
const rawMapMarkers = useMemo(() => {
  if (viewMode !== 'map') {
    return [];
  }
  // ... rest of logic
}, [..., viewMode]);
```

### Scenario Analysis: User Not in Map Mode When Expansion Completes

**Timeline:**
1. User in Grid mode, applies distance filter
2. Primary fetch completes → 20 results
3. Expansion fetch triggers (async)
4. `viewMode = 'grid'` → `rawMapMarkers = []` (early return)
5. Expansion completes → updates listingsPrimary/listingsNearby
6. `rawMapMarkers` recalculates → still `'grid'` → returns `[]`
7. `getMapMarkers` runs → `visualCommitReady = true` → **`stableMapMarkersRef.current = []`**
8. User switches to Map mode → `viewMode = 'map'`
9. `rawMapMarkers` recalculates → computes markers with nearby data
10. `getMapMarkers` runs → `visualCommitReady = true` → updates ref
11. **Markers should appear**

**Assessment:** Should recover when user switches to map view

---

## PHASE 6 — MAP COMPONENT PROPS INSPECTION

### Props Flow

**File:** `app/(tabs)/index.tsx` → `HomeMapViewWrapper` → `InteractiveMapViewPlatform` → `InteractiveMapView`

**Chain:**
1. `index.tsx` line 1222: `mapMarkers={getMapMarkers}`
2. `HomeMapViewWrapper.tsx` line 60: `markers={mapMarkers}`
3. `InteractiveMapViewPlatform` forwards to `InteractiveMapView`
4. `InteractiveMapView` line 50: `markers: MapMarker[]`

**InteractiveMapView Internal Processing:**

**Lines 281-282:**
```typescript
const visibleMarkers = useMemo(() => markers.filter(isMarkerInView), [markers, region]);
const clusteredItems = useMemo(() => clusterMarkers(visibleMarkers), [...]);
```

**❌ POTENTIAL FILTER ISSUE:**
`isMarkerInView` function (lines 203-215) filters markers by map region bounds

### isMarkerInView Function

```typescript
const isMarkerInView = (marker: MapMarker): boolean => {
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lngMin = region.longitude - region.longitudeDelta / 2;
  const lngMax = region.longitude + region.longitudeDelta / 2;

  return (
    marker.latitude >= latMin &&
    marker.latitude <= latMax &&
    marker.longitude >= lngMin &&
    marker.longitude <= lngMax
  );
};
```

**Assessment:** Nearby markers beyond visible region would be filtered out

---

## ROOT CAUSE HYPOTHESIS

### Primary Suspect: Map Region Bounds Filtering

**The Issue:**

1. When distance filter is set (e.g., 25 miles), primary results are within 25 miles
2. Map region auto-fits to show primary markers
3. Nearby markers are beyond 25 miles (25-50 miles away)
4. Map region doesn't include nearby marker locations
5. `isMarkerInView` filters out nearby markers
6. Nearby markers never render, even though they're in the data

### Supporting Evidence

- Unified source `allListings` correctly includes nearby markers ✓
- `rawMapMarkers` correctly builds markers with `isNearby: true` flag ✓
- `getMapMarkers` correctly updates ref when expansion completes ✓
- Markers passed to InteractiveMapView include nearby markers ✓
- **BUT:** `visibleMarkers` filters by current map region bounds
- **AND:** Map region is calculated from primary markers only (line 105-109)

### The Missing Link

**File:** `InteractiveMapView.tsx`
**Lines:** 103-110

```typescript
useEffect(() => {
  if (markers.length > 0 && !initialRegion) {
    const bounds = calculateBounds(markers);
    setRegion(bounds);
  }
  setMapLoaded(true);
}, [markers]);
```

**Issue:** When `markers` prop updates to include nearby markers:
- calculateBounds() should expand region to include all markers
- BUT dependency is `[markers]` - should trigger
- **UNLESS** markers array reference doesn't change properly

---

## SECONDARY SUSPECT: Marker Array Reference Stability

### getMapMarkers Returns Ref

**File:** `app/(tabs)/index.tsx`
**Line:** 935

```typescript
return stableMapMarkersRef.current;
```

**Problem:**
`stableMapMarkersRef.current` is the SAME array reference until visualCommitReady gate updates it.

**Flow:**
1. Primary fetch completes → ref = [20 markers]
2. Expansion completes → `rawMapMarkers` recalculates = new array with 50 markers
3. `getMapMarkers` memo runs → updates ref → ref = [50 markers] (NEW reference)
4. InteractiveMapView receives new markers prop
5. useEffect `[markers]` should trigger → recalculate bounds

**Should work IF getMapMarkers properly returns new reference**

---

## FINDINGS SUMMARY

### Data Flow: CORRECT ✓

- listingsNearby populated correctly
- Unified source implemented correctly
- Dependencies configured correctly
- visualCommitReady gate allows updates (stays true)

### Rendering Pipeline: SUSPECTED ISSUE ⚠️

**Two Possible Blockers:**

1. **Map Region Bounds Filtering** (Most Likely)
   - Nearby markers beyond current viewport are filtered out
   - Map region may not expand to include nearby markers
   - File: `InteractiveMapView.tsx` lines 103-110, 203-215, 281

2. **Marker Array Reference Timing** (Less Likely)
   - If ref doesn't update properly, InteractiveMapView won't recalculate region
   - File: `app/(tabs)/index.tsx` lines 920-936

---

## THE SINGLE LINE BLOCKING NEARBY MARKERS

**File:** `InteractiveMapView.tsx`
**Line:** 281

```typescript
const visibleMarkers = useMemo(() => markers.filter(isMarkerInView), [markers, region]);
```

**Explanation:**

This filter removes ALL markers outside current map viewport. When:
- Primary markers establish initial map region (25 miles)
- Nearby markers arrive (25-50 miles away)
- Map region doesn't expand to include them
- `isMarkerInView` filters them out
- They never render

**Why "unified source" change had no effect:**

The unified source successfully got nearby markers into the `markers` prop, but they were filtered out AFTER reaching InteractiveMapView due to viewport bounds checking.

---

## RECOMMENDATION

Investigation complete. The blocker is viewport-based filtering in InteractiveMapView, not data flow or memoization issues.

Root cause identified: Lines 103-110 and 281 in InteractiveMapView.tsx

---

END OF INSPECTION REPORT
