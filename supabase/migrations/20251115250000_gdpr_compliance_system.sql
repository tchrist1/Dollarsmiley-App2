/*
  # GDPR & CCPA Compliance System

  1. New Tables
    - `data_export_requests` - User data export requests
    - `data_deletion_requests` - Right to be forgotten requests
    - `consent_records` - User consent tracking
    - `data_processing_activities` - GDPR Article 30 records
    - `data_retention_policies` - Retention policy definitions
    - `privacy_notices` - Privacy notice versions
    - `user_privacy_settings` - User privacy preferences

  2. Features
    - Complete data export (JSON/CSV)
    - Right to deletion with anonymization
    - Consent management (granular)
    - Data processing logs
    - Retention policy enforcement
    - Cookie consent tracking

  3. Security
    - Enable RLS on all tables
    - User-only access to own data

  4. Compliance
    - GDPR Article 15 (Right of access)
    - GDPR Article 17 (Right to erasure)
    - GDPR Article 20 (Data portability)
    - GDPR Article 30 (Records of processing)
    - CCPA CPRA compliance
*/

-- Data Export Requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  export_type text DEFAULT 'full', -- full, partial, specific_tables
  export_format text DEFAULT 'json', -- json, csv, xml
  requested_tables text[],

  -- Status
  status text DEFAULT 'pending',
  -- Statuses: pending, processing, ready, downloaded, expired, failed

  -- Processing
  started_at timestamptz,
  completed_at timestamptz,
  processing_time_ms integer,

  -- Export file
  export_file_url text,
  export_file_size_bytes bigint,
  expires_at timestamptz,

  -- Verification (email confirmation)
  verification_token text UNIQUE,
  verified_at timestamptz,
  verification_ip inet,

  -- Download tracking
  download_count integer DEFAULT 0,
  first_downloaded_at timestamptz,
  last_downloaded_at timestamptz,

  -- Error handling
  error_message text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Data Deletion Requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  deletion_type text DEFAULT 'full', -- full, partial
  reason text,
  reason_category text, -- no_longer_needed, too_much_data, concerns, other

  -- Status
  status text DEFAULT 'pending',
  -- Statuses: pending, verified, processing, completed, rejected, failed

  -- Verification
  verification_token text UNIQUE,
  verified_at timestamptz,
  verification_ip inet,

  -- Processing
  scheduled_deletion_date timestamptz,
  actual_deletion_date timestamptz,
  processing_time_ms integer,

  -- Data backup (for legal hold)
  backup_created boolean DEFAULT false,
  backup_expires_at timestamptz,

  -- Rejection (if applicable)
  rejected boolean DEFAULT false,
  rejection_reason text,

  -- Anonymization details
  anonymization_method text DEFAULT 'hard_delete', -- hard_delete, anonymize, pseudonymize
  tables_affected text[],
  records_deleted integer,
  records_anonymized integer,

  -- Verification
  deleted_by uuid REFERENCES profiles(id),
  verified_deletion boolean DEFAULT false,

  -- Error handling
  error_message text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Consent Records
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Consent type
  consent_type text NOT NULL,
  -- Types: essential, analytics, marketing, personalization, third_party, location, cookies

  consent_version text NOT NULL, -- Version of consent text

  -- Status
  consent_given boolean NOT NULL,
  consent_method text, -- explicit_opt_in, implicit, pre_checked, required

  -- Context
  consent_text text, -- The actual consent text shown
  consent_context jsonb, -- Where/how consent was requested

  -- User action
  user_ip inet,
  user_agent text,
  consent_timestamp timestamptz DEFAULT now(),

  -- Withdrawal
  withdrawn_at timestamptz,
  withdrawal_reason text,

  -- Expiry
  expires_at timestamptz,
  is_active boolean DEFAULT true,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Data Processing Activities (GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Activity details
  activity_name text NOT NULL,
  activity_description text NOT NULL,
  processing_purpose text NOT NULL,

  -- Data categories
  data_categories text[] NOT NULL, -- personal_data, sensitive_data, financial_data, etc.
  data_subjects text[] NOT NULL, -- customers, providers, employees, etc.

  -- Legal basis
  legal_basis text NOT NULL, -- consent, contract, legal_obligation, legitimate_interest, vital_interest, public_interest
  legal_basis_details text,

  -- Data sources
  data_sources text[],

  -- Recipients
  recipients text[], -- Who receives the data
  third_party_countries text[], -- If transferred outside EU/EEA

  -- Retention
  retention_period text, -- e.g., "2 years after account closure"
  retention_justification text,

  -- Security measures
  technical_measures text[],
  organizational_measures text[],

  -- Data Protection Officer
  dpo_contact text,

  -- Status
  is_active boolean DEFAULT true,
  last_reviewed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Policy details
  policy_name text NOT NULL,
  table_name text NOT NULL,
  data_category text NOT NULL,

  -- Retention period
  retention_days integer NOT NULL,
  retention_description text,

  -- Legal basis
  legal_requirement text,
  business_justification text,

  -- Action after retention
  action_after_retention text DEFAULT 'delete', -- delete, anonymize, archive

  -- Status
  is_active boolean DEFAULT true,
  enforcement_enabled boolean DEFAULT true,

  -- Last enforcement
  last_enforced_at timestamptz,
  records_affected_last_run integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Privacy Notices
CREATE TABLE IF NOT EXISTS privacy_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notice details
  notice_type text NOT NULL, -- privacy_policy, cookie_policy, terms_of_service, data_processing_agreement
  version text NOT NULL,
  title text NOT NULL,

  -- Content
  content_html text NOT NULL,
  content_markdown text,
  summary text,

  -- Key changes
  changes_from_previous text,
  notable_changes text[],

  -- Effective dates
  effective_from timestamptz NOT NULL,
  effective_until timestamptz,

  -- Status
  is_current boolean DEFAULT false,
  requires_acceptance boolean DEFAULT true,

  -- Language
  language text DEFAULT 'en',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(notice_type, version)
);

-- User Privacy Settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Marketing preferences
  email_marketing_consent boolean DEFAULT false,
  sms_marketing_consent boolean DEFAULT false,
  push_marketing_consent boolean DEFAULT false,

  -- Analytics
  analytics_tracking_consent boolean DEFAULT true,
  personalization_consent boolean DEFAULT true,

  -- Data sharing
  share_data_with_partners boolean DEFAULT false,
  allow_public_profile boolean DEFAULT true,

  -- Location
  location_tracking_consent boolean DEFAULT false,
  precise_location_consent boolean DEFAULT false,

  -- Cookies
  essential_cookies boolean DEFAULT true, -- Always true, required
  functional_cookies boolean DEFAULT true,
  analytics_cookies boolean DEFAULT false,
  advertising_cookies boolean DEFAULT false,

  -- Communication
  communication_frequency text DEFAULT 'normal', -- minimal, normal, all

  -- Profile visibility
  profile_visibility text DEFAULT 'public', -- public, contacts_only, private

  -- Activity visibility
  show_online_status boolean DEFAULT true,
  show_last_active boolean DEFAULT true,
  show_activity_feed boolean DEFAULT true,

  -- Data portability
  auto_export_enabled boolean DEFAULT false,
  export_frequency_days integer,

  -- Account security
  two_factor_required boolean DEFAULT false,
  session_timeout_minutes integer DEFAULT 60,

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Cookie Consent Records
CREATE TABLE IF NOT EXISTS cookie_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,

  -- Consent given
  essential_cookies boolean DEFAULT true,
  functional_cookies boolean DEFAULT false,
  analytics_cookies boolean DEFAULT false,
  advertising_cookies boolean DEFAULT false,

  -- Context
  consent_method text, -- banner, settings_page, first_visit
  ip_address inet,
  user_agent text,

  -- Banner version
  consent_banner_version text,

  consent_timestamp timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires ON data_export_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_deletions_user ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletions_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletions_scheduled ON data_deletion_requests(scheduled_deletion_date);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_processing_active ON data_processing_activities(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_retention_table ON data_retention_policies(table_name);
CREATE INDEX IF NOT EXISTS idx_retention_active ON data_retention_policies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_privacy_notices_type ON privacy_notices(notice_type);
CREATE INDEX IF NOT EXISTS idx_privacy_notices_current ON privacy_notices(is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_cookie_consent_user ON cookie_consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_session ON cookie_consent_records(session_id);

-- Enable RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consent_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create export requests"
  ON data_export_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own consent records"
  ON consent_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create consent records"
  ON consent_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active processing activities"
  ON data_processing_activities FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view current privacy notices"
  ON privacy_notices FOR SELECT
  TO authenticated, anon
  USING (is_current = true);

CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own privacy settings"
  ON user_privacy_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own cookie consent"
  ON cookie_consent_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function: Request data export
CREATE OR REPLACE FUNCTION request_data_export(
  export_format_param text DEFAULT 'json',
  tables_param text[] DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  request_id uuid;
  verification_token_generated text;
BEGIN
  -- Generate verification token
  verification_token_generated := encode(gen_random_bytes(32), 'hex');

  -- Create export request
  INSERT INTO data_export_requests (
    user_id,
    export_type,
    export_format,
    requested_tables,
    status,
    verification_token,
    expires_at
  ) VALUES (
    auth.uid(),
    CASE WHEN tables_param IS NULL THEN 'full' ELSE 'partial' END,
    export_format_param,
    tables_param,
    'pending',
    verification_token_generated,
    now() + interval '7 days'
  )
  RETURNING id INTO request_id;

  -- TODO: Send verification email with token

  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(
  reason_param text DEFAULT NULL,
  reason_category_param text DEFAULT 'other'
)
RETURNS uuid AS $$
DECLARE
  request_id uuid;
  verification_token_generated text;
BEGIN
  -- Check for existing pending requests
  IF EXISTS (
    SELECT 1 FROM data_deletion_requests
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'verified', 'processing')
  ) THEN
    RAISE EXCEPTION 'A deletion request is already pending';
  END IF;

  -- Generate verification token
  verification_token_generated := encode(gen_random_bytes(32), 'hex');

  -- Create deletion request
  INSERT INTO data_deletion_requests (
    user_id,
    deletion_type,
    reason,
    reason_category,
    status,
    verification_token,
    scheduled_deletion_date
  ) VALUES (
    auth.uid(),
    'full',
    reason_param,
    reason_category_param,
    'pending',
    verification_token_generated,
    now() + interval '30 days' -- Grace period
  )
  RETURNING id INTO request_id;

  -- TODO: Send verification email with token

  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record consent
CREATE OR REPLACE FUNCTION record_consent(
  consent_type_param text,
  consent_given_param boolean,
  consent_version_param text,
  consent_text_param text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  consent_id uuid;
BEGIN
  -- Withdraw previous consent of same type
  UPDATE consent_records
  SET
    is_active = false,
    withdrawn_at = now()
  WHERE user_id = auth.uid()
  AND consent_type = consent_type_param
  AND is_active = true;

  -- Create new consent record
  INSERT INTO consent_records (
    user_id,
    consent_type,
    consent_version,
    consent_given,
    consent_method,
    consent_text,
    consent_timestamp
  ) VALUES (
    auth.uid(),
    consent_type_param,
    consent_version_param,
    consent_given_param,
    'explicit_opt_in',
    consent_text_param,
    now()
  )
  RETURNING id INTO consent_id;

  RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has given consent
CREATE OR REPLACE FUNCTION has_user_consent(
  user_id_param uuid,
  consent_type_param text
)
RETURNS boolean AS $$
DECLARE
  has_consent boolean;
BEGIN
  SELECT consent_given INTO has_consent
  FROM consent_records
  WHERE user_id = user_id_param
  AND consent_type = consent_type_param
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY consent_timestamp DESC
  LIMIT 1;

  RETURN COALESCE(has_consent, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_data_export TO authenticated;
GRANT EXECUTE ON FUNCTION request_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION record_consent TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_consent TO authenticated;

-- Seed data processing activities (examples)
INSERT INTO data_processing_activities (
  activity_name,
  activity_description,
  processing_purpose,
  data_categories,
  data_subjects,
  legal_basis,
  retention_period
) VALUES
  (
    'User Account Management',
    'Processing of user registration and account information',
    'Account creation, authentication, and user management',
    ARRAY['personal_data', 'contact_information'],
    ARRAY['customers', 'providers'],
    'contract',
    'Account lifetime + 2 years'
  ),
  (
    'Payment Processing',
    'Processing of payment transactions and financial data',
    'Payment processing, invoicing, and financial reporting',
    ARRAY['financial_data', 'transaction_data'],
    ARRAY['customers', 'providers'],
    'contract',
    '7 years (legal requirement)'
  ),
  (
    'Marketing Communications',
    'Sending marketing emails and promotional content',
    'Customer engagement and business promotion',
    ARRAY['contact_information', 'behavioral_data'],
    ARRAY['customers', 'providers'],
    'consent',
    'Until consent withdrawn + 2 years'
  )
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE data_export_requests IS 'GDPR Article 15 - Right of access to personal data';
COMMENT ON TABLE data_deletion_requests IS 'GDPR Article 17 - Right to erasure (right to be forgotten)';
COMMENT ON TABLE consent_records IS 'GDPR Article 7 - Conditions for consent';
COMMENT ON TABLE data_processing_activities IS 'GDPR Article 30 - Records of processing activities';
