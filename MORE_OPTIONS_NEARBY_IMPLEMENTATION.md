# Home Discovery Enhancement: "More Options Nearby" Implementation

## Overview
This implementation adds sparse local supply detection and appends geographically expanded listings (30-100 miles) when nearby options (<25 miles) are limited, using a presentation-layer approach that preserves all existing architecture.

## Implementation Summary

### 1. Constants Added
**File**: `hooks/useListingsCursor.ts`

```typescript
const SPARSE_LOCAL_THRESHOLD = 30;
const EXPANDED_DISTANCE_MAX = 100; // miles
```

### 2. Type Definitions

**File**: `hooks/useListingsCursor.ts`

```typescript
export interface HomeExpansionMetadata {
  hasExpanded: boolean;
  primaryCount: number;
  expandedCount: number;
}
```

Updated `UseListingsCursorOptions` to include:
- `userType?: UserType | null` - For Customer discovery mode detection

Updated `UseListingsCursorReturn` to include:
- `expansionMetadata: HomeExpansionMetadata | null`

### 3. Bucketing Logic

**File**: `hooks/useListingsCursor.ts` (lines 493-558)

**Customer Discovery Mode Detection**:
```typescript
const isCustomerDiscoveryMode = (
  userType === 'Customer' &&
  filters.distance !== undefined &&
  filters.distance !== null &&
  filters.userLatitude !== undefined &&
  filters.userLongitude !== undefined
);
```

**Result Bucketing**:
- **Primary Bucket**: Listings within filter distance (≤25 miles)
- **Expanded Bucket**: Listings beyond filter distance but ≤100 miles
- **Sparse Supply Logic**: If primary < 30 listings AND expanded > 0, append expanded results
- **Otherwise**: Show only primary results

**State Management**:
- Sets `expansionMetadata` when expansion occurs
- Preserves atomic visual commit
- No impact on snapshot save/load behavior
- Pagination mode bypasses bucketing (only applies to reset cycles)

### 4. Feed Data Transformation

**File**: `app/(tabs)/index.tsx` (lines 555-606)

**Enhanced feedData useMemo**:
- Checks `expansionMetadata?.hasExpanded`
- If expanded: Splits listings into primary and expanded sections
- Adds section header between sections
- Groups listings by 2 (unchanged behavior)
- Maintains simple layout when not expanded

**Section Header Item**:
```typescript
{
  type: 'section-header',
  id: 'expanded-header',
  title: 'More options nearby',
}
```

### 5. UI Components

**File**: `app/(tabs)/index.tsx`

**Section Header Renderer** (lines 978-988):
```typescript
const renderSectionHeader = useCallback(({ item }: { item: any }) => {
  if (item.type !== 'section-header') return null;

  return (
    <View style={styles.expandedSectionHeader}>
      <Text style={styles.expandedSectionTitle}>{item.title}</Text>
      <Text style={styles.expandedSectionSubtitle}>
        Listings within 100 miles of your location
      </Text>
    </View>
  );
}, []);
```

**Updated Renderers**:
- `renderFeedItemList`: Handles section headers before row rendering
- `renderFeedItemGrid`: Handles section headers before row rendering
- Both check `item.type === 'section-header'` first

### 6. Styles

**File**: `app/(tabs)/index.tsx` (lines 1941-1958)

```typescript
expandedSectionHeader: {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  paddingBottom: spacing.md,
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border,
},
expandedSectionTitle: {
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: colors.text,
  marginBottom: spacing.xs,
},
expandedSectionSubtitle: {
  fontSize: fontSize.sm,
  color: colors.textSecondary,
},
```

### 7. Map View Enhancement

**File**: `app/(tabs)/index.tsx` (lines 837-854)

**Added `isExpanded` flag to markers**:
```typescript
const isExpanded = (
  profile?.user_type === 'Customer' &&
  filters.distance !== undefined &&
  listing.distance_miles !== null &&
  listing.distance_miles !== undefined &&
  listing.distance_miles > filters.distance
);
```

Each marker now includes:
- `isExpanded: boolean` - Flag for conditional styling

**Usage**: Map component can use this flag to:
- Primary markers (isExpanded: false): Full opacity, normal color
- Expanded markers (isExpanded: true): 60% opacity, subtle outline, secondary tint

### 8. Hook Usage Update

**File**: `app/(tabs)/index.tsx` (lines 297-316)

Updated useListings call to include:
- `userType: profile?.user_type || null`
- Destructured `expansionMetadata` from return

## Architecture Preservation

✅ **No RPC Changes**: All bucketing happens post-fetch
✅ **No Additional Fetches**: Single cycle, single commit preserved
✅ **Snapshot-First Intact**: Snapshot save/load unchanged
✅ **Atomic Visual Commit**: Single commit per cycle maintained
✅ **Provider/Admin Unchanged**: Bucketing only for Customer discovery mode
✅ **Performance Preserved**: Minimal overhead (~100 bytes metadata)
✅ **No Flicker**: Bucketing occurs during finalization, before visual commit

## User Experience

### Scenario 1: Customer with <30 nearby listings
1. Primary section renders first (e.g., 22 listings)
2. "More options nearby" header appears
3. Expanded section renders (e.g., 15 additional listings from 30-100 mi)
4. All listings show distance badges
5. Map shows both primary (normal) and expanded (de-emphasized) markers

### Scenario 2: Customer with ≥30 nearby listings
1. Only primary section renders (e.g., 45 listings)
2. No section header
3. No expanded listings
4. Map shows only primary markers

### Scenario 3: Provider/Hybrid/Admin
1. No bucketing occurs (current behavior unchanged)
2. All listings render as single section
3. No section header
4. Map markers render normally

### Scenario 4: Customer without location
1. Distance filtering disabled
2. No bucketing (isCustomerDiscoveryMode = false)
3. Current behavior preserved

## Dev Logging

When expansion occurs (DEV mode only):
```
[useListingsCursor] Home Discovery: Sparse local supply (22). Appending 15 nearby listings (≤100 mi).
```

## Testing Checklist

- [ ] Customer with <30 listings within 25 miles sees expanded section
- [ ] Customer with ≥30 listings sees no expanded section
- [ ] Provider/Hybrid/Admin behavior unchanged
- [ ] Distance badges visible on all listings
- [ ] Map markers include isExpanded flag
- [ ] Section header renders correctly in list view
- [ ] Section header renders correctly in grid view
- [ ] No flicker during load
- [ ] No additional fetch cycles
- [ ] Snapshot save/load works correctly
- [ ] Pagination appends to existing array without re-bucketing

## Files Modified

1. **hooks/useListingsCursor.ts**
   - Added constants (2 lines)
   - Added type definitions (6 lines)
   - Added bucketing logic (~60 lines)
   - Updated return statement (1 line)

2. **app/(tabs)/index.tsx**
   - Updated hook call (2 lines)
   - Enhanced feedData transformation (~50 lines)
   - Added section header renderer (~10 lines)
   - Updated list renderer (3 lines)
   - Updated grid renderer (3 lines)
   - Added map marker expansion flag (~8 lines)
   - Added styles (~18 lines)

**Total**: ~165 lines added/modified across 2 files

## Rollback Strategy

If issues arise:

1. **Hook-level**: Set `SPARSE_LOCAL_THRESHOLD = 0` (disables expansion)
2. **UI-level**: Skip section header rendering
3. **Full rollback**: Revert changes to both files

No database changes = zero migration risk.

## Performance Impact

- **Memory**: +100 bytes for metadata object
- **CPU**: Single array split operation (O(n))
- **Network**: No additional calls
- **Render**: No additional re-renders

## Compliance with Requirements

✅ Preserves Walmart-grade fast load and smooth landing
✅ Preserves snapshot-first architecture
✅ Preserves cycle-based single-commit logic
✅ Avoids silent radius expansion (clear "More options nearby" label)
✅ Maintains user trust and spatial transparency
✅ No RPC function changes
✅ No database logic changes
✅ No default distance radius changes
✅ No Provider/Hybrid/Admin behavior changes
✅ Distance badges always visible
✅ No interleaving of results (clear separation)
✅ No additional fetches or loading states
✅ No pricing regressions

## Status

✅ **Implementation Complete**
✅ **Type-Safe** (verified with tsc --noEmit)
✅ **Ready for Testing**
