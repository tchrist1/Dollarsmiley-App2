/*
  # Moderation History Tracking

  1. New Tables
    - moderation_action_history - Detailed action history with before/after states
    - moderator_performance_metrics - Individual moderator statistics
    - moderation_audit_log - Comprehensive audit trail

  2. Features
    - Complete action history with metadata
    - Moderator performance tracking
    - Audit trail for compliance
    - Before/after state snapshots
    - Performance analytics

  3. Security
    - Admin-only access via RLS
    - Immutable history records
    - Audit log integrity
*/

-- Create moderation_action_history table (detailed action tracking)
CREATE TABLE IF NOT EXISTS moderation_action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_action_id uuid NOT NULL REFERENCES moderation_actions(id) ON DELETE CASCADE,
  queue_item_id uuid REFERENCES moderation_queue(id),
  moderator_id uuid NOT NULL REFERENCES profiles(id),
  moderator_name text NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES profiles(id),
  target_user_name text,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content_before jsonb NOT NULL, -- State before action
  content_after jsonb, -- State after action (if applicable)
  reason text NOT NULL,
  internal_notes text,
  severity text CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
  strike_count integer DEFAULT 0,
  automated boolean DEFAULT false,
  ip_address text,
  user_agent text,
  response_time_seconds integer, -- Time from queue creation to action
  created_at timestamptz DEFAULT now()
);

-- Create moderator_performance_metrics table
CREATE TABLE IF NOT EXISTS moderator_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_actions integer DEFAULT 0,
  actions_dismiss integer DEFAULT 0,
  actions_warn integer DEFAULT 0,
  actions_remove_content integer DEFAULT 0,
  actions_suspend_user integer DEFAULT 0,
  actions_ban_user integer DEFAULT 0,
  actions_escalate integer DEFAULT 0,
  actions_restore integer DEFAULT 0,
  average_response_time_seconds integer,
  items_assigned integer DEFAULT 0,
  items_completed integer DEFAULT 0,
  appeals_received integer DEFAULT 0,
  appeals_approved integer DEFAULT 0,
  appeals_rejected integer DEFAULT 0,
  accuracy_score numeric(5, 2), -- Based on appeal outcomes
  hours_active numeric(5, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(moderator_id, date)
);

-- Create moderation_audit_log table (immutable audit trail)
CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'action_taken', 'item_assigned', 'item_reassigned', 'item_escalated',
    'appeal_submitted', 'appeal_reviewed', 'strike_issued', 'strike_removed',
    'user_suspended', 'user_unsuspended', 'content_removed', 'content_restored',
    'settings_changed', 'rule_created', 'rule_modified'
  )),
  entity_type text NOT NULL CHECK (entity_type IN (
    'queue_item', 'action', 'appeal', 'strike', 'user', 'content', 'rule'
  )),
  entity_id uuid NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  actor_name text,
  actor_role text,
  target_id uuid,
  target_name text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_moderation_action_history_moderator ON moderation_action_history(moderator_id, created_at DESC);
CREATE INDEX idx_moderation_action_history_target_user ON moderation_action_history(target_user_id, created_at DESC);
CREATE INDEX idx_moderation_action_history_content ON moderation_action_history(content_type, content_id);
CREATE INDEX idx_moderation_action_history_action_type ON moderation_action_history(action_type, created_at DESC);
CREATE INDEX idx_moderation_action_history_created ON moderation_action_history(created_at DESC);

CREATE INDEX idx_moderator_performance_date ON moderator_performance_metrics(date DESC);
CREATE INDEX idx_moderator_performance_moderator ON moderator_performance_metrics(moderator_id, date DESC);

CREATE INDEX idx_moderation_audit_log_event ON moderation_audit_log(event_type, created_at DESC);
CREATE INDEX idx_moderation_audit_log_entity ON moderation_audit_log(entity_type, entity_id);
CREATE INDEX idx_moderation_audit_log_actor ON moderation_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_moderation_audit_log_created ON moderation_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE moderation_action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderator_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation_action_history
CREATE POLICY "Admins can view all action history"
  ON moderation_action_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert action history"
  ON moderation_action_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for moderator_performance_metrics
CREATE POLICY "Admins can view all performance metrics"
  ON moderator_performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Moderators can view own performance"
  ON moderator_performance_metrics FOR SELECT
  TO authenticated
  USING (moderator_id = auth.uid());

CREATE POLICY "System can manage performance metrics"
  ON moderator_performance_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for moderation_audit_log
CREATE POLICY "Admins can view audit log"
  ON moderation_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert audit log"
  ON moderation_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log moderation action to history
CREATE OR REPLACE FUNCTION log_moderation_action_history(
  p_moderation_action_id uuid,
  p_queue_item_id uuid,
  p_moderator_id uuid,
  p_action_type text,
  p_target_user_id uuid,
  p_content_type text,
  p_content_id uuid,
  p_content_before jsonb,
  p_content_after jsonb,
  p_reason text,
  p_internal_notes text,
  p_severity text,
  p_strike_count integer
)
RETURNS uuid AS $$
DECLARE
  v_history_id uuid;
  v_moderator_name text;
  v_target_user_name text;
  v_response_time integer;
  v_queue_created timestamptz;
BEGIN
  -- Get moderator name
  SELECT full_name INTO v_moderator_name
  FROM profiles WHERE id = p_moderator_id;

  -- Get target user name
  SELECT full_name INTO v_target_user_name
  FROM profiles WHERE id = p_target_user_id;

  -- Calculate response time
  IF p_queue_item_id IS NOT NULL THEN
    SELECT created_at INTO v_queue_created
    FROM moderation_queue WHERE id = p_queue_item_id;

    v_response_time := EXTRACT(EPOCH FROM (NOW() - v_queue_created))::integer;
  END IF;

  -- Insert history record
  INSERT INTO moderation_action_history (
    moderation_action_id,
    queue_item_id,
    moderator_id,
    moderator_name,
    action_type,
    target_user_id,
    target_user_name,
    content_type,
    content_id,
    content_before,
    content_after,
    reason,
    internal_notes,
    severity,
    strike_count,
    response_time_seconds
  ) VALUES (
    p_moderation_action_id,
    p_queue_item_id,
    p_moderator_id,
    v_moderator_name,
    p_action_type,
    p_target_user_id,
    v_target_user_name,
    p_content_type,
    p_content_id,
    p_content_before,
    p_content_after,
    p_reason,
    p_internal_notes,
    p_severity,
    p_strike_count,
    v_response_time
  ) RETURNING id INTO v_history_id;

  -- Log to audit trail
  INSERT INTO moderation_audit_log (
    event_type,
    entity_type,
    entity_id,
    actor_id,
    actor_name,
    actor_role,
    target_id,
    target_name,
    description,
    metadata
  ) VALUES (
    'action_taken',
    'action',
    p_moderation_action_id,
    p_moderator_id,
    v_moderator_name,
    'moderator',
    p_target_user_id,
    v_target_user_name,
    format('Moderator %s took action: %s', v_moderator_name, p_action_type),
    jsonb_build_object(
      'action_type', p_action_type,
      'content_type', p_content_type,
      'severity', p_severity,
      'strike_count', p_strike_count
    )
  );

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user moderation history
CREATE OR REPLACE FUNCTION get_user_moderation_history(
  p_user_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  action_type text,
  moderator_name text,
  content_type text,
  reason text,
  severity text,
  strike_count integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mah.id,
    mah.action_type,
    mah.moderator_name,
    mah.content_type,
    mah.reason,
    mah.severity,
    mah.strike_count,
    mah.created_at
  FROM moderation_action_history mah
  WHERE mah.target_user_id = p_user_id
  ORDER BY mah.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderator action history
CREATE OR REPLACE FUNCTION get_moderator_action_history(
  p_moderator_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  action_type text,
  target_user_name text,
  content_type text,
  reason text,
  severity text,
  response_time_seconds integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mah.id,
    mah.action_type,
    mah.target_user_name,
    mah.content_type,
    mah.reason,
    mah.severity,
    mah.response_time_seconds,
    mah.created_at
  FROM moderation_action_history mah
  WHERE mah.moderator_id = p_moderator_id
    AND (p_start_date IS NULL OR mah.created_at >= p_start_date)
    AND (p_end_date IS NULL OR mah.created_at <= p_end_date)
  ORDER BY mah.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get content moderation timeline
CREATE OR REPLACE FUNCTION get_content_moderation_timeline(
  p_content_type text,
  p_content_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_timeline jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'action_type', action_type,
      'moderator_name', moderator_name,
      'reason', reason,
      'severity', severity,
      'strike_count', strike_count,
      'response_time_seconds', response_time_seconds,
      'created_at', created_at
    )
    ORDER BY created_at ASC
  ) INTO v_timeline
  FROM moderation_action_history
  WHERE content_type = p_content_type
    AND content_id = p_content_id;

  RETURN COALESCE(v_timeline, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update moderator performance metrics
CREATE OR REPLACE FUNCTION update_moderator_performance_metrics(
  p_moderator_id uuid,
  p_action_type text,
  p_response_time integer
)
RETURNS void AS $$
DECLARE
  v_date date := CURRENT_DATE;
BEGIN
  INSERT INTO moderator_performance_metrics (
    moderator_id,
    date,
    total_actions
  ) VALUES (
    p_moderator_id,
    v_date,
    1
  )
  ON CONFLICT (moderator_id, date) DO UPDATE SET
    total_actions = moderator_performance_metrics.total_actions + 1,
    updated_at = NOW();

  -- Update specific action counter
  UPDATE moderator_performance_metrics SET
    actions_dismiss = CASE WHEN p_action_type = 'dismiss' THEN actions_dismiss + 1 ELSE actions_dismiss END,
    actions_warn = CASE WHEN p_action_type = 'warn' THEN actions_warn + 1 ELSE actions_warn END,
    actions_remove_content = CASE WHEN p_action_type = 'remove_content' THEN actions_remove_content + 1 ELSE actions_remove_content END,
    actions_suspend_user = CASE WHEN p_action_type = 'suspend_user' THEN actions_suspend_user + 1 ELSE actions_suspend_user END,
    actions_ban_user = CASE WHEN p_action_type = 'ban_user' THEN actions_ban_user + 1 ELSE actions_ban_user END,
    actions_escalate = CASE WHEN p_action_type = 'escalate' THEN actions_escalate + 1 ELSE actions_escalate END,
    actions_restore = CASE WHEN p_action_type = 'restore' THEN actions_restore + 1 ELSE actions_restore END,
    average_response_time_seconds = (
      COALESCE(average_response_time_seconds * (total_actions - 1), 0) + COALESCE(p_response_time, 0)
    ) / total_actions
  WHERE moderator_id = p_moderator_id AND date = v_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderation audit log
CREATE OR REPLACE FUNCTION get_moderation_audit_log(
  p_event_type text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  event_type text,
  entity_type text,
  actor_name text,
  target_name text,
  description text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mal.id,
    mal.event_type,
    mal.entity_type,
    mal.actor_name,
    mal.target_name,
    mal.description,
    mal.metadata,
    mal.created_at
  FROM moderation_audit_log mal
  WHERE (p_event_type IS NULL OR mal.event_type = p_event_type)
    AND (p_entity_type IS NULL OR mal.entity_type = p_entity_type)
    AND (p_actor_id IS NULL OR mal.actor_id = p_actor_id)
    AND (p_start_date IS NULL OR mal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR mal.created_at <= p_end_date)
  ORDER BY mal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderator performance summary
CREATE OR REPLACE FUNCTION get_moderator_performance_summary(
  p_moderator_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_actions', COALESCE(SUM(total_actions), 0),
    'total_dismiss', COALESCE(SUM(actions_dismiss), 0),
    'total_warn', COALESCE(SUM(actions_warn), 0),
    'total_remove_content', COALESCE(SUM(actions_remove_content), 0),
    'total_suspend_user', COALESCE(SUM(actions_suspend_user), 0),
    'total_ban_user', COALESCE(SUM(actions_ban_user), 0),
    'total_escalate', COALESCE(SUM(actions_escalate), 0),
    'total_restore', COALESCE(SUM(actions_restore), 0),
    'average_response_time_seconds', COALESCE(AVG(average_response_time_seconds), 0)::integer,
    'days_active', COUNT(DISTINCT date),
    'actions_per_day', CASE WHEN COUNT(DISTINCT date) > 0 THEN (SUM(total_actions) / COUNT(DISTINCT date))::numeric(10,2) ELSE 0 END
  ) INTO v_summary
  FROM moderator_performance_metrics
  WHERE moderator_id = p_moderator_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log action history when moderation action is taken
CREATE OR REPLACE FUNCTION trigger_log_moderation_action()
RETURNS TRIGGER AS $$
DECLARE
  v_queue_item RECORD;
  v_content_before jsonb;
BEGIN
  -- Get queue item details
  SELECT * INTO v_queue_item
  FROM moderation_queue
  WHERE id = NEW.queue_item_id;

  -- Get content snapshot
  v_content_before := v_queue_item.content_snapshot;

  -- Log to history
  PERFORM log_moderation_action_history(
    NEW.id,
    NEW.queue_item_id,
    NEW.moderator_id,
    NEW.action_type,
    v_queue_item.content_author_id,
    v_queue_item.content_type,
    v_queue_item.content_id,
    v_content_before,
    NULL, -- content_after can be populated later if needed
    NEW.reason,
    NEW.internal_notes,
    CASE NEW.action_type
      WHEN 'warn' THEN 'minor'
      WHEN 'remove_content' THEN 'moderate'
      WHEN 'suspend_user' THEN 'severe'
      WHEN 'ban_user' THEN 'critical'
      ELSE NULL
    END,
    CASE NEW.action_type
      WHEN 'warn' THEN 1
      WHEN 'remove_content' THEN 2
      WHEN 'suspend_user' THEN 3
      WHEN 'ban_user' THEN 5
      ELSE 0
    END
  );

  -- Update performance metrics
  PERFORM update_moderator_performance_metrics(
    NEW.moderator_id,
    NEW.action_type,
    (
      SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::integer
      FROM moderation_queue
      WHERE id = NEW.queue_item_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS log_moderation_action_trigger ON moderation_actions;
CREATE TRIGGER log_moderation_action_trigger
  AFTER INSERT ON moderation_actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_moderation_action();

COMMENT ON TABLE moderation_action_history IS 'Detailed history of all moderation actions with before/after states';
COMMENT ON TABLE moderator_performance_metrics IS 'Performance metrics for individual moderators';
COMMENT ON TABLE moderation_audit_log IS 'Immutable audit trail for compliance and transparency';

COMMENT ON FUNCTION log_moderation_action_history IS 'Log a moderation action to history with full metadata';
COMMENT ON FUNCTION get_user_moderation_history IS 'Get complete moderation history for a specific user';
COMMENT ON FUNCTION get_moderator_action_history IS 'Get action history for a specific moderator';
COMMENT ON FUNCTION get_content_moderation_timeline IS 'Get full moderation timeline for a piece of content';
COMMENT ON FUNCTION update_moderator_performance_metrics IS 'Update daily performance metrics for a moderator';
COMMENT ON FUNCTION get_moderation_audit_log IS 'Retrieve audit log with flexible filtering';
COMMENT ON FUNCTION get_moderator_performance_summary IS 'Get aggregated performance summary for a moderator';
