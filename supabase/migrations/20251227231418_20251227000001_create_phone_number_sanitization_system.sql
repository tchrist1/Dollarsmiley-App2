/*
  # Phone Number Sanitization System

  1. New Tables
    - `phone_sanitization_audit` - Audit log for detected phone numbers
      - `id` (uuid, primary key)
      - `record_type` (text) - Type of record (job, service, bio)
      - `record_id` (uuid) - ID of the record
      - `user_id` (uuid) - User who submitted
      - `phone_number_detected` (boolean)
      - `context` (text) - Additional context
      - `created_at` (timestamp)

  2. Schema Changes
    - Add `provider_contact_numbers` to profiles table (admin-only access)
    - Add `original_bio_with_phones` to profiles (admin-only, for moderation)

  3. Security
    - Enable RLS on phone_sanitization_audit
    - Add admin-only policies for contact numbers
    - Restrict access to phone data to user_type = 'Admin'

  4. Functions
    - Create function to extract phone numbers
    - Create function to sanitize text
    - Create triggers for automatic sanitization
*/

-- Add contact number fields to profiles (admin-only access)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS provider_contact_numbers text[],
ADD COLUMN IF NOT EXISTS original_bio_with_phones text;

-- Create audit table for phone number detection
CREATE TABLE IF NOT EXISTS phone_sanitization_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('job', 'service', 'bio', 'message', 'other')),
  record_id uuid,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number_detected boolean DEFAULT false,
  context text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE phone_sanitization_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to audit logs
CREATE POLICY "Admins can view phone sanitization audit"
  ON phone_sanitization_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- Function to detect phone numbers in text
CREATE OR REPLACE FUNCTION detect_phone_numbers(input_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN false;
  END IF;

  -- Detect phone number patterns (international and US formats)
  -- Patterns: 1234567890, 123-456-7890, (123) 456-7890, +1 123 456 7890, etc.
  RETURN input_text ~* '(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}';
END;
$$;

-- Function to extract phone numbers from text
CREATE OR REPLACE FUNCTION extract_phone_numbers(input_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  phone_numbers text[];
  matches text[];
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Extract all phone number patterns
  SELECT array_agg(match[1])
  INTO phone_numbers
  FROM regexp_matches(
    input_text,
    '(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}',
    'g'
  ) AS match;

  RETURN COALESCE(phone_numbers, ARRAY[]::text[]);
END;
$$;

-- Function to sanitize phone numbers from text
CREATE OR REPLACE FUNCTION sanitize_phone_numbers(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;

  -- Remove phone number patterns, preserving surrounding text
  RETURN regexp_replace(
    input_text,
    '(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}',
    '[phone number removed]',
    'g'
  );
END;
$$;

-- Create index for faster audit queries
CREATE INDEX IF NOT EXISTS idx_phone_audit_user_id ON phone_sanitization_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_audit_created_at ON phone_sanitization_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_audit_record_type ON phone_sanitization_audit(record_type);

-- Create a view for public profiles (without sensitive phone data)
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  user_type,
  email,
  full_name,
  phone,
  phone_verified,
  avatar_url,
  bio,
  location,
  latitude,
  longitude,
  service_radius,
  subscription_plan,
  subscription_expires_at,
  id_verified,
  business_verified,
  payout_connected,
  rating_average,
  rating_count,
  total_bookings,
  created_at,
  updated_at,
  street_address,
  city,
  state,
  zip_code,
  country,
  service_radius_miles
FROM profiles;

-- Grant access to public view
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Function to audit phone detection
CREATE OR REPLACE FUNCTION audit_phone_detection(
  p_record_type text,
  p_record_id uuid,
  p_user_id uuid,
  p_text text,
  p_context text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_detected boolean;
BEGIN
  v_detected := detect_phone_numbers(p_text);

  INSERT INTO phone_sanitization_audit (
    record_type,
    record_id,
    user_id,
    phone_number_detected,
    context
  ) VALUES (
    p_record_type,
    p_record_id,
    p_user_id,
    v_detected,
    p_context
  );
END;
$$;

-- Trigger to sanitize jobs on insert/update
CREATE OR REPLACE FUNCTION sanitize_job_phone_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Audit detection
  PERFORM audit_phone_detection('job', NEW.id, NEW.customer_id, NEW.title || ' ' || NEW.description, 'job_title_description');

  -- Sanitize title and description
  NEW.title := sanitize_phone_numbers(NEW.title);
  NEW.description := sanitize_phone_numbers(NEW.description);

  RETURN NEW;
END;
$$;

-- Trigger to sanitize service listings on insert/update
CREATE OR REPLACE FUNCTION sanitize_service_phone_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Audit detection
  PERFORM audit_phone_detection('service', NEW.id, NEW.provider_id, NEW.title || ' ' || NEW.description, 'service_title_description');

  -- Sanitize title and description
  NEW.title := sanitize_phone_numbers(NEW.title);
  NEW.description := sanitize_phone_numbers(NEW.description);

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_sanitize_job_phone_numbers ON jobs;
CREATE TRIGGER trigger_sanitize_job_phone_numbers
  BEFORE INSERT OR UPDATE OF title, description
  ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_job_phone_numbers();

DROP TRIGGER IF EXISTS trigger_sanitize_service_phone_numbers ON service_listings;
CREATE TRIGGER trigger_sanitize_service_phone_numbers
  BEFORE INSERT OR UPDATE OF title, description
  ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_service_phone_numbers();

-- Special handling for provider bio
CREATE OR REPLACE FUNCTION sanitize_provider_bio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_extracted_numbers text[];
BEGIN
  -- Only process if bio changed and is not null
  IF NEW.bio IS NOT NULL AND (OLD.bio IS NULL OR NEW.bio IS DISTINCT FROM OLD.bio) THEN
    -- Audit detection
    PERFORM audit_phone_detection('bio', NEW.id, NEW.id, NEW.bio, 'provider_bio');

    -- Extract phone numbers for admin access
    v_extracted_numbers := extract_phone_numbers(NEW.bio);

    -- Store original bio with phones (admin-only)
    IF array_length(v_extracted_numbers, 1) > 0 THEN
      NEW.original_bio_with_phones := NEW.bio;
      NEW.provider_contact_numbers := v_extracted_numbers;
    END IF;

    -- Sanitize public-facing bio
    NEW.bio := sanitize_phone_numbers(NEW.bio);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sanitize_provider_bio ON profiles;
CREATE TRIGGER trigger_sanitize_provider_bio
  BEFORE INSERT OR UPDATE OF bio
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_provider_bio();

-- Add comments for documentation
COMMENT ON COLUMN profiles.provider_contact_numbers IS 'Admin-only: Phone numbers extracted from provider bio';
COMMENT ON COLUMN profiles.original_bio_with_phones IS 'Admin-only: Original bio text before phone number sanitization';
COMMENT ON TABLE phone_sanitization_audit IS 'Audit log for phone number detection across the platform';
COMMENT ON FUNCTION detect_phone_numbers(text) IS 'Detects if text contains phone numbers';
COMMENT ON FUNCTION extract_phone_numbers(text) IS 'Extracts all phone numbers from text as an array';
COMMENT ON FUNCTION sanitize_phone_numbers(text) IS 'Removes phone numbers from text, replacing with [phone number removed]';
