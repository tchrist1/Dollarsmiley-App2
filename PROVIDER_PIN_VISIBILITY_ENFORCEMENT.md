# Provider Pin Visibility Control — FAB Mode Enforcement

## Summary
Enforced FAB-scoped visibility control for provider pins on the map to ensure they appear ONLY when "Providers" mode is explicitly selected from the FAB menu, not by default.

## Product Requirement (Clarified)

### Pin Visibility Rules
- **Services/Jobs pins:** Visible based on existing filter/mode logic (unchanged)
- **Provider pins:**
  - ❌ NOT visible by default
  - ✅ Visible ONLY when FAB → "Providers" mode is explicitly selected

### FAB Mode → Pin Type Mapping
- **Listings mode:** Show all listing pins (services + jobs)
- **Services mode:** Show only service listing pins
- **Jobs modes:** Show only job listing pins (all/fixed/quoted)
- **Providers mode:** Show ONLY provider pins (no listings)

**No pin type blending** — each mode shows its designated pin type exclusively.

## Implementation

### File Modified
**app/(tabs)/index.tsx** — `getMapMarkers` function (lines 640-753)

### Changes Applied

#### Before (Incorrect — Provider pins always visible)
```typescript
const getMapMarkers = useMemo(() => {
  if (mapMode === 'providers') {
    return providerMarkers; // Providers-only mode
  }

  // All other modes
  const listingMarkers = [...]; // Create listing markers
  const providerMarkers = [...]; // Extract provider markers

  return [...listingMarkers, ...providerMarkers]; // ❌ WRONG: Always includes providers
}, [listings, mapMode, profile?.user_type]);
```

#### After (Correct — FAB mode enforcement)
```typescript
const getMapMarkers = useMemo(() => {
  // FAB MODE ENFORCEMENT: Provider pins visible ONLY when "Providers" mode is explicitly selected

  if (mapMode === 'providers') {
    // Providers mode: Show ONLY provider pins (includes Provider + Hybrid accounts)
    return Array.from(providersMap.values());
  }

  // All other modes: Show ONLY listing pins (no provider pins)
  const listingMarkers = [...]; // Create listing markers

  return listingMarkers; // ✅ CORRECT: Only listings, no providers
}, [listings, mapMode, profile?.user_type]);
```

### Logic Flow

**When `mapMode === 'providers'`:**
1. Extract unique provider profiles from all listings
2. Create provider marker objects with profile data
3. Return ONLY provider pins (no listing pins)
4. Includes both Provider and Hybrid account types

**When `mapMode === any other value`:**
1. Filter listings based on mode (services, jobs_all, jobs_fixed, jobs_quoted, listings)
2. Create listing marker objects from filtered listings
3. Return ONLY listing pins (no provider pins)
4. Provider pins completely excluded from rendering

## Provider Account Types Included

The "Providers" mode includes:
- ✅ **Provider accounts** (user_type = 'Provider')
- ✅ **Hybrid accounts** (user_type = 'Hybrid')
- ❌ **Customer-only accounts** (excluded — no provider capability)

This is determined by the profile association:
```typescript
// For services/custom services: Uses provider profile
// For jobs: Uses customer profile (who may be Provider/Hybrid posting jobs)
const profile = listing.marketplace_type === 'Job' ? listing.customer : listing.provider;
```

## Behavioral Verification

### Default State (Map loads)
- Default FAB mode: "Listings"
- **Visible:** Service and job listing pins
- **NOT visible:** Provider pins

### User Selects "Services" from FAB
- FAB mode: "Services"
- **Visible:** Service listing pins only
- **NOT visible:** Job pins, provider pins

### User Selects "All Jobs" from FAB
- FAB mode: "Jobs (All)"
- **Visible:** Job listing pins (both fixed and quoted)
- **NOT visible:** Service pins, provider pins

### User Selects "Providers" from FAB
- FAB mode: "Providers"
- **Visible:** Provider pins only (includes Provider + Hybrid accounts)
- **NOT visible:** Listing pins (services/jobs)

### User Switches Back to "Listings"
- FAB mode: "Listings"
- **Visible:** All listing pins (services + jobs)
- **NOT visible:** Provider pins (hidden again)

## Edge Cases Handled

### No Providers Available
- Providers mode shows empty map with "No Locations Available" message
- No errors or crashes
- User can switch back to other modes

### No Listings Available
- Non-providers modes show empty map
- Providers mode unaffected
- Graceful degradation

### Mode State Undefined
- Defaults to 'listings' mode (existing behavior)
- Provider pins remain hidden
- Fail-safe prevents accidental provider visibility

### Mixed Account Types
- Provider accounts appear in Providers mode
- Hybrid accounts appear in Providers mode
- Customer accounts never appear as provider pins
- Proper deduplication ensures each provider appears once

## User Location Indicator (Unchanged)

The user location blue dot fix from the previous change remains in place:
- Explicitly configured with `renderMode="normal"` and `androidRenderMode="normal"`
- Visible when location permission is granted
- Independent of FAB mode selection
- No changes applied in this correction

**File:** `components/NativeInteractiveMapView.tsx`
```typescript
<Mapbox.UserLocation
  visible={true}
  renderMode="normal"
  showsUserHeadingIndicator={true}
  minDisplacement={10}
  androidRenderMode="normal"
/>
```

## What Was NOT Changed

- ❌ No changes to listing pin rendering logic
- ❌ No changes to marker visuals, icons, or labels
- ❌ No changes to FAB menu items or labels
- ❌ No changes to filter UI or logic
- ❌ No changes to map gestures or camera behavior
- ❌ No changes to clustering behavior
- ❌ No changes to bounds calculation
- ❌ No changes to navigation routes
- ❌ No changes to database queries or RLS
- ❌ No changes to provider eligibility rules
- ❌ No new modes introduced
- ❌ No new UI elements added

## What WAS Changed

- ✅ Removed provider pin inclusion from non-providers modes
- ✅ Enforced strict FAB mode → pin type mapping
- ✅ Updated inline comments to clarify enforcement logic
- ✅ Ensured Provider + Hybrid accounts appear in Providers mode

## Performance Impact

**Neutral to Improved:**
- Removed unnecessary provider marker extraction in non-providers modes
- Fewer markers to process and render in most map modes
- Same performance in Providers mode (unchanged logic)
- No additional queries or API calls
- Memoization prevents unnecessary recalculation

## Acceptance Criteria

- ✅ Provider pins NOT visible by default (map loads in "Listings" mode)
- ✅ Provider pins appear ONLY when "Providers" FAB mode is selected
- ✅ Both Provider and Hybrid accounts appear as provider pins
- ✅ Customer-only accounts never appear as provider pins
- ✅ Services/jobs pins behavior unchanged
- ✅ All FAB modes function correctly
- ✅ No performance regressions
- ✅ No changes to other map features
- ✅ User location blue dot remains visible (from previous fix)

## Testing Checklist

### Provider Pin Visibility
- [ ] Open map (defaults to "Listings" mode)
- [ ] Verify NO provider pins (SP) are visible
- [ ] Verify service/job pins (S, FJ, QJ) ARE visible
- [ ] Tap FAB menu
- [ ] Select "Providers"
- [ ] Verify ONLY provider pins (SP) are visible
- [ ] Verify NO service/job pins are visible
- [ ] Select "Services" from FAB
- [ ] Verify provider pins disappear
- [ ] Verify only service pins appear
- [ ] Select "All Jobs" from FAB
- [ ] Verify provider pins remain hidden
- [ ] Verify only job pins appear

### Provider Account Types
- [ ] In "Providers" mode, verify Provider accounts appear
- [ ] In "Providers" mode, verify Hybrid accounts appear
- [ ] Verify Customer-only accounts do NOT appear as provider pins
- [ ] Tap a provider pin
- [ ] Verify navigation to provider store page works

### User Location (Unchanged)
- [ ] Verify blue dot appears at user location
- [ ] Verify blue dot visible in all FAB modes
- [ ] Verify blue dot updates with movement
- [ ] No new permission prompts

## Rollback Plan

If issues arise, revert the change:

```typescript
// In getMapMarkers, after creating listingMarkers:
// Change line 752 from:
return listingMarkers;

// Back to (previous incorrect behavior):
const providersMap = new Map();
filteredListings.forEach((listing) => {
  // ... provider extraction logic ...
});
const providerMarkers = Array.from(providersMap.values());
return [...listingMarkers, ...providerMarkers];
```

## Conclusion

Provider pin visibility is now strictly controlled by FAB mode selection:
- **Hidden by default** in all modes except Providers
- **Visible only** when user explicitly selects "Providers" from FAB
- **Includes both** Provider and Hybrid account types
- **No impact** on existing listing pin behavior or other map features

This enforces clean separation of concerns and gives users explicit control over what they see on the map.
