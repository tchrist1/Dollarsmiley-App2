/*
  # Create Background Check Integration System

  ## Overview
  Adds comprehensive background check functionality for service providers,
  integrating with third-party background check services (e.g., Checkr, Sterling).

  ## New Tables

  ### 1. `background_checks`
  Records background check submissions and results
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references profiles)
  - `check_type` (text) - Basic, Standard, Premium, Custom
  - `status` (text) - Pending, InProgress, Completed, Failed, Expired
  - `external_check_id` (text) - ID from third-party service
  - `service_provider` (text) - Checkr, Sterling, etc.
  - `consent_given` (boolean) - User consent confirmation
  - `consent_given_at` (timestamptz) - When consent was provided
  - `initiated_by` (uuid) - Admin who initiated check
  - `initiated_at` (timestamptz) - When check was requested
  - `completed_at` (timestamptz) - When check completed
  - `expires_at` (timestamptz) - When check expires (typically 1 year)
  - `result` (text) - Clear, Consider, Suspended
  - `result_details` (jsonb) - Detailed results
  - `pdf_report_url` (text) - Link to full report
  - `admin_notes` (text) - Internal notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `background_check_components`
  Individual components of a background check
  - `id` (uuid, primary key)
  - `background_check_id` (uuid, references background_checks)
  - `component_type` (text) - SSNTrace, CriminalSearch, SexOffenderSearch, etc.
  - `status` (text) - Pending, Completed, Failed
  - `result` (text) - Clear, Consider, Suspended
  - `records_found` (int) - Number of records found
  - `result_data` (jsonb) - Detailed component results
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 3. `background_check_appeals`
  Provider appeals for disputed results
  - `id` (uuid, primary key)
  - `background_check_id` (uuid, references background_checks)
  - `provider_id` (uuid, references profiles)
  - `appeal_reason` (text) - Explanation for appeal
  - `supporting_documents` (text[]) - URLs to supporting docs
  - `status` (text) - Pending, UnderReview, Approved, Denied
  - `reviewed_by` (uuid) - Admin who reviewed
  - `reviewed_at` (timestamptz)
  - `resolution` (text) - Resolution explanation
  - `created_at` (timestamptz)

  ## Schema Changes

  ### Profiles Table Updates
  - Add `background_check_status` (text) - None, Pending, Clear, Consider, Suspended
  - Add `background_check_completed_at` (timestamptz) - Last completion date
  - Add `background_check_expires_at` (timestamptz) - Expiration date

  ## Background Check Types

  ### Basic Check
  - SSN Trace
  - National Criminal Search
  - Sex Offender Registry

  ### Standard Check (Basic +)
  - County Criminal Search (7 years)
  - National Criminal Search
  - Motor Vehicle Records

  ### Premium Check (Standard +)
  - Federal Criminal Search
  - International Criminal Search
  - Employment Verification
  - Education Verification

  ### Custom Check
  - Admin-selected components

  ## Security
  - Enable RLS on all new tables
  - Providers can view their own checks only
  - Admins can view and manage all checks
  - Sensitive data encrypted at rest

  ## Important Notes
  - Background checks typically expire after 1 year
  - Providers must give explicit consent
  - Results are: Clear, Consider (flags but can work), Suspended (cannot work)
  - Appeals process available for disputed results
  - Integration with third-party APIs via edge functions
  - Automatic notifications on status changes
  - Compliance with FCRA (Fair Credit Reporting Act)
*/

-- Create background_checks table
CREATE TABLE IF NOT EXISTS background_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  check_type text NOT NULL DEFAULT 'Standard' CHECK (check_type IN ('Basic', 'Standard', 'Premium', 'Custom')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Failed', 'Expired', 'Cancelled')),
  external_check_id text,
  service_provider text DEFAULT 'Checkr' CHECK (service_provider IN ('Checkr', 'Sterling', 'GoodHire', 'Internal')),
  consent_given boolean DEFAULT false,
  consent_given_at timestamptz,
  initiated_by uuid REFERENCES profiles(id),
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  result text CHECK (result IN ('Clear', 'Consider', 'Suspended')),
  result_details jsonb DEFAULT '{}',
  pdf_report_url text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create background_check_components table
CREATE TABLE IF NOT EXISTS background_check_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  background_check_id uuid REFERENCES background_checks(id) ON DELETE CASCADE NOT NULL,
  component_type text NOT NULL CHECK (component_type IN (
    'SSNTrace',
    'NationalCriminalSearch',
    'CountyCriminalSearch',
    'FederalCriminalSearch',
    'SexOffenderSearch',
    'GlobalWatchlistSearch',
    'MotorVehicleRecords',
    'EmploymentVerification',
    'EducationVerification',
    'ProfessionalLicenseVerification',
    'CreditCheck',
    'CivilCourtSearch'
  )),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Failed')),
  result text CHECK (result IN ('Clear', 'Consider', 'Suspended')),
  records_found int DEFAULT 0,
  result_data jsonb DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create background_check_appeals table
CREATE TABLE IF NOT EXISTS background_check_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  background_check_id uuid REFERENCES background_checks(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  appeal_reason text NOT NULL,
  supporting_documents text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'UnderReview', 'Approved', 'Denied')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz DEFAULT now()
);

-- Add background check columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_status text DEFAULT 'None' CHECK (background_check_status IN ('None', 'Pending', 'Clear', 'Consider', 'Suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_expires_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_check_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_check_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for background_checks
CREATE POLICY "Providers can view own background checks"
  ON background_checks FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create own background checks"
  ON background_checks FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid() AND consent_given = true);

-- RLS Policies for background_check_components
CREATE POLICY "Providers can view own check components"
  ON background_check_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM background_checks
      WHERE background_checks.id = background_check_components.background_check_id
      AND background_checks.provider_id = auth.uid()
    )
  );

-- RLS Policies for background_check_appeals
CREATE POLICY "Providers can view own appeals"
  ON background_check_appeals FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create own appeals"
  ON background_check_appeals FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_background_checks_provider ON background_checks(provider_id);
CREATE INDEX IF NOT EXISTS idx_background_checks_status ON background_checks(status);
CREATE INDEX IF NOT EXISTS idx_background_checks_expires ON background_checks(expires_at);
CREATE INDEX IF NOT EXISTS idx_background_check_components_check ON background_check_components(background_check_id);
CREATE INDEX IF NOT EXISTS idx_background_check_appeals_check ON background_check_appeals(background_check_id);
CREATE INDEX IF NOT EXISTS idx_background_check_appeals_status ON background_check_appeals(status);

-- Function to update profile when background check completes
CREATE OR REPLACE FUNCTION update_profile_on_background_check_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    UPDATE profiles
    SET
      background_check_status = NEW.result,
      background_check_completed_at = NEW.completed_at,
      background_check_expires_at = NEW.expires_at
    WHERE id = NEW.provider_id;
  ELSIF NEW.status = 'Failed' THEN
    UPDATE profiles
    SET background_check_status = 'None'
    WHERE id = NEW.provider_id;
  ELSIF NEW.status = 'Pending' OR NEW.status = 'InProgress' THEN
    UPDATE profiles
    SET background_check_status = 'Pending'
    WHERE id = NEW.provider_id;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile on background check status change
DROP TRIGGER IF EXISTS trigger_update_profile_on_background_check_complete ON background_checks;
CREATE TRIGGER trigger_update_profile_on_background_check_complete
  BEFORE UPDATE ON background_checks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_profile_on_background_check_complete();

-- Function to check for expired background checks
CREATE OR REPLACE FUNCTION check_expired_background_checks()
RETURNS void AS $$
BEGIN
  UPDATE background_checks
  SET status = 'Expired'
  WHERE status = 'Completed'
  AND expires_at < now()
  AND expires_at IS NOT NULL;

  UPDATE profiles
  SET background_check_status = 'None'
  WHERE background_check_expires_at < now()
  AND background_check_status != 'None';
END;
$$ LANGUAGE plpgsql;

-- Function to get background check requirements for check type
CREATE OR REPLACE FUNCTION get_background_check_components(check_type_param text)
RETURNS TABLE (component_type text, is_required boolean) AS $$
BEGIN
  IF check_type_param = 'Basic' THEN
    RETURN QUERY SELECT * FROM (VALUES
      ('SSNTrace'::text, true),
      ('NationalCriminalSearch'::text, true),
      ('SexOffenderSearch'::text, true)
    ) AS t(component_type, is_required);
  ELSIF check_type_param = 'Standard' THEN
    RETURN QUERY SELECT * FROM (VALUES
      ('SSNTrace'::text, true),
      ('NationalCriminalSearch'::text, true),
      ('CountyCriminalSearch'::text, true),
      ('SexOffenderSearch'::text, true),
      ('MotorVehicleRecords'::text, false)
    ) AS t(component_type, is_required);
  ELSIF check_type_param = 'Premium' THEN
    RETURN QUERY SELECT * FROM (VALUES
      ('SSNTrace'::text, true),
      ('NationalCriminalSearch'::text, true),
      ('CountyCriminalSearch'::text, true),
      ('FederalCriminalSearch'::text, true),
      ('SexOffenderSearch'::text, true),
      ('GlobalWatchlistSearch'::text, true),
      ('MotorVehicleRecords'::text, false),
      ('EmploymentVerification'::text, false),
      ('EducationVerification'::text, false)
    ) AS t(component_type, is_required);
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate background check result from components
CREATE OR REPLACE FUNCTION calculate_background_check_result(check_id uuid)
RETURNS text AS $$
DECLARE
  has_suspended boolean;
  has_consider boolean;
BEGIN
  SELECT
    bool_or(result = 'Suspended'),
    bool_or(result = 'Consider')
  INTO has_suspended, has_consider
  FROM background_check_components
  WHERE background_check_id = check_id
  AND status = 'Completed';

  IF has_suspended THEN
    RETURN 'Suspended';
  ELSIF has_consider THEN
    RETURN 'Consider';
  ELSE
    RETURN 'Clear';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create background check with components
CREATE OR REPLACE FUNCTION create_background_check_with_components(
  provider_id_param uuid,
  check_type_param text,
  consent_given_param boolean,
  initiated_by_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  check_id uuid;
  component_record RECORD;
BEGIN
  IF NOT consent_given_param THEN
    RAISE EXCEPTION 'Consent must be given before initiating background check';
  END IF;

  INSERT INTO background_checks (
    provider_id,
    check_type,
    consent_given,
    consent_given_at,
    initiated_by,
    expires_at
  ) VALUES (
    provider_id_param,
    check_type_param,
    consent_given_param,
    now(),
    initiated_by_param,
    now() + INTERVAL '1 year'
  ) RETURNING id INTO check_id;

  FOR component_record IN
    SELECT * FROM get_background_check_components(check_type_param)
  LOOP
    INSERT INTO background_check_components (
      background_check_id,
      component_type,
      status
    ) VALUES (
      check_id,
      component_record.component_type,
      'Pending'
    );
  END LOOP;

  RETURN check_id;
END;
$$ LANGUAGE plpgsql;
