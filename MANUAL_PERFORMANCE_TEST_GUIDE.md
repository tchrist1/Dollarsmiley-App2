# Manual Performance Testing Guide

## Overview

This guide provides step-by-step instructions for manually executing performance tests on the Home screen and Filters functionality.

**Why Manual Testing?**
- Real-world user interactions
- Actual device performance
- Visual verification of behavior
- More accurate measurements in production-like conditions

---

## Prerequisites

1. **Development Environment**
   ```bash
   # Ensure you're in dev mode
   npm run dev
   ```

2. **Console Access**
   - Browser: Open Developer Tools → Console tab
   - React Native: Open debugger or use Expo Dev Tools

3. **Clear Cache**
   - Close and reopen the app
   - Clear browser cache if testing on web

---

## Testing Procedure

### Setup

1. **Enable Performance Logging**
   - Performance logs are automatically enabled in `__DEV__` mode
   - Look for logs prefixed with `[PERF]` in the console

2. **Prepare Recording Sheet**
   - Use `PERFORMANCE_TEST_RESULTS_TEMPLATE.md` to record results
   - Or create a spreadsheet with the same structure

---

## Test 1: Open Filters

**What to measure**: Time from tapping "Filters" button to modal fully visible

**Steps** (Run 3 times):

1. Navigate to Home screen
2. Clear console logs (for clarity)
3. **Tap the "Filters" button**
4. Wait for modal to appear completely
5. Record the time difference between:
   - `FILTER_OPEN_TAP` timestamp
   - `FILTER_OPEN_VISIBLE` timestamp

**Expected Console Output**:
```
[PERF] FILTER_OPEN_TAP { timestamp: "1234.56" }
[PERF] FILTER_MODAL_OPENING { filtersCount: 0 }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "1484.56" }
```

**Calculate**: `1484.56 - 1234.56 = 250ms` ← Record this

**Record**:
- Run 1: _____ ms
- Run 2: _____ ms
- Run 3: _____ ms
- JS Blocks: _____ (count of JS_BLOCK_DETECTED)
- Network Calls: _____ (count of NETWORK_CALL)

---

## Test 2: Close Filters

**What to measure**: Time from tapping close to modal fully dismissed

**Steps** (Run 3 times):

1. Have filters modal open
2. Clear console logs
3. **Tap the X button or overlay to close**
4. Wait for modal to fully dismiss
5. Record time difference between:
   - `FILTER_CLOSE_TAP` timestamp
   - `FILTER_CLOSE_COMPLETE` timestamp

**Expected Console Output**:
```
[PERF] FILTER_CLOSE_TAP { timestamp: "2345.67" }
[PERF] FILTER_MODAL_CLOSED
[PERF] FILTER_CLOSE_COMPLETE { timestamp: "2395.67" }
```

**Calculate**: `2395.67 - 2345.67 = 50ms`

**Record**: (Same format as Test 1)

---

## Test 3a: Apply Job Filter

**What to measure**: Complete filter application with data fetch

**Steps** (Run 3 times):

1. Navigate to Home screen
2. Clear console logs
3. **Open filters**
4. **Select "Job" listing type**
5. **Tap "Apply Filters"**
6. Wait for results to render
7. Record time from `FILTER_OPEN_TAP` to when results appear

**Expected Console Output**:
```
[PERF] FILTER_OPEN_TAP { timestamp: "3456.78" }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "3706.78" }
[PERF] APPLY_FILTERS_TAP { listingType: "Job", categoriesCount: 0, ... }
[PERF] FILTER_APPLY_COMPLETE
[PERF] NETWORK_CALL { count: 1, endpoint: "jobs", duration: "145.23" }
[PERF] NETWORK_CALL { count: 2, endpoint: "service_listings", duration: "123.45" }
[PERF] FILTER_RESULTS_RENDERED { listingType: "Job", categoriesCount: 0 }
[PERF] HOME_INTERACTIVE_READY { listingsCount: 15 }
```

**Calculate total time and network calls**

**Record**:
- Run 1: _____ ms (total), _____ network calls
- Run 2: _____ ms (total), _____ network calls
- Run 3: _____ ms (total), _____ network calls

---

## Test 3b: Clear All (Job)

**What to measure**: Time to clear filters and refresh

**Steps** (Run 3 times):

1. With Job filter applied (from Test 3a)
2. Clear console logs
3. **Tap "Clear All" or "Reset"** button
4. Wait for results to refresh
5. Record time difference

**Expected Console Output**:
```
[PERF] CLEAR_ALL_TAP { timestamp: "4567.89" }
[PERF] CLEAR_ALL_COMPLETE { timestamp: "4647.89" }
[PERF] NETWORK_CALL { ... }
```

**Record**: (Same format as Test 1)

---

## Test 4a: Apply Service Filter

**Steps**: Same as Test 3a, but select "Service" instead of "Job"

---

## Test 4b: Clear All (Service)

**Steps**: Same as Test 3b

---

## Test 5: First Home Screen Load

**What to measure**: Initial page load performance

**Steps** (Run 3 times):

1. **Close app completely** (force quit)
2. **Reopen app**
3. **Login** (if required)
4. **Navigate to Home screen**
5. Wait for content to load
6. Record time from `HOME_FIRST_RENDER` to `HOME_INTERACTIVE_READY`

**Expected Console Output**:
```
[PERF] HOME_FIRST_RENDER { timestamp: "5678.90" }
[PERF] NETWORK_CALL { count: 1, endpoint: "service_listings", duration: "234.56" }
[PERF] NETWORK_CALL { count: 2, endpoint: "jobs", duration: "198.32" }
[PERF] HOME_INTERACTIVE_READY { listingsCount: 20, timestamp: "6878.90" }
```

**Calculate**: `6878.90 - 5678.90 = 1200ms`

**Record**:
- Run 1: _____ ms, _____ network calls
- Run 2: _____ ms, _____ network calls
- Run 3: _____ ms, _____ network calls

---

## Analyzing Results

### Calculate Metrics

For each test, calculate:

1. **Average Time**:
   ```
   Average = (Run1 + Run2 + Run3) / 3
   ```

2. **P95 Time** (95th percentile):
   - Sort the 3 values
   - Take the 2nd highest value (for 3 runs)
   - For more runs: `P95_index = ceiling(0.95 × count)`

3. **Count Metrics**:
   - JS Blocks: Count `JS_BLOCK_DETECTED` logs
   - Frame Drops: Count `FRAME_DROP` logs
   - Network Calls: Count `NETWORK_CALL` logs
   - Renders: Count `RENDER` logs

### Interpreting Results

**Timing Benchmarks**:

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| UI Interactions | <200ms | 200-500ms | >500ms |
| Data Fetching | <500ms | 500-1000ms | >1000ms |
| Initial Load | <1000ms | 1000-2000ms | >2000ms |

**JS Blocks**:
- 0-1: Good
- 2-3: Watch carefully
- >3: Needs optimization

**Frame Drops**:
- 0-2: Good
- 3-5: Acceptable
- >5: Poor (animations will stutter)

**Network Calls**:
- <3 for filter operations: Good
- 3-5 for initial load: Acceptable
- >5 for any operation: High

---

## Tips for Accurate Testing

1. **Consistent Environment**:
   - Same device
   - Same network conditions
   - Same time of day (server load)

2. **Clean State**:
   - Clear cache between tests
   - Close background apps
   - Ensure stable internet

3. **Recording**:
   - Screenshot console logs
   - Copy/paste full log output
   - Note any anomalies

4. **Multiple Runs**:
   - If results vary >10%, run additional tests
   - Discard outliers (explain why)
   - Note environmental factors

---

## Common Issues

**Issue**: No `[PERF]` logs appearing

**Solution**:
- Verify `__DEV__` is true
- Check you're in development mode
- Refresh the app

---

**Issue**: Timestamps seem wrong

**Solution**:
- Use `performance.now()` values, not timestamps
- Calculate deltas manually if needed
- Verify logs are in chronological order

---

**Issue**: Too many logs to track

**Solution**:
- Clear console before each test
- Filter console for `[PERF]` only
- Copy all logs and analyze offline

---

## Generating Final Report

Once all tests are complete:

1. **Fill out the template**: `PERFORMANCE_TEST_RESULTS_TEMPLATE.md`
2. **Calculate all metrics**
3. **Identify top 3 bottlenecks**
4. **Add observations and notes**
5. **Archive with screenshots**

---

## Example Session

Here's what a complete test session looks like:

```bash
# Test 1: Open Filters - Run 1
[PERF] FILTER_OPEN_TAP { timestamp: "1234.56" }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "1484.56" }
# Delta: 250ms ✓

# Test 1: Open Filters - Run 2
[PERF] FILTER_OPEN_TAP { timestamp: "2345.67" }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "2601.34" }
# Delta: 255.67ms ✓

# Test 1: Open Filters - Run 3
[PERF] FILTER_OPEN_TAP { timestamp: "3456.78" }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "3705.99" }
# Delta: 249.21ms ✓

# Calculate:
# Average: (250 + 255.67 + 249.21) / 3 = 251.63ms
# P95: 255.67ms (2nd highest of 3)
```

---

## Next Steps

After completing manual tests:

1. Review results against benchmarks
2. Document findings in template
3. Identify optimization opportunities
4. Create separate tasks for any optimizations
5. Get approval before implementing changes

---

**Remember**: This is a measurement-only exercise. Do not modify the app based on findings without proper planning and approval.
