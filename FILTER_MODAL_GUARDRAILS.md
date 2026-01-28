# Home Filters Modal — Guardrails & Architecture

## 📋 Single Source of Truth

### ✅ ACTIVE COMPONENT
**File:** `components/FilterModalAnimated.tsx`
- This is the ONLY filter modal component used in production
- Imported by: `app/(tabs)/index.tsx` (aliased as `FilterModal`)
- Features: Animated transitions, performance optimization, debounced inputs

### 📦 TYPE DEFINITIONS
**File:** `components/FilterModal.tsx`
- Exports `FilterOptions` interface
- Exports `defaultFilters` constant
- Contains unused `FilterModal` component (legacy, do not use)
- **Purpose:** Type definitions only

### 🧩 SHARED COMPONENTS
**File:** `components/FilterSections.tsx`
- Modular filter section components
- Used by FilterModalAnimated for UI composition

---

## ⛔ WHAT NOT TO DO

1. ❌ Do NOT create alternative FilterModal implementations
2. ❌ Do NOT modify the FilterModal component in FilterModal.tsx
3. ❌ Do NOT import FilterModal component from FilterModal.tsx
4. ❌ Do NOT rename FilterModalAnimated.tsx

---

## ✅ WHAT TO DO

1. ✅ Import types from FilterModal.tsx:
   ```typescript
   import { FilterOptions, defaultFilters } from '@/components/FilterModal';
   ```

2. ✅ Import UI component from FilterModalAnimated.tsx:
   ```typescript
   import { FilterModalAnimated as FilterModal } from '@/components/FilterModalAnimated';
   ```

3. ✅ Make all UI changes in FilterModalAnimated.tsx

4. ✅ Update type definitions in FilterModal.tsx if needed

---

## 📂 File Structure

```
components/
├── FilterModal.tsx              # Type definitions (FilterOptions, defaultFilters)
├── FilterModalAnimated.tsx      # Active UI component ← EDIT HERE
└── FilterSections.tsx           # Shared filter section components
```

---

## 🔗 Import Chain

```
app/(tabs)/index.tsx
    ↓ imports types
FilterModal.tsx (FilterOptions, defaultFilters)
    ↓ used by
FilterModalAnimated.tsx
    ↓ imports
FilterSections.tsx
```

---

## 🛡️ Safety Measures

- **Documentation headers** added to both files with clear warnings
- **Import comment** added to app/(tabs)/index.tsx for clarity
- **No barrel exports** to prevent accidental component imports

---

## 🔄 History

- **Jan 2025:** Removed unused FilterModalOptimized.tsx
- **Jan 2025:** Established guardrails and documentation
- **Current:** Single source of truth with clear separation of types vs UI

---

## 📚 Related Files

Type consumers:
- `contexts/HomeStateContext.tsx`
- `hooks/useHomeFilters.ts`
- `hooks/useHomeSearch.ts`
- `components/HomeHeader.tsx`
- `components/ActiveFiltersBar.tsx`
- Multiple test files

