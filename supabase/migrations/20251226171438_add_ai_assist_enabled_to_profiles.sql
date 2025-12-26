/*
  # Add AI Assist Enabled User Preference

  1. Changes
    - Add `ai_assist_enabled` column to profiles table
    - Default value is TRUE (AI Assist is enabled by default)
    - This serves as the master toggle for all AI-powered features

  2. Purpose
    - Provides user-level control over AI features
    - Single source of truth for AI Assist state
    - Controls: AI Image Assist, AI Title/Description, AI Category Suggestions

  3. Security
    - Users can only modify their own preference
    - Existing users get default value of TRUE
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_assist_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_assist_enabled boolean DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN profiles.ai_assist_enabled IS 'Master toggle for all AI-powered features (AI Image Assist, AI Title/Description, AI Category Suggestions)';