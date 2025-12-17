# Video Calling Integration Guide

This guide covers the complete setup for integrating Agora video calling into your app.

## Prerequisites

- Expo Dev Client installed
- Agora account (free tier available)
- Supabase project set up

## Step 1: Create Agora Account

1. Go to [Agora Console](https://console.agora.io/)
2. Sign up for a free account
3. Create a new project
4. Enable "App ID + Certificate" mode for security
5. Copy your:
   - App ID
   - App Certificate

## Step 2: Install Dependencies

```bash
npx expo install react-native-agora
npx expo install expo-build-properties
```

## Step 3: Configure Build Properties

Update your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24
          },
          "ios": {
            "deploymentTarget": "12.0"
          }
        }
      ]
    ]
  }
}
```

## Step 4: Set Environment Variables

### Local Development (.env)

```bash
EXPO_PUBLIC_AGORA_APP_ID=your_app_id_here
```

### Supabase Edge Functions

Set secrets in your Supabase project:

```bash
supabase secrets set AGORA_APP_ID=your_app_id_here
supabase secrets set AGORA_APP_CERT=your_app_certificate_here
```

Or use the Supabase dashboard:
1. Go to Project Settings > Edge Functions
2. Add secrets:
   - `AGORA_APP_ID`
   - `AGORA_APP_CERT`

## Step 5: Deploy Edge Function

```bash
supabase functions deploy generate-call-token
```

## Step 6: Build Development Client

Since Agora requires native code, you need a custom development build:

### iOS

```bash
eas build --profile development --platform ios
```

### Android

```bash
eas build --profile development --platform android
```

### Install the build

Once complete, install the development build on your device and start the development server:

```bash
npx expo start --dev-client
```

## Step 7: Test Video Calling

1. Navigate to a booking with an active conversation
2. Tap the video call button
3. The app will:
   - Create a call log entry in Supabase
   - Request an Agora token from your edge function
   - Initialize the Agora SDK
   - Join the video channel

## Architecture Overview

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ 1. Request token
         ▼
┌─────────────────────┐
│  Edge Function      │
│  (Supabase)         │
│  - Verify user      │
│  - Generate token   │
└─────────┬───────────┘
          │
          │ 2. Token + Config
          ▼
┌─────────────────────┐
│  Agora SDK          │
│  - Join channel     │
│  - Stream A/V       │
└─────────────────────┘
```

## Features Implemented

### Core Features
- Video calling between users
- Voice-only calling option
- Real-time audio/video streaming
- Call duration tracking
- Call logs stored in database

### Controls
- Mute/unmute microphone
- Enable/disable camera
- Toggle speakerphone
- Switch between front/back camera
- End call

### Database Integration
- Call logs with status tracking
- Participant management
- Call duration recording
- Call analytics

## Usage in Code

### Starting a Call

```typescript
import { router } from 'expo-router';

function startVideoCall(otherUserId: string, otherUserName: string, bookingId: string) {
  router.push({
    pathname: '/call/[type]-agora',
    params: {
      type: 'video',
      otherPartyId: otherUserId,
      otherPartyName: otherUserName,
      bookingId: bookingId,
    },
  });
}
```

### Using Video Call Service

```typescript
import VideoCallService from '@/lib/video-calls';

const call = await VideoCallService.createCall({
  hostId: currentUserId,
  callType: 'consultation',
  scheduledStart: new Date(),
  bookingId: bookingId,
  maxParticipants: 2,
  recordingEnabled: false,
});
```

## Advanced Features

### Call Recording

To enable call recording:

1. Enable cloud recording in Agora console
2. Set up storage bucket (AWS S3, Google Cloud Storage, etc.)
3. Update the `create_video_call` function to enable recording
4. Use Agora Cloud Recording API

### Screen Sharing

Agora supports screen sharing on mobile:

```typescript
await AgoraService.getEngine()?.startScreenCapture({
  captureVideo: true,
  captureAudio: true,
});
```

### Call Quality Monitoring

The app tracks:
- Connection quality
- Packet loss
- Bitrate
- Latency

View call analytics:

```typescript
const analytics = await VideoCallService.getCallAnalytics(callId);
```

## Troubleshooting

### "Camera permission denied"

Add permissions to your app.json:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera for video calls",
        "NSMicrophoneUsageDescription": "This app uses the microphone for calls"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO"
      ]
    }
  }
}
```

### "Failed to join channel"

1. Verify your Agora App ID is correct
2. Check that token generation is working
3. Ensure network connectivity
4. Check Agora console for project status

### "Cannot find module 'react-native-agora'"

You need to build a development client. The module won't work in Expo Go:

```bash
eas build --profile development --platform ios
```

### Web Platform

Video calling is not supported on web. The app detects the platform and shows a message directing users to use the mobile app.

## Cost Considerations

Agora pricing:
- **Free tier**: 10,000 minutes/month
- **Paid plans**: Starting at $0.99/1000 minutes

For production, monitor usage in the Agora console.

## Alternative SDKs

If Agora doesn't meet your needs, consider:

1. **Twilio Video**: Enterprise-grade, more expensive
2. **Stream Video SDK**: Modern, good DX
3. **Daily.co**: Simple integration
4. **100ms**: Good for React Native

## Security Best Practices

1. Always generate tokens server-side (done via edge function)
2. Use token expiration (set to 1 hour)
3. Validate user permissions before generating tokens
4. Log all call attempts for auditing
5. Implement rate limiting on token generation

## Next Steps

1. Test on physical devices (simulators may have issues)
2. Implement call quality indicators
3. Add reconnection logic for network issues
4. Set up analytics dashboard
5. Test with multiple participants

## Support

- [Agora Documentation](https://docs.agora.io/)
- [React Native Agora SDK](https://github.com/AgoraIO-Community/react-native-agora)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
