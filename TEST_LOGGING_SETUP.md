# Test Logging Setup - Quick Verification

## Step 1: Verify Console Works

Add this to `app/index.tsx` (or your entry point):

```javascript
useEffect(() => {
  console.log('🔥 APP STARTED');
  console.log('🔧 __DEV__:', __DEV__);
  console.log('📱 Platform:', Platform.OS);
}, []);
```

**Expected in Metro terminal:**
```
🔥 APP STARTED
🔧 __DEV__: true
📱 Platform: ios (or android)
```

---

## Step 2: Verify Map Renders

Navigate to the screen with the map.

**Expected in Metro terminal:**
```
[MAP_PIN_TRACE] 🚀 NATIVE_MAP_MOUNTED {markerCount: 5, hasOnMarkerPress: true, ...}
```

OR (if on web):
```
[MAP_PIN_TRACE] 🚀 WEB_MAP_MOUNTED {markerCount: 5, hasOnMarkerPress: true, ...}
```

**If you DON'T see this:**
- Map component isn't rendering
- Or you're not on the map screen
- Or __DEV__ is false

---

## Step 3: Verify Pins Exist

Check the `markerCount` in the startup log:

- `markerCount: 0` → No markers on map (nothing to tap!)
- `markerCount: 5+` → Markers present, you can test tapping

**If markerCount is 0:**
- Check your data source
- Markers might be loading async
- Try filtering map data or zoom level

---

## Step 4: Tap a Pin

Tap any pin on the map.

**Expected in Metro terminal (if working):**
```
[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE {counter: 1, markerId: "...", ...}
[MAP_PIN_TRACE] PIN_HANDLER_ENTER {counter: 1, ...}
[MAP_PIN_TRACE] PIN_HANDLER_SET_SELECTED {...}
[MAP_PIN_TRACE] PIN_NAV_START {...}
[MAP_PIN_TRACE] PIN_NAV_CALLED {...}
```

**Expected in Metro terminal (if tap FAILS):**
```
[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE {counter: 1, ...}
(stops here - no further logs)
```

OR

```
(no logs at all - UI press not detected)
```

---

## Step 5: Interpret Results

### Scenario A: No Logs at All

**Possible causes:**
1. Metro terminal not showing console.log output
2. __DEV__ is false
3. Map component not rendering
4. You're looking at the wrong console

**Fix:** Check Metro terminal (where you ran `npm run dev`)

---

### Scenario B: Startup Log Shows, But No Pin Press Logs

**Possible causes:**
1. No markers on map (markerCount: 0)
2. Tapping in wrong area
3. TouchableOpacity hitbox issue
4. Markers rendered but not interactive

**Test:** Add explicit log to TouchableOpacity:
```javascript
onPress={() => {
  console.log('🔴 DIRECT TAP');
  // existing code
}}
```

If you see 🔴 → TouchableOpacity works, issue is in our logging
If NO 🔴 → TouchableOpacity not responding

---

### Scenario C: PIN_UI_PRESS Logs, But Stops There

**This is THE KEY FINDING!**

If you see:
```
[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE {counter: 1}
(nothing else)
```

→ **Handler callback not connected** (Failure Type B)

The press is detected but handler never called. This means `onPress` prop is not properly passed or connected.

---

### Scenario D: All Logs Fire, But Details Don't Open

If you see:
```
[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE {counter: 1}
[MAP_PIN_TRACE] PIN_HANDLER_ENTER {counter: 1}
[MAP_PIN_TRACE] PIN_NAV_START
[MAP_PIN_TRACE] PIN_NAV_CALLED
```

But details screen doesn't open → **Parent navigation blocked** (Failure Type C)

The marker component did its job. Problem is in the parent's `onMarkerPress` callback.

---

## Step 6: Check Where Logs Appear

Logs from Expo Dev Client can appear in:

### Primary: Metro Terminal
```bash
# The terminal where you ran:
npm run dev
# or
npx expo start
```

Look for `[MAP_PIN_TRACE]` in this terminal.

### Secondary: Chrome DevTools
1. In app, shake device
2. Tap "Debug Remote JS"
3. Chrome opens → Console tab
4. Filter for: `MAP_PIN_TRACE`

### Not Here: Device Console
Logs do NOT appear in:
- iOS Console.app
- Android Logcat (unless you use `console.warn` or `console.error`)
- Xcode console

---

## Emergency: Force Logs to Show

If Metro terminal shows nothing, try:

### Option 1: Use console.warn (shows everywhere)
```javascript
console.warn('[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE', { ... });
```

### Option 2: Remove __DEV__ guard
```javascript
// Remove the if (__DEV__) wrapper temporarily
console.log('[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE', { ... });
```

### Option 3: Use Alert (visual confirmation)
```javascript
import { Alert } from 'react-native';

onPress={() => {
  Alert.alert('Pin Tapped!');
  // rest of code
}}
```

---

## Success Checklist

✅ Metro terminal is open and showing logs
✅ App is running in dev mode (__DEV__ = true)
✅ Map component renders (see startup log)
✅ Markers exist on map (markerCount > 0)
✅ Tapping pin produces AT LEAST one log

Once you see ANY log from a pin tap, you can diagnose the failure point!

---

## Report Template

If you're still stuck, provide:

1. **Metro terminal output** (copy/paste)
2. **Platform** (iOS / Android / Web)
3. **What you see when you tap:** (nothing? visual feedback? animation?)
4. **Startup log values:**
   - markerCount: ?
   - hasOnMarkerPress: ?
5. **Do you see 🚀 NATIVE_MAP_MOUNTED?** (YES/NO)
6. **Do you see PIN_UI_PRESS_*?** (YES/NO)
