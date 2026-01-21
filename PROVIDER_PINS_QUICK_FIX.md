# Provider Pins - Quick Fix Guide

## The Problem
Provider pins showing `userType: undefined` due to cached data from before the database fix.

## The Solution
✅ **Automatic cache invalidation** - Cache version updated from v1 → v2

## What To Do (Pick One)

### Option 1: Just Reload (Easiest) ⭐
1. Reload the app
2. Pull down to refresh home screen
3. Open map → Tap FAB → Select "Providers"
4. **Done!** Pins should now appear

### Option 2: Manual Cache Clear
In browser console:
```javascript
forceRefreshAllData()
```
Then pull down to refresh home screen.

### Option 3: Hard Refresh
- **Web**: Cmd+Shift+R or Ctrl+Shift+R
- **Mobile**: Shake device → Reload

## What Changed

**Database**: Added `user_type` to RPC functions ✅
**Frontend**: Updated data normalization ✅
**Cache**: Auto-invalidation on schema change ✅
**Debug**: Enhanced logging to trace data flow ✅

## Expected Result

### Console Output:
```javascript
[CACHE] Invalidating HOME_LISTINGS due to version mismatch (cached: 1, current: 2)
[PROVIDER_PINS_DEBUG] First listing structure: {
  profileData: { user_type: "Provider" }  // ✅
}
[PROVIDER_PINS_DEBUG] Added provider pin: {
  name: "Xavier King",
  userType: "Provider"  // ✅
}
[PROVIDER_PINS_DEBUG] Final provider pins count: {count: 21}  // ✅
```

### Visual Result:
- 20+ provider pins appear on map
- Pins show provider locations
- Each pin tappable → navigates to provider

## If Still Not Working

Run in console and share output:
```javascript
// Check cache status
getCacheDebugInfo()

// Check database
// (Run in Supabase SQL Editor)
SELECT id, full_name, user_type
FROM profiles
WHERE user_type IN ('Provider', 'Hybrid')
LIMIT 5;
```

## Files Modified
1. `supabase/migrations/fix_provider_pins_add_user_type_to_rpc.sql`
2. `hooks/useListings.ts`
3. `lib/listing-cache.ts`
4. `app/(tabs)/index.tsx`

## Summary
Cache versioning now auto-invalidates old data when schema changes. Just reload and pull to refresh!

---
**Status**: ✅ Ready to test
**Action**: Reload app → Pull to refresh → Check console
