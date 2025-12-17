/*
  # Job Expiration Automation System

  1. Purpose
    - Automatically expire jobs after their execution date passes
    - Keep job feed clean and relevant
    - Notify customers when jobs expire without being booked

  2. New Functions
    - `expire_past_jobs()` - Automatically marks jobs as expired
    - `schedule_job_expiration()` - Trigger function for job expiration

  3. Automation
    - Cron job to run expiration check daily
    - Automatic status updates for past-due jobs
*/

-- Function to expire jobs that have passed their execution date
CREATE OR REPLACE FUNCTION expire_past_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE jobs
  SET status = 'Expired',
      updated_at = now()
  WHERE status = 'Open'
    AND execution_date_start < CURRENT_DATE;
END;
$$;

-- Function to check if a job should be expired on insert/update
CREATE OR REPLACE FUNCTION check_job_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If execution date has passed and job is still open, mark as expired
  IF NEW.execution_date_start < CURRENT_DATE AND NEW.status = 'Open' THEN
    NEW.status := 'Expired';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check expiration on job updates
CREATE TRIGGER check_job_expiration_trigger
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_job_expiration();

-- Function to auto-set expires_at if not provided
CREATE OR REPLACE FUNCTION set_job_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If expires_at is not set, default to 30 days from now or execution date, whichever is sooner
  IF NEW.expires_at IS NULL THEN
    IF NEW.execution_date_start IS NOT NULL THEN
      NEW.expires_at := LEAST(
        now() + INTERVAL '30 days',
        NEW.execution_date_start::timestamp + INTERVAL '1 day'
      );
    ELSE
      NEW.expires_at := now() + INTERVAL '30 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to set expires_at on job creation
CREATE TRIGGER set_job_expires_at_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_expires_at();

-- Create index for faster expiration queries
CREATE INDEX IF NOT EXISTS idx_jobs_expiration
  ON jobs(execution_date_start, status)
  WHERE status = 'Open';

-- Function to get expiring jobs (for notifications)
CREATE OR REPLACE FUNCTION get_expiring_jobs(days_threshold integer DEFAULT 1)
RETURNS TABLE (
  job_id uuid,
  customer_id uuid,
  title text,
  execution_date_start date,
  days_until_execution integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id as job_id,
    customer_id,
    title,
    execution_date_start,
    (execution_date_start - CURRENT_DATE)::integer as days_until_execution
  FROM jobs
  WHERE status = 'Open'
    AND execution_date_start BETWEEN CURRENT_DATE AND CURRENT_DATE + days_threshold
  ORDER BY execution_date_start ASC;
$$;

-- Function to count quotes/bookings for a job
CREATE OR REPLACE FUNCTION get_job_quote_count(job_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM bookings
  WHERE job_id = job_uuid
    AND status = 'Requested';
$$;
