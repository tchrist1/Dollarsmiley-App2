# AI Model Migration: Google Gemini to OpenAI GPT-4o-mini

## Migration Date
December 15, 2024

## Overview
Successfully migrated all AI services from Google Gemini 1.5 Flash to OpenAI GPT-4o-mini for improved consistency, reliability, and developer experience.

## What Changed

### 1. AI Service Layer
- **Created**: New `openai-service.ts` replacing `gemini-service.ts`
- **Model**: Changed from `gemini-1.5-flash` to `gpt-4o-mini`
- **API**: Switched from Google Generative AI to OpenAI API
- **Package**: Now using `openai@4.67.3` instead of `@google/generative-ai`

### 2. Edge Functions Updated
All AI-powered edge functions now use the OpenAI service:
- `generate-ai-recommendations/index.ts`
- `moderate-content-ai/index.ts`
- `suggest-listing-category/index.ts`

### 3. Database Configuration
Updated AI agents in the database:
- Personalized Recommendations (GPT-4o-mini)
- Content Moderation (GPT-4o-mini)
- Smart Category Suggestion (GPT-4o-mini)

### 4. Environment Variables
- **Removed**: `GOOGLE_AI_API_KEY`
- **Added**: `OPENAI_API_KEY`
- Updated in:
  - `.env`
  - `.env.example`
  - `eas.json` (all build profiles)

### 5. Documentation
- **Created**: `OPENAI_SETUP.md` (replaces `GOOGLE_AI_SETUP.md`)
- **Updated**: `EAS_BUILD_INSTRUCTIONS.md`
- **Preserved**: Old Gemini documentation for historical reference

## AI Features Affected

All AI features continue to work with improved performance:

1. **Smart Category Suggestion**
   - AI-powered categorization of service listings
   - More accurate and consistent suggestions

2. **Content Moderation**
   - Automatic detection of policy violations
   - Better understanding of context and nuance

3. **Personalized Recommendations**
   - Intelligent listing recommendations
   - Improved relevance scoring

## Cost Comparison

### Google Gemini 1.5 Flash
- Input: ~$0.075 per 1M tokens
- Output: ~$0.30 per 1M tokens

### OpenAI GPT-4o-mini
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Result**: Approximately 2x cost increase, but with significantly better consistency and reliability.

## Setup Instructions

### For New Deployments

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Set the environment variable:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### For Supabase Edge Functions

Set the secret in your Supabase project:
```bash
npx supabase secrets set OPENAI_API_KEY=your_key_here --project-ref lmjaeulvzxiszyoiegsw
```

### For EAS Builds

Add the secret to your EAS project:
```bash
npx eas-cli secret:create --scope project --name OPENAI_API_KEY --value your_key_here --type string
```

## Verification

To verify the migration was successful:

1. Check AI agents in database:
   ```sql
   SELECT id, name, agent_type, model FROM ai_agents WHERE model = 'gpt-4o-mini';
   ```

2. Test AI features:
   - Create a listing and test category suggestion
   - Test content moderation
   - Check personalized recommendations

3. Monitor OpenAI usage:
   - Visit https://platform.openai.com/usage
   - Track API calls and token usage

## Rollback Plan

If needed, you can rollback by:

1. Restoring the `GOOGLE_AI_API_KEY` environment variable
2. Reverting the edge functions to use `createGeminiService()`
3. Running a database migration to update agents back to `gemini-1.5-flash`

However, the old `gemini-service.ts` file is preserved for reference.

## Benefits of OpenAI GPT-4o-mini

1. **Better Consistency**: More reliable and predictable outputs
2. **Improved Accuracy**: Better understanding of context
3. **Faster Response Times**: Optimized for performance
4. **Better Developer Experience**: More comprehensive documentation and tooling
5. **Easier Debugging**: Better error messages and logging

## Notes

- Old Gemini service file (`gemini-service.ts`) is preserved for reference
- Historical migration files remain unchanged
- All functionality tested and verified working
- No breaking changes to API contracts
