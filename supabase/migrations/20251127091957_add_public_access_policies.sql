/*
  # Add Public Access Policies for Anonymous Users

  1. Changes
    - Add policies to allow anonymous (anon) users to view:
      - Active service listings
      - Open jobs
      - Active categories
      - Public profiles
    
  2. Security
    - Read-only access for anonymous users
    - Authenticated users retain full CRUD access to their own data
    - No data modification allowed for anonymous users
*/

-- Service Listings: Allow anonymous users to view active listings
CREATE POLICY "Public can view active service listings"
  ON service_listings
  FOR SELECT
  TO anon
  USING (status = 'Active');

-- Jobs: Allow anonymous users to view open jobs
CREATE POLICY "Public can view open jobs"
  ON jobs
  FOR SELECT
  TO anon
  USING (status IN ('Open', 'Booked'));

-- Categories: Allow anonymous users to view active categories
CREATE POLICY "Public can view active categories"
  ON categories
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Profiles: Allow anonymous users to view provider profiles
CREATE POLICY "Public can view provider profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (user_type IN ('Provider', 'Both'));
