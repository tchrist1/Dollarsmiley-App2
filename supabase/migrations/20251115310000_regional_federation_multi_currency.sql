/*
  # Regional Federation & Multi-Currency System

  1. New Tables
    - `regions` - Regional marketplace definitions
    - `currencies` - Supported currencies
    - `exchange_rates` - Real-time exchange rates
    - `currency_conversions` - Conversion history
    - `regional_settings` - Region-specific configuration
    - `regional_payment_methods` - Payment methods per region
    - `regional_compliance` - Compliance rules per region
    - `regional_pricing` - Dynamic pricing per region
    - `translations` - Multi-language support
    - `user_regional_preferences` - User region/currency preferences

  2. Features
    - Multi-currency support (150+ currencies)
    - Real-time exchange rates
    - Regional marketplaces
    - Localized pricing
    - Regional payment methods
    - Multi-language support
    - Regional compliance

  3. Security
    - Enable RLS on all tables
    - Region-specific data access
*/

-- Regions (marketplace regions)
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Region details
  region_code text UNIQUE NOT NULL, -- US, UK, EU, CA, AU, etc.
  region_name text NOT NULL,
  region_type text DEFAULT 'country', -- country, continent, custom

  -- Geographic
  countries text[] NOT NULL, -- ISO country codes
  default_country text NOT NULL,
  timezone text NOT NULL,
  default_language text DEFAULT 'en',
  supported_languages text[] DEFAULT ARRAY['en'],

  -- Currency
  default_currency text NOT NULL, -- USD, EUR, GBP, etc.
  supported_currencies text[],

  -- Status
  is_active boolean DEFAULT true,
  launch_date date,

  -- Configuration
  allow_cross_region_booking boolean DEFAULT false,
  require_local_verification boolean DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Currencies
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currency details
  currency_code text UNIQUE NOT NULL, -- ISO 4217 code
  currency_name text NOT NULL,
  currency_symbol text NOT NULL,
  symbol_position text DEFAULT 'before', -- before, after

  -- Format
  decimal_places integer DEFAULT 2,
  decimal_separator text DEFAULT '.',
  thousands_separator text DEFAULT ',',

  -- Status
  is_active boolean DEFAULT true,
  is_crypto boolean DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exchange Rates (real-time currency exchange)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rate details
  from_currency text NOT NULL REFERENCES currencies(currency_code),
  to_currency text NOT NULL REFERENCES currencies(currency_code),
  exchange_rate numeric(20, 8) NOT NULL,

  -- Source
  rate_source text DEFAULT 'manual', -- manual, api, central_bank
  rate_provider text,

  -- Validity
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_current boolean DEFAULT true,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),

  UNIQUE(from_currency, to_currency, valid_from)
);

-- Currency Conversions (conversion history)
CREATE TABLE IF NOT EXISTS currency_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversion details
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount numeric(20, 2) NOT NULL,
  to_amount numeric(20, 2) NOT NULL,
  exchange_rate numeric(20, 8) NOT NULL,

  -- Context
  conversion_reason text, -- booking, payout, refund, transfer
  related_entity_type text,
  related_entity_id uuid,

  -- User
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  converted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Regional Settings (region-specific configuration)
CREATE TABLE IF NOT EXISTS regional_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  -- Business rules
  min_booking_amount numeric(10, 2),
  max_booking_amount numeric(10, 2),
  service_fee_percentage numeric(5, 2) DEFAULT 10.00,
  payment_processing_fee numeric(5, 2) DEFAULT 2.90,

  -- Tax configuration
  tax_name text, -- VAT, GST, Sales Tax
  tax_rate numeric(5, 2),
  tax_included_in_price boolean DEFAULT false,

  -- Features
  features_enabled jsonb DEFAULT '{}',
  features_disabled jsonb DEFAULT '{}',

  -- Contact
  support_email text,
  support_phone text,
  emergency_contact text,

  -- Legal
  terms_url text,
  privacy_url text,
  refund_policy_url text,

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(region_id)
);

-- Regional Payment Methods
CREATE TABLE IF NOT EXISTS regional_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  -- Payment method
  payment_method_key text NOT NULL, -- stripe, paypal, ideal, sofort, alipay
  payment_method_name text NOT NULL,
  payment_provider text NOT NULL,

  -- Currencies supported
  supported_currencies text[],

  -- Limits
  min_amount numeric(10, 2),
  max_amount numeric(10, 2),

  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,

  -- Display
  display_order integer DEFAULT 0,
  icon_url text,

  -- Configuration
  configuration jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Regional Compliance (compliance requirements per region)
CREATE TABLE IF NOT EXISTS regional_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  -- Compliance type
  compliance_type text NOT NULL,
  -- Types: gdpr, ccpa, kyc, aml, tax_reporting, data_residency

  compliance_name text NOT NULL,
  description text,

  -- Requirements
  is_required boolean DEFAULT true,
  applies_to text[], -- customers, providers, both

  -- Implementation
  verification_required boolean DEFAULT false,
  documentation_required text[],

  -- Status
  is_active boolean DEFAULT true,
  effective_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Regional Pricing (dynamic pricing per region)
CREATE TABLE IF NOT EXISTS regional_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  item_type text NOT NULL, -- service_listing, subscription, boost
  item_id uuid NOT NULL,

  -- Region
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(currency_code),

  -- Pricing
  base_price numeric(10, 2) NOT NULL,
  display_price numeric(10, 2) NOT NULL,
  discount_percentage numeric(5, 2),

  -- Tax
  tax_amount numeric(10, 2),
  tax_included boolean DEFAULT false,

  -- Status
  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(item_type, item_id, region_id, currency_code)
);

-- Translations (multi-language support)
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Translation key
  translation_key text NOT NULL,
  language_code text NOT NULL, -- ISO 639-1 code
  region_code text REFERENCES regions(region_code),

  -- Content
  translated_text text NOT NULL,
  context text,

  -- Category
  category text, -- ui, email, notification, error, help

  -- Status
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,

  -- Version
  version integer DEFAULT 1,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(translation_key, language_code, region_code)
);

-- User Regional Preferences
CREATE TABLE IF NOT EXISTS user_regional_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Region preference
  preferred_region_id uuid REFERENCES regions(id),
  preferred_currency text REFERENCES currencies(currency_code),
  preferred_language text DEFAULT 'en',

  -- Location
  current_country text,
  current_timezone text,

  -- Display preferences
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h', -- 12h, 24h
  number_format text DEFAULT 'US', -- US, EU, etc.

  -- Auto-detection
  auto_detect_region boolean DEFAULT true,
  auto_detect_currency boolean DEFAULT true,
  auto_detect_language boolean DEFAULT true,

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Regional Restrictions (geo-blocking)
CREATE TABLE IF NOT EXISTS regional_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Restriction
  restriction_type text NOT NULL, -- blocked_country, embargoed, sanctioned
  affected_countries text[] NOT NULL,

  -- Reason
  restriction_reason text NOT NULL,
  legal_basis text,

  -- Status
  is_active boolean DEFAULT true,
  start_date date NOT NULL,
  end_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(region_code);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(currency_code);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_current ON exchange_rates(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_valid ON exchange_rates(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_currency_conversions_user ON currency_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_entity ON currency_conversions(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_converted ON currency_conversions(converted_at DESC);

CREATE INDEX IF NOT EXISTS idx_regional_settings_region ON regional_settings(region_id);

CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_region ON regional_payment_methods(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_active ON regional_payment_methods(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_regional_compliance_region ON regional_compliance(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_compliance_type ON regional_compliance(compliance_type);

CREATE INDEX IF NOT EXISTS idx_regional_pricing_item ON regional_pricing(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_region ON regional_pricing(region_id, currency_code);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_active ON regional_pricing(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_region ON translations(region_code);

CREATE INDEX IF NOT EXISTS idx_user_regional_prefs_user ON user_regional_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_regional_restrictions_active ON regional_restrictions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_regional_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active regions"
  ON regions FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view active currencies"
  ON currencies FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view current exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated, anon
  USING (is_current = true);

CREATE POLICY "Users can view own conversions"
  ON currency_conversions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view regional settings"
  ON regional_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view active payment methods"
  ON regional_payment_methods FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view regional pricing"
  ON regional_pricing FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view translations"
  ON translations FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can view own preferences"
  ON user_regional_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON user_regional_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function: Convert currency
CREATE OR REPLACE FUNCTION convert_currency(
  amount_param numeric,
  from_currency_param text,
  to_currency_param text
)
RETURNS numeric AS $$
DECLARE
  rate numeric;
  converted_amount numeric;
BEGIN
  -- Same currency, no conversion
  IF from_currency_param = to_currency_param THEN
    RETURN amount_param;
  END IF;

  -- Get current exchange rate
  SELECT exchange_rate INTO rate
  FROM exchange_rates
  WHERE from_currency = from_currency_param
  AND to_currency = to_currency_param
  AND is_current = true
  AND (valid_until IS NULL OR valid_until > now())
  ORDER BY valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange rate not found for % to %', from_currency_param, to_currency_param;
  END IF;

  converted_amount := amount_param * rate;

  RETURN ROUND(converted_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Record currency conversion
CREATE OR REPLACE FUNCTION record_conversion(
  from_currency_param text,
  to_currency_param text,
  from_amount_param numeric,
  reason_param text DEFAULT NULL,
  entity_type_param text DEFAULT NULL,
  entity_id_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  conversion_id uuid;
  to_amount_val numeric;
  rate_val numeric;
BEGIN
  -- Convert
  to_amount_val := convert_currency(from_amount_param, from_currency_param, to_currency_param);

  -- Get rate
  SELECT exchange_rate INTO rate_val
  FROM exchange_rates
  WHERE from_currency = from_currency_param
  AND to_currency = to_currency_param
  AND is_current = true
  LIMIT 1;

  -- Record conversion
  INSERT INTO currency_conversions (
    from_currency,
    to_currency,
    from_amount,
    to_amount,
    exchange_rate,
    conversion_reason,
    related_entity_type,
    related_entity_id,
    user_id
  ) VALUES (
    from_currency_param,
    to_currency_param,
    from_amount_param,
    to_amount_val,
    rate_val,
    reason_param,
    entity_type_param,
    entity_id_param,
    auth.uid()
  )
  RETURNING id INTO conversion_id;

  RETURN conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get regional price
CREATE OR REPLACE FUNCTION get_regional_price(
  item_type_param text,
  item_id_param uuid,
  region_code_param text,
  currency_code_param text DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  price numeric;
  region_id_found uuid;
  currency_found text;
BEGIN
  -- Get region ID
  SELECT id, default_currency INTO region_id_found, currency_found
  FROM regions
  WHERE region_code = region_code_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Region % not found', region_code_param;
  END IF;

  -- Use provided currency or region default
  currency_found := COALESCE(currency_code_param, currency_found);

  -- Get regional price
  SELECT display_price INTO price
  FROM regional_pricing
  WHERE item_type = item_type_param
  AND item_id = item_id_param
  AND region_id = region_id_found
  AND currency_code = currency_found
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  ORDER BY valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Price not found for item in region %', region_code_param;
  END IF;

  RETURN price;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect user region
CREATE OR REPLACE FUNCTION detect_user_region(
  country_code_param text DEFAULT NULL,
  ip_address_param inet DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  detected_region text;
BEGIN
  -- Try to find region by country code
  IF country_code_param IS NOT NULL THEN
    SELECT region_code INTO detected_region
    FROM regions
    WHERE country_code_param = ANY(countries)
    AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      RETURN detected_region;
    END IF;
  END IF;

  -- Default to US
  RETURN 'US';
END;
$$ LANGUAGE plpgsql;

-- Function: Get translation
CREATE OR REPLACE FUNCTION get_translation(
  key_param text,
  language_param text DEFAULT 'en',
  region_param text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  translation text;
BEGIN
  -- Try region-specific translation first
  IF region_param IS NOT NULL THEN
    SELECT translated_text INTO translation
    FROM translations
    WHERE translation_key = key_param
    AND language_code = language_param
    AND region_code = region_param
    LIMIT 1;

    IF FOUND THEN
      RETURN translation;
    END IF;
  END IF;

  -- Try language-only translation
  SELECT translated_text INTO translation
  FROM translations
  WHERE translation_key = key_param
  AND language_code = language_param
  AND region_code IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN translation;
  END IF;

  -- Return key if no translation found
  RETURN key_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION convert_currency TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION get_regional_price TO authenticated, anon;
GRANT EXECUTE ON FUNCTION detect_user_region TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_translation TO authenticated, anon;

-- Seed major currencies
INSERT INTO currencies (currency_code, currency_name, currency_symbol, decimal_places) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'British Pound', '£', 2),
  ('CAD', 'Canadian Dollar', 'CA$', 2),
  ('AUD', 'Australian Dollar', 'A$', 2),
  ('JPY', 'Japanese Yen', '¥', 0),
  ('CNY', 'Chinese Yuan', '¥', 2),
  ('INR', 'Indian Rupee', '₹', 2),
  ('BRL', 'Brazilian Real', 'R$', 2),
  ('MXN', 'Mexican Peso', 'Mex$', 2)
ON CONFLICT (currency_code) DO NOTHING;

-- Seed major regions
INSERT INTO regions (region_code, region_name, countries, default_country, timezone, default_currency, supported_currencies) VALUES
  ('US', 'United States', ARRAY['US'], 'US', 'America/New_York', 'USD', ARRAY['USD']),
  ('UK', 'United Kingdom', ARRAY['GB'], 'GB', 'Europe/London', 'GBP', ARRAY['GBP', 'EUR']),
  ('EU', 'European Union', ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT'], 'DE', 'Europe/Paris', 'EUR', ARRAY['EUR']),
  ('CA', 'Canada', ARRAY['CA'], 'CA', 'America/Toronto', 'CAD', ARRAY['CAD', 'USD']),
  ('AU', 'Australia', ARRAY['AU'], 'AU', 'Australia/Sydney', 'AUD', ARRAY['AUD']),
  ('IN', 'India', ARRAY['IN'], 'IN', 'Asia/Kolkata', 'INR', ARRAY['INR'])
ON CONFLICT (region_code) DO NOTHING;

-- Seed exchange rates (example - should be updated regularly)
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, is_current) VALUES
  ('USD', 'EUR', 0.92, true),
  ('USD', 'GBP', 0.79, true),
  ('USD', 'CAD', 1.36, true),
  ('USD', 'AUD', 1.53, true),
  ('USD', 'JPY', 149.50, true),
  ('USD', 'CNY', 7.24, true),
  ('USD', 'INR', 83.12, true),
  ('EUR', 'USD', 1.09, true),
  ('GBP', 'USD', 1.27, true),
  ('CAD', 'USD', 0.74, true),
  ('AUD', 'USD', 0.65, true)
ON CONFLICT (from_currency, to_currency, valid_from) DO NOTHING;
