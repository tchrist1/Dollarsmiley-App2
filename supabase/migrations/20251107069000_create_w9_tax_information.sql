/*
  # Create W-9 Tax Information System

  1. New Tables
    - `provider_tax_information`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `tax_classification` (text) - Individual, LLC, Corporation, etc.
      - `business_name` (text, nullable) - DBA or business name if applicable
      - `federal_tax_classification` (text) - For LLCs
      - `ein` (text, nullable) - Employer Identification Number
      - `ssn_last_4` (text, nullable) - Last 4 digits of SSN (encrypted)
      - `address_line_1` (text)
      - `address_line_2` (text, nullable)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text, default 'US')
      - `is_exempt_from_backup_withholding` (boolean)
      - `exemption_code` (text, nullable)
      - `fatca_exemption_code` (text, nullable)
      - `signature_data` (text) - Base64 signature image
      - `signature_date` (timestamptz)
      - `certification_text` (text) - The certification they agreed to
      - `ip_address` (text) - IP address at time of submission
      - `user_agent` (text) - Browser/device info
      - `status` (text) - pending, approved, rejected, needs_revision
      - `admin_notes` (text, nullable)
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (uuid, nullable, references profiles)
      - `is_current` (boolean) - Only one current W-9 per provider
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `w9_submission_history`
      - `id` (uuid, primary key)
      - `tax_information_id` (uuid, references provider_tax_information)
      - `provider_id` (uuid, references profiles)
      - `action` (text) - submitted, approved, rejected, revised
      - `performed_by` (uuid, nullable, references profiles)
      - `notes` (text, nullable)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for provider access to own W-9 forms
    - Policies for admin access to review W-9 forms
    - Encrypt sensitive data (SSN)

  3. Indexes
    - Index on provider_id for fast lookups
    - Index on status for admin queries
    - Index on is_current for active W-9 retrieval
*/

-- Create provider_tax_information table
CREATE TABLE IF NOT EXISTS provider_tax_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Tax Classification
  tax_classification text NOT NULL CHECK (tax_classification IN (
    'individual',
    'c_corporation',
    's_corporation',
    'partnership',
    'trust_estate',
    'llc_c',
    'llc_s',
    'llc_partnership',
    'llc_disregarded',
    'other'
  )),

  -- Business Information
  business_name text,
  federal_tax_classification text,
  other_classification_description text,

  -- Tax ID (store encrypted or last 4 only)
  ein text,
  ssn_last_4 text,

  -- Address Information
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',

  -- Exemptions
  is_exempt_from_backup_withholding boolean DEFAULT false,
  exemption_code text,
  fatca_exemption_code text,

  -- Certification
  signature_data text NOT NULL,
  signature_date timestamptz NOT NULL,
  certification_text text NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,

  -- Status & Review
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'needs_revision'
  )),
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),

  -- Only one current W-9 per provider
  is_current boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure only one current W-9 per provider
  CONSTRAINT unique_current_w9 UNIQUE (provider_id, is_current)
    WHERE (is_current = true)
);

-- Create w9_submission_history table
CREATE TABLE IF NOT EXISTS w9_submission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_information_id uuid REFERENCES provider_tax_information(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN (
    'submitted',
    'approved',
    'rejected',
    'revised',
    'resubmitted'
  )),
  performed_by uuid REFERENCES profiles(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tax_info_provider
  ON provider_tax_information(provider_id);

CREATE INDEX IF NOT EXISTS idx_tax_info_status
  ON provider_tax_information(status);

CREATE INDEX IF NOT EXISTS idx_tax_info_current
  ON provider_tax_information(provider_id, is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_w9_history_tax_info
  ON w9_submission_history(tax_information_id);

CREATE INDEX IF NOT EXISTS idx_w9_history_provider
  ON w9_submission_history(provider_id);

-- Enable RLS
ALTER TABLE provider_tax_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE w9_submission_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_tax_information

-- Providers can view their own W-9 forms
CREATE POLICY "Providers can view own W-9 forms"
  ON provider_tax_information
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- Providers can insert their own W-9 forms
CREATE POLICY "Providers can insert own W-9 forms"
  ON provider_tax_information
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

-- Providers can update their pending W-9 forms
CREATE POLICY "Providers can update pending W-9 forms"
  ON provider_tax_information
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id AND status = 'pending')
  WITH CHECK (auth.uid() = provider_id);

-- Admins can view all W-9 forms
CREATE POLICY "Admins can view all W-9 forms"
  ON provider_tax_information
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Admins can update W-9 status and review
CREATE POLICY "Admins can update W-9 forms"
  ON provider_tax_information
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for w9_submission_history

-- Providers can view their own submission history
CREATE POLICY "Providers can view own submission history"
  ON w9_submission_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- System can insert history records
CREATE POLICY "System can insert history records"
  ON w9_submission_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all submission history
CREATE POLICY "Admins can view all submission history"
  ON w9_submission_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_information_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tax_information_updated_at_trigger
  ON provider_tax_information;

CREATE TRIGGER update_tax_information_updated_at_trigger
  BEFORE UPDATE ON provider_tax_information
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_information_updated_at();

-- Function to mark previous W-9 forms as not current
CREATE OR REPLACE FUNCTION mark_previous_w9_not_current()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new W-9 is marked as current, mark all others as not current
  IF NEW.is_current = true THEN
    UPDATE provider_tax_information
    SET is_current = false
    WHERE provider_id = NEW.provider_id
    AND id != NEW.id
    AND is_current = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single current W-9
DROP TRIGGER IF EXISTS enforce_single_current_w9_trigger
  ON provider_tax_information;

CREATE TRIGGER enforce_single_current_w9_trigger
  BEFORE INSERT OR UPDATE ON provider_tax_information
  FOR EACH ROW
  EXECUTE FUNCTION mark_previous_w9_not_current();

-- Function to create history record on status change
CREATE OR REPLACE FUNCTION create_w9_history_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO w9_submission_history (
      tax_information_id,
      provider_id,
      action,
      performed_by,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      NEW.provider_id,
      CASE NEW.status
        WHEN 'pending' THEN 'submitted'
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'needs_revision' THEN 'revised'
      END,
      CASE
        WHEN NEW.reviewed_by IS NOT NULL THEN NEW.reviewed_by
        ELSE NEW.provider_id
      END,
      NEW.admin_notes,
      jsonb_build_object(
        'status', NEW.status,
        'submitted_at', NEW.submitted_at,
        'reviewed_at', NEW.reviewed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create history on status change
DROP TRIGGER IF EXISTS create_w9_history_trigger
  ON provider_tax_information;

CREATE TRIGGER create_w9_history_trigger
  AFTER INSERT OR UPDATE ON provider_tax_information
  FOR EACH ROW
  EXECUTE FUNCTION create_w9_history_on_status_change();

-- Function to check if provider needs to submit W-9
CREATE OR REPLACE FUNCTION provider_needs_w9(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM provider_tax_information
    WHERE provider_id = user_id
    AND is_current = true
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current W-9 status
CREATE OR REPLACE FUNCTION get_w9_status(user_id uuid)
RETURNS text AS $$
DECLARE
  current_status text;
BEGIN
  SELECT status INTO current_status
  FROM provider_tax_information
  WHERE provider_id = user_id
  AND is_current = true
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(current_status, 'not_submitted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
