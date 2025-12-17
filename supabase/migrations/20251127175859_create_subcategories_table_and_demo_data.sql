/*
  # Create Subcategories Table and Populate Demo Data
  
  1. New Tables
    - `subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to categories)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `subcategories` table
    - Add policy for public read access
    - Add policy for authenticated users to manage own data
  
  3. Demo Data
    - Insert subcategories for all existing categories
    - Link subcategories properly to parent categories
*/

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view subcategories"
  ON subcategories FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to manage subcategories (for providers)
CREATE POLICY "Authenticated users can manage subcategories"
  ON subcategories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);

-- Insert subcategories for existing categories
INSERT INTO subcategories (category_id, name, description) VALUES
  -- Home Services subcategories
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'House Cleaning', 'Regular home cleaning services'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Deep Cleaning', 'Thorough deep cleaning services'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Move-in/Move-out Cleaning', 'Cleaning for moving'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'General Repairs', 'Basic home repairs'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Plumbing', 'Plumbing services'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Electrical Work', 'Electrical repairs and installations'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Painting', 'Interior and exterior painting'),
  ((SELECT id FROM categories WHERE name = 'Home Services'), 'Carpentry', 'Woodwork and carpentry'),
  
  -- Events & Parties subcategories
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Wedding Catering', 'Catering for weddings'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Corporate Events', 'Business event catering'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Birthday Parties', 'Party catering'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Wedding DJ', 'Music for weddings'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Party DJ', 'DJ services for parties'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Event Coordinator', 'Full event planning'),
  ((SELECT id FROM categories WHERE name = 'Events & Parties'), 'Venue Decoration', 'Event decoration services'),
  
  -- Cleaning subcategories
  ((SELECT id FROM categories WHERE name = 'Cleaning'), 'Residential Cleaning', 'Home cleaning'),
  ((SELECT id FROM categories WHERE name = 'Cleaning'), 'Commercial Cleaning', 'Office cleaning'),
  ((SELECT id FROM categories WHERE name = 'Cleaning'), 'Carpet Cleaning', 'Professional carpet cleaning'),
  ((SELECT id FROM categories WHERE name = 'Cleaning'), 'Window Cleaning', 'Window washing services'),
  
  -- Hair Styling subcategories
  ((SELECT id FROM categories WHERE name = 'Hair Styling'), 'Haircuts', 'Professional haircuts'),
  ((SELECT id FROM categories WHERE name = 'Hair Styling'), 'Hair Coloring', 'Professional hair coloring'),
  ((SELECT id FROM categories WHERE name = 'Hair Styling'), 'Hair Extensions', 'Extension installation'),
  ((SELECT id FROM categories WHERE name = 'Hair Styling'), 'Styling for Events', 'Special occasion styling'),
  
  -- Braiding subcategories
  ((SELECT id FROM categories WHERE name = 'Braiding'), 'Box Braids', 'Box braid installations'),
  ((SELECT id FROM categories WHERE name = 'Braiding'), 'Cornrows', 'Cornrow styles'),
  ((SELECT id FROM categories WHERE name = 'Braiding'), 'Senegalese Twists', 'Twist installations'),
  ((SELECT id FROM categories WHERE name = 'Braiding'), 'Knotless Braids', 'Knotless braid styles'),
  
  -- Makeup subcategories
  ((SELECT id FROM categories WHERE name = 'Makeup'), 'Bridal Makeup', 'Makeup for weddings'),
  ((SELECT id FROM categories WHERE name = 'Makeup'), 'Special Events Makeup', 'Event makeup services'),
  ((SELECT id FROM categories WHERE name = 'Makeup'), 'Photoshoot Makeup', 'Makeup for photography'),
  ((SELECT id FROM categories WHERE name = 'Makeup'), 'Makeup Lessons', 'Learn makeup techniques'),
  
  -- Landscaping subcategories
  ((SELECT id FROM categories WHERE name = 'Landscaping'), 'Lawn Mowing', 'Regular lawn maintenance'),
  ((SELECT id FROM categories WHERE name = 'Landscaping'), 'Yard Cleanup', 'Seasonal yard cleanup'),
  ((SELECT id FROM categories WHERE name = 'Landscaping'), 'Tree Trimming', 'Tree and shrub trimming'),
  ((SELECT id FROM categories WHERE name = 'Landscaping'), 'Garden Design', 'Landscape design services'),
  
  -- Electrical subcategories
  ((SELECT id FROM categories WHERE name = 'Electrical'), 'Wiring Installation', 'Electrical wiring'),
  ((SELECT id FROM categories WHERE name = 'Electrical'), 'Lighting Installation', 'Light fixture installation'),
  ((SELECT id FROM categories WHERE name = 'Electrical'), 'Outlet & Switch Repair', 'Electrical outlet services'),
  ((SELECT id FROM categories WHERE name = 'Electrical'), 'Circuit Breaker Services', 'Breaker panel work')
ON CONFLICT DO NOTHING;
