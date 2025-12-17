/*
  # Add Fixed-Price Job Flow

  1. Changes to jobs table
    - Add `pricing_type` - 'quote_based' or 'fixed_price'
    - Add `fixed_price` - amount for fixed-price jobs

  2. New table: job_acceptances
    - Tracks providers who accepted fixed-price jobs
    - Links job, provider, and acceptance timestamp
    - Stores status (pending, awarded, rejected)

  3. Security
    - RLS policies for job_acceptances table
    - Customers can view acceptances for their jobs
    - Providers can view their own acceptances
    - Only job owner can award jobs
*/

-- Add pricing fields to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'pricing_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN pricing_type text DEFAULT 'quote_based' 
      CHECK (pricing_type IN ('quote_based', 'fixed_price'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'fixed_price'
  ) THEN
    ALTER TABLE jobs ADD COLUMN fixed_price numeric(10, 2) CHECK (fixed_price >= 0);
  END IF;
END $$;

-- Create job_acceptances table for fixed-price jobs
CREATE TABLE IF NOT EXISTS job_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'awarded', 'rejected')),
  message text,
  accepted_at timestamptz DEFAULT now(),
  awarded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, provider_id)
);

-- Create indexes for job_acceptances
CREATE INDEX IF NOT EXISTS idx_job_acceptances_job_id ON job_acceptances(job_id);
CREATE INDEX IF NOT EXISTS idx_job_acceptances_provider_id ON job_acceptances(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_acceptances_status ON job_acceptances(status);

-- Enable RLS on job_acceptances
ALTER TABLE job_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_acceptances

-- Providers can view their own acceptances
CREATE POLICY "Providers can view own acceptances"
  ON job_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- Providers can insert their own acceptances
CREATE POLICY "Providers can accept jobs"
  ON job_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

-- Job customers can view all acceptances for their jobs
CREATE POLICY "Customers can view job acceptances"
  ON job_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_acceptances.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

-- Job customers can update acceptances for their jobs (to award)
CREATE POLICY "Customers can update job acceptances"
  ON job_acceptances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_acceptances.job_id
      AND jobs.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_acceptances.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

-- Function to count acceptances for a job
CREATE OR REPLACE FUNCTION get_job_acceptance_count(job_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM job_acceptances
    WHERE job_id = job_uuid
    AND status = 'pending'
  );
END;
$$;

-- Function to notify rejected providers when job is awarded
CREATE OR REPLACE FUNCTION notify_rejected_providers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
  acceptance_record RECORD;
BEGIN
  -- Only proceed if status changed to 'awarded'
  IF NEW.status = 'awarded' AND OLD.status != 'awarded' THEN
    -- Get job details
    SELECT * INTO job_record FROM jobs WHERE id = NEW.job_id;
    
    -- Update job status and assign provider
    UPDATE jobs 
    SET status = 'Booked', 
        provider_id = NEW.provider_id,
        booked_at = now()
    WHERE id = NEW.job_id;
    
    -- Mark all other acceptances as rejected
    UPDATE job_acceptances
    SET status = 'rejected',
        updated_at = now()
    WHERE job_id = NEW.job_id
    AND id != NEW.id
    AND status = 'pending';
    
    -- Send notifications to rejected providers
    FOR acceptance_record IN 
      SELECT * FROM job_acceptances 
      WHERE job_id = NEW.job_id 
      AND id != NEW.id 
      AND status = 'rejected'
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        acceptance_record.provider_id,
        'Job',
        'Job Awarded to Another Provider',
        'The job "' || job_record.title || '" was awarded to another provider.',
        jsonb_build_object(
          'job_id', NEW.job_id,
          'acceptance_id', acceptance_record.id
        )
      );
    END LOOP;
    
    -- Notify awarded provider
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.provider_id,
      'Job',
      'Congratulations! Job Awarded',
      'You have been awarded the job "' || job_record.title || '"!',
      jsonb_build_object(
        'job_id', NEW.job_id,
        'acceptance_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for job awarding
DROP TRIGGER IF EXISTS on_job_acceptance_awarded ON job_acceptances;
CREATE TRIGGER on_job_acceptance_awarded
  AFTER UPDATE ON job_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION notify_rejected_providers();

-- Add comment explaining the pricing types
COMMENT ON COLUMN jobs.pricing_type IS 'Type of pricing: quote_based (providers send quotes) or fixed_price (providers accept fixed price)';
COMMENT ON COLUMN jobs.fixed_price IS 'Fixed price amount for fixed_price jobs';
COMMENT ON TABLE job_acceptances IS 'Tracks provider acceptances for fixed-price jobs';
