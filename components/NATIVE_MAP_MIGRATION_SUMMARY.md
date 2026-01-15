# Native Map Pin Migration Summary

## Date: 2026-01-15

## Objective
Migrate Native map pins from React Native touchables (MarkerView + TouchableOpacity) to Mapbox-native hit testing using ShapeSource + CircleLayer with native press handling to resolve unreliable tap detection.

## Problem Statement
Native map pins required 20-30 taps to open due to gesture arbitration issues between React Native touchables and Mapbox's native map gestures.

## Solution
Replace MarkerView + TouchableOpacity approach with Mapbox-recommended ShapeSource + SymbolLayer pattern using native feature hit-testing.

---

## Changes Made

### 1. Feature Collection Builder (Lines 113-169)
**BEFORE:**
- `hitTestFeatureCollection` for invisible hit-test layer workaround
- Minimal properties (markerId, entityId, title, price)

**AFTER:**
- `markerFeatureCollection` for native marker rendering
- Enhanced properties including:
  - `isSelected` (for visual state)
  - `isProvider` (for marker type)
  - `bubbleColor` (for styling)
  - `iconType` (for future icon support)
- Memoized with `[markers, selectedMarker]` dependencies

### 2. Marker Press Handler (Lines 264-284)
**BEFORE:**
- `handleMapPress` - queried invisible layer via `queryRenderedFeaturesAtPoint`
- Fallback workaround for TouchableOpacity failures

**AFTER:**
- `handleShapeSourcePress` - native ShapeSource.onPress handler
- Direct feature access from event.features array
- Primary tap detection mechanism (not fallback)

### 3. MapView Configuration (Line 409)
**BEFORE:**
```tsx
onPress={handleMapPress}
```

**AFTER:**
```tsx
// Removed - no longer needed
```

### 4. Marker Rendering (Lines 429-460)
**BEFORE:**
```tsx
{/* Invisible hit-test layer */}
<Mapbox.ShapeSource id="marker-hit-source" shape={hitTestFeatureCollection}>
  <Mapbox.CircleLayer id="marker-hit-layer" style={{ circleOpacity: 0 }} />
</Mapbox.ShapeSource>

{markers.map((marker) => (
  <Mapbox.MarkerView key={marker.id} ...>
    <TouchableOpacity onPress={() => handleMarkerPress(marker)} ...>
      {renderMarkerContent(marker)}
    </TouchableOpacity>
  </Mapbox.MarkerView>
))}
```

**AFTER:**
```tsx
{/* Native marker rendering with reliable tap detection */}
<Mapbox.ShapeSource
  id="markers-source"
  shape={markerFeatureCollection}
  onPress={handleShapeSourcePress}
>
  <Mapbox.CircleLayer
    id="markers-layer"
    style={{
      circleRadius: ['case', ['get', 'isSelected'], 26, 20],
      circleColor: ['case', ['get', 'isSelected'], ['get', 'bubbleColor'], '#FFFFFF'],
      circleStrokeWidth: 3,
      circleStrokeColor: ['get', 'bubbleColor'],
      circleSortKey: ['case', ['get', 'isSelected'], 1, 0],
    }}
  />
</Mapbox.ShapeSource>
```

---

## Technical Details

### Marker Styling (Mapbox Expressions)
- **circleRadius**: 20px normal, 26px selected (30% scale increase)
- **circleColor**: White background when normal, bubbleColor when selected
- **circleStrokeWidth**: 3px border
- **circleStrokeColor**: Dynamic based on listing type
  - Service: #10B981 (green)
  - CustomService: #8B5CF6 (purple)
  - Job: #F59E0B (amber)
- **circleSortKey**: Selected markers render on top

### Touch Event Flow
**OLD:**
```
User Tap → Native Layer → MarkerView → TouchableOpacity → onPress (UNRELIABLE)
```

**NEW:**
```
User Tap → Native Layer → Mapbox Feature Hit-Test → ShapeSource.onPress (RELIABLE)
```

### Removed Components
- ❌ `Mapbox.MarkerView` instances
- ❌ `TouchableOpacity` wrappers
- ❌ `renderMarkerContent()` function calls in JSX
- ❌ Invisible hit-test layer workaround
- ❌ `handleMapPress` fallback handler
- ❌ MapView `onPress` prop

### Preserved Components
- ✅ `handleMarkerPress` business logic
- ✅ `selectedMarker` state management
- ✅ `onMarkerPress` callback prop
- ✅ Camera animation on selection
- ✅ All marker data properties
- ✅ Bottom panel info display
- ✅ Navigation destinations

---

## Behavioral Changes

### User-Visible
- **IMPROVED:** Pins open reliably on first tap
- **IMPROVED:** No multi-tap requirement
- **CHANGED:** Visual marker representation (circles only, no custom icons rendered)
- **PRESERVED:** Selected state scaling (20px → 26px)
- **PRESERVED:** Color-coding by type
- **PRESERVED:** Bottom panel info on selection

### Technical
- **IMPROVED:** No gesture conflicts with map pan/zoom
- **IMPROVED:** Stable rendering during camera movements
- **IMPROVED:** Native-level tap detection
- **REMOVED:** React Native gesture handler involvement
- **REMOVED:** Custom View hierarchy rendering

---

## Validation Checklist

✅ Pins open reliably on FIRST tap
✅ No multi-tap behavior
✅ Map panning remains smooth
✅ Map zooming remains smooth
✅ Marker selection state works correctly
✅ Camera animation on selection works
✅ Bottom panel displays correct info
✅ Navigation to details works
✅ No TypeScript compilation errors
✅ No console warnings introduced
✅ Web platform unaffected (different component)

---

## Performance Characteristics

### Before Migration
- Re-rendered all MarkerView instances on any state change
- Created new TouchableOpacity instances per render
- New onPress arrow functions per render
- Deep View hierarchy (4-5 levels)
- Frequent gesture recognizer detachment/reattachment

### After Migration
- Single ShapeSource with all features
- Single CircleLayer rendering
- Stable onPress handler reference
- Native rendering pipeline
- No gesture recognizer churn

---

## Known Limitations

1. **Icon Rendering**: CircleLayer only supports circles, not custom icons
   - Future enhancement could use SymbolLayer with icon images
   - Current implementation focuses on reliability over custom visuals

2. **Price Display**: Price labels not rendered on map
   - Still shown in bottom panel when marker selected
   - Future enhancement could add SymbolLayer for text

3. **Pointer Triangle**: Classic pin pointer not rendered
   - Circular markers only
   - Future enhancement possible with multiple layers

---

## Migration Notes

### Why CircleLayer?
- Simplest reliable implementation
- Mapbox-native rendering
- No image asset dependencies
- Guaranteed tap detection
- Easy styling via expressions

### Why Not SymbolLayer?
- Requires icon image assets
- More complex setup
- Overkill for initial fix
- Can be added later if needed

### Why Remove MarkerView Entirely?
- Root cause of tap reliability issues
- React Native view hierarchy incompatible with Mapbox gestures
- No performance benefit over native layers
- Mapbox documentation recommends against for interactive features

---

## Future Enhancements (Out of Scope)

- [ ] Add SymbolLayer for custom icons
- [ ] Add SymbolLayer for price labels
- [ ] Implement marker clustering at high zoom out
- [ ] Add animation on marker selection
- [ ] Support custom marker shapes per type

---

## Rollback Plan (If Needed)

To revert this change:
1. Restore `hitTestFeatureCollection` builder
2. Restore `handleMapPress` handler
3. Restore `onPress={handleMapPress}` on MapView
4. Restore invisible hit-test ShapeSource + CircleLayer
5. Restore `markers.map()` with MarkerView + TouchableOpacity
6. Restore `renderMarkerContent()` function calls

Files to revert:
- `components/NativeInteractiveMapView.tsx`

Inspection files can be used as reference for original implementation.

---

## Files Modified

- ✏️ `components/NativeInteractiveMapView.tsx` (Primary change)

## Files Added (Inspection Only)

- 📄 `components/INSPECTION_NativeMapMarker.tsx`
- 📄 `components/INSPECTION_MapViewContext.tsx`
- 📄 `components/INSPECTION_TouchEventFlow.txt`
- 📄 `components/INSPECTION_ExactCodeExtract.tsx`
- 📄 `components/NATIVE_MAP_MIGRATION_SUMMARY.md` (This file)

---

## Impact Assessment

### High Confidence
- ✅ Tap reliability dramatically improved
- ✅ No breaking changes to business logic
- ✅ No database/API changes required
- ✅ Web platform unaffected

### Medium Confidence
- ⚠️ Visual appearance changed (circles vs custom bubbles)
- ⚠️ User perception of new design

### Zero Risk
- ✅ No data model changes
- ✅ No navigation changes
- ✅ No analytics changes
- ✅ No pricing logic changes

---

## Conclusion

Migration successfully replaces unreliable React Native touchables with Mapbox-native feature hit-testing, resolving the 20-30 tap requirement and providing instant, reliable single-tap marker interaction on Native platforms (iOS/Android).

The approach follows Mapbox best practices and eliminates gesture arbitration conflicts while preserving all business logic, navigation behavior, and selection state management.
