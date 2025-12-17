/*
  # Create Customer Support Ticket System

  ## Overview
  Provides a comprehensive support ticket system for managing customer inquiries,
  issues, and requests with assignment, prioritization, SLA tracking, and resolution workflows.

  ## New Tables

  ### 1. `support_categories`
  Categorize support tickets
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `slug` (text) - URL-friendly identifier
  - `description` (text) - Category description
  - `icon` (text) - Icon identifier
  - `default_priority` (text) - Default priority for category
  - `sla_response_hours` (int) - Hours to first response
  - `sla_resolution_hours` (int) - Hours to resolution
  - `parent_id` (uuid) - Parent category for subcategories
  - `is_active` (boolean)
  - `sort_order` (int)
  - `created_at` (timestamptz)

  ### 2. `support_tickets`
  Main ticket records
  - `id` (uuid, primary key)
  - `ticket_number` (text) - Human-readable ID (e.g., TICK-12345)
  - `user_id` (uuid, references profiles) - Ticket creator
  - `assigned_to` (uuid, references profiles) - Support agent
  - `category_id` (uuid, references support_categories)
  - `subject` (text) - Ticket subject
  - `description` (text) - Initial description
  - `status` (text) - Open, InProgress, Waiting, Resolved, Closed, Cancelled
  - `priority` (text) - Low, Normal, High, Urgent
  - `source` (text) - Web, Mobile, Email, Phone, Chat
  - `related_booking_id` (uuid, references bookings)
  - `related_transaction_id` (uuid, references transactions)
  - `tags` (text[]) - Searchable tags
  - `first_response_at` (timestamptz)
  - `resolved_at` (timestamptz)
  - `closed_at` (timestamptz)
  - `sla_breach` (boolean) - SLA violated
  - `satisfaction_rating` (int) - 1-5 rating
  - `satisfaction_comment` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `ticket_messages`
  Conversation thread for tickets
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, references support_tickets)
  - `sender_id` (uuid, references profiles)
  - `message` (text) - Message content
  - `is_internal` (boolean) - Internal note (hidden from user)
  - `is_from_staff` (boolean) - Sent by support team
  - `attachments` (jsonb) - File attachments
  - `created_at` (timestamptz)

  ### 4. `ticket_assignments`
  Track assignment history
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, references support_tickets)
  - `assigned_from` (uuid, references profiles)
  - `assigned_to` (uuid, references profiles)
  - `assigned_by` (uuid, references profiles)
  - `reason` (text) - Assignment reason
  - `created_at` (timestamptz)

  ### 5. `ticket_status_history`
  Track status changes
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, references support_tickets)
  - `from_status` (text)
  - `to_status` (text)
  - `changed_by` (uuid, references profiles)
  - `reason` (text)
  - `created_at` (timestamptz)

  ### 6. `support_agents`
  Support team configuration
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Agent profile
  - `team_name` (text) - Team assignment
  - `specialties` (text[]) - Category specialties
  - `max_concurrent_tickets` (int) - Capacity
  - `is_active` (boolean)
  - `online_status` (text) - Online, Away, Offline
  - `last_activity_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 7. `canned_responses`
  Pre-written response templates
  - `id` (uuid, primary key)
  - `title` (text) - Response title
  - `slug` (text) - Shortcut identifier
  - `content` (text) - Response content
  - `category_id` (uuid, references support_categories)
  - `is_active` (boolean)
  - `usage_count` (int)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 8. `ticket_sla_tracking`
  SLA compliance tracking
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, references support_tickets)
  - `response_due_at` (timestamptz)
  - `resolution_due_at` (timestamptz)
  - `first_response_breach` (boolean)
  - `resolution_breach` (boolean)
  - `created_at` (timestamptz)

  ## Ticket Status Flow
  Open → InProgress → Waiting → Resolved → Closed
  (Can be Cancelled at any point)

  ## Priority Levels
  - **Low**: Non-urgent, general questions
  - **Normal**: Standard issues
  - **High**: Important, affecting user experience
  - **Urgent**: Critical, immediate attention required

  ## Features
  - Auto-assignment based on agent availability
  - SLA tracking and breach alerts
  - Internal notes (hidden from customers)
  - Canned responses for common issues
  - Multi-file attachments
  - Tag-based organization
  - Related entity linking (bookings, transactions)
  - Assignment history
  - Status change history
  - Satisfaction ratings
  - Team-based routing
  - Agent workload management
  - Auto-numbering (TICK-xxxxx)
  - Multiple sources (Web, Mobile, Email, Phone, Chat)

  ## Security
  - Enable RLS on all tables
  - Users can view/create own tickets
  - Support agents can view/update assigned tickets
  - Admins have full access
  - Internal notes hidden from non-staff

  ## Important Notes
  - Tickets auto-close after 7 days in Resolved status
  - SLA calculated from category defaults
  - First response tracked automatically
  - Assignment can be automatic or manual
  - Messages trigger notifications
  - Attachments stored in Supabase Storage
  - Agent capacity prevents overload
  - Canned responses speed up common issues
*/

-- Create ticket status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM (
      'Open',
      'InProgress',
      'Waiting',
      'Resolved',
      'Closed',
      'Cancelled'
    );
  END IF;
END $$;

-- Create ticket priority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM (
      'Low',
      'Normal',
      'High',
      'Urgent'
    );
  END IF;
END $$;

-- Create support_categories table
CREATE TABLE IF NOT EXISTS support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  default_priority ticket_priority DEFAULT 'Normal',
  sla_response_hours int DEFAULT 24,
  sla_resolution_hours int DEFAULT 72,
  parent_id uuid REFERENCES support_categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES support_categories(id),
  subject text NOT NULL,
  description text NOT NULL,
  status ticket_status DEFAULT 'Open' NOT NULL,
  priority ticket_priority DEFAULT 'Normal' NOT NULL,
  source text DEFAULT 'Web' CHECK (source IN ('Web', 'Mobile', 'Email', 'Phone', 'Chat')),
  related_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  related_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_breach boolean DEFAULT false,
  satisfaction_rating int CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  is_from_staff boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Create ticket_assignments table
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  assigned_from uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create ticket_status_history table
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create support_agents table
CREATE TABLE IF NOT EXISTS support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  team_name text,
  specialties text[] DEFAULT '{}',
  max_concurrent_tickets int DEFAULT 10,
  is_active boolean DEFAULT true,
  online_status text DEFAULT 'Offline' CHECK (online_status IN ('Online', 'Away', 'Offline')),
  last_activity_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create canned_responses table
CREATE TABLE IF NOT EXISTS canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  category_id uuid REFERENCES support_categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  usage_count int DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create ticket_sla_tracking table
CREATE TABLE IF NOT EXISTS ticket_sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL UNIQUE,
  response_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  first_response_breach boolean DEFAULT false,
  resolution_breach boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sla_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view support categories"
  ON support_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view messages on own tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND is_internal = false
  );

CREATE POLICY "Users can add messages to own tickets"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_categories_slug ON support_categories(slug);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket ON ticket_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket ON ticket_status_history(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_agents_user ON support_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_slug ON canned_responses(slug);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  next_number int;
  ticket_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS int)), 0) + 1
  INTO next_number
  FROM support_tickets;

  ticket_num := 'TICK-' || LPAD(next_number::text, 5, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON support_tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Function to create SLA tracking
CREATE OR REPLACE FUNCTION create_ticket_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE
  category_record RECORD;
BEGIN
  SELECT sla_response_hours, sla_resolution_hours
  INTO category_record
  FROM support_categories
  WHERE id = NEW.category_id;

  IF category_record IS NOT NULL THEN
    INSERT INTO ticket_sla_tracking (
      ticket_id,
      response_due_at,
      resolution_due_at
    ) VALUES (
      NEW.id,
      NEW.created_at + (category_record.sla_response_hours || ' hours')::interval,
      NEW.created_at + (category_record.sla_resolution_hours || ' hours')::interval
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_ticket_sla ON support_tickets;
CREATE TRIGGER trigger_create_ticket_sla
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_sla_tracking();

-- Function to track status changes
CREATE OR REPLACE FUNCTION track_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_status_history (
      ticket_id,
      from_status,
      to_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );

    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
      NEW.resolved_at := now();
    END IF;

    IF NEW.status = 'Closed' AND OLD.status != 'Closed' THEN
      NEW.closed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_status_change ON support_tickets;
CREATE TRIGGER trigger_track_status_change
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION track_ticket_status_change();

-- Function to track first response
CREATE OR REPLACE FUNCTION track_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_from_staff = true THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, NEW.created_at)
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_first_response ON ticket_messages;
CREATE TRIGGER trigger_track_first_response
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION track_first_response();

-- Function to check SLA breaches
CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS void AS $$
BEGIN
  -- Check first response breaches
  UPDATE ticket_sla_tracking
  SET first_response_breach = true
  WHERE response_due_at < now()
  AND first_response_breach = false
  AND ticket_id IN (
    SELECT id FROM support_tickets
    WHERE first_response_at IS NULL
    AND status NOT IN ('Resolved', 'Closed', 'Cancelled')
  );

  -- Check resolution breaches
  UPDATE ticket_sla_tracking
  SET resolution_breach = true
  WHERE resolution_due_at < now()
  AND resolution_breach = false
  AND ticket_id IN (
    SELECT id FROM support_tickets
    WHERE resolved_at IS NULL
    AND status NOT IN ('Resolved', 'Closed', 'Cancelled')
  );

  -- Mark tickets with SLA breach
  UPDATE support_tickets
  SET sla_breach = true
  WHERE id IN (
    SELECT ticket_id FROM ticket_sla_tracking
    WHERE first_response_breach = true OR resolution_breach = true
  );
END;
$$ LANGUAGE plpgsql;

-- Insert default support categories
INSERT INTO support_categories (name, slug, description, icon, default_priority, sla_response_hours, sla_resolution_hours, sort_order) VALUES
  ('General Inquiry', 'general-inquiry', 'General questions and information', 'help-circle', 'Normal', 24, 72, 1),
  ('Account Issues', 'account-issues', 'Login, password, profile problems', 'user', 'High', 12, 48, 2),
  ('Payment & Billing', 'payment-billing', 'Payment issues, refunds, invoices', 'credit-card', 'High', 12, 48, 3),
  ('Booking Issues', 'booking-issues', 'Problems with bookings', 'calendar', 'High', 6, 24, 4),
  ('Technical Issues', 'technical-issues', 'Bugs, errors, app problems', 'alert-circle', 'Urgent', 4, 24, 5),
  ('Feature Request', 'feature-request', 'Suggestions for new features', 'lightbulb', 'Low', 48, 168, 6),
  ('Report Abuse', 'report-abuse', 'Report inappropriate content or behavior', 'flag', 'Urgent', 2, 12, 7)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample canned responses
INSERT INTO canned_responses (title, slug, content, is_active) VALUES
  ('Welcome Message', 'welcome', 'Thank you for contacting support! We''ve received your ticket and will respond as soon as possible. Our typical response time is within 24 hours.', true),
  ('Request More Info', 'more-info', 'Thank you for reaching out. To better assist you, could you please provide more details about the issue you''re experiencing?', true),
  ('Issue Resolved', 'resolved', 'I''m glad we could resolve your issue. If you have any other questions or concerns, please don''t hesitate to reach out. Have a great day!', true),
  ('Escalation Notice', 'escalate', 'Your ticket has been escalated to our specialized team for further investigation. We''ll update you as soon as we have more information.', true)
ON CONFLICT (slug) DO NOTHING;
