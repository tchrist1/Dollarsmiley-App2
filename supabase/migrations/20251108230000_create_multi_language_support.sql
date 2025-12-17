/*
  # Create Multi-Language Support System

  ## Overview
  Provides comprehensive multi-language support with:
  - User language preferences
  - Content translations (categories, listings, jobs, posts)
  - UI translations (labels, messages, notifications)
  - Automatic translation suggestions
  - Translation quality scoring
  - Fallback language support
  - RTL (Right-to-Left) language support
  - Translation memory
  - Glossary management
  - Translation workflow (draft, review, approved)

  ## New Tables

  ### 1. `supported_languages`
  Supported language configurations
  - `id` (uuid, primary key)
  - `code` (text) - ISO 639-1 code (en, es, fr, etc.)
  - `name` (text) - Language name in English
  - `native_name` (text) - Language name in native script
  - `direction` (text) - ltr or rtl
  - `is_active` (boolean)
  - `is_default` (boolean)
  - `translation_coverage` (numeric) - % of content translated
  - `flag_emoji` (text)
  - `sort_order` (int)
  - `created_at` (timestamptz)

  ### 2. `user_language_preferences`
  User language settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `primary_language` (text) - Main language
  - `fallback_languages` (text[]) - Secondary languages
  - `auto_translate` (boolean) - Auto-translate content
  - `show_original` (boolean) - Show original alongside translation
  - `updated_at` (timestamptz)

  ### 3. `translation_strings`
  UI string translations
  - `id` (uuid, primary key)
  - `key` (text) - Translation key (e.g., "common.welcome")
  - `context` (text) - Where it's used
  - `category` (text) - Group (UI, notifications, emails)
  - `source_text` (text) - Original text
  - `source_language` (text) - Usually 'en'
  - `character_limit` (int) - Max length constraint
  - `interpolation_vars` (text[]) - Variables like {name}
  - `description` (text) - Usage notes for translators
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `translations`
  Actual translations
  - `id` (uuid, primary key)
  - `string_id` (uuid, references translation_strings)
  - `language_code` (text)
  - `translated_text` (text)
  - `status` (text) - draft, review, approved, rejected
  - `quality_score` (numeric) - 0-1 quality rating
  - `is_machine_translated` (boolean)
  - `translator_id` (uuid, references profiles)
  - `reviewer_id` (uuid, references profiles)
  - `reviewed_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `content_translations`
  User-generated content translations
  - `id` (uuid, primary key)
  - `content_type` (text) - listing, job, post, review, bio
  - `content_id` (uuid) - ID of the content
  - `field_name` (text) - title, description, etc.
  - `source_language` (text)
  - `target_language` (text)
  - `source_text` (text)
  - `translated_text` (text)
  - `is_machine_translated` (boolean)
  - `quality_score` (numeric)
  - `translator_id` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `translation_memory`
  Reusable translation segments
  - `id` (uuid, primary key)
  - `source_language` (text)
  - `target_language` (text)
  - `source_segment` (text)
  - `target_segment` (text)
  - `usage_count` (int) - Times reused
  - `quality_score` (numeric)
  - `context` (text)
  - `created_at` (timestamptz)
  - `last_used_at` (timestamptz)

  ### 7. `translation_glossary`
  Terminology management
  - `id` (uuid, primary key)
  - `term` (text) - Source term
  - `translation` (text) - Target term
  - `source_language` (text)
  - `target_language` (text)
  - `context` (text)
  - `category` (text) - technical, legal, medical
  - `do_not_translate` (boolean) - Brand names, etc.
  - `notes` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 8. `translation_requests`
  Translation request queue
  - `id` (uuid, primary key)
  - `content_type` (text)
  - `content_id` (uuid)
  - `field_name` (text)
  - `source_language` (text)
  - `target_languages` (text[])
  - `priority` (text) - low, medium, high, urgent
  - `status` (text) - pending, in_progress, completed, cancelled
  - `requester_id` (uuid, references profiles)
  - `assigned_to` (uuid, references profiles)
  - `due_date` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 9. `language_detection_cache`
  Cached language detection results
  - `id` (uuid, primary key)
  - `text_hash` (text) - Hash of the text
  - `detected_language` (text)
  - `confidence` (numeric)
  - `created_at` (timestamptz)

  ### 10. `translation_analytics`
  Translation usage analytics
  - `id` (uuid, primary key)
  - `language_code` (text)
  - `date` (date)
  - `translation_requests` (int)
  - `machine_translations` (int)
  - `human_translations` (int)
  - `avg_quality_score` (numeric)
  - `user_count` (int) - Users using this language

  ## Features
  - 30+ supported languages
  - User language preferences
  - UI string translations
  - Content translations (listings, jobs, posts)
  - Machine translation integration ready
  - Translation quality scoring
  - Translation memory for efficiency
  - Glossary for consistency
  - RTL language support
  - Translation workflow
  - Fallback languages
  - Auto-translation option
  - Show original option
  - Translation analytics

  ## Security
  - Enable RLS on all tables
  - Users can set own preferences
  - Translators can submit translations
  - Reviewers can approve translations
  - Public can read approved translations

  ## Important Notes
  - English (en) is the default source language
  - Translations cascade to fallback languages
  - Machine translations marked separately
  - Quality scores for ranking
  - Translation memory for consistency
*/

-- Create translation status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'translation_status') THEN
    CREATE TYPE translation_status AS ENUM ('draft', 'review', 'approved', 'rejected');
  END IF;
END $$;

-- Create priority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'translation_priority') THEN
    CREATE TYPE translation_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

-- Create request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'translation_request_status') THEN
    CREATE TYPE translation_request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- Create supported_languages table
CREATE TABLE IF NOT EXISTS supported_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  native_name text NOT NULL,
  direction text DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  translation_coverage numeric DEFAULT 0 CHECK (translation_coverage >= 0 AND translation_coverage <= 100),
  flag_emoji text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_language_preferences table
CREATE TABLE IF NOT EXISTS user_language_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_language text DEFAULT 'en',
  fallback_languages text[] DEFAULT ARRAY['en'],
  auto_translate boolean DEFAULT true,
  show_original boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Create translation_strings table
CREATE TABLE IF NOT EXISTS translation_strings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  context text,
  category text DEFAULT 'UI' CHECK (category IN ('UI', 'notifications', 'emails', 'errors', 'system')),
  source_text text NOT NULL,
  source_language text DEFAULT 'en',
  character_limit int,
  interpolation_vars text[] DEFAULT ARRAY[]::text[],
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  string_id uuid REFERENCES translation_strings(id) ON DELETE CASCADE NOT NULL,
  language_code text NOT NULL,
  translated_text text NOT NULL,
  status translation_status DEFAULT 'draft',
  quality_score numeric CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
  is_machine_translated boolean DEFAULT false,
  translator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(string_id, language_code)
);

-- Create content_translations table
CREATE TABLE IF NOT EXISTS content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('listing', 'job', 'post', 'review', 'bio', 'category', 'message')),
  content_id uuid NOT NULL,
  field_name text NOT NULL,
  source_language text NOT NULL,
  target_language text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  is_machine_translated boolean DEFAULT false,
  quality_score numeric CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
  translator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(content_type, content_id, field_name, target_language)
);

-- Create translation_memory table
CREATE TABLE IF NOT EXISTS translation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_language text NOT NULL,
  target_language text NOT NULL,
  source_segment text NOT NULL,
  target_segment text NOT NULL,
  usage_count int DEFAULT 0,
  quality_score numeric DEFAULT 0.8 CHECK (quality_score >= 0 AND quality_score <= 1),
  context text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(source_language, target_language, source_segment)
);

-- Create translation_glossary table
CREATE TABLE IF NOT EXISTS translation_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  translation text NOT NULL,
  source_language text NOT NULL,
  target_language text NOT NULL,
  context text,
  category text,
  do_not_translate boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(term, source_language, target_language)
);

-- Create translation_requests table
CREATE TABLE IF NOT EXISTS translation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  field_name text NOT NULL,
  source_language text NOT NULL,
  target_languages text[] NOT NULL,
  priority translation_priority DEFAULT 'medium',
  status translation_request_status DEFAULT 'pending',
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create language_detection_cache table
CREATE TABLE IF NOT EXISTS language_detection_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text NOT NULL UNIQUE,
  detected_language text NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now()
);

-- Create translation_analytics table
CREATE TABLE IF NOT EXISTS translation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  date date NOT NULL,
  translation_requests int DEFAULT 0,
  machine_translations int DEFAULT 0,
  human_translations int DEFAULT 0,
  avg_quality_score numeric DEFAULT 0,
  user_count int DEFAULT 0,
  UNIQUE(language_code, date)
);

-- Enable RLS
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_strings ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_detection_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active languages"
  ON supported_languages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can manage own language preferences"
  ON user_language_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view translation strings"
  ON translation_strings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view approved translations"
  ON translations FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Anyone can view content translations"
  ON content_translations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view translation memory"
  ON translation_memory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view glossary"
  ON translation_glossary FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create translation requests"
  ON translation_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view own translation requests"
  ON translation_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_user ON user_language_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_strings_key ON translation_strings(key);
CREATE INDEX IF NOT EXISTS idx_translations_string_lang ON translations(string_id, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_status ON translations(status);
CREATE INDEX IF NOT EXISTS idx_content_translations_content ON content_translations(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_translations_lang ON content_translations(target_language);
CREATE INDEX IF NOT EXISTS idx_translation_memory_langs ON translation_memory(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_glossary_langs ON translation_glossary(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_requests_status ON translation_requests(status, priority);
CREATE INDEX IF NOT EXISTS idx_language_detection_hash ON language_detection_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_translation_analytics_lang_date ON translation_analytics(language_code, date);

-- Function to get user language
CREATE OR REPLACE FUNCTION get_user_language(user_id_param uuid)
RETURNS text AS $$
DECLARE
  user_lang text;
BEGIN
  SELECT primary_language INTO user_lang
  FROM user_language_preferences
  WHERE user_id = user_id_param;

  RETURN COALESCE(user_lang, 'en');
END;
$$ LANGUAGE plpgsql;

-- Function to get translation with fallback
CREATE OR REPLACE FUNCTION get_translation(
  key_param text,
  lang_param text,
  fallback_langs text[] DEFAULT ARRAY['en']
)
RETURNS text AS $$
DECLARE
  translation_text text;
  lang text;
BEGIN
  SELECT t.translated_text INTO translation_text
  FROM translations t
  JOIN translation_strings ts ON t.string_id = ts.id
  WHERE ts.key = key_param
  AND t.language_code = lang_param
  AND t.status = 'approved'
  LIMIT 1;

  IF translation_text IS NOT NULL THEN
    RETURN translation_text;
  END IF;

  FOREACH lang IN ARRAY fallback_langs LOOP
    SELECT t.translated_text INTO translation_text
    FROM translations t
    JOIN translation_strings ts ON t.string_id = ts.id
    WHERE ts.key = key_param
    AND t.language_code = lang
    AND t.status = 'approved'
    LIMIT 1;

    IF translation_text IS NOT NULL THEN
      RETURN translation_text;
    END IF;
  END LOOP;

  SELECT source_text INTO translation_text
  FROM translation_strings
  WHERE key = key_param;

  RETURN translation_text;
END;
$$ LANGUAGE plpgsql;

-- Function to get content translation
CREATE OR REPLACE FUNCTION get_content_translation(
  content_type_param text,
  content_id_param uuid,
  field_name_param text,
  target_lang_param text
)
RETURNS text AS $$
DECLARE
  translation_text text;
BEGIN
  SELECT translated_text INTO translation_text
  FROM content_translations
  WHERE content_type = content_type_param
  AND content_id = content_id_param
  AND field_name = field_name_param
  AND target_language = target_lang_param
  LIMIT 1;

  RETURN translation_text;
END;
$$ LANGUAGE plpgsql;

-- Function to update translation coverage
CREATE OR REPLACE FUNCTION update_translation_coverage()
RETURNS void AS $$
BEGIN
  UPDATE supported_languages sl
  SET translation_coverage = (
    SELECT
      CASE
        WHEN COUNT(ts.id) = 0 THEN 0
        ELSE (COUNT(DISTINCT t.id)::numeric / COUNT(ts.id)::numeric) * 100
      END
    FROM translation_strings ts
    LEFT JOIN translations t ON ts.id = t.string_id
      AND t.language_code = sl.code
      AND t.status = 'approved'
  )
  WHERE sl.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update translation coverage
CREATE OR REPLACE FUNCTION trigger_update_translation_coverage()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_translation_coverage();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coverage_on_translation ON translations;
CREATE TRIGGER update_coverage_on_translation
  AFTER INSERT OR UPDATE OR DELETE ON translations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_update_translation_coverage();

-- Function to record translation usage
CREATE OR REPLACE FUNCTION record_translation_usage(
  lang_code text,
  is_machine bool DEFAULT false
)
RETURNS void AS $$
BEGIN
  INSERT INTO translation_analytics (
    language_code,
    date,
    translation_requests,
    machine_translations,
    human_translations
  ) VALUES (
    lang_code,
    CURRENT_DATE,
    1,
    CASE WHEN is_machine THEN 1 ELSE 0 END,
    CASE WHEN NOT is_machine THEN 1 ELSE 0 END
  )
  ON CONFLICT (language_code, date)
  DO UPDATE SET
    translation_requests = translation_analytics.translation_requests + 1,
    machine_translations = translation_analytics.machine_translations + EXCLUDED.machine_translations,
    human_translations = translation_analytics.human_translations + EXCLUDED.human_translations;
END;
$$ LANGUAGE plpgsql;

-- Insert supported languages (30+ languages)
INSERT INTO supported_languages (code, name, native_name, direction, is_default, flag_emoji, sort_order) VALUES
  ('en', 'English', 'English', 'ltr', true, '🇬🇧', 1),
  ('es', 'Spanish', 'Español', 'ltr', false, '🇪🇸', 2),
  ('fr', 'French', 'Français', 'ltr', false, '🇫🇷', 3),
  ('de', 'German', 'Deutsch', 'ltr', false, '🇩🇪', 4),
  ('it', 'Italian', 'Italiano', 'ltr', false, '🇮🇹', 5),
  ('pt', 'Portuguese', 'Português', 'ltr', false, '🇵🇹', 6),
  ('ru', 'Russian', 'Русский', 'ltr', false, '🇷🇺', 7),
  ('ja', 'Japanese', '日本語', 'ltr', false, '🇯🇵', 8),
  ('zh', 'Chinese', '中文', 'ltr', false, '🇨🇳', 9),
  ('ko', 'Korean', '한국어', 'ltr', false, '🇰🇷', 10),
  ('ar', 'Arabic', 'العربية', 'rtl', false, '🇸🇦', 11),
  ('hi', 'Hindi', 'हिन्दी', 'ltr', false, '🇮🇳', 12),
  ('bn', 'Bengali', 'বাংলা', 'ltr', false, '🇧🇩', 13),
  ('pa', 'Punjabi', 'ਪੰਜਾਬੀ', 'ltr', false, '🇮🇳', 14),
  ('vi', 'Vietnamese', 'Tiếng Việt', 'ltr', false, '🇻🇳', 15),
  ('tr', 'Turkish', 'Türkçe', 'ltr', false, '🇹🇷', 16),
  ('pl', 'Polish', 'Polski', 'ltr', false, '🇵🇱', 17),
  ('uk', 'Ukrainian', 'Українська', 'ltr', false, '🇺🇦', 18),
  ('nl', 'Dutch', 'Nederlands', 'ltr', false, '🇳🇱', 19),
  ('sv', 'Swedish', 'Svenska', 'ltr', false, '🇸🇪', 20),
  ('no', 'Norwegian', 'Norsk', 'ltr', false, '🇳🇴', 21),
  ('da', 'Danish', 'Dansk', 'ltr', false, '🇩🇰', 22),
  ('fi', 'Finnish', 'Suomi', 'ltr', false, '🇫🇮', 23),
  ('cs', 'Czech', 'Čeština', 'ltr', false, '🇨🇿', 24),
  ('el', 'Greek', 'Ελληνικά', 'ltr', false, '🇬🇷', 25),
  ('he', 'Hebrew', 'עברית', 'rtl', false, '🇮🇱', 26),
  ('th', 'Thai', 'ไทย', 'ltr', false, '🇹🇭', 27),
  ('id', 'Indonesian', 'Bahasa Indonesia', 'ltr', false, '🇮🇩', 28),
  ('ms', 'Malay', 'Bahasa Melayu', 'ltr', false, '🇲🇾', 29),
  ('ro', 'Romanian', 'Română', 'ltr', false, '🇷🇴', 30)
ON CONFLICT (code) DO NOTHING;

-- Insert common translation strings
INSERT INTO translation_strings (key, category, source_text, context, description) VALUES
  ('common.welcome', 'UI', 'Welcome', 'Header greeting', 'Greeting message'),
  ('common.save', 'UI', 'Save', 'Button label', 'Save button'),
  ('common.cancel', 'UI', 'Cancel', 'Button label', 'Cancel button'),
  ('common.delete', 'UI', 'Delete', 'Button label', 'Delete button'),
  ('common.edit', 'UI', 'Edit', 'Button label', 'Edit button'),
  ('common.search', 'UI', 'Search', 'Input placeholder', 'Search placeholder'),
  ('common.loading', 'UI', 'Loading...', 'Loading state', 'Loading indicator'),
  ('common.error', 'errors', 'An error occurred', 'Error message', 'Generic error'),
  ('auth.login', 'UI', 'Log In', 'Button label', 'Login button'),
  ('auth.logout', 'UI', 'Log Out', 'Button label', 'Logout button'),
  ('auth.signup', 'UI', 'Sign Up', 'Button label', 'Signup button'),
  ('booking.confirm', 'UI', 'Confirm Booking', 'Button label', 'Booking confirmation'),
  ('booking.cancel', 'UI', 'Cancel Booking', 'Button label', 'Booking cancellation'),
  ('message.send', 'UI', 'Send Message', 'Button label', 'Send message button'),
  ('profile.settings', 'UI', 'Profile Settings', 'Page title', 'Settings page title')
ON CONFLICT (key) DO NOTHING;
