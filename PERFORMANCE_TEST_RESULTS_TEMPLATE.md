# Performance Test Results

**Date**: _________________
**Tester**: _________________
**Device/Platform**: _________________
**Network Conditions**: _________________

---

## Test Execution Summary

All tests were performed by manually interacting with the app while monitoring `[PERF]` console logs.

Each test was run **3 times** to collect average and P95 metrics.

---

## Results Table

| Action                    | Avg (ms) | P95 (ms) | JS Blocks | Frames Dropped | Network Calls | Notes |
|---------------------------|----------|----------|-----------|----------------|---------------|-------|
| Open Filters              |          |          |           |                |               |       |
| Close Filters             |          |          |           |                |               |       |
| Apply Job Filter          |          |          |           |                |               |       |
| Clear All (Job)           |          |          |           |                |               |       |
| Apply Service Filter      |          |          |           |                |               |       |
| Clear All (Service)       |          |          |           |                |               |       |
| First Home Screen Load    |          |          |           |                |               |       |

---

## Raw Timings

### Open Filters
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### Close Filters
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### Apply Job Filter
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### Clear All (Job)
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### Apply Service Filter
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### Clear All (Service)
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

### First Home Screen Load
- Run 1: _______ ms
- Run 2: _______ ms
- Run 3: _______ ms

---

## Top 3 Bottlenecks

1. **Action**: _________________
   **P95 Time**: _______ ms
   **Reason**: _________________

2. **Action**: _________________
   **P95 Time**: _______ ms
   **Reason**: _________________

3. **Action**: _________________
   **P95 Time**: _______ ms
   **Reason**: _________________

---

## Observations

### Performance Characteristics

**Fast Operations** (< 200ms):
- _________________
- _________________

**Acceptable Operations** (200-500ms):
- _________________
- _________________

**Slow Operations** (> 500ms):
- _________________
- _________________

### JS Thread Blocking

**Operations with >3 long tasks**:
- _________________

### Frame Drops

**Operations with >5 dropped frames**:
- _________________

### Network Activity

**Operations with >5 network calls**:
- _________________

### Re-render Issues

**Operations with >7 re-renders**:
- _________________

---

## Validation Checks

- [ ] No business logic changes detected during testing
- [ ] Filter results match expected behavior
- [ ] No state persistence issues observed
- [ ] Results were consistent across runs (< 10% variance)
- [ ] App behavior unchanged from baseline

---

## Notes & Comments

_________________
_________________
_________________
_________________

---

## Recommendations

Based on the test results, the following areas may benefit from optimization (to be implemented as separate tasks):

1. _________________
2. _________________
3. _________________

---

## Appendix: Console Log Samples

Attach screenshots or paste relevant `[PERF]` log entries here.

```
[PERF] FILTER_OPEN_TAP { timestamp: "___" }
[PERF] FILTER_OPEN_VISIBLE { timestamp: "___" }
[PERF] NETWORK_CALL { count: _, endpoint: "___", duration: "___" }
```

---

**Test completed by**: _________________
**Date**: _________________
**Signature**: _________________
