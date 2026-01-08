/*
  # Job Time Extension Approval System

  1. New Tables
    - `job_time_extension_requests`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `provider_id` (uuid, foreign key to profiles)
      - `requested_additional_hours` (numeric, additional time requested)
      - `reason` (text, explanation for extension)
      - `status` (text, pending/approved/declined/cancelled)
      - `requested_at` (timestamptz, when request was made)
      - `responded_at` (timestamptz, when customer responded)
      - `responded_by` (uuid, customer who responded)
      - `customer_response_notes` (text, optional customer message)
      - `proposed_price_adjustment` (numeric, optional price change for quote-based jobs)
      - `approved_additional_hours` (numeric, actual approved hours - may differ from requested)
      - `original_estimated_duration` (numeric, snapshot of job's duration at request time)

  2. Security
    - Enable RLS on `job_time_extension_requests` table
    - Providers can create requests and view their own
    - Customers can view requests for their jobs and respond
    - Admins can view all requests

  3. Audit Trail
    - All requests, approvals, and rejections are logged
    - Timestamped for dispute resolution
    - Immutable after response (no updates allowed)
*/

-- Create job_time_extension_requests table
CREATE TABLE IF NOT EXISTS job_time_extension_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_additional_hours numeric NOT NULL CHECK (requested_additional_hours > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES profiles(id),
  customer_response_notes text,
  proposed_price_adjustment numeric CHECK (proposed_price_adjustment >= 0),
  approved_additional_hours numeric CHECK (approved_additional_hours >= 0),
  original_estimated_duration numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_time_extensions_job_id ON job_time_extension_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_time_extensions_provider_id ON job_time_extension_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_time_extensions_status ON job_time_extension_requests(status);

-- Enable RLS
ALTER TABLE job_time_extension_requests ENABLE ROW LEVEL SECURITY;

-- Providers can create requests for jobs they're assigned to
CREATE POLICY "Providers can create time extension requests"
  ON job_time_extension_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.status IN ('In Progress', 'Started')
    )
  );

-- Providers can view their own requests
CREATE POLICY "Providers can view their own time extension requests"
  ON job_time_extension_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- Customers can view requests for their jobs
CREATE POLICY "Customers can view time extension requests for their jobs"
  ON job_time_extension_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.customer_id = auth.uid()
    )
  );

-- Customers can update request status (approve/decline)
CREATE POLICY "Customers can respond to time extension requests"
  ON job_time_extension_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.customer_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.customer_id = auth.uid()
    )
    AND status IN ('approved', 'declined')
  );

-- Providers can cancel their own pending requests
CREATE POLICY "Providers can cancel their own pending requests"
  ON job_time_extension_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = provider_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = provider_id
    AND status = 'cancelled'
  );

-- Admins can view all requests
CREATE POLICY "Admins can view all time extension requests"
  ON job_time_extension_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Create function to get active time extensions for a job
CREATE OR REPLACE FUNCTION get_job_total_approved_extensions(p_job_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(approved_additional_hours), 0)
  INTO v_total
  FROM job_time_extension_requests
  WHERE job_id = p_job_id
  AND status = 'approved';

  RETURN v_total;
END;
$$;

-- Create function to check if job has pending extension requests
CREATE OR REPLACE FUNCTION has_pending_extension_request(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_pending boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM job_time_extension_requests
    WHERE job_id = p_job_id
    AND status = 'pending'
  ) INTO v_has_pending;

  RETURN v_has_pending;
END;
$$;

-- Create function to prevent duplicate pending requests
CREATE OR REPLACE FUNCTION check_no_duplicate_pending_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM job_time_extension_requests
    WHERE job_id = NEW.job_id
    AND provider_id = NEW.provider_id
    AND status = 'pending'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'A pending time extension request already exists for this job';
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to prevent duplicate pending requests
CREATE TRIGGER prevent_duplicate_pending_requests
  BEFORE INSERT ON job_time_extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_no_duplicate_pending_requests();

-- Create function to automatically capture original estimated duration
CREATE OR REPLACE FUNCTION capture_original_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.original_estimated_duration IS NULL THEN
    SELECT estimated_duration_hours
    INTO NEW.original_estimated_duration
    FROM jobs
    WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to capture original duration
CREATE TRIGGER set_original_duration
  BEFORE INSERT ON job_time_extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION capture_original_duration();

-- Create function to send notification when extension is requested
CREATE OR REPLACE FUNCTION notify_customer_of_extension_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_job_title text;
BEGIN
  -- Get customer ID and job title
  SELECT customer_id, title
  INTO v_customer_id, v_job_title
  FROM jobs
  WHERE id = NEW.job_id;

  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    created_at
  ) VALUES (
    v_customer_id,
    'time_extension_request',
    'Time Extension Request',
    format('A provider has requested %s additional hours for job: %s', NEW.requested_additional_hours, v_job_title),
    NEW.job_id,
    now()
  );

  RETURN NEW;
END;
$$;

-- Add trigger to notify customer
CREATE TRIGGER notify_extension_request
  AFTER INSERT ON job_time_extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_of_extension_request();

-- Create function to notify provider of response
CREATE OR REPLACE FUNCTION notify_provider_of_extension_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_title text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify on status change to approved or declined
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'declined') THEN
    -- Get job title
    SELECT title INTO v_job_title
    FROM jobs
    WHERE id = NEW.job_id;

    IF NEW.status = 'approved' THEN
      v_notification_title := 'Time Extension Approved';
      v_notification_message := format('Your time extension request for %s hours has been approved for job: %s',
        COALESCE(NEW.approved_additional_hours, NEW.requested_additional_hours), v_job_title);
    ELSE
      v_notification_title := 'Time Extension Declined';
      v_notification_message := format('Your time extension request has been declined for job: %s', v_job_title);
    END IF;

    -- Create notification for provider
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      created_at
    ) VALUES (
      NEW.provider_id,
      'time_extension_response',
      v_notification_title,
      v_notification_message,
      NEW.job_id,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to notify provider of response
CREATE TRIGGER notify_extension_response
  AFTER UPDATE ON job_time_extension_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_of_extension_response();

-- Create view for extension request summary
CREATE OR REPLACE VIEW job_extension_summary AS
SELECT
  j.id as job_id,
  j.title as job_title,
  j.estimated_duration_hours as original_estimated_hours,
  COALESCE(SUM(CASE WHEN ter.status = 'approved' THEN ter.approved_additional_hours ELSE 0 END), 0) as total_approved_extensions,
  j.estimated_duration_hours + COALESCE(SUM(CASE WHEN ter.status = 'approved' THEN ter.approved_additional_hours ELSE 0 END), 0) as effective_duration,
  COUNT(CASE WHEN ter.status = 'pending' THEN 1 END) as pending_requests,
  COUNT(CASE WHEN ter.status = 'approved' THEN 1 END) as approved_requests,
  COUNT(CASE WHEN ter.status = 'declined' THEN 1 END) as declined_requests
FROM jobs j
LEFT JOIN job_time_extension_requests ter ON j.id = ter.job_id
GROUP BY j.id, j.title, j.estimated_duration_hours;