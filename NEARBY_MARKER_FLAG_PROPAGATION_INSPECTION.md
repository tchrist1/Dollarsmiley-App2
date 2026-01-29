# Nearby Marker Flag Propagation & Render Source Verification

## READ-ONLY INSPECTION REPORT

---

## PHASE 1 — MARKER OBJECT SHAPE TRACE

### Initial Marker Construction

**File:** `app/(tabs)/index.tsx`
**Location:** Lines 900-913

**Marker Properties:**
```typescript
{
  id: listing.id,
  latitude: lat,
  longitude: lng,
  title: listing.title,
  price: price,
  type: 'listing' as const,
  listingType: listingType,
  pricingType: listing.marketplace_type === 'Job' ? listing.pricing_type : undefined,
  isNearby: isNearby,  // ← KEY PROPERTY
}
```

**isNearby Calculation:**
```typescript
const listingId = `${listing.marketplace_type}:${listing.id}`;
const isNearby = nearbyIds.has(listingId);
```

**nearbyIds Source:**
```typescript
const nearbyIds = expansionMetadata.enabled
  ? new Set(listingsNearby.map(l => `${l.marketplace_type}:${l.id}`))
  : new Set();
```

**✅ CONFIRMED:** `isNearby` property exists at marker construction

---

### Marker Propagation Through Component Layers

**Layer 1: index.tsx → getMapMarkers**
- **File:** `app/(tabs)/index.tsx` Lines 919-936
- **Variable:** `stableMapMarkersRef.current = rawMapMarkers`
- **Assessment:** ✅ Marker objects passed unchanged (reference copy)

**Layer 2: getMapMarkers → HomeMapViewWrapper**
- **File:** `app/(tabs)/index.tsx` Line 1222
- **Prop:** `mapMarkers={getMapMarkers}`
- **Assessment:** ✅ Array reference passed directly

**Layer 3: HomeMapViewWrapper → InteractiveMapViewPlatform**
- **File:** `components/HomeMapViewWrapper.tsx` Line 62
- **Prop:** `markers={mapMarkers}`
- **Assessment:** ✅ Array reference passed directly

**Layer 4: InteractiveMapViewPlatform → InteractiveMapView (Web)**
- **File:** `components/InteractiveMapViewPlatform.tsx` Line 32
- **Prop:** `markers={props.markers}`
- **Assessment:** ✅ Array reference passed directly

**Layer 5: InteractiveMapView → MapMarkerPin**
- **File:** `components/InteractiveMapView.tsx` Line 442
- **Prop:** `isNearby={marker.isNearby}`
- **Assessment:** ✅ Flag explicitly passed to render component

---

## PHASE 2 — FILTER EXECUTION CONTEXT

### Filter Source Array

**File:** `components/InteractiveMapView.tsx`
**Lines:** 284-292

**Filter Logic:**
```typescript
const visibleMarkers = useMemo(() => {
  if (hasNearbyExpansion) {
    // Show all nearby markers regardless of viewport
    return markers.filter(marker => marker.isNearby || isMarkerInView(marker));
  }
  // Default behavior: filter all by viewport
  return markers.filter(isMarkerInView);
}, [markers, region, hasNearbyExpansion]);
```

**Assessment:**
- ✅ `markers` is the prop array from upstream (no reconstruction)
- ✅ Conditional bypass correctly implemented
- ✅ Dependency array includes `hasNearbyExpansion`

---

## PHASE 3 — RENDER SOURCE OF TRUTH

### Final Render Array

**File:** `components/InteractiveMapView.tsx`
**Line:** 293

```typescript
const clusteredItems = useMemo(() => clusterMarkers(visibleMarkers), [...]);
```

**Render Loop:**
- **Line 350:** `clusteredItems.map((item) => { ... })`
- **Line 438-444:** Renders `<MapMarkerPin>` with `isNearby={marker.isNearby}`

### clusterMarkers Function Analysis

**File:** `components/InteractiveMapView.tsx`
**Lines:** 225-265

**Behavior:**
1. If clustering disabled: Returns `markersToCluster` unchanged (line 227)
2. If clustering enabled:
   - Creates clusters from nearby markers
   - Returns `[...clusters, ...unclustered]` (line 264)
   - **Assessment:** ✅ Original marker objects preserved

---

## PHASE 4 — RENDER COMPONENT STYLING

### MapMarkerPin Component

**File:** `components/MapMarkerPin.tsx`

**Props Interface:** Lines 9-15
```typescript
interface MapMarkerPinProps {
  type: MarkerType;
  price?: number;
  isSelected?: boolean;
  isNearby?: boolean;  // ← ACCEPTED
  onPress?: () => void;
}
```

**Styling Application:** Lines 55, 67
```typescript
style={[styles.container, isNearby && styles.containerNearby]}
// ...
isNearby && styles.bubbleNearby,
```

**Nearby Styles:** Lines 160-165
```typescript
containerNearby: {
  opacity: 0.6,
},
bubbleNearby: {
  borderStyle: 'dashed',
},
```

**✅ CONFIRMED:** Component correctly accepts and applies `isNearby` styling

---

## PHASE 5 — EXPANSION SIGNAL PROPAGATION

### hasNearbyExpansion Signal Chain

**Source:** `hooks/useListingsCursor.ts` Line 425
```typescript
setExpansionMetadata({
  enabled: nearby.length > 0,  // ← SOURCE OF TRUTH
  selectedDistance,
  expandedMax: EXPANDED_DISTANCE_MAX,
  primaryCount: mergedPrimary.length,
  nearbyCount: nearby.length,
});
```

**Propagation:**
1. `useListingsCursor` returns `expansionMetadata`
2. `app/(tabs)/index.tsx` Line 1250: `hasNearbyExpansion={expansionMetadata.enabled}`
3. `HomeMapViewWrapper` Line 70: Forwards prop
4. `InteractiveMapViewPlatform` Line 43: Forwards prop
5. `InteractiveMapView` Line 77: Receives prop
6. Line 285: Used in filter condition

**✅ CONFIRMED:** Signal correctly propagated end-to-end

---

## DEFINITIVE FINDINGS

### A) Does marker.isNearby exist at render time?

**YES** ✅

Evidence:
- Property set at construction (index.tsx:912)
- Passed unchanged through all layers
- Received by MapMarkerPin component (MapMarkerPin.tsx:46)
- Applied to styling (MapMarkerPin.tsx:55, 67)

### B) If NO, where is it lost?

**NOT APPLICABLE** - Property is NOT lost

### C) Is the rendered marker array the same as the filtered one?

**YES** ✅

- `visibleMarkers` → `clusteredItems` → `clusteredItems.map()` → render
- No reconstruction or transformation that drops properties
- Marker objects maintain all properties including `isNearby`

### D) Why viewport bypass logic never results in visible markers

**HYPOTHESIS: The issue is NOT in the code logic**

All implementation is correct:
1. ✅ Marker construction includes `isNearby`
2. ✅ Filter bypass logic: `marker.isNearby || isMarkerInView(marker)`
3. ✅ Signal propagation: `expansionMetadata.enabled` → `hasNearbyExpansion`
4. ✅ Render component applies styling

**POTENTIAL ROOT CAUSES (require runtime debugging):**

1. **State Timing Issue**
   - `expansionMetadata.enabled` might not be `true` when expected
   - `listingsNearby` might be empty even when expansion completes
   - Race condition between state updates

2. **Data Issue**
   - Nearby listings might not actually have `isNearby: true` set
   - `nearbyIds` Set might be empty due to ID mismatch
   - Listing IDs format mismatch: `"Service:123"` vs `"Job:123"`

3. **Filter Condition Never True**
   - `hasNearbyExpansion` evaluates to `false` at filter time
   - Both `marker.isNearby` and `isMarkerInView(marker)` evaluate to `false`
   - Markers filtered out before clustering

4. **View Mode Timing**
   - User not in map view when expansion completes
   - `rawMapMarkers` returns `[]` due to early return (line 796)
   - Subsequent view switch doesn't trigger recalculation

### E) The SINGLE line or transformation responsible

**CANNOT BE DETERMINED FROM STATIC CODE INSPECTION**

The code implementation is correct. The blocker is likely:
- Runtime state values not matching expectations
- Timing/sequencing issue not visible in code structure
- Data format mismatch in listing IDs

---

## RECOMMENDED NEXT STEPS (Not Part of Inspection)

To identify the actual blocker, add runtime logging at key points:

1. **In index.tsx rawMapMarkers:**
   ```typescript
   console.log('rawMapMarkers:', {
     totalMarkers: allListings.length,
     nearbyIdsSize: nearbyIds.size,
     nearbyMarkerCount: listingMarkers.filter(m => m.isNearby).length,
     expansionEnabled: expansionMetadata.enabled
   });
   ```

2. **In InteractiveMapView visibleMarkers:**
   ```typescript
   console.log('visibleMarkers filter:', {
     inputCount: markers.length,
     hasNearbyExpansion,
     nearbyCount: markers.filter(m => m.isNearby).length,
     outputCount: visibleMarkers.length
   });
   ```

3. **In fetchExpansionResults completion:**
   ```typescript
   console.log('Expansion state:', {
     nearbyLength: nearby.length,
     enabled: nearby.length > 0,
     primaryCount: mergedPrimary.length
   });
   ```

---

## CONCLUSION

From static code inspection, **all implementation is correct**. The `isNearby` flag exists throughout the entire pipeline from construction to render. The filter bypass logic is correctly implemented. The signal propagation is complete.

The render blocker is NOT in the code structure but likely in **runtime state values or timing**. Further investigation requires runtime debugging with console logging to identify which assumption is failing at execution time.

---

END OF INSPECTION REPORT
