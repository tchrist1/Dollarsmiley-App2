# Quick Start - Native Modules

## 🚀 Ready to Build

All native modules are installed and configured. Here's what to do next:

## Step 1: Configure Mapbox (Required for Maps)

1. Sign up at https://account.mapbox.com/auth/signup/
2. Get your tokens:
   - **Access Token**: https://account.mapbox.com/access-tokens/
   - **Download Token**: Create a secret token for iOS builds
3. Update `.env`:
   ```bash
   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
   RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.eyJ1...
   ```
4. Update `app.json` line 51:
   ```json
   "RNMapboxMapsDownloadToken": "sk.eyJ1..."
   ```

## Step 2: Create Development Build

Native modules don't work in Expo Go. You need a development build:

### Option A: Cloud Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android
```

### Option B: Local Build
```bash
# Generate native folders
npx expo prebuild

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Step 3: Install & Test

1. Install the development build on your device
2. Start the dev server: `npm run dev`
3. Scan QR code or press `i`/`a` for simulators

## 📦 What's Installed

✅ **Maps**: @rnmapbox/maps
✅ **Storage**: react-native-mmkv, expo-secure-store
✅ **Device Info**: react-native-device-info, expo-application
✅ **Background**: expo-task-manager, expo-background-fetch
✅ **Media**: expo-contacts, expo-media-library
✅ **Network**: expo-network, expo-localization
✅ **Updates**: expo-updates
✅ **Build**: expo-build-properties

## 🔧 Usage Examples

### Fast Storage (MMKV)
```typescript
import { mmkvStorage } from '@/lib/native-storage';

mmkvStorage.setString('key', 'value');
const value = mmkvStorage.getString('key');
```

### Secure Storage
```typescript
import { secureStorage } from '@/lib/native-storage';

await secureStorage.setItem('token', 'secret');
const token = await secureStorage.getItem('token');
```

### Device Info
```typescript
import { getDeviceInfo, isOnline } from '@/lib/device-info';

const info = await getDeviceInfo();
const online = await isOnline();
```

### Maps
```typescript
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_CONFIG } from '@/config/native-modules';

Mapbox.setAccessToken(MAPBOX_CONFIG.accessToken);

<Mapbox.MapView style={{ flex: 1 }}>
  <Mapbox.Camera zoomLevel={14} centerCoordinate={[-122.4, 37.7]} />
</Mapbox.MapView>
```

## ⚠️ Important

- **Web doesn't support native modules** - Test on iOS/Android
- **Expo Go doesn't work** - You need a development build
- **Request permissions** - Use individual module APIs
- **Background tasks** - Test on physical devices

## 📚 Full Documentation

- **NATIVE_MODULES_SETUP.md** - Complete setup guide
- **INSTALLATION_SUMMARY.md** - What was installed
- **config/native-modules.ts** - Configuration
- **lib/native-storage.ts** - Storage utilities
- **lib/device-info.ts** - Device utilities
- **lib/background-tasks.ts** - Background utilities

## 🆘 Troubleshooting

**Module not found?**
→ Build a development build, not using Expo Go

**Mapbox not showing?**
→ Check tokens in `.env` and `app.json`, rebuild

**Background tasks not working?**
→ Test on physical device, check permissions

**Build failing?**
→ Run `npx expo prebuild --clean` and try again

---

**You're all set!** Build your development app and start using native features! 🎉
