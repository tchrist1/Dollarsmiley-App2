/*
  # Fix Service Listings Public Access

  1. Changes
    - Add RLS policy to allow public (anon) users to view active service listings
    - This enables the discover page to show listings without requiring authentication

  2. Security
    - Only allows SELECT on Active listings
    - Public users cannot modify or view inactive listings
*/

-- Drop existing restrictive policy and create public-friendly one
DROP POLICY IF EXISTS "Anyone can view active listings" ON service_listings;

-- Allow both authenticated and anonymous users to view active listings
CREATE POLICY "Public can view active listings"
  ON service_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'Active');
