/*
  # Provider Verification Workflow

  1. New Tables
    - `provider_verification_requests`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `verification_type` (text)
      - `status` (text)
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `reviewed_by` (uuid)
      - `rejection_reason` (text)
      - `admin_notes` (text)

  2. Updates to Existing Tables
    - Update verification_documents to link to requests
    - Add verification fields to profiles

  3. Security
    - RLS policies for verification workflow
*/

-- Create provider_verification_requests table
CREATE TABLE IF NOT EXISTS provider_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL DEFAULT 'Identity' CHECK (verification_type IN ('Identity', 'Business', 'Background', 'All')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'UnderReview', 'Approved', 'Rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  rejection_reason text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add request_id to verification_documents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_documents' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE verification_documents ADD COLUMN request_id uuid REFERENCES provider_verification_requests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add verification fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_status text DEFAULT 'Unverified' 
      CHECK (verification_status IN ('Unverified', 'Pending', 'Verified', 'Rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_provider_id ON provider_verification_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON provider_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_docs_request_id ON verification_documents(request_id);

-- Enable RLS
ALTER TABLE provider_verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_verification_requests

CREATE POLICY "Providers can view own verification requests"
  ON provider_verification_requests FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create own verification requests"
  ON provider_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own pending requests"
  ON provider_verification_requests FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid() AND status = 'Pending')
  WITH CHECK (provider_id = auth.uid());

-- Update existing verification_documents policies
DROP POLICY IF EXISTS "Users can view own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Users can upload verification documents" ON verification_documents;

CREATE POLICY "Providers can view own verification documents"
  ON verification_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers can upload verification documents"
  ON verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update profile verification status
CREATE OR REPLACE FUNCTION update_profile_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Approved' THEN
    UPDATE profiles
    SET 
      is_verified = true,
      verification_status = 'Verified',
      verified_at = now()
    WHERE id = NEW.provider_id;
  ELSIF NEW.status = 'Rejected' THEN
    UPDATE profiles
    SET 
      is_verified = false,
      verification_status = 'Rejected'
    WHERE id = NEW.provider_id;
  ELSIF NEW.status = 'UnderReview' THEN
    UPDATE profiles
    SET verification_status = 'Pending'
    WHERE id = NEW.provider_id;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile when verification status changes
DROP TRIGGER IF EXISTS update_profile_on_verification_status_change ON provider_verification_requests;
CREATE TRIGGER update_profile_on_verification_status_change
  BEFORE UPDATE ON provider_verification_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_profile_verification_status();
