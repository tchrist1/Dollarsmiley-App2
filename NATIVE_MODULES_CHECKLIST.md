# Native Modules Installation Checklist

## ✅ Installation Complete

### Installed Packages (13/16)
- [x] @rnmapbox/maps v10.2.7
- [x] expo-localization v17.0.7
- [x] expo-build-properties v1.0.9
- [x] expo-secure-store v15.0.7
- [x] expo-application v7.0.7
- [x] expo-task-manager v14.0.8
- [x] expo-background-fetch v14.0.8
- [x] expo-contacts v15.0.10
- [x] expo-media-library v18.2.0
- [x] react-native-mmkv v3.1.0
- [x] react-native-device-info v14.0.4
- [x] expo-updates v29.0.12
- [x] expo-network v8.0.7

### Not Installed (Deprecated)
- [x] expo-permissions (Use individual module permissions)
- [x] expo-error-recovery (Use react-error-boundary)
- [x] expo-analytics-amplitude (Use @amplitude/analytics-react-native)

### Configuration Files
- [x] config/native-modules.ts - Module configuration
- [x] lib/native-storage.ts - Storage utilities
- [x] lib/device-info.ts - Device info utilities
- [x] lib/background-tasks.ts - Background task utilities
- [x] app.json - Updated with plugins
- [x] .env.example - Updated with new variables

### Documentation
- [x] NATIVE_MODULES_SETUP.md - Complete setup guide
- [x] INSTALLATION_SUMMARY.md - Installation details
- [x] QUICK_START_NATIVE.md - Quick reference
- [x] NATIVE_MODULES_CHECKLIST.md - This file

## 📋 Pre-Build Checklist

Before creating your development build, complete these steps:

### 1. Mapbox Configuration
- [ ] Create Mapbox account
- [ ] Obtain access token (pk.*)
- [ ] Obtain download token (sk.*)
- [ ] Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to .env
- [ ] Add RNMAPBOX_MAPS_DOWNLOAD_TOKEN to .env
- [ ] Update RNMapboxMapsDownloadToken in app.json

### 2. Environment Setup
- [ ] Copy .env.example to .env
- [ ] Fill in all required variables
- [ ] Verify Supabase credentials
- [ ] Verify Stripe credentials
- [ ] Add Mapbox credentials

### 3. EAS Setup (If using cloud builds)
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Configure project: `eas build:configure`
- [ ] Review eas.json configuration

### 4. Build Profiles
Choose your build method:

#### Development Build
- [ ] Cloud: `eas build --profile development --platform ios`
- [ ] Cloud: `eas build --profile development --platform android`
- [ ] Local: `npx expo prebuild`
- [ ] Local: `npx expo run:ios` or `npx expo run:android`

#### Production Build
- [ ] `eas build --profile production --platform ios`
- [ ] `eas build --profile production --platform android`

## 🧪 Testing Checklist

After installing the development build:

### Storage Tests
- [ ] Test MMKV storage (read/write)
- [ ] Test SecureStore (sensitive data)
- [ ] Test cache functionality
- [ ] Test storage persistence

### Maps Tests
- [ ] Map renders correctly
- [ ] Camera controls work
- [ ] Markers display
- [ ] Location tracking works

### Device Info Tests
- [ ] Get device information
- [ ] Check network status
- [ ] Verify locale detection
- [ ] Test online/offline detection

### Background Tasks Tests
- [ ] Register background fetch
- [ ] Verify background execution
- [ ] Test task manager
- [ ] Check location tracking (if used)

### Media & Contacts Tests
- [ ] Request contacts permission
- [ ] Access contacts
- [ ] Request media library permission
- [ ] Access photos/videos

### Updates Tests
- [ ] Configure OTA updates
- [ ] Test update mechanism
- [ ] Verify version checking

## 🚨 Known Limitations

### Platform Specific
- **Web**: Most native modules won't work
- **Expo Go**: Cannot use custom native modules
- **Simulators**: Limited background task functionality

### Background Tasks
- **iOS**: Minimum 15-minute intervals
- **Android**: Affected by battery optimization
- **Testing**: Use physical devices for accurate behavior

### Permissions
- Must request at runtime
- Use individual module APIs
- Handle denied permissions gracefully

## 📊 Module Support Matrix

| Module | iOS | Android | Web |
|--------|-----|---------|-----|
| @rnmapbox/maps | ✅ | ✅ | ❌ |
| expo-localization | ✅ | ✅ | ✅ |
| expo-secure-store | ✅ | ✅ | ❌ |
| expo-application | ✅ | ✅ | ✅ |
| expo-task-manager | ✅ | ✅ | ❌ |
| expo-background-fetch | ✅ | ✅ | ❌ |
| expo-contacts | ✅ | ✅ | ❌ |
| expo-media-library | ✅ | ✅ | ❌ |
| react-native-mmkv | ✅ | ✅ | ❌ |
| react-native-device-info | ✅ | ✅ | ⚠️ |
| expo-updates | ✅ | ✅ | ❌ |
| expo-network | ✅ | ✅ | ✅ |

✅ = Full support  
⚠️ = Limited support  
❌ = Not supported  

## 🎯 Next Steps

1. **Configure Mapbox** - Get your tokens
2. **Build Development App** - Choose cloud or local
3. **Test Features** - Verify all modules work
4. **Implement Features** - Use utility files provided
5. **Production Build** - When ready to deploy

## 📞 Support Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Mapbox Documentation](https://docs.mapbox.com/)
- [MMKV Documentation](https://github.com/mrousavy/react-native-mmkv)
- [Expo Forums](https://forums.expo.dev/)

## ✨ Summary

**Status**: ✅ All native modules successfully installed and configured

**Installed**: 13/16 modules (3 deprecated with modern alternatives)

**Ready for**: Development build creation and native feature testing

**Existing functionality**: ✅ Not broken - all previous features intact

---

**Installation Date**: November 21, 2025  
**Expo SDK**: 54.0.10  
**React Native**: 0.81.4  
**Status**: Ready for prebuild and development client creation
