# Map View Fixes - Quick Reference

## Issues Fixed

### 1. Job Filter Excluding Quote-Based Jobs ✅
**Problem:** When "Job" filter selected, only fixed-price jobs appeared.
**Solution:** Modified query to always include quote-based jobs.
**File:** `app/(tabs)/index.tsx` (lines 492-512)

### 2. Unreliable Map Pin Clicks ✅
**Problem:** Markers required multiple taps, inconsistent clickability.
**Solution:** Removed `pointerEvents="box-none"` from marker wrapper.
**File:** `components/InteractiveMapView.tsx` (line 371)

---

## Quick Testing

### Test Job Filter
1. Open Discover → Filters → Select "Job"
2. Switch to Map View
3. **Expect:** See both fixed-price jobs ($100, $200, etc.) AND "Quote Required" jobs

### Test Clickability
1. Open Discover → Map View
2. Single tap any marker
3. **Expect:** Detail screen opens immediately

---

## Filter Logic Summary

### When No Price Filters
- All jobs included (fixed-price + quote-based)

### When Price Filters Applied
```sql
WHERE (
  pricing_type = 'quote_based'  -- Always included
  OR (budget within range)       -- Budget jobs
  OR (fixed_price within range)  -- Fixed-price jobs
)
```

**Result:**
- Quote-based jobs: ALWAYS visible
- Fixed/budget jobs: Filtered by price range

---

## Marker Types

| Type | Icon | Price Display | Clickable |
|------|------|---------------|-----------|
| **Job (Fixed)** | Orange briefcase | "$100" | ✅ Single tap |
| **Job (Quote)** | Orange briefcase | "Quote Required" | ✅ Single tap |
| **Service** | Green map pin | "$50" | ✅ Single tap |
| **Custom Service** | Purple sparkles | "$200" | ✅ Single tap |
| **Provider** | Green user | Rating (4.5★) | ✅ Single tap |

---

## Files Modified

**1. app/(tabs)/index.tsx**
- Job query price filter logic
- Lines: 492-512

**2. components/InteractiveMapView.tsx**
- Removed blocking pointerEvents prop
- Line: 371

**Total Changes:** 2 files, ~30 lines

---

## Rollback (If Needed)

### Revert Job Filter
Replace lines 492-512 in `app/(tabs)/index.tsx` with:
```typescript
if (filters.priceMin) {
  jobQuery = jobQuery.or(`budget_min.gte.${parseFloat(filters.priceMin)},fixed_price.gte.${parseFloat(filters.priceMin)}`);
}

if (filters.priceMax) {
  jobQuery = jobQuery.or(`budget_max.lte.${parseFloat(filters.priceMax)},fixed_price.lte.${parseFloat(filters.priceMax)}`);
}
```

### Revert Clickability
Add back to line 371 in `components/InteractiveMapView.tsx`:
```typescript
pointerEvents="box-none"
```

---

## Acceptance Checklist

- ✅ Quote-based jobs visible on map
- ✅ Fixed-price jobs visible on map
- ✅ Price filters work for fixed-price jobs
- ✅ Quote jobs not filtered by price
- ✅ All markers clickable with single tap
- ✅ Service filter unchanged
- ✅ List/Grid views unchanged
- ✅ No crashes or errors

---

## Key Points

**Quote-Based Jobs:**
- Always included when "Job" filter selected
- NOT affected by price range filters
- Display "Quote Required" label
- Clickable like any other job

**Map Pin Clicks:**
- Single tap/click opens detail
- No multiple taps needed
- Works across all marker types
- Consistent behavior web + mobile

**No Breaking Changes:**
- Service filtering unchanged
- Navigation unchanged
- Database unchanged
- Existing queries still work
