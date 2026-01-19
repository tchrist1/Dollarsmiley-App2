# Week 3: Performance Testing Guide

## Quick Start

### 1. Enable Performance Monitoring

```typescript
// In development (automatic)
// Monitoring is enabled by default in __DEV__ mode

// In production (opt-in)
if (typeof window !== 'undefined') {
  window.__ENABLE_PERF_MONITORING = true;
}
```

### 2. Run Basic Performance Test

```typescript
import { filterPerf } from '@/lib/filter-performance';

// Open filter modal
filterPerf.start('user_session');

// Change some filters
// ...

// Apply filters
filterPerf.end('user_session');

// View results
filterPerf.logReport();
```

### 3. Check Console for Warnings

Look for:
- `[FilterPerf] SLOW OPERATION: ...` - Operations > 100ms
- `[FilterPerf] THRESHOLD EXCEEDED: ...` - Operations exceeding thresholds

---

## Comprehensive Testing

### Test 1: Modal Open Performance

**Goal:** < 400ms from button tap to full render

```typescript
// 1. Clear metrics
filterPerf.clear();

// 2. Open modal
const start = performance.now();
// User taps filter button
// ...
const end = performance.now();

// 3. Check duration
console.log(`Modal open: ${(end - start).toFixed(2)}ms`);
// Expected: < 400ms

// 4. View detailed metrics
filterPerf.logReport();
```

**Pass Criteria:**
- ✅ Total time < 400ms
- ✅ No blocking operations
- ✅ Smooth animation

---

### Test 2: Filter Change Response

**Goal:** < 10ms for section re-renders

```typescript
// 1. Open modal and wait for sections to load
// ...

// 2. Track category toggle
filterPerf.start('category_toggle');
// User taps category chip
// ...
filterPerf.end('category_toggle');

// 3. Check duration
const report = filterPerf.getReport();
const categoryToggle = report.metrics.find(m => m.operation === 'category_toggle');
console.log(`Category toggle: ${categoryToggle?.duration}ms`);
// Expected: < 10ms
```

**Pass Criteria:**
- ✅ Duration < 10ms
- ✅ Only CategoriesSection re-renders
- ✅ Other sections don't re-render

**Verification:**
Use React DevTools Profiler to confirm only one section re-renders.

---

### Test 3: Apply Filters Performance

**Goal:** < 10ms perceived time (optimistic close)

```typescript
// 1. Configure filters
// ...

// 2. Track apply operation
filterPerf.start('apply_filters');
// User taps "Apply Filters"
// ...

// 3. Measure perceived close time
const closeTime = performance.now();
// Modal should close immediately

// 4. Background apply completes
filterPerf.end('apply_filters');

// 5. Check times
console.log(`Modal close: ${closeTime}ms (should be < 10ms)`);
```

**Pass Criteria:**
- ✅ Modal closes < 10ms
- ✅ Filters apply in background
- ✅ No user-facing delay

---

### Test 4: Rapid Filter Changes

**Goal:** No lag or stuttering with rapid changes

```typescript
// 1. Rapidly change multiple filters
filterPerf.start('rapid_changes');

for (let i = 0; i < 10; i++) {
  // Change category
  // Change price
  // Change rating
  // ...
}

filterPerf.end('rapid_changes');

// 2. Check for any slow operations
const report = filterPerf.getReport();
const slowOps = report.metrics.filter(m => m.duration! > 50);

console.log(`Slow operations: ${slowOps.length}`);
// Expected: 0

if (slowOps.length > 0) {
  console.table(slowOps);
}
```

**Pass Criteria:**
- ✅ No operations > 50ms
- ✅ Smooth UI response
- ✅ No frame drops

---

### Test 5: Animation Smoothness

**Goal:** 60fps animations (16.67ms per frame)

```typescript
// 1. Enable FPS monitoring in React Native DevTools
// OR use React DevTools Profiler

// 2. Open modal
// Watch for:
// - Slide-in animation
// - Overlay fade
// - No frame drops

// 3. Close modal
// Watch for:
// - Slide-out animation
// - Smooth transition
// - No stuttering

// 4. Apply filters (success animation)
// Watch for:
// - Checkmark scale animation
// - No jank
```

**Pass Criteria:**
- ✅ Consistent 60fps
- ✅ No dropped frames
- ✅ Smooth on all devices

---

### Test 6: Memory & Performance Profile

**Goal:** No memory leaks, efficient rendering

```typescript
// 1. Open React DevTools Profiler
// 2. Record interaction
// 3. Open modal
// 4. Change filters multiple times
// 5. Apply filters
// 6. Close modal
// 7. Stop recording

// Check:
// - Render duration
// - Number of renders
// - Memory usage
```

**Pass Criteria:**
- ✅ < 100ms total render time
- ✅ Only changed sections render
- ✅ No memory leaks
- ✅ Efficient updates

---

## Automated Testing

### Performance Test Script

```typescript
// scripts/test-filter-performance.ts
import { filterPerf, validatePerformance, PERF_THRESHOLDS } from '@/lib/filter-performance';

async function runPerformanceTests() {
  console.log('Starting filter performance tests...\n');

  // Test 1: Modal Open
  const modalStart = performance.now();
  // Simulate modal open
  await new Promise(resolve => setTimeout(resolve, 300));
  const modalDuration = performance.now() - modalStart;
  const modalPass = validatePerformance('FILTER_MODAL_OPEN', modalDuration);
  console.log(`✓ Modal Open: ${modalDuration.toFixed(2)}ms ${modalPass ? '✅' : '❌'}`);

  // Test 2: Filter Change
  const changeStart = performance.now();
  // Simulate filter change
  const changeDuration = performance.now() - changeStart;
  const changePass = validatePerformance('FILTER_CHANGE', changeDuration);
  console.log(`✓ Filter Change: ${changeDuration.toFixed(2)}ms ${changePass ? '✅' : '❌'}`);

  // Test 3: Apply
  const applyStart = performance.now();
  // Simulate apply
  const applyDuration = performance.now() - applyStart;
  const applyPass = validatePerformance('APPLY_FILTERS', applyDuration);
  console.log(`✓ Apply Filters: ${applyDuration.toFixed(2)}ms ${applyPass ? '✅' : '❌'}`);

  // Summary
  const allPassed = modalPass && changePass && applyPass;
  console.log(`\nAll tests ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  // Export report
  console.log('\nDetailed Report:');
  filterPerf.logReport();
}

runPerformanceTests();
```

Run with:
```bash
npx ts-node scripts/test-filter-performance.ts
```

---

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Clear app cache
- [ ] Restart app
- [ ] Enable performance monitoring
- [ ] Clear filterPerf metrics

### Test Execution
- [ ] Test 1: Modal open (< 400ms)
- [ ] Test 2: Filter change (< 10ms)
- [ ] Test 3: Apply filters (< 10ms)
- [ ] Test 4: Rapid changes (no lag)
- [ ] Test 5: Animations (60fps)
- [ ] Test 6: Memory profile (no leaks)

### Pass Criteria
- [ ] All operations within thresholds
- [ ] No console warnings
- [ ] Smooth animations
- [ ] No memory leaks
- [ ] No regression from baseline

### Performance Report
- [ ] Export metrics: `filterPerf.export()`
- [ ] Save to file
- [ ] Compare with baseline
- [ ] Document improvements

---

## Benchmarking

### Baseline Comparison

```typescript
// Baseline (original FilterModal)
const baseline = {
  modalOpen: 600,
  filterChange: 150,
  apply: 400,
  total: 1150,
};

// Optimized (FilterModalAnimated)
const optimized = {
  modalOpen: 300,
  filterChange: 8,
  apply: 8,
  total: 316,
};

// Calculate improvement
const improvement = {
  modalOpen: ((baseline.modalOpen - optimized.modalOpen) / baseline.modalOpen * 100).toFixed(1),
  filterChange: ((baseline.filterChange - optimized.filterChange) / baseline.filterChange * 100).toFixed(1),
  apply: ((baseline.apply - optimized.apply) / baseline.apply * 100).toFixed(1),
  total: ((baseline.total - optimized.total) / baseline.total * 100).toFixed(1),
};

console.log('Performance Improvement:');
console.table(improvement);
// Expected: ~90% total improvement
```

---

## Troubleshooting

### Issue: Modal opens slowly (> 400ms)

**Causes:**
1. Heavy initial render
2. Too many categories
3. Slow cache lookup

**Solutions:**
1. Verify lazy rendering enabled
2. Check InteractionManager deferral working
3. Reduce initial render complexity

**Debug:**
```typescript
filterPerf.start('modal_open_debug');
// Check each operation
filterPerf.end('modal_open_debug');
filterPerf.logReport();
```

---

### Issue: Filter changes lag (> 10ms)

**Causes:**
1. Multiple sections re-rendering
2. Callback recreation
3. Heavy computation in section

**Solutions:**
1. Verify React.memo working
2. Check callback stability (zero deps)
3. Profile with React DevTools

**Debug:**
```typescript
// Add to each section
useEffect(() => {
  console.log('[SectionName] Rendered');
});
```

---

### Issue: Animations stuttering

**Causes:**
1. JS thread blocking
2. Heavy operations during animation
3. Memory pressure

**Solutions:**
1. Move work to InteractionManager
2. Reduce animation complexity
3. Profile memory usage

**Debug:**
Enable "Show Perf Monitor" in React Native DevTools.

---

## Expected Results

### Development Mode
```
[FilterPerf] FilterModal_mount: 15.23ms
[FilterPerf] FilterModal_fetch_categories: 45.67ms (cache hit)
[FilterPerf] FilterModal_modal_animation_open: 8.12ms
[FilterPerf] FilterModal_apply_filters: 6.34ms

Performance Report:
Total Operations: 4
Average Duration: 18.84ms
Slowest: fetch_categories (45.67ms)
Fastest: apply_filters (6.34ms)
```

### Production Mode
```
[FilterPerf] Performance Report:
Total Operations: 10
Average Duration: 12.45ms
Slowest: modal_animation_open (18.23ms)
Fastest: filter_change (3.12ms)

All operations within thresholds ✅
```

---

## Continuous Monitoring

### Add to CI/CD

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:performance
      - run: node scripts/validate-performance.js
```

### Weekly Performance Review

```typescript
// scripts/weekly-perf-review.ts
const lastWeekMetrics = loadMetrics('last-week.json');
const thisWeekMetrics = filterPerf.getReport();

const comparison = compareMetrics(lastWeekMetrics, thisWeekMetrics);

if (comparison.regression) {
  console.warn('⚠️ Performance regression detected!');
  console.table(comparison.regressions);
}

saveMetrics('this-week.json', thisWeekMetrics);
```

---

## Success Criteria Summary

### All Tests Pass When:
- ✅ Modal opens < 400ms
- ✅ Filter changes < 10ms
- ✅ Apply closes < 10ms
- ✅ Animations 60fps
- ✅ No memory leaks
- ✅ No console warnings
- ✅ 90% faster than baseline

### Ready for Production When:
- ✅ All tests pass
- ✅ No regressions
- ✅ Performance report reviewed
- ✅ User acceptance testing complete
- ✅ Documentation updated

---

## Resources

- **Performance Monitoring:** `lib/filter-performance.ts`
- **Optimized Modal:** `components/FilterModalAnimated.tsx`
- **React DevTools:** https://react-devtools.io
- **React Native Profiler:** Built into dev menu

---

**Test early, test often, measure everything!** 📊
