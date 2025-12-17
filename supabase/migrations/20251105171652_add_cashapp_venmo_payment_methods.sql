/*
  # Add Cash App and Venmo Payment Methods

  ## Overview
  Extends the payment system to support Cash App and Venmo payments through
  Stripe's integration. Both are popular peer-to-peer payment services that
  can be used for instant payments.

  ## Schema Changes
  
  ### Payment Methods Table Updates
  - Update `payment_type` constraint to include 'cashapp' and 'venmo'
  - Add `cashapp_cashtag` (text) - Cash App $cashtag
  - Add `venmo_username` (text) - Venmo @username
  
  ## Payment Methods
  
  ### Cash App (via Stripe)
  - Uses Stripe's Cash App Pay integration
  - Instant payment confirmation
  - $cashtag identification
  - US only payment method
  - Mobile-optimized checkout
  
  ### Venmo (via Stripe)
  - Uses Stripe's Venmo integration
  - Social payment experience
  - @username identification
  - US only payment method
  - Mobile-optimized checkout

  ## Important Notes
  - Cash App Pay requires Stripe account configuration
  - Venmo requires Stripe account configuration
  - Both are US-only payment methods
  - Both optimized for mobile devices
  - Instant payment confirmation
  - Users must have Cash App or Venmo accounts
  - Payments settled in USD only
*/

-- Drop existing constraint on payment_type
ALTER TABLE payment_methods 
DROP CONSTRAINT IF EXISTS payment_methods_payment_type_check;

-- Add new constraint with cashapp and venmo
ALTER TABLE payment_methods 
ADD CONSTRAINT payment_methods_payment_type_check 
CHECK (payment_type IN ('card', 'paypal', 'apple_pay', 'google_pay', 'cashapp', 'venmo'));

-- Add Cash App and Venmo specific columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'cashapp_cashtag'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN cashapp_cashtag text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'venmo_username'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN venmo_username text;
  END IF;
END $$;

-- Create index for cashtag lookup
CREATE INDEX IF NOT EXISTS idx_payment_methods_cashapp ON payment_methods(cashapp_cashtag) WHERE cashapp_cashtag IS NOT NULL;

-- Create index for venmo username lookup
CREATE INDEX IF NOT EXISTS idx_payment_methods_venmo ON payment_methods(venmo_username) WHERE venmo_username IS NOT NULL;