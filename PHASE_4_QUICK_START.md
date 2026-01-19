# PHASE 4: STATE MANAGEMENT - QUICK START GUIDE

## 🚀 Quick Integration

Choose one of three approaches based on your needs:

## Option 1: Individual Hooks (RECOMMENDED) ⭐

**Best for:** Most projects, clean code, best performance

```typescript
// app/(tabs)/index.tsx
import { useHomeFilters } from '@/hooks/useHomeFilters';
import { useHomeUIState } from '@/hooks/useHomeUIState';
import { useHomeSearch } from '@/hooks/useHomeSearch';

export default function HomeScreen() {
  const { profile } = useAuth();

  // 3 clean hook calls
  const filterState = useHomeFilters({ initialListingType: 'all' });
  const uiState = useHomeUIState({ initialViewMode: 'grid' });
  const searchState = useHomeSearch({ userId: profile?.id || null });

  // Use in your components
  return (
    <View>
      <HomeSearchBar
        searchQuery={searchState.searchQuery}
        onSearchChange={searchState.updateSearchQuery}
        onClearSearch={searchState.clearSearch}
        suggestions={searchState.suggestions}
        showSuggestions={searchState.showSuggestions}
      />

      <HomeHeader
        activeFilterCount={filterState.activeFilterCount}
        onOpenFilters={filterState.openFilterModal}
      />

      <ViewModeToggle
        viewMode={uiState.viewMode}
        onChangeViewMode={uiState.changeViewMode}
      />
    </View>
  );
}
```

## Option 2: Context Provider

**Best for:** Sharing state across many components, avoiding prop drilling

```typescript
// app/(tabs)/index.tsx
import { HomeStateProvider, useHomeState } from '@/contexts/HomeStateContext';

export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <HomeStateProvider userId={profile?.id || null}>
      <HomeContent />
    </HomeStateProvider>
  );
}

function HomeContent() {
  const state = useHomeState();

  return (
    <View>
      <HomeSearchBar {...state} />
      <HomeHeader {...state} />
      <ViewModeToggle {...state} />
    </View>
  );
}
```

## Option 3: Single Reducer Hook

**Best for:** Complex state logic, predictable updates

```typescript
// app/(tabs)/index.tsx
import { useHomeState } from '@/hooks/useHomeState';

export default function HomeScreen() {
  const state = useHomeState({
    initialListingType: 'all',
    initialViewMode: 'grid',
  });

  return (
    <View>
      <HomeSearchBar
        searchQuery={state.searchQuery}
        onSearchChange={state.updateSearchQuery}
        onClearSearch={state.clearSearch}
        suggestions={state.suggestions}
        showSuggestions={state.showSuggestions}
      />
    </View>
  );
}
```

---

## 📋 API Reference

### useHomeFilters

```typescript
const {
  filters,              // FilterOptions: Current filters
  activeFilterCount,    // number: Count of active filters
  showFilterModal,      // boolean: Modal visibility
  updateFilters,        // (filters: Partial<FilterOptions>) => void
  resetFilters,         // () => void
  openFilterModal,      // () => void
  closeFilterModal,     // () => void
  applyFilters,         // (filters: FilterOptions) => void
} = useHomeFilters({ initialListingType: 'all' });
```

### useHomeUIState

```typescript
const {
  viewMode,             // 'list' | 'grid' | 'map'
  mapMode,              // 'listings' | 'providers'
  mapZoomLevel,         // number
  showMapStatusHint,    // boolean
  changeViewMode,       // (mode: ViewMode) => void
  changeMapMode,        // (mode: MapMode) => void
  updateMapZoom,        // (zoom: number) => void
  showMapHint,          // (duration?: number) => void
  hideMapHint,          // () => void
} = useHomeUIState({
  initialViewMode: 'grid',
  initialMapMode: 'listings',
  initialMapZoom: 12,
});
```

### useHomeSearch

```typescript
const {
  searchQuery,          // string: Current query
  suggestions,          // SearchSuggestion[]: Results
  showSuggestions,      // boolean: Dropdown visible
  loadingSuggestions,   // boolean: Loading state
  updateSearchQuery,    // (query: string) => void (debounced)
  selectSuggestion,     // (suggestion: string) => void
  clearSearch,          // () => void
  hideSuggestions,      // () => void
} = useHomeSearch({
  userId: profile?.id || null,
  minQueryLength: 2,
  debounceMs: 300,
});
```

---

## 🎯 Common Patterns

### Pattern 1: Filtering with Search
```typescript
const filterState = useHomeFilters();
const searchState = useHomeSearch({ userId });

// Pass to data hook
const { listings } = useListings({
  searchQuery: searchState.searchQuery,
  filters: filterState.filters,
  userId,
});
```

### Pattern 2: View Mode Switching
```typescript
const uiState = useHomeUIState();

// Grid/List/Map toggle
<ViewModeToggle
  viewMode={uiState.viewMode}
  onChangeViewMode={uiState.changeViewMode}
/>

// Conditional rendering
{uiState.viewMode === 'grid' && <GridView />}
{uiState.viewMode === 'list' && <ListView />}
{uiState.viewMode === 'map' && <MapView />}
```

### Pattern 3: Filter Modal
```typescript
const filterState = useHomeFilters();

<HomeHeader
  activeFilterCount={filterState.activeFilterCount}
  onOpenFilters={filterState.openFilterModal}
/>

<FilterModal
  visible={filterState.showFilterModal}
  filters={filterState.filters}
  onApply={filterState.applyFilters}
  onClose={filterState.closeFilterModal}
  onReset={filterState.resetFilters}
/>
```

### Pattern 4: Search with Suggestions
```typescript
const searchState = useHomeSearch({ userId });

<HomeSearchBar
  searchQuery={searchState.searchQuery}
  onSearchChange={searchState.updateSearchQuery}
  suggestions={searchState.suggestions}
  showSuggestions={searchState.showSuggestions}
  onSelectSuggestion={searchState.selectSuggestion}
  onClearSearch={searchState.clearSearch}
/>
```

---

## 🔧 Migration Steps

### Step 1: Replace Filter State
```typescript
// Before
const [filters, setFilters] = useState(defaultFilters);
const [showFilters, setShowFilters] = useState(false);

// After
const filterState = useHomeFilters();
```

### Step 2: Replace UI State
```typescript
// Before
const [viewMode, setViewMode] = useState('grid');
const [mapMode, setMapMode] = useState('listings');

// After
const uiState = useHomeUIState();
```

### Step 3: Replace Search State
```typescript
// Before
const [searchQuery, setSearchQuery] = useState('');
const [suggestions, setSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);

// After
const searchState = useHomeSearch({ userId });
```

### Step 4: Update Component Props
```typescript
// Before
<HomeSearchBar
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
/>

// After
<HomeSearchBar
  searchQuery={searchState.searchQuery}
  onSearchChange={searchState.updateSearchQuery}
/>
```

---

## ✅ Benefits Checklist

After integration, you get:
- ✅ Clean, organized state management
- ✅ Reusable hooks across screens
- ✅ Better performance (optimized re-renders)
- ✅ Easier testing
- ✅ Type-safe APIs
- ✅ Auto-complete support
- ✅ Memory leak prevention
- ✅ Proper cleanup

---

## 🐛 Troubleshooting

### Issue: "useHomeState must be used within HomeStateProvider"
**Solution:** Wrap your component tree with HomeStateProvider:
```typescript
<HomeStateProvider userId={userId}>
  <YourComponent />
</HomeStateProvider>
```

### Issue: Suggestions not showing
**Solution:** Check userId is passed and query length >= minQueryLength:
```typescript
useHomeSearch({
  userId: profile?.id || null,  // Make sure this exists
  minQueryLength: 2,            // Default is 2
});
```

### Issue: Filters not updating
**Solution:** Use updateFilters instead of setFilters:
```typescript
// Wrong
setFilters({ ...filters, listingType: 'Job' });

// Right
filterState.updateFilters({ listingType: 'Job' });
```

---

## 📚 Related Documentation

- [PHASE_4_STATE_MANAGEMENT_REFACTOR.md](./PHASE_4_STATE_MANAGEMENT_REFACTOR.md) - Full documentation
- [PHASE_2_DATA_LAYER_EXTRACTION.md](./PHASE_2_DATA_LAYER_EXTRACTION.md) - Data hooks
- [PHASE_3_COMPONENT_DECOMPOSITION.md](./PHASE_3_COMPONENT_DECOMPOSITION.md) - UI components

---

## 🎉 Ready to Use!

Choose your approach and start using clean state management:

1. **Individual Hooks** - Most flexible, best performance ⭐
2. **Context Provider** - Best for sharing state
3. **Reducer Hook** - Best for complex logic

All approaches are production-ready and fully tested!
