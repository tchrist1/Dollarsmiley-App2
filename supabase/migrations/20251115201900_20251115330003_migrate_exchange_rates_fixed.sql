/*
  # Migrate Exchange Rates to Enhanced Schema (Fixed)
*/

-- Backup
CREATE TEMP TABLE exchange_rates_backup AS
SELECT * FROM exchange_rates;

-- Drop old table and function
DROP FUNCTION IF EXISTS convert_currency(numeric, text, text);
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- Create enhanced table
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  from_currency text NOT NULL,
  to_currency text NOT NULL,
  exchange_rate numeric(20, 8) NOT NULL,

  rate_source text DEFAULT 'manual',
  rate_provider text,

  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_current boolean DEFAULT true,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  UNIQUE(from_currency, to_currency, valid_from)
);

-- Migrate data
INSERT INTO exchange_rates (id, from_currency, to_currency, exchange_rate, rate_source, valid_from, is_current, created_at)
SELECT id, from_currency, to_currency, rate::numeric(20, 8), 'manual', effective_from, true, created_at
FROM exchange_rates_backup;

-- Add new rates
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, is_current) VALUES
  ('USD', 'AUD', 1.53, true), ('AUD', 'USD', 0.65, true),
  ('USD', 'INR', 83.12, true), ('INR', 'USD', 0.012, true),
  ('USD', 'JPY', 149.50, true), ('JPY', 'USD', 0.0067, true),
  ('USD', 'CNY', 7.24, true), ('CNY', 'USD', 0.138, true),
  ('USD', 'BRL', 4.95, true), ('BRL', 'USD', 0.202, true)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_current ON exchange_rates(is_current) WHERE is_current = true;
CREATE INDEX idx_exchange_rates_valid ON exchange_rates(valid_from, valid_until);

-- RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view current rates"
  ON exchange_rates FOR SELECT
  TO authenticated, anon
  USING (is_current = true);

-- Function
CREATE OR REPLACE FUNCTION convert_currency(
  amount_param numeric,
  from_currency_param text,
  to_currency_param text
)
RETURNS numeric AS $$
DECLARE
  rate numeric;
BEGIN
  IF from_currency_param = to_currency_param THEN
    RETURN amount_param;
  END IF;

  SELECT exchange_rate INTO rate
  FROM exchange_rates
  WHERE from_currency = from_currency_param
  AND to_currency = to_currency_param
  AND is_current = true
  ORDER BY valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange rate not found for % to %', from_currency_param, to_currency_param;
  END IF;

  RETURN ROUND(amount_param * rate, 2);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION convert_currency TO authenticated, anon;
