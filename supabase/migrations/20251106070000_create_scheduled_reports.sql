/*
  # Create Scheduled Reports System

  1. New Tables
    - `scheduled_reports`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key to profiles)
      - `report_type` (text) - Type of report (users, revenue, bookings, analytics, etc.)
      - `report_name` (text) - Custom name for the report
      - `schedule_type` (text) - daily, weekly, monthly
      - `schedule_day` (int) - Day of week (0-6) or day of month (1-31)
      - `schedule_time` (time) - Time to run the report
      - `recipients` (jsonb) - Array of email addresses
      - `format` (text) - csv or html
      - `filters` (jsonb) - Report filters (date range, categories, etc.)
      - `is_active` (boolean) - Whether schedule is active
      - `last_run_at` (timestamptz) - Last execution timestamp
      - `next_run_at` (timestamptz) - Next scheduled execution
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `report_runs`
      - `id` (uuid, primary key)
      - `scheduled_report_id` (uuid, foreign key to scheduled_reports)
      - `status` (text) - pending, running, completed, failed
      - `file_url` (text) - URL to generated report file
      - `row_count` (int) - Number of rows in report
      - `file_size` (int) - File size in bytes
      - `error_message` (text) - Error details if failed
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admins can manage their own scheduled reports
    - Admins can view all report runs
*/

-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('users', 'bookings', 'revenue', 'analytics', 'disputes', 'payouts', 'listings')),
  report_name text NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_day int CHECK (schedule_day >= 0 AND schedule_day <= 31),
  schedule_time time NOT NULL DEFAULT '09:00:00',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  format text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'html')),
  filters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create report_runs table
CREATE TABLE IF NOT EXISTS report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id uuid REFERENCES scheduled_reports(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  file_url text,
  row_count int,
  file_size int,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_admin ON scheduled_reports(admin_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_report_runs_scheduled_report ON report_runs(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status);
CREATE INDEX IF NOT EXISTS idx_report_runs_created ON report_runs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_reports
CREATE POLICY "Admins can view all scheduled reports"
  ON scheduled_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can create scheduled reports"
  ON scheduled_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update their own scheduled reports"
  ON scheduled_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  )
  WITH CHECK (
    auth.uid() = admin_id
  );

CREATE POLICY "Admins can delete their own scheduled reports"
  ON scheduled_reports FOR DELETE
  TO authenticated
  USING (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for report_runs
CREATE POLICY "Admins can view all report runs"
  ON report_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "System can create report runs"
  ON report_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "System can update report runs"
  ON report_runs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_schedule_type text,
  p_schedule_day int,
  p_schedule_time time,
  p_from_time timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_run timestamptz;
  v_current_date date;
  v_current_time time;
BEGIN
  v_current_date := p_from_time::date;
  v_current_time := p_from_time::time;

  IF p_schedule_type = 'daily' THEN
    -- Run daily at specified time
    v_next_run := v_current_date + p_schedule_time;

    -- If time has passed today, schedule for tomorrow
    IF v_current_time >= p_schedule_time THEN
      v_next_run := v_next_run + interval '1 day';
    END IF;

  ELSIF p_schedule_type = 'weekly' THEN
    -- Run weekly on specified day (0 = Sunday, 6 = Saturday)
    v_next_run := v_current_date + p_schedule_time;

    -- Calculate days until target day of week
    v_next_run := v_next_run +
      ((p_schedule_day - EXTRACT(DOW FROM v_next_run)::int + 7) % 7) * interval '1 day';

    -- If time has passed this week, schedule for next week
    IF v_next_run <= p_from_time THEN
      v_next_run := v_next_run + interval '7 days';
    END IF;

  ELSIF p_schedule_type = 'monthly' THEN
    -- Run monthly on specified day
    v_next_run := date_trunc('month', v_current_date) +
      (p_schedule_day - 1) * interval '1 day' + p_schedule_time;

    -- If day has passed this month, schedule for next month
    IF v_next_run <= p_from_time THEN
      v_next_run := date_trunc('month', v_current_date + interval '1 month') +
        (p_schedule_day - 1) * interval '1 day' + p_schedule_time;
    END IF;

    -- Handle months with fewer days
    IF EXTRACT(DAY FROM v_next_run)::int != p_schedule_day THEN
      v_next_run := date_trunc('month', v_next_run + interval '1 month') - interval '1 day' + p_schedule_time;
    END IF;
  END IF;

  RETURN v_next_run;
END;
$$;

-- Trigger to set next_run_at on insert/update
CREATE OR REPLACE FUNCTION set_next_run_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active THEN
    NEW.next_run_at := calculate_next_run_time(
      NEW.schedule_type,
      NEW.schedule_day,
      NEW.schedule_time,
      COALESCE(NEW.last_run_at, now())
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;

  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_next_run_time
  BEFORE INSERT OR UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_next_run_time();

-- Function to get reports ready to run
CREATE OR REPLACE FUNCTION get_reports_ready_to_run()
RETURNS TABLE (
  id uuid,
  admin_id uuid,
  report_type text,
  report_name text,
  recipients jsonb,
  format text,
  filters jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    admin_id,
    report_type,
    report_name,
    recipients,
    format,
    filters
  FROM scheduled_reports
  WHERE is_active = true
    AND next_run_at IS NOT NULL
    AND next_run_at <= now();
$$;

-- Function to mark report as run
CREATE OR REPLACE FUNCTION mark_report_as_run(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE scheduled_reports
  SET
    last_run_at = now(),
    next_run_at = calculate_next_run_time(
      schedule_type,
      schedule_day,
      schedule_time,
      now()
    )
  WHERE id = p_report_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_next_run_time TO authenticated;
GRANT EXECUTE ON FUNCTION get_reports_ready_to_run TO authenticated;
GRANT EXECUTE ON FUNCTION mark_report_as_run TO authenticated;
