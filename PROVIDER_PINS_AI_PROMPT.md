# AI Prompt: Implement Provider Pins on Map View

## Feature Overview

Create a map view feature that displays provider locations as interactive pins. Users should be able to toggle between viewing service listings and viewing provider profiles on the map.

## Requirements

### Core Functionality

1. **Map Mode Toggle**: Add a FAB (Floating Action Button) menu with multiple view modes:
   - "Services" - Shows individual service listing pins (default)
   - "Providers" - Shows provider profile pins (one per provider)
   - "Jobs" - Shows job listing pins

2. **Provider Pin Aggregation**: When in "Providers" mode:
   - Aggregate all listings by provider
   - Show ONE pin per unique provider (not one per listing)
   - Pin should show provider's location (from their profile or first listing)
   - Pin label should be provider's name
   - Pin should be visually distinct from listing pins

3. **Data Requirements**: Each provider pin needs:
   - Provider ID
   - Provider name
   - Provider location (lat/lng)
   - Provider user_type (CRITICAL: must be "Provider")
   - Provider avatar (optional)
   - Provider rating (optional)

## Technical Architecture

### Database Layer

#### 1. Profiles Table Schema

Ensure the `profiles` table has these columns:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_type TEXT NOT NULL,  -- CRITICAL: "Provider" or "Customer"
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  rating_average NUMERIC,
  rating_count INTEGER,
  is_verified BOOLEAN,
  -- ... other fields
);
```

#### 2. RPC Functions (Must Return user_type!)

The cursor-based RPC functions MUST include `user_type` in their return signature:

**For Services** (`get_services_cursor_paginated`):
```sql
CREATE OR REPLACE FUNCTION get_services_cursor_paginated(...)
RETURNS TABLE(
  -- ... listing fields
  provider_id uuid,
  provider_full_name text,
  provider_avatar text,
  provider_city text,
  provider_state text,
  provider_user_type text,           -- CRITICAL!
  provider_rating_average numeric,
  provider_rating_count integer,
  provider_id_verified boolean,
  latitude numeric,
  longitude numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    -- ... other listing fields
    p.full_name as provider_full_name,
    p.avatar_url as provider_avatar,
    p.city as provider_city,
    p.state as provider_state,
    p.user_type as provider_user_type,           -- CRITICAL: Select this!
    p.rating_average as provider_rating_average,
    p.rating_count as provider_rating_count,
    p.id_verified as provider_id_verified,
    COALESCE(sl.latitude, p.latitude) as latitude,
    COALESCE(sl.longitude, p.longitude) as longitude
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE sl.status = 'Active'
  -- ... filters
  ORDER BY sl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

**For Jobs** (`get_jobs_cursor_paginated`):
```sql
CREATE OR REPLACE FUNCTION get_jobs_cursor_paginated(...)
RETURNS TABLE(
  -- ... job fields
  customer_id uuid,
  customer_full_name text,
  customer_avatar text,
  customer_user_type text,           -- CRITICAL!
  customer_rating_average numeric,
  customer_rating_count integer,
  customer_id_verified boolean,
  -- ... location fields
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    -- ... other job fields
    p.full_name as customer_full_name,
    p.avatar_url as customer_avatar,
    p.user_type as customer_user_type,           -- CRITICAL: Select this!
    p.rating_average as customer_rating_average,
    p.rating_count as customer_rating_count,
    p.id_verified as customer_id_verified,
    -- ... location fields
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status = 'open'
  -- ... filters
  ORDER BY j.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Frontend Layer

#### 3. Data Normalization (CRITICAL - This is where the bug was!)

In your listings hook (e.g., `hooks/useListingsCursor.ts`), the normalization functions MUST map ALL profile fields, especially `user_type`:

**Service Normalization**:
```typescript
function normalizeServiceCursor(service: any): MarketplaceListing {
  return {
    id: service.id,
    marketplace_type: 'Service',
    title: service.title,
    description: service.description || '',
    price: service.price,
    base_price: service.price,
    image_url: service.image_url,
    featured_image_url: service.image_url,
    created_at: service.created_at,
    status: service.status,
    provider_id: service.provider_id,
    category_id: service.category_id,
    average_rating: service.rating || 0,
    rating_average: service.rating || 0,
    total_bookings: service.total_bookings || 0,
    listing_type: service.listing_type,

    // CRITICAL: Map ALL profile fields from RPC response
    provider: service.provider_full_name ? {
      id: service.provider_id,
      full_name: service.provider_full_name,
      avatar_url: service.provider_avatar,
      city: service.provider_city,
      state: service.provider_state,
      user_type: service.provider_user_type,           // ⚠️ MUST INCLUDE!
      rating_average: service.provider_rating_average,
      rating_count: service.provider_rating_count,
      is_verified: service.provider_id_verified,
    } : undefined,

    latitude: service.latitude,
    longitude: service.longitude,
  } as any;
}
```

**Job Normalization**:
```typescript
function normalizeJobCursor(job: any): MarketplaceListing {
  // ... photo parsing logic

  return {
    id: job.id,
    marketplace_type: 'Job',
    title: job.title,
    description: job.description || '',
    budget: job.budget,
    photos,
    created_at: job.created_at,
    status: job.status,
    customer_id: job.customer_id,
    category_id: job.category_id,

    // CRITICAL: Map ALL profile fields from RPC response
    customer: job.customer_full_name ? {
      id: job.customer_id,
      full_name: job.customer_full_name,
      avatar_url: job.customer_avatar,
      user_type: job.customer_user_type,           // ⚠️ MUST INCLUDE!
      rating_average: job.customer_rating_average,
      rating_count: job.customer_rating_count,
      is_verified: job.customer_id_verified,
    } : undefined,

    city: job.city,
    state: job.state,
    latitude: job.latitude,
    longitude: job.longitude,
    deadline: job.deadline
  } as any;
}
```

#### 4. Provider Pin Generation Logic

Create a function to generate provider pins from listings:

```typescript
function generateProviderPins(listings: MarketplaceListing[]) {
  const providerMap = new Map();

  listings.forEach(listing => {
    // CRITICAL: Check user_type to identify providers
    const profile = listing.marketplace_type === 'Job'
      ? listing.customer
      : listing.provider;

    if (!profile) return;

    // CRITICAL: Filter by user_type === "Provider"
    if (profile.user_type !== 'Provider') {
      console.log('[DEBUG] Skipping non-provider:', {
        name: profile.full_name,
        userType: profile.user_type
      });
      return;
    }

    // Skip if no location
    if (!listing.latitude || !listing.longitude) return;

    // Add to map (one pin per provider)
    if (!providerMap.has(profile.id)) {
      providerMap.set(profile.id, {
        id: profile.id,
        type: 'provider',
        name: profile.full_name,
        avatar: profile.avatar_url,
        latitude: listing.latitude,
        longitude: listing.longitude,
        rating: profile.rating_average,
        ratingCount: profile.rating_count,
        isVerified: profile.is_verified,
        userType: profile.user_type,  // Include for debugging
      });
    }
  });

  const pins = Array.from(providerMap.values());

  console.log('[DEBUG] Provider pins generated:', {
    totalListings: listings.length,
    totalProviders: pins.length,
    firstProvider: pins[0]
  });

  return pins;
}
```

#### 5. Map View Integration

In your map view component:

```typescript
function MapView() {
  const [mapMode, setMapMode] = useState<'listings' | 'providers' | 'jobs'>('listings');
  const { listings } = useListings();

  // Generate appropriate markers based on mode
  const markers = useMemo(() => {
    if (mapMode === 'providers') {
      return generateProviderPins(listings);
    } else if (mapMode === 'listings') {
      return listings.map(listing => ({
        id: listing.id,
        type: 'listing',
        title: listing.title,
        latitude: listing.latitude,
        longitude: listing.longitude,
        // ... other fields
      }));
    }
    // ... handle jobs mode
  }, [mapMode, listings]);

  return (
    <View>
      {/* Map component with markers */}
      <MapComponent markers={markers} />

      {/* FAB menu for mode switching */}
      <MapFAB
        currentMode={mapMode}
        onModeChange={setMapMode}
      />
    </View>
  );
}
```

## Common Pitfalls & Solutions

### ❌ Pitfall #1: Incomplete Data Normalization

**Problem**: Normalization function only maps a subset of profile fields:
```typescript
// BAD - Missing user_type!
provider: {
  id: service.provider_id,
  full_name: service.provider_full_name,
  avatar_url: service.provider_avatar,
  city: service.provider_city,
  state: service.provider_state
  // ❌ user_type missing!
}
```

**Solution**: Always map ALL available fields from the RPC response, especially `user_type`.

### ❌ Pitfall #2: Assuming Data Type

**Problem**: Assuming all listing providers have `user_type === "Provider"` without checking.

**Solution**: Always explicitly check `user_type` field before including in provider pins.

### ❌ Pitfall #3: Missing RPC Return Column

**Problem**: RPC function doesn't return `user_type` in the RETURNS TABLE clause.

**Solution**: Ensure RPC RETURNS TABLE includes all profile fields needed on frontend.

### ❌ Pitfall #4: Cache Issues

**Problem**: Old cached data without `user_type` field.

**Solution**: Implement cache versioning and invalidation on schema changes.

## Testing Checklist

### 1. Database Verification

```sql
-- Verify profiles have user_type
SELECT id, full_name, user_type, city, state, latitude, longitude
FROM profiles
WHERE user_type = 'Provider'
LIMIT 5;

-- Verify RPC returns user_type
SELECT * FROM get_services_cursor_paginated(
  NULL, NULL, 10, NULL, NULL, NULL, NULL, NULL, ARRAY['Service']::text[]
) LIMIT 1;
```

### 2. Frontend Verification

Add debug logging at each stage:

```typescript
// In normalization function
console.log('[NORMALIZE_DEBUG] RPC returned:', {
  allKeys: Object.keys(service),
  hasUserType: 'provider_user_type' in service,
  userTypeValue: service.provider_user_type
});

// After normalization
console.log('[NORMALIZE_DEBUG] Normalized provider:', {
  allKeys: Object.keys(listing.provider || {}),
  hasUserType: 'user_type' in (listing.provider || {}),
  userTypeValue: listing.provider?.user_type
});

// In pin generation
console.log('[PIN_DEBUG] Processing listing:', {
  listingId: listing.id,
  hasProvider: !!listing.provider,
  providerUserType: listing.provider?.user_type,
  willInclude: listing.provider?.user_type === 'Provider'
});
```

### 3. Expected Output

When working correctly, you should see:

```javascript
[NORMALIZE_DEBUG] RPC returned: {
  allKeys: [..., "provider_user_type", ...],
  hasUserType: true,
  userTypeValue: "Provider"
}

[NORMALIZE_DEBUG] Normalized provider: {
  allKeys: [..., "user_type", ...],
  hasUserType: true,
  userTypeValue: "Provider"
}

[PIN_DEBUG] Processing listing: {
  listingId: "abc-123",
  hasProvider: true,
  providerUserType: "Provider",
  willInclude: true
}

[PIN_DEBUG] Provider pins generated: {
  totalListings: 20,
  totalProviders: 15,
  firstProvider: {
    id: "xyz-789",
    name: "John Doe",
    userType: "Provider",
    latitude: 40.7128,
    longitude: -74.0060
  }
}
```

## Key Takeaways

1. **The entire data pipeline matters**: Database → RPC → Normalization → UI. A break at ANY step will fail.

2. **user_type is CRITICAL**: This field differentiates providers from customers. Without it, you cannot filter properly.

3. **Map ALL available fields**: Don't assume minimal mapping is sufficient. If the RPC returns it, map it in normalization.

4. **Debug at each layer**: Add logging at database, RPC, normalization, and UI layers to isolate issues.

5. **Test the full flow**: Don't just test the UI - verify data at each transformation step.

## Implementation Order

1. ✅ Verify database schema has `user_type` column
2. ✅ Update/create RPC functions to return profile fields including `user_type`
3. ✅ Update normalization functions to map ALL profile fields
4. ✅ Create provider pin generation logic with user_type filtering
5. ✅ Integrate into map view with mode toggle
6. ✅ Add debug logging throughout pipeline
7. ✅ Test and verify pins appear correctly

## Final Notes

The most common mistake is **incomplete data normalization**. Even if your database and RPC are perfect, if your normalization layer doesn't map the `user_type` field, provider pins won't work. Always map ALL available fields from the RPC response.
