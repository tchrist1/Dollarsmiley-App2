/*
  # Add booked_at column to jobs table

  1. Changes
    - Add `booked_at` timestamptz column to jobs table
    - This column tracks when a fixed-price job was awarded to a provider

  2. Purpose
    - Supports the job_acceptances trigger that updates jobs when awarded
    - Provides audit trail of when jobs were booked
*/

-- Add booked_at column to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'booked_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN booked_at timestamptz;
  END IF;
END $$;

-- Add index for booked_at for performance
CREATE INDEX IF NOT EXISTS idx_jobs_booked_at ON jobs(booked_at)
  WHERE booked_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN jobs.booked_at IS 'Timestamp when the job was awarded to a provider';
