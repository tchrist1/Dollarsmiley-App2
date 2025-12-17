# Native Modules Setup Guide

This guide covers the native libraries installed for the Dollarsmiley app and how to configure them for development and production builds.

## Installed Libraries

### ✅ Successfully Installed

1. **@rnmapbox/maps** (v10.2.7)
   - Interactive maps powered by Mapbox
   - Location-based features

2. **expo-localization** (v17.0.7)
   - Locale and language detection
   - Currency and timezone information

3. **expo-build-properties** (v1.0.9)
   - Configure native build properties
   - iOS frameworks configuration

4. **expo-secure-store** (v15.0.7)
   - Encrypted storage for sensitive data
   - Secure credential management

5. **expo-application** (v7.0.7)
   - App metadata and version information
   - Installation time tracking

6. **expo-task-manager** (v14.0.8)
   - Background task execution
   - Location tracking tasks

7. **expo-background-fetch** (v14.0.8)
   - Periodic background data sync
   - Configurable fetch intervals

8. **expo-contacts** (v15.0.10)
   - Access device contacts
   - Contact selection and management

9. **expo-media-library** (v18.2.0)
   - Access photos and videos
   - Save media to device

10. **react-native-mmkv** (v3.1.0)
    - Fast, synchronous key-value storage
    - Alternative to AsyncStorage

11. **react-native-device-info** (v14.0.1)
    - Comprehensive device information
    - App and system metadata

12. **expo-updates** (v29.0.12)
    - Over-the-air (OTA) updates
    - Version management

13. **expo-network** (v8.0.7)
    - Network connectivity status
    - IP address information

### ❌ Not Available / Deprecated

1. **expo-permissions** - Deprecated in SDK 41+
   - **Replacement:** Use individual permission APIs from each module
   - Example: `Camera.requestCameraPermissionsAsync()`

2. **expo-error-recovery** - Removed from Expo SDK
   - **Replacement:** Use `react-error-boundary` or custom error handling
   - Implement ErrorBoundary components

3. **expo-analytics-amplitude** - Deprecated
   - **Replacement:** Use `@amplitude/analytics-react-native` directly
   - Or integrate your preferred analytics service

## Configuration Steps

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required variables:
```env
# Supabase (already configured)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Stripe (already configured)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# Mapbox (new - required for maps)
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=your_download_token

# MMKV Storage (new - optional)
EXPO_PUBLIC_MMKV_ENCRYPTION_KEY=your_encryption_key
```

### 2. Mapbox Setup

1. Create account at [mapbox.com](https://account.mapbox.com/auth/signup/)
2. Get your **Access Token** from [Account Dashboard](https://account.mapbox.com/access-tokens/)
3. Get your **Download Token** for iOS builds (secret token)
4. Add tokens to `.env` file
5. Update `app.json` with your download token:

```json
{
  "@rnmapbox/maps": {
    "RNMapboxMapsDownloadToken": "YOUR_DOWNLOAD_TOKEN"
  }
}
```

### 3. App Configuration

The `app.json` file has been updated with all necessary plugins:

```json
{
  "plugins": [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "@stripe/stripe-react-native",
    "expo-localization",
    ["expo-build-properties", {
      "ios": { "useFrameworks": "static" }
    }],
    "expo-secure-store",
    ["@rnmapbox/maps", {
      "RNMapboxMapsDownloadToken": "YOUR_TOKEN"
    }],
    "expo-location",
    "expo-camera",
    "expo-media-library",
    "expo-contacts",
    "expo-notifications",
    "expo-task-manager",
    "expo-background-fetch"
  ]
}
```

## Building the App

### Development Build (Recommended)

To use native modules, you need to create a development build:

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build for iOS (simulator)
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android

# Or build locally (requires Xcode/Android Studio)
npx expo run:ios
npx expo run:android
```

### Prebuild (Generate Native Folders)

If you need to access native code:

```bash
# Generate ios/ and android/ folders
npx expo prebuild

# Then run with:
npx expo run:ios
npx expo run:android
```

**Warning:** After prebuild, you're responsible for maintaining native code.

### Production Build

```bash
# iOS Production
eas build --profile production --platform ios

# Android Production
eas build --profile production --platform android
```

## Usage Examples

### Using MMKV Storage

```typescript
import { mmkvStorage, secureStorage } from '@/lib/native-storage';

// Fast synchronous storage
mmkvStorage.setString('user_preference', 'dark_mode');
const preference = mmkvStorage.getString('user_preference');

// Secure storage for sensitive data
await secureStorage.setItem('auth_token', token);
const token = await secureStorage.getItem('auth_token');
```

### Using Device Info

```typescript
import { getDeviceInfo, isOnline } from '@/lib/device-info';

// Get comprehensive device information
const deviceInfo = await getDeviceInfo();
console.log(deviceInfo.deviceName, deviceInfo.osVersion);

// Check network status
const online = await isOnline();
```

### Using Background Tasks

```typescript
import { registerBackgroundFetch } from '@/lib/background-tasks';

// Register background sync
await registerBackgroundFetch();
```

### Using Mapbox Maps

```typescript
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_CONFIG } from '@/config/native-modules';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_CONFIG.accessToken);

// In your component
<Mapbox.MapView style={{ flex: 1 }}>
  <Mapbox.Camera
    zoomLevel={14}
    centerCoordinate={[-122.4194, 37.7749]}
  />
</Mapbox.MapView>
```

## Permission Handling

Since `expo-permissions` is deprecated, use individual module permissions:

```typescript
// Camera permissions
import * as Camera from 'expo-camera';
const { status } = await Camera.requestCameraPermissionsAsync();

// Location permissions
import * as Location from 'expo-location';
const { status } = await Location.requestForegroundPermissionsAsync();

// Contacts permissions
import * as Contacts from 'expo-contacts';
const { status } = await Contacts.requestPermissionsAsync();

// Media Library permissions
import * as MediaLibrary from 'expo-media-library';
const { status } = await MediaLibrary.requestPermissionsAsync();
```

## Testing

Web platform won't support most native modules. Use iOS Simulator or Android Emulator for testing:

```bash
# Development mode
npm run dev

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR with dev client app on device
```

## Troubleshooting

### Issue: Native module not found

**Solution:** Build a development build, native modules don't work in Expo Go:
```bash
eas build --profile development --platform ios
```

### Issue: Mapbox not displaying

**Solution:**
1. Verify access token is correct
2. Check download token in app.json
3. Rebuild the app after adding tokens

### Issue: MMKV crashes on start

**Solution:** Make sure MMKV is initialized before use:
```typescript
import { storage } from '@/lib/native-storage';
```

### Issue: Background tasks not running

**Solution:**
1. Check permissions are granted
2. Verify task is registered: `await TaskManager.isTaskRegisteredAsync(taskName)`
3. Test on physical device (simulators have limitations)

## Next Steps

1. **Configure Mapbox**: Set up your Mapbox tokens
2. **Create Development Build**: `eas build --profile development`
3. **Test Native Features**: Install dev build on device/simulator
4. **Implement Features**: Use the utility files in `/lib` and `/config`
5. **Production Build**: Create production builds when ready

## Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Mapbox Maps SDK](https://github.com/rnmapbox/maps)
- [MMKV Documentation](https://github.com/mrousavy/react-native-mmkv)
- [Expo Task Manager](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Expo Background Fetch](https://docs.expo.dev/versions/latest/sdk/background-fetch/)
