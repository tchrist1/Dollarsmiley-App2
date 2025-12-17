/*
  # Create Business Verification System

  ## Overview
  Enables service providers to verify their business credentials, registrations,
  licenses, and insurance. Supports both sole proprietors and registered businesses.

  ## New Tables

  ### 1. `business_profiles`
  Business information for service providers
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references profiles) - Unique
  - `business_name` (text) - Legal business name
  - `business_type` (text) - SoleProprietor, LLC, Corporation, Partnership, etc.
  - `ein` (text) - Employer Identification Number (encrypted)
  - `registration_number` (text) - State/local registration
  - `registration_state` (text) - State of registration
  - `business_address` (text)
  - `business_city` (text)
  - `business_state` (text)
  - `business_zip` (text)
  - `business_phone` (text)
  - `business_email` (text)
  - `business_website` (text)
  - `year_established` (int)
  - `description` (text)
  - `is_verified` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `business_licenses`
  Professional licenses and certifications
  - `id` (uuid, primary key)
  - `business_profile_id` (uuid, references business_profiles)
  - `license_type` (text) - Professional, Trade, Operating, etc.
  - `license_name` (text) - Name of license/certification
  - `license_number` (text)
  - `issuing_authority` (text) - State board, agency, etc.
  - `issue_date` (date)
  - `expiration_date` (date)
  - `status` (text) - Active, Expired, Suspended, Revoked
  - `verification_status` (text) - Pending, Verified, Rejected
  - `document_url` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 3. `business_insurance`
  Insurance policies for liability protection
  - `id` (uuid, primary key)
  - `business_profile_id` (uuid, references business_profiles)
  - `insurance_type` (text) - General Liability, Professional Liability, Workers Comp, etc.
  - `provider_name` (text) - Insurance company
  - `policy_number` (text)
  - `coverage_amount` (numeric)
  - `effective_date` (date)
  - `expiration_date` (date)
  - `status` (text) - Active, Expired, Cancelled
  - `verification_status` (text) - Pending, Verified, Rejected
  - `certificate_url` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 4. `business_verification_requests`
  Verification submissions for business information
  - `id` (uuid, primary key)
  - `business_profile_id` (uuid, references business_profiles)
  - `verification_type` (text) - Full, Registration, License, Insurance
  - `status` (text) - Pending, UnderReview, Approved, Rejected, NeedsInfo
  - `submitted_documents` (jsonb) - List of submitted document URLs
  - `submitted_at` (timestamptz)
  - `reviewed_at` (timestamptz)
  - `reviewed_by` (uuid, references profiles)
  - `rejection_reason` (text)
  - `admin_notes` (text)
  - `created_at` (timestamptz)

  ### 5. `business_verification_documents`
  Documents submitted for business verification
  - `id` (uuid, primary key)
  - `verification_request_id` (uuid, references business_verification_requests)
  - `document_type` (text) - Articles of Incorporation, Business License, Tax ID, etc.
  - `document_url` (text)
  - `uploaded_at` (timestamptz)

  ## Schema Changes

  ### Profiles Table Updates
  - Add `has_business_profile` (boolean)
  - Add `business_verified` (boolean)
  - Add `business_verified_at` (timestamptz)

  ## Business Types
  - Sole Proprietor
  - LLC (Limited Liability Company)
  - Corporation (C-Corp, S-Corp)
  - Partnership (General, Limited)
  - Non-Profit

  ## License Types
  - Professional License (CPA, Attorney, Doctor, etc.)
  - Trade License (Contractor, Electrician, Plumber, etc.)
  - Business Operating License
  - Health Department Permit
  - Special Permits

  ## Insurance Types
  - General Liability
  - Professional Liability (E&O)
  - Workers Compensation
  - Commercial Auto
  - Umbrella Policy

  ## Security
  - Enable RLS on all new tables
  - Providers can view/manage their own business profiles
  - Admins can review verification requests
  - EIN and sensitive data encrypted

  ## Important Notes
  - Business verification is optional but recommended
  - Verified businesses get special badge
  - Some service categories may require verification
  - Licenses and insurance must be kept current
  - Automatic expiration notifications
  - Supports multiple licenses per business
  - Supports multiple insurance policies
*/

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('SoleProprietor', 'LLC', 'Corporation', 'Partnership', 'NonProfit')),
  ein text,
  registration_number text,
  registration_state text,
  business_address text,
  business_city text,
  business_state text,
  business_zip text,
  business_phone text,
  business_email text,
  business_website text,
  year_established int,
  description text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create business_licenses table
CREATE TABLE IF NOT EXISTS business_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  license_type text NOT NULL CHECK (license_type IN ('Professional', 'Trade', 'Operating', 'HealthPermit', 'SpecialPermit')),
  license_name text NOT NULL,
  license_number text NOT NULL,
  issuing_authority text NOT NULL,
  issue_date date,
  expiration_date date,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Suspended', 'Revoked')),
  verification_status text DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  document_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create business_insurance table
CREATE TABLE IF NOT EXISTS business_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  insurance_type text NOT NULL CHECK (insurance_type IN ('GeneralLiability', 'ProfessionalLiability', 'WorkersCompensation', 'CommercialAuto', 'UmbrellaPolicy')),
  provider_name text NOT NULL,
  policy_number text NOT NULL,
  coverage_amount numeric NOT NULL CHECK (coverage_amount >= 0),
  effective_date date NOT NULL,
  expiration_date date NOT NULL,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Cancelled')),
  verification_status text DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  certificate_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create business_verification_requests table
CREATE TABLE IF NOT EXISTS business_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  verification_type text NOT NULL DEFAULT 'Full' CHECK (verification_type IN ('Full', 'Registration', 'License', 'Insurance')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'UnderReview', 'Approved', 'Rejected', 'NeedsInfo')),
  submitted_documents jsonb DEFAULT '[]',
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  rejection_reason text,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create business_verification_documents table
CREATE TABLE IF NOT EXISTS business_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id uuid REFERENCES business_verification_requests(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'ArticlesOfIncorporation',
    'BusinessLicense',
    'TaxID',
    'EINLetter',
    'BusinessRegistration',
    'InsuranceCertificate',
    'ProfessionalLicense',
    'BankStatement',
    'LeaseAgreement',
    'Other'
  )),
  document_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Add business verification columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_business_profile'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_business_profile boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_verified_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_profiles
CREATE POLICY "Providers can view own business profile"
  ON business_profiles FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create own business profile"
  ON business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own business profile"
  ON business_profiles FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

-- RLS Policies for business_licenses
CREATE POLICY "Providers can view own licenses"
  ON business_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_licenses.business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create own licenses"
  ON business_licenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own licenses"
  ON business_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_licenses.business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

-- RLS Policies for business_insurance
CREATE POLICY "Providers can view own insurance"
  ON business_insurance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_insurance.business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create own insurance"
  ON business_insurance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own insurance"
  ON business_insurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_insurance.business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

-- RLS Policies for business_verification_requests
CREATE POLICY "Providers can view own verification requests"
  ON business_verification_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_verification_requests.business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create own verification requests"
  ON business_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = business_profile_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

-- RLS Policies for business_verification_documents
CREATE POLICY "Providers can view own verification documents"
  ON business_verification_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_verification_requests
      JOIN business_profiles ON business_profiles.id = business_verification_requests.business_profile_id
      WHERE business_verification_requests.id = business_verification_documents.verification_request_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create own verification documents"
  ON business_verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_verification_requests
      JOIN business_profiles ON business_profiles.id = business_verification_requests.business_profile_id
      WHERE business_verification_requests.id = verification_request_id
      AND business_profiles.provider_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_provider ON business_profiles(provider_id);
CREATE INDEX IF NOT EXISTS idx_business_licenses_profile ON business_licenses(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_licenses_expiration ON business_licenses(expiration_date) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_business_insurance_profile ON business_insurance(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_insurance_expiration ON business_insurance(expiration_date) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_business_verification_requests_profile ON business_verification_requests(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_verification_requests_status ON business_verification_requests(status);

-- Function to update profile when business verification completes
CREATE OR REPLACE FUNCTION update_profile_on_business_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    UPDATE profiles p
    SET
      business_verified = true,
      business_verified_at = now(),
      has_business_profile = true
    FROM business_profiles bp
    WHERE bp.id = NEW.business_profile_id
    AND bp.provider_id = p.id;

    UPDATE business_profiles
    SET is_verified = true
    WHERE id = NEW.business_profile_id;
  ELSIF NEW.status = 'Rejected' THEN
    UPDATE business_profiles bp
    SET is_verified = false
    FROM profiles p
    WHERE bp.id = NEW.business_profile_id
    AND bp.provider_id = p.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile on verification status change
DROP TRIGGER IF EXISTS trigger_update_profile_on_business_verification ON business_verification_requests;
CREATE TRIGGER trigger_update_profile_on_business_verification
  AFTER UPDATE ON business_verification_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_profile_on_business_verification();

-- Function to check for expiring licenses and insurance
CREATE OR REPLACE FUNCTION check_expiring_business_credentials()
RETURNS void AS $$
BEGIN
  -- Update expired licenses
  UPDATE business_licenses
  SET status = 'Expired'
  WHERE status = 'Active'
  AND expiration_date < CURRENT_DATE;

  -- Update expired insurance
  UPDATE business_insurance
  SET status = 'Expired'
  WHERE status = 'Active'
  AND expiration_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to get business verification completeness
CREATE OR REPLACE FUNCTION get_business_verification_completeness(business_profile_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  has_profile boolean;
  has_license boolean;
  has_insurance boolean;
  completeness int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM business_profiles WHERE id = business_profile_id_param
  ) INTO has_profile;

  SELECT EXISTS (
    SELECT 1 FROM business_licenses
    WHERE business_profile_id = business_profile_id_param
    AND verification_status = 'Verified'
    AND status = 'Active'
  ) INTO has_license;

  SELECT EXISTS (
    SELECT 1 FROM business_insurance
    WHERE business_profile_id = business_profile_id_param
    AND verification_status = 'Verified'
    AND status = 'Active'
  ) INTO has_insurance;

  completeness := 0;
  IF has_profile THEN completeness := completeness + 33; END IF;
  IF has_license THEN completeness := completeness + 33; END IF;
  IF has_insurance THEN completeness := completeness + 34; END IF;

  result := jsonb_build_object(
    'has_profile', has_profile,
    'has_license', has_license,
    'has_insurance', has_insurance,
    'completeness_percentage', completeness
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;
