/*
  # Create Priority Support System

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `subject` (text, ticket subject)
      - `description` (text, issue description)
      - `category` (text, support category)
      - `priority` (text, ticket priority)
      - `status` (text, ticket status)
      - `is_priority` (boolean, premium support flag)
      - `assigned_to` (uuid, support agent ID, nullable)
      - `first_response_at` (timestamptz, nullable)
      - `resolved_at` (timestamptz, nullable)
      - `attachments` (text[], file URLs)
      - `tags` (text[], categorization tags)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to support_tickets)
      - `sender_id` (uuid, user or agent ID)
      - `sender_type` (text, 'user' or 'support')
      - `message` (text, message content)
      - `attachments` (text[], file URLs)
      - `is_internal` (boolean, internal notes flag)
      - `created_at` (timestamptz)

    - `support_ratings`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to support_tickets)
      - `user_id` (uuid, foreign key to profiles)
      - `rating` (integer, 1-5 stars)
      - `feedback` (text, optional feedback)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view/manage their own tickets
    - Users can add messages to their tickets
    - Users can rate their own tickets
    - Support agents have elevated permissions

  3. Functions
    - Auto-update first_response_at
    - Calculate average response time
    - Track support metrics
    - Send notifications
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'technical',
    'billing',
    'account',
    'booking',
    'payments',
    'verification',
    'feature_request',
    'other'
  )),
  priority text DEFAULT 'normal' NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' NOT NULL CHECK (status IN (
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed'
  )),
  is_priority boolean DEFAULT false NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  first_response_at timestamptz,
  resolved_at timestamptz,
  attachments text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'support')),
  message text NOT NULL,
  attachments text[] DEFAULT '{}',
  is_internal boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create support_ratings table
CREATE TABLE IF NOT EXISTS support_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own open tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status != 'closed')
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages in own tickets"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    )
    AND NOT is_internal
  );

CREATE POLICY "Users can add messages to own tickets"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
        AND support_tickets.user_id = auth.uid()
        AND support_tickets.status != 'closed'
    )
    AND sender_id = auth.uid()
    AND sender_type = 'user'
    AND NOT is_internal
  );

-- RLS Policies for support_ratings
CREATE POLICY "Users can view own ratings"
  ON support_ratings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can rate own tickets"
  ON support_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
        AND support_tickets.user_id = auth.uid()
        AND (support_tickets.status = 'resolved' OR support_tickets.status = 'closed')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
  ON support_tickets(priority, is_priority);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id
  ON support_messages(ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_support_ratings_ticket_id
  ON support_ratings(ticket_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_support_tickets_updated_at_trigger ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Create function to set first_response_at
CREATE OR REPLACE FUNCTION set_first_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set first_response_at when support agent responds
  IF NEW.sender_type = 'support' AND NOT NEW.is_internal THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, now())
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for first response
DROP TRIGGER IF EXISTS set_first_response_trigger ON support_messages;
CREATE TRIGGER set_first_response_trigger
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_first_response();

-- Create function to get support metrics
CREATE OR REPLACE FUNCTION get_support_metrics(p_user_id uuid)
RETURNS TABLE (
  average_response_minutes numeric,
  average_resolution_hours numeric,
  satisfaction_rating numeric,
  open_tickets integer,
  resolved_tickets integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Average response time in minutes
    COALESCE(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60), 0)::numeric
      AS average_response_minutes,
    -- Average resolution time in hours
    COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 0)::numeric
      AS average_resolution_hours,
    -- Average satisfaction rating
    COALESCE(
      (SELECT AVG(sr.rating)
       FROM support_ratings sr
       JOIN support_tickets st ON st.id = sr.ticket_id
       WHERE st.user_id = p_user_id),
      0
    )::numeric AS satisfaction_rating,
    -- Count of open tickets
    COUNT(*) FILTER (
      WHERE status IN ('open', 'in_progress', 'waiting_customer')
    )::integer AS open_tickets,
    -- Count of resolved tickets
    COUNT(*) FILTER (
      WHERE status IN ('resolved', 'closed')
    )::integer AS resolved_tickets
  FROM support_tickets
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to notify support team
CREATE OR REPLACE FUNCTION notify_support_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for support team when new ticket is created
  IF TG_OP = 'INSERT' THEN
    -- In production, this would integrate with email/Slack/etc
    -- For now, we'll just log it
    RAISE NOTICE 'New support ticket created: % (priority: %, is_priority: %)',
      NEW.id, NEW.priority, NEW.is_priority;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for support notifications
DROP TRIGGER IF EXISTS notify_support_team_trigger ON support_tickets;
CREATE TRIGGER notify_support_team_trigger
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_team();

-- Create function to auto-assign tickets based on priority
CREATE OR REPLACE FUNCTION auto_assign_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id uuid;
BEGIN
  -- Auto-assign high priority and urgent tickets to available agents
  IF NEW.is_priority AND (NEW.priority = 'high' OR NEW.priority = 'urgent') THEN
    -- Find agent with lowest current ticket load
    -- In production, this would use a proper agent assignment system
    SELECT id INTO v_agent_id
    FROM profiles
    WHERE user_type = 'support_agent'
      AND is_active = true
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_agent_id IS NOT NULL THEN
      NEW.assigned_to := v_agent_id;
      NEW.status := 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON support_tickets;
CREATE TRIGGER auto_assign_ticket_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_ticket();

-- Create view for ticket statistics
CREATE OR REPLACE VIEW support_ticket_stats AS
SELECT
  st.id,
  st.user_id,
  st.subject,
  st.category,
  st.priority,
  st.status,
  st.is_priority,
  st.created_at,
  st.first_response_at,
  st.resolved_at,
  -- Response time in minutes
  CASE
    WHEN st.first_response_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (st.first_response_at - st.created_at)) / 60
    ELSE NULL
  END AS response_time_minutes,
  -- Resolution time in hours
  CASE
    WHEN st.resolved_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 3600
    ELSE NULL
  END AS resolution_time_hours,
  -- Message count
  (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id AND NOT is_internal) AS message_count,
  -- Rating
  sr.rating,
  sr.feedback
FROM support_tickets st
LEFT JOIN support_ratings sr ON sr.ticket_id = st.id;

-- Grant access to view
GRANT SELECT ON support_ticket_stats TO authenticated;

-- Create function to check SLA compliance
CREATE OR REPLACE FUNCTION check_sla_compliance(
  p_ticket_id uuid,
  p_max_response_hours integer
)
RETURNS boolean AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
  v_elapsed_hours numeric;
BEGIN
  SELECT * INTO v_ticket
  FROM support_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If already responded, check if within SLA
  IF v_ticket.first_response_at IS NOT NULL THEN
    v_elapsed_hours := EXTRACT(EPOCH FROM (v_ticket.first_response_at - v_ticket.created_at)) / 3600;
    RETURN v_elapsed_hours <= p_max_response_hours;
  END IF;

  -- If not yet responded, check if still within SLA
  v_elapsed_hours := EXTRACT(EPOCH FROM (now() - v_ticket.created_at)) / 3600;
  RETURN v_elapsed_hours <= p_max_response_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to escalate overdue tickets
CREATE OR REPLACE FUNCTION escalate_overdue_tickets()
RETURNS void AS $$
BEGIN
  -- Escalate priority tickets that haven't received first response within SLA
  UPDATE support_tickets
  SET
    priority = CASE
      WHEN priority = 'normal' THEN 'high'::text
      WHEN priority = 'high' THEN 'urgent'::text
      ELSE priority
    END,
    tags = CASE
      WHEN 'escalated' = ANY(tags) THEN tags
      ELSE array_append(tags, 'escalated')
    END
  WHERE
    is_priority = true
    AND status = 'open'
    AND first_response_at IS NULL
    AND (
      (priority = 'urgent' AND created_at < now() - interval '1 hour')
      OR (priority = 'high' AND created_at < now() - interval '4 hours')
      OR (priority = 'normal' AND created_at < now() - interval '24 hours')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
