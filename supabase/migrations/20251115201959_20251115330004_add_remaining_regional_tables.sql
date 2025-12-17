/*
  # Add Remaining Regional Federation Tables

  1. New Tables
    - currency_conversions - Conversion history
    - translations - Multi-language support
    - regional_settings - Already created
    - regional_payment_methods - Already created
    - regional_compliance - Already created
    - regional_pricing - Already created
    - user_regional_preferences - Already created

  2. Functions
    - record_conversion
    - get_regional_price
    - get_translation
*/

-- Currency Conversions (conversion history)
CREATE TABLE IF NOT EXISTS currency_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount numeric(20, 2) NOT NULL,
  to_amount numeric(20, 2) NOT NULL,
  exchange_rate numeric(20, 8) NOT NULL,

  conversion_reason text,
  related_entity_type text,
  related_entity_id uuid,

  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  converted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Translations (multi-language support)
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  translation_key text NOT NULL,
  language_code text NOT NULL,
  region_code text REFERENCES regions(region_code),

  translated_text text NOT NULL,
  context text,

  category text,

  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,

  version integer DEFAULT 1,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(translation_key, language_code, region_code)
);

-- Regional Settings (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS regional_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  min_booking_amount numeric(10, 2),
  max_booking_amount numeric(10, 2),
  service_fee_percentage numeric(5, 2) DEFAULT 10.00,
  payment_processing_fee numeric(5, 2) DEFAULT 2.90,

  tax_name text,
  tax_rate numeric(5, 2),
  tax_included_in_price boolean DEFAULT false,

  features_enabled jsonb DEFAULT '{}',
  features_disabled jsonb DEFAULT '{}',

  support_email text,
  support_phone text,
  emergency_contact text,

  terms_url text,
  privacy_url text,
  refund_policy_url text,

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(region_id)
);

-- Regional Payment Methods (if not exists)
CREATE TABLE IF NOT EXISTS regional_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  payment_method_key text NOT NULL,
  payment_method_name text NOT NULL,
  payment_provider text NOT NULL,

  supported_currencies text[],

  min_amount numeric(10, 2),
  max_amount numeric(10, 2),

  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,

  display_order integer DEFAULT 0,
  icon_url text,

  configuration jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Regional Compliance (if not exists)
CREATE TABLE IF NOT EXISTS regional_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  compliance_type text NOT NULL,
  compliance_name text NOT NULL,
  description text,

  is_required boolean DEFAULT true,
  applies_to text[],

  verification_required boolean DEFAULT false,
  documentation_required text[],

  is_active boolean DEFAULT true,
  effective_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Regional Pricing (if not exists)
CREATE TABLE IF NOT EXISTS regional_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  item_type text NOT NULL,
  item_id uuid NOT NULL,

  region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,
  currency_code text NOT NULL,

  base_price numeric(10, 2) NOT NULL,
  display_price numeric(10, 2) NOT NULL,
  discount_percentage numeric(5, 2),

  tax_amount numeric(10, 2),
  tax_included boolean DEFAULT false,

  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(item_type, item_id, region_id, currency_code)
);

-- User Regional Preferences (if not exists)
CREATE TABLE IF NOT EXISTS user_regional_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  preferred_region_id uuid REFERENCES regions(id),
  preferred_currency text,
  preferred_language text DEFAULT 'en',

  current_country text,
  current_timezone text,

  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h',
  number_format text DEFAULT 'US',

  auto_detect_region boolean DEFAULT true,
  auto_detect_currency boolean DEFAULT true,
  auto_detect_language boolean DEFAULT true,

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Regional Restrictions (if not exists)
CREATE TABLE IF NOT EXISTS regional_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  restriction_type text NOT NULL,
  affected_countries text[] NOT NULL,

  restriction_reason text NOT NULL,
  legal_basis text,

  is_active boolean DEFAULT true,
  start_date date NOT NULL,
  end_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_currency_conversions_user ON currency_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_entity ON currency_conversions(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_converted ON currency_conversions(converted_at DESC);

CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_region ON translations(region_code);

CREATE INDEX IF NOT EXISTS idx_regional_settings_region ON regional_settings(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_region ON regional_payment_methods(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_active ON regional_payment_methods(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_regional_compliance_region ON regional_compliance(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_compliance_type ON regional_compliance(compliance_type);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_item ON regional_pricing(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_region ON regional_pricing(region_id, currency_code);
CREATE INDEX IF NOT EXISTS idx_regional_pricing_active ON regional_pricing(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_regional_prefs_user ON user_regional_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_regional_restrictions_active ON regional_restrictions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_regional_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own conversions"
  ON currency_conversions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view translations"
  ON translations FOR SELECT
  TO authenticated, anon
  USING (true);

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

CREATE POLICY "Users can view own preferences"
  ON user_regional_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON user_regional_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Functions
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
  to_amount_val := convert_currency(from_amount_param, from_currency_param, to_currency_param);

  SELECT exchange_rate INTO rate_val
  FROM exchange_rates
  WHERE from_currency = from_currency_param
  AND to_currency = to_currency_param
  AND is_current = true
  LIMIT 1;

  INSERT INTO currency_conversions (
    from_currency, to_currency, from_amount, to_amount, exchange_rate,
    conversion_reason, related_entity_type, related_entity_id, user_id
  ) VALUES (
    from_currency_param, to_currency_param, from_amount_param, to_amount_val, rate_val,
    reason_param, entity_type_param, entity_id_param, auth.uid()
  )
  RETURNING id INTO conversion_id;

  RETURN conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_translation(
  key_param text,
  language_param text DEFAULT 'en',
  region_param text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  translation text;
BEGIN
  IF region_param IS NOT NULL THEN
    SELECT translated_text INTO translation
    FROM translations
    WHERE translation_key = key_param
    AND language_code = language_param
    AND region_code = region_param
    LIMIT 1;

    IF FOUND THEN RETURN translation; END IF;
  END IF;

  SELECT translated_text INTO translation
  FROM translations
  WHERE translation_key = key_param
  AND language_code = language_param
  AND region_code IS NULL
  LIMIT 1;

  IF FOUND THEN RETURN translation; END IF;

  RETURN key_param;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION record_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation TO authenticated, anon;
