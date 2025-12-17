/*
  # Automated Verification Checks

  1. New Tables
    - `verification_checks` - Automated verification check results
      - `id` (uuid, primary key)
      - `request_id` (uuid, references provider_verification_requests)
      - `check_type` (text) - DocumentQuality, FaceMatch, DuplicateCheck, etc.
      - `status` (text) - Passed, Failed, Manual
      - `confidence_score` (numeric)
      - `details` (jsonb)
      - `created_at` (timestamptz)

  2. Functions
    - Function to run automated checks on new verification requests
    - Function to calculate verification risk score

  3. Security
    - Enable RLS on verification_checks table
    - Add policies for admin access
*/

-- Create verification_checks table
CREATE TABLE IF NOT EXISTS verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES provider_verification_requests(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('DocumentQuality', 'DocumentExpiry', 'DuplicateCheck', 'BlacklistCheck', 'ManualReview')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Passed', 'Failed', 'Manual')),
  confidence_score numeric(5, 2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_checks_request_id ON verification_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_verification_checks_status ON verification_checks(status);
CREATE INDEX IF NOT EXISTS idx_verification_checks_check_type ON verification_checks(check_type);

-- Enable RLS
ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all verification checks"
  ON verification_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Providers can view own verification checks"
  ON verification_checks FOR SELECT
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM provider_verification_requests
      WHERE provider_id = auth.uid()
    )
  );

-- Function to run automated checks on verification request
CREATE OR REPLACE FUNCTION run_automated_verification_checks(p_request_id uuid)
RETURNS void AS $$
DECLARE
  v_provider_id uuid;
  v_document_count integer;
  v_duplicate_count integer;
  v_risk_score numeric := 0;
BEGIN
  SELECT provider_id INTO v_provider_id
  FROM provider_verification_requests
  WHERE id = p_request_id;

  SELECT COUNT(*) INTO v_document_count
  FROM verification_documents
  WHERE request_id = p_request_id;

  IF v_document_count = 0 THEN
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DocumentQuality',
      'Failed',
      0,
      jsonb_build_object('reason', 'No documents uploaded')
    );
    RETURN;
  END IF;

  IF v_document_count < 2 THEN
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DocumentQuality',
      'Manual',
      50,
      jsonb_build_object('reason', 'Insufficient documents', 'count', v_document_count)
    );
    v_risk_score := v_risk_score + 30;
  ELSE
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DocumentQuality',
      'Passed',
      90,
      jsonb_build_object('reason', 'Sufficient documents', 'count', v_document_count)
    );
    v_risk_score := v_risk_score + 10;
  END IF;

  SELECT COUNT(*) INTO v_duplicate_count
  FROM provider_verification_requests
  WHERE provider_id = v_provider_id
    AND id != p_request_id
    AND status IN ('Rejected', 'Approved');

  IF v_duplicate_count >= 3 THEN
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DuplicateCheck',
      'Manual',
      40,
      jsonb_build_object('reason', 'Multiple previous submissions', 'count', v_duplicate_count)
    );
    v_risk_score := v_risk_score + 40;
  ELSIF v_duplicate_count >= 1 THEN
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DuplicateCheck',
      'Manual',
      60,
      jsonb_build_object('reason', 'Previous submissions found', 'count', v_duplicate_count)
    );
    v_risk_score := v_risk_score + 20;
  ELSE
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'DuplicateCheck',
      'Passed',
      100,
      jsonb_build_object('reason', 'First submission')
    );
  END IF;

  IF v_risk_score >= 50 THEN
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'ManualReview',
      'Manual',
      100 - v_risk_score,
      jsonb_build_object('reason', 'High risk score requires manual review', 'risk_score', v_risk_score)
    );
  ELSE
    INSERT INTO verification_checks (request_id, check_type, status, confidence_score, details)
    VALUES (
      p_request_id,
      'ManualReview',
      'Passed',
      100 - v_risk_score,
      jsonb_build_object('reason', 'Low risk, standard review', 'risk_score', v_risk_score)
    );
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Function to calculate overall verification risk score
CREATE OR REPLACE FUNCTION calculate_verification_risk_score(p_request_id uuid)
RETURNS numeric AS $$
DECLARE
  v_risk_score numeric := 0;
  v_check RECORD;
BEGIN
  FOR v_check IN
    SELECT check_type, status, confidence_score
    FROM verification_checks
    WHERE request_id = p_request_id
  LOOP
    IF v_check.status = 'Failed' THEN
      v_risk_score := v_risk_score + 50;
    ELSIF v_check.status = 'Manual' THEN
      v_risk_score := v_risk_score + (100 - v_check.confidence_score) * 0.5;
    END IF;
  END LOOP;

  RETURN LEAST(v_risk_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to run automated checks on new verification requests
CREATE OR REPLACE FUNCTION trigger_automated_checks()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM run_automated_verification_checks(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS run_checks_on_verification_insert ON provider_verification_requests;
CREATE TRIGGER run_checks_on_verification_insert
  AFTER INSERT ON provider_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automated_checks();

-- Add risk_score column to provider_verification_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_verification_requests' AND column_name = 'risk_score'
  ) THEN
    ALTER TABLE provider_verification_requests ADD COLUMN risk_score numeric(5, 2) DEFAULT 0.00;
  END IF;
END $$;

-- Function to update risk score when checks are completed
CREATE OR REPLACE FUNCTION update_verification_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE provider_verification_requests
  SET risk_score = calculate_verification_risk_score(NEW.request_id)
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_risk_score_on_check ON verification_checks;
CREATE TRIGGER update_risk_score_on_check
  AFTER INSERT OR UPDATE ON verification_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_risk_score();
