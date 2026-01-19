# Home Filters - Detailed Sections Outline

**Date:** 2026-01-19
**Component:** FilterModal.tsx
**Purpose:** Complete breakdown of all filter sections, UI elements, and data flow

---

## Filter Modal Structure Overview

```
FilterModal (Modal Component)
├── Header Section
│   ├── Title: "Filters"
│   └── Close Button (X icon)
│
├── ScrollView Content (Lazy-loaded sections)
│   ├── Section 1: Listing Type (Always visible first)
│   ├── Section 2: Categories (Lazy-loaded with virtualization)
│   ├── Section 3: Location
│   ├── Section 4: Distance Radius
│   ├── Section 5: Price Range
│   ├── Section 6: Minimum Rating
│   ├── Section 7: Sort By
│   ├── Section 8: Availability
│   ├── Section 9: Service Type
│   ├── Section 10: Fulfillment Options
│   ├── Section 11: Shipping Mode
│   ├── Section 12: Value-Added Services
│   ├── Section 13: Provider Verification
│   ├── Section 14: Instant Booking
│   └── Section 15: Tags
│
└── Footer Section
    ├── Clear All Button
    └── Apply Filters Button (Primary action)
```

---

## Section 1: Listing Type Filter

**Location:** Lines 661-667
**Load Priority:** IMMEDIATE (Always shown first)
**Purpose:** Choose between Jobs, Services, and Custom Services

### UI Components
- **Title:** "Listing Type"
- **Control Type:** Chip buttons (single-select)
- **Options:**
  - "All" (value: 'all')
  - "Job" (value: 'Job')
  - "Service" (value: 'Service')
  - "CustomService" (value: 'CustomService', display: "Custom Service")

### State Management
```typescript
// Field in FilterOptions
listingType?: 'all' | 'Job' | 'Service' | 'CustomService';

// Default value
listingType: 'all'

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, listingType: type }))}
```

### Render Optimization
- **Memoized:** Yes (useMemo, line 490-510)
- **Dependencies:** `draftFilters.listingType`
- **Pattern:** Static chips array mapped to TouchableOpacity

### Visual State
- **Unselected:** Light background, dark text
- **Selected:** Primary color background, white text

### Data Flow
- User taps chip → `draftFilters.listingType` updated → Visual feedback immediate
- On Apply → Passed to `useListings` hook → Controls which table to query (jobs vs service_listings)

---

## Section 2: Categories Filter

**Location:** Lines 677-698
**Load Priority:** LAZY (Loaded after interaction complete)
**Purpose:** Filter by service/job categories

### UI Components
- **Title:** "Categories"
- **Control Type:** Multi-select chips (virtualized FlatList)
- **Data Source:**
  - Fetched from `categories` table
  - Cached globally (1-hour TTL)
  - Filtered to parent categories only

### State Management
```typescript
// Field in FilterOptions
categories: string[];

// Default value
categories: []

// Update handler
toggleCategory(categoryId: string) {
  // Adds or removes category from array
}
```

### Render Optimization
- **Virtualization:** FlatList with `renderItem` callback
- **Initial Render:** 12 items
- **Batch Size:** 6 items per batch
- **Window Size:** 5 screens
- **Item Layout:** Fixed 40px height per row (3 columns)
- **Memoized Render:** CategoryChip component (line 39-49)
- **Key Extractor:** Category ID

### Performance Features
- **Lazy Loading:** Not rendered until `categoriesReady === true`
- **Session Cache:** Categories cached for 1 hour (lib/session-cache.ts)
- **Remove Clipped:** `removeClippedSubviews={true}` for Android optimization
- **Scroll Disabled:** `scrollEnabled={false}` (parent ScrollView handles scrolling)

### Data Source
```typescript
// Fetch query
const { data } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true)
  .order('sort_order');

// Filtered to parents
parentCategories = categories.filter((cat) => !cat.parent_id)
```

### Category Data Structure
```typescript
interface Category {
  id: string;
  name: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}
```

### Visual State
- **Unselected:** Surface background, primary text
- **Selected:** Primary background, white text
- **Layout:** 3 columns grid, wraps

### Data Flow
- Categories fetched on first modal open → Cached globally
- User taps category chip → ID added/removed from `draftFilters.categories`
- On Apply → Array of IDs passed to query → `WHERE category_id IN (...)`

---

## Section 3: Location Filter

**Location:** Lines 704-718
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by location (city, neighborhood, zip code)

### UI Components
- **Title:** "Location"
- **Control Type:** MapboxAutocompleteInput (text input with suggestions)
- **Component:** `MapboxAutocompleteInput` from components/

### State Management
```typescript
// Field in FilterOptions
location: string;

// Default value
location: ''

// Update handler
onChangeText={(text) => setDraftFilters(prev => ({ ...prev, location: text }))}
```

### MapboxAutocompleteInput Configuration
```typescript
<MapboxAutocompleteInput
  value={draftFilters.location}
  onChangeText={(text) => setDraftFilters(prev => ({ ...prev, location: text }))}
  placeholder="Enter city, neighborhood, or zip"
  searchTypes={['place', 'locality', 'postcode', 'neighborhood']}
  onPlaceSelect={(place) => {
    setDraftFilters(prev => ({
      ...prev,
      location: place.name || place.place_formatted
    }));
  }}
/>
```

### Search Types (Mapbox)
- **place** - General places (cities, towns)
- **locality** - Cities and towns
- **postcode** - ZIP/postal codes
- **neighborhood** - Neighborhoods within cities

### Features
- **Autocomplete:** Real-time suggestions as user types
- **Place Selection:** Tap suggestion to auto-fill formatted address
- **Manual Entry:** User can type freely without selecting suggestion
- **Clear Input:** X button clears field

### Data Flow
- User types → Mapbox geocoding API called → Suggestions shown
- User selects place → Formatted address set to `draftFilters.location`
- On Apply → Location string passed to query → `WHERE location ILIKE '%text%'`

### Integration with Distance Filter
- Location field works with Distance Radius (Section 4)
- If location set + distance set → Proximity search enabled
- **Note:** Distance filtering NOT currently implemented at database level (architectural issue #4)

---

## Section 4: Distance Radius Filter

**Location:** Lines 720-731
**Load Priority:** LAZY (After interaction)
**Purpose:** Set search radius around location

### UI Components
- **Title:** "Distance Radius"
- **Control Type:** Custom DistanceRadiusSelector component
- **Component:** `DistanceRadiusSelector` from components/
- **Features:**
  - Visual radius indicator (animated circles)
  - Quick-select chips (5, 10, 25, 50, 100 miles)
  - "Use Current Location" toggle button
  - Color-coded distance labels

### State Management
```typescript
// Field in FilterOptions
distance?: number;

// Default value
distance: 25

// Update handler
onDistanceChange={(distance) => setDraftFilters(prev => ({ ...prev, distance }))}
```

### Distance Options
- **5 miles** - "Nearby" (green)
- **10 miles** - "Local Area" (green)
- **25 miles** - "Wider Area" (blue) - DEFAULT
- **50 miles** - "Extended Range" (orange)
- **100 miles** - "Regional" (red)

### Current Location Integration
```typescript
// Additional UI state
const [useCurrentLocation, setUseCurrentLocation] = useState(false);
const [fetchingLocation, setFetchingLocation] = useState(false);

// Handler (lines 343-409)
const handleUseLocationToggle = async () => {
  if (useCurrentLocation) {
    // Disable location
    setUseCurrentLocation(false);
    setDraftFilters(prev => ({ ...prev, location: '' }));
    return;
  }

  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync();

  // Get current position
  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,
  });

  // Reverse geocode to address
  const [geocode] = await Location.reverseGeocodeAsync({
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  });

  // Format location string
  const locationString = [geocode.city, geocode.region, geocode.postalCode]
    .filter(Boolean)
    .join(', ');

  // Update filters
  setDraftFilters(prev => ({ ...prev, location: locationString }));
  setUseCurrentLocation(true);
};
```

### Error Handling
- **Permission Denied:** Alert shown (native only)
- **Location Error:** Alert with retry option
- **Web Platform:** Silently falls back (no alert spam)

### Visual Feedback
- **Loading State:** "Getting your location..." text shown
- **Button State:** Toggle between "Use Current Location" and active state
- **Circle Animation:** Radius circles scale based on distance value

### Data Flow
- User selects distance → `draftFilters.distance` updated
- User toggles location → Device location fetched → Address reverse-geocoded → Location field populated
- **⚠️ IMPORTANT:** Distance filter currently NOT implemented in database query (see architectural issue)
- Filter exists in UI but doesn't affect results (technical debt)

---

## Section 5: Price Range Filter

**Location:** Lines 733-765
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by price (min/max)

### UI Components
- **Title:** "Price Range"
- **Control Type:** Dual text inputs + preset chips

#### Text Inputs (Manual Entry)
```typescript
<View style={styles.priceRange}>
  <View style={styles.priceInput}>
    <Text style={styles.priceLabel}>Min</Text>
    <TextInput
      placeholder="$0"
      value={draftFilters.priceMin}
      onChangeText={(value) => handleManualPriceChange('min', value)}
      keyboardType="numeric"
    />
  </View>
  <Text style={styles.priceSeparator}>-</Text>
  <View style={styles.priceInput}>
    <Text style={styles.priceLabel}>Max</Text>
    <TextInput
      placeholder="Any"
      value={draftFilters.priceMax}
      onChangeText={(value) => handleManualPriceChange('max', value)}
      keyboardType="numeric"
    />
  </View>
</View>
```

#### Preset Chips (Quick Selection)
6 preset ranges with optimized memoization:

| Preset | Min | Max | Label |
|--------|-----|-----|-------|
| 1 | 0 | 100 | "Under $100" |
| 2 | 100 | 500 | "$100 – $500" |
| 3 | 500 | 2000 | "$500 – $2,000" |
| 4 | 2000 | 10000 | "$2,000 – $10,000" |
| 5 | 10000 | 25000 | "$10,000 – $25,000" |
| 6 | 25000 | 50000 | "$25,000 – $50,000" |

### State Management
```typescript
// Fields in FilterOptions
priceMin: string;
priceMax: string;

// Default values
priceMin: ''
priceMax: ''

// UI-only state for preset selection
const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

// Manual input handler (line 312-318)
const handleManualPriceChange = useCallback((type: 'min' | 'max', value: string) => {
  setDraftFilters(prev => ({
    ...prev,
    [type === 'min' ? 'priceMin' : 'priceMax']: value,
  }));
  setSelectedPreset(null); // Clear preset when manual entry
}, []);

// Preset handler (line 334-341)
const handlePresetClick = useCallback((label: string, min: number, max: number) => {
  setDraftFilters(prev => ({
    ...prev,
    priceMin: min.toString(),
    priceMax: max.toString(),
  }));
  setSelectedPreset(label);
}, []);
```

### Render Optimization
- **Preset Chips:** Memoized (useMemo, line 444-464)
- **Dependencies:** `selectedPreset`, `handlePresetClick`
- **Pattern:** Array map with style conditionals

### Visual State
- **Unselected Chip:** Surface background, primary text
- **Selected Chip:** Primary background, white text
- **Text Inputs:** White background, border on focus

### Interaction Patterns
1. **Manual Entry:**
   - User types in Min or Max field
   - `priceMin`/`priceMax` updated immediately
   - Selected preset cleared

2. **Preset Selection:**
   - User taps preset chip
   - Both min and max set to preset values
   - Chip highlighted

3. **Mixed Mode:**
   - User selects preset, then manually adjusts
   - Preset highlight removed
   - Manual values preserved

### Data Flow
- User sets price range → `draftFilters.priceMin`/`priceMax` updated
- On Apply → Values passed to query:
  - **Services:** `WHERE base_price >= priceMin AND base_price <= priceMax`
  - **Jobs:** Complex OR logic for budget_min/max and fixed_price (see useListings line 268-283)

### Job Price Filtering Logic
```typescript
// Special handling for jobs (multiple price fields)
if (filters.priceMin || filters.priceMax) {
  const conditions: string[] = ['pricing_type.eq.quote_based'];

  if (filters.priceMin && filters.priceMax) {
    conditions.push(`and(budget_min.gte.${priceMin},budget_max.lte.${priceMax})`);
    conditions.push(`and(fixed_price.gte.${priceMin},fixed_price.lte.${priceMax})`);
  } else if (filters.priceMin) {
    conditions.push(`budget_min.gte.${priceMin}`);
    conditions.push(`fixed_price.gte.${priceMin}`);
  } else if (filters.priceMax) {
    conditions.push(`budget_max.lte.${priceMax}`);
    conditions.push(`fixed_price.lte.${priceMax}`);
  }

  jobQuery = jobQuery.or(conditions.join(','));
}
```

---

## Section 6: Minimum Rating Filter

**Location:** Lines 767-774
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by provider rating

### UI Components
- **Title:** "Minimum Rating"
- **Control Type:** Custom RatingFilter component
- **Component:** `RatingFilter` from components/
- **Features:**
  - Interactive star display (tap to set rating)
  - Preset rating options with descriptions
  - Optional rating distribution (disabled in FilterModal)

### State Management
```typescript
// Field in FilterOptions
minRating: number;

// Default value
minRating: 0

// Update handler
onRatingChange={(rating) => setDraftFilters(prev => ({ ...prev, minRating: rating }))}
```

### Rating Options (from RatingFilter component)

| Value | Stars | Label | Description | Icon |
|-------|-------|-------|-------------|------|
| 0 | - | "Any Rating" | "Show all providers" | Users |
| 3 | ★★★☆☆ | "3+ Stars" | "Good providers" | TrendingUp |
| 4 | ★★★★☆ | "4+ Stars" | "Great providers" | Star |
| 4.5 | ★★★★★ | "4.5+ Stars" | "Excellent providers" | Award |
| 5 | ★★★★★ | "5 Stars" | "Perfect rating only" | Award |

### Interactive Star Display
- **Large Stars:** 5 interactive stars (40px size)
- **Tap to Set:** Tap any star to set minimum rating
- **Visual Feedback:** Filled stars up to selected rating
- **Label:** Dynamic label shows "X+ stars minimum" or "Tap stars to set"

### Configuration
```typescript
<RatingFilter
  minRating={draftFilters.minRating}
  onRatingChange={(rating) => setDraftFilters(prev => ({ ...prev, minRating: rating }))}
  showStats={false}  // Hide provider counts and distribution
/>
```

### Visual State
- **Unselected Option:** Surface background, dark text
- **Selected Option:** Color-coded background (varies by rating level), white text
- **Stars:** Gold for selected, gray for unselected

### Data Flow
- User selects rating → `draftFilters.minRating` updated
- On Apply → Value passed to query
- **⚠️ IMPORTANT:** Rating filter applied POST-QUERY in useListings (line 127-130)
- Not a database filter - results fetched first, then filtered in JavaScript
- **Inefficiency:** Should be database-level for better performance

### Post-Query Filter Implementation
```typescript
// In useListings.ts (lines 127-130)
if (filters.minRating > 0) {
  results = results.filter((listing) => {
    return (listing.rating_average || 0) >= filters.minRating;
  });
}
```

---

## Section 7: Sort By Filter

**Location:** Lines 776-783
**Load Priority:** LAZY (After interaction)
**Purpose:** Control result ordering

### UI Components
- **Title:** "Sort By"
- **Control Type:** Custom SortOptionsSelector component
- **Component:** `SortOptionsSelector` from components/
- **Features:**
  - Current selection display card
  - Horizontal scrolling quick chips
  - Grouped sort options by category
  - Direction indicators for ascending/descending

### State Management
```typescript
// Field in FilterOptions
sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance';

// Default value
sortBy: 'relevance'

// Update handler
onSortChange={(newSort) => setDraftFilters(prev => ({ ...prev, sortBy: newSort }))}
```

### Sort Options (Grouped by Category)

#### Smart Sorting
| Value | Label | Description | Icon | Direction |
|-------|-------|-------------|------|-----------|
| relevance | "Best Match" | "Most relevant to your search" | TrendingUp | - |
| distance | "Nearest First" | "Closest providers to you" | MapPin | ↑ |

#### By Price
| Value | Label | Description | Icon | Direction |
|-------|-------|-------------|------|-----------|
| price_low | "Lowest Price" | "Most affordable first" | DollarSign | ↑ |
| price_high | "Highest Price" | "Premium options first" | DollarSign | ↓ |

#### By Quality
| Value | Label | Description | Icon | Direction |
|-------|-------|-------------|------|-----------|
| rating | "Top Rated" | "Highest rated providers" | Star | ↓ |
| reviews | "Most Reviewed" | "Most customer feedback" | Users | ↓ |

#### By Activity
| Value | Label | Description | Icon | Direction |
|-------|-------|-------------|------|-----------|
| popular | "Most Popular" | "Most booked providers" | Users | - |
| recent | "Recently Added" | "Latest providers" | Clock | - |

### Configuration
```typescript
<SortOptionsSelector
  sortBy={(draftFilters.sortBy || 'relevance') as SortOption}
  onSortChange={(newSort) => setDraftFilters(prev => ({ ...prev, sortBy: newSort }))}
  showDistance={true}  // Show "Nearest First" option
/>
```

### UI Sections in SortOptionsSelector
1. **Current Selection Card:**
   - Large display of active sort
   - Icon + label + description
   - Direction badge if applicable

2. **Quick Chips (Horizontal Scroll):**
   - All options as compact chips
   - Tap to quick-select
   - Selected chip highlighted

3. **Grouped Options (Vertical):**
   - Expandable sections by category
   - Detailed cards with icons
   - Radio-style selection

### Data Flow
- User selects sort option → `draftFilters.sortBy` updated
- On Apply → Value passed to query → Determines `ORDER BY` clause
- **Implementation:** useListings.ts applies sorting at database level (lines 148-189 in job-search, similar in useListings)

### Database Sort Implementation Examples
```typescript
// Services (useListings.ts)
switch (filters.sortBy) {
  case 'price_low':
    serviceQuery = serviceQuery.order('base_price', { ascending: true });
    break;
  case 'price_high':
    serviceQuery = serviceQuery.order('base_price', { ascending: false });
    break;
  case 'recent':
    serviceQuery = serviceQuery.order('created_at', { ascending: false });
    break;
  // ... etc
}

// Jobs (job-search.ts)
switch (filters.sortBy) {
  case 'price_low':
    queryBuilder = queryBuilder.order('estimated_budget', { ascending: true });
    break;
  // ... etc
}
```

### Special Sort Logic
- **Relevance:** Boosts featured listings, exact title matches, then by rating
- **Distance:** Currently uses created_at fallback (distance not implemented)
- **Popular:** Orders by view_count or booking_count

---

## Section 8: Availability Filter

**Location:** Lines 789-794
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by time availability

### UI Components
- **Title:** "Availability"
- **Control Type:** Chip buttons with icon (single-select)
- **Options:** 4 time-based filters

### Options Configuration
```typescript
const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
];
```

### State Management
```typescript
// Field in FilterOptions
availability?: 'any' | 'today' | 'this_week' | 'this_month';

// Default value
availability: 'any'

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, availability: value }))}
```

### Render Optimization
- **Memoized:** Yes (useMemo, line 513-541)
- **Dependencies:** `draftFilters.availability`
- **Icon:** Clock icon (changes color when selected)

### Visual State
- **Unselected:** Surface background, secondary text, gray icon
- **Selected:** Primary background, white text, white icon

### Data Flow
- User selects availability → `draftFilters.availability` updated
- **⚠️ CRITICAL:** This filter is NOT IMPLEMENTED in query logic
- Field exists in FilterOptions but has no effect on results
- **Technical Debt:** Filter UI exists but doesn't filter anything

### Expected Implementation (Not Done)
```typescript
// Should filter by provider_availability table
// or service_listings.available_dates
if (filters.availability === 'today') {
  query = query.gte('available_date', new Date().toISOString());
  query = query.lte('available_date', new Date().toISOString() + '23:59:59');
}
```

---

## Section 9: Service Type Filter

**Location:** Lines 796-800
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter between standard and custom services

### UI Components
- **Title:** "Listing Type" (duplicate of Section 1 - different options)
- **Control Type:** Chip buttons (single-select)
- **Options:** 3 service type filters

### Options Configuration
```typescript
const LISTING_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Service', label: 'Standard Service' },
  { value: 'CustomService', label: 'Custom Service' },
];
```

### State Management
```typescript
// Same field as Section 1
listingType?: 'all' | 'Job' | 'Service' | 'CustomService';

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, listingType: value }))}
```

### ⚠️ IMPORTANT: Duplicate Section
- **Issue:** This is a DUPLICATE of Section 1
- **Section 1:** Shows "All | Job | Service | CustomService"
- **Section 9:** Shows "All Types | Standard Service | Custom Service"
- **Conflict:** Both sections control same `listingType` field
- **Result:** User can set conflicting values

### Visual State
- Same as Section 1 (chip buttons)
- Selected chip has primary background

### Render Optimization
- **Memoized:** Yes (useMemo, line 544-567)
- **Dependencies:** `draftFilters.listingType`

### Data Flow
- Same as Section 1
- Passed to `useListings` → Controls query table and listing_type filter

### Recommendation
- Remove one of these duplicate sections
- Keep Section 1 (more visible, better positioning)
- Or merge into single section with clearer options

---

## Section 10: Fulfillment Options Filter (Services Only)

**Location:** Lines 802-807 (in continuation reading)
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by fulfillment method (Pickup, DropOff, Shipping)

### UI Components
- **Title:** "Fulfillment Options"
- **Control Type:** Multi-select chips
- **Options:** 3 fulfillment types

### Options Configuration
```typescript
const FULFILLMENT_OPTIONS = ['Pickup', 'DropOff', 'Shipping'];
```

### State Management
```typescript
// Field in FilterOptions
fulfillmentTypes?: string[];

// Default value
fulfillmentTypes: []

// Update handler (line 276-283)
const toggleFulfillmentType = useCallback((type: string) => {
  setDraftFilters(prev => ({
    ...prev,
    fulfillmentTypes: prev.fulfillmentTypes?.includes(type)
      ? prev.fulfillmentTypes.filter((t) => t !== type)
      : [...(prev.fulfillmentTypes || []), type]
  }));
}, []);
```

### Render Optimization
- **Memoized:** Yes (useMemo, line 467-487)
- **Dependencies:** `draftFilters.fulfillmentTypes`, `toggleFulfillmentType`

### Visual State
- **Unselected:** Surface background, dark text
- **Selected:** Primary background, white text
- **Multiple Selection:** Can select 0-3 options simultaneously

### Data Flow
- User toggles fulfillment types → Array updated
- On Apply → Array passed to query
- **⚠️ IMPORTANT:** Applied POST-QUERY in useListings (line 104-108)
- Not a database filter - results fetched first, then filtered in JavaScript
- **Inefficiency:** Should be database-level for better performance

### Post-Query Filter Implementation
```typescript
// In useListings.ts (lines 104-108)
if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) {
  results = results.filter((listing) => {
    const listingFulfillmentTypes = listing.fulfillment_options?.map((fo) => fo.fulfillment_type) || [];
    return filters.fulfillmentTypes.some((ft) => listingFulfillmentTypes.includes(ft));
  });
}
```

### Service-Only Feature
- Only applies to service listings
- Jobs don't have fulfillment options
- Filter ignored when `listingType === 'Job'`

---

## Section 11: Shipping Mode Filter (Services Only)

**Location:** Typically after fulfillment options
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by shipping provider (Platform vs External)

### UI Components
- **Title:** "Shipping Mode"
- **Control Type:** Chip buttons (single-select)
- **Options:** 3 shipping modes

### Options Configuration
```typescript
const SHIPPING_MODE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Platform', label: 'Platform Shipping' },
  { value: 'External', label: 'External Shipping' },
];
```

### State Management
```typescript
// Field in FilterOptions
shippingMode?: 'all' | 'Platform' | 'External';

// Default value
shippingMode: 'all'

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, shippingMode: value }))}
```

### Render Optimization
- **Memoized:** Yes (useMemo, line 570-593)
- **Dependencies:** `draftFilters.shippingMode`

### Visual State
- **Unselected:** Surface background, dark text
- **Selected:** Primary background, white text

### Data Flow
- User selects shipping mode → `draftFilters.shippingMode` updated
- On Apply → Value passed to query
- **⚠️ IMPORTANT:** Applied POST-QUERY in useListings (line 112-116)
- Not a database filter - results fetched first, then filtered in JavaScript
- **Inefficiency:** Should be database-level for better performance

### Post-Query Filter Implementation
```typescript
// In useListings.ts (lines 112-116)
if (filters.shippingMode && filters.shippingMode !== 'all') {
  results = results.filter((listing) => {
    return listing.shipping_mode === filters.shippingMode;
  });
}
```

### Shipping Mode Explanation
- **Platform Shipping:** Seller uses Dollarsmiley's shipping integration
- **External Shipping:** Seller handles shipping independently
- **All:** Show both types

### Service-Only Feature
- Only applies to service listings with shipping fulfillment
- Jobs don't have shipping modes
- Filter ignored when `listingType === 'Job'`

---

## Section 12: Value-Added Services (VAS) Filter

**Location:** After shipping mode
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter listings that offer additional services

### UI Components
- **Title:** "Value-Added Services"
- **Control Type:** Toggle switch or checkbox
- **Label:** "Only show listings with add-ons"

### State Management
```typescript
// Field in FilterOptions
hasVAS?: boolean;

// Default value
hasVAS: false

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, hasVAS: !prev.hasVAS }))}
```

### Visual State
- **Unchecked:** Surface background, dark text
- **Checked:** Primary background, white text, checkmark

### Data Flow
- User toggles VAS filter → `draftFilters.hasVAS` updated
- On Apply → Boolean passed to query
- **⚠️ IMPORTANT:** Applied POST-QUERY in useListings (line 119-123)
- Not a database filter - results fetched first, then filtered in JavaScript
- **Inefficiency:** Should be database-level for better performance

### Post-Query Filter Implementation
```typescript
// In useListings.ts (lines 119-123)
if (filters.hasVAS) {
  results = results.filter((listing) => {
    const activeVAS = listing.value_added_services?.filter((vas) => vas.is_active) || [];
    return activeVAS.length > 0;
  });
}
```

### VAS Examples
- Rush delivery
- White glove service
- Gift wrapping
- Extended warranty
- Installation
- Custom packaging

### Database Structure
```typescript
// value_added_services table
interface ValueAddedService {
  id: string;
  listing_id: string;
  name: string;
  price: number;
  is_active: boolean;
}
```

---

## Section 13: Provider Verification Filter

**Location:** After VAS section
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter for verified providers only

### UI Components
- **Title:** "Provider Verification"
- **Control Type:** Checkbox or toggle
- **Label:** "Verified providers only"
- **Icon:** Verification badge

### State Management
```typescript
// Field in FilterOptions
verified?: boolean;

// Default value
verified: false

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, verified: !prev.verified }))}
```

### Visual State
- **Unchecked:** Surface background, dark text
- **Checked:** Success color background, white text, badge icon

### Data Flow
- User toggles verified filter → `draftFilters.verified` updated
- On Apply → Boolean passed to query
- **Implementation:** Applied at DATABASE level in useListings (line 234-236)
- More efficient than post-query filters

### Database Filter Implementation
```typescript
// In useListings.ts (lines 234-236)
if (filters.verified) {
  serviceQuery = serviceQuery.eq('profiles.is_verified', true);
}
```

### Verification Types
Providers can be verified through:
- ID verification (Stripe Identity)
- Background checks
- Business license verification
- Phone verification
- Email verification

### Badge Display
- Verified providers show badge icon
- Badge appears on:
  - Listing cards
  - Provider profiles
  - Search results

---

## Section 14: Instant Booking Filter

**Location:** After verification section
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter for instant booking enabled services

### UI Components
- **Title:** "Booking Options"
- **Control Type:** Checkbox or toggle
- **Label:** "Instant booking only"
- **Icon:** Lightning bolt (Zap)

### State Management
```typescript
// Field in FilterOptions
instant_booking?: boolean;

// Default value
instant_booking: false

// Update handler
onPress={() => setDraftFilters(prev => ({ ...prev, instant_booking: !prev.instant_booking }))}
```

### Visual State
- **Unchecked:** Surface background, dark text
- **Checked:** Warning color background, white text, lightning icon

### Data Flow
- User toggles instant booking → `draftFilters.instant_booking` updated
- On Apply → Boolean passed to query
- **⚠️ Note:** Implementation status unclear (not visible in useListings excerpt)
- May be applied post-query or may be unused

### Instant Booking Explanation
- **Instant Booking:** Customer can book immediately without provider approval
- **Request Booking:** Customer must send request, wait for approval
- Filter shows only instant-bookable services

### Expected Database Field
```sql
service_listings.instant_booking_enabled BOOLEAN
```

---

## Section 15: Tags Filter

**Location:** Near end of filter list
**Load Priority:** LAZY (After interaction)
**Purpose:** Filter by service tags (popular keywords)

### UI Components
- **Title:** "Tags"
- **Control Type:** Multi-select chips (virtualized FlatList recommended)
- **Options:** 14 predefined tags

### Available Tags
```typescript
const AVAILABLE_TAGS = [
  'Wedding', 'QuickFix', 'SameDay', 'Handyman', 'Catering',
  'Braids', 'Moving', 'Cleaning', 'Emergency', 'Licensed',
  'Insured', 'Background Checked', 'Top Rated', 'Fast Response',
];
```

### State Management
```typescript
// Field in FilterOptions
tags?: string[];

// Default value
tags: []

// Update handler (line 285-292)
const toggleTag = useCallback((tag: string) => {
  setDraftFilters(prev => ({
    ...prev,
    tags: prev.tags?.includes(tag)
      ? prev.tags.filter((t) => t !== tag)
      : [...(prev.tags || []), tag]
  }));
}, []);
```

### Render Optimization
- **Component:** TagChip memoized component (line 57-67)
- **Virtualization:** Should use FlatList for performance (currently mapping)
- **Key:** Tag string itself

### Visual State
- **Unselected:** Surface background, primary text, "#" prefix
- **Selected:** Primary background, white text, "#" prefix
- **Layout:** Flexbox wrap, responsive grid

### Data Flow
- User toggles tags → Array updated
- On Apply → Array passed to query
- **⚠️ CRITICAL:** Tags filter is NOT IMPLEMENTED in query logic
- Field exists in FilterOptions but has no effect on results
- **Technical Debt:** Filter UI exists but doesn't filter anything

### Expected Implementation (Not Done)
```typescript
// Should query tags column or join tags table
if (filters.tags && filters.tags.length > 0) {
  serviceQuery = serviceQuery.overlaps('tags', filters.tags);
}
```

### Tag Categories
- **Event Types:** Wedding, Catering
- **Speed:** QuickFix, SameDay, Fast Response, Emergency
- **Service Types:** Handyman, Moving, Cleaning, Braids
- **Trust Signals:** Licensed, Insured, Background Checked, Top Rated

### Database Structure (Expected)
```sql
-- Option 1: Array column
service_listings.tags TEXT[]

-- Option 2: Junction table
service_listing_tags (
  listing_id UUID,
  tag VARCHAR(50)
)
```

---

## Footer Section: Action Buttons

**Location:** Bottom of modal (fixed position)
**Components:** 2 buttons in horizontal layout

### Button 1: Clear All
```typescript
<Button
  variant="secondary"
  onPress={handleReset}
>
  Clear All
</Button>
```

**Functionality:**
- Resets ALL filters to `defaultFilters`
- Clears UI state (selectedPreset, useCurrentLocation)
- Immediately applies empty filters and closes modal
- **Handler:** Line 320-332

**Implementation:**
```typescript
const handleReset = useCallback(() => {
  if (__DEV__) {
    logPerfEvent('CLEAR_ALL_TAP');
  }
  setDraftFilters(defaultFilters);
  setUseCurrentLocation(false);
  setSelectedPreset(null);
  onApply(defaultFilters);  // Applies immediately
  onClose();
  if (__DEV__) {
    logPerfEvent('CLEAR_ALL_COMPLETE');
  }
}, [onApply, onClose]);
```

### Button 2: Apply Filters
```typescript
<Button
  variant="primary"
  onPress={handleApply}
>
  Apply Filters
</Button>
```

**Functionality:**
- Commits all draft filter changes
- Calls `onApply(draftFilters)` with finalized filters
- Closes modal
- Triggers data refetch in Home screen
- **Handler:** Line 295-309

**Implementation:**
```typescript
const handleApply = useCallback(() => {
  if (__DEV__) {
    logPerfEvent('APPLY_FILTERS_TAP', {
      listingType: draftFilters.listingType,
      categoriesCount: draftFilters.categories.length,
      hasLocation: !!draftFilters.location,
      hasPriceFilter: !!(draftFilters.priceMin || draftFilters.priceMax),
    });
  }
  onApply(draftFilters);  // Commit draft to parent
  onClose();
  if (__DEV__) {
    logPerfEvent('FILTER_APPLY_COMPLETE');
  }
}, [draftFilters, onApply, onClose]);
```

### Button Layout
- **Container:** Horizontal flexbox with gap
- **Width:** 50/50 split (flex: 1 each)
- **Position:** Sticky footer (stays visible during scroll)
- **Safe Area:** Respects bottom inset for iPhone notch

### Visual State
- **Clear All:**
  - Secondary button style
  - Light background, primary text
  - No loading state

- **Apply Filters:**
  - Primary button style
  - Primary background, white text
  - Disabled state if no filters changed (could be improvement)

---

## Summary: All Filter Sections

### Complete Section List (15 sections)

1. ✅ **Listing Type** - Jobs vs Services (DATABASE filter)
2. ✅ **Categories** - Multi-select categories (DATABASE filter)
3. ✅ **Location** - Text search with autocomplete (DATABASE filter - ILIKE)
4. ⚠️ **Distance Radius** - Proximity search (UI ONLY - not implemented)
5. ✅ **Price Range** - Min/max price (DATABASE filter)
6. ⚠️ **Minimum Rating** - Rating threshold (POST-QUERY filter - inefficient)
7. ✅ **Sort By** - Result ordering (DATABASE ORDER BY)
8. ❌ **Availability** - Time availability (NOT IMPLEMENTED)
9. ⚠️ **Service Type** - DUPLICATE of Section 1 (needs cleanup)
10. ⚠️ **Fulfillment Options** - Pickup/DropOff/Shipping (POST-QUERY filter - inefficient)
11. ⚠️ **Shipping Mode** - Platform vs External (POST-QUERY filter - inefficient)
12. ⚠️ **Value-Added Services** - Has add-ons (POST-QUERY filter - inefficient)
13. ✅ **Provider Verification** - Verified only (DATABASE filter)
14. ❓ **Instant Booking** - Instant book only (UNCLEAR implementation)
15. ❌ **Tags** - Keyword tags (NOT IMPLEMENTED)

### Filter Status Legend
- ✅ **DATABASE filter** - Efficient, applied at query level
- ⚠️ **POST-QUERY filter** - Inefficient, applied after fetch in JavaScript
- ❌ **NOT IMPLEMENTED** - UI exists but no filtering logic
- ❓ **UNCLEAR** - Implementation status uncertain

### Implementation Statistics
- **Total Filters:** 15
- **Fully Implemented:** 5 (33%)
- **Partially Implemented (post-query):** 5 (33%)
- **Not Implemented:** 3 (20%)
- **Unclear:** 1 (7%)
- **Duplicate:** 1 (7%)

### Performance Impact
- **Efficient Filters:** 5/15 (33%) - Applied at database
- **Inefficient Filters:** 5/15 (33%) - Applied after fetch
- **Non-functional Filters:** 4/15 (27%) - UI only, no effect
- **Duplicate UI:** 1/15 (7%) - Redundant section

---

## Performance Characteristics

### Lazy Loading Strategy
```typescript
// Three-phase loading
Phase 1 (Immediate): Listing Type section only
Phase 2 (After Interaction): Essential sections (location, price, rating, sort)
Phase 3 (Next Frame): Categories section (heavy, virtualized)
```

### Memoization Coverage
- **10 sections** use useMemo for chip rendering
- **2 components** (CategoryChip, TagChip) are memoized with React.memo
- **2 sections** use FlatList virtualization (categories, tags recommended)

### Scroll Performance
- **Event Throttling:** 16ms (matches frame rate)
- **Performance Logging:** Scroll start/end tracked in DEV
- **Remove Clipped:** Enabled for Android optimization

### Modal Open Performance
- **Target:** <50ms first open, <30ms subsequent
- **Achieved:** Yes (per Phase 3 optimization docs)
- **Techniques:**
  - Draft state isolation
  - Lazy section rendering
  - Category caching
  - Memoized chips

---

## Data Flow Architecture

### Filter Application Flow
```
User Opens FilterModal
  ↓
currentFilters → draftFilters (isolated state)
  ↓
User Interacts (toggles, types, selects)
  ↓
draftFilters updated (UI-only, no parent re-renders)
  ↓
User taps "Apply Filters"
  ↓
onApply(draftFilters) called
  ↓
Home screen: setFilters(draftFilters)
  ↓
useEffect[filters] triggered
  ↓
300ms debounce timer
  ↓
setPage(0), fetchListings(true)
  ↓
useListings hook constructs query
  ↓
Database query executed
  ↓
Results normalized to MarketplaceListing[]
  ↓
Post-query filters applied (inefficient ones)
  ↓
Sorted and paginated
  ↓
Displayed in List/Grid/Map views
```

### Query Construction Order
1. **Base Query:** Select from service_listings or jobs
2. **Status Filter:** eq('status', 'Active' or 'Open')
3. **Search:** or('title.ilike.%X%', 'description.ilike.%X%')
4. **Category Filter:** in('category_id', [...])
5. **Location Filter:** ilike('location', '%X%')
6. **Price Filter:** gte/lte('base_price', X)
7. **Verified Filter:** eq('profiles.is_verified', true)
8. **Sort:** order(field, {ascending})
9. **Pagination:** limit(pageSize), offset
10. **Execute:** await query
11. **Post-Query Filters:** fulfillment, shipping, VAS, rating
12. **Return:** results[]

---

## Dependencies

### External Components
- `DistanceRadiusSelector` - Custom component
- `RatingFilter` - Custom component
- `SortOptionsSelector` - Custom component
- `MapboxAutocompleteInput` - Mapbox integration
- `Button` - Shared UI component

### Libraries
- `expo-location` - Geolocation and reverse geocoding
- `lucide-react-native` - Icons
- `react-native-safe-area-context` - Safe area handling

### Database Tables
- `categories` - Category options
- `service_listings` - Service results
- `jobs` - Job results
- `profiles` - Provider info (for verified filter)
- `value_added_services` - VAS options (for hasVAS filter)
- `fulfillment_options` - Fulfillment types (for fulfillment filter)

---

## Recommendations for Each Section

### High Priority
1. **Section 4 (Distance):** Implement database-level geospatial query
2. **Section 9 (Service Type):** Remove duplicate, consolidate with Section 1
3. **Section 6 (Rating):** Move to database filter (add index on rating_average)
4. **Section 10-12 (Fulfillment/Shipping/VAS):** Move to database filters

### Medium Priority
5. **Section 8 (Availability):** Implement date-based filtering
6. **Section 15 (Tags):** Implement tag filtering logic
7. **Section 14 (Instant Booking):** Verify implementation or remove

### Low Priority (Optimizations)
8. Add "Selected filters: X" counter in header
9. Add "Save this filter set" feature
10. Add filter validation (priceMin < priceMax)
11. Show result count estimate before applying
12. Add filter preset system (popular combinations)

---

**Report Generated:** 2026-01-19
**Total Sections Documented:** 15 filter sections + header + footer
**Lines of FilterModal:** ~1200 lines
**Component Dependencies:** 8 major components
**Database Tables Involved:** 6+ tables
