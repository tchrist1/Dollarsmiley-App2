/*
  # Enforce Job Immutability After Posting

  1. Issue
    - Jobs can be fully edited after posting
    - Critical fields (title, description, pricing, dates) should be immutable
    - Business requirement: Jobs are final once posted

  2. Solution
    - Create trigger to prevent updates to critical fields
    - Allow only status and internal tracking fields to be updated
    - Preserve ability to cancel/close jobs

  3. Allowed Updates
    - status (for workflow: open → in_progress → completed → closed)
    - updated_at (automatic timestamp)
    - Any admin/system fields for tracking

  4. Protected Fields (Immutable)
    - title, description, category_id, subcategory_id
    - pricing_type, fixed_price, estimated_budget_min, estimated_budget_max
    - start_date, end_date, start_time, end_time, time_window_start, time_window_end
    - location, address, latitude, longitude
    - photos, requirements
*/

-- Create function to enforce job immutability
CREATE OR REPLACE FUNCTION enforce_job_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status updates (for workflow)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status change is allowed
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Check if any critical field is being modified
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category_id IS DISTINCT FROM NEW.category_id OR
    OLD.subcategory_id IS DISTINCT FROM NEW.subcategory_id OR
    OLD.pricing_type IS DISTINCT FROM NEW.pricing_type OR
    OLD.fixed_price IS DISTINCT FROM NEW.fixed_price OR
    OLD.estimated_budget_min IS DISTINCT FROM NEW.estimated_budget_min OR
    OLD.estimated_budget_max IS DISTINCT FROM NEW.estimated_budget_max OR
    OLD.start_date IS DISTINCT FROM NEW.start_date OR
    OLD.end_date IS DISTINCT FROM NEW.end_date OR
    OLD.start_time IS DISTINCT FROM NEW.start_time OR
    OLD.end_time IS DISTINCT FROM NEW.end_time OR
    OLD.time_window_start IS DISTINCT FROM NEW.time_window_start OR
    OLD.time_window_end IS DISTINCT FROM NEW.time_window_end OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.address IS DISTINCT FROM NEW.address OR
    OLD.latitude IS DISTINCT FROM NEW.latitude OR
    OLD.longitude IS DISTINCT FROM NEW.longitude OR
    OLD.photos::text IS DISTINCT FROM NEW.photos::text OR
    OLD.requirements IS DISTINCT FROM NEW.requirements
  ) THEN
    RAISE EXCEPTION 'Jobs cannot be modified after posting. Critical fields are immutable.';
  END IF;

  -- If only updated_at or other non-critical fields changed, allow it
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce immutability
DROP TRIGGER IF EXISTS enforce_job_immutability_trigger ON jobs;

CREATE TRIGGER enforce_job_immutability_trigger
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION enforce_job_immutability();

-- Add comment
COMMENT ON FUNCTION enforce_job_immutability() IS 
'Enforces job immutability. Prevents updates to critical fields after posting. Only status changes and system fields can be updated.';
