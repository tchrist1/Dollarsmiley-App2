/*
  # Fix Job Immutability Trigger - Remove Non-Existent Columns

  ## Issue
  - Trigger references subcategory_id, estimated_budget_min/max, start_date, end_date, 
    requirements columns that don't exist in jobs table
  - Causes errors when trying to update jobs
  
  ## Solution
  - Update trigger to only reference actual columns in the jobs table
  - Keep immutability enforcement for fields that actually exist
*/

CREATE OR REPLACE FUNCTION enforce_job_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Allow status updates (for workflow)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Allow provider_id to be set when job is booked
  IF OLD.provider_id IS NULL AND NEW.provider_id IS NOT NULL THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Allow booked_at to be set
  IF OLD.booked_at IS NULL AND NEW.booked_at IS NOT NULL THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Check if any critical field is being modified (only actual columns)
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category_id IS DISTINCT FROM NEW.category_id OR
    OLD.pricing_type IS DISTINCT FROM NEW.pricing_type OR
    OLD.fixed_price IS DISTINCT FROM NEW.fixed_price OR
    OLD.budget_min IS DISTINCT FROM NEW.budget_min OR
    OLD.budget_max IS DISTINCT FROM NEW.budget_max OR
    OLD.execution_date_start IS DISTINCT FROM NEW.execution_date_start OR
    OLD.execution_date_end IS DISTINCT FROM NEW.execution_date_end OR
    OLD.start_time IS DISTINCT FROM NEW.start_time OR
    OLD.end_time IS DISTINCT FROM NEW.end_time OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.street_address IS DISTINCT FROM NEW.street_address OR
    OLD.latitude IS DISTINCT FROM NEW.latitude OR
    OLD.longitude IS DISTINCT FROM NEW.longitude OR
    OLD.photos::text IS DISTINCT FROM NEW.photos::text
  ) THEN
    RAISE EXCEPTION 'Jobs cannot be modified after posting. Critical fields are immutable.';
  END IF;

  -- If only updated_at or other non-critical fields changed, allow it
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
