# EAS Build Setup - Step by Step

## Current Status
✅ EAS CLI installed
✅ OpenAI GPT-4o-mini deployed
⏳ Need to login and add secrets
⏳ Need to rebuild

## Step-by-Step Instructions

### 1. Login to EAS

```bash
npx eas-cli login
```

Enter your Expo account credentials when prompted.

### 2. Verify Login

```bash
npx eas-cli whoami
```

Should show your username (e.g., `tanohchris88`).

### 3. Get Your Mapbox Download Token

1. Go to: https://account.mapbox.com/access-tokens/
2. Click **"Create a token"**
3. Token settings:
   - **Name:** "EAS Build Download Token"
   - **Scopes:** Check "Downloads:Read"
   - **Public/Secret:** Select "Secret token"
4. Click **"Create token"**
5. Copy the token (starts with `sk.`)

**IMPORTANT:** Save this token somewhere safe - you can only see it once!

### 4. Add Mapbox Secret to EAS

Replace `YOUR_TOKEN_HERE` with the actual token you copied:

```bash
npx eas-cli secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value YOUR_TOKEN_HERE --type string
```

### 5. Add OpenAI API Key

Get your API key from https://platform.openai.com/api-keys (or use existing key from .env):

```bash
npx eas-cli secret:create --scope project --name OPENAI_API_KEY --value YOUR_OPENAI_API_KEY --type string
```

### 6. Verify Secrets Were Added

```bash
npx eas-cli secret:list
```

You should see:
- RNMAPBOX_MAPS_DOWNLOAD_TOKEN
- OPENAI_API_KEY

### 7. Rebuild Android

```bash
npx eas-cli build --profile development --platform android
```

## Quick Reference

```bash
# Login
npx eas-cli login

# Add Mapbox secret
npx eas-cli secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value sk.YOUR_TOKEN --type string

# Add OpenAI secret
npx eas-cli secret:create --scope project --name OPENAI_API_KEY --value YOUR_OPENAI_API_KEY --type string

# Build
npx eas-cli build --profile development --platform android
```

---

**TL;DR:**
1. `npx eas-cli login`
2. Get Mapbox token from https://account.mapbox.com/access-tokens/
3. Get OpenAI key from https://platform.openai.com/api-keys
4. `npx eas-cli secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value sk.YOUR_TOKEN --type string`
5. `npx eas-cli secret:create --scope project --name OPENAI_API_KEY --value YOUR_KEY --type string`
6. `npx eas-cli build --profile development --platform android`
