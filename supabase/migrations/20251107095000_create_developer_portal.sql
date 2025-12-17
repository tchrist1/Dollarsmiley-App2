/*
  # Create Developer Portal System

  1. New Tables
    - `developer_api_keys`
      - API key management
      - Scopes and permissions

    - `developer_api_logs`
      - API usage tracking
      - Request/response logs

    - `developer_webhooks`
      - Webhook endpoints
      - Event subscriptions

    - `developer_webhook_deliveries`
      - Webhook delivery tracking
      - Retry management

    - `developer_code_examples`
      - Code snippets and examples
      - Multi-language support

  2. Features
    - API key generation
    - Usage tracking
    - Webhook management
    - Code examples
    - Documentation

  3. Security
    - RLS policies
    - API key validation
    - Webhook signature verification
*/

-- Create API key environment enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_environment') THEN
    CREATE TYPE api_key_environment AS ENUM (
      'production',
      'development'
    );
  END IF;
END $$;

-- Create API key status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_status') THEN
    CREATE TYPE api_key_status AS ENUM (
      'active',
      'revoked',
      'expired'
    );
  END IF;
END $$;

-- Create developer_api_keys table
CREATE TABLE IF NOT EXISTS developer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  environment api_key_environment NOT NULL,
  status api_key_status DEFAULT 'active' NOT NULL,
  scopes text[] DEFAULT ARRAY['read', 'write']::text[],
  rate_limit_tier text DEFAULT 'authenticated' NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create developer_api_logs table
CREATE TABLE IF NOT EXISTS developer_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES developer_api_keys(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  request_duration_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  ip_address text,
  user_agent text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create developer_webhooks table
CREATE TABLE IF NOT EXISTS developer_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  secret text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  last_delivery_at timestamptz,
  total_deliveries integer DEFAULT 0 NOT NULL,
  failed_deliveries integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create developer_webhook_deliveries table
CREATE TABLE IF NOT EXISTS developer_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES developer_webhooks(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  response_headers jsonb,
  delivered_at timestamptz,
  failed_at timestamptz,
  retry_count integer DEFAULT 0 NOT NULL,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create developer_code_examples table
CREATE TABLE IF NOT EXISTS developer_code_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  language text NOT NULL,
  code text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  is_featured boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE developer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_code_examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for developer_api_keys

-- Users can view own API keys
CREATE POLICY "Users can view own API keys"
  ON developer_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create own API keys
CREATE POLICY "Users can create own API keys"
  ON developer_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own API keys
CREATE POLICY "Users can update own API keys"
  ON developer_api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete own API keys
CREATE POLICY "Users can delete own API keys"
  ON developer_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for developer_api_logs

-- Users can view own API logs
CREATE POLICY "Users can view own API logs"
  ON developer_api_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can create API logs
CREATE POLICY "System can create API logs"
  ON developer_api_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for developer_webhooks

-- Users can manage own webhooks
CREATE POLICY "Users can manage own webhooks"
  ON developer_webhooks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for developer_webhook_deliveries

-- Users can view own webhook deliveries
CREATE POLICY "Users can view own webhook deliveries"
  ON developer_webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_webhooks
      WHERE developer_webhooks.id = webhook_id
        AND developer_webhooks.user_id = auth.uid()
    )
  );

-- System can create webhook deliveries
CREATE POLICY "System can create webhook deliveries"
  ON developer_webhook_deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for developer_code_examples

-- Anyone can view code examples
CREATE POLICY "Anyone can view code examples"
  ON developer_code_examples
  FOR SELECT
  USING (true);

-- Admins can manage code examples
CREATE POLICY "Admins can manage code examples"
  ON developer_code_examples
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user ON developer_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_key ON developer_api_keys(key);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_prefix ON developer_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_status ON developer_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_developer_api_logs_key ON developer_api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_developer_api_logs_user ON developer_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_api_logs_created ON developer_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_webhooks_user ON developer_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_webhooks_active ON developer_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_developer_webhook_deliveries_webhook ON developer_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_developer_webhook_deliveries_created ON developer_webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_code_examples_category ON developer_code_examples(category);
CREATE INDEX IF NOT EXISTS idx_developer_code_examples_language ON developer_code_examples(language);

-- Create function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
  p_api_key text,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_duration_ms integer DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_api_key_id uuid;
  v_user_id uuid;
BEGIN
  -- Get API key info
  SELECT id, user_id INTO v_api_key_id, v_user_id
  FROM developer_api_keys
  WHERE key = p_api_key
    AND status = 'active';

  IF v_api_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert log
  INSERT INTO developer_api_logs (
    api_key_id,
    user_id,
    endpoint,
    method,
    status_code,
    request_duration_ms,
    ip_address
  ) VALUES (
    v_api_key_id,
    v_user_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_duration_ms,
    p_ip_address
  )
  RETURNING id INTO v_log_id;

  -- Update last used
  UPDATE developer_api_keys
  SET last_used_at = now()
  WHERE id = v_api_key_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get API usage
CREATE OR REPLACE FUNCTION get_developer_api_usage(p_user_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_usage jsonb;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'requests_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'rate_limit', 1000,
    'rate_limit_remaining', GREATEST(0, 1000 - COUNT(*) FILTER (WHERE created_at >= date_trunc('hour', now()))),
    'top_endpoints', (
      SELECT jsonb_agg(endpoint_data)
      FROM (
        SELECT jsonb_build_object(
          'endpoint', endpoint,
          'count', count
        ) as endpoint_data
        FROM (
          SELECT endpoint, COUNT(*) as count
          FROM developer_api_logs
          WHERE user_id = v_user_id
            AND created_at > now() - interval '7 days'
          GROUP BY endpoint
          ORDER BY count DESC
          LIMIT 5
        ) top_endpoints
      ) endpoints
    )
  ) INTO v_usage
  FROM developer_api_logs
  WHERE user_id = v_user_id;

  RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deliver webhook
CREATE OR REPLACE FUNCTION deliver_webhook(
  p_webhook_id uuid,
  p_event text,
  p_payload jsonb
)
RETURNS uuid AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  -- Create delivery record
  INSERT INTO developer_webhook_deliveries (
    webhook_id,
    event,
    payload
  ) VALUES (
    p_webhook_id,
    p_event,
    p_payload
  )
  RETURNING id INTO v_delivery_id;

  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to test webhook
CREATE OR REPLACE FUNCTION test_webhook(p_webhook_id uuid)
RETURNS boolean AS $$
DECLARE
  v_webhook developer_webhooks%ROWTYPE;
BEGIN
  SELECT * INTO v_webhook
  FROM developer_webhooks
  WHERE id = p_webhook_id
    AND user_id = auth.uid();

  IF v_webhook.id IS NULL THEN
    RETURN false;
  END IF;

  -- Create test delivery
  PERFORM deliver_webhook(
    p_webhook_id,
    'test.event',
    jsonb_build_object(
      'test', true,
      'timestamp', now()
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get developer stats
CREATE OR REPLACE FUNCTION get_developer_stats(p_user_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_stats jsonb;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT jsonb_build_object(
    'total_api_calls', (
      SELECT COUNT(*)
      FROM developer_api_logs
      WHERE user_id = v_user_id
    ),
    'total_webhooks', (
      SELECT COUNT(*)
      FROM developer_webhooks
      WHERE user_id = v_user_id
    ),
    'active_api_keys', (
      SELECT COUNT(*)
      FROM developer_api_keys
      WHERE user_id = v_user_id
        AND status = 'active'
    ),
    'success_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::numeric /
        NULLIF(COUNT(*), 0) * 100)::numeric,
        2
      )
      FROM developer_api_logs
      WHERE user_id = v_user_id
        AND created_at > now() - interval '30 days'
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_developer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_developer_api_keys_updated_at ON developer_api_keys;
CREATE TRIGGER update_developer_api_keys_updated_at
  BEFORE UPDATE ON developer_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_developer_updated_at();

DROP TRIGGER IF EXISTS update_developer_webhooks_updated_at ON developer_webhooks;
CREATE TRIGGER update_developer_webhooks_updated_at
  BEFORE UPDATE ON developer_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_developer_updated_at();

-- Insert sample code examples
INSERT INTO developer_code_examples (title, description, category, language, code, tags, is_featured, sort_order)
VALUES
  (
    'List Listings',
    'Fetch all available service listings',
    'Listings',
    'javascript',
    'const listings = await client.listings.list({
  category: ''photography'',
  location: ''New York'',
  page: 1,
  per_page: 20
});

console.log(listings.data);',
    ARRAY['listings', 'search'],
    true,
    1
  ),
  (
    'Create Booking',
    'Book a service listing',
    'Bookings',
    'javascript',
    'const booking = await client.bookings.create({
  listing_id: ''uuid'',
  start_time: ''2024-11-10T14:00:00Z'',
  end_time: ''2024-11-10T16:00:00Z'',
  notes: ''Additional requirements...''
});

console.log(booking.id);',
    ARRAY['bookings', 'create'],
    true,
    2
  ),
  (
    'Submit Review',
    'Leave a review for completed booking',
    'Reviews',
    'javascript',
    'const review = await client.reviews.create({
  booking_id: ''uuid'',
  rating: 5,
  comment: ''Excellent service!'',
  photos: [''url1'', ''url2'']
});

console.log(review.id);',
    ARRAY['reviews', 'ratings'],
    true,
    3
  )
ON CONFLICT DO NOTHING;
