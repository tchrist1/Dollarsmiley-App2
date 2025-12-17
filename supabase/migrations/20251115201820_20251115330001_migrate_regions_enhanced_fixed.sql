/*
  # Migrate Regions to Enhanced Schema (Fixed)

  1. Changes
    - Backup existing regions table
    - Drop old table and dependencies
    - Create enhanced regions table
    - Migrate existing data

  2. Data Preserved
    - All 5 existing regions (US, GB, EU, CA, MX)
    - Currency configurations
    - Timezone settings
*/

-- Step 1: Create temporary backup
CREATE TEMP TABLE regions_backup AS
SELECT 
  id,
  code,
  name,
  is_active,
  supported_currencies,
  default_currency,
  timezone,
  configuration,
  created_at
FROM regions;

-- Step 2: Drop existing regions table and dependencies
DROP TABLE IF EXISTS regions CASCADE;

-- Step 3: Create enhanced regions table
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  region_code text UNIQUE NOT NULL,
  region_name text NOT NULL,
  region_type text DEFAULT 'country',

  countries text[] NOT NULL,
  default_country text NOT NULL,
  timezone text NOT NULL,
  default_language text DEFAULT 'en',
  supported_languages text[] DEFAULT ARRAY['en'],

  default_currency text NOT NULL,
  supported_currencies text[],

  is_active boolean DEFAULT true,
  launch_date date,

  allow_cross_region_booking boolean DEFAULT false,
  require_local_verification boolean DEFAULT false,

  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Migrate data
INSERT INTO regions (
  id,
  region_code,
  region_name,
  region_type,
  countries,
  default_country,
  timezone,
  default_language,
  supported_languages,
  default_currency,
  supported_currencies,
  is_active,
  launch_date,
  metadata,
  created_at
)
SELECT 
  id,
  code,
  name,
  'country',
  CASE code
    WHEN 'US' THEN ARRAY['US']
    WHEN 'GB' THEN ARRAY['GB']
    WHEN 'EU' THEN ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT']
    WHEN 'CA' THEN ARRAY['CA']
    WHEN 'MX' THEN ARRAY['MX']
    ELSE ARRAY[code]
  END,
  CASE code WHEN 'EU' THEN 'DE' ELSE code END,
  timezone,
  'en',
  ARRAY['en'],
  default_currency,
  supported_currencies,
  is_active,
  CURRENT_DATE,
  configuration,
  created_at
FROM regions_backup;

-- Step 5: Add new regions
INSERT INTO regions (region_code, region_name, region_type, countries, default_country, timezone, default_currency, supported_currencies) VALUES
  ('AU', 'Australia', 'country', ARRAY['AU'], 'AU', 'Australia/Sydney', 'AUD', ARRAY['AUD']),
  ('IN', 'India', 'country', ARRAY['IN'], 'IN', 'Asia/Kolkata', 'INR', ARRAY['INR'])
ON CONFLICT (region_code) DO NOTHING;

-- Indexes
CREATE INDEX idx_regions_code ON regions(region_code);
CREATE INDEX idx_regions_active ON regions(is_active) WHERE is_active = true;
CREATE INDEX idx_regions_countries ON regions USING GIN(countries);

-- RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regions"
  ON regions FOR SELECT
  TO authenticated, anon
  USING (is_active = true);
