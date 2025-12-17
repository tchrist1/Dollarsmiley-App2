/*
  # Create Job Status Tracking Timeline

  1. New Tables
    - `job_status_history`
      - Tracks every status change for jobs
      - Records who made the change and when
      - Stores additional context/notes
    - `job_timeline_events`
      - Custom events and milestones for jobs
      - Flexible metadata storage

  2. New Functions
    - `track_job_status_change` - Automatically logs status changes
    - `add_job_timeline_event` - Add custom timeline events
    - `get_job_timeline` - Get complete timeline for a job
    - `get_job_status_transitions` - Get valid status transitions

  3. Triggers
    - Automatically track status changes on jobs table

  4. Security
    - RLS enabled on all tables
    - Job owners can view their job timelines
    - System can insert timeline events
*/

-- Create job status history table
CREATE TABLE IF NOT EXISTS job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_role text, -- 'customer', 'provider', 'admin', 'system'
  reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create job timeline events table
CREATE TABLE IF NOT EXISTS job_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'created', 'updated', 'quote_received', 'quote_accepted', 'expired', etc.
  title text NOT NULL,
  description text,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role text, -- 'customer', 'provider', 'system'
  metadata jsonb DEFAULT '{}'::jsonb,
  is_milestone boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_created_at ON job_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_job_timeline_events_job_id ON job_timeline_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_timeline_events_created_at ON job_timeline_events(created_at);
CREATE INDEX IF NOT EXISTS idx_job_timeline_events_type ON job_timeline_events(event_type);

-- Enable RLS
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_status_history
CREATE POLICY "Job owners can view status history"
  ON job_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_status_history.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

CREATE POLICY "System can insert status history"
  ON job_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for job_timeline_events
CREATE POLICY "Job owners can view timeline events"
  ON job_timeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_timeline_events.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert timeline events"
  ON job_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to track job status changes
CREATE OR REPLACE FUNCTION track_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_role text;
BEGIN
  -- Determine actor role
  IF auth.uid() IS NULL THEN
    v_actor_role := 'system';
  ELSE
    SELECT user_type INTO v_actor_role
    FROM profiles
    WHERE id = auth.uid();

    v_actor_role := COALESCE(LOWER(v_actor_role), 'system');
  END IF;

  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_status_history (
      job_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      v_actor_role,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', now()
      )
    );

    -- Add corresponding timeline event
    PERFORM add_job_timeline_event(
      NEW.id,
      'status_changed',
      'Job Status Changed',
      'Status changed from ' || COALESCE(OLD.status, 'new') || ' to ' || NEW.status,
      auth.uid(),
      v_actor_role,
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      ),
      true -- is_milestone
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic status tracking
DROP TRIGGER IF EXISTS track_job_status_change_trigger ON jobs;
CREATE TRIGGER track_job_status_change_trigger
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION track_job_status_change();

-- Function to add custom timeline events
CREATE OR REPLACE FUNCTION add_job_timeline_event(
  p_job_id uuid,
  p_event_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_is_milestone boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_actor_id uuid;
  v_actor_role text;
BEGIN
  -- Use provided actor or current user
  v_actor_id := COALESCE(p_actor_id, auth.uid());

  -- Determine actor role if not provided
  IF p_actor_role IS NULL AND v_actor_id IS NOT NULL THEN
    SELECT LOWER(user_type) INTO v_actor_role
    FROM profiles
    WHERE id = v_actor_id;
  ELSE
    v_actor_role := COALESCE(p_actor_role, 'system');
  END IF;

  -- Insert timeline event
  INSERT INTO job_timeline_events (
    job_id,
    event_type,
    title,
    description,
    actor_id,
    actor_role,
    metadata,
    is_milestone
  ) VALUES (
    p_job_id,
    p_event_type,
    p_title,
    p_description,
    v_actor_id,
    v_actor_role,
    COALESCE(p_metadata, '{}'::jsonb),
    p_is_milestone
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function to get complete job timeline
CREATE OR REPLACE FUNCTION get_job_timeline(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timeline jsonb DEFAULT '[]'::jsonb;
  v_job_record RECORD;
BEGIN
  -- Get job details
  SELECT * INTO v_job_record
  FROM jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Build timeline from multiple sources
  WITH all_events AS (
    -- Job creation event
    SELECT
      gen_random_uuid() as id,
      'created' as event_type,
      'Job Posted' as title,
      'Job was posted and is now visible to providers' as description,
      v_job_record.customer_id as actor_id,
      'customer' as actor_role,
      v_job_record.created_at as event_time,
      jsonb_build_object(
        'title', v_job_record.title,
        'budget_min', v_job_record.budget_min,
        'budget_max', v_job_record.budget_max,
        'category', (SELECT name FROM categories WHERE id = v_job_record.category_id)
      ) as metadata,
      true as is_milestone,
      1 as priority

    UNION ALL

    -- Status change events
    SELECT
      jsh.id,
      'status_changed' as event_type,
      'Status: ' || jsh.to_status as title,
      COALESCE(jsh.notes, 'Job status was updated') as description,
      jsh.changed_by as actor_id,
      jsh.changed_by_role as actor_role,
      jsh.created_at as event_time,
      jsh.metadata,
      true as is_milestone,
      2 as priority
    FROM job_status_history jsh
    WHERE jsh.job_id = p_job_id

    UNION ALL

    -- Custom timeline events
    SELECT
      jte.id,
      jte.event_type,
      jte.title,
      jte.description,
      jte.actor_id,
      jte.actor_role,
      jte.created_at as event_time,
      jte.metadata,
      jte.is_milestone,
      3 as priority
    FROM job_timeline_events jte
    WHERE jte.job_id = p_job_id

    UNION ALL

    -- Quote received events
    SELECT
      b.id,
      'quote_received' as event_type,
      'Quote Received' as title,
      'Provider submitted a quote for $' || b.price::text as description,
      b.provider_id as actor_id,
      'provider' as actor_role,
      b.created_at as event_time,
      jsonb_build_object(
        'price', b.price,
        'status', b.status,
        'provider_name', p.full_name
      ) as metadata,
      false as is_milestone,
      4 as priority
    FROM bookings b
    JOIN profiles p ON b.provider_id = p.id
    WHERE b.job_id = p_job_id
    AND b.status = 'Requested'

    UNION ALL

    -- Quote accepted events
    SELECT
      b.id,
      'quote_accepted' as event_type,
      'Quote Accepted' as title,
      'Quote from ' || p.full_name || ' was accepted' as description,
      v_job_record.customer_id as actor_id,
      'customer' as actor_role,
      b.updated_at as event_time,
      jsonb_build_object(
        'price', b.price,
        'provider_name', p.full_name,
        'booking_id', b.id
      ) as metadata,
      true as is_milestone,
      5 as priority
    FROM bookings b
    JOIN profiles p ON b.provider_id = p.id
    WHERE b.job_id = p_job_id
    AND b.status IN ('Confirmed', 'Accepted')
    LIMIT 1

    UNION ALL

    -- Job expired event (if expired)
    SELECT
      gen_random_uuid() as id,
      'expired' as event_type,
      'Job Expired' as title,
      'Job posting has expired without being filled' as description,
      NULL as actor_id,
      'system' as actor_role,
      v_job_record.expires_at as event_time,
      jsonb_build_object('reason', 'expiration_date_reached') as metadata,
      true as is_milestone,
      6 as priority
    WHERE v_job_record.status = 'Expired'
    AND v_job_record.expires_at IS NOT NULL
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ae.id,
      'event_type', ae.event_type,
      'title', ae.title,
      'description', ae.description,
      'actor', jsonb_build_object(
        'id', ae.actor_id,
        'name', COALESCE(p.full_name, 'System'),
        'role', ae.actor_role
      ),
      'timestamp', ae.event_time,
      'metadata', ae.metadata,
      'is_milestone', ae.is_milestone
    )
    ORDER BY ae.event_time ASC
  )
  INTO v_timeline
  FROM all_events ae
  LEFT JOIN profiles p ON ae.actor_id = p.id;

  RETURN COALESCE(v_timeline, '[]'::jsonb);
END;
$$;

-- Function to get valid status transitions
CREATE OR REPLACE FUNCTION get_job_status_transitions()
RETURNS TABLE (
  from_status text,
  to_status text,
  allowed_roles text[],
  description text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Open', 'Booked', ARRAY['customer'], 'Customer accepts a quote'),
    ('Open', 'Expired', ARRAY['system'], 'Job posting expired'),
    ('Open', 'Cancelled', ARRAY['customer'], 'Customer cancels job'),
    ('Booked', 'Completed', ARRAY['provider', 'customer'], 'Service completed'),
    ('Booked', 'Cancelled', ARRAY['customer', 'provider'], 'Booking cancelled'),
    ('Expired', 'Open', ARRAY['customer'], 'Job reposted'),
    ('Cancelled', 'Open', ARRAY['customer'], 'Job reposted')
  ) AS t(from_status, to_status, allowed_roles, description);
END;
$$;

-- Function to initialize timeline for existing jobs
CREATE OR REPLACE FUNCTION initialize_job_timelines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_count integer := 0;
BEGIN
  -- Add creation events for jobs without timeline
  FOR v_job IN
    SELECT j.*
    FROM jobs j
    WHERE NOT EXISTS (
      SELECT 1 FROM job_timeline_events jte
      WHERE jte.job_id = j.id
      AND jte.event_type = 'created'
    )
  LOOP
    PERFORM add_job_timeline_event(
      v_job.id,
      'created',
      'Job Posted',
      'Job was posted and is now visible to providers',
      v_job.customer_id,
      'customer',
      jsonb_build_object(
        'title', v_job.title,
        'budget_min', v_job.budget_min,
        'budget_max', v_job.budget_max
      ),
      true
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_job_timeline_event(uuid, text, text, text, uuid, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_timeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_status_transitions() TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_job_timelines() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE job_status_history IS 'Tracks all status changes for job postings';
COMMENT ON TABLE job_timeline_events IS 'Custom timeline events and milestones for jobs';
COMMENT ON FUNCTION get_job_timeline(uuid) IS 'Returns complete timeline of events for a job posting';
COMMENT ON FUNCTION add_job_timeline_event IS 'Add a custom event to a job timeline';
