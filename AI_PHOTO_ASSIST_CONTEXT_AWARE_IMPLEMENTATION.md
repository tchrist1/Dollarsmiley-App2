# AI Photo Assist - Context-Aware Implementation

## Overview
AI Photo Assist now automatically captures and uses listing/job context to generate more relevant, contextually appropriate images.

## Implementation Summary

### 1. Auto-Capture Source Context
AI Photo Assist now automatically captures:

**For Service Listings:**
- Service title
- Service description
- Category and subcategory
- Listing type (Standard Service / Custom Service)
- Fulfillment configuration (if enabled)

**For Job Posts:**
- Job title
- Job description
- Category and subcategory
- Pricing type (quote-based / fixed-price)
- Location information

### 2. Smart Photo Description Prefill
When AI Photo Assist modal opens for the first time:
- Automatically generates a concise visual summary from the captured context
- Prefills the Photo Description field with context-aware suggestions
- Never overwrites user-entered text
- User can freely edit or replace the prefilled text

**Example Prefill Behaviors:**
- Cleaning services → "Spotless, professionally cleaned space with natural lighting"
- Custom services with shipping → "Professional product photo showcasing"
- Repair jobs → "Professional repair work in progress, clear before/after view"
- Event services → "Elegant event setup with professional decor"

### 3. Context-Aware Prompt Enhancement
The two-stage pipeline now uses both:
- Auto-captured listing/job context (title, description, category, etc.)
- Final Photo Description text (prefilled or user-edited)

**Stage 1: Prompt Enhancement (GPT-4o-mini)**
- Receives source context (title, description, category, subcategory, type)
- Receives user's photo description
- Generates enhanced prompt reflecting service/job purpose
- Adds professional photography details
- Incorporates environment and visual expectations

**Stage 2: Image Generation (gpt-image-1)**
- Uses the context-aware enhanced prompt
- Generates images aligned with actual listing or job

### 4. Audit Logging & Traceability
Enhanced logging in `ai_agent_actions` table:
- Source context summary (title, description, category, subcategory, listing/job type)
- Final photo description used
- Enhanced image prompt
- Context usage flag (`contextUsed: true/false`)
- Models used (enhancement + image generation)
- Token usage

### 5. Fallback Behavior
If no description context exists:
- AI Photo Assist behaves as before
- Manual Photo Description remains optional
- No blocking behavior introduced

## Technical Changes

### Files Modified

**Frontend:**
- `components/AIPhotoAssistModal.tsx`
  - Added `SourceContext` interface
  - Added `generateVisualSummary()` function for smart prefill
  - Added prefill logic that runs once on modal open
  - Updated to pass `sourceContext` instead of generic `context`

- `app/(tabs)/create-listing.tsx`
  - Updated AIPhotoAssistModal invocation to pass rich sourceContext

- `app/(tabs)/post-job.tsx`
  - Updated AIPhotoAssistModal invocation to pass rich sourceContext

**Backend:**
- `supabase/functions/generate-photo/index.ts`
  - Added `SourceContext` interface
  - Updated request interface to accept `sourceContext`
  - Enhanced prompt engineering to incorporate source context
  - Updated audit logging to capture context details

### Edge Function Deployment
- `generate-photo` edge function deployed with context-aware enhancements

## Acceptance Criteria Status

✅ AI Photo Assist automatically captures listing or job description context
✅ Photo Description field is intelligently prefilled on first open
✅ User input is never overwritten
✅ Generated images reflect the actual service or job
✅ No UI friction or additional required fields
✅ Backward compatible with existing flows
✅ Audit logging captures context for debugging and analytics

## User Experience

**Before:**
- User manually described image needs without any context
- AI generated images based solely on manual input
- No relationship between listing/job content and image output

**After:**
- AI Photo Assist automatically understands what the user is offering/requesting
- Photo Description prefilled with intelligent context-aware summary
- Generated images align with the service or job purpose
- User can still fully customize or override suggestions

## Example Flows

### Create Service Listing Flow
1. User enters: "Professional Home Cleaning Service"
2. User enters description: "Deep cleaning for kitchens, bathrooms, living areas"
3. User selects category: "Home Services > Cleaning"
4. User opens AI Photo Assist
5. Photo Description auto-prefills: "Spotless, professionally cleaned space with natural lighting"
6. User can edit or keep the suggestion
7. AI generates images reflecting professional cleaning results

### Post Job Flow
1. User enters: "Need furniture moved to new apartment"
2. User enters description: "Moving 3-bedroom apartment furniture including couch, bed, dining table"
3. User selects category: "Moving & Storage"
4. User opens AI Photo Assist
5. Photo Description auto-prefills: "Professional movers handling furniture carefully"
6. AI generates images showing professional moving services

## Architecture Integrity

This implementation maintains the locked two-stage AI pipeline:
- **Stage 1 (Text Intelligence):** GPT-4o-mini enhances prompts
- **Stage 2 (Image Generation):** gpt-image-1 generates images
- No text model generates images directly
- No image model performs text analysis
- Strict separation of responsibilities enforced

## Backward Compatibility

All changes are additive and non-breaking:
- Existing AI Photo Assist functionality unchanged
- New sourceContext parameter is optional
- Fallback to original behavior if no context provided
- No UI changes to existing screens
- No database schema changes required
