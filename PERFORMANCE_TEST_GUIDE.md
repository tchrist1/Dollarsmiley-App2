# Performance Test Guide - Home Screen & Filters

## Overview

This guide explains how to run the automated performance tests for the Home screen and Filters functionality.

**IMPORTANT**: These tests are **STRICTLY OBSERVATIONAL** and do not modify any application behavior. They only measure and report performance metrics.

## What Gets Tested

The automated test suite measures performance for the following user interactions:

1. **Open Filters** - Tap the filter button to open the filter modal
2. **Close Filters** - Close the filter modal
3. **Apply Job Filter** - Open filters, select "Job" type, and apply
4. **Clear All (Job)** - Clear all active filters
5. **Apply Service Filter** - Open filters, select "Service" type, and apply
6. **Clear All (Service)** - Clear all active filters
7. **First Home Screen Load** - Initial page load after login

Each test runs **3 iterations** to collect average and P95 (95th percentile) timings.

## Metrics Collected

For each action, the following metrics are captured:

- **Average time (ms)** - Mean execution time across 3 runs
- **P95 time (ms)** - 95th percentile execution time
- **JS Blocks** - Count of JavaScript tasks that blocked the main thread for >50ms
- **Frames Dropped** - Number of animation frames that were dropped
- **Network Calls** - Count and duration of network requests
- **Re-render Count** - Number of React component re-renders

## Running the Tests

### Method 1: Automated Test Script

```bash
bash scripts/run-performance-tests.sh
```

This script will:
1. Execute all performance tests automatically
2. Run each test 3 times
3. Generate a performance report
4. Save detailed results to `PERFORMANCE_TEST_REPORT.json`

### Method 2: Direct Jest Execution

```bash
npm test -- __tests__/performance/home-filters-performance.test.tsx --verbose
```

### Method 3: Manual Testing with Console Logs

If you prefer to test manually while viewing real-time performance logs:

1. **Enable DEV mode** (if not already enabled)
2. **Run the app** in development mode: `npm run dev`
3. **Open the browser console** or React Native debugger
4. **Perform the actions manually**:
   - Open filters
   - Close filters
   - Apply filters with different types
   - Clear filters
5. **Check console output** for `[PERF]` logs

All performance logs are prefixed with `[PERF]` for easy filtering.

## Understanding the Results

### Sample Output

```
| Action                    | Avg (ms) | P95 (ms) | JS Blocks | Frames Dropped | Network Calls | Notes |
|---------------------------|----------|----------|-----------|----------------|---------------|-------|
| Open Filters              |      250 |      290 |         1 |              2 |             1 |       |
| Close Filters             |       50 |       65 |         0 |              0 |             0 |       |
| Apply Job Filter          |      450 |      520 |         3 |              5 |             2 |       |
| Clear All (Job)           |       80 |      100 |         0 |              1 |             0 |       |
| Apply Service Filter      |      420 |      500 |         2 |              4 |             2 |       |
| Clear All (Service)       |       75 |       95 |         0 |              1 |             0 |       |
| First Home Screen Load    |     1200 |     1450 |         5 |             12 |             3 |       |
```

### Interpreting Metrics

#### Average Time (ms)
- **Good**: <200ms for UI interactions, <500ms for data fetching
- **Acceptable**: 200-500ms for UI, 500-1000ms for data fetching
- **Needs Optimization**: >500ms for UI, >1000ms for data fetching

#### P95 Time (ms)
- Represents the "worst-case" user experience
- Should not be more than 50% higher than average
- If P95 is much higher than average, indicates inconsistent performance

#### JS Blocks
- Count of tasks that blocked the main thread for >50ms
- **Good**: 0-1 blocks per interaction
- **Needs Attention**: 2-3 blocks
- **Critical**: >3 blocks (UI will feel laggy)

#### Frames Dropped
- Number of animation frames missed during the interaction
- **Good**: 0-2 frames
- **Acceptable**: 3-5 frames
- **Poor**: >5 frames (animations will stutter)

#### Network Calls
- Number of database/API requests triggered
- **Good**: 0-2 calls for filter operations
- **Acceptable**: 3-5 calls for initial load
- **High**: >5 calls (may indicate redundant fetching)

#### Re-render Count
- Number of React component re-renders
- **Good**: 1-3 renders
- **Acceptable**: 4-7 renders
- **High**: >7 renders (may indicate unnecessary re-renders)

## Top Bottlenecks Summary

The test report includes a "Top 3 Bottlenecks" section that identifies the slowest operations and provides context on why they're slow:

```
1. First Home Screen Load (P95: 1450ms) - High network activity (3 calls)
2. Apply Job Filter (P95: 520ms) - JS thread blocking (3 long tasks)
3. Apply Service Filter (P95: 500ms) - Excessive re-renders (8 renders)
```

## Validation Checks

The test suite automatically validates:

✓ No extra renders introduced (baseline established)
✓ No behavior changes detected
✓ No state persistence changes
✓ Results consistent across 3 runs (within 10% variance)

## Troubleshooting

### Tests Fail to Run

**Issue**: `Cannot find module '@/lib/performance-test-utils'`

**Solution**: Ensure the performance utilities file exists:
```bash
ls -la lib/performance-test-utils.ts
```

### No Logs Appearing

**Issue**: Performance logs not showing in console

**Solution**:
1. Verify `__DEV__` is true
2. Check that instrumentation is enabled
3. Ensure you're running in development mode

### Inconsistent Results

**Issue**: Results vary wildly between runs

**Possible Causes**:
- Background tasks interfering
- Network conditions changing
- Device thermal throttling
- Other apps consuming resources

**Solution**:
- Close other applications
- Run tests multiple times and average results
- Test on consistent hardware/network conditions

## Files Modified

The following files contain DEV-only instrumentation:

1. `lib/performance-test-utils.ts` - Performance measurement utilities
2. `components/FilterModal.tsx` - Filter modal instrumentation
3. `app/(tabs)/index.tsx` - Home screen instrumentation
4. `__tests__/performance/home-filters-performance.test.tsx` - Automated test suite

**NO BUSINESS LOGIC WAS CHANGED** - All instrumentation is behind `if (__DEV__)` guards and only logs metrics.

## Removing Instrumentation (If Needed)

All performance instrumentation is guarded by `__DEV__` checks and will not run in production builds.

To completely remove instrumentation:

1. Remove import of `performance-test-utils` from modified files
2. Remove all `if (__DEV__) { logPerfEvent(...) }` blocks
3. Remove `lib/performance-test-utils.ts`
4. Remove `__tests__/performance/` directory

## Next Steps

After reviewing the performance report:

1. **Identify bottlenecks** from the Top 3 list
2. **Analyze metrics** to understand root causes
3. **Document findings** in a separate optimization plan
4. **DO NOT optimize** as part of this measurement-only task

Remember: This is a **measurement-only** task. Optimization recommendations should be documented separately and approved before implementation.
