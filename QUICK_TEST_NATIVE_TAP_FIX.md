# Quick Test: Native Marker Tap Fix

## What Was Fixed
Moved marker tap handler from nested TouchableOpacity to MarkerView's native onPress, bypassing Mapbox focus capture.

## Test Procedure

### 1. Run on Native Device/Simulator
```bash
# iOS
npm run ios

# Android
npm run android
```

### 2. Navigate to Map Screen
Find any screen that shows the interactive map with location pins.

### 3. Perform Tap Tests

**Test A: First Tap**
- Tap any marker
- ✅ Expected: Details open immediately

**Test B: Same Marker Repeated**
- Close details
- Tap the SAME marker again
- ✅ Expected: Details open immediately (no delay, no dropped tap)

**Test C: Different Markers**
- Close details
- Tap a DIFFERENT marker
- ✅ Expected: Details open immediately

**Test D: Rapid Sequential Taps**
- Tap marker A → Close
- Tap marker B → Close
- Tap marker C → Close
- Tap marker A → Close
- ✅ Expected: All taps register, all details open

**Test E: After Camera Movement**
- Zoom in/out using controls
- Pan the map
- Tap any marker
- ✅ Expected: Details open (tap not consumed by camera focus)

**Test F: After Map Interaction**
- Tap empty map area (not on marker)
- Then tap a marker
- ✅ Expected: Marker tap registers

## Success Criteria
✅ 100% tap success rate across all tests
✅ No "first tap ignored" behavior
✅ No "alternate tap" pattern (works, fails, works, fails)
✅ Immediate response to every tap

## If Tests Fail
If marker taps still fail after this fix:

1. **Check platform:** This fix is for Native (iOS/Android) only
   - If on Web → Different component, different fix needed

2. **Check Mapbox version:** Verify @rnmapbox/maps is v10.x
   ```bash
   npm list @rnmapbox/maps
   ```

3. **Check for other gesture handlers:** Look for:
   - PanResponder wrapping the map
   - GestureDetector from react-native-gesture-handler
   - Modal overlays that might block touches

4. **Check MarkerView.onPress support:** If onPress prop doesn't exist in your Mapbox version:
   - Try `onTouchEnd` or `onSelected` (version-dependent)
   - Check Mapbox SDK documentation for your version

## Rollback (If Needed)
To revert to previous behavior:

```tsx
<Mapbox.MarkerView
  key={marker.id}
  id={marker.id}
  coordinate={[marker.longitude, marker.latitude]}
  anchor={{ x: 0.5, y: 1 }}
  allowOverlap={true}
  isSelected={selectedMarker?.id === marker.id}
>
  <TouchableOpacity
    onPress={() => handleMarkerPress(marker)}
    activeOpacity={0.7}
    style={{ padding: spacing.sm }}
  >
    {renderMarkerContent(marker)}
  </TouchableOpacity>
</Mapbox.MarkerView>
```

But note: This will restore the unreliable tap behavior.

## Performance Check
The fix should also improve performance:
- ❌ Old: JS bridge → TouchableOpacity → PanResponder → Handler
- ✅ New: Native gesture → MarkerView.onPress → Handler (fewer layers)

## What Was NOT Changed
- ✅ Marker visuals (same appearance)
- ✅ Details screen behavior
- ✅ Navigation logic
- ✅ Map configuration
- ✅ Any other gestures (zoom, pan, etc.)

Only the marker tap registration was changed from JS-based to native-based.
