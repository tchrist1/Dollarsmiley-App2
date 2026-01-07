# Map Pin Tap Inconsistency + Filter Reset Button Fix

**Status:** ✅ COMPLETE
**Date:** January 7, 2026

## Issues Resolved

### Issue A: Map Pins & Price Tags Open Inconsistently
Map pins and price tags were not reliably responding to taps, causing frustration when users tried to view listing details.

### Issue B: Filter "Reset" Button Does Not Work
The Reset button inside the Filters modal did not properly clear filters or refresh results, even though "Clear all" worked correctly from the Discover screen.

---

## Changes Made

### 1. Fixed Filter Reset Button (`components/FilterModal.tsx`)

**Problem:** Reset button only cleared local state but didn't apply the changes or refresh results.

**Solution:**
- Updated `handleReset` to immediately apply `defaultFilters` via `onApply()`
- Added `onClose()` to dismiss the modal after reset
- This ensures filters are fully reset AND results refresh immediately

**Code Changes:**
```typescript
const handleReset = useCallback(() => {
  // Reset all state variables to defaults
  setSelectedCategories([]);
  setLocation('');
  setPriceMin('');
  setPriceMax('');
  setSliderMinPrice(0);
  setSliderMaxPrice(50000);
  setUseSlider(true);
  setMinRating(0);
  setDistance(25);
  setAvailability('any');
  setSortBy('relevance');
  setVerified(false);
  setInstantBooking(false);
  setListingType('all');
  setFulfillmentTypes([]);
  setShippingMode('all');
  setHasVAS(false);
  setSelectedTags([]);
  setUseCurrentLocation(false);
  setSelectedPreset(null);

  // NEW: Apply defaults and close modal
  onApply(defaultFilters);
  onClose();
}, [onApply, onClose]);
```

**Result:**
- ✅ All filter selections clear immediately
- ✅ Results refresh with default/unfiltered data
- ✅ Modal closes automatically
- ✅ Works consistently for Jobs, Services, and Custom Services

---

### 2. Fixed Map Pin Tap Handling (`components/InteractiveMapView.tsx`)

**Problem:** Touch events were being intercepted or blocked by the parent View container.

**Solution:**
- Changed `pointerEvents` from `"auto"` to `"box-none"` on marker container
- Added higher `zIndex` and `elevation` for listing markers
- This ensures the TouchableOpacity inside MapMarkerPin receives all touch events

**Code Changes:**
```typescript
// Before
<View
  style={[styles.markerContainer, { left: position.x - 24, top: position.y - 60 }]}
  pointerEvents="auto"
>

// After
<View
  style={[styles.markerContainer, styles.markerContainerListing, { left: position.x - 24, top: position.y - 60 }]}
  pointerEvents="box-none"
>

// New style
markerContainerListing: {
  zIndex: 150,
  elevation: 150,
}
```

**Result:**
- ✅ Touch events pass through to MapMarkerPin's TouchableOpacity
- ✅ Higher z-index ensures pins render above other elements
- ✅ No interference from parent container

---

### 3. Enhanced MapMarkerPin Touch Reliability (`components/MapMarkerPin.tsx`)

**Problem:** Inconsistent touch detection, especially on the price tag.

**Solution:**
- Increased `hitSlop` area for easier tapping
- Added `pointerEvents="box-only"` to TouchableOpacity to ensure it captures all touches
- Added `pointerEvents="none"` to child Views so they don't intercept touches
- Increased minimum container size

**Code Changes:**
```typescript
// Enhanced TouchableOpacity
<TouchableOpacity
  onPress={onPress}
  activeOpacity={0.7}
  hitSlop={{ top: 25, bottom: 35, left: 25, right: 25 }}  // Increased from 20/30
  style={styles.container}
  pointerEvents="box-only"  // NEW: Capture all touches
>

// Child Views don't intercept
<View pointerEvents="none">  // NEW: Applied to bubble, pointer, and priceTag

// Enhanced container style
container: {
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 48,   // NEW: Ensures adequate touch area
  minHeight: 80,  // NEW: Covers pin + price tag
}
```

**Result:**
- ✅ Larger tap area (extends 25-35px beyond visible pin)
- ✅ Price tags are fully tappable
- ✅ No touch event conflicts with child elements
- ✅ Reliable tap detection across all zoom levels

---

## Technical Details

### Pointer Events Strategy

**`box-none` (parent container):**
- Container View doesn't receive touch events
- Touch events pass through to children
- Ideal for layout-only Views

**`box-only` (TouchableOpacity):**
- Only the TouchableOpacity receives touches
- Children can't intercept or block
- Ensures reliable tap handling

**`none` (child decorative Views):**
- Views are purely visual
- Don't participate in touch handling
- Prevents accidental touch blocking

### Z-Index Layering

```
Map Canvas:          z-index: 0
Map Overlays:        z-index: 10-50
Clusters/Providers:  z-index: 100
Listing Markers:     z-index: 150  ← Higher priority for listings
Controls:            z-index: 200+
```

---

## Validation

### Reset Button
- ✅ Tap Reset → all selections clear instantly
- ✅ UI updates immediately (chips, toggles, inputs)
- ✅ Results refresh with unfiltered data
- ✅ Works for Jobs, Services, Custom Services
- ✅ Works in both Map and List/Grid views

### Map Pins
- ✅ Single tap reliably opens listing/job details
- ✅ Works for all marker types (Service, CustomService, Job, Provider)
- ✅ Price tags are fully tappable
- ✅ Reliable across all zoom levels
- ✅ Works after filtering, panning, zooming
- ✅ No dead zones or missed taps

---

## Files Modified

1. `components/FilterModal.tsx`
   - Updated `handleReset` to apply defaults and close modal

2. `components/InteractiveMapView.tsx`
   - Changed marker container `pointerEvents` to `"box-none"`
   - Added `markerContainerListing` style with higher z-index

3. `components/MapMarkerPin.tsx`
   - Increased `hitSlop` area
   - Added `pointerEvents="box-only"` to TouchableOpacity
   - Added `pointerEvents="none"` to child Views
   - Increased minimum container dimensions

---

## No Regressions

✅ No UI design changes
✅ No navigation changes
✅ No schema or API changes
✅ No performance impact
✅ All existing functionality preserved
✅ TypeScript compiles successfully (no new errors)

---

## User Experience Improvements

**Before:**
- Map pins sometimes didn't respond to taps
- Users had to tap multiple times or zoom in
- Reset button didn't actually reset filters
- Had to manually re-enter default values

**After:**
- Map pins respond reliably on first tap
- Large, forgiving tap area (60-70px total)
- Reset button instantly restores defaults
- One tap = clean slate + refreshed results

---

## Conclusion

Both critical usability issues have been resolved with minimal, targeted code changes. The Discover Services map experience is now consistent, reliable, and intuitive for all users across Jobs, Services, and Custom Services.
