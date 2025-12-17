/*
  # Create OAuth Providers Table (Simplified)
  
  Creates the oauth_providers table needed for managing social login options
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

-- Enable RLS
ALTER TABLE oauth_providers ENABLE ROW LEVEL SECURITY;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_enabled ON oauth_providers(is_enabled);

-- Insert default OAuth providers
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
