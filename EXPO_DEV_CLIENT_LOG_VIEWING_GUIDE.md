# Viewing Logs in Expo Dev Client

## Quick Start: Where Are My Logs?

When using Expo Dev Client, logs appear in **multiple places**. Here's where to look:

---

## Option 1: Metro Bundler Terminal (EASIEST)

**This is where your logs ARE showing up right now.**

1. Look at the terminal where you ran `npm run dev` or `npx expo start`
2. Logs from `console.log` appear directly in this terminal
3. Filter for our logs:

```bash
# On Mac/Linux, pipe to grep:
npm run dev | grep "MAP_PIN_TRACE"

# Or just scroll through the Metro terminal output
```

**Test it works:** When the map loads, you should see:
```
[MAP_PIN_TRACE] 🚀 NATIVE_MAP_MOUNTED {markerCount: X, ...}
```

If you see this startup log, the diagnostic system is working!

---

## Option 2: Expo Go / Dev Client App

**View logs on your device:**

1. Shake your device (iOS) or press Cmd+M (Android simulator)
2. Tap "Debug Remote JS"
3. This opens Chrome DevTools
4. Go to Console tab
5. Filter for: `MAP_PIN_TRACE`

**Note:** This may not work in all Expo Dev Client builds. Metro terminal is more reliable.

---

## Option 3: React Native Debugger (Advanced)

If you have React Native Debugger installed:

1. Open React Native Debugger app
2. Make sure it's listening on port 8081
3. In your app, enable Remote JS Debugging (shake → Debug Remote JS)
4. Logs appear in React Native Debugger console
5. Filter for: `MAP_PIN_TRACE`

---

## Option 4: Flipper (Most Detailed)

If you're using Flipper for debugging:

1. Open Flipper
2. Connect to your device/simulator
3. Select "Logs" plugin
4. Filter by: `MAP_PIN_TRACE`

---

## Troubleshooting: "I Still See Nothing"

### Check 1: Verify Logging is Enabled

Add this test log to your app's entry point to verify console.log works:

```javascript
// In app/_layout.tsx or index.tsx
console.log('🔥 APP STARTED - Console logging is working!');
```

If you DON'T see this in Metro terminal → Console is broken in your setup.

### Check 2: Are You Using the Map?

The logs only fire when:
1. ✅ Map component is rendered
2. ✅ You tap on a map pin

**To verify map is rendered:**
- You should see `[MAP_PIN_TRACE] 🚀 NATIVE_MAP_MOUNTED` or `WEB_MAP_MOUNTED` when map loads
- If you DON'T see this → Map component isn't rendering

**To verify pins exist:**
- Check the startup log: `markerCount: X`
- If X = 0 → No markers on map to tap

### Check 3: __DEV__ Variable

Our logs use `if (__DEV__)` guards. Verify this is true:

```javascript
// Add this test anywhere in your component:
console.log('__DEV__ value:', __DEV__);
```

If it says `false` → You're running a production build

### Check 4: Platform Detection

Check which platform you're actually on:

```javascript
import { Platform } from 'react-native';
console.log('Platform:', Platform.OS); // 'ios', 'android', or 'web'
```

- If `ios` or `android` → You should see NATIVE logs
- If `web` → You should see WEB logs

---

## Expected Log Sequence

Once you tap a pin, you should see this sequence in your Metro terminal:

```
[MAP_PIN_TRACE] PIN_UI_PRESS_NATIVE {counter: 1, markerId: "abc123", ...}
[MAP_PIN_TRACE] PIN_HANDLER_ENTER {counter: 1, markerId: "abc123", ...}
[MAP_PIN_TRACE] PIN_HANDLER_SET_SELECTED {markerId: "abc123"}
[MAP_PIN_TRACE] PIN_NAV_START {markerId: "abc123", ...}
[MAP_PIN_TRACE] PIN_NAV_CALLED {markerId: "abc123"}
```

If the pin tap **fails to open details**, the sequence will STOP at some point.

---

## Quick Test Script

Run this to verify everything:

1. **Start app with log filtering:**
   ```bash
   npm run dev 2>&1 | grep --line-buffered "MAP_PIN_TRACE\|APP STARTED"
   ```

2. **In app, navigate to map screen**

3. **Wait for startup log:**
   ```
   [MAP_PIN_TRACE] 🚀 NATIVE_MAP_MOUNTED
   ```

4. **Tap a pin**

5. **Check for sequence:**
   - PIN_UI_PRESS_NATIVE
   - PIN_HANDLER_ENTER
   - PIN_NAV_START
   - PIN_NAV_CALLED

---

## Still Nothing? Add Explicit Test

Add this to the marker TouchableOpacity to force a log:

```javascript
onPress={() => {
  console.log('🔴 MARKER TAPPED - If you see this, TouchableOpacity works');
  // existing handleMarkerPress call
}}
```

If you see 🔴 but no MAP_PIN_TRACE logs → `__DEV__` is false or our code has an error.

---

## Success Criteria

✅ You should see at minimum:
- `🚀 NATIVE_MAP_MOUNTED` or `🚀 WEB_MAP_MOUNTED` when map loads
- `PIN_UI_PRESS_*` when you tap a pin

✅ In Metro terminal (not in your device console)

✅ Even if the pin doesn't open details, PIN_UI_PRESS should log

If you see NONE of these → Check the troubleshooting steps above.

---

## Alternative: Remove __DEV__ Guard Temporarily

If nothing works, temporarily remove the __DEV__ guard:

```javascript
// Change this:
if (__DEV__) {
  console.log('[MAP_PIN_TRACE] ...');
}

// To this:
console.log('[MAP_PIN_TRACE] ...');
```

This will log in ALL builds (dev + production). Only for testing!
