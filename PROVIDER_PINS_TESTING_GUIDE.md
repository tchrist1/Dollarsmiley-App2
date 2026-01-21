# Provider Pins - Testing Guide

## Quick Test Checklist

### ✅ Test 1: Visibility Mode Enforcement
**Goal**: Verify provider pins only show in "Providers" mode

**Steps**:
1. Open app and navigate to Home screen
2. Tap the Map view toggle (map icon in top row)
3. Observe the map with default mode
4. Tap the center-right FAB (floating action button with map pin icon)
5. Select "Providers" from the menu

**Expected Result**:
- ✅ Provider pins appear ONLY after selecting "Providers" mode
- ✅ Pins show user icon or "SP" label
- ✅ Provider names and categories visible on tap

**Fail Scenarios**:
- ❌ Provider pins visible in "Listings" mode
- ❌ Provider pins visible in "Services" mode
- ❌ Provider pins visible in "Jobs" modes

---

### ✅ Test 2: User Type Filtering
**Goal**: Verify only Provider and Hybrid accounts render as pins

**Steps**:
1. Enable "Providers" mode in map view
2. Count visible provider pins
3. Check database: `SELECT COUNT(*) FROM profiles WHERE user_type IN ('Provider', 'Hybrid')`

**Expected Result**:
- ✅ Pin count matches Provider + Hybrid account count (22 total)
- ✅ Customer-only accounts never render as pins
- ✅ Admin-only accounts never render as pins

---

### ✅ Test 3: Location Data Restoration
**Goal**: Verify provider pins use listing coordinates as fallback

**Steps**:
1. Enable "Providers" mode in map view
2. Tap any provider pin
3. Note the location on map
4. Navigate to that provider's listing detail
5. Compare location accuracy

**Expected Result**:
- ✅ Provider pin location matches their active listing location
- ✅ All 21 providers with active listings render as pins
- ✅ No "missing location" errors in console

**Database Verification**:
```sql
-- All providers should have mappable data via listings
SELECT
  p.id,
  p.full_name,
  p.latitude as profile_lat,
  p.longitude as profile_lng,
  COUNT(sl.id) as listing_count,
  COUNT(CASE WHEN sl.latitude IS NOT NULL THEN 1 END) as listings_with_coords
FROM profiles p
LEFT JOIN service_listings sl ON sl.provider_id = p.id AND sl.status = 'Active'
WHERE p.user_type IN ('Provider', 'Hybrid')
GROUP BY p.id, p.full_name, p.latitude, p.longitude;
```

---

### ✅ Test 4: Coordinate Validation
**Goal**: Verify no rendering errors with invalid data

**Steps**:
1. Enable "Providers" mode in map view
2. Check browser/device console for errors
3. Pan and zoom the map
4. Tap provider pins

**Expected Result**:
- ✅ No console errors about invalid coordinates
- ✅ No "NaN" or "undefined" coordinate warnings
- ✅ No "out of range" latitude/longitude errors
- ✅ Map renders smoothly without blank screens

**Console Check**: Should NOT see:
- ❌ "Text strings must be rendered within a <Text> component"
- ❌ "Property 'MAPBOX_CONFIG' doesn't exist"
- ❌ "Tried to register two views with the same name RNMBXVectorSource"
- ❌ "Invalid coordinate" errors

---

### ✅ Test 5: Services/Jobs Pins Unchanged
**Goal**: Verify existing pin functionality not affected

**Steps**:
1. Switch FAB to "Services" mode
2. Verify service pins appear (green markers)
3. Switch FAB to "All Jobs" mode
4. Verify job pins appear (yellow markers)
5. Switch FAB to "Fixed-priced Jobs" mode
6. Verify only fixed-price job pins appear
7. Switch FAB to "Quoted Jobs" mode
8. Verify only quote-based job pins appear

**Expected Result**:
- ✅ Service pins work exactly as before
- ✅ Job pins work exactly as before
- ✅ No performance degradation
- ✅ All pin interactions work (tap, info card, navigation)

---

### ✅ Test 6: Pin Interactions
**Goal**: Verify provider pins are fully interactive

**Steps**:
1. Enable "Providers" mode in map view
2. Tap a provider pin
3. Review the bottom sheet/info card
4. Tap the provider name or card

**Expected Result**:
- ✅ Bottom sheet displays provider info
- ✅ Shows provider name, rating, categories
- ✅ Tapping navigates to provider store page (`/provider/store/[id]`)
- ✅ Provider info matches database records

---

### ✅ Test 7: Multi-Listing Providers
**Goal**: Verify providers with multiple listings render correctly

**Steps**:
1. Find a provider with 4+ active listings in database
2. Enable "Providers" mode in map view
3. Locate that provider's pin
4. Tap the pin and review info

**Expected Result**:
- ✅ Single pin for provider (not multiple pins)
- ✅ Location derived from first valid listing
- ✅ Categories aggregated from all listings
- ✅ Pin shows up to 5 categories

**Database Query**:
```sql
-- Find providers with multiple listings
SELECT
  p.id,
  p.full_name,
  COUNT(sl.id) as listing_count,
  STRING_AGG(DISTINCT c.name, ', ') as categories
FROM profiles p
JOIN service_listings sl ON sl.provider_id = p.id AND sl.status = 'Active'
LEFT JOIN categories c ON c.id = sl.category_id
WHERE p.user_type IN ('Provider', 'Hybrid')
GROUP BY p.id, p.full_name
HAVING COUNT(sl.id) >= 4
ORDER BY listing_count DESC;
```

---

### ✅ Test 8: FAB State Persistence
**Goal**: Verify mode selection persists during session

**Steps**:
1. Switch to "Providers" mode
2. Navigate to another screen
3. Return to Home screen
4. Check map view mode

**Expected Result**:
- ✅ Mode persists during navigation (optional behavior)
- OR
- ✅ Mode resets to default "Listings" (also acceptable)

---

## Success Criteria Summary

**All Tests Pass When**:
- ✅ Provider pins appear ONLY in "Providers" mode
- ✅ All 21-22 providers render with valid coordinates
- ✅ Only Provider/Hybrid types included (Customer excluded)
- ✅ Zero console errors or warnings
- ✅ Services/Jobs pins unaffected
- ✅ Pin interactions work correctly
- ✅ Map performance unchanged

---

## Troubleshooting

### Issue: No provider pins visible
**Check**:
1. FAB mode is set to "Providers" (not "Listings", "Services", or "Jobs")
2. Database has active listings with coordinates
3. Console for any error messages

### Issue: Some providers missing
**Check**:
1. Profile `user_type` is 'Provider' or 'Hybrid'
2. Provider has at least one active listing
3. Listing has valid `latitude` and `longitude` values

### Issue: Pin location incorrect
**Check**:
1. Service listing coordinates are accurate
2. Profile location (if set) overrides listing location
3. Multiple listings use first valid coordinate found

---

## Database Verification Queries

### Check Provider Location Coverage
```sql
SELECT
  'Profiles with location' as metric,
  COUNT(*) as count
FROM profiles
WHERE user_type IN ('Provider', 'Hybrid')
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL

UNION ALL

SELECT
  'Providers without location but with listings',
  COUNT(DISTINCT p.id)
FROM profiles p
JOIN service_listings sl ON sl.provider_id = p.id AND sl.status = 'Active'
WHERE p.user_type IN ('Provider', 'Hybrid')
  AND p.latitude IS NULL
  AND sl.latitude IS NOT NULL;
```

### Expected Results:
- Profiles with location: 1-2
- Providers without location but with listings: 20-21
- **Total mappable providers: 21-22**
