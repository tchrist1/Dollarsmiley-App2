# Home Screen Benchmark Mode Implementation

## Overview
A hard-disable benchmarking mode has been implemented to establish a clean performance baseline for the Home screen by disabling all non-essential features at both UI and execution levels.

## Benchmark Mode Flag Location
**File:** `app/(tabs)/index.tsx`
**Line:** 317
**Flag:** `const HOME_BENCHMARK_MODE = true;`

## What's DISABLED When Benchmark Mode = true

### 1. Admin Banner
- ✅ Rendering disabled in both List and Grid views
- ✅ No banner animations or effects execute
- ✅ No admin toggle logic runs

### 2. Carousel Data Fetching
- ✅ `fetchCarouselSections()` exits immediately with early return
- ✅ No network requests for carousel data
- ✅ No carousel cache population
- ✅ Carousel loading state immediately set to false

### 3. Carousel Sections (ALL)
- ✅ Trending Listings carousel
- ✅ Recommended Listings carousel (AI-based)
- ✅ Popular Listings carousel
- ✅ Featured/Boosted listings

### 4. Feed Data Structure
- ✅ Banner items excluded from feed
- ✅ Carousel items excluded from feed
- ✅ Only simple grouped listing rows rendered
- ✅ Feed composition logic simplified

### 5. Carousel Rendering
- ✅ `renderFeedCarousel()` returns null immediately
- ✅ AdminBanner component not mounted in List view
- ✅ AdminBanner component not mounted in Grid view

### 6. Empty State Enhancements
- ✅ FeaturedListingsSection disabled
- ✅ RecommendationsCarousel components disabled
- ✅ Simple "No services found" message shown instead

## What REMAINS ENABLED

### ✓ Search & Discovery
- Search input field
- Voice search button
- Image search button
- Search suggestions dropdown
- Trending searches (background data)

### ✓ Filters System
- Filter modal
- Apply filters functionality
- Active filters display
- Filter count badge
- Clear all filters

### ✓ View Mode Switcher
- List view toggle
- Grid view toggle
- Map view toggle
- Instant view switching (no unmounting)

### ✓ Main Listings Feed
- Services listings
- Jobs listings
- Combined feed
- Infinite scroll
- Pagination logic
- Load more functionality

### ✓ Map Features (Map View)
- Interactive map
- Map markers
- Map mode bar (Listings/Providers toggle)
- Floating Action Button (FAB)
- Zoom controls
- Recenter functionality
- Map status hints
- Clustering

### ✓ Progressive Loading
- UI shell renders immediately
- Core listings load normally
- Background data fetching
- Home cache (3-minute TTL)

## Code Changes Summary

### 1. Benchmark Flag Added (Line 317)
```typescript
const HOME_BENCHMARK_MODE = true;
```

### 2. Carousel Fetch Gated (Line 426)
```typescript
if (!HOME_BENCHMARK_MODE) {
  fetchCarouselSections();
}
```

### 3. Fetch Function Gated (Line 635-639)
```typescript
if (HOME_BENCHMARK_MODE) {
  setCarouselsLoading(false);
  return;
}
```

### 4. Feed Data Simplified (Line 1303-1314)
```typescript
if (HOME_BENCHMARK_MODE) {
  // Simple grouped layout only
  return groupedListings;
}
```

### 5. Carousel Renderer Gated (Line 1799)
```typescript
if (HOME_BENCHMARK_MODE) return null;
```

### 6. Banner Disabled in List View (Line 1914)
```typescript
if (HOME_BENCHMARK_MODE) return null;
```

### 7. Banner Disabled in Grid View (Line 1941)
```typescript
if (HOME_BENCHMARK_MODE) return null;
```

### 8. Empty State Simplified (Line 2117-2144)
```typescript
HOME_BENCHMARK_MODE ? (
  <View style={styles.centerContent}>
    <Text style={styles.emptyText}>No services found</Text>
  </View>
) : (
  // Full recommendations...
)
```

## Verification Checklist

When `HOME_BENCHMARK_MODE = true`, verify:

- [ ] No banner visible at top of feed
- [ ] No carousel sections appear anywhere
- [ ] No carousel network requests in Network tab
- [ ] No AI recommendation logic executes
- [ ] No carousel cache updates occur
- [ ] Home screen loads faster
- [ ] Scroll is smooth
- [ ] Search bar works correctly
- [ ] Filter modal opens and applies filters
- [ ] View mode switching works instantly
- [ ] Map view shows markers correctly
- [ ] No console errors or warnings
- [ ] Infinite scroll still works
- [ ] Load more functionality active

## Performance Expectations

With benchmark mode enabled, you should observe:

1. **Faster Initial Load**: No carousel data fetching delays
2. **Reduced Network**: Only main listings query executes
3. **Simpler Render**: No banner animations or carousel components
4. **Lower Memory**: Fewer components mounted
5. **Smooth Scroll**: Simplified feed structure

## Re-Enabling Features

To restore all features, manually change:

```typescript
// app/(tabs)/index.tsx, Line 317
const HOME_BENCHMARK_MODE = false;
```

**IMPORTANT**: No runtime toggles exist. This is intentional to ensure clean benchmarking. All features must be manually re-enabled by changing the flag value.

## Testing Instructions

1. Set `HOME_BENCHMARK_MODE = true`
2. Restart the app
3. Navigate to Home tab
4. Verify no banner appears
5. Verify no carousels appear
6. Check Network tab - only listings query should fire
7. Test search, filters, and view switching
8. Test infinite scroll
9. Test map view
10. Verify no console errors

## Success Criteria

✅ Home screen renders with ONLY:
- Search/discovery bar
- Filter controls
- View mode switcher
- Main listings feed (services + jobs)
- Map view with interactive features

✅ All disabled features show:
- Zero UI rendering
- Zero execution/computation
- Zero network requests
- Zero cache operations

✅ Core functionality remains:
- 100% operational
- No degradation
- No errors
- No warnings

---

**Status**: ✅ BENCHMARKING MODE ACTIVE
**Date**: 2025-01-18
**Purpose**: Performance baseline measurement
