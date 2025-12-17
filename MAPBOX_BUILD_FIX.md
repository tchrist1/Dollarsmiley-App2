# Fix: Android Build Failed - Mapbox Token Issue

## Problem

The Android build failed with this error:
```
Could not get resource 'https://api.mapbox.com/downloads/v2/releases/maven/com/mapbox/maps/android-ndk27/11.15.2/android-ndk27-11.15.2.pom'
Received status code 401 from server: Unauthorized
```

**Root Cause:** The Mapbox download token (`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`) is needed during the Android build process to download the Mapbox SDK from their private Maven repository. This token must be available to the EAS build servers.

## Solution

You need to add the Mapbox download token as an **EAS secret** so it's available during cloud builds.

### Step 1: Add Secret to EAS

Run this command in your terminal:

```bash
eas secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value sk.your_download_token_here --type string
```

**Replace `sk.your_download_token_here` with your actual secret Mapbox download token.**

Your download token should:
- Start with `sk.` (secret key)
- Be obtained from: https://account.mapbox.com/access-tokens/
- Have "Downloads:Read" scope enabled

### Step 2: Verify Secret Was Added

```bash
eas secret:list
```

You should see `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` in the list.

### Step 3: Rebuild

```bash
eas build --profile development --platform android
```

## Alternative: Add to eas.json (Less Secure)

If you prefer to reference the secret in `eas.json` explicitly (though it's automatically available):

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN": "$EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN",
        "RNMAPBOX_MAPS_DOWNLOAD_TOKEN": "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN"
      }
    }
  }
}
```

But the secret must still be created with `eas secret:create` first.

## Why This Happens

The `@rnmapbox/maps` package needs to download native Android SDK files during the Gradle build. These files are hosted on Mapbox's private Maven repository which requires authentication.

**Local builds** can use `.env` file, but **EAS cloud builds** need secrets configured in EAS.

## Verification

After adding the secret and rebuilding, you should see in the build logs:
```
✓ Successfully authenticated with Mapbox Maven repository
✓ Downloading com.mapbox.maps:android-ndk27:11.15.2
```

## If You Don't Want Native Maps Yet

If you want to disable native Mapbox temporarily to get builds working:

1. Remove the `@rnmapbox/maps` plugin from `app.json`:
   ```json
   // Remove this entire block:
   [
     "@rnmapbox/maps",
     {
       "RNMapboxMapsDownloadToken": ""
     }
   ]
   ```

2. The platform-aware components will automatically fallback to web components on all platforms.

3. Re-add the plugin later when you're ready to use native maps.

## Quick Commands

```bash
# 1. Create the secret (REQUIRED)
eas secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value sk.your_token_here --type string

# 2. Verify it was added
eas secret:list

# 3. Rebuild
eas build --profile development --platform android

# Optional: Update both secrets at once
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value pk.your_public_token --type string
```

## Expected Token Format

**Download Token (for builds):**
- Format: `sk.ey...` (starts with sk.)
- Scope: Downloads:Read
- Used by: Gradle during Android builds
- Secret: DO NOT commit to repository

**Access Token (for runtime):**
- Format: `pk.ey...` (starts with pk.)
- Scope: Public (can be in client code)
- Used by: Mapbox SDK at runtime
- Can be in .env and eas.json

## Need Help?

1. **Check your token:** https://account.mapbox.com/access-tokens/
2. **Create new token** if needed with Downloads:Read scope
3. **EAS Secrets docs:** https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables

---

**TL;DR:** Run this command with your actual token:
```bash
eas secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value sk.YOUR_ACTUAL_TOKEN_HERE --type string
```

Then rebuild:
```bash
eas build --profile development --platform android
```
