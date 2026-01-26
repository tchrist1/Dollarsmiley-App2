# Home Screen UI Consistency Fix

## Problem: Image Preload Resetting Multiple Times

### Observed Behavior (From Logs):
```
LOG  [ImagePreload] Starting preload for 10 images
LOG  [ImagePreload] All images ready: 10/10 loaded successfully
LOG  [ImagePreload] Already preloaded these images, skipping  ✅
LOG  [useListingsCursor] Snapshot loaded: 20 listings (AGAIN!)
LOG  [ImagePreload] Starting preload for 5 images  ❌ RESET!
LOG  [ImagePreload] All images ready: 5/5 loaded successfully
LOG  [ImagePreload] Starting preload for 3 images  ❌ RESET AGAIN!
LOG  [ImagePreload] All images ready: 3/3 loaded successfully
```

### Root Cause:
Duplicate snapshot loads and multi-stage data arrivals caused the listings array to change repeatedly. Each change created a new URL hash, triggering fresh preloads even though the user hadn't changed filters.

## Solution: First-Preload Lock

### Strategy:
**Lock `imagesReady=true` after the first successful preload**, preventing resets during system-driven data changes. Only unlock when user explicitly changes filters/search.

### Expected Logs (Fixed):
```
LOG  [ImagePreload] Starting preload for 10 images
LOG  [ImagePreload] All images ready: 10/10 loaded successfully 🔒
LOG  [ImagePreload] First preload completed, staying ready ✅
LOG  [ImagePreload] First preload completed, staying ready ✅
```

**Result**: Single preload, no resets, stable UI
