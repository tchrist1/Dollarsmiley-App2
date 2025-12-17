/*
  # Add item_dimensions column and create fulfillment_options table

  1. Changes to service_listings
    - Add `item_dimensions` jsonb column for storing shipping dimensions

  2. New Tables
    - `fulfillment_options` - stores fulfillment types for custom service listings
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to service_listings)
      - `fulfillment_type` (text) - Pickup, DropOff, or Shipping
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on fulfillment_options
    - Add policies for providers to manage their fulfillment options
*/

-- Add item_dimensions column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'item_dimensions'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN item_dimensions jsonb;
    
    COMMENT ON COLUMN service_listings.item_dimensions IS 'Dimensions of custom service item for shipping (length, width, height in inches)';
  END IF;
END $$;

-- Create fulfillment_options table if it doesn't exist
CREATE TABLE IF NOT EXISTS fulfillment_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('Pickup', 'DropOff', 'Shipping')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, fulfillment_type)
);

-- Enable RLS on fulfillment_options
ALTER TABLE fulfillment_options ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can view their own fulfillment options
CREATE POLICY "Providers can view own fulfillment options"
  ON fulfillment_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

-- Policy: Providers can insert their own fulfillment options
CREATE POLICY "Providers can insert own fulfillment options"
  ON fulfillment_options
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

-- Policy: Providers can update their own fulfillment options
CREATE POLICY "Providers can update own fulfillment options"
  ON fulfillment_options
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

-- Policy: Providers can delete their own fulfillment options
CREATE POLICY "Providers can delete own fulfillment options"
  ON fulfillment_options
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

-- Policy: Anyone can view fulfillment options for active listings
CREATE POLICY "Anyone can view fulfillment options for active listings"
  ON fulfillment_options
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = fulfillment_options.listing_id
      AND sl.is_active = true
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_fulfillment_options_listing_id 
  ON fulfillment_options(listing_id);
