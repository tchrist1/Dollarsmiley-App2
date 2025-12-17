# Google AI Setup for Supabase Edge Functions

The AI Category Suggestion feature requires the Google AI API key to be configured in your Supabase project.

## Setup Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/lmjaeulvzxiszyoiegsw
2. Navigate to **Project Settings** > **Edge Functions**
3. Scroll to **Secrets** section
4. Click **Add secret**
5. Add the following secret:
   - Name: `GOOGLE_AI_API_KEY`
   - Value: `AIzaSyDEwNwTGOwps0ga84kteALx4yG9imDGXDo`
6. Click **Save**

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and authenticated:

```bash
npx supabase login
npx supabase secrets set GOOGLE_AI_API_KEY=AIzaSyDEwNwTGOwps0ga84kteALx4yG9imDGXDo --project-ref lmjaeulvzxiszyoiegsw
```

## Verification

After setting up the secret:

1. The AI Category Suggestion button will work when users create listings
2. Users will see AI-powered category recommendations
3. The feature will gracefully fall back to manual selection if unavailable

## Without Setup

If you don't set up the Google AI API key:
- The AI suggestion feature will show an error message
- Users can still manually select categories from the dropdown
- The app will continue to work normally, just without AI assistance
