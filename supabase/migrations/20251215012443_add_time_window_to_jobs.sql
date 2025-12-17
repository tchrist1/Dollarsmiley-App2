/*
  # Add Time Window Fields to Jobs Table

  1. Changes
    - Add `start_time` column to jobs table for optional specific start time in 12-hour format
    - Add `end_time` column to jobs table for optional specific end time in 12-hour format

  2. Notes
    - These fields are optional and refine the existing `preferred_time` selection
    - Times are stored as text in 12-hour AM/PM format (e.g., "8:00 AM", "4:30 PM")
    - Overnight time ranges are supported (e.g., "10:00 PM" to "4:00 AM")
    - No changes to existing RLS policies needed
*/

-- Add time window columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE jobs ADD COLUMN start_time text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE jobs ADD COLUMN end_time text;
  END IF;
END $$;

-- Add comment to document the time format
COMMENT ON COLUMN jobs.start_time IS 'Optional specific start time in 12-hour AM/PM format (e.g., "8:00 AM")';
COMMENT ON COLUMN jobs.end_time IS 'Optional specific end time in 12-hour AM/PM format (e.g., "4:30 PM"). Supports overnight ranges.';
