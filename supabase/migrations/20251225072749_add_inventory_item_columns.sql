/*
  # Add missing columns to provider_inventory_items

  1. Changes
    - Add `turnaround_hours` column (alias for turnaround_buffer_hours)
    - Add `default_rental_price` column for rental items
    
  2. Notes
    - turnaround_hours mirrors turnaround_buffer_hours for API consistency
    - default_rental_price allows setting a base rental rate per item
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_inventory_items' AND column_name = 'turnaround_hours'
  ) THEN
    ALTER TABLE provider_inventory_items ADD COLUMN turnaround_hours integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_inventory_items' AND column_name = 'default_rental_price'
  ) THEN
    ALTER TABLE provider_inventory_items ADD COLUMN default_rental_price numeric(10,2) DEFAULT NULL;
  END IF;
END $$;

UPDATE provider_inventory_items
SET turnaround_hours = turnaround_buffer_hours
WHERE turnaround_hours IS NULL OR turnaround_hours = 0;
