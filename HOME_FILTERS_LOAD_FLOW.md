# Home Filters Load Flow & Settings

## Overview

The Home screen implements a sophisticated filter system with optimized loading, debounced updates, and session caching to deliver fast, responsive filtering across marketplace listings (Services, Custom Services, and Jobs).

---

## Filter State Architecture

### FilterOptions Interface
```typescript
interface FilterOptions {
  categories: string[];           // Array of category IDs
  location: string;               // Location string (city, address, etc.)
  priceMin: string;               // Minimum price filter
  priceMax: string;               // Maximum price filter
  minRating: number;              // Minimum rating (0-5)
  distance?: number;              // Radius in miles (default: 25)
  sortBy?: string;                // 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance'
  verified?: boolean;             // Show only verified providers
  listingType?: string;           // 'all' | 'Job' | 'Service' | 'CustomService'
  userLatitude?: number;          // Auto-populated from location
  userLongitude?: number;         // Auto-populated from location
}
```

### Default Filters
```typescript
const defaultFilters = {
  categories: [],
  location: '',
  priceMin: '',
  priceMax: '',
  minRating: 0,
  distance: 25,                   // 25-mile default radius
  sortBy: 'relevance',
  verified: false,
  listingType: 'all',
  userLatitude: undefined,
  userLongitude: undefined,
};
```

---

## Load Sequence (Step-by-Step)

### Phase 1: Initial Mount (0ms - 100ms)

**Step 1.1: State Initialization**
```typescript
// app/(tabs)/index.tsx:272-275
const [filters, setFilters] = useState<FilterOptions>({
  ...defaultFilters,
  listingType: params.filter || 'all',  // Inherit from navigation params
});
```

**Step 1.2: Hook Initialization**
```typescript
// app/(tabs)/index.tsx:278-292
const { listings, loading, ... } = useListings({
  searchQuery,      // Empty string initially
  filters,          // Default filters
  userId,           // Current user ID
  pageSize: 20,     // 20 items per page
  debounceMs: 300,  // 300ms debounce for filter changes
});
```

**Step 1.3: Location Hook Delayed Start**
```typescript
// app/(tabs)/index.tsx:306-321
const { userLocation, ... } = useMapData({
  userProfileLocation: profile?.latitude && profile?.longitude
    ? { latitude: profile.latitude, longitude: profile.longitude }
    : null,
  requestDelayMs: 500,  // 500ms delay before requesting location
  enabled: true,
});
```

---

### Phase 2: Location Resolution (500ms - 2000ms)

**Step 2.1: Check Profile Location**
- If profile has coordinates → Use immediately (no permission request)
- If no profile coordinates → Request device location after 500ms delay

**Step 2.2: Location Permission Flow**
```typescript
// hooks/useMapData.ts:62-136
1. Check existing permissions
2. If granted → Get current position
3. If not granted → Request permission
4. If denied → Set error state, continue without location
```

**Step 2.3: Sync Location to Filters**
```typescript
// app/(tabs)/index.tsx:343-355
useEffect(() => {
  const location = userLocation || profileLocation;

  if (location && location.latitude && location.longitude) {
    setFilters(prev => ({
      ...prev,
      userLatitude: location.latitude,
      userLongitude: location.longitude,
    }));
  }
}, [userLocation, profile?.latitude, profile?.longitude]);
```

**Impact**: When coordinates are added, triggers filter change → listings refetch with distance calculations

---

### Phase 3: Data Fetch Pipeline

**Step 3.1: Snapshot Load (Instant)**
```typescript
// hooks/useListingsCursor.ts:90-118
const loadFromSnapshot = async () => {
  // Check if clean initial load (no search, no filters)
  if (!searchQuery && filters.categories.length === 0 && !filters.location) {
    const instantFeed = await getInstantHomeFeed(userId);
    if (instantFeed) {
      setListings(instantFeed.listings);  // Instant display
      return true;  // Background refresh continues
    }
  }
  return false;
};
```

**Step 3.2: Cursor-Based Fetch**
```typescript
// hooks/useListingsCursor.ts:124-329
const fetchListingsCursor = async (reset = false) => {
  // Phase 1: Try snapshot first (if clean load)
  if (reset && isInitialLoad) {
    const snapshotLoaded = await loadFromSnapshot();
    // Continue with background refresh even if snapshot loaded
  }

  // Phase 2: Fetch from database with filters
  const shouldFetchServices = !filters.listingType ||
                               filters.listingType === 'all' ||
                               filters.listingType === 'Service' ||
                               filters.listingType === 'CustomService';

  const shouldFetchJobs = !filters.listingType ||
                          filters.listingType === 'all' ||
                          filters.listingType === 'Job';

  // Parallel fetch for services and jobs
  const results = await Promise.all([
    shouldFetchServices ? fetchServices() : null,
    shouldFetchJobs ? fetchJobs() : null,
  ]);

  // Merge, sort, and paginate results
};
```

**Step 3.3: RPC Function Calls**
```typescript
// Services
await supabase.rpc('get_services_cursor_paginated', {
  p_cursor_created_at,
  p_cursor_id,
  p_limit: 20,
  p_category_id,
  p_search,
  p_min_price,
  p_max_price,
  p_min_rating,
  p_listing_types,
});

// Jobs
await supabase.rpc('get_jobs_cursor_paginated', {
  p_cursor_created_at,
  p_cursor_id,
  p_limit: 20,
  p_category_id,
  p_search,
  p_min_budget,
  p_max_budget,
});
```

---

### Phase 4: Filter Change Flow

**Step 4.1: User Opens Filter Modal**
```typescript
// User taps filter icon
setShowFilters(true);  // Opens FilterModalAnimated

// Modal receives current filters
<FilterModal
  visible={showFilters}
  currentFilters={filters}
  onApply={(newFilters) => {
    setFilters(newFilters);  // Update parent state
    setShowFilters(false);   // Close modal
  }}
/>
```

**Step 4.2: Draft State (Modal-Local)**
```typescript
// components/FilterModal.tsx:102
const [draftFilters, setDraftFilters] = useState(currentFilters);

// User makes changes → Updates draft only
// Changes are NOT applied to parent until user taps "Apply"
```

**Step 4.3: Apply Filters**
```typescript
const handleApply = () => {
  onApply(draftFilters);  // Send to parent
  onClose();              // Close modal
};

// Triggers in parent:
// app/(tabs)/index.tsx:272-275
setFilters(newFilters);  // State update

// Triggers useEffect in useListings hook:
// hooks/useListingsCursor.ts:332-348
useEffect(() => {
  // Debounced filter application
  const timer = setTimeout(() => {
    fetchListingsCursor(true);  // Reset to page 1, fetch with new filters
  }, debounceMs);  // 300ms debounce
}, [filters, searchQuery]);
```

---

### Phase 5: Debouncing Strategy

**5.1: Filter Changes (300ms debounce)**
```typescript
// hooks/useListingsCursor.ts:332-348
const effectiveDebounce = initialLoadComplete ? 300 : 50;

setTimeout(() => {
  fetchListingsCursor(true);
}, effectiveDebounce);
```

**Why**: Prevents excessive API calls when user rapidly changes filters

**5.2: Search Input (300ms debounce)**
```typescript
// Same debounce as filters - unified in useListings hook
```

**5.3: Price Input (300ms debounce in FilterModal)**
```typescript
// components/FilterModal.tsx:105-108
const debouncedPriceMin = useDebounce(localPriceMin, 300);
const debouncedPriceMax = useDebounce(localPriceMax, 300);

// Updates draftFilters only after 300ms of no typing
```

---

## Settings & Configuration

### Global Constants

#### Distance Presets
```typescript
// Default: 25 miles
// No UI selector - hardcoded in defaultFilters
```

#### Price Presets
```typescript
const PRICE_PRESETS = [
  { label: 'Under $100', min: 0, max: 100 },
  { label: '$100 – $500', min: 100, max: 500 },
  { label: '$500 – $2,000', min: 500, max: 2000 },
  { label: '$2,000 – $10,000', min: 2000, max: 10000 },
  { label: '$10,000 – $25,000', min: 10000, max: 25000 },
  { label: '$25,000 – $50,000', min: 25000, max: 50000 },
];
```

#### Listing Types
```typescript
const LISTING_TYPES = ['all', 'Job', 'Service', 'CustomService'];
```

#### Sort Options
```typescript
type SortOption =
  | 'relevance'    // Default - matches search query
  | 'price_low'    // Lowest price first
  | 'price_high'   // Highest price first
  | 'rating'       // Highest rating first
  | 'popular'      // Most bookings/views
  | 'recent'       // Newest first
  | 'distance';    // Nearest first (requires coordinates)
```

---

### Performance Settings

#### Pagination
```typescript
pageSize: 20  // Items per page (both services and jobs)
```

#### Debounce Timings
```typescript
debounceMs: 300          // Filter changes
requestDelayMs: 500      // Location permission request delay
SNAPSHOT_TTL_MS: 300000  // 5 minutes snapshot cache
```

#### AbortController
```typescript
// hooks/useListingsCursor.ts:127-132
// Cancels previous fetch when new filter applied
abortControllerRef.current?.abort();
abortControllerRef.current = new AbortController();
```

---

## Filter Application Order

### 1. Database-Level Filters (Fast)
Applied in RPC functions before data leaves database:
- `p_category_id` - Category filtering
- `p_search` - Text search on title/description
- `p_min_price / p_max_price` - Price range
- `p_min_rating` - Minimum rating
- `p_listing_types` - Service/CustomService/Job type

### 2. Normalization (Data Transform)
Applied during result processing:
- Coordinate parsing (string → number)
- Provider/customer profile enrichment
- Photo array normalization
- Price calculation (fixed/range/quote)

### 3. Post-Query Filters (Memory-Level)
Applied in map pin generation:
- Map mode filtering (providers/services/jobs_all/jobs_fixed/jobs_quoted)
- Coordinate validation (latitude !== null && longitude !== null)
- User-type filtering (Provider/Hybrid for provider pins)

---

## Cache Strategy

### Snapshot Cache (v2)
```typescript
// lib/home-feed-snapshot.ts:13
const SNAPSHOT_VERSION = 2;

// Structure
interface SnapshotData {
  listings: MarketplaceListing[];
  timestamp: number;
  cursor: { created_at: string; id: string } | null;
  version: 2;  // Version control for invalidation
}

// Cache keys
home_feed_snapshot:guest                    // Guest users
home_feed_snapshot:user:{userId}            // Authenticated users
home_feed_snapshot:user:{userId}:location:  // Location-specific
```

### Session Cache (Categories)
```typescript
// 1-hour TTL for categories
// Shared across all users (categories are global)
categories_session_cache:null
```

---

## Navigation Parameter Handling

### From Navigation
```typescript
// params.filter - Set listing type
useEffect(() => {
  if (params.filter) {
    setFilters(prev => ({ ...prev, listingType: params.filter }));
  }
}, [params.filter]);

// params.categoryId + params.categoryName - Set search query
useEffect(() => {
  if (params.categoryId && params.categoryName) {
    setSearchQuery(params.categoryName);
    setFilters(prev => ({ ...prev, categories: [] }));
  }
}, [params.categoryId, params.categoryName]);

// params.search - Set search query
useEffect(() => {
  if (params.search) {
    setSearchQuery(params.search);
  }
}, [params.search]);
```

---

## Active Filters Display

### ActiveFiltersBar Component
```typescript
// Displays currently active filters as chips
// Allows quick removal of individual filters
// Shows count of active filters

<ActiveFiltersBar
  filters={filters}
  onRemoveFilter={(key) => handleRemoveFilter(key)}
  onClearAll={() => handleClearAllFilters()}
/>
```

### Active Filter Detection
A filter is "active" if it differs from default:
- `categories.length > 0`
- `location !== ''`
- `priceMin !== '' || priceMax !== ''`
- `minRating > 0`
- `verified === true`
- `listingType !== 'all'`
- `sortBy !== 'relevance'`

---

## Error Handling

### Location Permission Denied
```typescript
// Continue without location-based filtering
// Distance filter disabled
// Map view shows all listings without proximity sorting
```

### Network Errors
```typescript
// Display error message in UI
// Retry button available
// Cached data shown if available
```

### Empty Results
```typescript
// Show empty state with suggestions
// "Try adjusting your filters" message
// Quick clear filters button
```

---

## Performance Optimizations

### 1. Snapshot-First Loading
- Instant display on initial load
- Background refresh for fresh data
- Version control prevents stale structure

### 2. Cursor Pagination
- No OFFSET degradation
- Scales to 10,000+ listings
- Maintains sort order across pages

### 3. Parallel Fetching
- Services and Jobs fetched simultaneously
- Promise.all for concurrent requests

### 4. Memoization
- FilterModal uses memo() to prevent re-renders
- CategoryChip components memoized
- Map markers memoized with useMemo

### 5. Lazy Rendering
- FilterModal sections load after mount
- InteractionManager.runAfterInteractions()
- Categories fetch only once per session

### 6. Debounced Updates
- 300ms debounce on filter changes
- 300ms debounce on price input
- Prevents API spam

---

## Testing Checklist

### Initial Load
- [ ] Loads without filters (clean state)
- [ ] Snapshot loads instantly if available
- [ ] Background refresh updates data
- [ ] Location permission requested after 500ms

### Filter Application
- [ ] Opening modal doesn't apply changes
- [ ] Draft state isolated from parent
- [ ] Apply button commits changes
- [ ] Cancel button discards changes
- [ ] Debounce prevents rapid API calls

### Navigation Parameters
- [ ] params.filter sets listing type
- [ ] params.categoryId sets search query
- [ ] params.search sets search query

### Performance
- [ ] No blocking on modal open
- [ ] Scroll remains responsive
- [ ] Filter changes debounced
- [ ] AbortController cancels old requests

---

**Last Updated**: 2026-01-21
**Version**: 2.0 (with Provider Pins Fix)
