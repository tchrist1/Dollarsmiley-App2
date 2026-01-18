# Home Screen Performance Test Guide

## Overview
This guide provides instructions for measuring and reviewing response times for critical Home screen and Filters user interactions.

## Setup
The performance instrumentation is already integrated into the Home screen (`app/(tabs)/index.tsx`) and will automatically log performance metrics in development mode.

## Test Scenarios

### 1. First-Time Home Screen Load (Post Login)
**What to measure:**
- Time from navigation → first meaningful content
- Time To Interactive (TTI)
- Network vs JS execution split

**How to test:**
1. Clear app data/cache or logout
2. Login to the app
3. Navigate to Home screen
4. Check console logs for:
   - `[PERF] HOME_COMPONENT_MOUNTED`
   - `[PERF] HOME_FIRST_CONTENT_VISIBLE` or `HOME_FIRST_CONTENT_VISIBLE_CACHED`
   - `[PERF] HOME_FIRST_LOAD_END`

**Success Targets:**
- First content ≤ 1.5s
- Fully interactive ≤ 2.5s

---

### 2. Open Filters Modal
**What to measure:**
- Time from user tap → Filters modal fully visible
- Frame drops during modal animation

**How to test:**
1. On Home screen, tap the "Filters" button
2. Check console logs for:
   - `[PERF] FILTER_MODAL_OPEN_START`
   - `[PERF] FILTER_MODAL_OPEN_END`

**Success Targets:**
- Modal visible ≤ 200ms
- No frame drops > 16ms

---

### 3. Close Filters Modal
**What to measure:**
- Time from tap → modal fully dismissed
- UI responsiveness during dismissal

**How to test:**
1. Open Filters modal
2. Tap outside modal or close button
3. Check console logs for:
   - `[PERF] FILTER_MODAL_CLOSED`

**Success Targets:**
- Modal dismissed ≤ 180ms
- No delayed Home screen re-render

---

### 4. Apply Job Filter
**What to measure:**
- Time from Apply tap → filtered results visible
- List/Grid re-render cost

**How to test:**
1. Open Filters modal
2. Select "Job" as listing type
3. Tap "Apply Filters"
4. Check console logs for:
   - `[PERF] APPLY_FILTERS_START` (with metadata: listingType: 'Job')
   - `[PERF] APPLY_FILTERS_END` (with result counts)

**Success Targets:**
- Results visible ≤ 300ms
- No full Home screen remount

---

### 5. Apply Service Filter
**What to measure:**
- Same metrics as Job filter path
- Confirm identical performance characteristics

**How to test:**
1. Open Filters modal
2. Select "Service" as listing type
3. Tap "Apply Filters"
4. Check console logs for:
   - `[PERF] APPLY_FILTERS_START` (with metadata: listingType: 'Service')
   - `[PERF] APPLY_FILTERS_END` (with result counts)

**Success Targets:**
- Results visible ≤ 300ms
- Same performance as Job filter path

---

### 6. Clear All Filters
**What to measure:**
- Time from tap → Home restored to default state
- Carousel reappearance cost

**How to test:**
1. Apply any filters (so "Clear all" button is visible)
2. Tap "Clear all"
3. Check console logs for:
   - `[PERF] CLEAR_ALL_FILTERS_START`
   - `[PERF] CLEAR_ALL_FILTERS_END` (with carouselsVisible: true)

**Success Targets:**
- UI restored ≤ 250ms
- No flicker or double render

---

## Performance Log Format

All performance logs follow this format:
```
[PERF] ACTION_NAME_START { metadata }
[PERF] ACTION_NAME_END (+XXX.XXms) { metadata }
```

Example:
```
[PERF] APPLY_FILTERS_START { listingType: 'Job', categories: 2, hasLocation: true }
[PERF] APPLY_FILTERS_END (+234.56ms) { resultCount: 15, jobs: 15, services: 0, customServices: 0 }
```

---

## Generating Reports

To print a consolidated performance report at any time, add this to the console in React Native Debugger:

```javascript
import { perfMonitor } from '@/lib/performance-monitor';
perfMonitor.printReport();
```

Or trigger from the app by adding a debug button:

```typescript
<Button
  title="Print Performance Report"
  onPress={() => perfMonitor.printReport()}
/>
```

---

## Tools for Additional Measurement

### React Native Performance Monitor
1. In development mode, shake device or press Cmd+D (iOS) / Cmd+M (Android)
2. Enable "Show Perf Monitor"
3. Monitor JS FPS and UI FPS during interactions

### Flipper
1. Open Flipper
2. Navigate to Performance plugin
3. Record a session while performing test scenarios
4. Analyze JS execution time and frame drops

### Network Inspector
1. Open Flipper or React Native Debugger
2. Navigate to Network tab
3. Confirm no refetch on filter apply (only on initial load)

---

## Test Execution Workflow

### Run 1: Cold Start
1. Clear app data/cache
2. Login
3. Perform all test scenarios in order
4. Collect metrics

### Run 2: Warm Navigation
1. Keep app in memory
2. Navigate away from Home and back
3. Perform test scenarios
4. Collect metrics

### Run 3: Repeated Cycles
1. Apply filters → Clear → Apply → Clear (3 times)
2. Check for memory growth or performance degradation
3. Collect metrics

---

## Expected Output Format

After running all tests, compile results in this format:

| Action                | Avg Time (ms) | P95 (ms) | JS Blocked | Notes                    |
|----------------------|---------------|----------|------------|--------------------------|
| First Home Load      |               |          |            | Cold start / Cached      |
| Open Filters         |               |          |            |                          |
| Close Filters        |               |          |            |                          |
| Apply Job Filter     |               |          |            |                          |
| Apply Service Filter |               |          |            |                          |
| Clear All            |               |          |            |                          |

---

## Bottleneck Identification

Common bottlenecks to watch for:

1. **Long JS tasks (>50ms):** Check React component re-renders
2. **Network latency:** Verify caching is working
3. **Frame drops:** Check animation performance
4. **Memory growth:** Profile for memory leaks in repeated cycles
5. **Layout thrashing:** Check for synchronous layout calculations

---

## Notes

- All instrumentation is DEV-ONLY and will not run in production
- Logs are only visible when `__DEV__` is true
- Performance metrics are isolated per user session
- Clear metrics with `perfMonitor.clear()` before each test run

---

## Cleanup After Testing

No cleanup is required. All performance instrumentation is dev-only and automatically disabled in production builds.
