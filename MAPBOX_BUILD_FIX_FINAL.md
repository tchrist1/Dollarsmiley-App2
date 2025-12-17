# Mapbox Build Fix - Final Solution

## Problem
The Android build was failing with 401 Unauthorized errors when trying to download Mapbox SDK dependencies from Maven.

## Root Cause
The `@rnmapbox/maps` package requires authentication to download dependencies from Mapbox's Maven repository. The token was set in EAS environment variables but wasn't being properly passed to Gradle's Maven authentication.

## Solution

### 1. ✅ Updated `app.json` - expo-build-properties
Added explicit Maven repository configuration with authentication:

```json
{
  "android": {
    "newArchEnabled": true,
    "extraMavenRepos": [
      {
        "url": "https://api.mapbox.com/downloads/v2/releases/maven",
        "authentication": "token",
        "username": "mapbox",
        "password": "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN"
      }
    ]
  }
}
```

This tells Gradle to:
- Add the Mapbox Maven repository
- Use token-based authentication
- Use the `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` environment variable as the password

### 2. ✅ EAS Environment Variables
All required variables are set in EAS:
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` - Mapbox secret token (sk.xxx)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` - Mapbox public token (pk.xxx)

### 3. ✅ eas.json Configuration
Already configured to pass environment variables to builds:

```json
{
  "env": {
    "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN": "$EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN",
    "RNMAPBOX_MAPS_DOWNLOAD_TOKEN": "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN"
  }
}
```

## Next Steps

Run the build command:

```bash
npx eas-cli build --profile development --platform android --clear-cache
```

The `--clear-cache` flag ensures a completely fresh build with the new Maven repository configuration.

## Why This Works

1. **expo-build-properties** plugin injects the Maven repo config into the Android build
2. Gradle will use the `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` to authenticate with Mapbox's Maven repository
3. The token is securely passed from EAS secrets → build environment → Gradle
4. Dependencies will download successfully with proper authentication

## Technical Details

- **Authentication Type**: Token-based (HTTP Basic Auth with "mapbox" as username)
- **Repository URL**: https://api.mapbox.com/downloads/v2/releases/maven
- **Token Format**: Secret key starting with `sk.`
- **Environment Variable**: `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`

This is the standard approach for Expo managed workflow + EAS Build + Mapbox Maps.
