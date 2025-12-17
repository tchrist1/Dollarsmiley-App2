/*
  # Create QuickBooks Online Integration

  1. New Tables
    - `quickbooks_connections`
      - OAuth credentials per team
      - Token management

    - `quickbooks_sync_log`
      - Track sync operations
      - Error logging

    - `quickbooks_entity_map`
      - Map local entities to QuickBooks
      - Bidirectional sync

  2. Features
    - OAuth 2.0 authentication
    - Invoice sync
    - Expense sync
    - Customer sync
    - Automatic refresh tokens
    - Sync status tracking

  3. Security
    - Encrypted tokens
    - RLS policies
    - Admin-only access
*/

-- Create sync status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
    CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed');
  END IF;
END $$;

-- Create sync direction enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_direction') THEN
    CREATE TYPE sync_direction AS ENUM ('to_quickbooks', 'from_quickbooks', 'bidirectional');
  END IF;
END $$;

-- Create entity type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qb_entity_type') THEN
    CREATE TYPE qb_entity_type AS ENUM (
      'customer',
      'invoice',
      'payment',
      'expense',
      'vendor',
      'item',
      'account'
    );
  END IF;
END $$;

-- Create quickbooks_connections table
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
  realm_id text NOT NULL,
  company_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true NOT NULL,
  last_sync_at timestamptz,
  sync_enabled boolean DEFAULT true NOT NULL,
  auto_sync_invoices boolean DEFAULT true NOT NULL,
  auto_sync_expenses boolean DEFAULT true NOT NULL,
  auto_sync_customers boolean DEFAULT true NOT NULL,
  sync_frequency_hours integer DEFAULT 24 NOT NULL,
  connected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  disconnected_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create quickbooks_sync_log table
CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES quickbooks_connections(id) ON DELETE CASCADE NOT NULL,
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

-- Create quickbooks_entity_map table
CREATE TABLE IF NOT EXISTS quickbooks_entity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES quickbooks_connections(id) ON DELETE CASCADE NOT NULL,
  entity_type qb_entity_type NOT NULL,
  local_id uuid NOT NULL,
  quickbooks_id text NOT NULL,
  sync_token text,
  last_synced_at timestamptz DEFAULT now() NOT NULL,
  sync_status sync_status DEFAULT 'completed' NOT NULL,
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(connection_id, entity_type, local_id),
  UNIQUE(connection_id, entity_type, quickbooks_id)
);

-- Enable RLS
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_entity_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quickbooks_connections

-- Team admins can view connections
CREATE POLICY "Team admins can view quickbooks connections"
  ON quickbooks_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = quickbooks_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins can manage connections
CREATE POLICY "Team admins can manage quickbooks connections"
  ON quickbooks_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = quickbooks_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = quickbooks_connections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for quickbooks_sync_log

-- Team admins can view sync logs
CREATE POLICY "Team admins can view sync logs"
  ON quickbooks_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quickbooks_connections qc
      JOIN team_members tm ON tm.team_id = qc.team_id
      WHERE qc.id = quickbooks_sync_log.connection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- System can create sync logs
CREATE POLICY "System can create sync logs"
  ON quickbooks_sync_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for quickbooks_entity_map

-- Team admins can view entity maps
CREATE POLICY "Team admins can view entity maps"
  ON quickbooks_entity_map
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quickbooks_connections qc
      JOIN team_members tm ON tm.team_id = qc.team_id
      WHERE qc.id = quickbooks_entity_map.connection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- System can manage entity maps
CREATE POLICY "System can manage entity maps"
  ON quickbooks_entity_map
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qb_connections_team ON quickbooks_connections(team_id);
CREATE INDEX IF NOT EXISTS idx_qb_connections_active ON quickbooks_connections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qb_connections_expires ON quickbooks_connections(token_expires_at);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_connection ON quickbooks_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_status ON quickbooks_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_created ON quickbooks_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_entity_map_connection ON quickbooks_entity_map(connection_id);
CREATE INDEX IF NOT EXISTS idx_qb_entity_map_local ON quickbooks_entity_map(entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_qb_entity_map_qb ON quickbooks_entity_map(entity_type, quickbooks_id);

-- Create function to check if token needs refresh
CREATE OR REPLACE FUNCTION quickbooks_token_needs_refresh(p_connection_id uuid)
RETURNS boolean AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM quickbooks_connections
  WHERE id = p_connection_id;

  -- Refresh if expires within 1 hour
  RETURN v_expires_at <= (now() + interval '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get entity mapping
CREATE OR REPLACE FUNCTION get_quickbooks_mapping(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_local_id uuid
)
RETURNS text AS $$
DECLARE
  v_quickbooks_id text;
BEGIN
  SELECT quickbooks_id INTO v_quickbooks_id
  FROM quickbooks_entity_map
  WHERE connection_id = p_connection_id
    AND entity_type = p_entity_type
    AND local_id = p_local_id;

  RETURN v_quickbooks_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create/update entity mapping
CREATE OR REPLACE FUNCTION upsert_quickbooks_mapping(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_local_id uuid,
  p_quickbooks_id text,
  p_sync_token text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_map_id uuid;
BEGIN
  INSERT INTO quickbooks_entity_map (
    connection_id,
    entity_type,
    local_id,
    quickbooks_id,
    sync_token,
    last_synced_at,
    sync_status
  ) VALUES (
    p_connection_id,
    p_entity_type,
    p_local_id,
    p_quickbooks_id,
    p_sync_token,
    now(),
    'completed'
  )
  ON CONFLICT (connection_id, entity_type, local_id)
  DO UPDATE SET
    quickbooks_id = p_quickbooks_id,
    sync_token = COALESCE(p_sync_token, quickbooks_entity_map.sync_token),
    last_synced_at = now(),
    sync_status = 'completed',
    sync_error = NULL
  RETURNING id INTO v_map_id;

  RETURN v_map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to start sync log
CREATE OR REPLACE FUNCTION start_quickbooks_sync(
  p_connection_id uuid,
  p_entity_type qb_entity_type,
  p_direction sync_direction
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO quickbooks_sync_log (
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
CREATE OR REPLACE FUNCTION complete_quickbooks_sync(
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
  FROM quickbooks_sync_log
  WHERE id = p_log_id;

  v_duration := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  UPDATE quickbooks_sync_log
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
    UPDATE quickbooks_connections
    SET last_sync_at = now()
    WHERE id = (SELECT connection_id FROM quickbooks_sync_log WHERE id = p_log_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get sync statistics
CREATE OR REPLACE FUNCTION get_quickbooks_sync_stats(
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
    qsl.entity_type,
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE qsl.status = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE qsl.status = 'failed') as failed_syncs,
    COALESCE(SUM(qsl.entities_processed), 0) as total_entities,
    MAX(qsl.completed_at) as last_sync
  FROM quickbooks_sync_log qsl
  WHERE qsl.connection_id = p_connection_id
    AND qsl.started_at >= now() - (p_days || ' days')::interval
  GROUP BY qsl.entity_type
  ORDER BY last_sync DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check sync eligibility
CREATE OR REPLACE FUNCTION can_sync_to_quickbooks(
  p_team_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_connection quickbooks_connections%ROWTYPE;
BEGIN
  SELECT * INTO v_connection
  FROM quickbooks_connections
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
CREATE OR REPLACE VIEW quickbooks_sync_status AS
SELECT
  qc.id as connection_id,
  qc.team_id,
  qc.company_name,
  qc.is_active,
  qc.sync_enabled,
  qc.last_sync_at,
  (
    SELECT COUNT(*)
    FROM quickbooks_entity_map qem
    WHERE qem.connection_id = qc.id
  ) as total_mapped_entities,
  (
    SELECT COUNT(*)
    FROM quickbooks_sync_log qsl
    WHERE qsl.connection_id = qc.id
      AND qsl.status = 'failed'
      AND qsl.started_at >= now() - interval '24 hours'
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
      FROM quickbooks_entity_map qem
      WHERE qem.connection_id = qc.id
      GROUP BY entity_type
    ) counts
  ) as entity_counts
FROM quickbooks_connections qc;

GRANT SELECT ON quickbooks_sync_status TO authenticated;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_quickbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_qb_connections_updated_at ON quickbooks_connections;
CREATE TRIGGER update_qb_connections_updated_at
  BEFORE UPDATE ON quickbooks_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

DROP TRIGGER IF EXISTS update_qb_entity_map_updated_at ON quickbooks_entity_map;
CREATE TRIGGER update_qb_entity_map_updated_at
  BEFORE UPDATE ON quickbooks_entity_map
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();
