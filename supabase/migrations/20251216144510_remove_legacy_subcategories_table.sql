/*
  # Remove Legacy Subcategories Table

  ## Summary
  This migration safely removes the legacy `subcategories` table that is no longer used by the application.
  All category and subcategory data is now handled exclusively through the `categories` table using the parent_id hierarchy.

  ## Verification Performed
  - Confirmed `subcategories` table has 0 records
  - Confirmed `ai_category_suggestion_tracking` table has 0 records  
  - Confirmed no application code queries the `subcategories` table directly
  - All UI components use the `categories` table for category/subcategory data

  ## Changes
  1. Drop foreign key constraints from `ai_category_suggestion_tracking` to `subcategories`
  2. Update `ai_category_suggestion_tracking` columns to reference `categories` instead
  3. Drop the `subcategories` table

  ## Rollback
  If needed, the table and constraints can be recreated using the original migration files as reference.
*/

-- Drop foreign key constraints from ai_category_suggestion_tracking to subcategories
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_category_suggestion_tracking_suggested_subcategory_id_fkey'
    AND table_name = 'ai_category_suggestion_tracking'
  ) THEN
    ALTER TABLE ai_category_suggestion_tracking 
    DROP CONSTRAINT ai_category_suggestion_tracking_suggested_subcategory_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_category_suggestion_tracking_actual_subcategory_id_fkey'
    AND table_name = 'ai_category_suggestion_tracking'
  ) THEN
    ALTER TABLE ai_category_suggestion_tracking 
    DROP CONSTRAINT ai_category_suggestion_tracking_actual_subcategory_id_fkey;
  END IF;
END $$;

-- Update ai_category_suggestion_tracking to reference categories table instead
-- (These columns can now point to subcategory IDs from the categories table where parent_id IS NOT NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_category_suggestion_tracking' 
    AND column_name = 'suggested_subcategory_id'
  ) THEN
    ALTER TABLE ai_category_suggestion_tracking 
    ADD CONSTRAINT ai_category_suggestion_tracking_suggested_subcategory_id_fkey 
    FOREIGN KEY (suggested_subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_category_suggestion_tracking' 
    AND column_name = 'actual_subcategory_id'
  ) THEN
    ALTER TABLE ai_category_suggestion_tracking 
    ADD CONSTRAINT ai_category_suggestion_tracking_actual_subcategory_id_fkey 
    FOREIGN KEY (actual_subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop the legacy subcategories table
DROP TABLE IF EXISTS subcategories;