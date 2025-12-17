# Discover Navigation Fix

## Problem
When users tapped "Discover," "Discover Services," "Browse Services," or "Browse Jobs" buttons throughout the app, they were routed to either the Main Menu without any filters pre-selected or to separate pages, making it unclear what content they should be viewing.

## Solution
Implemented URL parameter-based filtering that allows navigation to the Main Menu with the appropriate filter pre-selected (Services or Jobs).

## Changes Made

### 1. Main Menu Screen (`app/(tabs)/index.tsx`)

**Added URL parameter support:**
- Imported `useLocalSearchParams` to read URL parameters
- Added `params` constant to access URL query parameters
- Modified initial `filters` state to use the `filter` parameter if present
- Added a `useEffect` hook to reactively update filters when the URL parameter changes

**Code changes:**
```tsx
// Import added
import { router, useLocalSearchParams } from 'expo-router';

// In component
const params = useLocalSearchParams();

// Updated initial state
const [filters, setFilters] = useState<FilterOptions>({
  // ... other filters
  listingType: (params.filter as 'all' | 'Job' | 'Service' | 'CustomService') || 'all',
});

// Added useEffect to handle parameter changes
useEffect(() => {
  if (params.filter) {
    const filterType = params.filter as 'all' | 'Job' | 'Service' | 'CustomService';
    setFilters(prev => ({
      ...prev,
      listingType: filterType,
    }));
  }
}, [params.filter]);
```

### 2. Profile Screen (`app/(tabs)/profile.tsx`)

**Updated "Discover Services" button:**
```tsx
// Before
onPress={() => router.push('/(tabs)/index')}

// After
onPress={() => router.push('/(tabs)/index?filter=Service')}
```

### 3. Checkout Screen (`app/checkout/index.tsx`)

**Updated "Browse Services" button:**
```tsx
// Before
onPress={() => router.push('/(tabs)')}

// After
onPress={() => router.push('/(tabs)/index?filter=Service')}
```

### 4. Cart Summary Component (`components/CartSummary.tsx`)

**Updated "Browse Services" button:**
```tsx
// Before
onPress={() => router.push('/(tabs)')}

// After
onPress={() => router.push('/(tabs)/index?filter=Service')}
```

### 5. Debug Navigation Menu (`components/DebugNavigationMenu.tsx`)

**Updated "Browse Jobs" route:**
```tsx
// Before
route: '/(tabs)/index?filter=jobs',

// After
route: '/(tabs)/index?filter=Job',
```

## How It Works

### For Services:
1. **User taps any "Discover Services" or "Browse Services" button**
   - The app navigates to `/(tabs)/index?filter=Service`

2. **Main Menu receives the filter parameter**
   - On initial load, the filter state is set to 'Service' based on the URL parameter
   - The `useEffect` hook ensures the filter updates if navigating again with a different parameter

3. **Listings are automatically filtered**
   - The existing filter logic queries the database with `listingType === 'Service'`
   - Only service listings are displayed, not jobs or custom services

4. **User sees Services-only view**
   - The Main Menu loads with the Services filter already active
   - Users can see the Services filter is selected in the FilterModal if they open it

### For Jobs:
1. **User taps any "Browse Jobs" button**
   - The app navigates to `/(tabs)/index?filter=Job`

2. **Main Menu receives the filter parameter**
   - Filter state is set to 'Job' based on the URL parameter

3. **Listings are automatically filtered**
   - The existing filter logic queries the database with `listingType === 'Job'`
   - Only job postings are displayed, not services

4. **User sees Jobs-only view**
   - The Main Menu loads with the Jobs filter already active

## Filter Options

The `filter` URL parameter accepts these values:
- `all` - Show all listing types (default)
- `Service` - Show only standard services
- `Job` - Show only job postings
- `CustomService` - Show only custom services

## Usage Examples

```tsx
// Navigate to Services
router.push('/(tabs)/index?filter=Service')

// Navigate to Jobs
router.push('/(tabs)/index?filter=Job')

// Navigate to all listings
router.push('/(tabs)/index?filter=all')
// or simply
router.push('/(tabs)/index')
```

## Benefits

1. **Consistent user experience** - All Discover/Browse buttons now lead to the Main Menu with appropriate filters
2. **Clear intent** - Users immediately see what they're browsing (Services or Jobs)
3. **Deep linking support** - The filter state is in the URL, enabling bookmarks and deep links
4. **No blank pages** - Users always see relevant content
5. **Flexible** - Can easily add more filter parameters in the future
6. **Unified navigation** - Both "Browse Services" and "Browse Jobs" use the same Main Menu interface
