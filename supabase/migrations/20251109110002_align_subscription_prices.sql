/*
  # Align Subscription Prices

  1. Changes
    - Update subscription plan prices to be consistent
    - Align with Stripe configuration
    - Ensure proper pricing tiers

  2. New Pricing Structure
    - Free: $0/month, $0/year
    - Pro: $19.99/month, $199/year (save $40)
    - Premium: $49.99/month, $499/year (save $100)
    - Elite: $99.99/month, $999/year (save $200)

  3. Reasoning
    - Consistent with industry standards
    - Clear value proposition for yearly plans
    - Progressive pricing tiers
*/

-- Update subscription plan prices
UPDATE subscription_plans
SET
  price_monthly = 19.99,
  price_yearly = 199.00,
  updated_at = now()
WHERE name = 'Pro';

UPDATE subscription_plans
SET
  price_monthly = 49.99,
  price_yearly = 499.00,
  updated_at = now()
WHERE name = 'Premium';

UPDATE subscription_plans
SET
  price_monthly = 99.99,
  price_yearly = 999.00,
  updated_at = now()
WHERE name = 'Elite';

-- Verify Free plan pricing (should be 0)
UPDATE subscription_plans
SET
  price_monthly = 0.00,
  price_yearly = 0.00,
  updated_at = now()
WHERE name = 'Free';

-- Add comment explaining pricing structure
COMMENT ON COLUMN subscription_plans.price_monthly IS
  'Monthly subscription price in dollars. Yearly plans offer 16-20% savings.';

COMMENT ON COLUMN subscription_plans.price_yearly IS
  'Yearly subscription price in dollars. Discounted from 12x monthly price.';
