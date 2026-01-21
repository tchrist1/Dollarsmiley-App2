# AI Prompt: Provider Map Pins Implementation

## Goal
Display providers as aggregated map pins (one per provider) with a toggle to switch between "Services", "Providers", and "Jobs" view modes.

## The Critical Bug
Provider pins weren't appearing because the `user_type` field was missing from the data normalization layer, preventing the filtering logic from identifying providers.

## Data Flow (Must ALL Work Together)

### 1. Database → RPC Functions
RPC functions MUST return `user_type` field from profiles table:

```sql
-- In get_services_cursor_paginated
SELECT
  p.user_type as provider_user_type,  -- ⚠️ CRITICAL
  p.full_name as provider_full_name,
  -- ... other fields
FROM service_listings sl
LEFT JOIN profiles p ON p.id = sl.provider_id
```

### 2. RPC → Frontend Normalization
Normalization functions MUST map ALL fields including `user_type`:

```typescript
// ❌ BAD - Missing user_type
provider: {
  id: service.provider_id,
  full_name: service.provider_full_name,
}

// ✅ GOOD - Complete mapping
provider: {
  id: service.provider_id,
  full_name: service.provider_full_name,
  user_type: service.provider_user_type,  // ⚠️ CRITICAL
  avatar_url: service.provider_avatar,
  rating_average: service.provider_rating_average,
}
```

### 3. Frontend → Provider Pin Generation
Filter pins using the `user_type` field:

```typescript
function generateProviderPins(listings: MarketplaceListing[]) {
  const providerMap = new Map();

  listings.forEach(listing => {
    const profile = listing.marketplace_type === 'Job'
      ? listing.customer
      : listing.provider;

    // ⚠️ CRITICAL: Must check user_type
    if (profile?.user_type !== 'Provider') return;
    if (!listing.latitude || !listing.longitude) return;

    if (!providerMap.has(profile.id)) {
      providerMap.set(profile.id, {
        id: profile.id,
        type: 'provider',
        name: profile.full_name,
        latitude: listing.latitude,
        longitude: listing.longitude,
        // ... other fields
      });
    }
  });

  return Array.from(providerMap.values());
}
```

## Key Lessons

1. **Complete data pipeline required**: Database → RPC → Normalization → UI. A break at ANY step fails the feature.

2. **Map ALL RPC fields**: If the RPC returns a field, map it in normalization. Don't assume minimal mapping works.

3. **Debug each layer**: Test at database, RPC output, normalized data, and UI layers separately.

4. **The `user_type` field is essential**: This differentiates providers from customers. Without it, filtering fails silently.

## Quick Test

```typescript
// Add to pin generation function
console.log('[DEBUG] Provider pins:', {
  totalListings: listings.length,
  totalProviders: providerMap.size,
  firstProvider: Array.from(providerMap.values())[0]
});
```

Expected output:
```
[DEBUG] Provider pins: {
  totalListings: 20,
  totalProviders: 15,
  firstProvider: { id: "...", name: "John Doe", userType: "Provider", ... }
}
```

## Implementation Checklist

- [ ] Verify RPC functions return `provider_user_type` / `customer_user_type`
- [ ] Update normalization to map `user_type` field
- [ ] Create `generateProviderPins()` function with user_type filtering
- [ ] Add map mode toggle FAB (Services / Providers / Jobs)
- [ ] Add debug logging to verify data flow
- [ ] Test provider pins appear on map
