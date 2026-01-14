/*
  # Create Saved Jobs System

  ## Overview
  This migration creates the saved jobs functionality, allowing users (both customers and providers)
  to bookmark jobs they're interested in for later reference.

  ## New Tables

  ### `saved_jobs`
  Stores user's saved/bookmarked jobs
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `job_id` (uuid, references jobs)
  - `notes` (text, optional user notes)
  - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own saved jobs
  - Users can view public job details

  ## Indexes
  - Fast lookups by user_id
  - Fast lookups by job_id
  - Composite index for user+job lookups

  ## Functions
  - Toggle saved job (add/remove)
  - Get user's saved jobs with full details
  - Check if job is saved by user
*/

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON saved_jobs(created_at DESC);

-- Add save_count to jobs (denormalized for performance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'save_count'
  ) THEN
    ALTER TABLE jobs ADD COLUMN save_count integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs"
  ON saved_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved jobs"
  ON saved_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved jobs"
  ON saved_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to toggle saved job
CREATE OR REPLACE FUNCTION toggle_saved_job(
  p_user_id uuid,
  p_job_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  -- Check if already saved
  SELECT id INTO v_existing_id
  FROM saved_jobs
  WHERE user_id = p_user_id AND job_id = p_job_id;

  IF v_existing_id IS NOT NULL THEN
    -- Remove from saved jobs
    DELETE FROM saved_jobs WHERE id = v_existing_id;

    -- Decrement save count
    UPDATE jobs
    SET save_count = GREATEST(0, save_count - 1)
    WHERE id = p_job_id;

    v_result := jsonb_build_object(
      'action', 'removed',
      'saved', false
    );
  ELSE
    -- Add to saved jobs
    INSERT INTO saved_jobs (user_id, job_id, notes)
    VALUES (p_user_id, p_job_id, p_notes);

    -- Increment save count
    UPDATE jobs
    SET save_count = save_count + 1
    WHERE id = p_job_id;

    v_result := jsonb_build_object(
      'action', 'added',
      'saved', true
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Function to check if job is saved by user
CREATE OR REPLACE FUNCTION is_job_saved(
  p_user_id uuid,
  p_job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM saved_jobs
    WHERE user_id = p_user_id AND job_id = p_job_id
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Function to get saved jobs with full details
CREATE OR REPLACE FUNCTION get_saved_jobs_with_details(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  saved_job_id uuid,
  job_id uuid,
  title text,
  description text,
  budget_min numeric,
  budget_max numeric,
  location text,
  execution_date_start date,
  execution_date_end date,
  preferred_time text,
  status text,
  save_count integer,
  category_name text,
  customer_id uuid,
  customer_name text,
  customer_rating numeric,
  notes text,
  saved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sj.id as saved_job_id,
    j.id as job_id,
    j.title,
    j.description,
    j.budget_min,
    j.budget_max,
    j.location,
    j.execution_date_start,
    j.execution_date_end,
    j.preferred_time,
    j.status,
    j.save_count,
    c.name as category_name,
    p.id as customer_id,
    p.full_name as customer_name,
    p.rating_average as customer_rating,
    sj.notes,
    sj.created_at as saved_at
  FROM saved_jobs sj
  JOIN jobs j ON sj.job_id = j.id
  LEFT JOIN categories c ON j.category_id = c.id
  LEFT JOIN profiles p ON j.customer_id = p.id
  WHERE sj.user_id = p_user_id
  ORDER BY sj.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get saved jobs count for user
CREATE OR REPLACE FUNCTION get_saved_jobs_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM saved_jobs
  WHERE user_id = p_user_id;

  RETURN v_count;
END;
$$;

-- Function to update saved job notes
CREATE OR REPLACE FUNCTION update_saved_job_notes(
  p_saved_job_id uuid,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE saved_jobs
  SET notes = p_notes
  WHERE id = p_saved_job_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Trigger to update job save count on delete
CREATE OR REPLACE FUNCTION on_saved_job_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE jobs
  SET save_count = GREATEST(0, save_count - 1)
  WHERE id = OLD.job_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_saved_job_deleted ON saved_jobs;

CREATE TRIGGER trigger_saved_job_deleted
  BEFORE DELETE ON saved_jobs
  FOR EACH ROW
  EXECUTE FUNCTION on_saved_job_deleted();

-- Grant permissions
GRANT EXECUTE ON FUNCTION toggle_saved_job TO authenticated;
GRANT EXECUTE ON FUNCTION is_job_saved TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_jobs_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_jobs_count TO authenticated;
GRANT EXECUTE ON FUNCTION update_saved_job_notes TO authenticated;
