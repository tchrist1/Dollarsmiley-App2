/*
  # Enforce Job Pricing Integrity

  ## Summary
  Schema hardening migration to prevent logically invalid pricing configurations in the jobs table.
  This addresses a pre-existing gap where pricing_type and pricing fields were not mutually exclusive.

  ## Changes
  
  ### Data Cleanup
  - Fix existing data where quote-based jobs have fixed_price set (logical inconsistency)
  - Temporarily disable immutability triggers for data cleanup
  
  ### Schema Constraints
  1. **Mutual Exclusivity**: Fixed-price jobs MUST have fixed_price > 0
  2. **Logical Consistency**: Quote-based jobs MUST NOT have fixed_price set
  3. **Price Positivity**: All prices must be > 0 (not >= 0, as zero-price makes no business sense)
  4. **Budget Validation**: Budget values must be positive if present
  
  ## Invariants Enforced
  - INV-PRICE-1: pricing_type = 'fixed_price' → fixed_price IS NOT NULL AND fixed_price > 0
  - INV-PRICE-2: pricing_type = 'quote_based' → fixed_price IS NULL
  - INV-PRICE-3: budget_min > 0 if present
  - INV-PRICE-4: budget_max > 0 if present
  - INV-PRICE-5: budget_min <= budget_max if both present

  ## Impact
  - No functional behavior changes for valid inputs
  - Invalid pricing configurations will be rejected at database level
  - Existing test data will be corrected
*/

-- Step 1: Temporarily disable immutability triggers for data cleanup
ALTER TABLE jobs DISABLE TRIGGER enforce_job_immutability;
ALTER TABLE jobs DISABLE TRIGGER enforce_job_immutability_trigger;

-- Step 2: Clean up existing invalid data
-- Fix quote-based jobs that incorrectly have fixed_price set
UPDATE jobs
SET fixed_price = NULL
WHERE pricing_type = 'quote_based'
AND fixed_price IS NOT NULL;

-- Step 3: Re-enable immutability triggers
ALTER TABLE jobs ENABLE TRIGGER enforce_job_immutability;
ALTER TABLE jobs ENABLE TRIGGER enforce_job_immutability_trigger;

-- Step 4: Remove old constraints that will be replaced
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_fixed_price_check;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_min_check;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_check;

-- Step 5: Add comprehensive pricing integrity constraints

-- Constraint 1: Fixed-price jobs MUST have a positive fixed_price
ALTER TABLE jobs ADD CONSTRAINT jobs_fixed_price_required
CHECK (
  (pricing_type = 'fixed_price' AND fixed_price IS NOT NULL AND fixed_price > 0)
  OR
  pricing_type != 'fixed_price'
);

-- Constraint 2: Quote-based jobs MUST NOT have fixed_price
ALTER TABLE jobs ADD CONSTRAINT jobs_quote_no_fixed_price
CHECK (
  (pricing_type = 'quote_based' AND fixed_price IS NULL)
  OR
  pricing_type != 'quote_based'
);

-- Constraint 3: Budget minimum must be positive if present
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_min_positive
CHECK (budget_min IS NULL OR budget_min > 0);

-- Constraint 4: Budget maximum must be positive if present
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_max_positive
CHECK (budget_max IS NULL OR budget_max > 0);

-- Constraint 5: Budget range must be valid (min <= max)
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_range_valid
CHECK (
  budget_min IS NULL OR
  budget_max IS NULL OR
  budget_min <= budget_max
);

-- Add helpful comments
COMMENT ON CONSTRAINT jobs_fixed_price_required ON jobs IS 
  'INV-PRICE-1: Fixed-price jobs must have a positive fixed_price value';

COMMENT ON CONSTRAINT jobs_quote_no_fixed_price ON jobs IS 
  'INV-PRICE-2: Quote-based jobs cannot have a fixed_price (mutual exclusivity)';

COMMENT ON CONSTRAINT jobs_budget_min_positive ON jobs IS 
  'INV-PRICE-3: Budget minimum must be positive (> 0) if specified';

COMMENT ON CONSTRAINT jobs_budget_max_positive ON jobs IS 
  'INV-PRICE-4: Budget maximum must be positive (> 0) if specified';

COMMENT ON CONSTRAINT jobs_budget_range_valid ON jobs IS 
  'INV-PRICE-5: Budget minimum must not exceed budget maximum';
