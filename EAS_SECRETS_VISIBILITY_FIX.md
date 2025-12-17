# EAS Environment Variables - Visibility Settings

## CRITICAL: Variable Visibility Types

EAS Build has two visibility options for environment variables:
1. **Plain text** - Variable is accessible everywhere (client & build)
2. **Sensitive** - Variable is ONLY accessible during build process

## Correct Configuration

### Variables in EAS Dashboard:

| Variable Name | Value | Visibility |
|--------------|-------|------------|
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | pk.xxx... | **Plain text** |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | sk.xxx... | **Sensitive** |

## Why This Matters

### `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- ✅ Visibility: **Plain text**
- This is a PUBLIC token meant to be used in client-side code
- Needs to be embedded in the JavaScript bundle
- The `EXPO_PUBLIC_` prefix indicates it should be publicly accessible
- If set to "Sensitive", it won't be available at runtime in your app

### `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
- ✅ Visibility: **Sensitive**
- This is a SECRET token for downloading SDK during build
- Only needed during the build process (Gradle dependency download)
- Should NEVER be exposed in client code
- Keep this as "Sensitive" for security

## How to Fix in EAS Dashboard

1. Go to: https://expo.dev/accounts/tanohchris88/projects/dollarsmiley/secrets

2. For `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`:
   - Click the variable
   - Change visibility to **Plain text**
   - Save

3. For `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`:
   - Keep visibility as **Sensitive**
   - This is correct!

## Rebuild After Fixing

Once the visibility is corrected:

```bash
npx eas-cli build --profile development --platform android --clear-cache
```

## Technical Explanation

The `EXPO_PUBLIC_` prefix is a convention that tells Expo:
- Include this variable in the JavaScript bundle
- Make it available via `process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Inline it during the build process

If marked as "Sensitive", EAS won't inline it into the bundle, causing the variable to be `undefined` at runtime even though the build succeeds.
