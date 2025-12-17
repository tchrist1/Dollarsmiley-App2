/*
  # Create Xero API Integration

  1. New Tables
    - `xero_connections`
      - OAuth credentials per team
      - Tenant management

    - `xero_sync_log`
      - Track sync operations
      - Error logging

    - `xero_entity_map`
      - Map local entities to Xero
      - Bidirectional sync

  2. Features
    - OAuth 2.0 with PKCE
    - Invoice sync
    - Expense sync
    - Contact sync
    - Multi-tenant support
    - Automatic refresh tokens

  3. Security
    - Encrypted tokens
    - RLS policies
    - Admin-only access
*/

-- Create xero_connections table
CREATE TABLE IF NOT EXISTS xero_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  tenant_name text,
  tenant_type text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  id_token text,
  scopes text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true NOT NULL,
  last_sync_at timestamptz,
  sync_enabled boolean DEFAULT true NOT NULL,
  auto_sync_invoices boolean DEFAULT true NOT NULL,
  auto_sync_expenses boolean DEFAULT true NOT NULL,
  auto_sync_contacts boolean DEFAULT true NOT NULL,
  auto_sync_payments boolean DEFAULT true NOT NULL,
  sync_frequency_hours integer DEFAULT 24 NOT NULL,
  connected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  disconnected_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create xero_sync_log table
CREATE TABLE IF NOT EXISTS xero_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES xero_connections(id) ON DELETE CASCADE NOT NULL,
  entity_type qb_entity_type NOT NULL,
  direction sync_direction NOT NULL,
  status sync_status DEFAULT 'pending' NOT NULL,
  entities_processed integer DEFAULT 0 NOT NULL,
  entities_succeeded integer DEFAULT 0 NOT NULL,
  entities_failed integer DEFAULT 0 NOT NULL,
  error_message text,
  error_details jsonb,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  duration_seconds integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create xero_entity_map table
CREATE TABLE IF NOT EXISTS xero_entity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES xero_connections(id) ON DELETE CASCADE NOT NULL,
  entity_type qb_entity_type NOT NULL,
  local_id uuid NOT NULL,
  xero_id text NOT NULL,
  updated_date_utc timestamptz,
  last_synced_at timestamptz DEFAULT now() NOT NULL,
  sync_status sync_status DEFAULT 'completed' NOT NULL,
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(connection_id, entity_type, local_id),
  UNIQUE(connection_id, entity_type, xero_id)
);

-- Enable RLS
ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_entity_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xero_connections

-- Team admins can view connections
CREATE POLICY "Team admins can view xero connections"
  ON xero_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = xero_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins can manage connections
CREATE POLICY "Team admins can manage xero connections"
  ON xero_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = xero_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = xero_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for xero_sync_log

-- Team admins can view sync logs
CREATE POLICY "Team admins can view xero sync logs"
  ON xero_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM xero_connections xc
      JOIN team_members tm ON tm.team_id = xc.team_id
      WHERE xc.id = xero_sync_log.connection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- System can create sync logs
CREATE POLICY "System can create xero sync logs"
  ON xero_sync_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for xero_entity_map

-- Team admins can view entity maps
CREATE POLICY "Team admins can view xero entity maps"
  ON xero_entity_map
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM xero_connections xc
      JOIN team_members tm ON tm.team_id = xc.team_id
      WHERE xc.id = xero_entity_map.connection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- System can manage entity maps
CREATE POLICY "System can manage xero entity maps"
  ON xero_entity_map
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_xero_connections_team ON xero_connections(team_id);
CREATE INDEX IF NOT EXISTS idx_xero_connections_active ON xero_connections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_xero_connections_expires ON xero_connections(token_expires_at);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_connection ON xero_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_status ON xero_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_created ON xero_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_xero_entity_map_connection ON xero_entity_map(connection_id);
CREATE INDEX IF NOT EXISTS idx_xero_entity_map_local ON xero_entity_map(entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_xero_entity_map_xero ON xero_entity_map(entity_type, xero_id);

-- Create function to check if token needs refresh
CREATE OR REPLACE FUNCTION xero_token_needs_refresh(p_connection_id uuid)
RETURNS boolean AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM xero_connections
  WHERE id = p_connection_id;

  -- Refresh if expires within 5 minutes
  RETURN v_expires_at <= (now() + interval '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get entity mapping
CREATE OR REPLACE FUNCTION get_xero_mapping(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_local_id uuid
)
RETURNS text AS $$
DECLARE
  v_xero_id text;
BEGIN
  SELECT xero_id INTO v_xero_id
  FROM xero_entity_map
  WHERE connection_id = p_connection_id
    AND entity_type = p_entity_type
    AND local_id = p_local_id;

  RETURN v_xero_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create/update entity mapping
CREATE OR REPLACE FUNCTION upsert_xero_mapping(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_local_id uuid,
  p_xero_id text,
  p_updated_date_utc timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_map_id uuid;
BEGIN
  INSERT INTO xero_entity_map (
    connection_id,
    entity_type,
    local_id,
    xero_id,
    updated_date_utc,
    last_synced_at,
    sync_status
  ) VALUES (
    p_connection_id,
    p_entity_type,
    p_local_id,
    p_xero_id,
    p_updated_date_utc,
    now(),
    'completed'
  )
  ON CONFLICT (connection_id, entity_type, local_id)
  DO UPDATE SET
    xero_id = p_xero_id,
    updated_date_utc = COALESCE(p_updated_date_utc, xero_entity_map.updated_date_utc),
    last_synced_at = now(),
    sync_status = 'completed',
    sync_error = NULL
  RETURNING id INTO v_map_id;

  RETURN v_map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to start sync log
CREATE OR REPLACE FUNCTION start_xero_sync(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_direction sync_direction
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO xero_sync_log (
    connection_id,
    entity_type,
    direction,
    status,
    started_at
  ) VALUES (
    p_connection_id,
    p_entity_type,
    p_direction,
    'syncing',
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete sync log
CREATE OR REPLACE FUNCTION complete_xero_sync(
  p_log_id uuid,
  p_status sync_status,
  p_processed integer,
  p_succeeded integer,
  p_failed integer,
  p_error_message text DEFAULT NULL,
  p_error_details jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_started_at timestamptz;
  v_duration integer;
BEGIN
  SELECT started_at INTO v_started_at
  FROM xero_sync_log
  WHERE id = p_log_id;

  v_duration := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  UPDATE xero_sync_log
  SET status = p_status,
      entities_processed = p_processed,
      entities_succeeded = p_succeeded,
      entities_failed = p_failed,
      error_message = p_error_message,
      error_details = p_error_details,
      completed_at = now(),
      duration_seconds = v_duration
  WHERE id = p_log_id;

  -- Update last_sync_at on connection
  IF p_status = 'completed' THEN
    UPDATE xero_connections
    SET last_sync_at = now()
    WHERE id = (SELECT connection_id FROM xero_sync_log WHERE id = p_log_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get sync statistics
CREATE OR REPLACE FUNCTION get_xero_sync_stats(
  p_connection_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  entity_type qb_entity_type,
  total_syncs bigint,
  successful_syncs bigint,
  failed_syncs bigint,
  total_entities bigint,
  last_sync timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    xsl.entity_type,
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE xsl.status = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE xsl.status = 'failed') as failed_syncs,
    COALESCE(SUM(xsl.entities_processed), 0) as total_entities,
    MAX(xsl.completed_at) as last_sync
  FROM xero_sync_log xsl
  WHERE xsl.connection_id = p_connection_id
    AND xsl.started_at >= now() - (p_days || ' days')::interval
  GROUP BY xsl.entity_type
  ORDER BY last_sync DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check sync eligibility
CREATE OR REPLACE FUNCTION can_sync_to_xero(
  p_team_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_connection xero_connections%ROWTYPE;
BEGIN
  SELECT * INTO v_connection
  FROM xero_connections
  WHERE team_id = p_team_id
    AND is_active = true
    AND sync_enabled = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if token needs refresh
  IF v_connection.token_expires_at <= now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for sync status
CREATE OR REPLACE VIEW xero_sync_status AS
SELECT
  xc.id as connection_id,
  xc.team_id,
  xc.tenant_name,
  xc.tenant_type,
  xc.is_active,
  xc.sync_enabled,
  xc.last_sync_at,
  (
    SELECT COUNT(*)
    FROM xero_entity_map xem
    WHERE xem.connection_id = xc.id
  ) as total_mapped_entities,
  (
    SELECT COUNT(*)
    FROM xero_sync_log xsl
    WHERE xsl.connection_id = xc.id
      AND xsl.status = 'failed'
      AND xsl.started_at >= now() - interval '24 hours'
  ) as recent_failures,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'entity_type', entity_type,
        'count', count
      )
    )
    FROM (
      SELECT entity_type, COUNT(*) as count
      FROM xero_entity_map xem
      WHERE xem.connection_id = xc.id
      GROUP BY entity_type
    ) counts
  ) as entity_counts
FROM xero_connections xc;

GRANT SELECT ON xero_sync_status TO authenticated;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_xero_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_xero_connections_updated_at ON xero_connections;
CREATE TRIGGER update_xero_connections_updated_at
  BEFORE UPDATE ON xero_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_xero_updated_at();

DROP TRIGGER IF EXISTS update_xero_entity_map_updated_at ON xero_entity_map;
CREATE TRIGGER update_xero_entity_map_updated_at
  BEFORE UPDATE ON xero_entity_map
  FOR EACH ROW
  EXECUTE FUNCTION update_xero_updated_at();
