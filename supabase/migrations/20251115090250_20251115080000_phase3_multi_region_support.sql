/*
  # Phase 3: Multi-Region & Multi-Currency Support

  1. New Tables
    - `regions` - Supported regions
    - `currencies` - Supported currencies
    - `exchange_rates` - Currency exchange rates

  2. Enhancements to Existing Tables
    - Add region and currency columns to profiles

  3. Security
    - Enable RLS on all tables
    - Users can view active regions
*/

-- Regions Table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  supported_currencies text[] DEFAULT ARRAY['USD']::text[],
  default_currency text DEFAULT 'USD',
  timezone text DEFAULT 'America/New_York',
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_active ON regions(is_active);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regions"
  ON regions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage regions"
  ON regions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Currencies Table
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_active ON currencies(is_active);

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active currencies"
  ON currencies FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL CHECK (rate > 0),
  effective_from timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_from)
);

CREATE INDEX idx_exchange_rates_from ON exchange_rates(from_currency);
CREATE INDEX idx_exchange_rates_to ON exchange_rates(to_currency);
CREATE INDEX idx_exchange_rates_effective ON exchange_rates(effective_from DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage exchange rates"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Enhance profiles table with region/currency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'region_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN region_code text DEFAULT 'US';
    ALTER TABLE profiles ADD COLUMN preferred_currency text DEFAULT 'USD';
    ALTER TABLE profiles ADD COLUMN user_timezone text DEFAULT 'America/New_York';
  END IF;
END $$;

-- Function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(
  amount numeric,
  from_curr text,
  to_curr text
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  conversion_rate numeric;
  converted_amount numeric;
BEGIN
  IF from_curr = to_curr THEN
    RETURN amount;
  END IF;
  
  SELECT rate INTO conversion_rate
  FROM exchange_rates
  WHERE from_currency = from_curr
    AND to_currency = to_curr
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF conversion_rate IS NULL THEN
    RAISE EXCEPTION 'No exchange rate found for % to %', from_curr, to_curr;
  END IF;
  
  converted_amount := amount * conversion_rate;
  
  RETURN converted_amount;
END;
$$;

-- Function to detect user region
CREATE OR REPLACE FUNCTION detect_user_region(
  country_code text DEFAULT NULL,
  latitude numeric DEFAULT NULL,
  longitude numeric DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  detected_region text;
BEGIN
  IF country_code IS NOT NULL THEN
    SELECT code INTO detected_region
    FROM regions
    WHERE code = country_code AND is_active = true;
    
    IF detected_region IS NOT NULL THEN
      RETURN detected_region;
    END IF;
  END IF;
  
  RETURN 'US';
END;
$$;

-- Function to format currency
CREATE OR REPLACE FUNCTION format_currency_amount(
  amount numeric,
  currency_code text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  currency_symbol text;
  decimal_places integer;
  formatted text;
BEGIN
  SELECT symbol, currencies.decimal_places INTO currency_symbol, decimal_places
  FROM currencies
  WHERE code = currency_code;
  
  IF currency_symbol IS NULL THEN
    currency_symbol := currency_code;
    decimal_places := 2;
  END IF;
  
  formatted := currency_symbol || to_char(amount, 'FM999,999,999.' || repeat('0', decimal_places));
  
  RETURN formatted;
END;
$$;

-- Seed default regions
INSERT INTO regions (code, name, supported_currencies, default_currency, timezone) VALUES
  ('US', 'United States', ARRAY['USD'], 'USD', 'America/New_York'),
  ('CA', 'Canada', ARRAY['CAD', 'USD'], 'CAD', 'America/Toronto'),
  ('MX', 'Mexico', ARRAY['MXN', 'USD'], 'MXN', 'America/Mexico_City'),
  ('GB', 'United Kingdom', ARRAY['GBP', 'USD'], 'GBP', 'Europe/London'),
  ('EU', 'European Union', ARRAY['EUR', 'USD'], 'EUR', 'Europe/Paris')
ON CONFLICT (code) DO NOTHING;

-- Seed default currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('CAD', 'Canadian Dollar', 'CA$', 2),
  ('MXN', 'Mexican Peso', 'MX$', 2),
  ('GBP', 'British Pound', '£', 2),
  ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;

-- Seed default exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'CAD', 1.35),
  ('CAD', 'USD', 0.74),
  ('USD', 'MXN', 17.5),
  ('MXN', 'USD', 0.057),
  ('USD', 'GBP', 0.79),
  ('GBP', 'USD', 1.27),
  ('USD', 'EUR', 0.92),
  ('EUR', 'USD', 1.09)
ON CONFLICT (from_currency, to_currency, effective_from) DO NOTHING;