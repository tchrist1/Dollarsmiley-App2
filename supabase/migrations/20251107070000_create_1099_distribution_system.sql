/*
  # Create 1099 Distribution System

  1. New Tables
    - `form_1099_distributions`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `tax_year` (integer)
      - `form_type` (text) - '1099-NEC'
      - `nonemployee_compensation` (numeric)
      - `federal_tax_withheld` (numeric)
      - `state_tax_withheld` (numeric)
      - `state` (text, nullable)
      - `state_income` (numeric, nullable)
      - `generated_at` (timestamptz)
      - `generated_by` (uuid, references profiles)
      - `file_path` (text, nullable) - Path to stored PDF
      - `file_hash` (text, nullable) - SHA-256 hash for integrity
      - `status` (text) - draft, ready, delivered, viewed
      - `delivery_method` (text) - portal, email, mail
      - `email_sent_at` (timestamptz, nullable)
      - `mailed_at` (timestamptz, nullable)
      - `notification_sent` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `form_1099_access_logs`
      - `id` (uuid, primary key)
      - `distribution_id` (uuid, references form_1099_distributions)
      - `provider_id` (uuid, references profiles)
      - `action` (text) - viewed, downloaded, printed
      - `ip_address` (text)
      - `user_agent` (text)
      - `accessed_at` (timestamptz)
      - `metadata` (jsonb)

    - `form_1099_delivery_confirmations`
      - `id` (uuid, primary key)
      - `distribution_id` (uuid, references form_1099_distributions)
      - `provider_id` (uuid, references profiles)
      - `confirmation_code` (text, unique)
      - `confirmation_method` (text) - email, sms
      - `confirmed_at` (timestamptz, nullable)
      - `ip_address` (text, nullable)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Providers can only access their own forms
    - Admins can manage all forms
    - Audit logging for all access

  3. Indexes
    - Index on provider_id and tax_year
    - Index on status for admin queries
    - Index on distribution_id for logs
*/

-- Create form_1099_distributions table
CREATE TABLE IF NOT EXISTS form_1099_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tax_year integer NOT NULL,
  form_type text NOT NULL DEFAULT '1099-NEC' CHECK (form_type IN ('1099-NEC', '1099-MISC', '1099-K')),

  -- Form data
  nonemployee_compensation numeric(12, 2) NOT NULL DEFAULT 0,
  federal_tax_withheld numeric(12, 2) NOT NULL DEFAULT 0,
  state_tax_withheld numeric(12, 2),
  state text,
  state_income numeric(12, 2),

  -- Generation info
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES profiles(id) NOT NULL,
  file_path text,
  file_hash text,

  -- Status tracking
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'ready',
    'delivered',
    'viewed',
    'downloaded'
  )),
  delivery_method text CHECK (delivery_method IN ('portal', 'email', 'mail')),
  email_sent_at timestamptz,
  mailed_at timestamptz,
  notification_sent boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one distribution per provider per year per form type
  CONSTRAINT unique_provider_year_form UNIQUE (provider_id, tax_year, form_type)
);

-- Create form_1099_access_logs table
CREATE TABLE IF NOT EXISTS form_1099_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid REFERENCES form_1099_distributions(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN (
    'viewed',
    'downloaded',
    'printed',
    'emailed',
    'shared'
  )),
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create form_1099_delivery_confirmations table
CREATE TABLE IF NOT EXISTS form_1099_delivery_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid REFERENCES form_1099_distributions(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  confirmation_code text UNIQUE NOT NULL,
  confirmation_method text NOT NULL CHECK (confirmation_method IN ('email', 'sms', 'portal')),
  confirmed_at timestamptz,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_1099_dist_provider_year
  ON form_1099_distributions(provider_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_1099_dist_status
  ON form_1099_distributions(status);

CREATE INDEX IF NOT EXISTS idx_1099_dist_tax_year
  ON form_1099_distributions(tax_year);

CREATE INDEX IF NOT EXISTS idx_1099_access_distribution
  ON form_1099_access_logs(distribution_id);

CREATE INDEX IF NOT EXISTS idx_1099_access_provider
  ON form_1099_access_logs(provider_id);

CREATE INDEX IF NOT EXISTS idx_1099_access_time
  ON form_1099_access_logs(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_1099_confirm_code
  ON form_1099_delivery_confirmations(confirmation_code);

CREATE INDEX IF NOT EXISTS idx_1099_confirm_provider
  ON form_1099_delivery_confirmations(provider_id);

-- Enable RLS
ALTER TABLE form_1099_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_1099_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_1099_delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_1099_distributions

-- Providers can view their own 1099 forms
CREATE POLICY "Providers can view own 1099 forms"
  ON form_1099_distributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id AND status IN ('ready', 'delivered', 'viewed', 'downloaded'));

-- Admins can view all 1099 forms
CREATE POLICY "Admins can view all 1099 forms"
  ON form_1099_distributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Admins can insert 1099 forms
CREATE POLICY "Admins can insert 1099 forms"
  ON form_1099_distributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Admins can update 1099 forms
CREATE POLICY "Admins can update 1099 forms"
  ON form_1099_distributions
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

-- Providers can update status when viewing
CREATE POLICY "Providers can update own 1099 status"
  ON form_1099_distributions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (
    auth.uid() = provider_id
    AND status IN ('viewed', 'downloaded')
  );

-- RLS Policies for form_1099_access_logs

-- Providers can view their own access logs
CREATE POLICY "Providers can view own access logs"
  ON form_1099_access_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- System can insert access logs
CREATE POLICY "System can insert access logs"
  ON form_1099_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
  ON form_1099_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for form_1099_delivery_confirmations

-- Providers can view their own confirmations
CREATE POLICY "Providers can view own confirmations"
  ON form_1099_delivery_confirmations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- System can insert confirmations
CREATE POLICY "System can insert confirmations"
  ON form_1099_delivery_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Providers can update their confirmations
CREATE POLICY "Providers can update own confirmations"
  ON form_1099_delivery_confirmations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Admins can view all confirmations
CREATE POLICY "Admins can view all confirmations"
  ON form_1099_delivery_confirmations
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
CREATE OR REPLACE FUNCTION update_1099_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_1099_distribution_updated_at_trigger
  ON form_1099_distributions;

CREATE TRIGGER update_1099_distribution_updated_at_trigger
  BEFORE UPDATE ON form_1099_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_1099_distribution_updated_at();

-- Function to log form access
CREATE OR REPLACE FUNCTION log_1099_access(
  p_distribution_id uuid,
  p_provider_id uuid,
  p_action text,
  p_ip_address text,
  p_user_agent text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO form_1099_access_logs (
    distribution_id,
    provider_id,
    action,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_distribution_id,
    p_provider_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  -- Update distribution status
  UPDATE form_1099_distributions
  SET
    status = CASE
      WHEN p_action = 'viewed' AND status = 'ready' THEN 'viewed'
      WHEN p_action = 'downloaded' THEN 'downloaded'
      ELSE status
    END
  WHERE id = p_distribution_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    v_code := upper(substring(md5(random()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM form_1099_delivery_confirmations
      WHERE confirmation_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create delivery confirmation
CREATE OR REPLACE FUNCTION create_1099_delivery_confirmation(
  p_distribution_id uuid,
  p_provider_id uuid,
  p_confirmation_method text,
  p_expires_hours integer DEFAULT 72
)
RETURNS text AS $$
DECLARE
  v_code text;
BEGIN
  v_code := generate_confirmation_code();

  INSERT INTO form_1099_delivery_confirmations (
    distribution_id,
    provider_id,
    confirmation_code,
    confirmation_method,
    expires_at
  ) VALUES (
    p_distribution_id,
    p_provider_id,
    v_code,
    p_confirmation_method,
    now() + (p_expires_hours || ' hours')::interval
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to confirm delivery
CREATE OR REPLACE FUNCTION confirm_1099_delivery(
  p_confirmation_code text,
  p_ip_address text
)
RETURNS boolean AS $$
DECLARE
  v_confirmation_id uuid;
  v_distribution_id uuid;
BEGIN
  -- Check if confirmation code is valid and not expired
  SELECT id, distribution_id INTO v_confirmation_id, v_distribution_id
  FROM form_1099_delivery_confirmations
  WHERE confirmation_code = p_confirmation_code
  AND confirmed_at IS NULL
  AND expires_at > now();

  IF v_confirmation_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update confirmation
  UPDATE form_1099_delivery_confirmations
  SET
    confirmed_at = now(),
    ip_address = p_ip_address
  WHERE id = v_confirmation_id;

  -- Update distribution status
  UPDATE form_1099_distributions
  SET
    status = 'delivered',
    delivery_method = 'portal'
  WHERE id = v_distribution_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider's available 1099 forms
CREATE OR REPLACE FUNCTION get_provider_1099_forms(p_provider_id uuid)
RETURNS TABLE (
  id uuid,
  tax_year integer,
  form_type text,
  nonemployee_compensation numeric,
  status text,
  generated_at timestamptz,
  viewed_count bigint,
  downloaded_count bigint,
  last_accessed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.tax_year,
    d.form_type,
    d.nonemployee_compensation,
    d.status,
    d.generated_at,
    COUNT(CASE WHEN l.action = 'viewed' THEN 1 END) as viewed_count,
    COUNT(CASE WHEN l.action = 'downloaded' THEN 1 END) as downloaded_count,
    MAX(l.accessed_at) as last_accessed_at
  FROM form_1099_distributions d
  LEFT JOIN form_1099_access_logs l ON l.distribution_id = d.id
  WHERE d.provider_id = p_provider_id
  AND d.status IN ('ready', 'delivered', 'viewed', 'downloaded')
  GROUP BY d.id, d.tax_year, d.form_type, d.nonemployee_compensation, d.status, d.generated_at
  ORDER BY d.tax_year DESC, d.form_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get 1099 access statistics
CREATE OR REPLACE FUNCTION get_1099_access_stats(p_tax_year integer)
RETURNS TABLE (
  total_distributed bigint,
  viewed_count bigint,
  downloaded_count bigint,
  not_accessed_count bigint,
  access_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT d.id) as total_distributed,
    COUNT(DISTINCT CASE WHEN d.status IN ('viewed', 'downloaded') THEN d.id END) as viewed_count,
    COUNT(DISTINCT CASE WHEN d.status = 'downloaded' THEN d.id END) as downloaded_count,
    COUNT(DISTINCT CASE WHEN d.status IN ('ready', 'delivered') THEN d.id END) as not_accessed_count,
    ROUND(
      COUNT(DISTINCT CASE WHEN d.status IN ('viewed', 'downloaded') THEN d.id END)::numeric /
      NULLIF(COUNT(DISTINCT d.id), 0) * 100,
      2
    ) as access_rate
  FROM form_1099_distributions d
  WHERE d.tax_year = p_tax_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
