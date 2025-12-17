# Video SDK Integration - Quick Start

## 5-Minute Setup

### 1. Get Agora Credentials
- Sign up at [console.agora.io](https://console.agora.io/)
- Create a project with "App ID + Certificate" mode
- Copy App ID and App Certificate

### 2. Install Package
```bash
npx expo install react-native-agora expo-build-properties
```

### 3. Set Environment Variables

**Local (.env):**
```bash
EXPO_PUBLIC_AGORA_APP_ID=your_app_id
```

**Supabase Secrets:**
```bash
supabase secrets set AGORA_APP_ID=your_app_id
supabase secrets set AGORA_APP_CERT=your_certificate
```

### 4. Deploy Edge Function
```bash
supabase functions deploy generate-call-token
```

### 5. Build Development Client
```bash
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

### 6. Test
```bash
npx expo start --dev-client
```

## Files Modified/Created

- `lib/agora-service.ts` - Agora SDK wrapper
- `supabase/functions/generate-call-token/index.ts` - Token generation
- `app/call/[type]-agora.tsx` - Enhanced call screen
- `docs/VIDEO_CALLING_SETUP.md` - Full documentation

## Usage Example

```typescript
import { router } from 'expo-router';

router.push({
  pathname: '/call/[type]-agora',
  params: {
    type: 'video',
    otherPartyId: userId,
    otherPartyName: userName,
    bookingId: bookingId,
  },
});
```

## Key Features

- Video & voice calls
- Call controls (mute, camera, speaker)
- Call duration tracking
- Database logging
- Token-based security

## Important Notes

1. **Web Not Supported**: Video calling only works on iOS/Android
2. **Requires Dev Build**: Cannot use Expo Go
3. **Free Tier**: 10,000 minutes/month on Agora
4. **Permissions Required**: Camera and microphone permissions needed

## Troubleshooting

**"Module not found"**: You need a development build, not Expo Go

**"Permission denied"**: Add camera/microphone permissions to app.json

**"Failed to join"**: Check Agora App ID and token generation

## Next Steps

See `docs/VIDEO_CALLING_SETUP.md` for:
- Advanced features (recording, screen sharing)
- Call quality monitoring
- Analytics setup
- Alternative SDKs
- Production considerations
