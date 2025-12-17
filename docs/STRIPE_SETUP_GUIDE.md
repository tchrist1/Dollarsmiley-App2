# Stripe Subscription Setup Guide

Complete guide to configuring Stripe products and prices for the DollarSmiley subscription system.

---

## Prerequisites

1. **Stripe Account**
   - Sign up at https://stripe.com
   - Complete account verification
   - Enable test mode for development

2. **Stripe CLI (Optional but Recommended)**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe  # macOS
   # or
   scoop install stripe  # Windows
   # or download from https://stripe.com/docs/stripe-cli

   # Login to Stripe
   stripe login
   ```

3. **API Keys**
   - Get your keys from https://dashboard.stripe.com/apikeys
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

---

## Setup Steps

### Step 1: Create Products

Create a product for each subscription tier (Pro, Premium, Elite).

**Via Stripe Dashboard:**

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Fill in details for each plan:

**Pro Plan:**
```
Name: Pro Plan
Description: For active service providers
Statement descriptor: DOLLARSMILEY PRO
```

**Premium Plan:**
```
Name: Premium Plan
Description: For growing businesses
Statement descriptor: DOLLARSMILEY PREMIUM
```

**Elite Plan:**
```
Name: Elite Plan
Description: For established businesses
Statement descriptor: DOLLARSMILEY ELITE
```

**Via Stripe CLI:**

```bash
# Create Pro product
stripe products create \
  --name "Pro Plan" \
  --description "For active service providers" \
  --metadata[tier]=pro

# Create Premium product
stripe products create \
  --name "Premium Plan" \
  --description "For growing businesses" \
  --metadata[tier]=premium

# Create Elite product
stripe products create \
  --name "Elite Plan" \
  --description "For established businesses" \
  --metadata[tier]=elite
```

**Save the product IDs** - You'll need them for creating prices.

Example output:
```
prod_ABC123xyz (Pro)
prod_DEF456abc (Premium)
prod_GHI789def (Elite)
```

---

### Step 2: Create Prices

Create monthly and yearly prices for each product.

**Pricing Structure:**
- **Pro:** $19.99/month or $199/year
- **Premium:** $49.99/month or $499/year
- **Elite:** $99.99/month or $999/year

**Via Stripe Dashboard:**

1. Go to your product
2. Click "Add another price"
3. Configure:
   - **Pricing model:** Standard pricing
   - **Price:** Enter amount
   - **Billing period:** Monthly or Yearly
   - **Currency:** USD

**Via Stripe CLI:**

```bash
# Pro Plan Prices
stripe prices create \
  --product prod_ABC123xyz \
  --unit-amount 1999 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "Pro Monthly"

stripe prices create \
  --product prod_ABC123xyz \
  --unit-amount 19900 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "Pro Yearly"

# Premium Plan Prices
stripe prices create \
  --product prod_DEF456abc \
  --unit-amount 4999 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "Premium Monthly"

stripe prices create \
  --product prod_DEF456abc \
  --unit-amount 49900 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "Premium Yearly"

# Elite Plan Prices
stripe prices create \
  --product prod_GHI789def \
  --unit-amount 9999 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "Elite Monthly"

stripe prices create \
  --product prod_GHI789def \
  --unit-amount 99900 \
  --currency usd \
  --recurring[interval]=year \
  --nickname "Elite Yearly"
```

**Note:** Amounts are in cents (1999 = $19.99)

**Save all price IDs:**
```
Pro Monthly: price_pro_monthly_xxx
Pro Yearly: price_pro_yearly_xxx
Premium Monthly: price_premium_monthly_xxx
Premium Yearly: price_premium_yearly_xxx
Elite Monthly: price_elite_monthly_xxx
Elite Yearly: price_elite_yearly_xxx
```

---

### Step 3: Update Database

Update your Supabase database with the Stripe price IDs.

**Connect to Supabase:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Run the following SQL:

```sql
-- Update Pro Plan
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_pro_monthly_xxx',
  stripe_price_id_yearly = 'price_pro_yearly_xxx',
  updated_at = now()
WHERE name = 'Pro';

-- Update Premium Plan
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_premium_monthly_xxx',
  stripe_price_id_yearly = 'price_premium_yearly_xxx',
  updated_at = now()
WHERE name = 'Premium';

-- Update Elite Plan
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_elite_monthly_xxx',
  stripe_price_id_yearly = 'price_elite_yearly_xxx',
  updated_at = now()
WHERE name = 'Elite';

-- Verify updates
SELECT name, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly
FROM subscription_plans
WHERE name != 'Free'
ORDER BY sort_order;
```

**Replace the `price_xxx` values with your actual Stripe price IDs.**

---

### Step 4: Configure Webhooks

Set up webhooks to receive subscription events from Stripe.

**Via Stripe Dashboard:**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Add endpoint
6. **Copy the signing secret** (starts with `whsec_`)

**Via Stripe CLI:**

```bash
stripe webhook_endpoints create \
  --url "https://your-project.supabase.co/functions/v1/stripe-webhook" \
  --enabled-events customer.subscription.created \
  --enabled-events customer.subscription.updated \
  --enabled-events customer.subscription.deleted \
  --enabled-events invoice.payment_succeeded \
  --enabled-events invoice.payment_failed \
  --enabled-events customer.subscription.trial_will_end
```

---

### Step 5: Configure Environment Variables

Add Stripe keys to your environment:

**Supabase Dashboard:**

1. Go to Project Settings → Edge Functions
2. Add environment variables:

```env
STRIPE_SECRET_KEY=sk_test_xxx  # or sk_live_xxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # or pk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Local Development (.env.local):**

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

### Step 6: Test Subscription Flow

**Test with Stripe Test Cards:**

**Successful payment:**
```
Card number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

**Payment requires authentication:**
```
Card number: 4000 0025 0000 3155
```

**Payment fails:**
```
Card number: 4000 0000 0000 9995
```

**Test Flow:**

1. Create a subscription in your app
2. Use test card for payment
3. Verify subscription created in Stripe Dashboard
4. Check database for subscription record
5. Verify webhook received
6. Test cancellation
7. Test reactivation

---

## Verification Checklist

### ✅ **Stripe Dashboard**
- [ ] Three products created (Pro, Premium, Elite)
- [ ] Six prices created (2 per product)
- [ ] Products are active
- [ ] Prices are recurring
- [ ] Webhook endpoint configured
- [ ] Webhook signing secret saved

### ✅ **Database**
- [ ] All plans have `stripe_price_id_monthly` set
- [ ] All plans have `stripe_price_id_yearly` set
- [ ] Prices in database match Stripe prices
- [ ] Run verification query passes

### ✅ **Environment Variables**
- [ ] `STRIPE_SECRET_KEY` set in Supabase
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` set in app
- [ ] Keys are for correct environment (test/live)

### ✅ **Functionality**
- [ ] Can create subscription (monthly)
- [ ] Can create subscription (yearly)
- [ ] Webhook receives events
- [ ] Subscription status updates in database
- [ ] Can cancel subscription
- [ ] Can reactivate subscription
- [ ] Trial period works (if configured)

---

## Troubleshooting

### Issue: "Stripe price not configured"

**Problem:** Database has null price IDs

**Solution:**
```sql
-- Check current values
SELECT name, stripe_price_id_monthly, stripe_price_id_yearly
FROM subscription_plans;

-- Update with your actual price IDs
UPDATE subscription_plans
SET stripe_price_id_monthly = 'price_xxx'
WHERE name = 'Pro';
```

---

### Issue: Webhook not receiving events

**Problem:** Events not reaching your endpoint

**Solutions:**

1. **Check URL is correct:**
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

2. **Test webhook locally:**
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

3. **Check Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions
   - View stripe-webhook logs

4. **Verify signing secret:**
   - Ensure `STRIPE_WEBHOOK_SECRET` is set correctly

---

### Issue: Payment fails with 3D Secure

**Problem:** SCA (Strong Customer Authentication) required

**Solution:**
- Use test card: 4000 0025 0000 3155
- Complete authentication in test mode
- Ensure your app handles payment intent confirmation

---

### Issue: Subscription not appearing in app

**Problem:** Database not updated

**Check:**

1. **Subscription created in Stripe?**
   - Check Stripe Dashboard → Customers

2. **Webhook received?**
   - Check Stripe Dashboard → Webhooks → Events

3. **Database updated?**
   ```sql
   SELECT * FROM user_subscriptions
   WHERE stripe_subscription_id = 'sub_xxx';
   ```

---

## Production Deployment

### Before Going Live:

**1. Switch to Live Mode:**
- Get live API keys from Stripe Dashboard
- Update environment variables with live keys
- Create products/prices in live mode
- Update database with live price IDs

**2. Configure Live Webhook:**
- Create webhook endpoint in live mode
- Use live signing secret
- Test with real (small amount) transaction

**3. Pricing Review:**
```sql
-- Verify all prices are correct
SELECT
  name,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly IS NOT NULL AS monthly_configured,
  stripe_price_id_yearly IS NOT NULL AS yearly_configured
FROM subscription_plans
ORDER BY sort_order;
```

**4. Security Check:**
- [ ] API keys stored securely
- [ ] Webhook secret not exposed
- [ ] RLS policies enabled
- [ ] Test mode disabled in production

**5. Testing:**
- [ ] Test subscription creation
- [ ] Test payment processing
- [ ] Test cancellation flow
- [ ] Test upgrade/downgrade
- [ ] Test failed payments
- [ ] Monitor webhooks for 24 hours

---

## Quick Reference

### Stripe Amounts (in cents)

| Plan | Monthly | Yearly |
|------|---------|--------|
| Pro | 1999 | 19900 |
| Premium | 4999 | 49900 |
| Elite | 9999 | 99900 |

### SQL Query: Check Configuration

```sql
SELECT
  sp.name,
  sp.price_monthly,
  sp.price_yearly,
  CASE
    WHEN sp.stripe_price_id_monthly IS NULL THEN '❌ Missing'
    ELSE '✅ ' || sp.stripe_price_id_monthly
  END AS monthly_price_id,
  CASE
    WHEN sp.stripe_price_id_yearly IS NULL THEN '❌ Missing'
    ELSE '✅ ' || sp.stripe_price_id_yearly
  END AS yearly_price_id
FROM subscription_plans sp
WHERE sp.name != 'Free'
ORDER BY sp.sort_order;
```

### Stripe CLI: Test Webhook

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger specific event
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

---

## Support

**Stripe Documentation:**
- Products: https://stripe.com/docs/products-prices
- Subscriptions: https://stripe.com/docs/billing/subscriptions
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

**Supabase Documentation:**
- Edge Functions: https://supabase.com/docs/guides/functions
- Environment Variables: https://supabase.com/docs/guides/functions/secrets

**Need Help?**
- Stripe Support: https://support.stripe.com
- Supabase Discord: https://discord.supabase.com

---

**Last Updated:** 2024-11-09
**Version:** 1.0.0
