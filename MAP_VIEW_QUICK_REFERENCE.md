# Map View UX Upgrade — Quick Reference

## New FAB Location
**Position**: Right side of map, bottom-right quadrant

## Map View Modes (6 Total)

| Mode | Label | Pins Shown |
|------|-------|-----------|
| `listings` | Listings | All listings (services + jobs) |
| `providers` | Providers | Provider pins only |
| `services` | Services | Service pins only |
| `jobs_all` | All Jobs | Both FJ + QJ pins |
| `jobs_fixed` | Fixed-priced Jobs | FJ pins only |
| `jobs_quoted` | Quoted Jobs | QJ pins only |

## Job Pin Labels

| Job Type | Old Label | New Label |
|----------|-----------|-----------|
| Fixed-price | J | **FJ** |
| Quoted | JQ | **QJ** |

## Key Components

```typescript
// New component
import MapViewFAB, { MapViewMode } from '@/components/MapViewFAB';

// Updated type
mapMode: MapViewMode

// Usage
<MapViewFAB
  mode={mapMode}
  onModeChange={handleMapModeChange}
/>
```

## FAB Menu Structure

```
[ 📍 ] Listings          ← default
[ 👤 ] Providers
[  S  ] Services
───────────────────
[  J  ] All Jobs
[ FJ  ] Fixed-priced Jobs
[ QJ  ] Quoted Jobs
```

## Changes Required in Other Files

If you need to reference map modes elsewhere:

```typescript
// Import the type
import { MapViewMode } from '@/components/MapViewFAB';

// Use in props or state
mode: MapViewMode
```

## Deprecated

- `MapModeBar` component (no longer used)
- Two-option map mode (`'listings' | 'providers'`)

## Testing

1. Open map view
2. Tap FAB on right side
3. Select each mode
4. Verify correct pins appear
5. Check FJ/QJ labels on job pins

## No Breaking Changes

- Existing navigation works
- Filters work unchanged
- Search works unchanged
- Map gestures work unchanged
- Camera position preserved on mode switch
