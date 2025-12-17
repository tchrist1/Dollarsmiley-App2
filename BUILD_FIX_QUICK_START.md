# Mapbox Build Fix - Simplified Approach

## What Was Changed

### 1. app.json
- Removed the complex `extraMavenRepos` configuration (was causing JSON parse errors)
- Simplified `@rnmapbox/maps` plugin to use default config
- Kept `expo-build-properties` with just the basic Android config

### 2. eas.json
- Added `MAPBOX_DOWNLOADS_TOKEN` environment variable to Android-specific build config
- This is the key variable that the @rnmapbox/maps Gradle script looks for
- Applied to all build profiles (development, preview, production)

## Configuration Details

### eas.json Structure:
```json
{
  "android": {
    "env": {
      "MAPBOX_DOWNLOADS_TOKEN": "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN"
    }
  }
}
```

This tells the Android build to:
1. Take the EAS secret `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
2. Inject it as `MAPBOX_DOWNLOADS_TOKEN` during the Gradle build
3. The @rnmapbox/maps Gradle script reads `MAPBOX_DOWNLOADS_TOKEN` and uses it for Maven authentication

## Rebuild Command

```bash
npx eas-cli build --profile development --platform android --clear-cache
```

## Why This Works

The @rnmapbox/maps package's Gradle build script automatically:
- Detects the `MAPBOX_DOWNLOADS_TOKEN` environment variable
- Configures Maven authentication to Mapbox's repository
- Downloads dependencies using the token

No complex plugin configuration needed!

## EAS Environment Variables

Make sure these are still set (they are):
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` = sk.xxx (your secret token)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` = pk.xxx (your public token)

The build maps the first one to `MAPBOX_DOWNLOADS_TOKEN` for Gradle.
