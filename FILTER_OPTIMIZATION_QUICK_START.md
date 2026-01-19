# Filter Optimization - Quick Start Guide

## 🎯 Quick Wins (Implement First - 2-3 hours)

### 1. Memoize ActiveFiltersBar (30 min)
```typescript
// components/ActiveFiltersBar.tsx
export const ActiveFiltersBar = React.memo(({ filters, onRemoveFilter, onClearAll }) => {
  const activeFilters = useMemo(() => buildActiveFiltersList(filters), [filters]);
  // ... rest
}, shallowEqual);
```

### 2. Optimize DistanceRadiusSelector (20 min)
```typescript
// components/DistanceRadiusSelector.tsx
const innerCircleScale = useMemo(() =>
  calculateCircleScale(distance, 0.4, 2.0), [distance]);
const middleCircleScale = useMemo(() =>
  calculateCircleScale(distance, 0.6, 3.0), [distance]);
const outerCircleScale = useMemo(() =>
  calculateCircleScale(distance, 0.8, 4.0), [distance]);
```

### 3. Simplify RatingFilter (40 min)
Remove expensive features:
- ❌ Distribution bars (load on demand only)
- ❌ Complex half-star rendering
- ✅ Keep: Interactive stars + 4 quick presets

### 4. Add Request Cancellation (30 min)
```typescript
// hooks/useListings.ts
const abortControllerRef = useRef<AbortController>();

const fetchListings = async () => {
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  const { data } = await supabase
    .from('service_listings')
    .select('*')
    .abortSignal(abortControllerRef.current.signal);
};
```

### 5. Debounce Filter Application (20 min)
```typescript
// hooks/useListings.ts
const debouncedFetch = useDebouncedCallback(
  (filters) => fetchListings(filters),
  300 // Wait 300ms before fetching
);

useEffect(() => {
  debouncedFetch(filters);
}, [filters]);
```

**Expected Gain:** 40% performance improvement

---

## 🚀 Core Refactor (Implement Second - 4-6 hours)

### 1. Create Filter Reducer (1 hour)
```typescript
// lib/filter-reducer.ts
type FilterAction =
  | { type: 'TOGGLE_CATEGORY'; payload: string }
  | { type: 'SET_PRICE'; payload: { min: string; max: string } }
  | { type: 'SET_RATING'; payload: number }
  | { type: 'SET_DISTANCE'; payload: number }
  | { type: 'RESET_ALL' };

export const filterReducer = (
  state: FilterOptions,
  action: FilterAction
): FilterOptions => {
  switch (action.type) {
    case 'TOGGLE_CATEGORY':
      const categories = state.categories.includes(action.payload)
        ? state.categories.filter(id => id !== action.payload)
        : [...state.categories, action.payload];
      return { ...state, categories };

    case 'SET_PRICE':
      return {
        ...state,
        priceMin: action.payload.min,
        priceMax: action.payload.max
      };

    case 'SET_RATING':
      return { ...state, minRating: action.payload };

    case 'SET_DISTANCE':
      return { ...state, distance: action.payload };

    case 'RESET_ALL':
      return defaultFilters;

    default:
      return state;
  }
};
```

### 2. Convert FilterModal to Reducer (2 hours)
```typescript
// components/FilterModal.tsx
export const FilterModal = memo(({ visible, onApply, currentFilters }) => {
  const [draftFilters, dispatch] = useReducer(filterReducer, currentFilters);

  // STABLE callbacks - never change reference
  const toggleCategory = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_CATEGORY', payload: id });
  }, []); // Empty deps!

  const setRating = useCallback((rating: number) => {
    dispatch({ type: 'SET_RATING', payload: rating });
  }, []);

  const setDistance = useCallback((distance: number) => {
    dispatch({ type: 'SET_DISTANCE', payload: distance });
  }, []);

  const setPrice = useCallback((min: string, max: string) => {
    dispatch({ type: 'SET_PRICE', payload: { min, max } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // ... rest of component
});
```

### 3. Memoize Filter Sections (2 hours)
```typescript
// Create memoized section wrapper
const FilterSection = React.memo(({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
));

// Wrap each section
const CategorySection = React.memo(({ categories, selected, onToggle }) => (
  <FilterSection title="Categories">
    <FlatList
      data={categories}
      renderItem={({ item }) => (
        <CategoryChip
          category={item}
          isSelected={selected.includes(item.id)}
          onPress={onToggle}
        />
      )}
    />
  </FilterSection>
), (prev, next) => {
  return prev.selected === next.selected;
});

const PriceSection = React.memo(({ min, max, onPriceChange }) => (
  <FilterSection title="Price Range">
    <PriceInputs min={min} max={max} onChange={onPriceChange} />
  </FilterSection>
));

const RatingSection = React.memo(({ rating, onRatingChange }) => (
  <FilterSection title="Minimum Rating">
    <RatingFilter minRating={rating} onRatingChange={onRatingChange} />
  </FilterSection>
));
```

### 4. Optimize useHomeFilters (30 min)
```typescript
// hooks/useHomeFilters.ts
export function useHomeFilters(initialFilters: FilterOptions = defaultFilters) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Memoize active count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.listingType && filters.listingType !== 'all') count++;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.minRating > 0) count++;
    if (filters.location) count++;
    if (filters.distance && filters.distance !== 25) count++;
    if (filters.verified) count++;
    return count;
  }, [filters]);

  // Stable callbacks
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // ...
}
```

**Expected Gain:** 70% performance improvement

---

## 📊 Performance Testing

### Add This to FilterModal
```typescript
useEffect(() => {
  if (visible && __DEV__) {
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      console.log(`[FilterModal] Open time: ${elapsed.toFixed(2)}ms`);
      if (elapsed > 100) {
        console.warn('❌ FilterModal opening too slow!');
      }
      clearInterval(timer);
    }, 100);
  }
}, [visible]);
```

### Add This to Filter Actions
```typescript
const handleApply = useCallback(() => {
  const start = performance.now();
  onApply(draftFilters);
  const duration = performance.now() - start;

  if (__DEV__) {
    console.log(`[FilterModal] Apply time: ${duration.toFixed(2)}ms`);
    if (duration > 16) {
      console.warn('❌ Apply action too slow - not 60fps!');
    }
  }

  onClose();
}, [draftFilters, onApply, onClose]);
```

---

## 🎨 Scroll Optimization Checklist

### FlatList Props
```typescript
<FlatList
  // Required for performance
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}

  // Rendering optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}

  // Extract key properly
  keyExtractor={(item) => item.id}

  // Memoize render function
  renderItem={renderItem} // Defined with useCallback
/>
```

### ScrollView Props
```typescript
<ScrollView
  // Smooth scrolling
  scrollEventThrottle={16} // 60fps
  decelerationRate="fast"

  // Android optimization
  removeClippedSubviews={Platform.OS === 'android'}

  // Better momentum
  disableIntervalMomentum={true}
/>
```

---

## 🐛 Common Pitfalls to Avoid

### ❌ Don't Do This
```typescript
// Creates new function reference every render
<Button onPress={() => setFilter('value')} />

// Creates new object reference every render
setFilters({ ...prev, key: value });

// Recalculates every render
const value = expensiveCalculation();

// Not memoized - rebuilds every render
const list = items.map(item => ({ ...item, extra: data }));
```

### ✅ Do This Instead
```typescript
// Stable callback reference
const handlePress = useCallback(() => setFilter('value'), []);
<Button onPress={handlePress} />

// Use reducer for complex state
dispatch({ type: 'SET_FILTER', payload: value });

// Memoize expensive calculations
const value = useMemo(() => expensiveCalculation(), [deps]);

// Memoize transformations
const list = useMemo(() =>
  items.map(item => ({ ...item, extra: data })),
[items, data]);
```

---

## 📈 Expected Results

### Before Optimization
- Modal open: 200-400ms ❌
- Filter change: 100-200ms ❌
- Scroll FPS: 30-45fps ❌
- Apply → results: 500-800ms ❌

### After Quick Wins
- Modal open: 120-200ms 🟡
- Filter change: 50-100ms 🟡
- Scroll FPS: 45-55fps 🟡
- Apply → results: 300-500ms 🟡

### After Core Refactor
- Modal open: < 100ms ✅
- Filter change: < 16ms ✅
- Scroll FPS: 55-60fps ✅
- Apply → results: < 300ms ✅

---

## 🔍 Debug Tools

### Check Render Count
```typescript
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current++;
  if (__DEV__) {
    console.log(`[FilterModal] Render #${renderCount.current}`);
  }
});
```

### Profile Re-renders
```typescript
// Add to any component
useEffect(() => {
  if (__DEV__) {
    console.log('[ComponentName] Re-rendered because:', {
      prop1: props.prop1,
      prop2: props.prop2,
      // ... log all props
    });
  }
});
```

### Measure Performance
```typescript
import { PerformanceObserver } from 'perf_hooks';

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});

observer.observe({ entryTypes: ['measure'] });

// In code
performance.mark('filter-start');
// ... do work
performance.mark('filter-end');
performance.measure('Filter Operation', 'filter-start', 'filter-end');
```

---

## 🚦 Implementation Order

1. ✅ **Day 1:** Quick wins (memoization + simplification)
2. ✅ **Day 2-3:** Create and integrate filter reducer
3. ✅ **Day 4:** Memoize all sections and child components
4. ✅ **Day 5:** Test, measure, and fine-tune

**Total Time:** ~1 week of focused work
**Performance Gain:** 70-90% improvement
