/*
  # Grant permissions to authenticated role on service_listings
  
  1. Changes
    - Grant INSERT, UPDATE, DELETE permissions to authenticated role
    - This allows authenticated users to manage their own listings (controlled by RLS)
    
  2. Security
    - RLS policies control which records users can actually modify
    - Users can only manage listings where provider_id = auth.uid()
*/

-- Grant INSERT permission (for creating listings)
GRANT INSERT ON service_listings TO authenticated;

-- Grant UPDATE permission (for updating listings)
GRANT UPDATE ON service_listings TO authenticated;

-- Grant DELETE permission (for deleting listings)
GRANT DELETE ON service_listings TO authenticated;

-- Also grant to anon for consistency (RLS will still protect the data)
GRANT INSERT ON service_listings TO anon;
GRANT UPDATE ON service_listings TO anon;
GRANT DELETE ON service_listings TO anon;
