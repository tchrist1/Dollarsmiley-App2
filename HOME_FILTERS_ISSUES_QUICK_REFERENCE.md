# Home Filters Issues - Quick Reference

**Analysis Date:** 2026-01-19
**Full Report:** See HOME_FILTERS_ARCHITECTURE_ANALYSIS.md

---

## Critical Issues (Action Required)

### 🔴 Issue #1: State Management Fragmentation
**Location:** Multiple files
**Impact:** HIGH - Maintainability, Code Duplication

**Problem:** 4 different state management patterns exist:
1. Home screen local useState (ACTIVE - used)
2. HomeStateContext composing 3 hooks (INACTIVE - unused)
3. useHomeState reducer (INACTIVE - unused)
4. Individual hooks: useHomeFilters, useHomeUIState, useHomeSearch (PARTIALLY ACTIVE)

**Files:**
- `app/(tabs)/index.tsx` - Uses local state
- `contexts/HomeStateContext.tsx` - Unused context
- `hooks/useHomeState.ts` - Unused reducer
- `hooks/useHomeFilters.ts` - Unused hook
- `hooks/useHomeUIState.ts` - Unused hook
- `hooks/useHomeSearch.ts` - Partially used

**Recommendation:** Choose ONE pattern and deprecate others.

---

### 🔴 Issue #2: Active Filter Count Duplication
**Location:** 3 separate implementations
**Impact:** HIGH - Logic Drift, Maintenance

**Problem:** getActiveFilterCount() logic in 3 places with DIFFERENT implementations:

1. **app/(tabs)/index.tsx** (line 869) - 15 checks ✅ CORRECT
2. **hooks/useHomeFilters.ts** (line 15) - 9 checks ❌ OUTDATED
3. **hooks/useHomeState.ts** (line 242) - 9 checks ❌ OUTDATED

**Missing in outdated versions:**
- availability check
- instant_booking check
- fulfillmentTypes check
- shippingMode check
- hasVAS check
- tags check

**Recommendation:** Create shared utility function in `lib/filter-utils.ts`

---

## Warnings (Should Address)

### ⚠️ Issue #3: Type Definition Inconsistency
**Status:** Recently fixed for Home screen, but risk remains
**Impact:** MEDIUM - Type Safety

**Problem:** FilterOptions defined in two places:
- Canonical: `components/FilterModal.tsx` (15 fields)
- Previously: Home screen had incomplete local definition (fixed)
- Risk: Other files may have stale definitions

**Recommendation:** Create `types/filters.ts` as single source of truth

---

### ⚠️ Issue #4: Default Values Inconsistency
**Impact:** MEDIUM - Unexpected behavior

**Problem:** Different default values:
- FilterModal: distance = 25
- useHomeFilters: distanceRadius = 50

**Recommendation:** Use single `defaultFilters` export from FilterModal

---

### ⚠️ Issue #5: Map View Filter Integration Unclear
**Impact:** MEDIUM - Feature Completeness

**Problem:** Unclear if map view receives and applies filters

**Questions:**
- Does map view update when filters applied?
- Are map pins filtered?
- Separate query or shared?

**Recommendation:** Verify and document map view filter integration

---

### ⚠️ Issue #6: Search and Filter Integration Gaps
**Impact:** MEDIUM - User Experience

**Problem:** Search suggestions and filters operate independently

**Missing:**
- Filter suggestions based on search query
- "Apply filter: X" suggestions
- Integration with lib/advanced-search.ts

**Recommendation:** Integrate getFilterSuggestions() from advanced-search.ts

---

### ⚠️ Issue #7: Job vs Service Filter Structure
**Impact:** MEDIUM - Code Complexity

**Problem:** Jobs and Services have different field names:
- Jobs: budget_min/max, fixed_price
- Services: base_price, listing_type

Some FilterOptions fields only apply to Services (fulfillmentTypes, shippingMode)

**Current Solution:** useListings normalizes both (works but complex)

**Recommendation:** Consider union type for FilterOptions

---

## Minor Issues (Can Defer)

### 📊 Issue #8: Missing Filter State Persistence
**Impact:** LOW - User Experience

**Problem:** No filter persistence across sessions

**Note:** Infrastructure exists but unused:
- lib/advanced-search.ts has saveFilter()
- Database tables: user_saved_filters, filter_presets
- All ready but not integrated

**Recommendation:** Implement saved filter presets

---

### 📊 Issue #9: Carousel Logic Coupling
**Impact:** LOW - Code Duplication

**Problem:** shouldShowCarousels computed in multiple places
- HomeStateContext (line 71)
- useHomeState (line 261)
- Could be extracted to utility

---

### 📊 Issue #10: Dead Code in Advanced Search
**Impact:** LOW - Bundle Size

**Problem:** lib/advanced-search.ts is 698 lines, mostly unused
- 20+ unused functions
- Created for future features
- Increases bundle size

**Recommendation:** Remove unused functions or document as future features

---

### 📊 Issue #11: Performance Logging Only in DEV
**Impact:** LOW - Production Monitoring

**Problem:** All perf logs wrapped in `__DEV__` check
- No production performance monitoring
- Can't track real-world metrics

**Recommendation:** Add lightweight production analytics

---

### 📊 Issue #12: No Filter Validation
**Impact:** LOW - Edge Cases

**Problem:** No validation before applying filters
- priceMin > priceMax not checked
- distance < 0 not checked
- rating > 5 not checked

**Note:** lib/advanced-search.ts has validateFilters() but unused

**Recommendation:** Add validation layer in FilterModal

---

## Quick Action Plan

### Phase 1: Immediate (Low Risk)
1. ✅ Create `lib/filter-utils.ts` with shared getActiveFilterCount()
2. ✅ Update Home screen to use utility
3. ✅ Create `types/filters.ts` with canonical FilterOptions
4. ✅ Update all imports to use shared type

### Phase 2: Near Term (Medium Risk)
5. ⚠️ Verify and document map view filter integration
6. ⚠️ Mark unused hooks/context as deprecated
7. ⚠️ Add filter validation layer
8. ⚠️ Integrate filter suggestions

### Phase 3: Long Term (Requires Planning)
9. 🔄 Choose single state management pattern
10. 🔄 Migrate to chosen pattern
11. 🔄 Remove deprecated code
12. 🔄 Implement saved filters

---

## What's Working Well ✅

**Performance Optimizations (Phases 1-3):**
- 60fps smooth FilterModal scrolling
- <50ms modal open time
- Optimized gesture performance
- Draft state isolation
- Memoized filter sections

**Code Quality:**
- Good test coverage of recent changes
- Clear performance documentation
- Well-structured component hierarchy

**Architecture:**
- Clean separation of UI and data layers
- useListings hook handles complexity well
- FilterModal draft state pattern is excellent

---

## Key Metrics

**Code Duplication:**
- ActiveFilterCount logic: 3 copies
- Default filter values: 2 versions
- State management patterns: 4 approaches

**Unused Code:**
- ~500 lines in unused hooks
- ~600 lines in lib/advanced-search.ts
- ~200 lines in HomeStateContext

**Type Safety:**
- FilterOptions definitions: 2 (should be 1)
- Missing validation: ~5 edge cases

---

## Testing Priorities

### Unit Tests Needed:
1. getActiveFilterCount() with all 15 filter types
2. Filter validation edge cases
3. Default filter values consistency

### Integration Tests Needed:
1. Apply filters → verify query
2. Clear all → verify reset
3. Multiple filters → verify AND logic

### E2E Tests Needed:
1. Open → toggle → apply → results
2. List view → Map view → same filters
3. Search + filters → combined results

---

## Files Requiring Attention

**High Priority:**
- `app/(tabs)/index.tsx` - Extract utilities
- `hooks/useHomeFilters.ts` - Deprecate or update
- `hooks/useHomeState.ts` - Deprecate or adopt
- `contexts/HomeStateContext.tsx` - Deprecate or adopt

**Medium Priority:**
- `lib/advanced-search.ts` - Integrate or remove unused
- `hooks/useMapData.ts` - Verify filter integration
- `lib/enhanced-search.ts` - Check type consistency

**Create New:**
- `lib/filter-utils.ts` - Shared utilities
- `types/filters.ts` - Canonical types
- `lib/filter-validation.ts` - Validation logic

---

## Contact Points for Questions

**State Management Decision:**
- Which pattern to standardize on?
- Timeline for migration?

**Map View Integration:**
- Does map view use filters currently?
- Expected behavior?

**Feature Priorities:**
- Should we implement saved filters?
- Should we integrate advanced search?
- Should we add filter validation?

---

**Last Updated:** 2026-01-19
**Next Review:** After Priority 1-2 actions completed
