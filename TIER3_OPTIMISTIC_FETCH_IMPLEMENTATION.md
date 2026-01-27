# Tier-3 Performance Optimization: Optimistic Live Fetch with Deferred Commit

## Overview

This optimization decouples **when live fetch starts** from **when results commit visually**, enabling:
- ✅ Instant snapshot display (0ms)
- ✅ Immediate network activity start (50ms)
- ✅ Single visual commit (no flicker)
- ✅ Correct final feed (authoritative params)

## Core Concept

**Fetching may be optimistic. Committing must be authoritative.**

## Implementation Details

### 1. New Refs Added

```typescript
// Store optimistically fetched results (not yet committed)
const optimisticLiveResultRef = useRef<{
  listings: MarketplaceListing[];
  serviceCursor: Cursor | null;
  jobCursor: Cursor | null;
  hasMore: boolean;
} | null>(null);

// Store params signature used for optimistic fetch
const optimisticLiveSignatureRef = useRef<string | null>(null);

// Ensure only one visual commit per mount cycle
const hasCommittedRef = useRef(false);
```

### 2. Params Signature Generation

```typescript
const generateParamsSignature = useCallback(() => {
  return JSON.stringify({
    query: searchQuery.trim(),
    cats: filters.categories.sort(),
    loc: filters.location.trim(),
    dist: filters.distance,
    lat: filters.userLatitude,
    lng: filters.userLongitude,
    // ... all filter params
  });
}, [searchQuery, filters]);
```

### 3. Modified Fetch Function

```typescript
fetchListingsCursor(reset: boolean, optimistic: boolean)
```

**Optimistic Mode (`optimistic=true`):**
- Fetches data from database
- Stores results in `optimisticLiveResultRef`
- Does NOT commit to visual state
- Does NOT show loading spinner
- Keeps snapshot visible

**Authoritative Mode (`optimistic=false`):**
- Fetches data from database
- Commits results to visual state immediately
- Updates all state variables
- Marks `hasCommittedRef = true`

### 4. Flow Timeline

#### Scenario A: Coords Not Ready on Mount

```
T+0ms      Mount → Snapshot loads immediately
           visualCommitReady = true (snapshot visible)

T+50ms     Debounced effect triggers
           liveFetchReady = false (coords pending)
           shouldFetchOptimistically = true
           → Start optimistic fetch (network begins)

T+1200ms   Optimistic fetch completes
           → Store in optimisticLiveResultRef
           → Log: "Optimistic result held (waiting for final params)"
           → Snapshot still visible (no visual change)

T+1500ms   Coords arrive
           liveFetchReady = true
           → Compare signatures

           CASE A - Signatures MATCH:
           → Commit optimistic result immediately
           → Log: "Optimistic result committed (params match)"
           → Single visual commit (snapshot → live)
           → Total time to final state: 1500ms

           CASE B - Signatures DIFFER:
           → Discard optimistic result
           → Trigger corrective fetch
           → Log: "Corrective fetch triggered (params changed)"

T+2500ms   (Case B only) Corrective fetch completes
           → Commit corrective result
           → Single visual commit (snapshot → live)
```

#### Scenario B: Coords Ready on Mount

```
T+0ms      Mount → Snapshot loads immediately
           visualCommitReady = true (snapshot visible)

T+50ms     Debounced effect triggers
           liveFetchReady = true (coords ready)
           shouldFetchOptimistically = false
           → Start authoritative fetch
           → Log: "Authoritative live fetch started"

T+1200ms   Authoritative fetch completes
           → Commit results immediately
           → Single visual commit (snapshot → live)
           → Total time to final state: 1200ms
```

### 5. Key Safeguards

#### Single Commit Guarantee
```typescript
// At start of fetchListingsCursor
if (hasCommittedRef.current && reset && !optimistic) {
  console.log('Skipping fetch - already committed');
  return;
}

// When committing authoritative results
hasCommittedRef.current = true;
```

#### No Loading Spinner for Optimistic Fetches
```typescript
if (reset && isInitialLoad && enableSnapshot) {
  const snapshotLoaded = await loadFromSnapshot();
  if (snapshotLoaded) {
    // Snapshot visible - don't show spinner
  } else if (!optimistic) {
    setLoading(true); // Only for authoritative
  }
}
```

#### Cursor Tracking
```typescript
// Capture cursors during fetch
let nextServiceCursor: Cursor | null = null;
let nextJobCursor: Cursor | null = null;

// In optimistic mode: store in ref, don't update state
if (optimistic) {
  optimisticLiveResultRef.current = {
    listings: allResults,
    serviceCursor: nextServiceCursor,
    jobCursor: nextJobCursor,
    hasMore: allResults.length >= pageSize,
  };
}
```

## Performance Gains

### Before Tier-3
```
Snapshot:    T+0ms     → visible
Live fetch:  T+1500ms  → starts (blocked on coords)
Final data:  T+2700ms  → committed

Total perceived load: 2700ms
```

### After Tier-3
```
Snapshot:    T+0ms     → visible
Live fetch:  T+50ms    → starts (optimistic)
Coords:      T+1500ms  → arrive
Final data:  T+1500ms  → committed (if match) OR T+2500ms (if corrective)

Total perceived load: 1500ms (case A) or 2500ms (case B)
Best case improvement: 45% faster
```

## Validation Logs

### Optimal Path (Params Match)
```
[useListingsCursor] Snapshot loaded: 20 listings
[useListingsCursor] Optimistic live fetch started (coords pending)
[useListingsCursor] Optimistic result held (waiting for final params): 3 listings
[useListingsCursor] Optimistic result committed (params match): 3 listings
```

### Corrective Path (Params Changed)
```
[useListingsCursor] Snapshot loaded: 20 listings
[useListingsCursor] Optimistic live fetch started (coords pending)
[useListingsCursor] Optimistic result held (waiting for final params): 8 listings
[useListingsCursor] Corrective fetch triggered (params changed)
[useListingsCursor] Visual commit ready - live data finalized: 3 listings
```

### Fast Path (Coords Ready)
```
[useListingsCursor] Snapshot loaded: 20 listings
[useListingsCursor] Authoritative live fetch started
[useListingsCursor] Visual commit ready - live data finalized: 3 listings
```

## Preserved Guarantees

✅ Single visual commit (no flicker)
✅ Correct final feed (authoritative params always win)
✅ No duplicate fetches (signature matching prevents unnecessary re-fetch)
✅ Snapshot stays visible during optimistic fetch
✅ No loading spinners during background work
✅ Backward compatible (fast coords path unchanged)

## Trade-offs

**Added Complexity:**
- 3 new refs to track optimistic state
- Signature generation and comparison logic
- Dual-mode fetch function

**Benefits:**
- 45% faster perceived load in common case
- Better UX (instant content, no blocking)
- Network utilization starts immediately
- Still maintains all correctness guarantees
