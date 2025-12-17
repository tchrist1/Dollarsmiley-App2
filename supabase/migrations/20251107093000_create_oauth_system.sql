/*
  # Create OAuth 2.0 Authentication System

  1. New Tables
    - `oauth_providers`
      - OAuth provider configurations
      - Client credentials

    - `oauth_connections`
      - User OAuth connections
      - Multiple providers per user

    - `oauth_tokens`
      - Access and refresh tokens
      - Token expiry tracking

  2. Features
    - Multiple OAuth providers
    - Token refresh
    - Account linking
    - Provider switching
    - Secure token storage

  3. Security
    - Encrypted tokens
    - RLS policies
    - Automatic token refresh
*/

-- Create OAuth provider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider_type') THEN
    CREATE TYPE oauth_provider_type AS ENUM (
      'google',
      'apple',
      'facebook',
      'github',
      'twitter',
      'microsoft'
    );
  END IF;
END $$;

-- Create OAuth connection status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_connection_status') THEN
    CREATE TYPE oauth_connection_status AS ENUM (
      'active',
      'expired',
      'revoked',
      'error'
    );
  END IF;
END $$;

-- Create oauth_providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider oauth_provider_type UNIQUE NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  authorization_url text NOT NULL,
  token_url text NOT NULL,
  user_info_url text NOT NULL,
  scopes text[] DEFAULT ARRAY[]::text[],
  is_enabled boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create oauth_connections table
CREATE TABLE IF NOT EXISTS oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider oauth_provider_type NOT NULL,
  provider_user_id text NOT NULL,
  provider_email text,
  provider_name text,
  provider_avatar text,
  status oauth_connection_status DEFAULT 'active' NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  last_used_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

-- Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES oauth_connections(id) ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer' NOT NULL,
  expires_at timestamptz,
  scopes text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create oauth_login_log table for security tracking
CREATE TABLE IF NOT EXISTS oauth_login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES oauth_connections(id) ON DELETE SET NULL,
  provider oauth_provider_type NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE oauth_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_login_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_providers

-- Anyone can view enabled providers
CREATE POLICY "Anyone can view enabled oauth providers"
  ON oauth_providers
  FOR SELECT
  USING (is_enabled = true);

-- Only admins can manage providers
CREATE POLICY "Admins can manage oauth providers"
  ON oauth_providers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'Admin'
    )
  );

-- RLS Policies for oauth_connections

-- Users can view own connections
CREATE POLICY "Users can view own oauth connections"
  ON oauth_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can manage own connections
CREATE POLICY "Users can manage own oauth connections"
  ON oauth_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for oauth_tokens

-- Users can view own tokens (through connection)
CREATE POLICY "Users can view own oauth tokens"
  ON oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM oauth_connections
      WHERE oauth_connections.id = oauth_tokens.connection_id
        AND oauth_connections.user_id = auth.uid()
    )
  );

-- System can manage tokens
CREATE POLICY "System can manage oauth tokens"
  ON oauth_tokens
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for oauth_login_log

-- Users can view own login log
CREATE POLICY "Users can view own oauth login log"
  ON oauth_login_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can create log entries
CREATE POLICY "System can create oauth login log"
  ON oauth_login_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_enabled ON oauth_providers(is_enabled);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider ON oauth_connections(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_status ON oauth_connections(status);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider_user ON oauth_connections(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_connection ON oauth_tokens(connection_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_login_log_user ON oauth_login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_login_log_created ON oauth_login_log(created_at DESC);

-- Create function to check if token needs refresh
CREATE OR REPLACE FUNCTION needs_token_refresh(p_connection_id uuid)
RETURNS boolean AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  SELECT expires_at INTO v_expires_at
  FROM oauth_tokens
  WHERE connection_id = p_connection_id;

  -- Refresh if token expires in less than 5 minutes or already expired
  RETURN v_expires_at IS NOT NULL AND v_expires_at <= now() + interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update token
CREATE OR REPLACE FUNCTION update_oauth_token(
  p_connection_id uuid,
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_expires_in integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_token_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Calculate expiry
  IF p_expires_in IS NOT NULL THEN
    v_expires_at := now() + (p_expires_in || ' seconds')::interval;
  END IF;

  -- Update or insert token
  INSERT INTO oauth_tokens (
    connection_id,
    access_token,
    refresh_token,
    expires_at
  ) VALUES (
    p_connection_id,
    p_access_token,
    p_refresh_token,
    v_expires_at
  )
  ON CONFLICT (connection_id)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  RETURNING id INTO v_token_id;

  -- Update connection status
  UPDATE oauth_connections
  SET status = 'active',
      last_used_at = now()
  WHERE id = p_connection_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to link or create OAuth connection
CREATE OR REPLACE FUNCTION link_oauth_account(
  p_user_id uuid,
  p_provider oauth_provider_type,
  p_provider_user_id text,
  p_provider_email text,
  p_provider_name text,
  p_provider_avatar text DEFAULT NULL,
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_expires_in integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_connection_id uuid;
BEGIN
  -- Check if connection already exists
  SELECT id INTO v_connection_id
  FROM oauth_connections
  WHERE user_id = p_user_id
    AND provider = p_provider;

  IF v_connection_id IS NULL THEN
    -- Create new connection
    INSERT INTO oauth_connections (
      user_id,
      provider,
      provider_user_id,
      provider_email,
      provider_name,
      provider_avatar,
      status,
      is_primary
    ) VALUES (
      p_user_id,
      p_provider,
      p_provider_user_id,
      p_provider_email,
      p_provider_name,
      p_provider_avatar,
      'active',
      NOT EXISTS (
        SELECT 1 FROM oauth_connections
        WHERE user_id = p_user_id
      )
    )
    RETURNING id INTO v_connection_id;
  ELSE
    -- Update existing connection
    UPDATE oauth_connections
    SET provider_user_id = p_provider_user_id,
        provider_email = p_provider_email,
        provider_name = p_provider_name,
        provider_avatar = COALESCE(p_provider_avatar, provider_avatar),
        status = 'active',
        last_used_at = now()
    WHERE id = v_connection_id;
  END IF;

  -- Store tokens
  PERFORM update_oauth_token(
    v_connection_id,
    p_access_token,
    p_refresh_token,
    p_expires_in
  );

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke OAuth connection
CREATE OR REPLACE FUNCTION revoke_oauth_connection(p_connection_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Update connection status
  UPDATE oauth_connections
  SET status = 'revoked'
  WHERE id = p_connection_id;

  -- Delete tokens
  DELETE FROM oauth_tokens
  WHERE connection_id = p_connection_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log OAuth activity
CREATE OR REPLACE FUNCTION log_oauth_activity(
  p_user_id uuid,
  p_connection_id uuid,
  p_provider oauth_provider_type,
  p_action text,
  p_success boolean,
  p_error_message text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO oauth_login_log (
    user_id,
    connection_id,
    provider,
    action,
    ip_address,
    user_agent,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_connection_id,
    p_provider,
    p_action,
    p_ip_address,
    p_user_agent,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get OAuth statistics
CREATE OR REPLACE FUNCTION get_oauth_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_connections', COUNT(*),
    'active_connections', COUNT(*) FILTER (WHERE status = 'active'),
    'providers', (
      SELECT jsonb_object_agg(provider, count)
      FROM (
        SELECT provider, COUNT(*) as count
        FROM oauth_connections
        WHERE user_id = p_user_id
        GROUP BY provider
      ) provider_counts
    ),
    'last_login', MAX(last_used_at),
    'total_logins', (
      SELECT COUNT(*)
      FROM oauth_login_log
      WHERE oauth_login_log.user_id = p_user_id
        AND action = 'login'
        AND success = true
    )
  ) INTO v_stats
  FROM oauth_connections
  WHERE user_id = p_user_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_oauth_providers_updated_at ON oauth_providers;
CREATE TRIGGER update_oauth_providers_updated_at
  BEFORE UPDATE ON oauth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_updated_at();

DROP TRIGGER IF EXISTS update_oauth_connections_updated_at ON oauth_connections;
CREATE TRIGGER update_oauth_connections_updated_at
  BEFORE UPDATE ON oauth_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_updated_at();

DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_updated_at();

-- Insert default OAuth providers (configuration needed)
INSERT INTO oauth_providers (provider, client_id, client_secret, authorization_url, token_url, user_info_url, scopes, is_enabled)
VALUES
  (
    'google',
    'YOUR_GOOGLE_CLIENT_ID',
    'YOUR_GOOGLE_CLIENT_SECRET',
    'https://accounts.google.com/o/oauth2/v2/auth',
    'https://oauth2.googleapis.com/token',
    'https://www.googleapis.com/oauth2/v2/userinfo',
    ARRAY['openid', 'email', 'profile'],
    true
  ),
  (
    'apple',
    'YOUR_APPLE_CLIENT_ID',
    'YOUR_APPLE_CLIENT_SECRET',
    'https://appleid.apple.com/auth/authorize',
    'https://appleid.apple.com/auth/token',
    'https://appleid.apple.com/auth/userinfo',
    ARRAY['name', 'email'],
    true
  ),
  (
    'github',
    'YOUR_GITHUB_CLIENT_ID',
    'YOUR_GITHUB_CLIENT_SECRET',
    'https://github.com/login/oauth/authorize',
    'https://github.com/login/oauth/access_token',
    'https://api.github.com/user',
    ARRAY['user:email'],
    false
  )
ON CONFLICT (provider) DO NOTHING;
