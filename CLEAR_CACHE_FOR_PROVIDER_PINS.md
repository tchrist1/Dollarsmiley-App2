# Clear Cache to Fix Provider Pins

## The Problem
Provider pins are missing because cached snapshot data doesn't include `user_type` field. The cache was saved before the normalization fix.

## Quick Fix - Force Cache Clear

### Option 1: Pull to Refresh (Simplest)
1. Go to Home screen
2. **Pull down to refresh**
3. This invalidates cache and fetches fresh data with `user_type`

### Option 2: Dev Menu Clear (Most Thorough)
1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Tap "Clear Cache and Reload"
3. App restarts with fresh data

### Option 3: Manual AsyncStorage Clear (If needed)
Add this temporary button to test:

```typescript
import { invalidateAllSnapshots } from '@/lib/home-feed-snapshot';

// Add this button somewhere visible:
<TouchableOpacity
  onPress={async () => {
    await invalidateAllSnapshots(profile?.id);
    refresh(); // Trigger refresh
  }}
>
  <Text>Clear Cache</Text>
</TouchableOpacity>
```

## Why This Happened
1. Snapshot system caches full `MarketplaceListing[]` objects
2. Old cached data had provider objects WITHOUT `user_type`
3. Map filter checks `profile.user_type` → undefined → filtered out
4. Result: No provider pins shown

## Verification After Clear
After clearing cache, check console for:

```
[MAP DEBUG] Provider pins generation: {
  totalListings: 50,
  totalProviders: 21,  // ✅ Should be > 0
  sampleProfiles: [
    { userType: "Provider", hasCoords: true },  // ✅ userType defined!
    { userType: "Hybrid", hasCoords: true }
  ]
}
```

## Technical Details
- Snapshot TTL: 5 minutes
- Cache key: `home_feed_snapshot:user:{userId}`
- Fresh data includes: `provider.user_type` from RPC
- Normalization: Maps `provider_user_type` → `user_type`
