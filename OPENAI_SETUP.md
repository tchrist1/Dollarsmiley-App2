# OpenAI Setup for Supabase Edge Functions

The AI features (Category Suggestion, Content Moderation, and Recommendations) require the OpenAI API key to be configured in your Supabase project.

## Setup Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/lmjaeulvzxiszyoiegsw
2. Navigate to **Project Settings** > **Edge Functions**
3. Scroll to **Secrets** section
4. Click **Add secret**
5. Add the following secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key from https://platform.openai.com/api-keys
6. Click **Save**

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and authenticated:

```bash
npx supabase login
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key_here --project-ref lmjaeulvzxiszyoiegsw
```

## Getting an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (you won't be able to see it again)
5. Use this key in the setup steps above

## AI Features Powered by OpenAI

This app uses OpenAI GPT-4o-mini for:

- **Smart Category Suggestion**: AI-powered categorization of service listings
- **Content Moderation**: Automatic detection of policy violations
- **Personalized Recommendations**: Intelligent listing recommendations for users

## Verification

After setting up the secret:

1. The AI Category Suggestion button will work when users create listings
2. Users will see AI-powered category recommendations
3. Content moderation will automatically flag inappropriate content
4. Users will receive personalized listing recommendations

## Without Setup

If you don't set up the OpenAI API key:
- The AI suggestion feature will show an error message
- Users can still manually select categories from the dropdown
- Content moderation will not work automatically
- The app will continue to work normally, just without AI assistance

## Pricing

GPT-4o-mini pricing (as of 2024):
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

This is cost-effective for most applications. Monitor your usage at https://platform.openai.com/usage
